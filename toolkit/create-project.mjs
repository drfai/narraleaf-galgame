/**
 * 生成一个新的 NarraLeaf Studio 工程（复刻 Studio 自己的「新建项目」流程）。
 *
 *   node create-project.mjs            # 按 game.config.mjs 生成（会清空同名目录）
 *
 * 做三件事：
 *   1. 写 `<Name>.nlproj`（msgpack 编码的项目配置）
 *   2. 建好 .nlstudio / assets / scripts / editor 等目录与空分片
 *   3. 把 Studio 内置 skeleton 模板的 content/ 覆盖上去（中文工程再叠 content.zh/）
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { config, loadMsgpack } from './lib/config.mjs';

/** 项目实际要用到的插件依赖表；版本号必须与本机已安装的一致，否则 Studio 会报「插件不可用」。 */
export function desiredDependencies() {
    const registryPath = path.join(
        process.env.APPDATA ?? path.join(process.env.USERPROFILE ?? '', 'AppData', 'Roaming'),
        'NarraLeaf Studio', 'plugins', 'plugin-registry.json',
    );
    const wanted = config.dependencies ?? [];
    const plugins = [];
    try {
        const records = JSON.parse(fs.readFileSync(registryPath, 'utf8'))['plugin.records'] ?? {};
        for (const id of wanted) {
            const record = records[id];
            if (!record?.enabled || !record.manifest?.entries?.runtime) continue;
            plugins.push({
                id,
                name: record.manifest.name ?? id,
                publisher: record.manifest.publisher ?? '',
                builtIn: record.builtIn === true,
                authoredVersion: record.manifest.version ?? '1.0.0',
                hard: true,
                usedBy: {},
            });
        }
    } catch (error) {
        console.warn('[scaffold] 读不到插件登记表，跳过依赖表：' + error.message);
    }
    return plugins.length ? { schemaVersion: 1, plugins } : undefined;
}

/** 玩家里程碑偏好的默认值（取自 Studio 的 normalizePlayerPreferences 默认表）。 */
const PLAYER_PREFERENCES = {
    cps: 10, textRevealDuration: 120, gameSpeed: 1, autoForward: false, autoForwardDelay: 3000,
    showDialog: true, skip: true, skipReadText: false, skipDelay: 0, skipInterval: 100,
    globalVolume: 1, bgmVolume: 1, soundVolume: 1, voiceVolume: 1,
    voiceEndMode: 'stop', voiceFadeDuration: 0, muteOnWindowBlur: false,
};

export function projectConfig() {
    const deps = desiredDependencies();
    return {
        name: config.projectName,
        identifier: config.appId,
        metadata: {
            description: config.description ?? '',
            author: config.author ?? '',
            website: '',
            version: config.version ?? '1.0.0',
            resolution: config.resolution,
        },
        app: {
            network: { allowHttp: false, allowRemoteResource: false, allowRemoteScript: false, policy: 'off', allowlist: [] },
            preferences: { ...PLAYER_PREFERENCES },
            mobile: { orientation: 'landscape', fit: 'contain', cropAnchorX: 'center', cropAnchorY: 'center' },
            localization: {
                sourceLocale: config.sourceLocale,
                locales: [{
                    code: config.sourceLocale,
                    displayName: String(config.sourceLocale).startsWith('zh') ? '中文（简体）' : config.sourceLocale,
                }],
            },
        },
        ...(deps ? { dependencies: deps } : {}),
    };
}

