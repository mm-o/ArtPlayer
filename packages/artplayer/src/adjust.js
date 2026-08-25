import Component from './utils/component';
import {
    clamp,
    append,
    addClass,
    removeClass,
    setStyle,
    createElement,
    includeFromEvent,
    secondToTime,
    tooltip,
} from './utils';

const MODE = {
    timestamp: 'timestamp',
    loop: 'loop',
};

const TIMESTAMP_STEP = 0.1;
const LOOP_STEP = 0.1;

function getNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function getMediaTitle(media) {
    return media?.title || media?.name || '';
}

function getTimestampOffsetLimit(art) {
    const duration = Math.max(0, getNumber(art.duration));
    return duration / 2;
}

function createButton(art, icon, text, className, tooltipKey, click) {
    const $button = createElement('button');
    addClass($button, 'art-adjust-button');
    if (className) addClass($button, className);
    if (tooltipKey) tooltip($button, art.i18n.get(tooltipKey));
    if (icon) append($button, icon);
    if (text) append($button, `<span>${art.i18n.get(text)}</span>`);
    if (click) {
        art.proxy($button, 'click', (event) => {
            event.preventDefault();
            click(event);
        });
    }
    return $button;
}

function createField(art, label, placeholder, className = '') {
    const $field = createElement('label');
    addClass($field, 'art-adjust-field');
    if (className) addClass($field, className);

    const $label = createElement('span');
    addClass($label, 'art-adjust-field-label');
    append($label, art.i18n.get(label));

    const $input = createElement('input');
    addClass($input, 'art-adjust-input');
    $input.type = 'number';
    $input.step = '0.1';
    $input.placeholder = placeholder;

    append($field, $label);
    const $line = append($field, '<div class="art-adjust-field-line"></div>');
    append($line, $input);

    return { $field, $line, $input };
}

function bindNumberInput(art, $input, update) {
    art.proxy($input, 'input', () => update($input.valueAsNumber));
    art.proxy($input, 'change', () => update($input.valueAsNumber));
}

function bindRangeInput(art, $input, update) {
    art.proxy($input, 'input', () => update($input.valueAsNumber));
}

function createDisplay(art, label) {
    const $display = createElement('div');
    addClass($display, 'art-adjust-display');

    const $label = createElement('div');
    addClass($label, 'art-adjust-display-label');
    append($label, art.i18n.get(label));

    const $value = createElement('div');
    addClass($value, 'art-adjust-display-value');

    append($display, $label);
    append($display, $value);

    return { $display, $value };
}

export default class Adjust extends Component {
    constructor(art) {
        super(art);

        const {
            option,
            controls,
            template: { $adjusts },
        } = art;

        this.name = 'adjust';
        this.$parent = $adjusts;
        this.mode = MODE.timestamp;
        this.$root = null;
        this.$mediaTitle = null;
        this.$timestamp = {};
        this.$loop = {};
        this.timestampBaseTime = null;
        this.loopDraft = null;

        if (option.timestampOffset || option.actions) {
            this.build();

            art.on('blur', () => {
                if (this.show) {
                    this.show = false;
                }
            });

            art.on('focus', (event) => {
                const isControl = includeFromEvent(event, controls.setting);
                const isControls = includeFromEvent(event, controls.$controls);
                const isTopbar = includeFromEvent(event, art.template.$topbar);
                const isAdjust = includeFromEvent(event, this.$parent);
                if (this.show && !isControl && !isControls && !isTopbar && !isAdjust) {
                    this.show = false;
                }
            });

            art.on('media:change', () => this.sync());
            art.on('video:timeupdate', () => {
                this.syncTime();
            });
            art.on('timestampOffset', () => this.syncTimestamp());
            art.on('loopSegment:change', () => this.syncLoop());
            art.on('resize', () => this.resize());
        }
    }

    getTimestampOffset() {
        return getNumber(this.art.timestampOffset);
    }

    getCurrentTime() {
        return Math.max(0, getNumber(this.art.currentTime));
    }

