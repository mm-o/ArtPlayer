import { def } from '../utils/property.js';

export default function screenshotMix(art) {
    const {
        notice,
        template: { $video },
    } = art;

    const $canvas = document.createElement('canvas');

    function drawVideo() {
        $canvas.width = $video.videoWidth;
        $canvas.height = $video.videoHeight;
        $canvas.getContext('2d').drawImage($video, 0, 0);
    }

    function getMimeType(format) {
        return `image/${format === 'jpeg' || format === 'webp' ? format : 'png'}`;
    }

    def(art, 'getDataURL', {
        value: () =>
            new Promise((resolve, reject) => {
                try {
                    drawVideo();
                    resolve($canvas.toDataURL('image/png'));
                } catch (err) {
                    notice.show = err;
                    reject(err);
                }
            }),
    });

    def(art, 'getBlobUrl', {
        value: () =>
            new Promise((resolve, reject) => {
                try {
                    drawVideo();
                    $canvas.toBlob((blob) => {
                        resolve(URL.createObjectURL(blob));
                    });
                } catch (err) {
                    notice.show = err;
                    reject(err);
                }
            }),
    });

    def(art, 'getScreenshotBlob', {
        value: (format = 'png', quality = 0.92) =>
            new Promise((resolve, reject) => {
                try {
                    drawVideo();
                    $canvas.toBlob(resolve, getMimeType(format), quality);
                } catch (err) {
                    notice.show = err;
                    reject(err);
                }
            }),
    });

    def(art, 'screenshot', {
        value: async (format = 'png', quality = 0.92) => {
            const blob = await art.getScreenshotBlob(format, quality);
            const clipboard = typeof navigator !== 'undefined' ? navigator.clipboard : null;

            if (!blob || !clipboard?.write || typeof ClipboardItem === 'undefined') {
                const error = new Error('Clipboard is not supported');
                notice.show = error;
                throw error;
            }

            await clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
            notice.show = 'Screenshot copied';
            art.emit('screenshot', blob);
            art.emitAction?.('screenshot', { blob });

            return blob;
        },
    });
}
