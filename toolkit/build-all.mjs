/**
 * 一键全量构建。
 *
 *   node build-all.mjs            # 重渲染美术/音频，重建资产与剧本（保留项目本体）
 *   node build-all.mjs --fresh    # 先从 Studio 内置骨架模板重新生成整个项目（会清空项目目录！）
 *   node build-all.mjs --story    # 只重编译剧本（改了 .nls 之后用这个，几秒钟）
 *
 * 顺序：脚手架 → 背景/立绘/音频渲染 → 资产注册 → 剧本编译 → 项目配置 → 界面文字
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './lib/config.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const WORK = config.workDir;
const run = (label, args) => {
    console.log(`\n=== ${label} ===`);
    execFileSync(process.execPath, args, { cwd: here, stdio: 'inherit' });
};

const fresh = process.argv.includes('--fresh');
const storyOnly = process.argv.includes('--story');

if (fresh) {
    run('脚手架：从 Studio 内置模板生成项目', ['create-project.mjs']);
}

if (!storyOnly) {
    // art/ 下所有 bg_*.mjs 都是背景模块，各自导出若干背景 id（改为 bg[_-] 前缀，勿用 backgrounds.mjs 这种名字）
    const bgModules = fs.readdirSync(path.join(here, 'art')).filter((f) => /^bg[_-].*\.mjs$/.test(f)).sort();
    for (const module of bgModules) {
        run(`渲染背景 art/${module}`, ['render-svg.mjs', `art/${module}`, path.join(WORK, 'art', 'bg'), '--size', '1920x1080']);
    }
    run('渲染立绘', ['render-svg.mjs', 'art/characters.mjs', path.join(WORK, 'art', 'char'), '--size', '900x1400']);
    run('合成 BGM', ['audio/make-audio.mjs']);
    run('注册资产', ['register-assets.mjs']);
}

run('编译剧本', ['build-story.mjs']);

if (!storyOnly) {
    run('写回项目配置', ['patch-config.mjs']);
    run('替换界面文字', ['patch-ui.mjs']);
}

console.log('\n全部完成。运行 `node play.mjs` 即可开始游戏。');
