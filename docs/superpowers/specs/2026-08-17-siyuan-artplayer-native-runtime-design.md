# SiYuan ArtPlayer Native Runtime Design

## Goal

Build a SiYuan-focused ArtPlayer fork that absorbs reusable player behavior into the player runtime, so the SiYuan plugin only provides business data, storage hooks, and document actions.

## Baseline

- Source repo: `E:\Github\ArtPlayer`
- Branch: `siyuan-artplayer-5.2.1-base`
- ArtPlayer baseline: `5.2.1`
- Plugin reference checkout: `E:\Github\media-player-private-artplayer-317`
- Plugin reference commit: `317921c1e699d8c0935659a82e6f6596b07a592b`

The reference plugin used `artplayer@5.2.1`, `artplayer-plugin-danmuku@5.1.6`, and `patches/artplayer@5.2.1.patch`. That patch only fixed global `hint--` tooltip leakage, while most player behavior lived in `src/plugins/artplayer-plugins.ts` and `src/components/Player.vue`.

## Design Direction

Use ArtPlayer as a native media runtime instead of a thin HTML video wrapper. The plugin should pass one normalized media object to ArtPlayer and subscribe to stable player events. ArtPlayer owns playback UI, stream adapters, quality selection, subtitles, danmaku display, loop segments, screenshot capture, and playlist presentation.

The SiYuan plugin keeps source parsing, account logic, library browsing, favorites/history persistence, markdown templates, asset uploads, and document insertion. These responsibilities are specific to SiYuan and must not be embedded into the player.

## Chosen Approach

Implement a native runtime layer inside the ArtPlayer fork in small stages:

1. Namespace ArtPlayer tooltip class names.
2. Add a standard media schema and runtime controller API.
3. Move HLS/DASH/custom-type routing into ArtPlayer.
4. Move quality, subtitle, danmaku, and audio track UI into ArtPlayer-native modules.
5. Add native note-action controls that emit events instead of writing documents.
6. Add native playlist UI with hooks for persistence.

This is better than reviving the plugin-side `artplayer-plugins.ts` because it removes duplicate UI state, avoids private DOM bridging in the plugin, and lets Bilibili, TVBox, and cloud sources all feed the same player schema.

## Standard Media Input

ArtPlayer should accept a source-agnostic media object. The plugin resolves Bilibili, TVBox, local files, and cloud sources before calling ArtPlayer; ArtPlayer only receives player-facing data.

```ts
type ArtplayerMedia = {
  id?: string
  title?: string
  name?: string
  url: string | File | Blob | Record<string, any>
  poster?: string
  thumbnail?: string
  cover?: string
  type?: 'auto' | 'video' | 'audio' | 'm3u8' | 'hls' | 'mpd' | 'dash' | 'flv' | string
  isLive?: boolean
  startTime?: number
  endTime?: number
  currentTime?: number
  sources?: ArtplayerMediaSource[]
  qualities?: ArtplayerQuality[]
  qualityLoader?: () => Promise<ArtplayerQuality[]>
  subtitles?: ArtplayerSubtitleTrack[]
  danmaku?: ArtplayerDanmakuItem[] | Record<string, any>
  chapters?: ArtplayerChapter[] | string | null
  thumbnails?: object | string
  annotations?: object | string
  watermarks?: object | string
  audioTracks?: ArtplayerAudioTrack[]
  playlist?: ArtplayerPlaylist
  meta?: Record<string, any>
}
```

`sources` is the canonical playback-source list. `qualities` remains the UI-friendly quality selector shape compatible with existing ArtPlayer usage. When `sources` exists, ArtPlayer chooses the default source as the primary `url`; when only `qualities` exists, ArtPlayer may use the default quality URL as the primary playback URL. This keeps the interface compact while allowing Bilibili DASH, TVBox HLS, local files, and cloud direct links to use the same entrypoint.

Minimal examples:

```ts
await art.playMedia('https://example.com/video.mp4')

await art.playMedia({
  title: 'Episode 1',
  url: '/api/bilibili/mpd/abc',
  type: 'mpd',
  poster: 'cover.jpg',
  currentTime: 120,
  qualities: [{ html: '1080P', url: '/api/bilibili/mpd/abc', default: true }],
  subtitles: [{ name: '中文', url: 'subtitle.vtt', default: true }],
  meta: { source: 'bilibili', bvid: 'BV...' },
})
```

ArtPlayer should not know about Bilibili accounts, TVBox APIs, SiYuan paths, or plugin storage files. Source-specific fields can be preserved in `meta` for event consumers, but player logic must not branch on them.

## Runtime API

ArtPlayer should expose a stable controller:

```ts
type ArtplayerRuntime = {
  playMedia(media: ArtplayerMedia): Promise<void>
  updateMedia(media: Partial<ArtplayerMedia>): void
  getCurrentMedia(): ArtplayerMedia | null
  pause(): void
  resume(): void
  stop(): void
  seekTo(time: number): boolean
  stepFrame(direction: 1 | -1): boolean
  getCurrentTime(): number
  getDuration(): number
  isPlaying(): boolean
  getPlaybackRate(): number
  setPlaybackRate(rate: number): boolean
  getVideoElement(): HTMLVideoElement | null
  getScreenshotBlob(format?: string, quality?: number): Promise<Blob | null>
  setLoopSegment(start: number, end: number): boolean
  clearLoopSegment(): void
  setPlaylist(playlist: ArtplayerPlaylist | null, currentUrl?: string): void
  on(type: string, handler: (...args: any[]) => void): void
  off(type: string, handler: (...args: any[]) => void): void
}
```

