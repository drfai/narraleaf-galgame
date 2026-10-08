/**
 * 配置解析：找出 game.config.mjs，并自动探测本机的 NarraLeaf Studio 与 Chrome。
 *
 * 查找顺序：
 *   1. 命令行 --config <路径>
 *   2. 环境变量 GALGAME_CONFIG
 *   3. <toolkit>/game.config.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const TOOLKIT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function configPath() {
    const i = process.argv.indexOf('--config');
    if (i !== -1 && process.argv[i + 1]) return path.resolve(process.argv[i + 1]);
    if (process.env.GALGAME_CONFIG) return path.resolve(process.env.GALGAME_CONFIG);
    return path.join(TOOLKIT_DIR, 'game.config.mjs');
}

const file = configPath();
if (!fs.existsSync(file)) {
    console.error(`找不到游戏配置：${file}\n先跑 \`node init.mjs --name "游戏名" --dir "工程目录"\` 生成一份。`);
    process.exit(1);
}

const loaded = (await import(pathToFileURL(file).href)).default;
if (!loaded || typeof loaded !== 'object') {
    console.error(`${file} 没有默认导出一个配置对象。`);
    process.exit(1);
}
if (!loaded.projectDir) {
    console.error(
        `这份 toolkit 还没有绑定到某个游戏工程（game.config.mjs 里的 projectDir 是空的）。\n` +
        `先跑：\n` +
        `    node init.mjs --name "游戏名" --dir "工程目录"\n` +
        `它会在 <工程目录>-tools 下生成一份配置好的 toolkit，之后的命令都在那一份里跑。`,
    );
    process.exit(1);
}

/** 探测 NarraLeaf Studio 安装目录。 */
function detectStudio() {
    if (loaded.studioDir && fs.existsSync(loaded.studioDir)) return loaded.studioDir;
    const candidates = [
        path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'NarraLeaf Studio'),
        path.join(process.env.PROGRAMFILES ?? '', 'NarraLeaf Studio'),
        path.join(process.env['PROGRAMFILES(X86)'] ?? '', 'NarraLeaf Studio'),
    ];
    const found = candidates.find((c) => c && fs.existsSync(path.join(c, 'NarraLeaf Studio.exe')));
    if (!found) {
        console.error('找不到 NarraLeaf Studio。请在 game.config.mjs 里填 studioDir。');
        process.exit(1);
    }
    return found;
}

/** 探测一个支持无头截图的 Chrome / Edge。 */
function detectChrome() {
    if (loaded.chromePath && fs.existsSync(loaded.chromePath)) return loaded.chromePath;
    const candidates = [
        path.join(process.env.PROGRAMFILES ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env.LOCALAPPDATA ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
        path.join(process.env.PROGRAMFILES ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        path.join(process.env['PROGRAMFILES(X86)'] ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ];
    const found = candidates.find((c) => c && fs.existsSync(c));
    if (!found) {
        console.error('找不到 Chrome/Edge。请在 game.config.mjs 里填 chromePath。');
        process.exit(1);
    }
    return found;
}

export const config = {
    ...loaded,
    configFile: file,
    toolkitDir: TOOLKIT_DIR,
    studioDir: detectStudio(),
    chromePath: detectChrome(),
    studioExe: path.join(detectStudio(), 'NarraLeaf Studio.exe'),
    msgpackPath: path.join(detectStudio(), 'resources', 'app.asar.unpacked', 'node_modules', 'msgpack-lite'),
    workDir: loaded.workDir || path.join(path.dirname(loaded.projectDir), '_galgame-build'),
};

/** 项目里 `.nlproj` 的完整路径。 */
export function projectConfigFile() {
    const name = fs.readdirSync(config.projectDir).find((f) => f.endsWith('.nlproj'));
    if (!name) throw new Error('项目里没有 .nlproj：' + config.projectDir);
    return path.join(config.projectDir, name);
}

/** Studio 自带的 msgpack 编解码器（.nlproj 就是 msgpack）。 */
export async function loadMsgpack() {
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    return require(config.msgpackPath);
}
