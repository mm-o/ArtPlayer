import { def } from '../../utils/property.js';
import { normalizePlaylist } from './schema.js';
import { renderPlaylist } from './view.js';

function findIndex(playlist, current) {
    if (!playlist.items.length) return -1;
    if (!current) return 0;

    return playlist.items.findIndex((item) => item.id === current || item.url === current);
}

function findItem(playlist, id) {
    return playlist.items.find((item) => item.id === id || item.url === id) || null;
}

function findAnyItem(playlist, id) {
    return (
        findItem(playlist, id) ||
        playlist.favorites.find((item) => item.id === id || item.url === id) ||
        playlist.history.find((item) => item.id === id || item.url === id) ||
        null
    );
}

function removeFromGroups(groups, id) {
    groups.forEach((group) => {
        group.items = group.items.filter((item) => item.id !== id && item.url !== id);
    });
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

    async function playItem(item) {
        if (!item) return null;
        playlistIndex = findIndex(playlist, item.id || item.url);
        art.emit('playlist:item', item, playlistIndex);

        if (typeof playlist.onPlayItem === 'function') {
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
            return playItem(findItem(playlist, id) || playlist.items[playlistIndex] || null);
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

    def(art, 'playlistAdd', {
        value(item, groupId) {
            const next = normalizePlaylist({ items: [item] }).items[0];
            if (!next) return null;

            playlist.items.push(next);

            let group = playlist.groups.find((item) => item.id === groupId);
            if (!group) {
                group = {
                    id: groupId || 'default',
                    name: groupId || 'Playlist',
                    expanded: true,
                    items: [],
                };
                playlist.groups.push(group);
            }
            group.items.push(next);
            emitChange('add', next);
            return next;
        },
    });

    def(art, 'playlistRemove', {
        value(id) {
            const item = findAnyItem(playlist, id);
            if (!item) return null;

            playlist.items = playlist.items.filter((item) => !isSameItem(item, id));
            playlist.favorites = playlist.favorites.filter((item) => !isSameItem(item, id));
            playlist.history = playlist.history.filter((item) => !isSameItem(item, id));
            playlist.roots = removeFromNodes(playlist.roots, id);
            removeFromGroups(playlist.groups, id);
            setCurrent(Math.min(playlistIndex, playlist.items.length - 1));
            emitChange('remove', item);
            return item;
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

            if (typeof playlist.onToggleFavorite === 'function') {
                await playlist.onToggleFavorite(item, favorite, playlist);
            }

            art.emit('playlist:favorite', item, favorite);
            render();
            return favorite;
        },
    });

    def(art, 'clearPlaylistHistory', {
        async value() {
            playlist.history = [];

            if (typeof playlist.onClearHistory === 'function') {
                await playlist.onClearHistory(playlist);
            }

            art.emit('playlist:history:clear', playlist);
            render();
            return playlist.history;
        },
    });

    if (art.template?.$playlist && art.events?.proxy) {
        art.events.proxy(art.template.$playlist, 'click', async (event) => {
            const target = event.target;
            const action = target?.dataset?.action;
            const pageName = target?.dataset?.page;
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
                case 'remove':
                    art.playlistRemove(id);
                    break;
                case 'clear-history':
                    await art.clearPlaylistHistory();
                    break;
            }
        });
    }
}
