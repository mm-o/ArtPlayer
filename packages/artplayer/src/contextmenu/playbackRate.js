import { inverseClass, query, queryAll } from '../utils';

export default function playbackRate(option) {
    return (art) => {
        const {
            i18n,
            option: { playbackRates },
            constructor: { PLAYBACK_RATE },
        } = art;
        const rates = playbackRates.length ? playbackRates : PLAYBACK_RATE;

        const html = rates
            .map((item) => {
                const text = item === 1 ? i18n.get('Normal') : String(Number(item.toFixed(2)));
                return `<span data-value="${item}">${text}</span>`;
            })
            .join('');

        return {
            ...option,
            html: `${i18n.get('Play Speed')}: ${html}`,
            click: (contextmenu, event) => {
                const { value } = event.target.dataset;
                if (value) {
                    art.playbackRate = Number(value);
                    contextmenu.show = false;
                }
            },
            mounted: ($panel) => {
                const $default = query('[data-value="1"]', $panel);
                if ($default) inverseClass($default, 'art-current');
                art.on('video:ratechange', () => {
                    const $current = queryAll('span', $panel).find(
                        (item) => Number(item.dataset.value) === art.playbackRate,
                    );
                    if ($current) {
                        inverseClass($current, 'art-current');
                    }
                });
            },
        };
    };
}
