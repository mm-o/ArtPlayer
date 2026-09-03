import { CustomType, Thumbnails } from './option';
import { quality } from './quality';
import { Subtitle } from './subtitle';

export type ArtplayerMediaSource = {
    id?: string;
    url: string | File | Blob | Record<string, any>;
    type?: CustomType | 'auto' | 'video' | 'audio' | string;
    label?: string;
    default?: boolean;
    isLive?: boolean;
    codecs?: string;
    mimeType?: string;
    headers?: Record<string, string>;
    meta?: Record<string, any>;
    [key: string]: any;
};

export type ArtplayerMediaSubtitleTrack = Subtitle & {
    id?: string;
    lang?: string;
    title?: string;
    default?: boolean;
    sourceUrl?: string;
    [key: string]: any;
};

export type ArtplayerMediaDanmakuItem = {
    time?: number;
    text: string;
    mode?: number;
    color?: string;
    fontSize?: number;
    [key: string]: any;
};

export type ArtplayerMediaDanmakuTrack = {
    id?: string;
    name?: string;
    url?: string;
    file?: File;
    data?: string;
    type?: string;
    source?: string;
    items?: ArtplayerMediaDanmakuItem[];
    default?: boolean;
    [key: string]: any;
};

export type ArtplayerDanmakuSource = {
    name: string;
    select?: boolean;
    load?: (art: any) => Promise<ArtplayerMediaDanmakuTrack[]> | ArtplayerMediaDanmakuTrack[];
    browse?: {
        roots: (art: any) => Promise<any[]> | any[];
        children: (item: any, art: any) => Promise<any[]> | any[];
        select: (items: any[], art: any) => Promise<ArtplayerMediaDanmakuTrack[]> | ArtplayerMediaDanmakuTrack[];
    };
};

export type ArtplayerMediaChapter = {
    time: number;
    text?: string;
    title?: string;
    [key: string]: any;
};

export type ArtplayerMediaAudioTrack = {
    url: string;
    language?: string;
    label?: string;
    default?: boolean;
    isAI?: boolean;
    [key: string]: any;
};

export type ArtplayerPlaylistNode = {
    id?: string;
    name?: string;
    title?: string;
    type?: 'folder' | 'media' | 'group' | string;
    item?: ArtplayerMedia;
    children?: ArtplayerPlaylistNode[];
    expanded?: boolean;
    loadChildren?: (node: ArtplayerPlaylistNode, playlist: ArtplayerPlaylist, art: any) => Promise<ArtplayerPlaylistNode[]>;
    [key: string]: any;
};

export type ArtplayerPlaylist = {
    id?: string;
    title?: string;
    name?: string;
    items?: ArtplayerMedia[];
    groups?: Array<{
        id?: string;
        name?: string;
        expanded?: boolean;
        items: ArtplayerMedia[];
        [key: string]: any;
    }>;
    roots?: ArtplayerPlaylistNode[];
    tree?: {
        roots?: ArtplayerPlaylistNode[];
        [key: string]: any;
    };
    favorites?: ArtplayerMedia[];
    history?: ArtplayerMedia[];
    onPlayItem?: (item: ArtplayerMedia, index: number, playlist: ArtplayerPlaylist) => unknown;
    onToggleFavorite?: (item: ArtplayerMedia, favorite: boolean, playlist: ArtplayerPlaylist) => unknown;
    onSaveProgress?: (item: ArtplayerMedia, currentTime: number, duration: number, playlist: ArtplayerPlaylist) => unknown;
    onClearHistory?: (playlist: ArtplayerPlaylist) => unknown;
    [key: string]: any;
};

export type ArtplayerMedia = {
    id?: string;
    title?: string;
    name?: string;
    url: string | File | Blob | Record<string, any>;
    type?: CustomType | 'auto' | 'video' | 'audio' | string;
    poster?: string;
    thumbnail?: string;
    cover?: string;
    isLive?: boolean;
    startTime?: number;
    endTime?: number;
    currentTime?: number;
    sources?: ArtplayerMediaSource[];
    qualities?: quality[];
    quality?: quality[];
    qualityLoader?: () => Promise<quality[]>;
    subtitles?: ArtplayerMediaSubtitleTrack[];
    danmaku?: ArtplayerMediaDanmakuItem[];
    danmakuTracks?: ArtplayerMediaDanmakuTrack[];
    chapters?: ArtplayerMediaChapter[] | string | null;
    thumbnails?: Thumbnails | string;
    annotations?: object | string;
    watermarks?: object | string;
    audioTracks?: ArtplayerMediaAudioTrack[];
    playlist?: ArtplayerPlaylist;
    meta?: Record<string, any>;
    [key: string]: any;
};
