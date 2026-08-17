import { getExt } from '../utils/file.js';
import { def } from '../utils/property.js';
import { sleep } from '../utils/time.js';
import { destroyAdapter, getAdapter } from './adapters/index.js';

function getTypeName(option, url) {
    return option.type && option.type !== 'auto' ? option.type : getExt(url);
}

export default function urlMix(art) {
    const {
        option,
        template: { $video },
    } = art;

    def(art, 'url', {
        get() {
            return $video.src;
        },
        async set(newUrl) {
            if (newUrl) {
                const oldUrl = art.url;
                const typeName = getTypeName(option, newUrl);
                const typeCallback = option.customType[typeName] || getAdapter(typeName);

                destroyAdapter(art);
                if (typeName && typeCallback) {
                    await sleep();
                    art.loading.show = true;
                    typeCallback.call(art, $video, newUrl, art);
                } else {
                    URL.revokeObjectURL(oldUrl);
                    $video.src = newUrl;
                }

                if (oldUrl !== art.url || typeCallback) {
                    art.option.url = newUrl;
                    if (art.isReady && oldUrl) {
                        art.once('video:canplay', () => {
                            art.emit('restart', newUrl);
                        });
                    }
                }
            } else {
                destroyAdapter(art);
                await sleep();
                art.loading.show = true;
            }
        },
    });

    art.once('destroy', () => destroyAdapter(art));
}
