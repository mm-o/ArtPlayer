import { append } from '../utils';

const icons = {
    timestamp:
        '<svg viewBox="0 0 24 24" style="fill:none;stroke:var(--art-font-color);stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path><path d="M16 19h6"></path><path d="M19 16v6"></path></svg>',
    loopSegment:
        '<svg viewBox="0 0 24 24" style="fill:none;stroke:var(--art-font-color);stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="m17 2 4 4-4 4"></path><path d="M3 11v-1a4 4 0 0 1 4-4h14"></path><path d="m7 22-4-4 4-4"></path><path d="M21 13v1a4 4 0 0 1-4 4H3"></path></svg>',
    mediaNotes:
        '<svg viewBox="0 0 24 24" style="fill:none;stroke:var(--art-font-color);stroke-width:2;stroke-linecap:round;stroke-linejoin:round"><path d="M8 2v4"></path><path d="M16 2v4"></path><rect x="4" y="4" width="16" height="18" rx="2"></rect><path d="M8 10h8"></path><path d="M8 14h5"></path><path d="m15 19 4-4 2 2-4 4h-2z"></path></svg>',
};

export default function action(option) {
    return (art) => ({
        ...option,
        tooltip: art.i18n.get(option.tooltip),
        mounted: ($control) => {
            append($control, icons[option.name]);
        },
        click: () => {
            switch (option.name) {
                case 'timestamp':
                    art.captureTimestamp();
                    break;
                case 'loopSegment':
                    art.captureLoopSegment();
                    break;
                case 'mediaNotes':
                    art.emitAction('mediaNotes');
                    break;
            }
        },
    });
}
