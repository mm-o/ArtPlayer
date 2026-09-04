const query = (selector, parent) => parent.querySelector(selector);
const append = (parent, child) => {
    if (child instanceof Element) parent.appendChild(child);
    else parent.insertAdjacentHTML('beforeend', String(child));
    return parent.lastElementChild || parent.lastChild;
};

const keyOf = (item = {}) => item.key || item.url || item.sourceUrl || item.sourcePath || item.path || item.name || item.title || '';

export const sourceBrowserSide = ({ left, panel, browser, player, padding }) => {
    const right = player - padding - left - panel - 8;
    return right >= browser || right >= left - padding - 8 ? 'right' : 'left';
};

export const resolveSource = (source, sources = []) => {
    if (source === 'local' || typeof source === 'object') return source;
    return sources[Number(source)] || sources.find((item) => item.name === source);
};

export default function createSourceBrowser(art, option) {
    const { icons, i18n, template } = art;
    const $browser = append(template.$player, '<div class="art-source-browser-panel"></div>');
    let state = null;

    const position = () => {
        if (!state) return;
        const panel = option.panel.getBoundingClientRect();
        const player = template.$player.getBoundingClientRect();
        const width = $browser.getBoundingClientRect().width || panel.width;
        const padding = parseFloat(getComputedStyle(template.$player).getPropertyValue('--art-padding')) || 0;
        const left = panel.left - player.left;
        $browser.style.left = sourceBrowserSide({ left, panel: panel.width, browser: width, player: player.width, padding }) === 'left'
            ? `${left - width - 8}px`
            : `${left + panel.width + 8}px`;
        $browser.style.bottom = `${Math.max(0, player.bottom - panel.bottom)}px`;
    };
    const close = () => {
        state = null;
        $browser.classList.remove('art-source-browser-open');
        $browser.innerHTML = '';
        option.onOpen?.(false);
    };
    const render = () => {
        if (!state) return;
        const { provider, trail, items, selected, loading, error } = state;
        $browser.classList.add('art-source-browser-open');
        $browser.innerHTML = '';
        const title = trail.at(-1)?.name || trail.at(-1)?.title || provider.name || option.title;
        const $head = append($browser, '<button type="button" class="art-source-browser-head" data-source-back><span class="art-source-browser-head-icon"></span><span class="art-source-browser-title"></span></button>');
        append(query('.art-source-browser-head-icon', $head), icons.arrowLeft);
        query('.art-source-browser-title', $head).textContent = title;
        const $list = append($browser, '<div class="art-source-browser-list"></div>');
        if (loading || error) {
            append($list, '<div class="art-source-browser-empty"></div>').textContent = loading ? i18n.get('Loading') : error;
        } else {
            items.forEach((item, index) => {
                if (item?.type === 'folder') {
                    const $row = append($list, '<button type="button" class="art-source-browser-row" data-source-folder><span></span></button>');
                    $row.dataset.sourceFolder = index;
                    query('span', $row).textContent = item.name || item.title || '';
                } else if (item?.url || item?.file) {
                    const $row = append($list, '<label class="art-source-browser-row"><input type="checkbox" data-source-item><span></span></label>');
                    query('input', $row).dataset.sourceItem = index;
                    query('input', $row).checked = selected.has(keyOf(item));
                    query('span', $row).textContent = item.name || item.title || '';
                }
            });
            if (!$list.children.length) append($list, '<div class="art-source-browser-empty"></div>').textContent = i18n.get(option.empty);
        }
        const $foot = append($browser, '<div class="art-source-browser-foot"><span></span><button type="button" data-source-confirm></button></div>');
        query('span', $foot).textContent = selected.size;
        query('button', $foot).textContent = i18n.get('Confirm');
        position();
    };
    const load = async (task) => {
        const current = state;
        if (!current) return;
        current.loading = true;
        current.error = '';
        render();
        try {
            current.items = await task() || [];
        } catch (error) {
            current.items = [];
            current.error = error?.message || i18n.get('Load failed');
        }
        if (state !== current) return;
        current.loading = false;
        render();
    };
    const open = async (source, sources) => {
        source = resolveSource(source, sources);
        if (source === 'local') {
            const input = Object.assign(document.createElement('input'), { type: 'file', multiple: true, accept: option.accept });
            input.onchange = () => option.onFiles(Array.from(input.files || []));
            input.click();
        } else if (source?.browse) {
            state = { provider: source, trail: [], items: [], selected: new Map(), loading: false, error: '' };
            option.onOpen?.(true);
            await load(() => source.browse.roots(art));
        } else if (source?.load) {
            const items = await source.load(art);
            if (items?.length) option.onSelect(items, source);
            else art.notice.show = i18n.get(option.empty);
        }
    };

    art.proxy($browser, 'click', async (event) => {
        if (!state) return;
        const back = event.target.closest('[data-source-back]');
        const folder = event.target.closest('[data-source-folder]');
        const item = event.target.closest('[data-source-item]');
        if (back) {
            if (!state.trail.length) return close();
            state.trail.pop();
            return load(() => state.trail.length ? state.provider.browse.children(state.trail.at(-1), art) : state.provider.browse.roots(art));
        }
        if (folder) {
            state.trail.push(state.items[Number(folder.dataset.sourceFolder)]);
            return load(() => state.provider.browse.children(state.trail.at(-1), art));
        }
        if (item) {
            const value = state.items[Number(item.dataset.sourceItem)];
            const key = keyOf(value);
            if (key) state.selected.has(key) ? state.selected.delete(key) : state.selected.set(key, value);
            return render();
        }
        if (event.target.closest('[data-source-confirm]')) {
            const { provider, selected } = state;
            const values = await provider.browse.select([...selected.values()], art);
            close();
            if (values?.length) option.onSelect(values, provider);
        }
    });
    art.on('resize', position);
    art.on('destroy', () => $browser.remove());
    return { open, close, position, contains: (target) => $browser.contains(target), get opened() { return !!state; } };
}