/** 与 Studio 的 sanitizeProjectFileName 行为一致（中文原样保留）。 */
export function projectConfigFileName(name) {
    const cleaned = name
        .normalize('NFC')
        .replace(/[<>:"/\\|?\p{Cc}]/gu, '')
        .replace(/\p{Cf}/gu, '')
        .replace(/\s+/gu, '-')
        .replace(/-+/g, '-')
        .replace(/^[-.]+|[-.]+$/g, '')
        .slice(0, 100)
        .replace(/[-.]+$/g, '');
    return `${cleaned || 'project'}.nlproj`;
}

const METADATA_SHARDS = ['audio', 'blueprint', 'font', 'image', 'json', 'model', 'other', 'video'];
const GROUP_SHARDS = ['data', 'font', 'image', 'media', 'model', 'other'];
const EMPTY_ORDER = '{"assetIds":[],"groupIds":[]}';

function copyTree(from, to) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
        const src = path.join(from, entry.name);
        const dst = path.join(to, entry.name);
        if (entry.isDirectory()) copyTree(src, dst);
        else if (entry.isFile()) fs.copyFileSync(src, dst);
    }
}

function defaultUiDocument(size) {
    const id = () => crypto.randomUUID();
    const rootId = id();
    return {
        schemaVersion: 5,
        id: id(),
        name: 'UI Document',
        surfaces: [{ id: id(), name: 'Main Page', host: 'app', kind: 'appSurface', designSize: size, rootElementId: rootId }],
        components: [],
        elements: {
            [rootId]: {
                id: rootId, type: 'nl.root', name: 'Root', parentId: null, childrenIds: [],
                layout: { x: 0, y: 0, width: size.width, height: size.height, visible: true, opacity: 1 },
            },
        },
        meta: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    };
}

export function createProject({ clean = true, msgpack } = {}) {
    const root = config.projectDir;
    const template = path.join(config.studioDir, 'resources', 'resources', 'templates', 'skeleton');
    if (!fs.existsSync(template)) throw new Error('找不到 Studio 内置模板：' + template);
    if (!msgpack) throw new Error('createProject 需要一个 msgpack 编解码器（loadMsgpack()）');

    if (clean && fs.existsSync(root)) fs.rmSync(root, { recursive: true, force: true });

    fs.mkdirSync(root, { recursive: true });
    const configName = projectConfigFileName(config.projectName);
    fs.writeFileSync(path.join(root, configName), msgpack.encode(projectConfig()));
    console.log(`[scaffold] ${configName} written`);

    for (const dir of [
        '.nlstudio', 'assets', 'assets/content', 'scripts',
        'editor', 'editor/assets', 'editor/services', 'editor/ui', 'editor/story', 'editor/story/stories',
    ]) fs.mkdirSync(path.join(root, dir), { recursive: true });

    fs.writeFileSync(path.join(root, '.nlstudio', 'editor.json'), JSON.stringify({}));
    fs.writeFileSync(path.join(root, 'editor', 'ui', 'uidoc.json'), JSON.stringify(defaultUiDocument(config.resolution), null, 2));

    for (const shard of METADATA_SHARDS) {
        fs.writeFileSync(path.join(root, 'assets', `assets.metadata.${shard}.json`), '{}');
    }
    for (const shard of GROUP_SHARDS) {
        fs.writeFileSync(path.join(root, 'assets', `assets.groups.${shard}.json`), '{}');
        fs.writeFileSync(path.join(root, 'assets', `assets.order.${shard}.json`), EMPTY_ORDER);
    }

    // 模板内容：先英文底稿，再覆盖对应语言的变体（与 Studio 的 contentLocales 行为一致）
    copyTree(path.join(template, 'content'), root);
    const locale = String(config.sourceLocale ?? '');
    const variant = locale.startsWith('zh') ? 'content.zh' : locale.startsWith('ja') ? 'content.ja' : null;
    if (variant && fs.existsSync(path.join(template, variant))) {
        copyTree(path.join(template, variant), root);
        fs.rmSync(path.join(root, 'editor', 'localization', `${locale}.json`), { force: true });
        for (const f of ['en.json', 'ja.json']) {
            if (f !== `${locale}.json`) fs.rmSync(path.join(root, 'editor', 'localization', f), { force: true });
        }
    }

    console.log(`[scaffold] project created at ${root}`);
    return root;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
    createProject({ msgpack: await loadMsgpack() });
}
