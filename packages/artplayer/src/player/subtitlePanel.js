import { append, query } from '../utils';
import { def } from '../utils/property.js';
import { sameSubtitle } from './subtitleTrack.js';

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
    const select = ($inner, label, key, options) => {
        const $item = append($inner, '<label class="apd-config-select"><span class="apd-label"></span><select></select></label>');
        query('.apd-label', $item).textContent = i18n.get(label);
        const $select = query('select', $item);
        options.forEach(([value, text]) => append($select, `<option value="${value}">${i18n.get(text)}</option>`));
        proxy($select, 'change', () => art.setSubtitleConfig({ [key]: $select.value }));
        const paint = (value) => {
            $select.value = String(value ?? options[0][0]);
        };
        paint(art.getSubtitleConfig()[key]);
        return paint;
    };
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

    controls.addPinned('subtitle', 'Subtitle', {
        name: 'subtitle',
        position: 'right',
        index: 11,
        html: icons.subtitle,
        mounted: ($control) => {
            $control.classList.add('art-control-subtitle', 'apd-config');
            const $host = append(template.$player, '<div class="art-control-subtitle apd-config apd-subtitle-root"></div>');
            art.controls.subtitlePanel = $host;
            const $panel = append(
                $host,
                '<div class="apd-config-panel"><div class="apd-config-panel-inner"><div class="apd-config-other"></div></div></div>',
            );
            const $inner = query('.apd-config-panel-inner', $panel);
            const $checks = query('.apd-config-other', $inner);
            const $sources = append($inner, '<div class="apd-subtitle-sources"></div>');
            const $styleRow = append($inner, '<div class="apd-subtitle-style-row"></div>');
            const selectors = {
                color: select($styleRow, 'Subtitle Color', 'color', colors),
                edge: select($styleRow, 'Edge Style', 'edgeStyle', edges),
            };
            const sliders = {
                fontSize: range($inner, 'Font Size', 'fontSize', 12, 60, 1, 'px'),
                bottom: range($inner, 'Subtitle Position', 'bottom', 10, 90, 1, '%'),
                offset: range($inner, 'Subtitle Offset', 'offset', -10, 10, 0.1, 's'),
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
            const addSource = (label) => append($checks, `<div class="apd-subtitle-source">${label}</div>`);
            const render = () => {
                const active = art.activeSubtitleTracks;
                $checks.innerHTML = '';
                addCheck(i18n.get('Subtitle'), art.subtitle.show);
                const groups = new Map();
                art.subtitleTracks.forEach((track, index) => {
                    const source = track.source || 'media';
                    if (!groups.has(source)) groups.set(source, []);
                    groups.get(source).push([track, index]);
                });
                groups.forEach((tracks, source) => {
                    addSource(i18n.get({ bilibili: 'Bilibili', media: 'Media', local: 'Local', cloud: 'Cloud', online: 'Online' }[source] || 'Subtitle'));
                    tracks.forEach(([track, index]) => addCheck(
                        track.name || track.lang || i18n.get('Subtitle'),
                        active.some((item) => sameSubtitle(item, track)),
                        index,
                    ));
                });
                $control.style.display = '';
            };
            let browser = null;
            const openSource = async (source) => {
                if (source === 'local') {
                    const input = Object.assign(document.createElement('input'), { type: 'file', multiple: true, accept: '.srt,.vtt,.ass,.ssa,.lrc,.json' });
                    input.onchange = () => art.addSubtitleFiles(Array.from(input.files || []));
                    input.click();
                    return;
                }
                if (!source) return;
                $host.classList.add('apd-subtitle-click-open');
                positionPanel();
                if (source.browse) return openBrowser(source);
                const tracks = await source.load(art);
                if (tracks?.length) art.addSubtitles(tracks, source.select !== false);
                else art.notice.show = i18n.get('No Subtitle');
            };
            def(art, 'openSubtitleSource', {
                value(source) {
                    const item = source === 'local' ? 'local' : typeof source === 'string' ? art.subtitleSources.find((entry) => entry.name === source) : source;
                    return openSource(item);
                },
            });
            const renderSources = () => {
                if (browser) return;
                $sources.classList.remove('apd-subtitle-browser');
                $panel.classList.remove('apd-subtitle-browser-left');
                $host.classList.remove('apd-subtitle-click-open');
                $sources.innerHTML = '';
                art.subtitleSources.forEach((source, index) =>
                    append($sources, `<button type="button" data-subtitle-source="${index}">${source.name || i18n.get('Subtitle')}</button>`),
                );
                append($sources, `<button type="button" data-subtitle-source="local">${i18n.get('Local Subtitle')}</button>`);
            };
            const renderBrowser = () => {
                if (!browser) return;
                $sources.classList.add('apd-subtitle-browser');
                const { provider, trail, items, selected, loading, error } = browser;
                $sources.innerHTML = '';
                const title = trail.length ? trail[trail.length - 1].name || trail[trail.length - 1].title : provider.name || i18n.get('Subtitle');
                const $head = append($sources, '<div class="apd-subtitle-browser-head art-setting-item art-setting-item-back" data-browser-back><div class="art-setting-item-left"><div class="art-setting-item-left-icon"></div><div class="art-setting-item-left-text"></div></div></div>');
                append(query('.art-setting-item-left-icon', $head), art.icons.arrowLeft);
                query('.art-setting-item-left-text', $head).textContent = title;
                const $list = append($sources, '<div class="apd-subtitle-browser-list"></div>');
                if (loading) append($list, `<div class="apd-subtitle-browser-empty">${i18n.get('Loading')}</div>`);
                else if (error) append($list, `<div class="apd-subtitle-browser-empty">${error}</div>`);
                else {
                    const folders = items.filter((item) => item?.type === 'folder');
                    const subtitles = items.filter((item) => item?.type !== 'folder' && item?.url);
                    folders.forEach((item) => append($list, `<div class="apd-subtitle-browser-row" data-browser-folder="${items.indexOf(item)}"><svg><use xlink:href="#iconFolder"></use></svg><span>${item.name || item.title}</span></div>`));
                    subtitles.forEach((item) => append($list, `<label class="apd-subtitle-browser-row"><input type="checkbox" data-browser-item="${items.indexOf(item)}" ${selected.has(item.key || item.url || item.sourcePath || item.path || item.name) ? 'checked' : ''}><span>${item.name || item.title}</span></label>`));
                    if (!folders.length && !subtitles.length) append($list, `<div class="apd-subtitle-browser-empty">${i18n.get('No Subtitle')}</div>`);
                }
                append($sources, `<div class="apd-subtitle-browser-foot"><span>${selected.size}</span><button type="button" data-browser-confirm>${i18n.get('Confirm')}</button></div>`);
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
                browser = { provider, trail: [], items: [], selected: new Map(), loading: false, error: '' };
                $host.classList.add('apd-subtitle-click-open');
                positionPanel();
                void loadBrowser(() => provider.browse.roots(art));
            };
            proxy($sources, 'click', async (event) => {
                if (browser) {
                    const back = event.target.closest('[data-browser-back]');
                    const folder = event.target.closest('[data-browser-folder]');
                    const subtitle = event.target.closest('[data-browser-item]');
                    const confirm = event.target.closest('[data-browser-confirm]');
                    if (back) {
                        if (!browser.trail.length) { browser = null; return renderSources(); }
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
                        const key = item.key || item.url || item.sourcePath || item.path || item.name;
                        browser.selected.has(key) ? browser.selected.delete(key) : browser.selected.set(key, item);
                        return renderBrowser();
                    }
                    if (confirm) {
                        const provider = browser.provider;
                        const tracks = await browser.provider.browse.select([...browser.selected.values()], art);
                        browser = null;
                        renderSources();
                        if (tracks?.length) art.addSubtitles(tracks, provider.select !== false);
                    }
                    return;
                }
                const button = event.target.closest('[data-subtitle-source]');
                if (button) void openSource(button.dataset.subtitleSource === 'local' ? 'local' : art.subtitleSources[Number(button.dataset.subtitleSource)]);
            });

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
                        active.some((item) => sameSubtitle(item, track))
                            ? active.filter((item) => !sameSubtitle(item, track))
                            : [...active, track],
                    );
                }
                render();
            });
            const positionPanel = () => {
                const controlRect = $control.getBoundingClientRect();
                const panelRect = $panel.getBoundingClientRect();
                const playerRect = template.$player.getBoundingClientRect();
                const padding = parseFloat(getComputedStyle(template.$player).getPropertyValue('--art-padding')) || 0;
                const centered = controlRect.left - playerRect.left + controlRect.width / 2 - panelRect.width / 2;
                const min = padding;
                const max = Math.max(min, playerRect.width - padding - panelRect.width);
                const left = Math.min(Math.max(centered, min), max);
                $panel.style.left = `${left}px`;
                $panel.classList.toggle(
                    'apd-subtitle-browser-left',
                    browser && left + panelRect.width + 328 > playerRect.width - padding,
                );
            };
            proxy($control, 'click', () => {
                const open = !$host.classList.contains('apd-subtitle-click-open');
                if (!open) {
                    browser = null;
                    renderSources();
                } else {
                    $host.classList.add('apd-subtitle-click-open');
                    positionPanel();
                }
            });
            proxy($control, 'mouseenter', positionPanel);
            art.on('resize', positionPanel);
            art.on('subtitle:change', render);
            art.on('subtitle:sources', renderSources);
            art.on('subtitle:config', (config) => {
                selectors.color(config.color);
                selectors.edge(config.edgeStyle);
                Object.keys(sliders).forEach((key) => sliders[key](config[key]));
                render();
            });
            render();
            renderSources();
        },
    });
}
