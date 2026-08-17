# SiYuan ArtPlayer Native Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the ArtPlayer 5.2.1 fork into a native runtime that the SiYuan media plugin can consume with minimal adapter code.

**Architecture:** ArtPlayer accepts a normalized media object and owns reusable playback UI/state. The SiYuan plugin resolves sources, persists business state, and handles document writes through events and hooks.

**Tech Stack:** JavaScript, TypeScript declaration files, Less, Parcel-era ArtPlayer 5.2.1 build scripts, Node-based tests.

## Global Constraints

- Work in `E:\Github\ArtPlayer` on branch `siyuan-artplayer-5.2.1-base`.
- Use plugin commit `317921c1e699d8c0935659a82e6f6596b07a592b` as the compatibility reference.
- Do not embed SiYuan document writing, account login, or storage paths into ArtPlayer.
- Edit `packages/artplayer/src/**` and `packages/artplayer/types/**` before generated `dist/**`.
- Use TDD for behavior changes.
- Keep the first stage focused on style isolation.

---

## File Structure

- `packages/artplayer/src/style/hint.less`: renames Hint.css selectors to `art-hint--*`.
- `packages/artplayer/src/utils/dom.js`: emits `art-hint--*` tooltip class names.
- Manual verification uses `rg` to fail if product source or generated player artifacts contain unprefixed `hint--` class names.
- `packages/artplayer/src/runtime/media.js`: normalized media runtime.
- `packages/artplayer/src/player/mediaMix.js`: native media entrypoint mixed into player instances.
- `packages/artplayer/types/media.d.ts`: public standard media protocol types.
- `packages/artplayer/types/artplayer.d.ts`: public runtime/media type exports.
- `packages/artplayer/src/player/adapters/`: HLS/DASH playback adapters.
- `packages/artplayer/src/player/actions/`: future screenshot, timestamp, loop segment, and media notes event controls.
- `packages/artplayer/src/player/playlist/`: future native playlist state and UI.

## Task 1: Namespace Hint Tooltip Styles

**Files:**
- Modify: `packages/artplayer/src/style/hint.less`
- Modify: `packages/artplayer/src/utils/dom.js`

**Interfaces:**
- Produces: tooltip styles and emitted classes named `art-hint--*`

- [x] **Step 1: Rename tooltip classes at the source**

In `packages/artplayer/src/utils/dom.js`, change:

```js
addClass(target, 'art-hint--rounded')
addClass(target, `art-hint--${pos}`)
```

In `packages/artplayer/src/style/hint.less`, rename `hint--` selectors to `art-hint--`. This changes the class contract instead of relying on a selector wrapper or plugin patch.

- [x] **Step 2: Verify product source and generated artifacts**

Run: `rg -n "(^|[^a-zA-Z0-9_-])hint--" packages docs/compiled docs/uncompiled --glob "!node_modules/**" --glob "!docs/superpowers/**"`

Expected: no matches and exit code 1.

- [x] **Step 3: Inspect diff**

Run: `git diff -- packages/artplayer/src/style/hint.less packages/artplayer/src/utils/dom.js`

Expected: only tooltip class renaming changed in source files.

## Task 2: Define Standard Media Schema

**Files:**
- Create: `packages/artplayer/src/runtime/media.js`
- Create: `packages/artplayer/src/player/mediaMix.js`
- Create: `packages/artplayer/types/media.d.ts`
- Modify: `packages/artplayer/src/index.js`
- Modify: `packages/artplayer/src/player/index.js`
- Modify: `packages/artplayer/types/player.d.ts`
- Modify: `packages/artplayer/types/artplayer.d.ts`
- Test: `test/types.test.ts`

**Interfaces:**
- Produces: `Artplayer.normalizeMedia(input)` as a pure source-agnostic normalizer.
- Produces: `art.playMedia(media)` as a thin wrapper over existing `title`, `poster`, `type`, `url`, `quality`, `thumbnails`, and seek behavior.
- Produces: `art.getCurrentMedia()` and readonly `art.currentMedia`.
- Consumes: `ArtplayerMedia`, `ArtplayerMediaSource`, `qualities`, `subtitles`, `danmaku`, `chapters`, `audioTracks`, `playlist`, and `meta` fields from the design doc.

- [x] **Step 1: Add temporary failing checks for URL media, object media, and `playMedia` application**
- [x] **Step 2: Implement `normalizeMedia` with no Bilibili, TVBox, cloud, or SiYuan branching**
- [x] **Step 3: Expose `playMedia(media)` as a thin wrapper over current ArtPlayer properties**
- [x] **Step 4: Update declarations and keep media protocol types in `types/media.d.ts`**
- [x] **Step 5: Run targeted runtime checks and type-facing tests**

