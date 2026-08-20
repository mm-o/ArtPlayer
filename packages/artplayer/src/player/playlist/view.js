function escapeText(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

const icon = {
    close: '<svg xmlns="http://www.w3.org/2000/svg" height="14" width="14" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"><path d="M18 6 6 18"></path><path d="m6 6 12 12"></path></svg>',
    arrow: '<svg xmlns="http://www.w3.org/2000/svg" height="14" width="14" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"><path d="m9 18 6-6-6-6"></path></svg>',
    favorite: '<svg xmlns="http://www.w3.org/2000/svg" height="14" width="14" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"><path d="M11.5 2.3a.6.6 0 0 1 1 0l2.7 5.4 6 .9a.6.6 0 0 1 .3 1l-4.4 4.3 1 6a.6.6 0 0 1-.9.6L12 17.7l-5.3 2.8a.6.6 0 0 1-.8-.7l1-6-4.4-4.2a.6.6 0 0 1 .3-1l6-.9 2.7-5.4z"></path></svg>',
    more: '<svg xmlns="http://www.w3.org/2000/svg" height="14" width="14" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>',
    remove: '<svg xmlns="http://www.w3.org/2000/svg" height="14" width="14" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path></svg>',
};

function getItemText(item) {
    return escapeText(item?.title || item?.name || item?.url || 'Media');
}

function renderItem(item, current, i18n, toggle = '', offset = '') {
    const active = current && (current.id === item.id || current.url === item.url);
    const favorite = item._favorite ? ' is-favorite' : '';
    const id = escapeText(item.id || item.url);
    const style = offset ? ` style="--art-playlist-offset:${offset}"` : '';

    return `
        <div class="art-playlist-item${active ? ' is-active' : ''}${favorite}" data-id="${id}"${style}>
            ${toggle}
            <button class="art-playlist-play" data-action="play" title="Play">
                <span class="art-playlist-text">${getItemText(item)}</span>
            </button>
            <button class="art-playlist-favorite" data-action="favorite" title="Favorite">${icon.favorite}</button>
            <button class="art-playlist-more" data-action="toggle-menu" title="More">${icon.more}</button>
            <div class="art-playlist-menu">
                <button data-action="remove">${icon.remove}<span>${i18n.get('Remove')}</span></button>
            </div>
        </div>
    `;
}

function renderGroup(group, current, i18n) {
    const items = group.items.map((item) => renderItem(item, current, i18n)).join('');
    return `
        <section class="art-playlist-group${group.expanded ? ' is-expanded' : ''}">
            <div class="art-playlist-group-title">${escapeText(group.name)}</div>
            <div class="art-playlist-group-items">${items}</div>
        </section>
    `;
}

function renderNode(node, current, i18n, level = 0, offset = '') {
    const item = node.item || (node.url ? node : null);
    const hasChildren = !!node.children?.length || typeof node.loadChildren === 'function';
    const isMedia = item && node.type === 'media';
    const childrenLayout = node.childrenLayout || (isMedia ? 'flat' : 'tree');
    const childLevel = childrenLayout === 'flat' ? level : level + 1;
    const childOffset = childrenLayout === 'flat' && isMedia ? `calc(32px + ${level} * 14px)` : '';
    const children = node.expanded === false ? '' : (node.children || []).map((child) => renderNode(child, current, i18n, childLevel, childOffset)).join('');
    const content = isMedia
        ? renderItem(item, current, i18n, hasChildren ? `<button class="art-playlist-node-toggle" data-action="toggle-node" title="Toggle">${icon.arrow}</button>` : '', offset)
        : `<button class="art-playlist-node-title" data-action="toggle-node">
              <span class="art-playlist-text">${escapeText(node.name)}</span>
              <span class="art-playlist-node-arrow">${hasChildren ? icon.arrow : ''}</span>
           </button>`;

    return `
        <div class="art-playlist-node${node.expanded === false ? '' : ' is-expanded'}" data-id="${escapeText(node.id)}" style="--art-playlist-level:${level}">
            ${content}
            ${children ? `<div class="art-playlist-node-children">${children}</div>` : ''}
        </div>
    `;
}

function renderCollection(name, items, roots, current, i18n, clearable = false) {
    const body = roots.length
        ? roots.map((node) => renderNode(node, current, i18n)).join('')
        : items.map((item) => renderItem(item, current, i18n)).join('');

    return `
        <section class="art-playlist-group is-expanded">
            <div class="art-playlist-group-title">
                <span>${name}</span>
                ${clearable ? `<button data-action="clear-history">${i18n.get('Clear')}</button>` : ''}
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
              : `${markedGroups.map((group) => renderGroup(group, currentPlaylistItem, i18n)).join('')}
                 ${markedRoots.map((node) => renderNode(node, currentPlaylistItem, i18n)).join('')}`;

    template.$playlist.innerHTML = `
        <div class="art-playlist-panel">
            <div class="art-playlist-header">
                <strong>${i18n.get('Playlist')}</strong>
                <div class="art-playlist-tools">
                    <button data-action="close" title="${i18n.get('Close')}">${icon.close}</button>
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
}