    getTimestampBaseTime() {
        return Number.isFinite(this.timestampBaseTime) ? this.timestampBaseTime : this.getCurrentTime();
    }

    getCurrentPreviewTime() {
        return Math.max(0, this.getTimestampBaseTime() + this.getTimestampOffset());
    }

    getLoopRange() {
        const segment = this.loopDraft || this.art.loopSegment;
        const start = Number(segment?.start);
        const end = Number(segment?.end);

        if (Number.isFinite(start) && Number.isFinite(end)) {
            return {
                start: Math.max(0, start),
                end: Math.max(Math.max(0, start), end),
            };
        }

        const current = this.getCurrentTime();
        return {
            start: current,
            end: Math.max(current + 10, current + 0.1),
        };
    }

    build() {
        if (this.$root) return;

        const $root = createElement('div');
        addClass($root, 'art-adjust-workbench');

        const $header = append($root, '<div class="art-adjust-header"></div>');
        const $headLeft = append($header, '<div class="art-adjust-header-left"></div>');
        const $headRight = append($header, '<div class="art-adjust-header-right"></div>');

        this.$mediaTitle = append($headLeft, '<div class="art-adjust-media-title"></div>');

        const $close = createButton(this.art, this.art.icons.close, null, 'art-adjust-close', 'Close', () => {
            this.show = false;
        });
        append($headRight, $close);

        const $body = append($root, '<div class="art-adjust-body"></div>');

        const $timestamp = append($body, '<div class="art-adjust-mode art-adjust-mode-timestamp"></div>');
        const $timestampStage = append($timestamp, '<div class="art-adjust-stage"></div>');
        const $timestampControls = append($timestamp, '<div class="art-adjust-controls"></div>');

        const timestampDisplay = createDisplay(this.art, 'Timestamp');
        const timestampOffset = createField(this.art, 'Timestamp Offset', '0.0', 'art-adjust-field-wide');
        const $timestampOffsetButtons = append(timestampOffset.$line, '<div class="art-adjust-step-group"></div>');
        const $timestampMinus = createButton(this.art, null, '-', 'art-adjust-step', 'Decrease', () => this.shiftTimestamp(-TIMESTAMP_STEP));
        const $timestampPlus = createButton(this.art, null, '+', 'art-adjust-step', 'Increase', () => this.shiftTimestamp(TIMESTAMP_STEP));
        const $timestampProgress = createElement('input');
        addClass($timestampProgress, 'art-adjust-slider');
        $timestampProgress.type = 'range';
        $timestampProgress.min = '0';
        $timestampProgress.max = '0';
        $timestampProgress.step = '0.1';
        const $timestampCurrent = append(timestampDisplay.$value, '<div class="art-adjust-time"></div>');
        append($timestampOffsetButtons, $timestampMinus);
        append($timestampOffsetButtons, $timestampProgress);
        append($timestampOffsetButtons, timestampOffset.$input);
        append($timestampOffsetButtons, $timestampPlus);

        append($timestampStage, timestampDisplay.$display);
        append($timestampControls, timestampOffset.$field);
        const $timestampActionRow = append($timestampControls, '<div class="art-adjust-action-row"></div>');
        const $timestampPlay = createButton(this.art, null, 'Preview', 'art-adjust-action-primary', 'Preview', () => this.previewTimestamp());
        const $timestampInsert = createButton(this.art, null, 'Insert Timestamp', 'art-adjust-action-primary', 'Insert Timestamp', () => this.insertTimestamp(false));
        const $timestampRepeat = createButton(this.art, null, 'Repeat', 'art-adjust-action-secondary', 'Repeat', () => this.insertTimestamp(true));
        const $timestampReset = createButton(this.art, null, 'Reset', 'art-adjust-action-secondary', 'Reset', () => this.resetTimestamp());
        append($timestampActionRow, $timestampPlay);
        append($timestampActionRow, $timestampInsert);
        append($timestampActionRow, $timestampRepeat);
        append($timestampActionRow, $timestampReset);

        const $loop = append($body, '<div class="art-adjust-mode art-adjust-mode-loop"></div>');
        const $loopStage = append($loop, '<div class="art-adjust-stage"></div>');
        const $loopControls = append($loop, '<div class="art-adjust-controls"></div>');

        const loopStart = createField(this.art, 'Loop Start', '0.0', 'art-adjust-field-wide');
        const loopEnd = createField(this.art, 'Loop End', '0.0', 'art-adjust-field-wide');
        const $loopStartButtons = append(loopStart.$line, '<div class="art-adjust-step-group"></div>');
        const $loopEndButtons = append(loopEnd.$line, '<div class="art-adjust-step-group"></div>');
        const $loopStartMinus = createButton(this.art, null, '-', 'art-adjust-step', 'Decrease', () => this.shiftLoopStart(-LOOP_STEP));
        const $loopStartPlus = createButton(this.art, null, '+', 'art-adjust-step', 'Increase', () => this.shiftLoopStart(LOOP_STEP));
        const $loopEndMinus = createButton(this.art, null, '-', 'art-adjust-step', 'Decrease', () => this.shiftLoopEnd(-LOOP_STEP));
        const $loopEndPlus = createButton(this.art, null, '+', 'art-adjust-step', 'Increase', () => this.shiftLoopEnd(LOOP_STEP));
        const $loopStartSlider = createElement('input');
        addClass($loopStartSlider, 'art-adjust-slider');
        $loopStartSlider.type = 'range';
        $loopStartSlider.min = '0';
        $loopStartSlider.max = '0';
        $loopStartSlider.step = '0.1';
        const $loopEndSlider = createElement('input');
        addClass($loopEndSlider, 'art-adjust-slider');
        $loopEndSlider.type = 'range';
        $loopEndSlider.min = '0';
        $loopEndSlider.max = '0';
        $loopEndSlider.step = '0.1';
        append($loopStartButtons, $loopStartMinus);
        append($loopStartButtons, $loopStartSlider);
        append($loopStartButtons, loopStart.$input);
        append($loopStartButtons, $loopStartPlus);
        append($loopEndButtons, $loopEndMinus);
        append($loopEndButtons, $loopEndSlider);
        append($loopEndButtons, loopEnd.$input);
        append($loopEndButtons, $loopEndPlus);

        const loopDisplay = createDisplay(this.art, 'Loop Segment');
        const $loopStartValue = append(loopDisplay.$value, '<span class="art-adjust-time"></span>');
        append($loopStage, loopDisplay.$display);
        append($loopControls, loopStart.$field);
        append($loopControls, loopEnd.$field);
        const $loopActionRow = append($loopControls, '<div class="art-adjust-action-row"></div>');
        const $loopPlay = createButton(this.art, null, 'Preview', 'art-adjust-action-primary', 'Preview', () => this.previewLoop());
        const $loopApply = createButton(this.art, null, 'Apply Loop Segment', 'art-adjust-action-primary', 'Apply Loop Segment', () => this.applyLoop());
        const $loopClear = createButton(this.art, null, 'Clear Loop Segment', 'art-adjust-action-secondary', 'Clear Loop Segment', () => this.clearLoop());
        append($loopActionRow, $loopPlay);
        append($loopActionRow, $loopApply);
        addClass($loopClear, 'art-adjust-action-span');
        append($loopActionRow, $loopClear);

        this.$timestamp = {
            $root: $timestamp,
            $offsetInput: timestampOffset.$input,
            $offsetSlider: $timestampProgress,
            $current: $timestampCurrent,
            $progress: $timestampProgress,
            $play: $timestampPlay,
            $insert: $timestampInsert,
            $repeat: $timestampRepeat,
            $reset: $timestampReset,
        };

        this.$loop = {
            $root: $loop,
            $startInput: loopStart.$input,
            $endInput: loopEnd.$input,
            $startSlider: $loopStartSlider,
            $endSlider: $loopEndSlider,
            $current: $loopStartValue,
            $play: $loopPlay,
            $apply: $loopApply,
            $clear: $loopClear,
        };

        bindNumberInput(this.art, timestampOffset.$input, (value) => this.setTimestampOffset(value));
        bindRangeInput(this.art, $timestampProgress, (value) => this.setTimestampBaseTime(value));
        bindNumberInput(this.art, loopStart.$input, (value) => this.setLoopStart(value));
        bindRangeInput(this.art, $loopStartSlider, (value) => this.setLoopStart(value));
        bindNumberInput(this.art, loopEnd.$input, (value) => this.setLoopEnd(value));
        bindRangeInput(this.art, $loopEndSlider, (value) => this.setLoopEnd(value));

        append(this.$parent, $root);
        this.$root = $root;
        this.setMode(MODE.timestamp, false);
        this.sync();
    }

