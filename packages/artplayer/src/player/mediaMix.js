import { def } from '../utils/property.js';
import { normalizeMedia } from '../runtime/media.js';

function isObjectUrlSource(value) {
    return (
        value &&
        typeof value === 'object' &&
        typeof URL !== 'undefined' &&
        typeof URL.createObjectURL === 'function' &&
        ((typeof Blob !== 'undefined' && value instanceof Blob) || (typeof File !== 'undefined' && value instanceof File))
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

function pickDefault(list) {
    return list.find((item) => item.default) || list[0] || null;
}

function getDanmakuPlugin(art) {
    return art.plugins?.artplayerPluginDanmuku || art.plugins?.artplayerPluginDanmaku;
}

function applyDanmakuPlugin(art, option) {
    const plugin = getDanmakuPlugin(art);
    if (!plugin) return;

    const list = Array.isArray(option) ? option : option?.danmuku || option?.items || [];
    const config = Array.isArray(option) ? { danmuku: list } : { ...option, danmuku: list };

    plugin.config?.(config);
    plugin.reset?.();
    plugin.load?.(list);

    if (config.visible === false) {
        plugin.hide?.();
    } else {
        plugin.show?.();
    }
}

export default function mediaMix(art) {
    let currentMedia = null;
    let subtitleTracks = [];
    let danmaku = [];
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

    def(art, 'subtitleTracks', {
        get() {
            return subtitleTracks;
        },
    });

    def(art, 'setSubtitles', {
        async value(tracks = []) {
            subtitleTracks = toArray(tracks);
            const track = pickDefault(subtitleTracks);

            if (!track?.url) {
                if (typeof art.subtitle?.clear === 'function') {
                    art.subtitle.clear();
                } else if (art.subtitle) {
                    art.subtitle.url = '';
                }

                if (art.subtitle) art.subtitle.show = false;

                try {
                    art.setting.remove('subtitle');
                } catch {}

                if (typeof art.emit === 'function') {
                    art.emit('subtitle:change', null, subtitleTracks);
                }

                return null;
            }

            await art.subtitle.switch(track.url, track);
            art.subtitle.show = true;

            if (typeof art.emit === 'function') {
                art.emit('subtitle:change', track, subtitleTracks);
            }

            return track;
        },
    });

    def(art, 'selectSubtitle', {
        async value(track, tracks = subtitleTracks) {
            if (!track?.url) return art.setSubtitles([]);
            const list = [track, ...toArray(tracks).filter((item) => item?.url && item.url !== track.url)];
            return art.setSubtitles(list.map((item, index) => ({ ...item, default: index === 0 })));
        },
    });

    def(art, 'danmaku', {
        get() {
            return danmaku;
        },
    });

    def(art, 'setDanmaku', {
        value(option = []) {
            danmaku = option || [];
            applyDanmakuPlugin(art, danmaku);

            if (typeof art.emit === 'function') {
                art.emit('danmaku:change', danmaku);
            }

            return danmaku;
        },
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
            if (typeof art.setSubtitles === 'function') await art.setSubtitles(media.subtitles || []);
            if (typeof art.setDanmaku === 'function') art.setDanmaku(media.danmaku || []);
            if (typeof art.setAudioTracks === 'function') art.setAudioTracks(media.audioTracks || []);
            if (media.playlist && typeof art.setPlaylist === 'function') art.setPlaylist(media.playlist, media.url);
            if (typeof art.playlistRecordHistory === 'function') await art.playlistRecordHistory(media);

            if (typeof art.emit === 'function') {
                art.emit('media:change', media);
            }

            art.url = toPlayableUrl(media.url);
            applyStartTime(art, media);

            if (typeof art.play === 'function') {
                await art.play();
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
