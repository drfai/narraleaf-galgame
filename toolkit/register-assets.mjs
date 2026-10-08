/**
 * 把渲染好的美术与音频注册成 NarraLeaf Studio 项目资产。
 *
 *   node render-svg.mjs art/backgrounds.mjs _work/art/bg --size 1920x1080
 *   node render-svg.mjs art/characters.mjs  _work/art/char --size 900x1400
 *   node audio/make-audio.mjs
 *   node register-assets.mjs
 *
 * 做的事情：
 *  1. 背景 PNG → assets/content/<分片>，写进 assets.metadata.image.json / order
 *  2. 立绘 PNG → 同上；并为每个 pose 生成 608x608 头像到 resources/characters/avatars/<角色id>/
 *  3. BGM WAV → assets/content/<分片> + assets.metadata.audio.json / order
 *  4. 覆写 editor/services/character.json（6 名角色，站位固定）
 *
 * 模板自带的资产（标题画面用的背景与 UI 音效）会被**保留**，不会被删掉。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
    PROJECT_DIR, TOOLS_DIR, WORK_DIR, CHARACTERS, POSES, STAGE, BACKGROUNDS, BGMS,
    characterId, assetId, assetShardPath,
} from './lib/ids.mjs';
import { config } from './lib/config.mjs';

const CHROME = config.chromePath;
const WORK = WORK_DIR;
const ART_BG = path.join(WORK, 'art', 'bg');
const ART_CHAR = path.join(WORK, 'art', 'char');
const AUDIO_OUT = path.join(TOOLS_DIR, 'audio', 'out');
const NOW = new Date().toISOString();
const AVATAR_SIZE = 608;

const AVATAR_RECT = (await (async () => {
    try {
        const mod = await import(pathToFileURL(path.join(TOOLS_DIR, 'art', 'characters.mjs')).href);
        if (mod.AVATAR_RECT) return Object.fromEntries(CHARACTERS.filter((c) => c.sprite).map((c) => [c.key, mod.AVATAR_RECT]));
    } catch { /* 用下面的兜底值 */ }
    const fallback = { x: 0.267, y: 0.045, w: 0.467, h: 0.30 };
    return Object.fromEntries(CHARACTERS.filter((c) => c.sprite).map((c) => [c.key, fallback]));
})());

const readJson = (p, dflt) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return dflt; } };
const sha256 = (buf) => crypto.createHash('sha256').update(buf).digest('hex');

// ─────────────────────────────────────────── 资产库读写

const IMAGE_META = path.join(PROJECT_DIR, 'assets', 'assets.metadata.image.json');
const IMAGE_GROUPS = path.join(PROJECT_DIR, 'assets', 'assets.groups.image.json');
const IMAGE_ORDER = path.join(PROJECT_DIR, 'assets', 'assets.order.image.json');
const AUDIO_META = path.join(PROJECT_DIR, 'assets', 'assets.metadata.audio.json');
const AUDIO_GROUPS = path.join(PROJECT_DIR, 'assets', 'assets.groups.audio.json');
const AUDIO_ORDER = path.join(PROJECT_DIR, 'assets', 'assets.order.audio.json');

/** 保证某个分类下有一个分组，返回 group id。 */
function ensureGroup(groups, name, prefix) {
    const found = Object.values(groups).find((g) => g.name === name);
    if (found) return found.id;
    const id = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    groups[id] = { id, name, category: 'image', createdAt: Date.now(), updatedAt: Date.now() };
    return id;
}

const imageMeta = readJson(IMAGE_META, {});
const imageGroups = readJson(IMAGE_GROUPS, {});
const imageOrder = readJson(IMAGE_ORDER, { assetIds: [], groupIds: [] });
const audioMeta = readJson(AUDIO_META, {});
const audioGroups = readJson(AUDIO_GROUPS, {});
const audioOrder = readJson(AUDIO_ORDER, { assetIds: [], groupIds: [] });

