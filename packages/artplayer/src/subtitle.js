import {
    setStyle,
    setStyles,
    srtToVtt,
    vttToBlob,
    jsonToVtt,
    getExt,
    assToVtt,
    escape,
    remove,
    append,
    createElement,
} from './utils';
import Component from './utils/component';
import validator from 'option-validator';
import scheme from './scheme';

function removeTrack(track) {
    if (track?.parentNode) remove(track);
}

function revokeUrl(url) {
    if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

export default class Subtitle extends Component {
    constructor(art) {
        super(art);
        this.name = 'subtitle';
        this.option = null;
        this.tracks = [];
        this.init(art.option.subtitle);

        let lastState = false;
        art.on('video:timeupdate', () => {
            const state = this.art.template.$video.webkitDisplayingFullscreen;
            if (typeof state !== 'boolean') return;
            if (state !== lastState) {
                lastState = state;
                this.tracks.forEach(({ $track }) => {
                    $track.kind = state ? 'subtitles' : 'metadata';
                });
            }
        });
    }

    get url() {
        return this.art.template.$track.src;
    }

    set url(url) {
        this.switch(url);
    }

    get textTracks() {
        return this.tracks.map((track) => track.track).filter(Boolean);
    }

    get activeCues() {
        return this.textTracks
            .flatMap((track) => Array.from(track.activeCues || []))
            .sort((a, b) => a.startTime - b.startTime);
    }

    get cues() {
        return this.textTracks.flatMap((track) => Array.from(track.cues || []));
    }

    style(key, value) {
        const { $subtitle } = this.art.template;
        if (typeof key === 'object') {
            return setStyles($subtitle, key);
        }
        return setStyle($subtitle, key, value);
    }

    update() {
        const {
            option: { subtitle },
            template: { $subtitle },
        } = this.art;

        $subtitle.innerHTML = '';
        if (!this.activeCues.length) return;

        this.art.emit('subtitleBeforeUpdate', this.activeCues);
        $subtitle.innerHTML = this.activeCues
            .map((cue, index) =>
                cue.text
                    .split(/\r?\n/)
                    .filter((line) => line.trim())
                    .map(
                        (line) =>
                            `<div class="art-subtitle-line" data-group="${index}">
                                ${subtitle.escape ? escape(line) : line}
                            </div>`,
                    )
                    .join(''),
            )
            .join('');
        this.art.emit('subtitleAfterUpdate', this.activeCues);
    }

    async switch(url, newOption = {}) {
        const visible = this.show;
        this.clear();
        const subUrl = await this.add(url, newOption);
        this.show = visible;
        return subUrl;
    }

    async add(url, newOption = {}) {
        const { i18n, notice, option } = this.art;
        const subtitleOption = { ...option.subtitle, ...newOption, url };
        const subUrl = await this.init(subtitleOption);
        if (newOption.name) {
            notice.show = `${i18n.get('Switch Subtitle')}: ${newOption.name}`;
        }
        return subUrl;
    }

    clear() {
        const { template } = this.art;
        template.$subtitle.innerHTML = '';
        this.option = null;
        this.tracks.forEach(({ $track, event, url }) => {
            this.art.events.remove(event);
            revokeUrl(url);
            removeTrack($track);
        });
        this.tracks = [];
        removeTrack(template.$track);
        template.$track = createElement('track');
        this.show = false;
        this.art.emit('subtitleLoad', [], this.option);
    }

    createTrack(kind, url, trackOption = this.art.option.subtitle) {
        const { template, proxy } = this.art;
        const { $video, $track } = template;

        const $newTrack = createElement('track');
        $newTrack.default = true;
        $newTrack.kind = kind;
        $newTrack.src = url;
        $newTrack.label = trackOption.name || 'Artplayer';
        $newTrack.track.mode = 'hidden';
        $newTrack.onload = () => {
            this.art.emit('subtitleLoad', this.cues, this.option);
        };

        const event = proxy($newTrack.track, 'cuechange', () => this.update());
        this.tracks.push({ $track: $newTrack, track: $newTrack.track, event, url });

        $track.onload = null;
        if ($track && !$track.src) removeTrack($track);
        append($video, $newTrack);
        template.$track = $newTrack;
    }

    async init(subtitleOption) {
        const {
            notice,
            template: { $subtitle },
        } = this.art;

        validator(subtitleOption, scheme.subtitle);
        const loaded =
            typeof subtitleOption.load === 'function' ? await subtitleOption.load(subtitleOption, this.art) : null;
        const loadedUrl =
            loaded instanceof Blob || loaded instanceof File
                ? URL.createObjectURL(loaded)
                : loaded instanceof ArrayBuffer
                    ? URL.createObjectURL(new Blob([loaded], { type: 'text/vtt' }))
                    : typeof loaded === 'string'
                        ? loaded
                        : loaded && typeof loaded === 'object' && loaded.url
                            ? loaded.url
                            : '';
        const loadedType =
            loaded && typeof loaded === 'object' && !Array.isArray(loaded) && loaded.type ? loaded.type : '';
        if (!subtitleOption.url && !loadedUrl) return;
        const sourceUrl = loadedUrl || subtitleOption.url;
        const sourceType = loadedType || subtitleOption.type || getExt(subtitleOption.url || sourceUrl);

        this.option = subtitleOption;
        this.style(subtitleOption.style);

        let subUrl = '';
        try {
            const response = await fetch(sourceUrl);
            if (!response.ok) throw new Error(`Subtitle request failed: ${response.status}`);
            const text = new TextDecoder(subtitleOption.encoding).decode(await response.arrayBuffer());
            const toBlob = (vtt) => vttToBlob(subtitleOption.onVttLoad(vtt));
            if (sourceType === 'srt') subUrl = toBlob(srtToVtt(text));
            else if (sourceType === 'ass') subUrl = toBlob(assToVtt(text));
            else if (sourceType === 'vtt') subUrl = toBlob(text);
            else {
                const vtt = sourceType === 'json' || /^\s*[[{]/.test(text) ? jsonToVtt(text) : '';
                subUrl = vtt ? toBlob(vtt) : sourceUrl;
            }

            $subtitle.innerHTML = '';
            if (this.url === subUrl) return subUrl;
            this.createTrack('metadata', subUrl);
            return subUrl;
        } catch (err) {
            $subtitle.innerHTML = '';
            notice.show = err;
            throw err;
        } finally {
            if (loadedUrl !== subUrl) revokeUrl(loadedUrl);
        }
    }
}
