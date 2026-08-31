import { def } from '../utils/property.js';
import { append, query } from '../utils';
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

function pickDefault(list) {
    return list.find((item) => item.default) || list[0] || null;
}

function pickSubtitleTracks(tracks, option) {
    const active = toArray(option.activeTracks)
        .map((item) =>
            typeof item === 'string'
                ? tracks.find((track) => track.url === item || track.lang === item || track.name === item)
                : item,
        )
        .filter(Boolean);
    if (active.length) return active;
    const lang = option.defaultLang;
    const matched = lang ? tracks.filter((track) => track.lang === lang || track.name === lang) : [];
    return (matched.length ? matched : [pickDefault(tracks)].filter(Boolean)).slice(0, option.maxTracks || 2);
}

function subtitleStyle(config = {}) {
    const bgOpacity = config.backgroundOpacity ?? 0;
    const edge = config.edgeStyle || 'outline';
    return {
        fontSize: config.fontSize ? `${config.fontSize}px` : null,
        color: config.color || null,
        backgroundColor:
            config.backgroundColor && bgOpacity
                ? `${config.backgroundColor}${Math.round(bgOpacity * 2.55)
                    .toString(16)
                    .padStart(2, '0')}`
                : null,
        bottom: config.bottom === undefined ? null : `${config.bottom}%`,
        textShadow: edge === 'none' ? 'none' : edge === 'shadow' ? '0 2px 4px #000' : null,
    };
}

function installSubtitlePanel(art) {
    const { i18n, icons, controls, proxy, template } = art;
    function range($inner, label, key, min, max, step, suffix) {
        const $item = append(
            $inner,
            '<div class="apd-config-slider"><span class="apd-label"></span><div class="apd-slider"><div class="apd-slider-line"><div class="apd-slider-points"></div><div class="apd-slider-progress"></div></div><div class="apd-slider-dot"></div></div><span class="apd-value"></span></div>',
        );
        const $slider = query('.apd-slider', $item);
        const $points = query('.apd-slider-points', $item);
        const $progress = query('.apd-slider-progress', $item);
        const $dot = query('.apd-slider-dot', $item);
        const $value = query('.apd-value', $item);
        query('.apd-label', $item).textContent = i18n.get(label);
        for (let index = 0; index < 5; index += 1) append($points, '<i></i>');

        let current = min;
        const paint = (next) => {
            const value = Number(next);
            current = Math.min(
                max,
                Math.max(min, Math.round((Number.isFinite(value) ? value : current) / step) * step),
            );
            const percent = ((current - min) / (max - min)) * 100;
            $progress.style.width = `${percent}%`;
            $dot.style.left = `${percent}%`;
            $value.textContent = `${Number(current.toFixed(2))}${suffix}`;
            return current;
        };
        const update = (event) => {
            const { left, right, width } = $slider.getBoundingClientRect();
            const current = min + ((Math.min(right, Math.max(left, event.clientX)) - left) / width) * (max - min);
            art.setSubtitleConfig({ [key]: paint(current) });
        };
        const release = (event) => {
            if ($slider.hasPointerCapture(event.pointerId)) $slider.releasePointerCapture(event.pointerId);
        };
        proxy($slider, 'pointerdown', (event) => {
            if (event.button !== 0) return;
            $slider.setPointerCapture(event.pointerId);
            update(event);
        });
        proxy($slider, 'pointermove', (event) => $slider.hasPointerCapture(event.pointerId) && update(event));
        proxy($slider, 'pointerup', release);
        proxy($slider, 'pointercancel', release);
        paint(art.getSubtitleConfig()[key] ?? min);
        return paint;
    }

    controls.update({
        name: 'subtitle',
        position: 'right',
        index: 11,
        html: icons.subtitle,
        click: () => {
            if (!art.subtitleTracks.length) art.notice.show = i18n.get('No Subtitle');
        },
        mounted: ($control) => {
            $control.classList.add('art-control-subtitle', 'apd-config');
            const $panel = append(
                $control,
                '<div class="apd-config-panel"><div class="apd-config-panel-inner"><div class="apd-config-other"></div></div></div>',
            );
            const $inner = query('.apd-config-panel-inner', $panel);
            const $checks = query('.apd-config-other', $inner);
            const sliders = {
                offset: range($inner, 'Subtitle Offset', 'offset', -10, 10, 0.1, 's'),
                fontSize: range($inner, 'Font Size', 'fontSize', 12, 60, 1, 'px'),
                bottom: range($inner, 'Subtitle Position', 'bottom', 0, 40, 1, '%'),
                backgroundOpacity: range($inner, 'Background Opacity', 'backgroundOpacity', 0, 100, 5, '%'),
            };

            const addCheck = (label, checked, index = -1) => {
                const $item = append(
                    $checks,
                    `<label class="apd-other" data-index="${index}"><input class="apd-check" type="checkbox"><span></span></label>`,
                );
                query('.apd-check', $item).checked = checked;
                query('span', $item).textContent = label;
            };
            const render = () => {
                const active = art.activeSubtitleTracks;
                $checks.innerHTML = '';
                addCheck(i18n.get('Subtitle'), art.subtitle.show);
                art.subtitleTracks.forEach((track, index) =>
                    addCheck(
                        track.name || track.lang || i18n.get('Subtitle'),
                        active.some((item) => item.url === track.url),
                        index,
                    ),
                );
                $control.style.display = art.subtitleTracks.length ? '' : 'none';
            };

            proxy($checks, 'click', async (event) => {
                const $item = event.target.closest('.apd-other');
                if (!$item) return;
                event.preventDefault();
                const index = Number($item.dataset.index);
                if (index < 0) {
                    art.setSubtitleConfig({ visible: !art.subtitle.show });
                } else {
                    const track = art.subtitleTracks[index];
                    const active = art.activeSubtitleTracks;
                    await art.selectSubtitleTracks(
                        active.some((item) => item.url === track.url)
                            ? active.filter((item) => item.url !== track.url)
                            : [...active, track].slice(0, art.option.subtitle.maxTracks),
                    );
                }
                render();
            });
            proxy($control, 'mouseenter', () => {
                const controlRect = $control.getBoundingClientRect();
                const panelRect = $panel.getBoundingClientRect();
                const playerRect = template.$player.getBoundingClientRect();
                const half = panelRect.width / 2 - controlRect.width / 2;
                const left = playerRect.left - controlRect.left + half;
                const right = controlRect.right + half - playerRect.right;
                $panel.style.left = `${left > 0 ? -half + left : right > 0 ? -half - right : -half}px`;
            });
            art.on('subtitle:change', render);
            art.on('subtitle:config', (config) => {
                Object.keys(sliders).forEach((key) => sliders[key](config[key]));
                render();
            });
            render();
        },
    });
}

