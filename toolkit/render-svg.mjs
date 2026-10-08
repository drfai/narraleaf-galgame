/**
 * 把 JS 模块里导出的 SVG 字符串批量渲染成 PNG（用本机 Chrome 无头模式）。
 *
 *   node render-svg.mjs <模块路径> <输出目录> [--size 1920x1080] [--only id1,id2] [--opaque]
 *
 * 模块需导出：export default { id: () => '<svg ...>...</svg>', ... }
 * 或：export const render = { ... }
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

// 优先用 game.config.mjs 里（或自动探测到）的 Chrome；没有配置也能独立使用。
const CHROME = await (async () => {
    try {
        const { config } = await import('./lib/config.mjs');
        return config.chromePath;
    } catch {
        const candidates = [
            path.join(process.env.PROGRAMFILES ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(process.env['PROGRAMFILES(X86)'] ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
            path.join(process.env.PROGRAMFILES ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        ];
        return candidates.find((c) => c && fs.existsSync(c)) ?? 'chrome.exe';
    }
})();

const [modulePath, outDir] = process.argv.slice(2);
const flags = process.argv.slice(4);
const argOf = (name, dflt) => {
    const i = flags.indexOf(name);
    return i === -1 ? dflt : flags[i + 1];
};
const [W, H] = argOf('--size', '1920x1080').split('x').map(Number);
const only = argOf('--only', '') ? argOf('--only', '').split(',') : null;
const opaque = flags.includes('--opaque');

const mod = await import(pathToFileURL(path.resolve(modulePath)).href);
const table = mod.default ?? mod.render ?? mod;

fs.mkdirSync(outDir, { recursive: true });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nlsvg-'));

let count = 0;
const failed = [];
for (const [id, fn] of Object.entries(table)) {
    if (typeof fn !== 'function') continue;
    if (only && !only.includes(id)) continue;
    const svg = fn(W, H);
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;overflow:hidden;background:${opaque ? '#000' : 'transparent'}}
svg{display:block;width:${W}px;height:${H}px}
</style></head><body>${svg}</body></html>`;
    const htmlFile = path.join(tmp, `${id}.html`);
    const pngFile = path.join(outDir, `${id}.png`);
    fs.writeFileSync(htmlFile, html, 'utf8');
    const args = [
        '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
        '--force-device-scale-factor=1', `--window-size=${W},${H}`,
        `--screenshot=${pngFile}`, `--virtual-time-budget=3000`,
    ];
    if (!opaque) args.push('--default-background-color=00000000');
    args.push(pathToFileURL(htmlFile).href);

    // 无头 Chrome 偶尔会因为并发/启动竞争失败一次，重试一次再判定
    let ok = false;
    let lastError = '';
    for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
        try {
            fs.rmSync(pngFile, { force: true });
            execFileSync(CHROME, args, { stdio: 'ignore', timeout: 120000 });
            if (!fs.existsSync(pngFile)) throw new Error('没有产出 PNG');
            ok = true;
        } catch (error) {
            lastError = error.message;
            await new Promise((r) => setTimeout(r, 400 * attempt));
        }
    }
    if (ok) {
        const size = fs.statSync(pngFile).size;
        console.log(`  ${id}.png  ${(size / 1024).toFixed(0)} KB`);
        count++;
    } else {
        console.error(`  !! ${id} 渲染失败：${lastError}`);
        failed.push(id);
    }
}
console.log(`rendered ${count} image(s) -> ${outDir}`);
if (failed.length) {
    console.error(`!! ${failed.length} 张渲染失败：${failed.join(', ')}`);
    process.exit(1);
}
