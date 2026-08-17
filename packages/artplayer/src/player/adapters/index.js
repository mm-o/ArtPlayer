import hlsAdapter from './hls.js';
import dashAdapter from './dash.js';

const adapters = {
    m3u8: hlsAdapter,
    hls: hlsAdapter,
    mpd: dashAdapter,
    dash: dashAdapter,
};

export function getAdapter(type) {
    return adapters[type];
}

export function destroyAdapter(art) {
    if (art.hls) {
        art.hls.destroy?.();
        delete art.hls;
    }

    if (art.dash) {
        art.dash.reset?.();
        art.dash.destroy?.();
        delete art.dash;
    }
}
