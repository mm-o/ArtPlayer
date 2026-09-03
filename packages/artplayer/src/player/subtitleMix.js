import { def } from '../utils/property.js';
import installSubtitlePanel from './subtitlePanel.js';
import { pickSubtitleTracks, sameSubtitle, uniqueSubtitleTracks } from './subtitleTrack.js';

const toArray = (value) => (Array.isArray(value) ? value : []);

const subtitleStyle = (config = {}) => {
    const opacity = Math.max(0, Math.min(100, Number(config.backgroundOpacity ?? 0)));
    const edge = config.edgeStyle || 'outline';
    return {
        fontSize: config.fontSize ? `${config.fontSize}px` : null,
        color: config.color || null,
        backgroundColor: config.backgroundColor && opacity
            ? `${config.backgroundColor}${Math.round(opacity * 2.55).toString(16).padStart(2, '0')}`
            : null,
        bottom: config.bottom === undefined ? null : `${config.bottom}%`,
        textShadow: edge === 'none'
            ? 'none'
            : edge === 'shadow'
                ? '0 2px 4px #000'
                : edge === 'thick'
                    ? '#000 2px 0 2px, #000 0 2px 2px, #000 -2px 0 2px, #000 0 -2px 2px'
                    : '#000 1px 0 1px, #000 0 1px 1px, #000 -1px 0 1px, #000 0 -1px 1px',
    };
};

export default function subtitleMix(art) {
    let tracks = [];
    let active = [];
    let config = { ...art.option.subtitle.config };
    let sources = toArray(art.option.subtitle.sources);
    let token = 0;
    let queue = Promise.resolve();
    const objectUrls = new Set();

    def(art, 'installSubtitlePanel', { value: () => installSubtitlePanel(art) });
    def(art, 'subtitleTracks', { get: () => tracks });
    def(art, 'activeSubtitleTracks', { get: () => active });
    def(art, 'subtitleSources', { get: () => sources });
    def(art, 'getSubtitleSources', { value: () => [...sources] });
    def(art, 'getSubtitleCues', {
        value: () => art.subtitle.cues.map((cue) => ({
            time: cue.startTime,
            endTime: cue.endTime,
            text: cue.text.replace(/<[^>]+>/g, '').trim(),
        })),
    });
    def(art, 'getSubtitleConfig', { value: () => ({ ...config }) });

    def(art, 'setSubtitleSources', {
        value(value = []) {
            sources = toArray(value).filter((source) => typeof source?.load === 'function' || source?.browse);
            art.emit('subtitle:sources', sources);
            return sources;
        },
    });
    def(art, 'setSubtitleConfig', {
        value(value = {}) {
            config = { ...config, ...value };
            if ('visible' in value) art.subtitle.show = !!value.visible;
            if ('offset' in value) art.subtitleOffset = value.offset;
            art.subtitle.style(subtitleStyle(config));
            art.emit('subtitle:config', art.getSubtitleConfig());
            return art.getSubtitleConfig();
        },
    });
    def(art, 'setSubtitles', {
        value(value = []) {
            tracks = uniqueSubtitleTracks(value);
            return art.selectSubtitleTracks(pickSubtitleTracks(tracks, art.option.subtitle));
        },
    });
    def(art, 'addSubtitles', {
        value(value = [], select = true) {
            const added = uniqueSubtitleTracks(value);
            tracks = uniqueSubtitleTracks([...tracks, ...added]);
            art.emit('subtitle:change', active[0] || null, tracks);
            return select && added.length ? art.selectSubtitleTracks([...active, ...added]) : added;
        },
    });
    def(art, 'addSubtitleFiles', {
        value(files = []) {
            const added = toArray(files).map((file) => {
                const url = URL.createObjectURL(file);
                objectUrls.add(url);
                return { id: url, name: file.name, url, type: file.name.split('.').pop(), source: 'local' };
            });
            return art.addSubtitles(added);
        },
    });
    def(art, 'selectSubtitleTracks', {
        value(value = []) {
            const currentToken = ++token;
            const selected = uniqueSubtitleTracks(
                toArray(value).map((track) => tracks.find((item) => sameSubtitle(item, track)) || track),
            );
            active = selected;
            queue = queue.catch(() => {}).then(async () => {
                if (currentToken !== token) return null;
                if (!selected.length) {
                    art.subtitle.clear();
                    art.emit('subtitle:change', null, tracks);
                    return null;
                }
                try {
                    await art.subtitle.addMultiple(selected);
                } catch (error) {
                    if (currentToken !== token) return null;
                    active = [];
                    if (error?.name !== 'AbortError') art.notice.show = error;
                    return null;
                }
                if (currentToken !== token) return null;
                art.emit('subtitle:change', selected[0], tracks);
                return selected;
            });
            return queue;
        },
    });
    def(art, 'selectSubtitle', {
        value(track, available = tracks) {
            if (!track?.url) return art.setSubtitles([]);
            tracks = uniqueSubtitleTracks([track, ...toArray(available)]);
            return art.selectSubtitleTracks([track]);
        },
    });

    art.on('destroy', () => objectUrls.forEach((url) => URL.revokeObjectURL(url)));
}