**Implemented slice:** `Artplayer.normalizeMedia(input)` accepts a URL string or a source-agnostic media object, normalizes `sources`, preserves player-facing tracks and `meta`, derives `title`/`poster` aliases, and defaults `type` to `auto`. `art.playMedia(input)` applies the normalized object through existing ArtPlayer public properties, emits `media:change`, switches `url`, applies `currentTime`/`startTime` on the new source, starts playback, and exposes the last object through `art.currentMedia`/`art.getCurrentMedia()`.

## Task 3: Move Stream Routing Into ArtPlayer

**Files:**
- Create: `packages/artplayer/src/player/adapters/hls.js`
- Create: `packages/artplayer/src/player/adapters/dash.js`
- Create: `packages/artplayer/src/player/adapters/index.js`
- Modify: `packages/artplayer/src/player/urlMix.js`
- Modify: `packages/artplayer/types/option.d.ts`
- Modify: `packages/artplayer/types/artplayer.d.ts`

**Interfaces:**
- Consumes: `ArtplayerMedia.type`
- Produces: internal adapter selection for `m3u8`, `hls`, `mpd`, `dash`, and extension-based `auto`
- Keeps: `option.customType[type]` has priority over built-in adapters

- [x] **Step 1: Add temporary checks for adapter selection**
- [x] **Step 2: Move HLS/DASH behavior from the old plugin into adapter modules**
- [x] **Step 3: Clean up adapters on source switch and destroy**
- [x] **Step 4: Run tests and a local demo build**

**Implemented slice:** `urlMix` now resolves `auto` through URL extension, then routes through `option.customType[type]` first and built-in adapters second. HLS uses `window.Hls`/`globalThis.Hls` with native Safari HLS fallback; DASH uses `window.dashjs`/`globalThis.dashjs`. Both adapters store their engine on `art.hls` or `art.dash`, and `urlMix` cleans old engines before the next source and on `destroy`.

## Task 4: Native Quality, Subtitle, Danmaku, and Tracks

**Files:**
- Modify: `packages/artplayer/src/player/qualityMix.js`
- Modify: `packages/artplayer/src/player/mediaMix.js`
- Modify: `packages/artplayer/src/subtitle.js`
- Modify: `packages/artplayer/types/player.d.ts`
- Modify: `packages/artplayer/types/artplayer.d.ts`
- Temporary test: `test/media-tracks.test.js` during implementation only, deleted after verification

**Interfaces:**
- Consumes: `qualities`, `qualityLoader`, `subtitles`, `danmaku`, `audioTracks`
- Produces: `art.updateQuality(items)`, `art.setSubtitles(tracks)`, `art.selectSubtitle(track, tracks)`, `art.setDanmaku(items)`, `art.setAudioTracks(items)`

- [x] **Step 1: Add state tests for selector cleanup on source switch**
- [x] **Step 2: Add native quality selector update API**
- [x] **Step 3: Add subtitle track select/clear API**
- [x] **Step 4: Add danmaku reset/show/hide API**
- [x] **Step 5: Run targeted tests**

**Implemented slice:** `qualityMix` now keeps native quality state, exposes `art.qualities` and `art.updateQuality(items)`, and removes stale quality controls/settings when a source has no qualities. `mediaMix` now owns `subtitleTracks`, `danmaku`, and `audioTracks` state with `setSubtitles`, `selectSubtitle`, `setDanmaku`, and `setAudioTracks`; `playMedia` applies or clears all of them on every source switch and accepts async `qualityLoader` without letting stale loads overwrite the current media. `Subtitle.clear()` resets the track node and subtitle display at the source level. The temporary `test/media-tracks.test.js` was used for red/green verification and should be removed before finishing this task.

## Task 5: Native Note Action Controls

**Files:**
- Create: `packages/artplayer/src/player/actionMix.js`
- Create: `packages/artplayer/src/control/action.js`
- Modify: `packages/artplayer/src/player/screenshotMix.js`
- Modify: `packages/artplayer/src/control/index.js`
- Modify: `packages/artplayer/src/index.js`
- Modify: `packages/artplayer/src/scheme/index.js`
- Modify: `packages/artplayer/types/option.d.ts`
- Modify: `packages/artplayer/types/player.d.ts`
- Modify: `packages/artplayer/types/artplayer.d.ts`
- Temporary test: `test/player-actions.test.js` during implementation only, deleted after verification

