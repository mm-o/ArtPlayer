import assert from 'node:assert/strict';
import test from 'node:test';

import danmakuMix from '../src/player/danmakuMix.js';

const createArt = () => {
    const events = [];
    const handlers = new Map();
    const replaced = [];
    const art = {
        option: { danmaku: {} },
        plugins: { artplayerPluginDanmuku: { replace: async (items) => replaced.push(items), clear() {}, emit: async () => {}, load: async () => {} } },
        emit: (name, ...args) => events.push([name, ...args]),
        on: (name, handler) => handlers.set(name, handler),
    };
    danmakuMix(art);
    return { art, events, replaced };
};

test('selects and combines multiple danmaku tracks through one player state', async () => {
    const { art, replaced } = createArt();
    const bilibili = { id: 'bilibili', items: [{ text: 'B', time: 2 }], default: true };
    const local = { id: 'local', items: [{ text: 'A', time: 1 }] };

    await art.setDanmakuTracks([bilibili]);
    await art.addDanmakuTracks([local]);

    assert.deepEqual(art.getActiveDanmakuTracks(), [bilibili, local]);
    assert.deepEqual(art.getDanmaku().map((item) => item.text), ['A', 'B']);
    assert.deepEqual(replaced.at(-1).map((item) => item.text), ['A', 'B']);

    await art.selectDanmakuTracks([bilibili]);
    assert.deepEqual(art.getDanmaku().map((item) => item.text), ['B']);
});

test('keeps rapid source selections while a track is loading', async () => {
    const { art } = createArt();
    let release;
    const loading = new Promise((resolve) => { release = resolve; });
    const bilibili = { id: 'bilibili', items: [{ text: 'B', time: 2 }], default: true };
    const local = { id: 'local', file: { text: () => loading }, type: 'json' };
    const cloud = { id: 'cloud', data: '[{"text":"C","time":3}]', type: 'json' };

    await art.setDanmakuTracks([bilibili, local, cloud]);
    const first = art.selectDanmakuTracks([bilibili, local]);
    const second = art.selectDanmakuTracks([...art.getActiveDanmakuTracks(), cloud]);
    release('[{"text":"L","time":1}]');
    await Promise.all([first, second]);

    assert.deepEqual(art.getActiveDanmakuTracks(), [bilibili, local, cloud]);
    assert.deepEqual(art.getDanmaku().map((item) => item.text), ['L', 'B', 'C']);
});
