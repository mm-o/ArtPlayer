import { append, query } from '../utils/dom.js';
import { def } from '../utils/property.js';
import { sameSubtitle } from './subtitleTrack.js';

const SOURCE_LABELS = { bilibili: 'Bilibili', media: 'Media', local: 'Local', cloud: 'Cloud', online: 'Online' };

const createSelect = (art, $inner, label, key, options) => {
    const $item = append($inner, '<label class="apd-config-select"><span class="apd-label"></span><select></select></label>');
    const $select = query('select', $item);
    query('.apd-label', $item).textContent = art.i18n.get(label);
    options.forEach(([value, text]) => {
        const $option = document.createElement('option');
        $option.value = value;
        $option.textContent = art.i18n.get(text);
        $select.appendChild($option);
    });
    art.proxy($select, 'change', () => art.setSubtitleConfig({ [key]: $select.value }));
    return (value) => { $select.value = String(value ?? options[0][0]); };
};

const createSlider = (art, $inner, label, key, min, max, step, suffix) => {
    const $item = append($inner, '<div class="apd-config-slider"><span class="apd-label"></span><div class="apd-slider"><div class="apd-slider-line"><div class="apd-slider-points"></div><div class="apd-slider-progress"></div></div><div class="apd-slider-dot"></div></div><span class="apd-value"></span></div>');
    const $slider = query('.apd-slider', $item);
    const $progress = query('.apd-slider-progress', $item);
    const $dot = query('.apd-slider-dot', $item);
    const $value = query('.apd-value', $item);
    query('.apd-label', $item).textContent = art.i18n.get(label);
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
        paint(min + ((Math.min(right, Math.max(left, event.clientX)) - left) / width) * (max - min));
        art.setSubtitleConfig({ [key]: current });
    };
    const release = (event) => $slider.hasPointerCapture(event.pointerId) && $slider.releasePointerCapture(event.pointerId);
    art.proxy($slider, 'pointerdown', (event) => {
        if (event.button !== 0) return;
        $slider.setPointerCapture(event.pointerId);
        update(event);
    });
    art.proxy($slider, 'pointermove', (event) => $slider.hasPointerCapture(event.pointerId) && update(event));
    art.proxy($slider, 'pointerup', release);
    art.proxy($slider, 'pointercancel', release);
    return paint;
};

