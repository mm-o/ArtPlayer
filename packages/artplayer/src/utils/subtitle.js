function fixSrt(srt) {
    return srt.replace(/(\d\d:\d\d:\d\d)[,.](\d+)/g, (_, $1, $2) => {
        let ms = $2.slice(0, 3);
        if ($2.length === 1) {
            ms = $2 + '00';
        }
        if ($2.length === 2) {
            ms = $2 + '0';
        }
        return `${$1},${ms}`;
    });
}

export function srtToVtt(srtText) {
    return 'WEBVTT \r\n\r\n'.concat(
        fixSrt(srtText)
            .replace(/\{\\([ibu])\}/g, '</$1>')
            .replace(/\{\\([ibu])1\}/g, '<$1>')
            .replace(/\{([ibu])\}/g, '<$1>')
            .replace(/\{\/([ibu])\}/g, '</$1>')
            .replace(/(\d\d:\d\d:\d\d),(\d\d\d)/g, '$1.$2')
            .replace(/{[\s\S]*?}/g, '')
            .concat('\r\n\r\n'),
    );
}

export function vttToBlob(vttText) {
    return URL.createObjectURL(
        new Blob([vttText], {
            type: 'text/vtt',
        }),
    );
}

function formatTime(value) {
    const time = Math.max(0, Number(value) || 0);
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.floor((time % 1) * 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

export function jsonToVtt(value) {
    try {
        const data = JSON.parse(value);
        const body = Array.isArray(data) ? data : data?.body || data?.data?.body || [];
        if (!Array.isArray(body)) return '';
        const cues = body.flatMap((item, index) => {
            const text = String(item.content || item.text || item.body || '').trim();
            if (!text) return [];
            const start = Number(item.from ?? item.start ?? item.time ?? 0) || 0;
            const end = Number(item.to ?? item.end ?? item.endTime ?? start + 5) || start + 5;
            return `${index + 1}\n${formatTime(start)} --> ${formatTime(end)}\n${text}\n`;
        });
        return cues.length ? `WEBVTT\n\n${cues.join('\n')}` : '';
    } catch {
        return '';
    }
}

export function assToVtt(ass) {
    const reAss = new RegExp(
        'Dialogue:\\s\\d,' +
            '(\\d+:\\d\\d:\\d\\d.\\d\\d),' +
            '(\\d+:\\d\\d:\\d\\d.\\d\\d),' +
            '([^,]*),' +
            '([^,]*),' +
            '(?:[^,]*,){4}' +
            '([\\s\\S]*)$',
        'i',
    );

    function fixTime(time = '') {
        return time
            .split(/[:.]/)
            .map((item, index, arr) => {
                if (index === arr.length - 1) {
                    if (item.length === 1) {
                        return `.${item}00`;
                    }

                    if (item.length === 2) {
                        return `.${item}0`;
                    }
                } else if (item.length === 1) {
                    return (index === 0 ? '0' : ':0') + item;
                }

                return index === 0 ? item : index === arr.length - 1 ? `.${item}` : `:${item}`;
            })
            .join('');
    }

    return (
        'WEBVTT' +
        '\n' +
        '\n' +
        ass
            .split(/\r?\n/)
            .map((line) => {
                const m = line.match(reAss);
                if (!m) return null;
                return {
                    start: fixTime(m[1].trim()),
                    end: fixTime(m[2].trim()),
                    text: m[5]
                        .replace(/{[\s\S]*?}/g, '')
                        .replace(/(\\N)/g, '\n')
                        .trim()
                        .split(/\r?\n/)
                        .map((item) => item.trim())
                        .join('\n'),
                };
            })
            .filter((line) => line)
            .map((line, index) => {
                if (line) {
                    return index + 1 + '\n' + `${line.start} --> ${line.end}` + '\n' + `${line.text}`;
                }
                return '';
            })
            .filter((line) => line.trim())
            .join('\n\n')
    );
}
