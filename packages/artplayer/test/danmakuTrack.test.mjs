import assert from 'node:assert/strict';
import test from 'node:test';

import {
    loadDanmakuSource,
    mergeDanmakuSources,
    parseDanmaku,
    pickDanmakuSources,
    uniqueDanmakuSources,
} from '../src/player/danmakuTrack.js';

const sources = [
    { id: 'bilibili', name: 'Bilibili', items: [{ text: 'B', time: 2, mode: 0, color: '#ffffff' }], default: true },
    { id: 'local', name: 'Local', items: [{ text: 'A', time: 1, mode: 1, color: '#ff0000' }] },
];

test('keeps one copy of each danmaku source and selects multiple sources', () => {
    assert.deepEqual(uniqueDanmakuSources([sources[0], { ...sources[0] }, sources[1]]), sources);
    assert.deepEqual(pickDanmakuSources(sources, { activeSources: ['bilibili', sources[1]] }), sources);
});

test('merges selected danmaku sources in playback order', () => {
    assert.deepEqual(mergeDanmakuSources(sources), [sources[1].items[0], sources[0].items[0]]);
});

test('parses XML, ASS and JSON into the same danmaku model', () => {
    assert.deepEqual(
        parseDanmaku('<i><d p="1.5,5,25,16711680,0,0,u,1">Top</d></i>', 'xml'),
        [{ text: 'Top', time: 1.5, mode: 1, color: '#ff0000', fontSize: 25 }],
    );
    assert.deepEqual(
        parseDanmaku('Dialogue: 0,0:00:02.00,0:00:03.00,Default,,0,0,0,,ASS text', 'ass'),
        [{ text: 'ASS text', time: 2, mode: 0, color: '#ffffff' }],
    );
    assert.deepEqual(
        parseDanmaku('[{"content":"JSON text","timeMs":3000,"mode":4,"color":65280}]', 'json'),
        [{ text: 'JSON text', time: 3, mode: 2, color: '#00ff00' }],
    );
});

test('loads and caches each external danmaku source once', async () => {
    let requests = 0;
    const source = { id: 'cloud', url: 'cloud.xml', type: 'xml' };
    const fetcher = async () => {
        requests += 1;
        return { text: async () => '<d p="1,1,25,16777215">Once</d>' };
    };

    assert.deepEqual(await loadDanmakuSource(source, fetcher), [{ text: 'Once', time: 1, mode: 0, color: '#ffffff', fontSize: 25 }]);
    assert.deepEqual(await loadDanmakuSource(source, fetcher), [{ text: 'Once', time: 1, mode: 0, color: '#ffffff', fontSize: 25 }]);
    assert.equal(requests, 1);
});
