export default function playbackRate(art) {
    const {
        i18n,
        icons,
        option,
        constructor: { SETTING_ITEM_WIDTH, PLAYBACK_RATE },
    } = art;
    const playbackRates = option.playbackRates.length ? option.playbackRates : PLAYBACK_RATE;

    function getI18n(value) {
        return value === 1.0 ? i18n.get('Normal') : value.toFixed(1);
    }

    function update() {
        const target = art.setting.find(`playback-rate-${art.playbackRate}`);
        art.setting.check(target);
    }

    return {
        width: SETTING_ITEM_WIDTH,
        name: 'playback-rate',
        html: i18n.get('Play Speed'),
        tooltip: getI18n(art.playbackRate),
        icon: icons.playbackRate,
        selector: playbackRates.map((item) => {
            return {
                value: item,
                name: `playback-rate-${item}`,
                default: item === art.playbackRate,
                html: getI18n(item),
            };
        }),
        onSelect(item) {
            art.playbackRate = item.value;
            return item.html;
        },
        mounted: () => {
            update();
            art.on('video:ratechange', () => update());
        },
    };
}