The plugin should depend on this API rather than `art.plugins.*`, private DOM classes, or raw player internals.

The first runtime slice exposes `Artplayer.normalizeMedia(input)` and `art.playMedia(media)`. `normalizeMedia` is pure and handles strings, object media, source lists, quality lists, title/poster aliases, and default `type: 'auto'`. `playMedia` is a thin adapter over existing ArtPlayer properties: `title`, `poster`, `type`, `url`, `quality`, `thumbnails`, `currentTime`, and `option.isLive`.

The third runtime slice moves stream routing into `urlMix`. The routing order is:

1. User-provided `option.customType[type]`.
2. Built-in adapters for `m3u8`/`hls` and `mpd`/`dash`.
3. Native `video.src` assignment.

When media type is `auto`, `urlMix` falls back to the URL extension so plain `.m3u8` and `.mpd` URLs work through the same path. HLS uses `window.Hls` or `globalThis.Hls`; DASH uses `window.dashjs` or `globalThis.dashjs`. This follows the existing ArtPlayer ecosystem pattern where streaming engines are supplied by the host page or bundle, while ArtPlayer owns adapter selection and lifecycle. On source switch or destroy, ArtPlayer cleans up `art.hls` and `art.dash` before attaching the next source.

The fifth runtime slice adds native note-action primitives without embedding SiYuan writes. `getScreenshotBlob(format, quality)` captures the current frame as a Blob, and `screenshot(format, quality)` copies that Blob to the clipboard through the Clipboard API instead of downloading a file. `emitAction(type, detail)` emits both `action:${type}` and `action` with current media, current time, duration, and loop segment state. `captureTimestamp()`, `captureLoopSegment()`, `setLoopSegment(start, end)`, and `clearLoopSegment()` provide the native timestamp and loop-segment surface. Desktop controls are opt-in through `actions: true` or `actions: ['timestamp', 'loopSegment', 'mediaNotes']`; the plugin listens to events to perform document insertion, uploads, or note creation.

The sixth runtime slice adds a native playlist model and a lightweight panel. `ArtplayerPlaylist` accepts flat `items`, grouped `groups`, hierarchical `roots` or `tree.roots`, plus runtime `favorites` and `history` collections. ArtPlayer normalizes these into a flat playable index for next/previous playback while preserving group and tree structure for display. The public API includes `setPlaylist`, `playlistPlay`, `playlistNext`, `playlistPrev`, `playlistAdd`, `playlistRemove`, `togglePlaylistFavorite`, `clearPlaylistHistory`, and `playlistToggle`. The panel is enabled with `playlist: true` and exposes Playlist, Favorites, and History tabs. ArtPlayer does not persist favorites/history or save progress directly; it calls hooks such as `onPlayItem`, `onToggleFavorite`, `onSaveProgress`, and `onClearHistory`, leaving SiYuan storage ownership in the plugin.

## Player-Owned Responsibilities

- Style isolation: no unprefixed `hint--` tooltip class names; ArtPlayer uses `art-hint--*`.
- Playback adapters: native HLS, DASH, FLV, audio, video, and custom URL routing.
- Quality UI: desktop and mobile selectors share one state model.
- Subtitles: track loading, selection UI, offset, and basic style application.
- Danmaku: render, show/hide, reset on source change, and expose events.
- Loop segments: set, clear, repeat, and status updates.
- Screenshot capture: return `Blob` without forcing download.
- Native action buttons: timestamp, loop segment, screenshot, media notes.
- Playlist presentation: grouped list, tree view, current item, next/previous.
- Cleanup: source switch and destroy must remove stale controls, settings, engines, and overlays.

## Plugin-Owned Responsibilities

- SiYuan document insertion and markdown templates.
- Screenshot asset upload to SiYuan.
- Timestamp offset and media note content generation.
- Bilibili, TVBox, cloud, local, and account-specific source resolution.
- Favorites, history, and progress persistence in SiYuan storage.
- Media library, search, settings UI, Pro authorization, and AI summary.

## Validation Strategy

For style isolation, use `rg` to inspect product source and generated player artifacts and prove tooltip class names use the `art-hint--*` namespace. Later behavior-heavy stages should add unit checks for schema normalization and browser-demo checks for playback UI behavior.

## First Implementation Stage

Start with tooltip class namespace isolation. It directly replaces the old plugin patch by changing the source class names, has a small blast radius, and makes the fork immediately safer inside SiYuan.

## Second Implementation Stage

Add the standard media entrypoint without moving playback engines yet. This stage should create the protocol and the thin runtime adapter only: `normalizeMedia`, `playMedia`, `getCurrentMedia`, TypeScript declarations, and focused tests. HLS/DASH adapters, subtitles, danmaku, actions, and playlist UI remain later stages that consume the same media object.

## Third Implementation Stage

Move HLS and DASH selection from plugin-side `customType` into ArtPlayer's URL routing. The plugin can stop passing `createCustomType()` for these formats and instead pass standard media with `type: 'm3u8' | 'hls' | 'mpd' | 'dash' | 'auto'`. The plugin remains responsible for bundling or exposing the actual streaming libraries if the browser cannot play the format natively.
