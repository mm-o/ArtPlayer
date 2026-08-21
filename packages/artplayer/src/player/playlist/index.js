import { def } from '../../utils/property.js';
import { collectNodeItems, normalizeItems, normalizeNodes, normalizePlaylist, uniqueItems } from './schema.js';
import { renderPlaylist } from './view.js';

function findIndex(playlist, current) {
    if (!playlist.items.length) return -1;
    if (!current) return 0;

    return playlist.items.findIndex((item) => item.id === current || item.url === current);
}

function findItem(playlist, id) {
    return playlist.items.find((item) => item.id === id || item.url === id) || null;
}

function findNode(nodes, id, parent = null) {
    for (let index = 0; index < nodes.length; index++) {
        const node = nodes[index];
        if (node.id === id || node.item?.id === id || node.item?.url === id) {
            return { node, parent, nodes, index };
        }

        const result = findNode(node.children || [], id, node);
        if (result) return result;
    }

    return null;
}

function getTreeRoots(playlist) {
    return [...playlist.roots, ...playlist.favoritesRoots, ...playlist.historyRoots];
}

function getTreeItems(playlist) {
    return collectNodeItems(getTreeRoots(playlist));
}

function findAnyItem(playlist, id) {
    return (
        findItem(playlist, id) ||
        getTreeItems(playlist).find((item) => item.id === id || item.url === id) ||
        playlist.favorites.find((item) => item.id === id || item.url === id) ||
        playlist.history.find((item) => item.id === id || item.url === id) ||
        null
    );
}

function findAnyNode(playlist, id) {
    return findNode(getTreeRoots(playlist), id);
}

function removeFromNodes(nodes, id) {
    return nodes
        .map((node) => ({
            ...node,
            children: removeFromNodes(node.children || [], id),
        }))
        .filter((node) => node.id !== id && node.item?.id !== id && node.item?.url !== id);
}

function isSameItem(item, id) {
    return item?.id === id || item?.url === id;
}

function toItemNode(item, prefix = 'item') {
    return normalizeNodes([{ id: item.id || item.url, type: 'media', item }], prefix)[0];
}

function syncCollectionRoots(roots, item, insert, prefix) {
    const id = item?.id || item?.url;
    if (!id || !roots.length) return roots;

    const nextRoots = removeFromNodes(roots, id);
    if (!insert) return nextRoots;

    const node = toItemNode(item, prefix);
    if (!node) return nextRoots;

    const parent = nextRoots[0];
    if (parent && !parent.item && parent.type !== 'media') {
        parent.children = [node, ...(parent.children || [])];
        parent.expanded = true;
        return nextRoots;
    } else {
        return [node, ...nextRoots];
    }
}

function toHistoryItem(item) {
    if (!item || typeof item !== 'object') return item;
    const { playlist, ...historyItem } = item;
    return historyItem;
}

function updateItems(playlist) {
    const groupItems = playlist.groups.flatMap((group) => group.items);
    playlist.items = uniqueItems([...groupItems, ...getTreeItems(playlist), ...(playlist._items || [])]);
}

