function escapeText(value = '') {
    return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function getItemText(item) {
    return escapeText(item?.title || item?.name || item?.url || 'Media');
}

function renderItem(item, current) {
    const active = current && (current.id === item.id || current.url === item.url);
    const favorite = item._favorite ? ' is-favorite' : '';

    return `
        <div class="art-playlist-item${active ? ' is-active' : ''}${favorite}" data-id="${escapeText(item.id || item.url)}">
            <button class="art-playlist-play" data-action="play" title="Play">${getItemText(item)}</button>
            <button class="art-playlist-favorite" data-action="favorite" title="Favorite">★</button>
            <button class="art-playlist-remove" data-action="remove" title="Remove">×</button>
        </div>
    `;
}

function renderGroup(group, current) {
    const items = group.items.map((item) => renderItem(item, current)).join('');
    return `
        <section class="art-playlist-group${group.expanded ? ' is-expanded' : ''}">
            <div class="art-playlist-group-title">${escapeText(group.name)}</div>
            <div class="art-playlist-group-items">${items}</div>
        </section>
    `;
}

function renderNode(node, current, level = 0) {
    const item = node.item || (node.url ? node : null);
    const children = (node.children || []).map((child) => renderNode(child, current, level + 1)).join('');
    const content = item ? renderItem(item, current) : `<div class="art-playlist-node-title">${escapeText(node.name)}</div>`;

    return `
        <div class="art-playlist-node" style="--art-playlist-level:${level}">
            ${content}
            ${children ? `<div class="art-playlist-node-children">${children}</div>` : ''}
        </div>
    `;
}

function renderCollection(name, items, current, clearable = false) {
    return `
        <section class="art-playlist-group is-expanded">
            <div class="art-playlist-group-title">
                <span>${name}</span>
                ${clearable ? '<button data-action="clear-history">Clear</button>' : ''}
            </div>
            <div class="art-playlist-group-items">
                ${items.length ? items.map((item) => renderItem(item, current)).join('') : '<div class="art-playlist-empty">Empty</div>'}
            </div>
        </section>
    `;
}

export function renderPlaylist(art, page = 'playlist') {
    const { playlist, currentPlaylistItem, template } = art;
    const favorites = new Set(playlist.favorites.map((item) => item.id || item.url));
    const markFavorite = (item) => ({ ...item, _favorite: favorites.has(item.id || item.url) });
    const markedGroups = playlist.groups.map((group) => ({ ...group, items: group.items.map(markFavorite) }));
    const markedRoots = playlist.roots.map((node) => node);
    const markedFavorites = playlist.favorites.map((item) => ({ ...item, _favorite: true }));
    const markedHistory = playlist.history.map(markFavorite);
    const body =
        page === 'favorites'
            ? renderCollection('Favorites', markedFavorites, currentPlaylistItem)
            : page === 'history'
              ? renderCollection('History', markedHistory, currentPlaylistItem, true)
              : `${markedGroups.map((group) => renderGroup(group, currentPlaylistItem)).join('')}
                 ${markedRoots.map((node) => renderNode(node, currentPlaylistItem)).join('')}`;

    template.$playlist.innerHTML = `
        <div class="art-playlist-panel">
            <div class="art-playlist-header">
                <strong>${escapeText(playlist.title)}</strong>
                <button data-action="close">×</button>
            </div>
            <div class="art-playlist-tabs">
                <button data-page="playlist" class="${page === 'playlist' ? 'is-active' : ''}">Playlist</button>
                <button data-page="favorites" class="${page === 'favorites' ? 'is-active' : ''}">Favorites</button>
                <button data-page="history" class="${page === 'history' ? 'is-active' : ''}">History</button>
            </div>
            <div class="art-playlist-body">${body || '<div class="art-playlist-empty">Empty</div>'}</div>
        </div>
    `;
}
