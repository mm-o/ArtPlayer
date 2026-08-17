import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('packages/artplayer/src/style/hint.less');
const source = fs.readFileSync(file, 'utf8');
const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '');
const violations = [];
let playerScopeDepth = 0;

for (const line of stripped.split(/\r?\n/)) {
    const trimmed = line.trim();
    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;
    const enteringPlayerScope = playerScopeDepth === 0 && trimmed.startsWith('.art-video-player') && opens > closes;
    const inPlayerScope = playerScopeDepth > 0 || enteringPlayerScope;

    if (trimmed && !trimmed.startsWith('@') && trimmed.includes('hint--') && !inPlayerScope) {
        if (!trimmed.startsWith('&') && !/^[,{}]$/.test(trimmed)) violations.push(trimmed);
    }

    if (inPlayerScope) playerScopeDepth += opens - closes;
}

if (violations.length) {
    console.error('Unscoped hint selectors found:');
    for (const violation of violations.slice(0, 20)) console.error(`- ${violation}`);
    process.exit(1);
}
