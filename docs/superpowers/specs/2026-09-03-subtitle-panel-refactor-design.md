# Subtitle Panel Refactor

## Scope

Refactor only the subtitle panel structure, styling, and interaction. Subtitle discovery, loading, parsing, caching, selection, rendering, persistence, and public APIs keep their current behavior.

## Structure

- Keep one player-level overlay host so the panel is not clipped by the control bar.
- Render the main subtitle panel and cloud browser as sibling panels inside that host.
- Keep track controls, source actions, and style controls as separate regions in the main panel.
- Keep the cloud browser header and footer fixed; only its item list scrolls.

## Interaction

- Match the danmaku panel's immediate hover behavior for the main panel.
- Pin the overlay only while the cloud browser is open.
- Returning from the cloud root or confirming a selection closes the browser without destroying the main panel.
- Use one delegated click handler for tracks, source actions, browser navigation, selection, and confirmation.
- Position the main panel from the subtitle control and choose the browser side from measured panel widths, without hard-coded offsets.

## Rendering

- Subtitle changes update only the track region.
- Source changes update only the source region.
- Config changes repaint only selectors and sliders.
- Dynamic labels are assigned with `textContent`.

## Styling

- Reuse the danmaku panel measurements and visual vocabulary: 12px text, 320px panel width, 10px panel padding, 15px row spacing, shared ArtPlayer colors and radii.
- Give the browser its own class instead of changing the source action region into a second panel.
- Remove multi-purpose browser classes and hard-coded `328px` positioning.

## Verification

- Add focused tests for panel-side placement and browser state transitions through extracted pure helpers.
- Run subtitle contract tests, ESLint, ArtPlayer builds, plugin production build, and installed artifact hash comparison.
