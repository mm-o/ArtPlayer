export default function adjust(art) {
    const { icons, i18n, constructor } = art;

    const getDuration = () => Math.max(0, Number(art.duration) || 0);
    const getTimestampOffset = () => Number(art.timestampOffset) || 0;
    const getLoopSegment = () => {
        const current = Math.max(0, Number(art.currentTime) || 0);
        const start = Number(art.loopSegment?.start);
        const end = Number(art.loopSegment?.end);

        return {
            start: Number.isFinite(start) ? start : current,
            end: Number.isFinite(end) ? end : Math.max(current + 10, current + 0.1),
        };
    };

    const loopState = getLoopSegment();

    const syncLoopSegment = () => {
        const start = Math.max(0, Math.min(loopState.start, loopState.end));
        const end = Math.max(start, Math.max(loopState.start, loopState.end));
        if (end <= start) return false;
        loopState.start = start;
        loopState.end = end;
        return art.setLoopSegment(start, end, false);
    };

    const timestampOffset = {
        width: constructor.SETTING_ITEM_WIDTH,
        name: 'timestamp-offset',
        html: i18n.get('Timestamp Offset'),
        icon: icons.subtitle,
        tooltip: `${getTimestampOffset()}s`,
        range: [getTimestampOffset(), -60, 60, 0.1],
        onChange(item) {
            art.timestampOffset = item.range[0];
            return `${item.range[0]}s`;
        },
        mounted: (_, item) => {
            art.on('timestampOffset', (value) => {
                item.$range.value = value;
                item.tooltip = `${value}s`;
            });
        },
    };

    const loopRange = (name, html, getValue, setValue) => ({
        width: constructor.SETTING_ITEM_WIDTH,
        name,
        html,
        icon: icons.config,
        tooltip: `${getValue()}s`,
        range: [getValue(), 0, Math.max(getDuration(), getValue() + 60), 0.1],
        onChange(item) {
            setValue(item.range[0]);
            syncLoopSegment();
            return `${item.range[0]}s`;
        },
        mounted: (_, item) => {
            const update = () => {
                const value = getValue();
                item.$range.min = 0;
                item.$range.max = Math.max(getDuration(), value + 60);
                item.$range.value = value;
                item.tooltip = `${value}s`;
            };

            art.on('loopSegment:change', update);
            art.on('video:loadedmetadata', update);
            art.on('video:durationchange', update);
            update();
        },
    });

    const timestampGroup = {
        name: 'timestamp',
        html: i18n.get('Timestamp'),
        tooltip: `${getTimestampOffset()}s`,
        icon: icons.config,
        selector: [
            timestampOffset,
            {
                name: 'timestamp-apply',
                html: i18n.get('Insert Timestamp'),
                tooltip: i18n.get('Generate current timestamp link'),
                icon: icons.check,
                onSelect() {
                    art.captureTimestamp();
                    return i18n.get('Insert Timestamp');
                },
            },
        ],
    };

    art.on('timestampOffset', (value) => {
        timestampGroup.tooltip = `${value}s`;
    });

    const loopGroup = {
        name: 'loop',
        html: i18n.get('Loop Segment'),
        tooltip: art.loopSegment ? `${art.loopSegment.start}s - ${art.loopSegment.end}s` : '0s - 0s',
        icon: icons.config,
        selector: [
            loopRange(
                'loop-start',
                i18n.get('Loop Start'),
                () => loopState.start,
                (value) => {
                    loopState.start = value;
                },
            ),
            loopRange(
                'loop-end',
                i18n.get('Loop End'),
                () => loopState.end,
                (value) => {
                    loopState.end = value;
                },
            ),
            {
                name: 'loop-apply',
                html: i18n.get('Apply Loop Segment'),
                tooltip: i18n.get('Save current loop segment'),
                icon: icons.check,
                onSelect() {
                    if (!syncLoopSegment()) return i18n.get('Apply Loop Segment');
                    const action = art.emitAction('loopSegment', { loopSegment: art.loopSegment });
                    art.notice.show = `${i18n.get('Loop Segment')}: ${action.loopSegment.start}s - ${action.loopSegment.end}s`;
                    return i18n.get('Apply Loop Segment');
                },
            },
            {
                name: 'loop-clear',
                html: i18n.get('Clear Loop Segment'),
                tooltip: i18n.get('Clear current loop segment'),
                icon: icons.close,
                onSelect() {
                    loopState.start = Math.max(0, Number(art.currentTime) || 0);
                    loopState.end = Math.max(loopState.start + 10, loopState.start + 0.1);
                    art.clearLoopSegment();
                    return i18n.get('Clear Loop Segment');
                },
            },
        ],
    };

    art.on('loopSegment:change', (segment) => {
        loopGroup.tooltip = segment ? `${segment.start}s - ${segment.end}s` : '0s - 0s';
    });

    return {
        width: constructor.SETTING_ITEM_WIDTH,
        name: 'adjust',
        html: i18n.get('Adjust'),
        tooltip: i18n.get('Timestamp Offset'),
        icon: icons.config,
        selector: [timestampGroup, loopGroup],
    };
}
