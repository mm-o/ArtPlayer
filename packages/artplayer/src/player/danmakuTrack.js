const toArray = (value) => (Array.isArray(value) ? value : []);
const cache = new WeakMap();
const mode = (value) => ({ 4: 2, 5: 1 }[Number(value)] ?? 0);
const color = (value) => {
    if (typeof value === 'string' && value.startsWith('#')) return value;
    return `#${Number(value ?? 0xffffff).toString(16).padStart(6, '0').slice(-6)}`;
};

export function normalizeDanmaku(item = {}) {
    const text = String(item.text ?? item.content ?? '').trim();
    if (!text) return null;
    const rawTime = Number(item.time ?? item.timeMs ?? item.progress ?? 0) || 0;
    const result = {
        text,
        time: item.time === undefined && (item.timeMs !== undefined || item.progress !== undefined) ? rawTime / 1000 : rawTime,
        mode: [0, 1, 2].includes(Number(item.mode)) ? Number(item.mode) : mode(item.mode),
        color: color(item.color),
    };
    const fontSize = Number(item.fontSize ?? item.fontsize ?? item.size);
    if (fontSize > 0) result.fontSize = fontSize;
    return result;
}

const parseXml = (text) => [...String(text).matchAll(/<d\s+[^>]*p="([^"]+)"[^>]*>([\s\S]*?)<\/d>/g)].flatMap((match) => {
    const attr = match[1].split(',');
    const content = match[2].trim()
        .replaceAll('&quot;', '"').replaceAll('&apos;', "'")
        .replaceAll('&lt;', '<').replaceAll('&gt;', '>').replaceAll('&amp;', '&');
    const item = normalizeDanmaku({ content, time: attr[0], mode: mode(attr[1]), fontSize: attr[2], color: attr[3] });
    return item ? [item] : [];
});

const assTime = (value) => {
    const [hours, minutes, seconds] = String(value).split(':').map(Number);
    return (hours || 0) * 3600 + (minutes || 0) * 60 + (seconds || 0);
};
const parseAss = (text) => String(text).split(/\r?\n/).flatMap((line) => {
    if (!line.startsWith('Dialogue:')) return [];
    const fields = line.split(',');
    const item = normalizeDanmaku({
        text: fields.slice(9).join(',').replace(/\{[^}]*\}|\\N/g, ' ').trim(),
        time: assTime(fields[1]),
        mode: 0,
    });
    return item ? [item] : [];
});
const parseJson = (text) => {
    try {
        const data = JSON.parse(text);
        const items = Array.isArray(data) ? data : data?.danmaku || data?.items || data?.data || [];
        return toArray(items).map(normalizeDanmaku).filter(Boolean);
    } catch {
        return [];
    }
};

export function parseDanmaku(text, type = '') {
    const body = String(text || '').replace(/^\uFEFF/, '');
    const format = String(type || '').toLowerCase();
    if (format === 'ass' || format === 'ssa' || (!format && body.startsWith('[Script Info]'))) return parseAss(body);
    if (format === 'json' || (!format && ['[', '{'].includes(body.trimStart()[0]))) return parseJson(body);
    return parseXml(body);
}

export function loadDanmakuSource(source, fetcher = fetch) {
    if (!source || typeof source !== 'object') return Promise.resolve([]);
    if (cache.has(source)) return cache.get(source);
    const task = (async () => {
        if (Array.isArray(source.items)) return source.items;
        const text = source.file ? await source.file.text() : source.data ?? await (await fetcher(source.url)).text();
        const type = source.type || source.file?.name?.split('.').pop() || String(source.url || '').split(/[?#]/)[0].split('.').pop();
        return parseDanmaku(text, type);
    })();
    cache.set(source, task);
    task.catch(() => cache.delete(source));
    return task;
}

export function sameDanmakuSource(a, b) {
    if (a === b) return true;
    const keys = (source) => [source?.id, source?.sourceUrl, source?.url].filter(Boolean);
    const right = new Set(keys(b));
    return keys(a).some((value) => right.has(value));
}

export function uniqueDanmakuSources(sources = []) {
    return toArray(sources)
        .filter((source) => source && (source.items || source.data || source.url || source.file))
        .filter((source, index, list) => list.findIndex((item) => sameDanmakuSource(item, source)) === index);
}

export function pickDanmakuSources(sources = [], option = {}) {
    const selected = uniqueDanmakuSources(toArray(option.activeSources).map((source) =>
        typeof source === 'string'
            ? sources.find((item) => [item.id, item.url, item.name].includes(source))
            : source,
    ));
    return selected.length ? selected : sources.filter((source) => source.default);
}

export function mergeDanmakuSources(sources = []) {
    return sources.flatMap((source) => Array.isArray(source) ? source : toArray(source.items)).sort((a, b) => a.time - b.time);
}
