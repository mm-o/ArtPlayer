import { append } from '../utils';

const icons = {
    playlist:
        '<svg xmlns="http://www.w3.org/2000/svg" height="22" width="22" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2.15;stroke-linecap:round;stroke-linejoin:round"><path d="M8 6h13"></path><path d="M8 12h13"></path><path d="M8 18h13"></path><path d="M3 6h.01"></path><path d="M3 12h.01"></path><path d="M3 18h.01"></path></svg>',
    playlistPrev:
        '<svg xmlns="http://www.w3.org/2000/svg" height="22" width="22" viewBox="0 0 22 22"><path d="M5 4a1 1 0 0 1 2 0v14a1 1 0 1 1-2 0V4zM17.84 5.52a1.7 1.7 0 0 0-2.55-1.47L7.81 8.53a1.7 1.7 0 0 0 0 2.94l7.48 4.48a1.7 1.7 0 0 0 2.55-1.47V5.52z"></path></svg>',
    playlistNext:
        '<svg xmlns="http://www.w3.org/2000/svg" height="22" width="22" viewBox="0 0 22 22"><path d="M15 4a1 1 0 1 1 2 0v14a1 1 0 1 1-2 0V4zM4.16 5.52a1.7 1.7 0 0 1 2.55-1.47l7.48 4.48a1.7 1.7 0 0 1 0 2.94l-7.48 4.48a1.7 1.7 0 0 1-2.55-1.47V5.52z"></path></svg>',
};

const tooltips = {
    playlist: 'Playlist',
    playlistPrev: 'Previous',
    playlistNext: 'Next',
};

export default function playlist(option) {
    return (art) => ({
        ...option,
        tooltip: art.i18n.get(tooltips[option.name] || 'Playlist'),
        mounted: ($control) => {
            append($control, icons[option.name] || icons.playlist);
        },
        click: () => {
            switch (option.name) {
                case 'playlistPrev':
                    art.playlistPrev();
                    break;
                case 'playlistNext':
                    art.playlistNext();
                    break;
                default:
                    art.playlistToggle();
                    break;
            }
        },
    });
}
