import { def } from '../utils/property.js';
import {
    loadDanmakuSource,
    mergeDanmakuSources,
    pickDanmakuSources,
    sameDanmakuSource,
    uniqueDanmakuSources,
} from './danmakuTrack.js';

const toArray = (value) => (Array.isArray(value) ? value : []);
const plugin = (art) => art.plugins?.artplayerPluginDanmuku || art.plugins?.artplayerPluginDanmaku;
const cleanConfig = (value = {}) => Object.fromEntries(Object.entries(value).filter(([key]) => !['danmuku', 'items'].includes(key)));

export default function danmakuMix(art) {
    let tracks = [];
    let active = [];
    let items = [];
    let sources = [];
    let config = {};
    let token = 0;

    def(art, 'getDanmaku', { value: () => items.slice() });
    def(art, 'getDanmakuTracks', { value: () => tracks.slice() });
    def(art, 'getActiveDanmakuTracks', { value: () => active.slice() });
    def(art, 'getDanmakuSources', { value: () => sources.slice() });

    def(art, 'setDanmakuSources', {
        value(value = []) {
            sources = toArray(value).filter((source) => typeof source?.load === 'function' || source?.browse);
            art.emit('danmaku:sources', sources);
            return sources;
        },
    });
    def(art, 'selectDanmakuTracks', {
        async value(value = []) {
            const current = ++token;
            const selected = uniqueDanmakuSources(toArray(value).map((track) => tracks.find((item) => sameDanmakuSource(item, track)) || track));
            const previous = active;
            active = selected;
            let loaded;
            try {
                loaded = await Promise.all(selected.map(async (track) => ({ ...track, items: await loadDanmakuSource(track) })));
            } catch (error) {
                if (current === token) {
                    active = previous;
                    art.notice.show = error;
                }
                return items;
            }
            if (current !== token) return items;
            items = mergeDanmakuSources(loaded);
            await plugin(art)?.replace?.(items);
            art.emit('danmaku:change', items, tracks);
            return items;
        },
    });
    def(art, 'setDanmakuTracks', {
        value(value = []) {
            tracks = uniqueDanmakuSources(value);
            return art.selectDanmakuTracks(pickDanmakuSources(tracks, art.option.danmaku || {}));
        },
    });
    def(art, 'addDanmakuTracks', {
        value(value = [], select = true) {
            const added = uniqueDanmakuSources(value);
            tracks = uniqueDanmakuSources([...tracks, ...added]);
            return select && added.length ? art.selectDanmakuTracks([...active, ...added]) : added;
        },
    });
    def(art, 'addDanmakuFiles', {
        value(files = []) {
            return art.addDanmakuTracks(toArray(files).map((file) => ({
                id: `${file.name}:${file.size}:${file.lastModified}`,
                name: file.name,
                file,
                type: file.name.split('.').pop(),
                source: 'local',
            })));
        },
    });

    def(art, 'setDanmaku', {
        value(value = []) {
            return art.setDanmakuTracks(toArray(value).length ? [{ id: 'media', name: 'Media', items: value, default: true }] : []);
        },
    });
    def(art, 'addDanmaku', {
        async value(value = []) {
            const added = toArray(value);
            if (!added.length) return items;
            await plugin(art)?.load?.(added);
            items = items.concat(added);
            art.emit('danmaku:add', added);
            art.emit('danmaku:change', items, tracks);
            return items;
        },
    });
    def(art, 'emitDanmaku', {
        async value(item) {
            if (!item) return items;
            await plugin(art)?.emit?.(item);
            items = items.concat(item);
            art.emit('danmaku:add', [item]);
            art.emit('danmaku:change', items, tracks);
            return items;
        },
    });
    def(art, 'clearDanmaku', {
        value() {
            token += 1;
            tracks = [];
            active = [];
            items = [];
            plugin(art)?.clear?.();
            art.emit('danmaku:change', items, tracks);
            return items;
        },
    });
    def(art, 'getDanmakuConfig', { value: () => cleanConfig(plugin(art)?.option || config) });
    def(art, 'setDanmakuConfig', {
        value(value = {}) {
            plugin(art)?.config?.(cleanConfig(value));
            return art.getDanmakuConfig();
        },
    });

    art.on('artplayerPluginDanmuku:config', (value) => {
        config = cleanConfig(value);
        art.emit('danmaku:config', config);
    });
}