export default function installSubtitlePanel(art) {
    const { controls, i18n, icons, template } = art;
    const colors = [['#fff', 'White'], ['#ffeb3b', 'Yellow'], ['#ff4d4f', 'Red'], ['#b43cc8', 'Purple'], ['#2f80ed', 'Blue'], ['#00b8f0', 'Cyan']];
    const edges = [['none', 'None'], ['outline', 'Outline'], ['thick', 'Thick Outline'], ['shadow', 'Shadow']];
    controls.addPinned('subtitle', 'Subtitle', {
        name: 'subtitle',
        position: 'right',
        index: 11,
        html: icons.subtitle,
        mounted: ($control) => {
            const $host = append(template.$player, '<div class="art-subtitle-panel"></div>');
            art.controls.subtitlePanel = $host;
            const $panel = append($host, '<div class="apd-config-panel"><div class="apd-config-panel-inner"></div></div>');
            const $inner = query('.apd-config-panel-inner', $panel);
            const $tracks = append($inner, '<div class="apd-config-other"></div>');
            const $sources = append($inner, '<div class="apd-subtitle-sources"></div>');
            const $style = append($inner, '<div class="apd-subtitle-style-row"></div>');
            const selectors = {
                color: createSelect(art, $style, 'Subtitle Color', 'color', colors),
                edge: createSelect(art, $style, 'Edge Style', 'edgeStyle', edges),
            };
            const sliders = {
                fontSize: createSlider(art, $inner, 'Font Size', 'fontSize', 12, 60, 1, 'px'),
                bottom: createSlider(art, $inner, 'Subtitle Position', 'bottom', 0, 100, 1, '%'),
                offset: createSlider(art, $inner, 'Subtitle Offset', 'offset', -10, 10, 0.1, 's'),
                backgroundOpacity: createSlider(art, $inner, 'Background Opacity', 'backgroundOpacity', 0, 100, 5, '%'),
            };
            const setOpen = (open) => {
                $host.classList.toggle('apd-subtitle-open', open);
                if (open) position();
            };
            const picker = art.createSourceBrowser({
                panel: $panel,
                accept: '.srt,.vtt,.ass,.ssa,.lrc,.json',
                title: i18n.get('Subtitle'),
                empty: 'No Subtitle',
                onOpen: (open) => open && setOpen(true),
                onFiles: (files) => art.addSubtitleFiles(files),
                onSelect: (tracks, source) => art.addSubtitles(tracks, source.select !== false),
            });
            function position() {
                const control = $control.getBoundingClientRect();
                const panel = $panel.getBoundingClientRect();
                const player = template.$player.getBoundingClientRect();
                const padding = parseFloat(getComputedStyle(template.$player).getPropertyValue('--art-padding')) || 0;
                $panel.style.left = `${Math.min(Math.max(control.left - player.left + control.width / 2 - panel.width / 2, padding), Math.max(padding, player.width - padding - panel.width))}px`;
                picker.position();
            }
            const createCheck = (label, checked, index = -1) => {
                const $item = append($tracks, '<label class="apd-other" data-subtitle-index><input class="apd-check" type="checkbox"><span></span></label>');
                $item.dataset.subtitleIndex = index;
                query('.apd-check', $item).checked = checked;
                query('span', $item).textContent = label;
            };
            const renderTracks = () => {
                $tracks.innerHTML = '';
                createCheck(i18n.get('Subtitle'), art.subtitle.show);
                const groups = new Map();
                const active = art.getActiveSubtitles();
                art.getSubtitles().forEach((track, index) => {
                    const source = track.source || 'media';
                    if (!groups.has(source)) groups.set(source, []);
                    groups.get(source).push([track, index]);
                });
                groups.forEach((tracks, source) => {
                    append($tracks, '<div class="apd-subtitle-source"></div>').textContent = i18n.get(SOURCE_LABELS[source] || 'Subtitle');
                    tracks.forEach(([track, index]) => createCheck(track.name || track.lang || i18n.get('Subtitle'), active.some((item) => sameSubtitle(item, track)), index));
                });
                $control.style.display = '';
            };
            const renderSources = () => {
                $sources.innerHTML = '';
                [['local', i18n.get('Local Subtitle')], ...art.getSubtitleSources().map((source, index) => [index, source.name || i18n.get('Subtitle')])].forEach(([value, label]) => {
                    const $button = append($sources, '<button type="button" data-subtitle-source></button>');
                    $button.dataset.subtitleSource = value;
                    $button.textContent = label;
                });
            };
            const paintConfig = (config) => {
                selectors.color(config.color);
                selectors.edge(config.edgeStyle);
                Object.keys(sliders).forEach((key) => sliders[key](config[key]));
                const $visible = query('[data-subtitle-index="-1"] .apd-check', $tracks);
                if ($visible) $visible.checked = art.subtitle.show;
            };
            def(art, 'openSubtitleSource', {
                value: (source) => picker.open(source, art.getSubtitleSources()),
            });
            art.proxy($host, 'click', async (event) => {
                const source = event.target.closest('[data-subtitle-source]');
                if (source) return art.openSubtitleSource(source.dataset.subtitleSource);
                const check = event.target.closest('[data-subtitle-index]');
                if (!check) return;
                event.preventDefault();
                const index = Number(check.dataset.subtitleIndex);
                if (index < 0) art.setSubtitleConfig({ visible: !art.subtitle.show });
                else {
                    const track = art.getSubtitles()[index];
                    const active = art.getActiveSubtitles();
                    await art.selectSubtitleTracks(active.some((item) => sameSubtitle(item, track))
                        ? active.filter((item) => !sameSubtitle(item, track))
                        : [...active, track]);
                }
            });
            art.proxy($control, 'click', () => {
                if ($host.classList.contains('apd-subtitle-open')) picker.close(), setOpen(false);
                else setOpen(true);
            });
            art.proxy($control, 'mouseenter', () => setOpen(true));
            art.proxy($host, 'mouseleave', () => !picker.opened && setOpen(false));
            art.on('resize', position);
            art.on('subtitle:change', renderTracks);
            art.on('subtitle:sources', renderSources);
            art.on('subtitle:config', paintConfig);
            renderTracks();
            renderSources();
            paintConfig(art.getSubtitleConfig());
        },
    });
}
