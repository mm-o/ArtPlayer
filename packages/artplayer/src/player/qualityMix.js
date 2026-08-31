import { def } from '../utils/property.js';

export default function qualityMix(art) {
    let qualities = [];

    function removeQuality() {
        art.controls.removePinned('quality');
        if (art.setting.find('quality')) art.setting.remove('quality');
    }

    function updateQuality(quality = []) {
        const { controls, notice, i18n } = art;
        qualities = Array.isArray(quality) ? quality : [];

        if (!qualities.length) {
            removeQuality();
            return qualities;
        }

        const qualityDefault = qualities.find((item) => item.default) || qualities[0];
        controls.addPinned('quality', 'Quality', {
            name: 'quality',
            position: 'right',
            index: 10,
            html: qualityDefault?.html || '',
            selector: qualities,
            async onSelect(item) {
                await art.switchQuality(item.url);
                notice.show = `${i18n.get('Switch Video')}: ${item.html}`;
                return item.html;
            },
        });

        return qualities;
    }

    def(art, 'qualities', {
        get() {
            return qualities;
        },
    });

    def(art, 'updateQuality', {
        value: updateQuality,
    });

    def(art, 'quality', {
        get() {
            return qualities;
        },
        set(quality) {
            updateQuality(quality);
        },
    });
}
