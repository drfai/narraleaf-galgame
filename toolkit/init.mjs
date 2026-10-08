/**
 * 开一个新 galgame。
 *
 *   node init.mjs --name "银河食堂" --dir "D:\games\银河食堂"
 *   [--tools <工具目录>] [--author 名字] [--locale zh-CN] [--no-build]
 *
 * 它会：
 *   1. 把 toolkit 复制到 <工具目录>（默认 <dir>-tools），每个游戏一份，互不干扰
 *   2. 写入这个游戏的 game.config.mjs
 *   3. 用 Studio 内置模板生成工程
 *   4. 跑一次全量构建（除非 --no-build）
 *
 * 之后的日常流程都在那份复制出来的 toolkit 里：
 *   node build-all.mjs --story   # 改完 scripts/*.nls 重编译剧本
 *   node build-all.mjs           # 改完美术/音乐重构建
 *   node play.mjs                # 开始游戏
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

// 注意：init 跑在**还没配好的** toolkit 上，所以不能 import lib/config.mjs
//（那份配置要求 projectDir 非空）。工具目录直接由脚本自身位置推出来。
const TOOLKIT_DIR = path.dirname(fileURLToPath(import.meta.url));

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
    const i = argv.indexOf(name);
    return i !== -1 && argv[i + 1] ? argv[i + 1] : dflt;
};

const name = arg('--name');
const projectDir = arg('--dir');
if (!name || !projectDir) {
    console.error('用法：node init.mjs --name "游戏名" --dir "工程目录" [--tools 工具目录] [--author 名字] [--locale zh-CN] [--no-build]');
    process.exit(1);
}

const project = path.resolve(projectDir);
const toolsDir = path.resolve(arg('--tools', `${project}-tools`));
const author = arg('--author', '');
const locale = arg('--locale', 'zh-CN');
const skipBuild = argv.includes('--no-build');

if (path.resolve(toolsDir) === path.resolve(TOOLKIT_DIR)) {
    console.error('工具目录不能就是 skill 自带的 toolkit（它是只读的公共资源）。换一个 --tools 路径。');
    process.exit(1);
}

// ── 1. 复制 toolkit（每个游戏一份，可以随意改）
const SKIP = new Set(['game.config.mjs', 'node_modules', '.git', 'audio/out']);
fs.mkdirSync(toolsDir, { recursive: true });
fs.cpSync(TOOLKIT_DIR, toolsDir, {
    recursive: true,
    filter: (src) => {
        const rel = path.relative(TOOLKIT_DIR, src).replace(/\\/g, '/');
        if (!rel) return true;
        return ![...SKIP].some((s) => rel === s || rel.startsWith(s + '/'));
    },
});
console.log(`[init] toolkit 已复制到 ${toolsDir}`);

// ── 2. 写这个游戏的配置。角色 / 背景 / BGM 沿用 toolkit 里那份默认设定，
//       之后按新游戏的需要改这个文件，并同步改 art/ 与 audio/。
const shipped = (await import(pathToFileURL(path.join(TOOLKIT_DIR, 'game.config.mjs')).href)).default;
const appId = `com.narraleaf.galgame.${crypto.createHash('sha1').update(name).digest('hex').slice(0, 12)}`;

const configSource = `/**
 * 《${name}》的游戏配置。开新游戏时改这里。
 * studioDir / chromePath 留空会自动探测。
 */
export default ${JSON.stringify({
    studioDir: '',
    chromePath: '',
    projectName: name,
    projectDir: project,
    workDir: path.join(path.dirname(project), `_${path.basename(project)}-build`),
    appId,
    description: '',
    author,
    version: '1.0.0',
    sourceLocale: locale,
    resolution: shipped.resolution,
    dependencies: shipped.dependencies,
    storyId: shipped.storyId,
    storyName: name,
    entryScene: shipped.entryScene,
    entrySceneUuid: shipped.entrySceneUuid,
    titleSurfaceId: shipped.titleSurfaceId,
    characters: shipped.characters,
    poses: shipped.poses,
    poseNames: shipped.poseNames,
    stage: shipped.stage,
    backgrounds: shipped.backgrounds,
    bgms: shipped.bgms,
}, null, 4)};
`;
fs.writeFileSync(path.join(toolsDir, 'game.config.mjs'), configSource, 'utf8');
console.log(`[init] game.config.mjs 已写入（appId=${appId}）`);

// ── 3+4. 生成工程并构建
const run = (label, args) => {
    console.log(`\n=== ${label} ===`);
    execFileSync(process.execPath, args, { cwd: toolsDir, stdio: 'inherit' });
};

run('生成 NarraLeaf 工程', ['create-project.mjs']);
if (!skipBuild) run('全量构建', ['build-all.mjs']);

console.log(`
──────────────────────────────────────────────
《${name}》已就绪
  工程：${project}
  工具：${toolsDir}

下一步：
  1. 改 ${toolsDir}\\scripts\\*.nls 写剧本（格式见 toolkit\\docs\\SCRIPT_FORMAT.md）
  2. 改 ${toolsDir}\\art\\*.mjs 画背景与立绘
  3. node build-all.mjs --story   （只重编译剧本，几秒）
     node build-all.mjs          （美术/音乐也重做）
  4. node play.mjs               （开始游戏）
`);