    setMode(mode, refresh = true) {
        this.mode = mode === MODE.loop ? MODE.loop : MODE.timestamp;

        if (this.$root) {
            removeClass(this.$root, 'art-adjust-mode-timestamp');
            removeClass(this.$root, 'art-adjust-mode-loop');
            addClass(this.$root, `art-adjust-mode-${this.mode}`);
            this.$mediaTitle.innerText = this.art.currentMedia?.title || this.art.currentMedia?.name || this.art.i18n.get(this.mode === MODE.loop ? 'Loop Segment' : 'Timestamp');
        }

        if (refresh) this.sync();
    }

    open(mode = MODE.timestamp) {
        this.setMode(mode, false);
        if (this.mode === MODE.timestamp) {
            this.timestampBaseTime = this.getCurrentTime();
        } else {
            this.loopDraft = this.art.loopSegment ? { ...this.art.loopSegment } : null;
        }
        this.art.pause();
        this.show = true;
        this.sync();
    }

    syncMedia() {
        const title = getMediaTitle(this.art.currentMedia);
        if (this.$mediaTitle) this.$mediaTitle.innerText = title || this.art.i18n.get(this.mode === MODE.loop ? 'Loop Segment' : 'Timestamp');
    }

    syncTime() {
        if (!this.$root) return;
        this.syncTimestamp();
        this.syncLoop();
    }

