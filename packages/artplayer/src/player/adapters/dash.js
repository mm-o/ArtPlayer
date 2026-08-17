function getDash() {
    const scope = typeof window !== 'undefined' ? window : globalThis;
    return scope.dashjs;
}

function unsupported(art, type) {
    art.notice.show = `Unsupported playback format: ${type}`;
}

export default function dashAdapter(video, url, art) {
    const dashjs = getDash();

    if (!dashjs?.supportsMediaSource?.()) {
        unsupported(art, 'mpd');
        return;
    }

    const dash = dashjs.MediaPlayer().create();
    dash.updateSettings({
        streaming: {
            retryAttempts: {
                MPD: 3,
                MediaSegment: 3,
                InitializationSegment: 3,
            },
            retryIntervals: {
                MPD: 500,
                MediaSegment: 1000,
                InitializationSegment: 1000,
            },
        },
    });
    dash.initialize(video, url, false);
    dash.on('error', () => {
        if (video.error) dash.reset?.();
    });
    art.dash = dash;
}
