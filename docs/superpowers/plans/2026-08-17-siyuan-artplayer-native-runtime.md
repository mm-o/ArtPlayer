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

- `packages/artplayer/src/style/hint.less`: scopes Hint.css selectors to `.art-video-player`.
- `scripts/check-style-scope.js`: lightweight test that fails if global `hint--` selectors remain.
- `package.json`: adds a style-scope test script.
- `packages/artplayer/src/runtime/media.js`: future normalized media runtime.
- `packages/artplayer/types/artplayer.d.ts`: future public runtime/media types.
- `packages/artplayer/src/player/adapters/`: future HLS/DASH/custom playback adapters.
- `packages/artplayer/src/player/actions/`: future screenshot, timestamp, loop segment, and media notes event controls.
- `packages/artplayer/src/player/playlist/`: future native playlist state and UI.

## Task 1: Scope Hint Tooltip Styles

**Files:**
- Create: `scripts/check-style-scope.js`
- Modify: `package.json`
- Modify: `packages/artplayer/src/style/hint.less`

**Interfaces:**
- Produces: `npm.cmd run test:style-scope`
- Produces: tooltip styles that only match descendants of `.art-video-player`

- [ ] **Step 1: Write the failing test**

Create `scripts/check-style-scope.js`:

```js
import fs from 'node:fs'
import path from 'node:path'

const file = path.resolve('packages/artplayer/src/style/hint.less')
const source = fs.readFileSync(file, 'utf8')
const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '')
const violations = []

for (const line of stripped.split(/\r?\n/)) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('@') || !trimmed.includes('hint--')) continue
  if (trimmed.startsWith('.art-video-player')) continue
  if (trimmed.startsWith('&')) continue
  if (/^[,{}]$/.test(trimmed)) continue
  violations.push(trimmed)
}

if (violations.length) {
  console.error('Unscoped hint selectors found:')
  for (const violation of violations.slice(0, 20)) console.error(`- ${violation}`)
  process.exit(1)
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm.cmd run test:style-scope`

Expected before implementation: FAIL with lines such as `[class*='hint--'] {` and `.hint--top:before {`.

- [ ] **Step 3: Add the npm script**

In root `package.json`, add:

```json
"test:style-scope": "node ./scripts/check-style-scope.js"
```

- [ ] **Step 4: Scope `hint.less`**

Wrap the Hint.css selectors in:

```less
.art-video-player {
    /* existing Hint.css selectors */
}
```

Keep comments and selector bodies intact. The emitted CSS becomes `.art-video-player .hint--top:before`, so SiYuan `.protyle-hint` is unaffected.

- [ ] **Step 5: Run test to verify it passes**

Run: `npm.cmd run test:style-scope`

Expected: PASS with exit code 0.

- [ ] **Step 6: Inspect diff**

Run: `git diff -- packages/artplayer/src/style/hint.less scripts/check-style-scope.js package.json`

Expected: only style scoping, test script, and package script changed.

## Task 2: Define Standard Media Schema

**Files:**
- Create: `packages/artplayer/src/runtime/media.js`
- Modify: `packages/artplayer/src/index.js`
- Modify: `packages/artplayer/types/artplayer.d.ts`
- Test: `test/media-schema.test.js`

**Interfaces:**
- Produces: `Artplayer.normalizeMedia(input)`
- Produces: `art.playMedia(media)`
- Consumes: media fields from the design doc.

- [ ] **Step 1: Add failing tests for URL media and object media**
- [ ] **Step 2: Implement `normalizeMedia` with no source-specific logic**
- [ ] **Step 3: Expose `playMedia(media)` as a thin wrapper over current URL/type APIs**
- [ ] **Step 4: Update declarations**
- [ ] **Step 5: Run targeted tests**

## Task 3: Move Stream Routing Into ArtPlayer

**Files:**
- Create: `packages/artplayer/src/player/adapters/hls.js`
- Create: `packages/artplayer/src/player/adapters/dash.js`
- Modify: `packages/artplayer/src/player/index.js`
- Modify: `packages/artplayer/types/artplayer.d.ts`
- Test: `test/media-adapters.test.js`

**Interfaces:**
- Consumes: `ArtplayerMedia.type`
- Produces: internal adapter selection for `m3u8`, `mpd`, and `auto`

- [ ] **Step 1: Add tests for adapter selection**
- [ ] **Step 2: Move HLS/DASH behavior from the old plugin into adapter modules**
- [ ] **Step 3: Clean up adapters on source switch and destroy**
- [ ] **Step 4: Run tests and a local demo build**

## Task 4: Native Quality, Subtitle, Danmaku, and Tracks

**Files:**
- Modify: `packages/artplayer/src/setting/index.js`
- Modify: `packages/artplayer/src/control/index.js`
- Modify: `packages/artplayer/src/subtitle.js`
- Modify: `packages/artplayer/types/artplayer.d.ts`
- Test: `test/media-tracks.test.js`

**Interfaces:**
- Consumes: `qualities`, `qualityLoader`, `subtitles`, `danmaku`, `audioTracks`
- Produces: `art.updateQuality(items)`, `art.setSubtitles(tracks)`, `art.setDanmaku(items)`

- [ ] **Step 1: Add state tests for selector cleanup on source switch**
- [ ] **Step 2: Add native quality selector update API**
- [ ] **Step 3: Add subtitle track select/clear API**
- [ ] **Step 4: Add danmaku reset/show/hide API**
- [ ] **Step 5: Run targeted tests**

## Task 5: Native Note Action Controls

**Files:**
- Create: `packages/artplayer/src/player/actions/index.js`
- Modify: `packages/artplayer/src/control/index.js`
- Modify: `packages/artplayer/types/artplayer.d.ts`
- Test: `test/player-actions.test.js`

**Interfaces:**
- Produces: `art.getScreenshotBlob(format, quality)`
- Produces: `art.setLoopSegment(start, end)`
- Emits: `action:timestamp`, `action:loopSegment`, `action:screenshot`, `action:mediaNotes`

- [ ] **Step 1: Add tests for action event emission**
- [ ] **Step 2: Implement screenshot Blob capture**
- [ ] **Step 3: Implement loop segment state and clear behavior**
- [ ] **Step 4: Add built-in controls gated by options**
- [ ] **Step 5: Verify controls do not write documents**

## Task 6: Native Playlist UI With Hooks

**Files:**
- Create: `packages/artplayer/src/player/playlist/index.js`
- Create: `packages/artplayer/src/player/playlist/schema.js`
- Modify: `packages/artplayer/src/control/index.js`
- Modify: `packages/artplayer/types/artplayer.d.ts`
- Test: `test/player-playlist.test.js`

**Interfaces:**
- Consumes: `ArtplayerPlaylist`
- Produces: `art.setPlaylist(playlist, currentUrl)`
- Emits/hooks: `onPlayItem`, `onToggleFavorite`, `onSaveProgress`, `onClearHistory`

- [ ] **Step 1: Add tests for group conversion and current item selection**
- [ ] **Step 2: Implement playlist schema validation**
- [ ] **Step 3: Implement current item, previous, and next state**
- [ ] **Step 4: Add hook calls without direct persistence**
- [ ] **Step 5: Verify plugin can remain storage owner**
