import { append, query } from '../utils';
import { def } from '../utils/property.js';
import { sameSubtitle } from './subtitleTrack.js';

const SOURCE_LABELS = {
    bilibili: 'Bilibili',
    media: 'Media',
    local: 'Local',
    cloud: 'Cloud',
    online: 'Online',
};

const browserKey = (item = {}) => item.key || item.url || item.sourceUrl || item.sourcePath || item.path || item.name || item.title || '';
const browserSide = ({ left, panel, browser, player, padding }) => {
    const right = player - padding - left - panel - 8;
    return right >= browser || right >= left - padding - 8 ? 'right' : 'left';
};

export default function installSubtitlePanel(art) {
    const { i18n, icons, controls, proxy, template } = art;
    const colors = [
        ['#fff', 'White'],
        ['#ffeb3b', 'Yellow'],
        ['#ff4d4f', 'Red'],
        ['#b43cc8', 'Purple'],
        ['#2f80ed', 'Blue'],
        ['#00b8f0', 'Cyan'],
    ];
    const edges = [['none', 'None'], ['outline', 'Outline'], ['thick', 'Thick Outline'], ['shadow', 'Shadow']];

    const createSelect = ($inner, label, key, options) => {
        const $item = append($inner, '<label class="apd-config-select"><span class="apd-label"></span><select></select></label>');
        const $select = query('select', $item);
        query('.apd-label', $item).textContent = i18n.get(label);
        options.forEach(([value, text]) => {
            const $option = document.createElement('option');
            $option.value = value;
            $option.textContent = i18n.get(text);
            $select.appendChild($option);
        });
        proxy($select, 'change', () => art.setSubtitleConfig({ [key]: $select.value }));
        return (value) => {
            $select.value = String(value ?? options[0][0]);
        };
    };

    const createSlider = ($inner, label, key, min, max, step, suffix) => {
        const $item = append(
            $inner,
            '<div class="apd-config-slider"><span class="apd-label"></span><div class="apd-slider"><div class="apd-slider-line"><div class="apd-slider-points"></div><div class="apd-slider-progress"></div></div><div class="apd-slider-dot"></div></div><span class="apd-value"></span></div>',
        );
        const $slider = query('.apd-slider', $item);
        const $progress = query('.apd-slider-progress', $item);
        const $dot = query('.apd-slider-dot', $item);
        const $value = query('.apd-value', $item);
        query('.apd-label', $item).textContent = i18n.get(label);
        for (let index = 0; index < 5; index += 1) append(query('.apd-slider-points', $item), '<i></i>');

        let current = min;
        const paint = (next) => {
            const value = Number(next);
            current = Math.min(max, Math.max(min, Math.round((Number.isFinite(value) ? value : current) / step) * step));
            const percent = ((current - min) / (max - min)) * 100;
            $progress.style.width = `${percent}%`;
            $dot.style.left = `${percent}%`;
            $value.textContent = `${Number(current.toFixed(2))}${suffix}`;
        };
        const update = (event) => {
            const { left, right, width } = $slider.getBoundingClientRect();
            const value = min + ((Math.min(right, Math.max(left, event.clientX)) - left) / width) * (max - min);
            paint(value);
            art.setSubtitleConfig({ [key]: current });
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
        return paint;
    };

    controls.addPinned('subtitle', 'Subtitle', {
        name: 'subtitle',
        position: 'right',
        index: 11,
        html: icons.subtitle,
        mounted: ($control) => {
            const $host = append(template.$player, '<div class="art-subtitle-panel"></div>');
            art.controls.subtitlePanel = $host;
            const $panel = append($host, '<div class="apd-config-panel"><div class="apd-config-panel-inner"></div></div>');
            const $browser = append($host, '<div class="apd-subtitle-browser-panel"></div>');
            const $inner = query('.apd-config-panel-inner', $panel);
            const $tracks = append($inner, '<div class="apd-config-other"></div>');
            const $sources = append($inner, '<div class="apd-subtitle-sources"></div>');
            const $styleRow = append($inner, '<div class="apd-subtitle-style-row"></div>');
            const selectors = {
                color: createSelect($styleRow, 'Subtitle Color', 'color', colors),
                edge: createSelect($styleRow, 'Edge Style', 'edgeStyle', edges),
            };
            const sliders = {
                fontSize: createSlider($inner, 'Font Size', 'fontSize', 12, 60, 1, 'px'),
                bottom: createSlider($inner, 'Subtitle Position', 'bottom', 10, 90, 1, '%'),
                offset: createSlider($inner, 'Subtitle Offset', 'offset', -10, 10, 0.1, 's'),
                backgroundOpacity: createSlider($inner, 'Background Opacity', 'backgroundOpacity', 0, 100, 5, '%'),
            };
            let browser = null;

            const setOpen = (open) => {
                $host.classList.toggle('apd-subtitle-open', open);
                if (open) positionPanels();
            };
            const closeBrowser = () => {
                browser = null;
                $host.classList.remove('apd-subtitle-browser-open');
                $browser.innerHTML = '';
            };
            const createCheck = (label, checked, index = -1) => {
                const $item = append($tracks, '<label class="apd-other" data-subtitle-index=""><input class="apd-check" type="checkbox"><span></span></label>');
                $item.dataset.subtitleIndex = String(index);
                query('.apd-check', $item).checked = checked;
                query('span', $item).textContent = label;
            };
            const createSourceTitle = (label) => {
                const $title = append($tracks, '<div class="apd-subtitle-source"></div>');
                $title.textContent = label;
            };
            const renderTracks = () => {
                const active = art.activeSubtitleTracks;
                $tracks.innerHTML = '';
                createCheck(i18n.get('Subtitle'), art.subtitle.show);
                const groups = new Map();
                art.subtitleTracks.forEach((track, index) => {
                    const source = track.source || 'media';
                    if (!groups.has(source)) groups.set(source, []);
                    groups.get(source).push([track, index]);
                });
                groups.forEach((tracks, source) => {
                    createSourceTitle(i18n.get(SOURCE_LABELS[source] || 'Subtitle'));
                    tracks.forEach(([track, index]) => createCheck(
                        track.name || track.lang || i18n.get('Subtitle'),
                        active.some((item) => sameSubtitle(item, track)),
                        index,
                    ));
                });
                $control.style.display = '';
            };
            const renderSources = () => {
                $sources.innerHTML = '';
                const createButton = (value, label) => {
                    const $button = append($sources, '<button type="button" data-subtitle-source=""></button>');
                    $button.dataset.subtitleSource = value;
                    $button.textContent = label;
                };
                createButton('local', i18n.get('Local Subtitle'));
                art.subtitleSources.forEach((source, index) => createButton(String(index), source.name || i18n.get('Subtitle')));
            };
            const paintConfig = (config) => {
                selectors.color(config.color);
                selectors.edge(config.edgeStyle);
                Object.keys(sliders).forEach((key) => sliders[key](config[key]));
                const $visible = query('[data-subtitle-index="-1"] .apd-check', $tracks);
                if ($visible) $visible.checked = art.subtitle.show;
            };
            const positionPanels = () => {
                const controlRect = $control.getBoundingClientRect();
                const panelRect = $panel.getBoundingClientRect();
                const playerRect = template.$player.getBoundingClientRect();
                const padding = parseFloat(getComputedStyle(template.$player).getPropertyValue('--art-padding')) || 0;
                const left = Math.min(
                    Math.max(controlRect.left - playerRect.left + controlRect.width / 2 - panelRect.width / 2, padding),
                    Math.max(padding, playerRect.width - padding - panelRect.width),
                );
                $panel.style.left = `${left}px`;
                if (!browser) return;
                const browserWidth = $browser.getBoundingClientRect().width || panelRect.width;
                browser.side = browserSide({ left, panel: panelRect.width, browser: browserWidth, player: playerRect.width, padding });
                $browser.style.left = browser.side === 'left' ? `${left - browserWidth - 8}px` : `${left + panelRect.width + 8}px`;
            };
            const renderBrowser = () => {
                if (!browser) return;
                const { provider, trail, items, selected, loading, error } = browser;
                $host.classList.add('apd-subtitle-browser-open');
                $browser.innerHTML = '';
                const title = trail.length ? trail[trail.length - 1].name || trail[trail.length - 1].title : provider.name || i18n.get('Subtitle');
                const $head = append($browser, '<button type="button" class="apd-subtitle-browser-head" data-browser-back><span class="apd-subtitle-browser-head-icon"></span><span class="apd-subtitle-browser-title"></span></button>');
                append(query('.apd-subtitle-browser-head-icon', $head), icons.arrowLeft);
                query('.apd-subtitle-browser-title', $head).textContent = title;
                const $list = append($browser, '<div class="apd-subtitle-browser-list"></div>');
                if (loading || error) {
                    const $empty = append($list, '<div class="apd-subtitle-browser-empty"></div>');
                    $empty.textContent = loading ? i18n.get('Loading') : error;
                } else {
                    items.forEach((item, index) => {
                        if (item?.type === 'folder') {
                            const $row = append($list, '<button type="button" class="apd-subtitle-browser-row" data-browser-folder=""><span></span></button>');
                            $row.dataset.browserFolder = String(index);
                            query('span', $row).textContent = item.name || item.title || '';
                            return;
                        }
                        if (!item?.url) return;
                        const $row = append($list, '<label class="apd-subtitle-browser-row"><input type="checkbox" data-browser-item=""><span></span></label>');
                        query('input', $row).dataset.browserItem = String(index);
                        query('input', $row).checked = selected.has(browserKey(item));
                        query('span', $row).textContent = item.name || item.title || '';
                    });
                    if (!$list.children.length) {
                        const $empty = append($list, '<div class="apd-subtitle-browser-empty"></div>');
                        $empty.textContent = i18n.get('No Subtitle');
                    }
                }
                const $foot = append($browser, '<div class="apd-subtitle-browser-foot"><span></span><button type="button" data-browser-confirm></button></div>');
                query('span', $foot).textContent = String(selected.size);
                query('button', $foot).textContent = i18n.get('Confirm');
                positionPanels();
            };
            const loadBrowser = async (task) => {
                const state = browser;
                if (!state) return;
                state.loading = true;
                state.error = '';
                renderBrowser();
                try {
                    const items = await task();
                    if (browser !== state) return;
                    state.items = items || [];
                } catch (error) {
                    if (browser !== state) return;
                    state.items = [];
                    state.error = error?.message || i18n.get('Load failed');
                }
                state.loading = false;
                renderBrowser();
            };
            const openBrowser = (provider) => {
                browser = { provider, trail: [], items: [], selected: new Map(), loading: false, error: '', side: 'right' };
                setOpen(true);
                void loadBrowser(() => provider.browse.roots(art));
            };
            const openSource = async (source) => {
                if (source === 'local') {
                    const input = Object.assign(document.createElement('input'), { type: 'file', multiple: true, accept: '.srt,.vtt,.ass,.ssa,.lrc,.json' });
                    input.onchange = () => art.addSubtitleFiles(Array.from(input.files || []));
                    input.click();
                    return;
                }
                if (!source) return;
                setOpen(true);
                if (source.browse) return openBrowser(source);
                const tracks = await source.load(art);
                if (tracks?.length) art.addSubtitles(tracks, source.select !== false);
                else art.notice.show = i18n.get('No Subtitle');
            };
            const handleBrowserClick = async (event) => {
                const back = event.target.closest('[data-browser-back]');
                const folder = event.target.closest('[data-browser-folder]');
                const subtitle = event.target.closest('[data-browser-item]');
                const confirm = event.target.closest('[data-browser-confirm]');
                if (back) {
                    if (!browser.trail.length) return closeBrowser();
                    browser.trail.pop();
                    return void loadBrowser(() => browser.trail.length ? browser.provider.browse.children(browser.trail[browser.trail.length - 1], art) : browser.provider.browse.roots(art));
                }
                if (folder) {
                    const item = browser.items[Number(folder.dataset.browserFolder)];
                    browser.trail.push(item);
                    return void loadBrowser(() => browser.provider.browse.children(item, art));
                }
                if (subtitle) {
                    const item = browser.items[Number(subtitle.dataset.browserItem)];
                    const key = browserKey(item);
                    if (key) browser.selected.has(key) ? browser.selected.delete(key) : browser.selected.set(key, item);
                    return renderBrowser();
                }
                if (confirm) {
                    const provider = browser.provider;
                    const tracks = await provider.browse.select([...browser.selected.values()], art);
                    closeBrowser();
                    if (tracks?.length) art.addSubtitles(tracks, provider.select !== false);
                }
            };

            def(art, 'openSubtitleSource', {
                value(source) {
                    const item = source === 'local' ? 'local' : typeof source === 'string' ? art.subtitleSources.find((entry) => entry.name === source) : source;
                    return openSource(item);
                },
            });

            proxy($host, 'click', async (event) => {
                if (browser && event.target.closest('.apd-subtitle-browser-panel')) return handleBrowserClick(event);
                const source = event.target.closest('[data-subtitle-source]');
                if (source) return openSource(source.dataset.subtitleSource === 'local' ? 'local' : art.subtitleSources[Number(source.dataset.subtitleSource)]);
                const check = event.target.closest('[data-subtitle-index]');
                if (!check) return;
                event.preventDefault();
                const index = Number(check.dataset.subtitleIndex);
                if (index < 0) art.setSubtitleConfig({ visible: !art.subtitle.show });
                else {
                    const track = art.subtitleTracks[index];
                    const active = art.activeSubtitleTracks;
                    await art.selectSubtitleTracks(active.some((item) => sameSubtitle(item, track))
                        ? active.filter((item) => !sameSubtitle(item, track))
                        : [...active, track]);
                }
                renderTracks();
            });
            proxy($control, 'click', () => {
                if ($host.classList.contains('apd-subtitle-open')) {
                    closeBrowser();
                    setOpen(false);
                } else setOpen(true);
            });
            proxy($control, 'mouseenter', () => setOpen(true));
            proxy($host, 'mouseleave', () => {
                if (!browser) setOpen(false);
            });
            art.on('resize', positionPanels);
            art.on('subtitle:change', renderTracks);
            art.on('subtitle:sources', renderSources);
            art.on('subtitle:config', paintConfig);
            renderTracks();
            renderSources();
            paintConfig(art.getSubtitleConfig());
        },
    });
}
