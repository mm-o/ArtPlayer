import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveSource, sourceBrowserSide } from '../src/player/sourceBrowser.js';

test('opens a source browser on the side with enough player space', () => {
    assert.equal(sourceBrowserSide({ left: 100, panel: 320, browser: 320, player: 900, padding: 10 }), 'right');
    assert.equal(sourceBrowserSide({ left: 550, panel: 320, browser: 320, player: 900, padding: 10 }), 'left');
});

test('resolves local, indexed, named and direct sources through one contract', () => {
    const sources = [{ name: 'Cloud' }, { name: 'Online' }];
    assert.equal(resolveSource('local', sources), 'local');
    assert.equal(resolveSource('0', sources), sources[0]);
    assert.equal(resolveSource('Online', sources), sources[1]);
    assert.equal(resolveSource(sources[0], sources), sources[0]);
});
