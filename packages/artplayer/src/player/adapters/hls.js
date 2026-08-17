function getHls() {
    const scope = typeof window !== 'undefined' ? window : globalThis;
    return scope.Hls;
}

function recover(hls, Hls, data) {
    if (!data?.fatal) return;

    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        hls.startLoad();
    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls.recoverMediaError();
    } else {
        hls.destroy();
    }
}

function unsupported(art, type) {
    art.notice.show = `Unsupported playback format: ${type}`;
}

export default function hlsAdapter(video, url, art) {
    const Hls = getHls();

    if (Hls?.isSupported?.()) {
        const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 30,
            maxBufferLength: 30,
            maxMaxBufferLength: 60,
            manifestLoadingMaxRetry: 6,
            levelLoadingMaxRetry: 6,
            fragLoadingMaxRetry: 6,
            manifestLoadingRetryDelay: 1000,
            levelLoadingRetryDelay: 1000,
            fragLoadingRetryDelay: 1000,
        });

        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_, data) => recover(hls, Hls, data));
        art.hls = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
    } else {
        unsupported(art, 'm3u8');
    }
}