    syncTimestamp() {
        if (!this.$timestamp.$offsetInput) return;
        const limit = getTimestampOffsetLimit(this.art);
        const offset = clamp(this.getTimestampOffset(), -limit, limit);
        const current = this.getTimestampBaseTime();

        if (offset !== this.getTimestampOffset()) {
            this.art.timestampOffset = offset;
        }

        const preview = this.getCurrentPreviewTime();

        this.$timestamp.$offsetInput.value = String(offset);
        if (this.$timestamp.$offsetSlider) {
            const duration = Math.max(0, getNumber(this.art.duration));
            this.$timestamp.$offsetSlider.min = '0';
            this.$timestamp.$offsetSlider.max = String(duration);
            this.$timestamp.$offsetSlider.value = String(current);
        }
        this.$timestamp.$current.innerText = `${secondToTime(current)}  ${secondToTime(preview)}`;
    }

    syncLoop() {
        if (!this.$loop.$startInput) return;
        const { start, end } = this.getLoopRange();
        const duration = Math.max(0, getNumber(this.art.duration));

        this.$loop.$startInput.value = String(start);
        this.$loop.$endInput.value = String(end);
        if (this.$loop.$startSlider) {
            this.$loop.$startSlider.min = '0';
            this.$loop.$startSlider.max = String(duration || Math.max(end, start));
            this.$loop.$startSlider.value = String(start);
        }
        if (this.$loop.$endSlider) {
            this.$loop.$endSlider.min = '0';
            this.$loop.$endSlider.max = String(duration || Math.max(end, start + 0.1));
            this.$loop.$endSlider.value = String(end);
        }
        this.$loop.$current.innerText = `${secondToTime(start)}  ${secondToTime(end)}`;
    }

