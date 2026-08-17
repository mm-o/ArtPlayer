function isObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeType(type) {
    return type || 'auto';
}

function normalizeSource(source, fallback = {}) {
    if (typeof source === 'string') {
        return {
            url: source,
            type: normalizeType(fallback.type),
        };
    }

    if (!isObject(source)) return null;

    return {
        ...source,
        url: source.url,
        type: normalizeType(source.type || fallback.type),
    };
}

function normalizeList(value, mapItem) {
    return Array.isArray(value) ? value.map(mapItem).filter(Boolean) : [];
}

function pickDefault(list) {
    return list.find((item) => item.default) || list[0] || null;
}

export function normalizeMedia(input = {}) {
    const media = typeof input === 'string' ? { url: input } : { ...input };
    const sources = normalizeList(media.sources, (source) => normalizeSource(source, media));
    const qualities = normalizeList(media.qualities || media.quality, (quality) => (isObject(quality) ? { ...quality } : null));

    if (!sources.length && media.url) {
        sources.push({
            url: media.url,
            type: normalizeType(media.type),
            default: true,
        });
    }

    if (!media.url && qualities.length) {
        const quality = pickDefault(qualities);
        if (quality?.url) {
            media.url = quality.url;
            media.type = media.type || quality.type;
        }
    }

    const source = pickDefault(sources);
    if (source?.url) {
        media.url = source.url;
        media.type = media.type || source.type;
    }

    media.type = normalizeType(media.type || source?.type);
    media.sources = sources.map((item) => ({
        ...item,
        default: item === source || !!item.default,
    }));

    if (qualities.length) media.qualities = qualities;
    if (!media.title && media.name) media.title = media.name;
    if (!media.poster && (media.thumbnail || media.cover)) media.poster = media.thumbnail || media.cover;

    return media;
}
