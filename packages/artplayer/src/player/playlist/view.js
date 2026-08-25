import { tooltip } from '../../utils';

function escapeText(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

const icon = {
    close: '<svg xmlns="http://www.w3.org/2000/svg" height="14" width="14" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>',
    arrow: '<svg xmlns="http://www.w3.org/2000/svg" height="14" width="14" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"><path d="m9 18 6-6-6-6"></path></svg>',
    favorite: '<svg xmlns="http://www.w3.org/2000/svg" height="14" width="14" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"><path d="M11.5 2.3a.6.6 0 0 1 1 0l2.7 5.4 6 .9a.6.6 0 0 1 .3 1l-4.4 4.3 1 6a.6.6 0 0 1-.9.6L12 17.7l-5.3 2.8a.6.6 0 0 1-.8-.7l1-6-4.4-4.2a.6.6 0 0 1 .3-1l6-.9 2.7-5.4z"></path></svg>',
};

function getItemText(item) {
    return escapeText(item?.title || item?.name || item?.url || 'Media');
}

function renderItemNode(item, index = 0) {
    return {
        id: String(item.id || item.url || `item-${index}`),
        name: getItemText(item),
        type: 'media',
        item,
    };
}

function getNodeItem(node) {
    return node.item || (node.url ? node : null);
}

function renderNodeTitle(node, current, hasChildren) {
    const item = getNodeItem(node);
    const isMedia = item && node.type === 'media';
    const active = isMedia && current && (current.id === item.id || current.url === item.url);
    const favorite = item?._favorite ? ' is-favorite' : '';
    const id = escapeText(item?.id || item?.url || node.id);
    const arrow = `<span class="art-playlist-node-arrow">${hasChildren ? icon.arrow : ''}</span>`;

    if (!isMedia) {
        return `
            <button class="art-playlist-node-title" data-action="toggle-node">
                ${arrow}
                <span class="art-playlist-text">${escapeText(node.name)}</span>
            </button>
        `;
    }

    return `
        <div class="art-playlist-node-title art-playlist-item${active ? ' is-active' : ''}${favorite}" data-id="${id}">
            ${hasChildren ? `<button class="art-playlist-node-arrow" data-action="toggle-node">${icon.arrow}</button>` : '<span class="art-playlist-node-arrow"></span>'}
            <button class="art-playlist-node-text" data-action="play">
                <span class="art-playlist-text">${getItemText(item)}</span>
            </button>
            <button class="art-playlist-favorite" data-action="favorite">${icon.favorite}</button>
        </div>
    `;
}

function renderGroup(group, current) {
    const items = group.items.map((item, index) => renderNode(renderItemNode(item, index), current)).join('');
    return `
        <section class="art-playlist-group${group.expanded ? ' is-expanded' : ''}">
            <div class="art-playlist-group-title">${escapeText(group.name)}</div>
            <div class="art-playlist-group-items">${items}</div>
        </section>
    `;
}

function renderNode(node, current, level = 0) {
    const hasChildren = !!node.children?.length || typeof node.loadChildren === 'function';
    const childLevel = level + 1;
    const children = node.expanded === false ? '' : (node.children || []).map((child) => renderNode(child, current, childLevel)).join('');

    return `
        <div class="art-playlist-node${node.expanded === false ? '' : ' is-expanded'}" data-id="${escapeText(node.id)}" style="--art-playlist-level:${level}">
            ${renderNodeTitle(node, current, hasChildren)}
            ${children ? `<div class="art-playlist-node-children">${children}</div>` : ''}
        </div>
    `;
}

function renderCollection(name, items, roots, current, i18n, clearable = false) {
    const body = roots.length
        ? roots.map((node) => renderNode(node, current)).join('')
        : items.map((item, index) => renderNode(renderItemNode(item, index), current)).join('');

    return `
        <section class="art-playlist-group is-expanded">
            <div class="art-playlist-group-title">
                <span>${name}</span>
                ${clearable ? `<button data-action="clear-history" data-tooltip="Clear">${i18n.get('Clear')}</button>` : ''}
            </div>
            <div class="art-playlist-group-items">
                ${body || `<div class="art-playlist-empty">${i18n.get('Empty')}</div>`}
            </div>
        </section>
    `;
}

export function renderPlaylist(art, page = 'playlist') {
    const { playlist, currentPlaylistItem, template } = art;
    const i18n = art.i18n;
    const scrollTop = template.$playlist.querySelector('.art-playlist-body')?.scrollTop || 0;
    const favorites = new Set(playlist.favorites.map((item) => item.id || item.url));
    const markFavorite = (item) => ({ ...item, _favorite: favorites.has(item.id || item.url) });
    const markNodeFavorite = (node) => ({
        ...node,
        item: node.item ? markFavorite(node.item) : node.item,
        children: (node.children || []).map(markNodeFavorite),
    });
    const markedGroups = playlist.groups.map((group) => ({ ...group, items: group.items.map(markFavorite) }));
    const markedRoots = playlist.roots.map(markNodeFavorite);
    const markedFavoritesRoots = playlist.favoritesRoots.map(markNodeFavorite);
    const markedHistoryRoots = playlist.historyRoots.map(markNodeFavorite);
    const markedFavorites = playlist.favorites.map((item) => ({ ...item, _favorite: true }));
    const markedHistory = playlist.history.map(markFavorite);
    const body =
        page === 'favorites'
            ? renderCollection(i18n.get('Favorites'), markedFavorites, markedFavoritesRoots, currentPlaylistItem, i18n)
            : page === 'history'
              ? renderCollection(i18n.get('History'), markedHistory, markedHistoryRoots, currentPlaylistItem, i18n, true)
              : `${markedGroups.map((group) => renderGroup(group, currentPlaylistItem)).join('')}
                 ${markedRoots.map((node) => renderNode(node, currentPlaylistItem)).join('')}`;

    template.$playlist.innerHTML = `
        <div class="art-playlist-panel">
            <div class="art-playlist-header">
                <strong>${i18n.get('Playlist')}</strong>
                <div class="art-playlist-tools">
                    <button data-action="close" data-tooltip="Close">${icon.close}</button>
                </div>
            </div>
            <div class="art-playlist-tabs">
                <button data-page="playlist" class="${page === 'playlist' ? 'is-active' : ''}">${i18n.get('Playlist')}</button>
                <button data-page="favorites" class="${page === 'favorites' ? 'is-active' : ''}">${i18n.get('Favorites')}</button>
                <button data-page="history" class="${page === 'history' ? 'is-active' : ''}">${i18n.get('History')}</button>
            </div>
            <div class="art-playlist-body">${body || `<div class="art-playlist-empty">${i18n.get('Empty')}</div>`}</div>
        </div>
    `;
    const nextBody = template.$playlist.querySelector('.art-playlist-body');
    if (nextBody) nextBody.scrollTop = scrollTop;
    template.$playlist.querySelectorAll('[data-tooltip]').forEach(($button) => tooltip($button, i18n.get($button.dataset.tooltip)));
}
