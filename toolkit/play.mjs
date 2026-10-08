/**
 * 一键启动游戏。
 *
 *   node play.mjs                      # 打开标题画面（正常玩法）
 *   node play.mjs --scene c_day1_intro # 直接从某个场景开始（调试用）
 *   node play.mjs --stop               # 关掉 NarraLeaf Studio
 *
 * Studio 是单实例应用：已经开着的实例如果带的是**别的工程**，或者没开调试端口，
 * 都必须重启才能驱动它。这里会自己判断。
 */
import { spawn, execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { config } from './lib/config.mjs';
import { sceneUuid } from './lib/ids.mjs';

const PORT = 9222;
const PROJECT = config.projectDir;
const NLPROJ = path.join(PROJECT, readdirSync(PROJECT).find((f) => f.endsWith('.nlproj')));

const here = path.dirname(fileURLToPath(import.meta.url));
const { open, listTargets } = await import(pathToFileURL(path.join(here, 'cdp.mjs')).href);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const killStudio = () => {
    try { execFileSync('taskkill', ['/IM', 'NarraLeaf Studio.exe', '/F'], { stdio: 'ignore' }); } catch { /* 本来就没开 */ }
};

async function cdpAlive() {
    try {
        await listTargets(PORT);
        return true;
    } catch {
        return false;
    }
}

/** 当前这个 Studio 实例里，打开的是不是我们的工程？ */
async function studioHasOurProject() {
    try {
        const ws = await open('workspace', PORT);
        const raw = await ws.eval(`(async () => {
            const I = window.__NLS_RENDERER_INTERFACE__;
            const r = await I.workspace.isProjectOpen(${JSON.stringify(PROJECT)});
            return JSON.stringify(r);
        })()`);
        ws.close();
        return JSON.parse(raw)?.data?.open === true;
    } catch {
        return false;
    }
}

async function startStudio() {
    console.log('启动 NarraLeaf Studio…');
    spawn(config.studioExe, [NLPROJ, `--remote-debugging-port=${PORT}`], { detached: true, stdio: 'ignore' }).unref();
    for (let i = 0; i < 45; i++) {
        await sleep(2000);
        if (await cdpAlive()) return true;
    }
    return false;
}

if (process.argv.includes('--stop')) {
    killStudio();
    console.log('已关闭 NarraLeaf Studio。');
    process.exit(0);
}

let ready = false;
if (await cdpAlive()) {
    if (await studioHasOurProject()) {
        ready = true;
    } else {
        console.log('Studio 已在运行，但打开的不是本工程，正在重启…');
        killStudio();
        await sleep(3500);
    }
}
if (!ready) ready = await startStudio();
if (!ready) {
    console.error('等待 NarraLeaf Studio 启动超时。请手动打开它并选择项目：' + NLPROJ);
    process.exit(1);
}

const sceneArg = process.argv.indexOf('--scene');
const entry = sceneArg !== -1
    ? { kind: 'story', storyId: config.storyId, sceneId: sceneUuid(process.argv[sceneArg + 1]) }
    : { kind: 'surface', surfaceId: config.titleSurfaceId };

/** 等某个窗口出现（Studio 打开工程 / 关掉信任提示都需要时间）。 */
async function waitForWindow(titlePart, timeoutMs = 40000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const targets = await listTargets(PORT).catch(() => []);
        if (targets.some((t) => t.title.includes(titlePart))) return true;
        await sleep(800);
    }
    return false;
}

// 第一次打开这个工程时 Studio 会弹「项目信任」窗口，它会挡住工作区窗口；先点掉。
async function dismissTrustPrompt() {
    const targets = await listTargets(PORT).catch(() => []);
    if (!targets.some((t) => t.title.includes('project-trust'))) return false;
    try {
        const session = await open('project-trust', PORT);
        const clicked = await session.eval(`(() => {
            const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === '信任');
            if (b) { b.click(); return true; }
            return false;
        })()`);
        session.close();
        if (clicked) {
            console.log('已通过「项目信任」提示。');
            await waitForWindow('workspace', 30000);
        }
        return clicked;
    } catch {
        return false;
    }
}

const launch = async () => {
    if (!(await waitForWindow('workspace', 40000))) {
        return { success: false, error: '没有出现工作区窗口（可能停在「项目信任」提示上）' };
    }
    const workspace = await open('workspace', PORT);
    const raw = await workspace.eval(`(async () => {
        const I = window.__NLS_RENDERER_INTERFACE__;
        await I.devMode.stop(${JSON.stringify(PROJECT)}).catch(() => {});
        await new Promise(r => setTimeout(r, 1500));
        return JSON.stringify(await I.devMode.launch(${JSON.stringify(PROJECT)}, ${JSON.stringify(entry)}));
    })()`);
    workspace.close();
    return JSON.parse(raw);
};

await dismissTrustPrompt();
let result = await launch();
if (!result.success || result.data?.status !== 'running') {
    if (await dismissTrustPrompt()) result = await launch();
}

console.log('Dev Mode:', JSON.stringify(result));
if (!result.success || result.data?.status !== 'running') {
    console.error('启动失败。可以先用 Studio 手动打开一次该工程并点「信任」，再重试。');
    process.exit(1);
}

console.log('\n游戏窗口已经打开，直接在里面玩就行。');
console.log('  标题画面：开始 / 继续 / 加载 / 设置 / 鉴赏');
console.log('  关闭 Studio：node play.mjs --stop');
