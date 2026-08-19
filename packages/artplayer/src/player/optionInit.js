import { setStyle } from '../utils';

export default function attrInit(art) {
    const {
        option,
        storage,
        template: { $video, $poster },
    } = art;

    for (const key in option.moreVideoAttr) {
        art.attr(key, option.moreVideoAttr[key]);
    }

    if (option.muted) {
        art.muted = option.muted;
    }

    if (option.volume) {
        art.volume = option.volume;
    }

    const volumeStorage = storage.get('volume');
    if (typeof volumeStorage === 'number') {
        art.volume = volumeStorage;
    }

    if (option.defaultPlaybackRate) {
        art.playbackRate = option.defaultPlaybackRate;
    }

    if (option.poster) {
        setStyle($poster, 'backgroundImage', `url(${option.poster})`);
    }

    if (option.autoplay) {
        $video.autoplay = option.autoplay;
    }

    if (option.playsInline) {
        $video.playsInline = true;
        $video['webkit-playsinline'] = true;
    }

    if (option.theme) {
        option.cssVar['--art-theme'] = option.theme;
    }

    for (const key in option.cssVar) {
        art.cssVar(key, option.cssVar[key]);
    }

    art.url = option.url;
}
