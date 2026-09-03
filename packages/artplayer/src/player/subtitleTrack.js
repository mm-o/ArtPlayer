const toArray = (value) => (Array.isArray(value) ? value : []);

export function sameSubtitle(a, b) {
    if (a === b) return true;
    const identities = (track) => [track?.id, track?.sourceUrl, track?.url].filter(Boolean);
    const right = new Set(identities(b));
    return identities(a).some((value) => right.has(value));
}

export function uniqueSubtitleTracks(tracks = []) {
    return toArray(tracks)
        .filter((track) => track?.url)
        .filter((track, index, list) => list.findIndex((item) => sameSubtitle(item, track)) === index);
}

export function pickSubtitleTracks(tracks = [], option = {}) {
    const active = uniqueSubtitleTracks(
        toArray(option.activeTracks).map((item) =>
            typeof item === 'string'
                ? tracks.find((track) => [track.id, track.url, track.lang, track.name].includes(item))
                : item,
        ),
    );
    if (active.length) return active;
    const matched = option.defaultLang
        ? tracks.filter((track) => track.lang === option.defaultLang || track.name === option.defaultLang)
        : [];
    return matched.length ? matched : [tracks.find((track) => track.default) || tracks[0]].filter(Boolean);
}
