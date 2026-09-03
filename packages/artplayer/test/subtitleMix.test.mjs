import assert from 'node:assert/strict';
import test from 'node:test';

import { pickSubtitleTracks, uniqueSubtitleTracks } from '../src/player/subtitleTrack.js';
import { parseSubtitle } from '../src/utils/parseSubtitle.js';

const tracks = [
    { id: 'zh', lang: 'zh', url: 'zh.json', default: true },
    { id: 'en', lang: 'en', url: 'en.json' },
];

test('picks configured active subtitle tracks without duplicates', () => {
    assert.deepEqual(
        pickSubtitleTracks(tracks, { activeTracks: ['en', tracks[1], 'en.json'] }),
        [tracks[1]],
    );
});

test('falls back to preferred language and then the default track', () => {
    assert.deepEqual(pickSubtitleTracks(tracks, { defaultLang: 'en' }), [tracks[1]]);
    assert.deepEqual(pickSubtitleTracks(tracks, {}), [tracks[0]]);
});

test('uses stable subtitle identity when merging tracks', () => {
    assert.deepEqual(
        uniqueSubtitleTracks([tracks[0], { url: 'temporary', sourceUrl: 'zh.json' }, tracks[1]]),
        tracks,
    );
});

test('parses VTT and Bilibili JSON into the same cue model', () => {
    assert.deepEqual(
        parseSubtitle('WEBVTT\n\n00:00:01.000 --> 00:00:02.500\nHello', 'vtt'),
        [{ startTime: 1, endTime: 2.5, text: 'Hello' }],
    );
    assert.deepEqual(
        parseSubtitle('{"body":[{"from":1,"to":2.5,"content":"Hello"}]}', 'json'),
        [{ startTime: 1, endTime: 2.5, text: 'Hello' }],
    );
});