**Interfaces:**
- Produces: `art.getScreenshotBlob(format, quality)`
- Produces: `art.screenshot(format, quality)` copies the image Blob to the clipboard
- Produces: `art.setLoopSegment(start, end)`
- Produces: `art.clearLoopSegment()`, `art.captureTimestamp()`, `art.captureLoopSegment()`, `art.emitAction(type, detail)`
- Emits: `action:timestamp`, `action:loopSegment`, `action:screenshot`, `action:mediaNotes`

- [x] **Step 1: Add tests for action event emission**
- [x] **Step 2: Implement screenshot Blob capture**
- [x] **Step 3: Implement loop segment state and clear behavior**
- [x] **Step 4: Add built-in controls gated by options**
- [x] **Step 5: Verify controls do not write documents**

**Implemented slice:** `actionMix` adds the native action/event layer without any SiYuan document writes. `emitAction(type, detail)` emits both `action:${type}` and the shared `action` event with current media/time/loop detail. `captureTimestamp()` emits timestamp actions, `captureLoopSegment()` uses the current playback position as start/end points, `setLoopSegment()` stores a native loop segment and seeks to its start, and `clearLoopSegment()` resets it. `screenshotMix` now exposes `getScreenshotBlob(format, quality)` and changes `screenshot()` from download/save behavior to Clipboard API copy. Built-in desktop action buttons are gated by `option.actions`, where `true` enables `timestamp`, `loopSegment`, and `mediaNotes`, and an array enables a selected subset. The temporary `test/player-actions.test.js` was used for red/green verification and should be removed before finishing this task.

## Task 6: Native Playlist UI With Hooks

**Files:**
- Create: `packages/artplayer/src/player/playlist/index.js`
- Create: `packages/artplayer/src/player/playlist/schema.js`
- Create: `packages/artplayer/src/player/playlist/view.js`
- Create: `packages/artplayer/src/control/playlist.js`
- Create: `packages/artplayer/src/style/playlist.less`
- Modify: `packages/artplayer/src/control/index.js`
- Modify: `packages/artplayer/src/player/index.js`
- Modify: `packages/artplayer/src/player/mediaMix.js`
- Modify: `packages/artplayer/src/template.js`
- Modify: `packages/artplayer/src/index.js`
- Modify: `packages/artplayer/src/scheme/index.js`
- Modify: `packages/artplayer/src/style/index.less`
- Modify: `packages/artplayer/types/media.d.ts`
- Modify: `packages/artplayer/types/option.d.ts`
- Modify: `packages/artplayer/types/player.d.ts`
- Modify: `packages/artplayer/types/template.d.ts`
- Modify: `packages/artplayer/types/artplayer.d.ts`
- Temporary test: `test/player-playlist.test.js` during implementation only, deleted after verification

**Interfaces:**
- Consumes: `ArtplayerPlaylist`
- Produces: `art.setPlaylist(playlist, currentUrl)`
- Produces: `art.playlistPlay(id)`, `art.playlistNext()`, `art.playlistPrev()`, `art.playlistAdd(item, groupId)`, `art.playlistRemove(id)`
- Produces: `art.togglePlaylistFavorite(id)`, `art.clearPlaylistHistory()`, `art.playlistToggle()`
- Emits/hooks: `onPlayItem`, `onToggleFavorite`, `onSaveProgress`, `onClearHistory`

- [x] **Step 1: Add tests for group conversion and current item selection**
- [x] **Step 2: Implement playlist schema validation**
- [x] **Step 3: Implement current item, previous, and next state**
- [x] **Step 4: Add hook calls without direct persistence**
- [x] **Step 5: Verify plugin can remain storage owner**

**Implemented slice:** `normalizePlaylist()` accepts flat `items`, grouped `groups`, hierarchical `roots`/`tree.roots`, `favorites`, and `history`, then builds a stable flat item index for playback. `playlistMix` exposes native playlist state and methods for set/play/next/previous/add/remove/favorite/history-clear, and calls hooks without writing any storage. `playMedia(media)` applies embedded `media.playlist` automatically. The lightweight playlist panel is opt-in through `option.playlist`, supports Playlist/Favorites/History tabs, grouped rows, tree rows, favorite toggles, item removal, and history clearing. Favorites and history are in-memory view collections owned by ArtPlayer at runtime; persistence remains the plugin's responsibility through hooks. The temporary `test/player-playlist.test.js` was used for red/green verification and should be removed before finishing this task.