    resize() {
        if (!this.show || !this.$parent) return;
        const width = 392;
        setStyle(this.$parent, 'width', `${width}px`);
    }

    setTimestampOffset(value) {
        const limit = getTimestampOffsetLimit(this.art);
        const next = clamp(getNumber(value), -limit, limit);
        this.art.timestampOffset = next;
        this.syncTimestamp();
        return next;
    }

    setTimestampBaseTime(value) {
        const duration = Math.max(0, getNumber(this.art.duration));
        const next = clamp(getNumber(value), 0, duration);
        this.timestampBaseTime = next;
        this.syncTimestamp();
        return next;
    }

    shiftTimestamp(delta) {
        return this.setTimestampOffset(this.getTimestampOffset() + delta);
    }

    resetTimestamp() {
        this.setTimestampOffset(0);
    }

    previewTimestamp() {
        return this.art.previewTimestamp(this.getTimestampOffset(), this.getTimestampBaseTime());
    }

    insertTimestamp(quick = false) {
        const currentTime = this.getTimestampBaseTime();
        const timestampOffset = this.getTimestampOffset();
        const displayTime = this.getCurrentPreviewTime();
        const action = this.art.captureTimestamp({
            currentTime,
            timestampOffset,
            displayTime,
            mode: quick ? 'quick' : 'insert',
            media: this.art.currentMedia || null,
        });

        return action;
    }

    setLoopStart(value) {
        const next = Math.max(0, getNumber(value));
        const range = this.getLoopRange();
        const start = Math.min(next, range.end);
        const end = Math.max(start, range.end);
        this.loopDraft = { start, end };
        this.syncLoop();
        return this.loopDraft;
    }

    setLoopEnd(value) {
        const next = Math.max(0, getNumber(value));
        const range = this.getLoopRange();
        const end = Math.max(range.start, next);
        this.loopDraft = { start: range.start, end };
        this.syncLoop();
        return this.loopDraft;
    }

    shiftLoopStart(delta) {
        const range = this.getLoopRange();
        this.loopDraft = { start: Math.max(0, range.start + delta), end: range.end };
        this.syncLoop();
        return this.loopDraft;
    }

    shiftLoopEnd(delta) {
        const range = this.getLoopRange();
        this.loopDraft = { start: range.start, end: Math.max(range.start, range.end + delta) };
        this.syncLoop();
        return this.loopDraft;
    }

    setLoopSegment(start, end, seek = false) {
        const nextStart = Math.max(0, getNumber(start));
        const nextEnd = Math.max(nextStart, getNumber(end));
        if (nextEnd <= nextStart) return false;

        this.art.setLoopSegment(nextStart, nextEnd, seek);
        this.loopDraft = { start: nextStart, end: nextEnd };
        this.syncLoop();
        return true;
    }

    previewLoop() {
        const { start } = this.getLoopRange();
        return this.art.previewLoopSegment(start);
    }

    applyLoop() {
        const { start, end } = this.getLoopRange();
        if (!this.setLoopSegment(start, end, false)) return null;

        const action = this.art.captureLoopSegment({
            loopSegment: { start, end },
            currentTime: this.getCurrentTime(),
            timestampOffset: this.getTimestampOffset(),
            mode: 'insert',
            media: this.art.currentMedia || null,
            seek: false,
        });

        return action;
    }

    clearLoop() {
        this.art.clearLoopSegment();
        this.loopDraft = null;
        this.syncLoop();
    }

    syncMode() {
        if (!this.$root) return;
        this.$timestamp.$root.style.display = this.mode === MODE.timestamp ? 'flex' : 'none';
        this.$loop.$root.style.display = this.mode === MODE.loop ? 'flex' : 'none';
    }

    sync() {
        if (!this.$root) return;
        this.syncMedia();
        this.syncMode();
        this.syncTimestamp();
        this.syncLoop();
        this.resize();
    }
}
