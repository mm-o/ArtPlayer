import Component from '../utils/component';
import fullscreen from './fullscreen';
import fullscreenWeb from './fullscreenWeb';
import pip from './pip';
import playAndPause from './playAndPause';
import progress from './progress';
import time from './time';
import volume from './volume';
import setting from './setting';
import screenshot from './screenshot';
import action from './action';
import playlist from './playlist';
import airplay from './airplay';
import {
    def,
    sleep,
    append,
    addClass,
    isMobile,
    removeClass,
    errorHandle,
    inverseClass,
    createElement,
    includeFromEvent,
} from '../utils';

export default class Control extends Component {
    constructor(art) {
        super(art);

        this.isHover = false;
        this.name = 'control';
        this.timer = Date.now();
        this.pinState = art.storage.get('controlPins') || {};
        this.pinItems = [];
        this.pinOptions = new Map();

        const { constructor } = art;
        const { $player, $bottom, $topbar, $controls } = this.art.template;

        this.$controls = $controls;

        art.on('mousemove', () => {
            if (!isMobile) {
                this.show = true;
            }
        });

        art.on('click', () => {
            if (isMobile) {
                this.toggle();
            } else {
                this.show = true;
            }
        });

        art.on('document:mousemove', (event) => {
            this.isHover = includeFromEvent(event, $bottom) || includeFromEvent(event, $topbar);
        });

        art.on('video:timeupdate', () => {
            if (
                !art.setting.show &&
                !this.isHover &&
                !art.isInput &&
                art.playing &&
                this.show &&
                Date.now() - this.timer >= constructor.CONTROL_HIDE_TIME
            ) {
                this.show = false;
            }
        });

        art.on('control', (state) => {
            if (state) {
                removeClass($player, 'art-hide-cursor');
                addClass($player, 'art-hover');
                this.timer = Date.now();
            } else {
                addClass($player, 'art-hide-cursor');
                removeClass($player, 'art-hover');
            }
        });

        this.init();
    }

    init() {
        const { option } = this.art;

        this.initTopbarTitle();

        if (!option.isLive) {
            this.addPinned(
                'progress',
                'Progress',
                progress({
                    name: 'progress',
                    position: 'top',
                    index: 10,
                }),
            );
        }

        this.addPinned('thumbnails', 'Thumbnails', {
            name: 'thumbnails',
            position: 'top',
            index: 20,
        });

        this.addPinned(
            'playAndPause',
            'Play',
            playAndPause({
                name: 'playAndPause',
                position: 'left',
                index: 10,
            }),
        );

        if (option.playlist && !isMobile) {
            const playlistOption = typeof option.playlist === 'object' ? option.playlist : {};
            const playlistControls = playlistOption.controls || ['playlistPrev', 'playlistNext', 'playlist'];
            const playlistTooltips = {
                playlist: 'Playlist',
                playlistPrev: 'Previous',
                playlistNext: 'Next',
            };
            const playlistControlOptions = {
                playlist: ['top-left', 5],
                playlistPrev: ['left', 9],
                playlistNext: ['left', 11],
            };

            playlistControls.forEach((name) => {
                const control = playlistControlOptions[name];
                if (!control) return;
                this.addPinned(
                    name,
                    playlistTooltips[name],
                    playlist({
                        name,
                        position: control[0],
                        index: control[1],
                    }),
                );
            });
        }

        this.addPinned(
            'volume',
            'Volume',
            volume({
                name: 'volume',
                position: 'left',
                index: 20,
            }),
        );

        if (!option.isLive) {
            this.addPinned(
                'time',
                'Time',
                time({
                    name: 'time',
                    position: 'left',
                    index: 30,
                }),
            );
        }

        if (option.quality.length) {
            sleep().then(() => {
                this.art.quality = option.quality;
            });
        }

        const actions = option.actions === true ? ['timestamp', 'loopSegment', 'mediaNotes'] : option.actions;
        const actionOptions = {
            timestamp: ['Timestamp', 10, 'Timestamp Action'],
            loopSegment: ['Loop Segment', 11, 'Loop Segment Action'],
            mediaNotes: ['Media Notes', 12, 'Media Notes'],
        };

        if (Array.isArray(actions) && !isMobile) {
            actions.forEach((name) => {
                if (!actionOptions[name]) return;
                this.addPinned(
                    name,
                    actionOptions[name][0],
                    action({
                        name,
                        tooltip: actionOptions[name][2],
                        position: 'top-right',
                        index: actionOptions[name][1],
                    }),
                );
            });
        }

        if (option.screenshot && !isMobile) {
            this.addPinned(
                'screenshot',
                'Screenshot',
                screenshot({
                    name: 'screenshot',
                    position: 'top-right',
                    index: 20,
                }),
            );
        }

        if (option.setting) {
            this.add(
                setting({
                    name: 'setting',
                    position: 'right',
                    index: 30,
                }),
            );
        }

        if (option.pip) {
            this.addPinned(
                'pip',
                'PIP Mode',
                pip({
                    name: 'pip',
                    position: 'right',
                    index: 40,
                }),
            );
        }

        if (option.airplay && window.WebKitPlaybackTargetAvailabilityEvent) {
            this.addPinned(
                'airplay',
                'AirPlay',
                airplay({
                    name: 'airplay',
                    position: 'right',
                    index: 50,
                }),
            );
        }

        if (option.fullscreenWeb) {
            this.addPinned(
                'fullscreenWeb',
                'Web Fullscreen',
                fullscreenWeb({
                    name: 'fullscreenWeb',
                    position: 'right',
                    index: 60,
                }),
            );
        }

        if (option.fullscreen) {
            this.addPinned(
                'fullscreen',
                'Fullscreen',
                fullscreen({
                    name: 'fullscreen',
                    position: 'right',
                    index: 70,
                }),
            );
        }

        for (let index = 0; index < option.controls.length; index++) {
            const control = option.controls[index];
            this.addPinned(control.name, control.tooltip || control.name, control);
        }
    }