const bgGroup = ensureGroup(imageGroups, '背景', 'group');
const charGroup = ensureGroup(imageGroups, '角色', 'group');
const bgmGroup = ensureGroup(audioGroups, 'BGM', 'group');

/** 把二进制写进 assets/content 分片，并登记元数据。 */
function registerAsset(meta, order, group, { id, type, name, buffer, ext }) {
    const rel = assetShardPath(id);
    const target = path.join(PROJECT_DIR, ...rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buffer);
    meta[id] = {
        id, type, name,
        hash: sha256(buffer),
        source: 'local',
        meta: {},
        tags: [],
        description: '',
        groupId: group,
    };
    if (!order.assetIds.includes(id)) order.assetIds.push(id);
}

// ─────────────────────────────────────────── 背景

let bgCount = 0;
for (const bg of BACKGROUNDS) {
    const file = path.join(ART_BG, `${bg.id}.png`);
    if (!fs.existsSync(file)) { console.warn(`  ! 缺少背景渲染结果 ${bg.id}.png，跳过`); continue; }
    registerAsset(imageMeta, imageOrder, bgGroup, {
        id: assetId.bg(bg.id), type: 'image', name: `bg-${bg.id}`, buffer: fs.readFileSync(file), ext: 'png',
    });
    bgCount++;
}

// ─────────────────────────────────────────── 立绘 + 头像

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nlavatar-'));
const avatarPages = [];

function bakeAvatar(charKey, pose, spriteFile) {
    const rect = AVATAR_RECT[charKey];
    const data = fs.readFileSync(spriteFile).toString('base64');
    const scale = AVATAR_SIZE / (rect.w * 900);
    const left = -(rect.x * 900) * scale;
    const top = -(rect.y * 1400) * scale;
    const html = `<!doctype html><html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;background:transparent;overflow:hidden}
#box{width:${AVATAR_SIZE}px;height:${AVATAR_SIZE}px;overflow:hidden;position:relative}
img{position:absolute;left:${left}px;top:${top}px;width:${900 * scale}px;height:${1400 * scale}px}
</style></head><body><div id="box"><img src="data:image/png;base64,${data}"></div></body></html>`;
    const htmlFile = path.join(tmp, `${charKey}_${pose}.html`);
    fs.writeFileSync(htmlFile, html, 'utf8');
    const out = path.join(tmp, `${charKey}_${pose}.png`);
    execFileSync(CHROME, [
        '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-sandbox',
        '--force-device-scale-factor=1', `--window-size=${AVATAR_SIZE},${AVATAR_SIZE}`,
        `--screenshot=${out}`, '--virtual-time-budget=3000', '--default-background-color=00000000',
        pathToFileURL(htmlFile).href,
    ], { stdio: 'ignore', timeout: 120000 });
    return fs.readFileSync(out);
}

const charProfiles = [];
let poseCount = 0;

