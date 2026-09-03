import { assToVtt, srtToVtt } from './subtitle.js';

const parseTime = (value) => {
    const parts = String(value).trim().replace(',', '.').split(':').map(Number);
    return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
};

const parseVtt = (text) => {
    const lines = String(text || '').replace(/^\uFEFF?WEBVTT[^\n]*(?:\n|$)/i, '').split(/\r?\n/);
    const timing = /^(\d{1,2}:\d{2}:\d{2}[.,]\d{3})\s+-->\s+(\d{1,2}:\d{2}:\d{2}[.,]\d{3})(?:\s+.*)?$/;
    return lines.flatMap((line, index) => {
        const match = line.match(timing);
        if (!match) return [];
        const body = [];
        for (let next = index + 1; next < lines.length && !timing.test(lines[next]); next += 1) {
            if (lines[next].trim() && !/^\d+$/.test(lines[next].trim())) body.push(lines[next]);
        }
        return body.length ? [{ startTime: parseTime(match[1]), endTime: parseTime(match[2]), text: body.join('\n') }] : [];
    });
};

const parseJson = (text) => {
    try {
        const data = JSON.parse(text);
        const body = Array.isArray(data) ? data : data?.body || data?.data?.body || [];
        return Array.isArray(body)
            ? body.map((item) => {
                const startTime = Number(item.from ?? item.start ?? item.startTime ?? item.time ?? 0) || 0;
                return {
                    startTime,
                    endTime: Number(item.to ?? item.end ?? item.endTime ?? 0) || startTime + 5,
                    text: String(item.content ?? item.text ?? item.body ?? '').trim(),
                };
            }).filter((cue) => cue.text)
            : [];
    } catch {
        return [];
    }
};

const parseLrc = (text) => String(text || '').split(/\r?\n/).flatMap((line) => {
    const body = line.replace(/\[[^\]]+\]/g, '').trim();
    if (!body) return [];
    return [...line.matchAll(/\[(\d{1,2}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g)].map((match) => ({
        startTime: Number(match[1]) * 60 + Number(match[2]) + Number(String(match[3] || '0').padEnd(3, '0').slice(0, 3)) / 1000,
        endTime: 0,
        text: body,
    }));
});

export function parseSubtitle(text, type = '') {
    const body = String(text || '').replace(/^\uFEFF/, '');
    const format = String(type || '').toLowerCase();
    if (format === 'json' || (!format && ['[', '{'].includes(body.trimStart()[0]))) return parseJson(body);
    if (format === 'lrc') {
        const cues = parseLrc(body).sort((a, b) => a.startTime - b.startTime);
        return cues.map((cue, index) => ({ ...cue, endTime: cues[index + 1]?.startTime || cue.startTime + 5 }));
    }
    const vtt = format === 'srt' ? srtToVtt(body) : ['ass', 'ssa'].includes(format) ? assToVtt(body) : body;
    return parseVtt(vtt);
}
