import { CssVar } from './cssVar';
import { CustomType, Thumbnails } from './option';
import { quality } from './quality';
import {
    ArtplayerMedia,
    ArtplayerMediaAudioTrack,
    ArtplayerMediaDanmakuItem,
    ArtplayerMediaSubtitleTrack,
    ArtplayerPlaylist,
} from './media';

export type AspectRatio = 'default' | '4:3' | '16:9' | (`${number}:${number}` & Record<never, never>);
export type PlaybackRate = 0.5 | 0.75 | 1.0 | 1.25 | 1.5 | 1.75 | 2.0 | (number & Record<never, never>);
export type Flip = 'normal' | 'horizontal' | 'vertical' | (string & Record<never, never>);
export type State = 'standard' | 'mini' | 'pip' | 'fullscreen' | 'fullscreenWeb';
export type ActionType = 'timestamp' | 'loopSegment' | 'screenshot' | 'mediaNotes' | (string & Record<never, never>);
export type LoopSegment = { start: number; end: number };
export type ActionDetail = {
    type: ActionType;
    currentTime: number;
    duration: number;
    media: ArtplayerMedia | null;
    loopSegment: LoopSegment | null;
    [key: string]: any;
};

export declare class Player {
    get aspectRatio(): AspectRatio;
    set aspectRatio(ratio: AspectRatio);
    get state(): State;
    set state(state: State);
    get type(): CustomType;
    set type(name: CustomType);
    get playbackRate(): PlaybackRate;
    set playbackRate(rate: PlaybackRate);
    get currentTime(): number;
    set currentTime(time: number);
    get duration(): number;
    get played(): number;
    get playing(): boolean;
    get flip(): Flip;
    set flip(state: Flip);
    get fullscreen(): boolean;
    set fullscreen(state: boolean);
    set fullscreenToggle(state: boolean);
    get fullscreenWeb(): boolean;
    set fullscreenWeb(state: boolean);
    set fullscreenWebToggle(state: boolean);
    get loaded(): number;
    get loadedTime(): number;
    get mini(): boolean;
    set mini(state: boolean);
    get pip(): boolean;
    set pip(state: boolean);
    get poster(): string;
    set poster(url: string);
    get rect(): DOMRect;
    get bottom(): number;
    get height(): number;
    get left(): number;
    get right(): number;
    get top(): number;
    get width(): number;
    get x(): number;
    get y(): number;
    set seek(time: number);
    set forward(time: number);
    set backward(time: number);
    get url(): string;
    set url(url: string);
    get volume(): number;
    set volume(percentage: number);
    get muted(): boolean;
    set muted(state: boolean);
    get title(): string;
    set title(title: string);
    get theme(): string;
    set theme(theme: string);
    get subtitleOffset(): number;
    set subtitleOffset(time: number);
    set switch(url: string);
    get quality(): quality[];
    set quality(quality: quality[]);
    readonly qualities: quality[];
    get thumbnails(): Thumbnails;
    set thumbnails(thumbnails: Thumbnails);
    readonly currentMedia: ArtplayerMedia | null;
    readonly subtitleTracks: ArtplayerMediaSubtitleTrack[];
    readonly danmaku: ArtplayerMediaDanmakuItem[] | Record<string, any>;
    readonly audioTracks: ArtplayerMediaAudioTrack[];
    readonly loopSegment: LoopSegment | null;
    readonly playlist: ArtplayerPlaylist & { items: ArtplayerMedia[] };
    readonly playlistIndex: number;
    readonly currentPlaylistItem: ArtplayerMedia | null;
    get playlistShow(): boolean;
    set playlistShow(value: boolean);
    getCurrentMedia(): ArtplayerMedia | null;
    playMedia(media: ArtplayerMedia | string): Promise<ArtplayerMedia>;
    updateQuality(quality?: quality[]): quality[];
    setSubtitles(tracks?: ArtplayerMediaSubtitleTrack[]): Promise<ArtplayerMediaSubtitleTrack | null>;
    selectSubtitle(
        track?: ArtplayerMediaSubtitleTrack | null,
        tracks?: ArtplayerMediaSubtitleTrack[],
    ): Promise<ArtplayerMediaSubtitleTrack | null>;
    setDanmaku(danmaku?: ArtplayerMediaDanmakuItem[] | Record<string, any>): ArtplayerMediaDanmakuItem[] | Record<string, any>;
    setAudioTracks(tracks?: ArtplayerMediaAudioTrack[]): ArtplayerMediaAudioTrack[];
    emitAction(type: ActionType, detail?: Record<string, any>): ActionDetail;
    captureTimestamp(detail?: Record<string, any>): ActionDetail;
    captureLoopSegment(): ActionDetail | { start: number; end: null };
    setLoopSegment(start: number, end: number): boolean;
    clearLoopSegment(): null;
    setPlaylist(playlist?: ArtplayerPlaylist, currentUrl?: string): ArtplayerPlaylist & { items: ArtplayerMedia[] };
    renderPlaylist(page?: 'playlist' | 'favorites' | 'history'): void;
    playlistToggle(): boolean;
    playlistPlay(id?: string): Promise<ArtplayerMedia | null>;
    playlistNext(): Promise<ArtplayerMedia | null>;
    playlistPrev(): Promise<ArtplayerMedia | null>;
    playlistAdd(item: ArtplayerMedia, groupId?: string): ArtplayerMedia | null;
    playlistRemove(id: string): ArtplayerMedia | null;
    togglePlaylistFavorite(id: string): Promise<boolean>;
    clearPlaylistHistory(): Promise<ArtplayerMedia[]>;
    pause(): void;
    play(): Promise<void>;
    toggle(): void;
    attr(key: string, value?: any): unknown;
    cssVar<T extends keyof CssVar>(key: T, value?: CssVar[T]): CssVar[T];
    switchUrl(url: string): Promise<void>;
    switchQuality(url: string): Promise<void>;
    getDataURL(): Promise<string>;
    getBlobUrl(): Promise<string>;
    getScreenshotBlob(format?: 'png' | 'jpeg' | 'webp' | string, quality?: number): Promise<Blob | null>;
    screenshot(format?: 'png' | 'jpeg' | 'webp' | string, quality?: number): Promise<Blob>;
    airplay(): void;
    autoSize(): void;
    autoHeight(): void;
}
