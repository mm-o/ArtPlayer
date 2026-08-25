import { def } from '../utils/property.js';
import { secondToTime } from '../utils';

function getNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function getAdjustState(art) {
    const media = art.currentMedia;

    if (media) {
        media.adjustState ||= {};
        return media.adjustState;
    }

    art.adjustState ||= {};
    return art.adjustState;
}

function getTimestampOffset(art) {
    return getNumber(art.timestampOffset);
}

function getLoopSegment(art) {
    return getAdjustState(art).loopSegment || null;
}

function getActionDetail(art, type, detail = {}) {
    const currentTime = getNumber(art.currentTime);
    const timestampOffset = getTimestampOffset(art);
    const displayTime = Math.max(0, currentTime + timestampOffset);
    return {
        ...detail,
        type,
        currentTime,
        displayTime,
        displayTimeText: secondToTime(displayTime),
        timestampOffset,
        duration: getNumber(art.duration),
        media: art.currentMedia || null,
        loopSegment: art.loopSegment,
    };
}

export default function actionMix(art) {
    let loopSegment = null;
    let pendingLoopStart = null;

    def(art, 'timestampOffset', {
        get() {
            return getNumber(getAdjustState(art).timestampOffset);
        },
        set(offset) {
            const next = getNumber(offset);
            getAdjustState(art).timestampOffset = next;
            art.emit('timestampOffset', next);
        },
    });

    def(art, 'loopSegment', {
        get() {
            return getLoopSegment(art) || loopSegment;
        },
    });

    def(art, 'setTimestampOffset', {
        value(offset) {
            art.timestampOffset = offset;
            return getNumber(art.timestampOffset);
        },
    });

    def(art, 'previewTimestamp', {
        async value(offset = getTimestampOffset(art), baseTime = art.currentTime) {
            const time = Math.max(0, getNumber(baseTime) + getNumber(offset));
            art.currentTime = time;
            if (!art.playing) {
                await art.play();
            }
            return time;
        },
    });

    def(art, 'previewLoopSegment', {
        async value(start = getLoopSegment(art)?.start ?? art.currentTime) {
            const time = Math.max(0, getNumber(start));
            art.currentTime = time;
            if (!art.playing) {
                await art.play();
            }
            return time;
        },
    });

    def(art, 'emitAction', {
        value(type, detail = {}) {
            const action = getActionDetail(art, type, detail);
            art.emit(`action:${type}`, action);
            art.emit('action', action);
            return action;
        },
    });

    def(art, 'setLoopSegment', {
        value(start, end, seek = true) {
            const nextStart = Math.max(0, getNumber(start));
            const nextEnd = Math.max(nextStart, getNumber(end));
            if (nextEnd <= nextStart) return false;

            loopSegment = {
                start: nextStart,
                end: nextEnd,
            };
            getAdjustState(art).loopSegment = loopSegment;
            pendingLoopStart = null;
            if (seek) {
                art.currentTime = nextStart;
            }
            art.emit('loopSegment:change', loopSegment);

            return true;
        },
    });

    def(art, 'clearLoopSegment', {
        value() {
            loopSegment = null;
            getAdjustState(art).loopSegment = null;
            pendingLoopStart = null;
            art.emit('loopSegment:change', null);
            return null;
        },
    });

    def(art, 'captureTimestamp', {
        value(detail = {}) {
            const offset = detail.timestampOffset ?? getTimestampOffset(art);
            const currentTime = getNumber(detail.currentTime ?? art.currentTime);
            const displayTime = Number.isFinite(detail.displayTime)
                ? getNumber(detail.displayTime)
                : Math.max(0, currentTime + getNumber(offset));
            const action = art.emitAction('timestamp', {
                ...detail,
                currentTime,
                timestampOffset: getNumber(offset),
                displayTime,
                displayTimeText: secondToTime(displayTime),
                media: art.currentMedia || null,
            });
            art.notice.show = `${art.i18n.get('Timestamp')}: ${action.displayTimeText}`;
            return action;
        },
    });

    def(art, 'captureLoopSegment', {
        value(detail = {}) {
            const time = Math.max(0, getNumber(detail.currentTime ?? art.currentTime));
            const segment = detail.loopSegment || getLoopSegment(art);

            if (segment?.start !== undefined && segment?.end !== undefined) {
                if (!art.setLoopSegment(segment.start, segment.end, detail.seek !== false)) return null;
                const action = art.emitAction('loopSegment', {
                    ...detail,
                    currentTime: time,
                    timestampOffset: getTimestampOffset(art),
                    loopSegment: art.loopSegment,
                    media: art.currentMedia || null,
                });
                art.notice.show = `${art.i18n.get('Loop Segment')}: ${secondToTime(action.loopSegment.start)} - ${secondToTime(action.loopSegment.end)}`;
                return action;
            }

            if (!pendingLoopStart || time <= pendingLoopStart.start) {
                pendingLoopStart = { start: time, end: null };
                art.emit('loopSegment:change', pendingLoopStart);
                art.pause();
                art.notice.show = `${art.i18n.get('Loop Segment')}: ${secondToTime(time)} - ...`;
                return pendingLoopStart;
            }

            art.setLoopSegment(pendingLoopStart.start, time);
            art.pause();
            const action = art.emitAction('loopSegment', {
                loopSegment: art.loopSegment,
            });
            art.notice.show = `${art.i18n.get('Loop Segment')}: ${secondToTime(action.loopSegment.start)} - ${secondToTime(action.loopSegment.end)}`;
            return action;
        },
    });

    art.on('video:timeupdate', () => {
        if (!loopSegment || art.currentTime < loopSegment.end) return;
        art.currentTime = loopSegment.start;
    });
}