function getDanmakuPlugin(art) {
    return art.plugins?.artplayerPluginDanmuku || art.plugins?.artplayerPluginDanmaku;
}

function danmakuConfig(option = {}) {
    return Object.fromEntries(Object.entries(option).filter(([key]) => key !== 'danmuku' && key !== 'items'));
}

export default function mediaMix(art) {
    let currentMedia = null;
    let subtitleTracks = [];
    let activeSubtitleTracks = [];
    let subtitleConfig = { ...art.option.subtitle.config };
    let danmaku = [];
    let currentDanmakuConfig = {};
    let audioTracks = [];
    let currentMediaToken = 0;

    def(art, 'installSubtitlePanel', { value: () => installSubtitlePanel(art) });

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

    def(art, 'activeSubtitleTracks', {
        get() {
            return activeSubtitleTracks;
        },
    });

    def(art, 'getSubtitleConfig', { value: () => ({ ...subtitleConfig }) });

    def(art, 'setSubtitleConfig', {
        value(config = {}) {
            subtitleConfig = { ...subtitleConfig, ...config };
            if ('visible' in config) art.subtitle.show = !!config.visible;
            if ('offset' in config) art.subtitleOffset = config.offset;
            art.subtitle.style(subtitleStyle(subtitleConfig));
            const value = art.getSubtitleConfig();
            art.emit('subtitle:config', value);
            return value;
        },
    });

    def(art, 'setSubtitles', {
        async value(tracks = []) {
            subtitleTracks = toArray(tracks);
            return art.selectSubtitleTracks(pickSubtitleTracks(subtitleTracks, art.option.subtitle));
        },
    });

    def(art, 'selectSubtitleTracks', {
        async value(tracks = []) {
            activeSubtitleTracks = toArray(tracks)
                .filter((track) => track?.url)
                .slice(0, art.option.subtitle.maxTracks || 2);

            if (!activeSubtitleTracks.length) {
                art.subtitle.clear();
                art.emit('subtitle:change', null, subtitleTracks);
                return null;
            }

            art.subtitle.clear();
            for (const track of activeSubtitleTracks) {
                await art.subtitle.add(track.url, track);
            }
            art.setSubtitleConfig({ visible: subtitleConfig.visible ?? true });
            art.emit('subtitle:change', activeSubtitleTracks[0], subtitleTracks);
            return activeSubtitleTracks;
        },
    });

    def(art, 'selectSubtitle', {
        async value(track, tracks = subtitleTracks) {
            if (!track?.url) return art.setSubtitles([]);
            subtitleTracks = [track, ...toArray(tracks).filter((item) => item?.url && item.url !== track.url)];
            return art.selectSubtitleTracks([track]);
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