    isPinned(name) {
        return this.pinState[name] !== false;
    }

    setPinned(name, value) {
        this.pinState[name] = !!value;
        this.art.storage.set('controlPins', this.pinState);

        const option = this.pinOptions.get(name);
        if (!option) return value;

        if (value) {
            if (!this.cache.has(name)) this.add(option);
        } else if (this.cache.has(name)) {
            this.remove(name);
        }

        return value;
    }

    addPinned(name, html, getOption) {
        const option = typeof getOption === 'function' ? getOption(this.art) : getOption;
        if (!option?.name) return this.add(option);

        this.pinOptions.set(option.name, option);
        this.pinItems.push({
            name: option.name,
            html: this.art.i18n.get(html || option.tooltip || option.name),
        });

        if (this.isPinned(option.name)) return this.add(option);
        return null;
    }

    add(getOption) {
        const option = typeof getOption === 'function' ? getOption(this.art) : getOption;
        const { $progress, $controlsLeft, $controlsRight, $topbarLeft, $topbarRight } = this.art.template;

        switch (option.position) {
            case 'top':
                this.$parent = $progress;
                break;
            case 'top-left':
                this.$parent = $topbarLeft;
                break;
            case 'top-right':
                this.$parent = $topbarRight;
                break;
            case 'left':
                this.$parent = $controlsLeft;
                break;
            case 'right':
                this.$parent = $controlsRight;
                break;
            default:
                errorHandle(false, `Control option.position must one of 'top', 'top-left', 'top-right', 'left', 'right'`);
                break;
        }

        super.add(option);
    }

    initTopbarTitle() {
        const {
            template: { $topbarTitle },
        } = this.art;

        const update = (media = this.art.currentMedia) => {
            $topbarTitle.innerText = media?.title || media?.name || '';
        };

        this.art.on('media:change', update);
        this.art.on('playlist:item', update);
        update();
    }

    check(target) {
        target.$control_value.innerHTML = target.html;
        for (let index = 0; index < target.$control_option.length; index++) {
            const item = target.$control_option[index];
            item.default = item === target;
            if (item.default) {
                inverseClass(item.$control_item, 'art-current');
            }
        }
    }

    selector(option, $ref, events) {
        const { proxy } = this.art.events;

        addClass($ref, 'art-control-selector');
        const $value = createElement('div');
        addClass($value, 'art-selector-value');
        append($value, option.html);
        $ref.innerText = '';
        append($ref, $value);

        const $list = createElement('div');
        addClass($list, 'art-selector-list');
        append($ref, $list);

        for (let index = 0; index < option.selector.length; index++) {
            const item = option.selector[index];
            const $item = createElement('div');
            addClass($item, 'art-selector-item');
            if (item.default) addClass($item, 'art-current');
            $item.dataset.index = index;
            $item.dataset.value = item.value;
            $item.innerHTML = item.html;
            append($list, $item);

            def(item, '$control_option', {
                get: () => option.selector,
            });

            def(item, '$control_item', {
                get: () => $item,
            });

            def(item, '$control_value', {
                get: () => $value,
            });
        }

        const event = proxy($list, 'click', async (event) => {
            const path = event.composedPath() || [];
            const item = option.selector.find(
                (item) => item.$control_item === path.find(($item) => item.$control_item === $item),
            );
            this.check(item);
            if (option.onSelect) {
                $value.innerHTML = await option.onSelect.call(this.art, item, item.$control_item, event);
            }
        });

        events.push(event);
    }
}
