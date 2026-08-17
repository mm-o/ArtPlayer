import { def } from '../utils/property.js';

function getNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
}

function getActionDetail(art, type, detail = {}) {
    return {
        ...detail,
        type,
        currentTime: getNumber(art.currentTime),
        duration: getNumber(art.duration),
        media: art.currentMedia || null,
        loopSegment: art.loopSegment,
    };
}

export default function actionMix(art) {
    let loopSegment = null;
    let pendingLoopStart = null;

    def(art, 'loopSegment', {
        get() {
            return loopSegment;
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
        value(start, end) {
            const nextStart = Math.max(0, getNumber(start));
            const nextEnd = Math.max(nextStart, getNumber(end));
            if (nextEnd <= nextStart) return false;

            loopSegment = {
                start: nextStart,
                end: nextEnd,
            };
            pendingLoopStart = null;
            art.currentTime = nextStart;
            art.emit('loopSegment:change', loopSegment);

            return true;
        },
    });

    def(art, 'clearLoopSegment', {
        value() {
            loopSegment = null;
            pendingLoopStart = null;
            art.emit('loopSegment:change', null);
            return null;
        },
    });

    def(art, 'captureTimestamp', {
        value(detail = {}) {
            return art.emitAction('timestamp', detail);
        },
    });

    def(art, 'captureLoopSegment', {
        value() {
            const time = Math.max(0, getNumber(art.currentTime));

            if (!pendingLoopStart || time <= pendingLoopStart.start) {
                pendingLoopStart = { start: time, end: null };
                art.emit('loopSegment:change', pendingLoopStart);
                return pendingLoopStart;
            }

            art.setLoopSegment(pendingLoopStart.start, time);
            return art.emitAction('loopSegment');
        },
    });

    art.on('video:timeupdate', () => {
        if (!loopSegment || art.currentTime < loopSegment.end) return;
        art.currentTime = loopSegment.start;
    });
}
