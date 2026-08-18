function isObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}

function getId(prefix, index) {
    return `${prefix}-${index}`;
}

function getTitle(item, fallback) {
    return String(item?.title || item?.name || item?.url || fallback);
}

export function normalizeItem(item, index, prefix = 'item') {
    if (typeof item === 'string') {
        return {
            id: getId(prefix, index),
            title: item,
            url: item,
        };
    }

    if (!isObject(item)) return null;

    return {
        ...item,
        id: String(item.id || item.mediaId || item.url || getId(prefix, index)),
        title: getTitle(item, `Media ${index + 1}`),
    };
}

export function normalizeItems(items = [], prefix) {
    return Array.isArray(items) ? items.map((item, index) => normalizeItem(item, index, prefix)).filter(Boolean) : [];
}

function normalizeGroup(group, index) {
    const name = String(group?.name || group?.title || `Group ${index + 1}`);
    const items = normalizeItems(group?.items, `group-${index}`);

    return {
        ...group,
        id: String(group?.id || getId('group', index)),
        name,
        expanded: group?.expanded !== false,
        items,
    };
}

export function normalizeNode(node, index, prefix = 'node') {
    if (!isObject(node)) return null;

    const item = node.item || (node.url ? node : null);
    const normalizedItem = item ? normalizeItem(item, index, prefix) : null;
    const children = normalizeNodes(node.children, `${prefix}-${index}`);
    const type = node.type || (children.length || typeof node.loadChildren === 'function' ? 'folder' : 'media');
    const expanded = typeof node.expanded === 'boolean' ? node.expanded : type !== 'folder' && type !== 'group';

    return {
        ...node,
        id: String(node.id || normalizedItem?.id || normalizedItem?.url || getId(prefix, index)),
        name: String(node.name || node.title || normalizedItem?.title || normalizedItem?.name || normalizedItem?.url || `Node ${index + 1}`),
        type,
        item: normalizedItem,
        expanded,
        children,
    };
}

export function normalizeNodes(nodes = [], prefix) {
    return Array.isArray(nodes) ? nodes.map((node, index) => normalizeNode(node, index, prefix)).filter(Boolean) : [];
}

export function collectNodeItems(nodes, output = []) {
    nodes.forEach((node) => {
        if (node.type !== 'folder' && node.type !== 'group' && (node.item?.url || node.url)) {
            output.push(node.item || normalizeItem(node, output.length, 'tree'));
        }
        if (node.children?.length) collectNodeItems(node.children, output);
    });
    return output;
}

export function uniqueItems(items) {
    const cache = new Set();
    return items.filter((item) => {
        const key = item.id || item.url;
        if (cache.has(key)) return false;
        cache.add(key);
        return true;
    });
}

export function normalizePlaylist(input = {}) {
    const playlist = isObject(input) ? input : {};
    const groups = Array.isArray(playlist.groups) ? playlist.groups.map(normalizeGroup).filter(Boolean) : [];
    const roots = normalizeNodes(playlist.roots || playlist.tree?.roots, 'root');
    const groupItems = groups.flatMap((group) => group.items);
    const treeItems = collectNodeItems(roots);
    const fallbackItems = normalizeItems(playlist.items, 'playlist');
    const items = uniqueItems([...groupItems, ...treeItems, ...fallbackItems]);

    return {
        ...playlist,
        id: String(playlist.id || 'playlist'),
        title: String(playlist.title || playlist.name || 'Playlist'),
        groups,
        roots,
        items,
        _items: fallbackItems,
        favorites: normalizeItems(playlist.favorites, 'favorite'),
        history: normalizeItems(playlist.history, 'history'),
    };
}
