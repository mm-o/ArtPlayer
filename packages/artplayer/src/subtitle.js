import {
    setStyle,
    setStyles,
    getExt,
    escape,
} from './utils';
import { parseSubtitle } from './utils/parseSubtitle.js';
import Component from './utils/component';
import validator from 'option-validator';
import scheme from './scheme';

async function loadCues(option, art) {
    const loaded = typeof option.load === 'function' ? await option.load(option, art) : null;
    const source = loaded ?? option.url;
    const value = source && typeof source === 'object' && !(source instanceof Blob) && !(source instanceof ArrayBuffer)
        ? source.url
        : source;
    const hint = source && typeof source === 'object' ? getExt(source.name || '') || source.type : '';
    const type = String(hint || option.type || getExt(option.url || value || '')).split('/').pop().toLowerCase();
    const buffer = value instanceof Blob
        ? await value.arrayBuffer()
        : value instanceof ArrayBuffer
            ? value
            : await (async () => {
                const response = await fetch(value);
                if (!response.ok) throw new Error(`Subtitle request failed: ${response.status}`);
                return response.arrayBuffer();
            })();
    const text = new TextDecoder(option.encoding).decode(buffer);
    const body = text.replace(/^\uFEFF/, '').trimStart();
    const format = ['srt', 'ass', 'ssa', 'vtt', 'json', 'lrc'].includes(type)
        ? type
        : body.startsWith('[') || body.startsWith('{') ? 'json' : type;
    const cues = parseSubtitle(option.onVttLoad(text), format);
    if (!cues.length) throw new Error('Subtitle data is empty or unsupported');
    return cues;
}

async function cachedCues(cache, option, art) {
    const key = option.sourceUrl || option.url || option.load;
    if (!key) return loadCues(option, art);
    let task = cache.get(key);
    if (!task) {
        task = loadCues(option, art).catch((error) => {
            cache.delete(key);
            throw error;
        });
        cache.set(key, task);
    }
    return task;
}

export default class Subtitle extends Component {
    constructor(art) {
        super(art);
        this.name = 'subtitle';
        this.option = null;
        this._cues = [];
        this._cache = new Map();
        if (art.option.subtitle.url || art.option.subtitle.load) this.init(art.option.subtitle);
        art.on('video:timeupdate', () => {
            this.update();
        });
        art.on('destroy', () => this._cache.clear());
    }

    get url() {
        return this.option?.url || '';
    }

    set url(url) {
        this.switch(url);
    }

    get textTracks() {
        return [];
    }

    get activeCues() {
        const time = Number(this.art.currentTime || 0);
        return this._cues.filter((cue) => cue.startTime <= time && cue.endTime >= time);
    }

    get cues() {
        return this._cues;
    }

    style(key, value) {
        const { $subtitle } = this.art.template;
        if (typeof key === 'object') {
            return setStyles($subtitle, key);
        }
        return setStyle($subtitle, key, value);
    }

    update() {
        const { template: { $subtitle } } = this.art;
        const subtitle = this.option || this.art.option.subtitle;

        const cues = this.activeCues;
        $subtitle.innerHTML = '';
        if (!cues.length) return;

        this.art.emit('subtitleBeforeUpdate', cues);
        $subtitle.innerHTML = cues
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
        this.art.emit('subtitleAfterUpdate', cues);
    }

    async switch(url, newOption = {}) {
        const visible = this.show;
        const result = await this.add(url, newOption);
        this.show = visible;
        return result;
    }

    async add(url, newOption = {}) {
        const { i18n, notice, option } = this.art;
        const subtitleOption = { ...option.subtitle, ...newOption, url };
        const result = await this.init(subtitleOption);
        if (newOption.name) {
            notice.show = `${i18n.get('Switch Subtitle')}: ${newOption.name}`;
        }
        return result;
    }

    async addMultiple(tracks = []) {
        const visible = this.show;
        const options = tracks.map((track) => ({ ...this.art.option.subtitle, ...track }));
        const cues = await Promise.all(options.map((option) => cachedCues(this._cache, option, this.art)));
        this.render(cues.flat(), options[0]);
        this.show = visible;
        return true;
    }

    render(cues, option) {
        this.option = option;
        this._cues = cues.sort((a, b) => a.startTime - b.startTime);
        this.style(option?.style || {});
        this.update();
        this.art.emit('subtitleLoad', this._cues, this.option);
    }

    clear() {
        this.art.template.$subtitle.innerHTML = '';
        this.option = null;
        this._cues = [];
        this.art.emit('subtitleLoad', [], this.option);
    }

    async init(subtitleOption) {
        validator(subtitleOption, scheme.subtitle);
        if (!subtitleOption.url && !subtitleOption.load) return '';
        try {
            this.render(await cachedCues(this._cache, subtitleOption, this.art), subtitleOption);
            return subtitleOption.url || true;
        } catch (error) {
            this.art.template.$subtitle.innerHTML = '';
            this.art.notice.show = error;
            throw error;
        }
    }
}
