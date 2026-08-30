export type Subtitle = {
    /**
     * The subtitle url
     */
    url?: string;

    /**
     * The subtitle name
     */
    name?: string;

    /** Initially active subtitle tracks. */
    activeTracks?: Array<string | Subtitle>;

    /** Preferred subtitle language. */
    defaultLang?: string;

    /** Maximum number of simultaneous subtitle tracks. */
    maxTracks?: number;

    /** Runtime subtitle display configuration. */
    config?: Record<string, any>;

    /**
     * The subtitle type
     */
    type?: 'vtt' | 'srt' | 'ass' | (string & Record<never, never>);

    /**
     * The subtitle style object
     */
    style?: Partial<CSSStyleDeclaration>;

    /**
     * The subtitle encoding, default utf-8
     */
    encoding?: string;

    /**
     * Whether use escape, default true
     */
    escape?: boolean;

    /**
     * Change the vtt text
     */
    onVttLoad?(vtt: string): string;

    /**
     * Load subtitle resource dynamically.
     */
    load?(
        option: Subtitle,
        art: any,
    ):
        | Promise<string | Blob | File | ArrayBuffer | { url?: string; type?: string } | string>
        | string
        | Blob
        | File
        | ArrayBuffer
        | { url?: string; type?: string };
};