export default function playlistMix(art) {
    let playlist = normalizePlaylist();
    let playlistIndex = -1;
    let page = 'playlist';

    function render() {
        if (art.template?.$playlist) {
            renderPlaylist(art, page);
        }
    }

    function emitChange(type, detail) {
        art.emit('playlist:change', playlist, type, detail);
        render();
    }

    function setCurrent(index) {
        playlistIndex = playlist.items.length ? Math.max(0, Math.min(index, playlist.items.length - 1)) : -1;
        return playlist.items[playlistIndex] || null;
    }

    async function loadNode(node) {
        if (!node || node._loaded || typeof node.loadChildren !== 'function') return node;

        const children = await node.loadChildren(node, playlist, art);
        node.children = normalizeNodes(children, node.id);
        node._loaded = true;
        updateItems(playlist);
        return node;
    }

    async function playItem(item) {
        if (!item) return null;
        playlistIndex = findIndex(playlist, item.id || item.url);
        art.emit('playlist:item', item, playlistIndex);

        if (item._native || item._playlistNative) {
            await art.playMedia(item);
        } else if (typeof playlist.onPlayItem === 'function') {
            await playlist.onPlayItem(item, playlistIndex, playlist);
        } else if (typeof art.playMedia === 'function') {
            await art.playMedia(item);
        }

        render();
        return item;
    }

    def(art, 'playlist', {
        get() {
            return playlist;
        },
    });

    def(art, 'playlistIndex', {
        get() {
            return playlistIndex;
        },
    });

    def(art, 'currentPlaylistItem', {
        get() {
            return playlist.items[playlistIndex] || null;
        },
    });

    def(art, 'setPlaylist', {
        value(input, current) {
            playlist = normalizePlaylist(input);
            setCurrent(findIndex(playlist, current));
            emitChange('set', { current });
            return playlist;
        },
    });

    def(art, 'renderPlaylist', {
        value(nextPage = page) {
            page = nextPage;
            render();
        },
    });

    def(art, 'playlistShow', {
        get() {
            return art.template.$player.classList.contains('art-playlist-show');
        },
        set(value) {
            art.template.$player.classList[value ? 'add' : 'remove']('art-playlist-show');
            render();
            art.emit('playlist:show', !!value);
        },
    });

    def(art, 'playlistToggle', {
        value() {
            art.playlistShow = !art.playlistShow;
            return art.playlistShow;
        },
    });

    def(art, 'playlistPlay', {
        value(id) {
            const anyResult = findAnyNode(playlist, id);
            const nodeItem = anyResult?.node?.type === 'media' ? anyResult.node.item : null;
            return playItem(findItem(playlist, id) || nodeItem || (id ? null : playlist.items[playlistIndex]) || null);
        },
    });

    def(art, 'playlistNext', {
        value() {
            return playItem(setCurrent(playlistIndex + 1));
        },
    });

    def(art, 'playlistPrev', {
        value() {
            return playItem(setCurrent(playlistIndex - 1));
        },
    });

    def(art, 'playlistGetItem', {
        value(id) {
            return findAnyItem(playlist, id);
        },
    });

    def(art, 'playlistGetNode', {
        value(id) {
            return findAnyNode(playlist, id)?.node || null;
        },
    });

    def(art, 'playlistExpandNode', {
        async value(id, expanded = true) {
            const result = findAnyNode(playlist, id);
            if (!result) return null;

            const { node } = result;
            node.expanded = expanded !== false;
            if (node.expanded) await loadNode(node);
            art.emit('playlist:node', node, node.expanded);
            emitChange('node', node);
            return node;
        },
    });

    def(art, 'playlistToggleNode', {
        async value(id) {
            const node = art.playlistGetNode(id);
            return node ? art.playlistExpandNode(id, node.expanded === false) : null;
        },
    });

    def(art, 'togglePlaylistFavorite', {
        async value(id) {
            const item = findAnyItem(playlist, id);
            if (!item) return false;

            const favorite = !playlist.favorites.some((current) => isSameItem(current, item.id));
            playlist.favorites = favorite
                ? [item, ...playlist.favorites]
                : playlist.favorites.filter((current) => !isSameItem(current, item.id));
            playlist.favoritesRoots = syncCollectionRoots(playlist.favoritesRoots, item, favorite, 'favorite');

            if (typeof playlist.onToggleFavorite === 'function') {
                await playlist.onToggleFavorite(item, favorite, playlist);
            }

            art.emit('playlist:favorite', item, favorite);
            emitChange('favorite', { item, favorite });
            return favorite;
        },
    });

    def(art, 'playlistRecordHistory', {
        async value(item = art.currentMedia) {
            const next = normalizeItems([toHistoryItem(item)], 'history')[0];
            if (!next) return null;

            playlist.history = [next, ...playlist.history.filter((current) => !isSameItem(current, next.id))];
            playlist.historyRoots = syncCollectionRoots(playlist.historyRoots, next, true, 'history');

            if (typeof playlist.onRecordHistory === 'function') {
                await playlist.onRecordHistory(next, playlist);
            }

            art.emit('playlist:history', next);
            emitChange('history', next);
            return next;
        },
    });

    def(art, 'clearPlaylistHistory', {
        async value() {
            playlist.history = [];
            playlist.historyRoots = [];

            if (typeof playlist.onClearHistory === 'function') {
                await playlist.onClearHistory(playlist);
            }

            art.emit('playlist:history:clear', playlist);
            emitChange('history:clear', playlist);
            return playlist.history;
        },
    });

    if (art.template?.$playlist && art.events?.proxy) {
        art.events.proxy(art.template.$playlist, 'click', async (event) => {
            const target = event.target;
            const actionTarget = target?.closest?.('[data-action]');
            const pageTarget = target?.closest?.('[data-page]');
            const action = actionTarget?.dataset?.action;
            const pageName = pageTarget?.dataset?.page;
            const node = target?.closest?.('.art-playlist-node');
            const item = target?.closest?.('.art-playlist-item');
            const id = item?.dataset?.id;
            if (pageName) {
                art.renderPlaylist(pageName);
                return;
            }

            switch (action) {
                case 'close':
                    art.playlistShow = false;
                    break;
                case 'play':
                    await art.playlistPlay(id);
                    break;
                case 'favorite':
                    await art.togglePlaylistFavorite(id);
                    break;
                case 'clear-history':
                    await art.clearPlaylistHistory();
                    break;
                case 'toggle-node':
                    if (node?.dataset?.id) {
                        await art.playlistToggleNode(node.dataset.id);
                    }
                    break;
            }
        });
    }
}
