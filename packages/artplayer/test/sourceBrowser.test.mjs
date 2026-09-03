import assert from 'node:assert/strict';
import test from 'node:test';

import { sourceBrowserSide } from '../src/player/sourceBrowser.js';

test('opens a source browser on the side with enough player space', () => {
    assert.equal(sourceBrowserSide({ left: 100, panel: 320, browser: 320, player: 900, padding: 10 }), 'right');
    assert.equal(sourceBrowserSide({ left: 550, panel: 320, browser: 320, player: 900, padding: 10 }), 'left');
});
