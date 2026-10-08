/**
 * 通用 ID 派生 + 从 game.config.mjs 读到的游戏常量。
 * 所有 ID 都由名字稳定派生（sha1 → uuid v5 形态），所以重复构建结果一致。
 */
import crypto from 'node:crypto';
import { config } from './config.mjs';

export const PROJECT_DIR = config.projectDir;
export const TOOLS_DIR = config.toolkitDir;
export const WORK_DIR = config.workDir;
export const STORY_ID = config.storyId;
export const STORY_NAME = config.storyName;
export const ENTRY_SCENE = config.entryScene;
export const ENTRY_SCENE_UUID = config.entrySceneUuid;

/** 由名字推导出的稳定 uuid（v5 形态，sha1）。同一个名字每次构建结果一致。 */
export function stableUuid(seed) {
    const hex = crypto.createHash('sha1').update(`narraleaf:${seed}`).digest('hex').slice(0, 32).split('');
    hex[12] = '5';
    hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
    const s = hex.join('');
    return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

export const sceneUuid = (sceneId) => (sceneId === ENTRY_SCENE ? ENTRY_SCENE_UUID : stableUuid(`scene:${sceneId}`));
export const blockUuid = (sceneId, n) => stableUuid(`block:${sceneId}:${n}`);
export const textUuid = (sceneId, n) => stableUuid(`text:${sceneId}:${n}`);
export const chapterUuid = (index) => stableUuid(`chapter:${index}`);
export const variableId = (name) => stableUuid(`var:${name}`);
export const characterId = (key) => stableUuid(`character:${key}`);

export const assetId = {
    bg: (id) => stableUuid(`asset:image:bg:${id}`),
    pose: (char, pose) => stableUuid(`asset:image:char:${char}:${pose}`),
    bgm: (id) => stableUuid(`asset:audio:bgm:${id}`),
};

/** 资产内容文件路径：assets/content/<2>/<2>/<28>（资产 id 去掉连字符）。 */
export function assetShardPath(id) {
    const hex = id.replace(/-/g, '');
    return ['assets', 'content', hex.slice(0, 2), hex.slice(2, 4), hex.slice(4)];
}

export const CHARACTERS = config.characters;
export const POSES = config.poses;
export const STAGE = config.stage;
export const BACKGROUNDS = config.backgrounds;
export const BGMS = config.bgms;
export const POSE_NAMES = config.poseNames ?? {};

export const charByScript = new Map(CHARACTERS.map((c) => [c.script, c]));
export const charByKey = new Map(CHARACTERS.map((c) => [c.key, c]));
export const bgIds = new Set(BACKGROUNDS.map((b) => b.id));
export const bgmIds = new Set(BGMS.map((b) => b.id));
