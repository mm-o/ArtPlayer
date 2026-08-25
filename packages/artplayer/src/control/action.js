import { append } from '../utils';

const icons = {
    timestamp:
        '<svg xmlns="http://www.w3.org/2000/svg" height="22" width="22" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2.15;stroke-linecap:round;stroke-linejoin:round"><path d="M12 6v6l4 2"></path><circle cx="12" cy="12" r="9"></circle><path d="M19 16v6"></path><path d="M22 19h-6"></path></svg>',
    loopSegment:
        '<svg xmlns="http://www.w3.org/2000/svg" height="22" width="22" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2.15;stroke-linecap:round;stroke-linejoin:round"><path d="m17 2 4 4-4 4"></path><path d="M3 11v-1a4 4 0 0 1 4-4h14"></path><path d="m7 22-4-4 4-4"></path><path d="M21 13v1a4 4 0 0 1-4 4H3"></path></svg>',
    mediaNotes:
        '<svg xmlns="http://www.w3.org/2000/svg" height="22" width="22" viewBox="0 0 24 24" style="fill:none;stroke:currentColor;stroke-width:2.15;stroke-linecap:round;stroke-linejoin:round"><path d="M8 2v4"></path><path d="M16 2v4"></path><path d="M21 15V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8"></path><path d="M3 10h18"></path><path d="M8 14h4"></path><path d="M8 18h2"></path><path d="m16 19 2 2 4-4"></path></svg>',
};

export default function action(option) {
    return (art) => ({
        ...option,
        tooltip: option.tooltip,
        mounted: ($control) => {
            append($control, icons[option.name]);
        },
        click(_, event) {
            const shifted = !!(event?.shiftKey || event?.getModifierState?.('Shift') || window.event?.shiftKey);
            switch (option.name) {
                case 'timestamp':
                    if (shifted) {
                        art.adjust.open('timestamp');
                    } else {
                        art.captureTimestamp();
                    }
                    break;
                case 'loopSegment':
                    if (shifted) {
                        art.adjust.open('loop');
                    } else {
                        art.captureLoopSegment();
                    }
                    break;
                case 'mediaNotes':
                    art.emitAction('mediaNotes');
                    break;
            }
        },
    });
}
