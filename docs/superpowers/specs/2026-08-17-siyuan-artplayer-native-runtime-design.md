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

1. Scope and isolate ArtPlayer styles.
2. Add a standard media schema and runtime controller API.
3. Move HLS/DASH/custom-type routing into ArtPlayer.
4. Move quality, subtitle, danmaku, and audio track UI into ArtPlayer-native modules.
5. Add native note-action controls that emit events instead of writing documents.
6. Add native playlist UI with hooks for persistence.

This is better than reviving the plugin-side `artplayer-plugins.ts` because it removes duplicate UI state, avoids private DOM bridging in the plugin, and lets Bilibili, TVBox, and cloud sources all feed the same player schema.

## Standard Media Input

ArtPlayer should accept:

```ts
type ArtplayerMedia = {
  url: string | File | Record<string, any>
  title?: string
  poster?: string
  type?: 'auto' | 'video' | 'audio' | 'm3u8' | 'mpd' | 'flv' | string
  isLive?: boolean
  qualities?: ArtplayerQuality[]
  qualityLoader?: () => Promise<ArtplayerQuality[]>
  subtitles?: ArtplayerSubtitleTrack[]
  danmaku?: ArtplayerDanmakuItem[]
  chapters?: ArtplayerChapter[] | string | null
  thumbnails?: object | string
  annotations?: object | string
  watermarks?: object | string
  audioTracks?: ArtplayerAudioTrack[]
  playlist?: ArtplayerPlaylist
  meta?: Record<string, any>
}
```

The plugin should resolve Bilibili, TVBox, local, and cloud sources into this format before calling ArtPlayer. ArtPlayer should not know about Bilibili accounts, TVBox APIs, SiYuan paths, or plugin storage files.

## Runtime API

ArtPlayer should expose a stable controller:

```ts
type ArtplayerRuntime = {
  playMedia(media: ArtplayerMedia): Promise<void>
  updateMedia(media: Partial<ArtplayerMedia>): void
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

## Player-Owned Responsibilities

- Style isolation: no global `hint--` rules outside `.art-video-player`.
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

Each stage must have at least one automated check before production code changes. For style isolation, a lightweight Node test should inspect `packages/artplayer/src/style/hint.less` and prove tooltip selectors are scoped to `.art-video-player`. Later stages should add unit checks for schema normalization and browser-demo checks for playback UI behavior.

## First Implementation Stage

Start with style isolation. It directly replaces the old plugin patch, has a small blast radius, and makes the fork immediately safer inside SiYuan.