for (const character of CHARACTERS) {
    const id = characterId(character.key);
    if (!character.sprite) {
        charProfiles.push({
            profile: {
                appearance: { defaultPoseId: null, kind: 'preset', poses: [] },
                attributes: {},
                description: '',
                id,
                name: character.name,
                nicknames: [],
                tags: [],
                thumbnail: null,
            },
        });
        continue;
    }

    const poses = [];
    const avatars = {};
    for (const pose of POSES) {
        const file = path.join(ART_CHAR, `${character.key}_${pose}.png`);
        if (!fs.existsSync(file)) { console.warn(`  ! 缺少立绘 ${character.key}_${pose}.png`); continue; }
        const buffer = fs.readFileSync(file);
        registerAsset(imageMeta, imageOrder, charGroup, {
            id: assetId.pose(character.key, pose), type: 'image',
            name: `${character.key}-${pose}`, buffer, ext: 'png',
        });
        poseCount++;

        const avatarBuffer = bakeAvatar(character.key, pose, file);
        const avatarDir = path.join(PROJECT_DIR, 'resources', 'characters', 'avatars', id);
        fs.mkdirSync(avatarDir, { recursive: true });
        fs.writeFileSync(path.join(avatarDir, `${pose}.png`), avatarBuffer);
        avatars[pose] = { baked: sha256(avatarBuffer).slice(0, 8) };

        poses.push({
            assetId: assetId.pose(character.key, pose),
            id: pose,
            name: { normal: '普通', smile: '微笑', sad: '难过', angry: '生气', surprise: '惊讶', shy: '害羞' }[pose] ?? pose,
            portrait: AVATAR_RECT[character.key],
        });
    }

    if (!poses.length) console.warn(`  ! ${character.key} 没有任何立绘`);
    const stage = STAGE[character.key];
    charProfiles.push({
        profile: {
            appearance: {
                ...(Object.keys(avatars).length ? { avatars } : {}),
                defaultPoseId: poses.length ? 'normal' : null,
                kind: 'preset',
                poses,
            },
            attributes: {},
            description: '',
            entranceTransform: {
                position: { xalign: stage.xalign, yalign: stage.yalign, yoffset: stage.yoffset },
                zoom: stage.zoom,
            },
            id,
            name: character.name,
            nicknames: [],
            tags: [],
            thumbnail: null,
        },
    });
}

// ─────────────────────────────────────────── BGM

let bgmCount = 0;
for (const bgm of BGMS) {
    const file = path.join(AUDIO_OUT, bgm.file);
    if (!fs.existsSync(file)) { console.warn(`  ! 缺少 BGM ${bgm.file}，跳过`); continue; }
    registerAsset(audioMeta, audioOrder, bgmGroup, {
        id: assetId.bgm(bgm.id), type: 'audio', name: `bgm-${bgm.id}`, buffer: fs.readFileSync(file), ext: 'wav',
    });
    bgmCount++;
}

// ─────────────────────────────────────────── 落盘

fs.writeFileSync(IMAGE_META, JSON.stringify(imageMeta));
fs.writeFileSync(IMAGE_GROUPS, JSON.stringify(imageGroups));
fs.writeFileSync(IMAGE_ORDER, JSON.stringify({ assetIds: imageOrder.assetIds, groupIds: Object.keys(imageGroups) }));
fs.writeFileSync(AUDIO_META, JSON.stringify(audioMeta));
fs.writeFileSync(AUDIO_GROUPS, JSON.stringify(audioGroups));
fs.writeFileSync(AUDIO_ORDER, JSON.stringify({ assetIds: audioOrder.assetIds, groupIds: Object.keys(audioGroups) }));

fs.writeFileSync(path.join(PROJECT_DIR, 'editor', 'services', 'character.json'), JSON.stringify({
    characters: charProfiles, groups: {}, version: 2,
}, null, 2), 'utf8');

// 供 build-story.mjs 参考：实际存在的 pose
const available = {};
for (const c of CHARACTERS) {
    if (!c.sprite) continue;
    available[c.key] = POSES.filter((p) => fs.existsSync(path.join(ART_CHAR, `${c.key}_${p}.png`)));
}
fs.mkdirSync(WORK, { recursive: true });
fs.writeFileSync(path.join(WORK, 'poses.json'), JSON.stringify(available, null, 2));

console.log('── 资产注册 ──');
console.log(`  背景 ${bgCount}/${BACKGROUNDS.length}，立绘 ${poseCount}，BGM ${bgmCount}/${BGMS.length}`);
console.log(`  图片资产总数 ${Object.keys(imageMeta).length}，音频资产总数 ${Object.keys(audioMeta).length}`);
console.log(`  角色 ${charProfiles.length} 名，头像已写入 resources/characters/avatars/`);
if (bgCount < BACKGROUNDS.length || bgmCount < BGMS.length) process.exitCode = 1;
