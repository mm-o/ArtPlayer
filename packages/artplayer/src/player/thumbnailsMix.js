import { def, setStyle, isMobile, loadImg } from '../utils';

function findThumbnailIndex(map, time) {
    if (!Array.isArray(map) || !map.length) return -1;
    let left = 0;
    let right = map.length - 1;
    while (left <= right) {
        const mid = (left + right) >> 1;
        if (Number(map[mid]) <= time) {
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    return Math.max(0, Math.min(map.length - 1, right));
}

export default function thumbnailsMix(art) {
    const {
        events,
        option,
        template: { $progress, $video },
    } = art;

    let timer = null;
    let image = null;
    let loading = false;
    let isLoad = false;
    let isHover = false;

    function reset() {
        clearTimeout(timer);
        timer = null;
        image = null;
        loading = false;
        isLoad = false;
        setStyle(art.controls?.thumbnails, 'display', 'none');
    }

    function showThumbnails(posWidth) {
        const $thumbnails = art.controls?.thumbnails;
        if (!$thumbnails) return;

        const { number, column, width, height, scale, map } = option.thumbnails;
        const width2 = width * scale || image.naturalWidth / column;
        const height2 = height * scale || width2 / ($video.videoWidth / $video.videoHeight);
        const perIndex = Array.isArray(map) && map.length
            ? findThumbnailIndex(map, ($video.duration || 0) * (posWidth / $progress.clientWidth))
            : Math.floor(posWidth / ($progress.clientWidth / number));
        const yIndex = Math.ceil(perIndex / column) - 1;
        const xIndex = perIndex % column || column - 1;
        setStyle($thumbnails, 'backgroundImage', `url(${image.src})`);
        setStyle($thumbnails, 'height', `${height2}px`);
        setStyle($thumbnails, 'width', `${width2}px`);
        setStyle($thumbnails, 'backgroundPosition', `-${xIndex * width2}px -${yIndex * height2}px`);
        if (posWidth <= width2 / 2) {
            setStyle($thumbnails, 'left', 0);
        } else if (posWidth > $progress.clientWidth - width2 / 2) {
            setStyle($thumbnails, 'left', `${$progress.clientWidth - width2}px`);
        } else {
            setStyle($thumbnails, 'left', `${posWidth - width2 / 2}px`);
        }
    }

    events.hover(
        $progress,
        () => {
            isHover = true;
        },
        () => {
            isHover = false;
        },
    );

    art.on('setBar', async (type, percentage, event) => {
        const $thumbnails = art.controls?.thumbnails;
        const { url, scale } = option.thumbnails;
        if (!$thumbnails || !url) return;

        const isMobileDroging = type === 'played' && event && isMobile;

        if (type === 'hover' || isMobileDroging) {
            if (!loading) {
                loading = true;
                image = await loadImg(url, scale);
                isLoad = true;
            }

            if (!isLoad || !isHover) return;

            const width = $progress.clientWidth * percentage;
            setStyle($thumbnails, 'display', 'flex');

            if (width > 0 && width < $progress.clientWidth) {
                showThumbnails(width);
            } else {
                if (!isMobile) {
                    setStyle($thumbnails, 'display', 'none');
                }
            }

            if (isMobileDroging) {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    setStyle($thumbnails, 'display', 'none');
                }, 500);
            }
        }
    });

    def(art, 'thumbnails', {
        get() {
            return art.option.thumbnails;
        },
        set(thumbnails) {
            if (!thumbnails?.url || art.option.isLive) {
                art.option.thumbnails = {
                    url: '',
                    number: 0,
                    column: 1,
                    width: 0,
                    height: 0,
                    scale: 1,
                };
                reset();
                return;
            }
            art.option.thumbnails = thumbnails;
            reset();
        },
    });
}
