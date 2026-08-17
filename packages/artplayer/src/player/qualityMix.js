import { def } from '../utils/property.js';

export default function qualityMix(art) {
    let qualities = [];

    function removeQuality() {
        try {
            art.controls.remove('quality');
        } catch {}

        try {
            art.setting.remove('quality');
        } catch {}
    }

    function updateQuality(quality = []) {
        const { controls, notice, i18n } = art;
        qualities = Array.isArray(quality) ? quality : [];

        if (!qualities.length) {
            removeQuality();
            return qualities;
        }

        const qualityDefault = qualities.find((item) => item.default) || qualities[0];
        controls.update({
            name: 'quality',
            position: 'right',
            index: 10,
            style: {
                marginRight: '10px',
            },
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
