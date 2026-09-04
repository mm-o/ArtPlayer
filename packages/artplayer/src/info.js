import { append, createElement, queryAll, isMobile } from './utils';
import Component from './utils/component';

function toText(value) {
    if (value === undefined || value === null || value === '') return '';
    if (typeof value === 'number') return Number.isFinite(value) ? value.toFixed(2) : '';
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') return value;
    if (typeof File !== 'undefined' && value instanceof File) return value.name;
    if (typeof Blob !== 'undefined' && value instanceof Blob) return `${value.type || 'Blob'} ${value.size || 0}`;
    if (Array.isArray(value)) return value.length ? `${value.length}` : '';
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch {
            return Object.prototype.toString.call(value);
        }
    }
    return String(value);
}

function getLength(value) {
    if (Array.isArray(value)) return value.length;
    if (Array.isArray(value?.danmuku)) return value.danmuku.length;
    if (Array.isArray(value?.items)) return value.items.length;
    return 0;
}

export default class Info extends Component {
    constructor(art) {
        super(art);
        this.name = 'info';

        if (!isMobile) {
            this.init();
        }
    }

    init() {
        const {
            proxy,
            constructor,
            template: { $infoPanel, $infoMedia, $infoClose, $video },
        } = this.art;

        proxy($infoClose, 'click', () => {
            this.show = false;
        });

        let timer = null;
        const $types = queryAll('[data-video]', $infoPanel) || [];
        this.art.on('destroy', () => clearTimeout(timer));

        const renderMedia = () => {
            const { currentMedia, playlist, audioTracks } = this.art;
            const media = currentMedia || {};
            const items = [
                ['Media title:', media.title || media.name],
                ['Media id:', media.id],
                ['Media type:', media.type],
                ['Media poster:', media.poster],
                ['Live:', media.isLive],
                ['Start time:', media.startTime],
                ['End time:', media.endTime],
                ['Sources:', getLength(media.sources)],
                ['Qualities:', getLength(media.qualities || media.quality || this.art.option.quality)],
                ['Subtitles:', getLength(media.subtitles || this.art.getSubtitles())],
                ['Audio tracks:', getLength(media.audioTracks || audioTracks)],
                ['Danmaku:', getLength(media.danmaku || this.art.getDanmaku())],
                ['Chapters:', getLength(media.chapters)],
                ['Playlist items:', getLength(playlist?.items)],
                ['Playlist groups:', getLength(playlist?.groups)],
                ['Playlist roots:', getLength(playlist?.roots)],
                ['Media meta:', media.meta],
            ].filter((item) => toText(item[1]));

            $infoMedia.innerHTML = '';
            for (let index = 0; index < items.length; index++) {
                const $item = createElement('div');
                const $title = createElement('div');
                const $content = createElement('div');
                $item.className = 'art-info-item';
                $title.className = 'art-info-title';
                $content.className = 'art-info-content';
                $title.innerText = items[index][0];
                $content.innerText = toText(items[index][1]);
                append($item, $title);
                append($item, $content);
                append($infoMedia, $item);
            }
        };

        this.art.on('media:change', renderMedia);
        this.art.on('playlist:change', renderMedia);
        this.art.on('subtitle:change', renderMedia);
        this.art.on('audioTracks:change', renderMedia);
        this.art.on('danmaku:change', renderMedia);

        function loop() {
            for (let index = 0; index < $types.length; index++) {
                const item = $types[index];
                const value = $video[item.dataset.video];
                const innerText = typeof value === 'number' ? value.toFixed(2) : value;
                if (item.innerText !== innerText) {
                    item.innerText = innerText;
                }
            }
            timer = setTimeout(loop, constructor.INFO_LOOP_TIME);
        }

        renderMedia();
        loop();
    }
}
