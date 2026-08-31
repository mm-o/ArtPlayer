# Unified Toolbar Controls Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make quality, subtitle, danmaku, and danmaku-settings buttons use ArtPlayer's existing toolbar pin/hide setting uniformly.

**Architecture:** ArtPlayer remains the single owner of toolbar visibility state through `controls.pinItems`, `isPinned`, and `setPinned`. Built-in and plugin controls register their user-facing toolbar entries through one registration path; hiding a control only changes its placement, while its underlying API and panel remain available.

**Tech Stack:** JavaScript, TypeScript, ArtPlayer controls/settings API, `artplayer-plugin-danmuku`, Vite, pnpm.

## Global Constraints

- Reuse the existing `controlPins` storage key and setting UI.
- Do not add a second toolbar visibility configuration in the Siyuan plugin.
- Do not change danmaku/subtitle data loading or playback behavior.
- Preserve dynamic removal when quality or subtitle data is unavailable.

---

### Task 1: Register built-in dynamic controls with the pin system

**Files:**
- Modify: `packages/artplayer/src/player/qualityMix.js`
- Modify: `packages/artplayer/src/player/mediaMix.js`
- Test: `test/ssr.test.js`

**Interfaces:**
- Consumes: existing `controls.update`, `controls.remove`, `pinItems`, and `setPinned` APIs.
- Produces: `quality` and `subtitle` entries in `controls.pinItems`, with persisted visibility and dynamic availability.

- [ ] **Step 1: Inspect current control update/remove behavior and identify the smallest registration change.**
- [ ] **Step 2: Add each dynamic control through the existing pinned registration path while preserving its current selector/panel behavior.**
- [ ] **Step 3: Remove the registration entry together with the control when the source becomes unavailable.**
- [ ] **Step 4: Run `node --test test/ssr.test.js` and verify the player still renders.**

### Task 2: Expose danmaku controls to the same setting list

**Files:**
- Modify: `packages/artplayer/src/player/mediaMix.js`
- Modify: `packages/artplayer-plugin-danmuku/src/index.js`
- Modify: `packages/artplayer-plugin-danmuku/src/types.js` if the public option type needs extension

**Interfaces:**
- Consumes: the plugin's existing control and config callbacks.
- Produces: separate `danmaku` and `danmakuConfig` pin entries registered in ArtPlayer, without changing the plugin's data APIs.

- [ ] **Step 1: Compare the plugin's current control registration with ArtPlayer's `addPinned` contract.**
- [ ] **Step 2: Register the display toggle and configuration entry with stable names and existing click behavior.**
- [ ] **Step 3: Ensure plugin destroy/reload removes stale registration entries and does not duplicate controls.**
- [ ] **Step 4: Run the plugin package tests/build and verify the setting list contains both entries once.**

### Task 3: Build, deploy, and verify integration

**Files:**
- Generated: `packages/artplayer/dist/artplayer.js`
- Generated: `packages/artplayer/dist/artplayer.legacy.js`
- Generated: `docs/compiled/artplayer.js`
- Generated: `docs/compiled/artplayer.legacy.js`
- Verify: `E:\Github\media-player-private\dist` and `E:\SiYuan\data\plugins\siyuan-media-player`

**Interfaces:**
- Consumes: the ArtPlayer and plugin source changes from Tasks 1-2.
- Produces: synchronized ArtPlayer bundles and Siyuan plugin deployment.

- [ ] **Step 1: Run the ArtPlayer build and its focused tests.**
- [ ] **Step 2: Sync the local ArtPlayer dependency, build the Siyuan plugin, and deploy it.**
- [ ] **Step 3: Compare local and deployed `index.js`/`index.css` SHA256 hashes.**
- [ ] **Step 4: Check `git diff --check` and inspect the final diffs before reporting.**
