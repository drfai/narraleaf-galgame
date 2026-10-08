/**
 * 把骨架模板里的界面占位文字换成这个游戏的。
 * 模板自带的标题画面写着「你的游戏」，鉴赏列表里写着「走廊」。
 *
 *   node patch-ui.mjs
 *
 * 想改更多界面文字，就在 REPLACEMENTS 里加一对 [原文字, 新文字]。
 */
import fs from 'node:fs';
import path from 'node:path';
import { config } from './lib/config.mjs';

const file = path.join(config.projectDir, 'editor', 'ui', 'uidoc.json');

const REPLACEMENTS = [
    ['你的游戏', config.storyName],
];

let text = fs.readFileSync(file, 'utf8');
const applied = [];
for (const [from, to] of REPLACEMENTS) {
    const needle = `"text": ${JSON.stringify(from)}`;
    if (!text.includes(needle)) continue;
    text = text.replace(needle, `"text": ${JSON.stringify(to)}`);
    applied.push(`${from} → ${to}`);
}
fs.writeFileSync(file, text, 'utf8');

console.log('── 界面文字 ──');
console.log(applied.length ? applied.map((a) => '  ' + a).join('\n') : '  （已经是目标文字，无需修改）');
