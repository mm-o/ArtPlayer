import Artplayer from '../packages/artplayer';

const option: Artplayer['Option'] = {
    container: '.artplayer-app',
    url: './assets/sample/video.mp4',
    actions: ['timestamp', 'loopSegment', 'mediaNotes'],
    playlist: true,
};

option.volume = 0.5;

const art = new Artplayer(option);

const media: Artplayer.Media = {
    title: 'Episode 1',
    url: './assets/sample/video.mp4',
    type: 'auto',
    qualities: [{ html: 'HD', url: './assets/sample/video.mp4', default: true }],
    subtitles: [{ name: '中文', url: './assets/sample/subtitle.vtt', default: true }],
    playlist: {
        title: 'Playlist',
        groups: [{ name: 'Group', items: [{ title: 'Episode 1', url: './assets/sample/video.mp4' }] }],
        roots: [{ name: 'Folder', type: 'folder', children: [{ item: { title: 'Episode 2', url: './assets/sample/video.mp4' } }] }],
        favorites: [{ title: 'Favorite', url: './assets/sample/video.mp4' }],
        history: [{ title: 'History', url: './assets/sample/video.mp4' }],
    },
};

const dashMedia: Artplayer.Media = {
    url: './assets/sample/video.mpd',
    type: 'dash',
};

const normalized = Artplayer.normalizeMedia(media);
art.playMedia(normalized);
art.getCurrentMedia();
art.playMedia(dashMedia);
art.updateQuality(media.qualities);
art.setSubtitles(media.subtitles);
art.selectSubtitle(media.subtitles?.[0], media.subtitles);
art.setDanmaku([{ time: 1, text: 'hello' }]);
art.setAudioTracks([{ url: './assets/sample/audio.m4a', language: 'zh', default: true }]);
art.subtitle.clear();
art.captureTimestamp();
art.captureLoopSegment();
art.setLoopSegment(10, 20);
art.clearLoopSegment();
art.emitAction('mediaNotes');
art.getScreenshotBlob('png', 0.92);
art.screenshot('png');
art.setPlaylist(media.playlist, String(media.url));
art.renderPlaylist('favorites');
art.playlistToggle();
art.playlistAdd({ title: 'Episode 3', url: './assets/sample/video.mp4' }, 'Group');
art.playlistRemove('./assets/sample/video.mp4');
art.playlistPlay('./assets/sample/video.mp4');
art.playlistNext();
art.playlistPrev();
art.togglePlaylistFavorite('./assets/sample/video.mp4');
art.clearPlaylistHistory();
