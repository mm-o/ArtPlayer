import { def } from '../utils/property.js';
import { normalizeMedia } from '../runtime/media.js';

function isObjectUrlSource(value) {
    return (
        value &&
        typeof value === 'object' &&
        typeof URL !== 'undefined' &&
        typeof URL.createObjectURL === 'function' &&
        ((typeof Blob !== 'undefined' && value instanceof Blob) ||
            (typeof File !== 'undefined' && value instanceof File))
    );
}

function applyStartTime(art, media) {
    const time = Number(media.currentTime ?? media.startTime);
    if (!Number.isFinite(time) || time <= 0) return;

    const seek = () => {
        art.currentTime = Math.max(0, time);
    };

    if ((art.video?.readyState || 0) >= 1) {
        seek();
    } else if (typeof art.once === 'function') {
        art.once('video:loadedmetadata', seek);
    }
}

function toPlayableUrl(value) {
    return isObjectUrlSource(value) ? URL.createObjectURL(value) : value;
}

function toArray(value) {
    return Array.isArray(value) ? value : [];
}

function getDanmakuPlugin(art) {
    return art.plugins?.artplayerPluginDanmuku || art.plugins?.artplayerPluginDanmaku;
}

function danmakuConfig(option = {}) {
    return Object.fromEntries(Object.entries(option).filter(([key]) => key !== 'danmuku' && key !== 'items'));
}

export default function mediaMix(art) {
    let currentMedia = null;
    let danmaku = [];
    let currentDanmakuConfig = {};
    let audioTracks = [];
    let currentMediaToken = 0;
    def(art, 'currentMedia', {
        get() {
            return currentMedia;
        },
    });

    def(art, 'getCurrentMedia', {
        value() {
            return currentMedia;
        },
    });


    def(art, 'danmaku', {
        get() {
            return danmaku;
        },
    });

    def(art, 'getDanmaku', { value: () => danmaku.slice() });

    def(art, 'setDanmaku', {
        async value(items = []) {
            danmaku = toArray(items);
            const plugin = getDanmakuPlugin(art);
            await plugin?.replace?.(danmaku);
            art.emit('danmaku:change', danmaku);
            return danmaku;
        },
    });

    def(art, 'addDanmaku', {
        async value(items = []) {
            const added = toArray(items);
            if (!added.length) return danmaku;
            await getDanmakuPlugin(art)?.load?.(added);
            danmaku = danmaku.concat(added);
            art.emit('danmaku:add', added);
            art.emit('danmaku:change', danmaku);
            return danmaku;
        },
    });

    def(art, 'emitDanmaku', {
        async value(item) {
            if (!item) return danmaku;
            await getDanmakuPlugin(art)?.emit?.(item);
            danmaku = danmaku.concat(item);
            art.emit('danmaku:add', [item]);
            art.emit('danmaku:change', danmaku);
            return danmaku;
        },
    });

    def(art, 'clearDanmaku', {
        value() {
            danmaku = [];
            getDanmakuPlugin(art)?.clear?.();
            art.emit('danmaku:change', danmaku);
            return danmaku;
        },
    });

    def(art, 'getDanmakuConfig', {
        value() {
            return danmakuConfig(getDanmakuPlugin(art)?.option || currentDanmakuConfig);
        },
    });

    def(art, 'setDanmakuConfig', {
        value(config = {}) {
            getDanmakuPlugin(art)?.config?.(danmakuConfig(config));
            return art.getDanmakuConfig();
        },
    });

    art.on('artplayerPluginDanmuku:config', (config) => {
        currentDanmakuConfig = danmakuConfig(config);
        art.emit('danmaku:config', currentDanmakuConfig);
    });

    def(art, 'audioTracks', {
        get() {
            return audioTracks;
        },
    });

    def(art, 'setAudioTracks', {
        value(tracks = []) {
            audioTracks = toArray(tracks);

            if (typeof art.emit === 'function') {
                art.emit('audioTracks:change', audioTracks);
            }

            return audioTracks;
        },
    });

    def(art, 'playMedia', {
        async value(input) {
            const media = normalizeMedia(input);
            currentMedia = media;
            const mediaToken = ++currentMediaToken;

            if (typeof art.thumbnails !== 'undefined') {
                art.thumbnails = null;
            }
            if (media.title) art.title = media.title;
            if (media.poster !== undefined) art.poster = media.poster;
            if (media.type) art.type = media.type;
            art.option.isLive = !!media.isLive;
            if (media.thumbnails) art.thumbnails = media.thumbnails;
            if (typeof art.updateQuality === 'function') art.updateQuality(media.qualities || []);
            if (media.playlist && typeof art.setPlaylist === 'function') art.setPlaylist(media.playlist, media.url);
            if (typeof art.playlistRecordHistory === 'function') await art.playlistRecordHistory(media);

            if (typeof art.emit === 'function') {
                art.emit('media:change', media);
            }

            art.url = toPlayableUrl(media.url);
            applyStartTime(art, media);

            if (typeof art.setSubtitles === 'function') await art.setSubtitles(media.subtitles || []);
            if (typeof art.setDanmaku === 'function') art.setDanmaku(media.danmaku || []).catch(() => {});
            if (typeof art.setAudioTracks === 'function') art.setAudioTracks(media.audioTracks || []);

            if (typeof art.play === 'function') {
                try {
                    await art.play();
                } catch (error) {
                    if (error?.name !== 'AbortError' && error?.name !== 'NotAllowedError') throw error;
                    if (error?.name === 'AbortError' && mediaToken === currentMediaToken) throw error;
                }
            }

            if (typeof media.getThumbnails === 'function' && mediaToken === currentMediaToken) {
                Promise.resolve(media.getThumbnails(media, art))
                    .then((thumbnails) => {
                        if (mediaToken !== currentMediaToken || !thumbnails) return;
                        art.thumbnails = thumbnails;
                    })
                    .catch(() => {});
            }

            return media;
        },
    });
}
