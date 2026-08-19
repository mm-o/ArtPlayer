import { clamp, def } from '../utils';

export default function volumeMix(art) {
    const {
        template: { $video },
        i18n,
        notice,
        storage,
        option,
    } = art;
    let audioCtx;
    let gainNode;
    let audioSource;
    let volume = 0;

    function getMax() {
        return Math.max(1, Number(option.volumeMax) || 1);
    }

    function boost(gain) {
        if (gain <= 1) {
            if (gainNode) gainNode.gain.value = 1;
            return;
        }
        try {
            audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
            audioSource ||= audioCtx.createMediaElementSource($video);
            gainNode ||= audioCtx.createGain();
            audioSource.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            gainNode.gain.value = gain;
            if (audioCtx.state === 'suspended') audioCtx.resume();
        } catch (error) {
            if (gainNode) gainNode.gain.value = 1;
        }
    }

    def(art, 'volume', {
        get: () => volume || $video.volume || 0,
        set: (percentage) => {
            volume = clamp(Number(percentage) || 0, 0, getMax());
            $video.volume = clamp(volume, 0, 1);
            boost(volume);
            notice.show = `${i18n.get('Volume')}: ${parseInt(volume * 100, 10)}`;
            art.emit('volume', volume);
            if (volume !== 0) {
                storage.set('volume', volume);
            }
        },
    });

    def(art, 'muted', {
        get: () => $video.muted,
        set: (muted) => {
            $video.muted = muted;
            art.emit('muted', muted);
        },
    });
}
