/**
 * 《星屑放课后》剧本编译器
 *   scripts/*.nls  ──►  <项目>/editor/story/stories/<STORY_ID>/storydoc.json
 *                        <项目>/editor/story/index.json
 *                        <项目>/editor/variables.json
 *
 *   node build-story.mjs           # 编译并写入项目
 *   node build-story.mjs --check   # 只校验，不写文件
 */
import fs from 'node:fs';
import path from 'node:path';
import {
    PROJECT_DIR, TOOLS_DIR, WORK_DIR, STORY_ID, STORY_NAME, ENTRY_SCENE,
    sceneUuid, blockUuid, textUuid, chapterUuid, variableId, characterId,
    CHARACTERS, charByScript, POSES,
    bgIds, bgmIds, assetId,
} from './lib/ids.mjs';

const SCRIPTS_DIR = path.join(TOOLS_DIR, 'scripts');
const CHECK_ONLY = process.argv.includes('--check');
const NOW = new Date().toISOString();

const JUMP_TRANSITION = {
    kind: 'throughColor',
    durationMs: 800,
    props: { color: '#000000' },
    holdMs: 200,
};

const OPERATORS = { '==': 'equals', '!=': 'notEquals', '>': 'greaterThan', '>=': 'greaterOrEqual', '<': 'lessThan', '<=': 'lessOrEqual' };

const errors = [];
const warnings = [];
const counters = { choices: 0, conditions: 0 };

/** 实际渲染出来的立绘表情（由 register-assets.mjs 写出）。缺失的表情退回 normal。 */
const availablePoses = (() => {
    try { return JSON.parse(fs.readFileSync(path.join(WORK_DIR, 'poses.json'), 'utf8')); } catch { return null; }
})();

function resolvePose(charKey, pose, where) {
    if (!availablePoses) return pose;
    const list = availablePoses[charKey];
    if (!list || !list.length) return pose;
    if (list.includes(pose)) return pose;
    warnings.push(`${where}: 角色 ${charKey} 没有 ${pose} 立绘，已退回 ${list.includes('normal') ? 'normal' : list[0]}`);
    return list.includes('normal') ? 'normal' : list[0];
}

// ─────────────────────────────────────────── 解析

function parseValue(token, where, varName) {
    const t = token.trim();
    if (t === 'true') return { type: 'boolean', value: true };
    if (t === 'false') return { type: 'boolean', value: false };
    if (/^-?\d+(\.\d+)?$/.test(t)) return { type: 'number', value: Number(t) };
    if (/^".*"$/.test(t)) return { type: 'string', value: t.slice(1, -1) };
    errors.push(`${where}: 变量 ${varName} 的值 "${t}" 不合法（只能是 true/false、数字或 "字符串"）`);
    return null;
}

function parseCondition(rest, where) {
    const m = rest.match(/^(\w+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/);
    if (!m) {
        if (!/^\w+$/.test(rest)) { errors.push(`${where}: 条件 "${rest}" 不合法`); return null; }
        return { name: rest, operator: 'isTrue', value: true };
    }
    const [, name, op, rawValue] = m;
    const t = rawValue.trim();
    let value;
    if (t === 'true') value = true;
    else if (t === 'false') value = false;
    else if (/^-?\d+(\.\d+)?$/.test(t)) value = Number(t);
    else if (/^".*"$/.test(t)) value = t.slice(1, -1);
    else { errors.push(`${where}: 条件的值 "${t}" 不合法`); return null; }
    return { name, operator: OPERATORS[op], value };
}

/** 结果：{ chapters: [...], scenes: [...] }，场景内是嵌套的 items 树。 */
function parseScript(file) {
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    const chapterNodes = [];
    let scene = null;
    let stack = null;

    const topFrame = () => stack[stack.length - 1];
    /**
     * @choice 与它的 ">" 选项之间允许夹指令（例如 @camera reset）：
     * 这些指令会被暂存，最后插到 choice 块**之前**，语义上就是「先复位镜头，再弹选项」。
     */
    const push = (item) => {
        const frame = topFrame();
        if (frame.kind === 'choice') { frame.before.push(item); return; }
        frame.items.push(item);
    };
    const closeChoices = () => {
        while (stack && stack.length > 1 && topFrame().kind === 'choice') {
            const frame = stack.pop();
            if (frame.before.length) frame.parentItems.splice(frame.index, 0, ...frame.before);
        }
    };

    lines.forEach((line, index) => {
        const where = `${path.basename(file)}:${index + 1}`;
        if (!line.trim() || line.trim().startsWith('#')) return;
        const indent = /^\s/.test(line);
        const trimmed = line.trim();

        // 选项延续行（缩进的 @set 归上一个选项）
        if (indent && /^@set\b/.test(trimmed)) {
            const frame = topFrame();
            if (frame.kind === 'choice' && frame.options.length) {
                const m = trimmed.match(/^@set\s+(\w+)\s*=\s*(.+)$/);
                if (!m) { errors.push(`${where}: @set 语法应为 "@set 变量 = 值"`); return; }
                const v = parseValue(m[2], where, m[1]);
                if (v) frame.options[frame.options.length - 1].pre.push({ name: m[1], ...v });
                return;
            }
        }

        if (!trimmed.startsWith('>') && !indent) closeChoices();

        // 选项行
        if (trimmed.startsWith('>')) {
            const frame = topFrame();
            if (!frame || frame.kind !== 'choice') { errors.push(`${where}: ">" 选项不在 @choice 之后`); return; }
            const body = trimmed.slice(1).trim();
            const jumpMatch = body.match(/^(.*?)\s*->\s*(\w+)\s*$/);
            frame.options.push(jumpMatch
                ? { text: jumpMatch[1].trim(), target: jumpMatch[2], pre: [] }
                : { text: body, target: null, pre: [] });
            return;
        }

        // 台词行
        if (!trimmed.startsWith('@')) {
            if (!scene) { errors.push(`${where}: 在 @scene 之前出现台词`); return; }
            if (trimmed.startsWith('*')) {
                push({ t: 'say', role: 'narration', text: trimmed.slice(1).trim(), where }, where);
                return;
            }
            const m = trimmed.match(/^([^\s:|]+)(?:\|([a-z]+))?\s*:\s*(.*)$/);
            if (!m) { errors.push(`${where}: 无法识别的行 "${trimmed.slice(0, 40)}"`); return; }
            const [, scriptName, pose, body] = m;
            const character = charByScript.get(scriptName);
            if (!character) { errors.push(`${where}: 未知角色名 "${scriptName}"`); return; }
            if (pose && !POSES.includes(pose)) warnings.push(`${where}: 未知表情 "${pose}"，已退回 normal`);
            push({
                t: 'say', role: 'dialogue', char: character.key,
                pose: POSES.includes(pose) ? resolvePose(character.key, pose, where) : undefined, text: body, where,
            }, where);
            return;
        }

        const m = trimmed.match(/^@(\w+)\s*(.*)$/);
        if (!m) { errors.push(`${where}: 无法解析的指令 "${trimmed}"`); return; }
        const cmd = m[1];
        const rest = m[2].trim();

        switch (cmd) {
            case 'chapter':
                chapterNodes.push({ type: 'chapter', name: rest, where });
                return;
            case 'scene': {
                if (scene) {
                    if (stack.length !== 1) errors.push(`${scene.where}: 场景 ${scene.id} 里有未闭合的 @if / @choice`);
                }
                const [id, name] = rest.split('|').map((s) => s.trim());
                if (!id) { errors.push(`${where}: @scene 缺少场景 id`); return; }
                scene = { type: 'scene', id, name: name || id, where, items: [] };
                stack = [{ kind: 'root', items: scene.items }];
                chapterNodes.push(scene);
                return;
            }
            default: break;
        }

        if (!scene) { errors.push(`${where}: @${cmd} 出现在 @scene 之前`); return; }

        switch (cmd) {
            case 'bg':
                if (!bgIds.has(rest)) { errors.push(`${where}: 未知背景 "${rest}"`); return; }
                push({ t: 'bg', id: rest, where }, where);
                return;
            case 'bgm':
                if (rest === 'off') { push({ t: 'bgm', id: null, where }, where); return; }
                if (!bgmIds.has(rest)) { errors.push(`${where}: 未知 BGM "${rest}"`); return; }
                push({ t: 'bgm', id: rest, where }, where);
                return;
            case 'show':
            case 'expr': {
                const [scriptName, pose] = rest.split(/\s+/);
                const character = charByScript.get(scriptName);
                if (!character) { errors.push(`${where}: 未知角色 "${scriptName}"`); return; }
                if (!character.sprite) { warnings.push(`${where}: ${scriptName} 没有立绘，@${cmd} 已忽略`); return; }
                let p = pose || 'normal';
                if (!POSES.includes(p)) { errors.push(`${where}: 未知表情 "${p}"`); return; }
                p = resolvePose(character.key, p, where);
                push({ t: cmd, char: character.key, pose: p, where }, where);
                return;
            }
            case 'hide': {
                const character = charByScript.get(rest.trim());
                if (!character) { errors.push(`${where}: 未知角色 "${rest}"`); return; }
                push({ t: 'hide', char: character.key, where }, where);
                return;
            }
            case 'hideAll':
                push({ t: 'hideAll', where }, where);
                return;
            case 'camera': {
                const zm = rest.match(/^zoom\s+([\d.]+)$/);
                if (zm) { push({ t: 'camera', op: 'zoom', zoom: Number(zm[1]), where }, where); return; }
                if (rest === 'reset') { push({ t: 'camera', op: 'reset', where }, where); return; }
                errors.push(`${where}: @camera 只支持 "zoom <倍数>" 或 "reset"`);
                return;
            }
            case 'set': {
                const sm = rest.match(/^(\w+)\s*=\s*(.+)$/);
                if (!sm) { errors.push(`${where}: @set 语法应为 "@set 变量 = 值"`); return; }
                const v = parseValue(sm[2], where, sm[1]);
                if (v) push({ t: 'set', name: sm[1], ...v, where }, where);
                return;
            }
            case 'if': {
                const cond = parseCondition(rest, where);
                if (!cond) return;
                const node = { t: 'if', cond, then: [], else: null, where };
                const frame = topFrame();
                if (frame.kind === 'choice') frame.before.push(node);
                else frame.items.push(node);
                stack.push({ kind: 'ifThen', node, items: node.then });
                counters.conditions++;
                return;
            }
            case 'else': {
                const frame = topFrame();
                if (!frame || frame.kind !== 'ifThen') { errors.push(`${where}: @else 没有对应的 @if`); return; }
                stack.pop();
                frame.node.else = [];
                stack.push({ kind: 'ifElse', node: frame.node, items: frame.node.else });
                return;
            }
            case 'endif': {
                const frame = topFrame();
                if (!frame || (frame.kind !== 'ifThen' && frame.kind !== 'ifElse')) { errors.push(`${where}: @endif 没有对应的 @if`); return; }
                stack.pop();
                return;
            }
            case 'choice': {
                const node = { t: 'choice', prompt: rest, options: [], where };
                const frame = topFrame();
                if (frame.kind === 'choice') { errors.push(`${where}: @choice 不能嵌套在另一个 @choice 里`); return; }
                frame.items.push(node);
                stack.push({
                    kind: 'choice', node, options: node.options, before: [],
                    parentItems: frame.items, index: frame.items.length - 1,
                });
                counters.choices++;
                return;
            }
            case 'jump':
                if (!/^\w+$/.test(rest)) { errors.push(`${where}: @jump 的目标 "${rest}" 不合法`); return; }
                push({ t: 'jump', target: rest, where }, where);
                return;
            case 'ending': {
                if (!rest) { errors.push(`${where}: @ending 缺少结局名`); return; }
                push({ t: 'ending', name: rest, where }, where);
                return;
            }
            default:
                errors.push(`${where}: 未知指令 "@${cmd}"`);
        }
    });

    closeChoices();
    if (scene && stack.length !== 1) errors.push(`${file}: 文件末尾有未闭合的 @if / @choice`);
    return chapterNodes;
}

// ─────────────────────────────────────────── 变量表

function collectVariables(nodes) {
    const vars = new Map();
    const note = (name, type, where) => {
        const existing = vars.get(name);
        if (!existing) { vars.set(name, { name, type, where }); return; }
        if (existing.type !== type) errors.push(`${where}: 变量 ${name} 类型不一致（先前 ${existing.type}，这里 ${type}）`);
    };
    const walk = (items) => {
        for (const item of items) {
            if (item.t === 'set') note(item.name, item.type, item.where);
            if (item.t === 'if') {
                note(item.cond.name, item.cond.operator === 'isTrue' || item.cond.operator === 'isFalse' ? 'boolean' : 'number', item.where);
                walk(item.then);
                if (item.else) walk(item.else);
            }
            if (item.t === 'choice') for (const o of item.options) for (const s of o.pre) note(s.name, s.type, item.where);
        }
    };
    for (const node of nodes) if (node.type === 'scene') walk(node.items);
    return vars;
}

// ─────────────────────────────────────────── 生成 storydoc

function makeScene(sceneAst) {
    const sceneId = sceneAst.id;
    const blocks = {};
    const rootBlockIds = [];
    let counter = 0;
    const onStage = new Set();
    let firstBg = null;

    const newBlock = (kind, payload, parentId = null) => {
        const id = blockUuid(sceneId, counter++);
        blocks[id] = { id, parentId, childrenIds: [], kind, payload };
        if (parentId) blocks[parentId].childrenIds.push(id);
        else rootBlockIds.push(id);
        return id;
    };

    const charActions = (key, pose, parentId) => {
        if (!onStage.has(key)) {
            onStage.add(key);
            newBlock('action', {
                action: 'character', operation: 'enter', characterId: characterId(key),
                pose: pose ?? 'normal', transform: { mode: 'props', durationMs: 400 },
            }, parentId);
        } else if (pose) {
            newBlock('action', { action: 'character', operation: 'expression', characterId: characterId(key), pose }, parentId);
        }
    };

    const emit = (items, parentId) => {
        for (const item of items) {
            switch (item.t) {
                case 'bg':
                    if (!firstBg) firstBg = item.id;
                    newBlock('action', { action: 'setBackground', assetId: assetId.bg(item.id) }, parentId);
                    break;
                case 'bgm':
                    if (item.id) {
                        newBlock('action', {
                            action: 'audio', operation: 'setBgm', assetId: assetId.bgm(item.id),
                            audioTrackId: 'bgm', fadeMs: 1200, loop: true, volume: 0.6,
                        }, parentId);
                    } else {
                        // 停止 BGM：setBgm 不带 assetId（运行时的 setBackgroundMusic(null)）
                        newBlock('action', { action: 'audio', operation: 'setBgm', audioTrackId: 'bgm', fadeMs: 900 }, parentId);
                    }
                    break;
                case 'show':
                    onStage.delete(item.char);
                    charActions(item.char, item.pose, parentId);
                    break;
                case 'expr':
                    charActions(item.char, item.pose, parentId);
                    break;
                case 'hide':
                    newBlock('action', {
                        action: 'character', operation: 'exit', characterId: characterId(item.char),
                        transform: { to: { opacity: 0 }, durationMs: 500 },
                    }, parentId);
                    onStage.delete(item.char);
                    break;
                case 'hideAll':
                    for (const key of [...onStage]) {
                        newBlock('action', {
                            action: 'character', operation: 'exit', characterId: characterId(key),
                            transform: { to: { opacity: 0 }, durationMs: 500 },
                        }, parentId);
                    }
                    onStage.clear();
                    break;
                case 'camera':
                    if (item.op === 'zoom') {
                        newBlock('action', {
                            action: 'camera', operation: 'transform',
                            transform: { mode: 'props', to: { zoom: item.zoom }, durationMs: 1600, easing: 'easeOut' },
                        }, parentId);
                    } else {
                        newBlock('action', { action: 'camera', operation: 'reset', durationMs: 900, easing: 'easeInOut' }, parentId);
                    }
                    break;
                case 'set':
                    newBlock('action', {
                        action: 'setVariable',
                        target: { scope: item.name.startsWith('p_') ? 'persistent' : 'saved', variableId: variableId(item.name) },
                        value: item.value,
                    }, parentId);
                    break;
                case 'say': {
                    if (item.role === 'dialogue') {
                        const def = CHARACTERS.find((c) => c.key === item.char);
                        if (def.sprite) charActions(item.char, item.pose, parentId);
                        newBlock('nodeAction', {
                            action: 'dialogue', characterId: characterId(item.char),
                            text: { textId: textUuid(sceneId, counter), role: 'dialogue', value: item.text },
                        }, parentId);
                    } else {
                        newBlock('nodeAction', {
                            action: 'narration',
                            text: { textId: textUuid(sceneId, counter), role: 'narration', value: item.text },
                        }, parentId);
                    }
                    break;
                }
                case 'choice': {
                    const choiceId = newBlock('nodeAction', {
                        action: 'choice',
                        prompt: { textId: textUuid(sceneId, counter), role: 'choicePrompt', value: item.prompt },
                    }, parentId);
                    if (!item.options.length) errors.push(`${sceneId}: @choice 没有任何选项`);
                    for (const option of item.options) {
                        const optionId = blockUuid(sceneId, counter++);
                        blocks[optionId] = {
                            id: optionId, parentId: choiceId, childrenIds: [], kind: 'nodeAction',
                            payload: { action: 'choiceOption', text: { textId: textUuid(sceneId, counter), role: 'choiceOption', value: option.text } },
                        };
                        blocks[choiceId].childrenIds.push(optionId);
                        for (const s of option.pre) {
                            const sid = blockUuid(sceneId, counter++);
                            blocks[sid] = {
                                id: sid, parentId: optionId, childrenIds: [], kind: 'action',
                                payload: {
                                    action: 'setVariable',
                                    target: { scope: s.name.startsWith('p_') ? 'persistent' : 'saved', variableId: variableId(s.name) },
                                    value: s.value,
                                },
                            };
                            blocks[optionId].childrenIds.push(sid);
                        }
                        if (option.target) {
                            const jid = blockUuid(sceneId, counter++);
                            blocks[jid] = {
                                id: jid, parentId: optionId, childrenIds: [], kind: 'jump',
                                payload: { targetSceneId: sceneUuid(option.target), transition: JUMP_TRANSITION },
                            };
                            blocks[optionId].childrenIds.push(jid);
                        }
                    }
                    break;
                }
                case 'if': {
                    const condId = newBlock('control', { control: 'condition' }, parentId);
                    const branchId = blockUuid(sceneId, counter++);
                    blocks[branchId] = {
                        id: branchId, parentId: condId, childrenIds: [], kind: 'control',
                        payload: {
                            control: 'conditionBranch', branch: 'if',
                            condition: {
                                kind: 'variable',
                                target: { scope: item.cond.name.startsWith('p_') ? 'persistent' : 'saved', variableId: variableId(item.cond.name) },
                                operator: item.cond.operator,
                                ...(item.cond.operator === 'isTrue' || item.cond.operator === 'isFalse' ? {} : { value: item.cond.value }),
                            },
                        },
                    };
                    blocks[condId].childrenIds.push(branchId);
                    emit(item.then, branchId);
                    if (item.else) {
                        const elseId = blockUuid(sceneId, counter++);
                        blocks[elseId] = { id: elseId, parentId: condId, childrenIds: [], kind: 'control', payload: { control: 'conditionBranch', branch: 'else' } };
                        blocks[condId].childrenIds.push(elseId);
                        emit(item.else, elseId);
                    }
                    break;
                }
                case 'jump':
                    newBlock('jump', { targetSceneId: sceneUuid(item.target), transition: JUMP_TRANSITION }, parentId);
                    break;
                case 'ending':
                    newBlock('control', { control: 'ending', name: item.name }, parentId);
                    break;
                default:
                    errors.push(`${sceneId}: 编译器不认识的项目类型 ${item.t}`);
            }
        }
    };

    emit(sceneAst.items, null);

    return {
        id: sceneUuid(sceneId),
        name: sceneAst.name,
        runtimeName: sceneId,
        description: '',
        rootBlockIds,
        blocks,
        meta: { createdAt: NOW, updatedAt: NOW },
        defaultBackgroundAssetId: assetId.bg(firstBg ?? 'clubroom'),
    };
}

// ─────────────────────────────────────────── 主流程

const files = fs.existsSync(SCRIPTS_DIR)
    ? fs.readdirSync(SCRIPTS_DIR).filter((f) => f.endsWith('.nls')).sort()
    : [];

if (!files.length) {
    console.error(`没有找到任何 .nls 剧本（${SCRIPTS_DIR}）`);
    process.exit(1);
}

const parsed = files.map((f) => ({ file: f, nodes: parseScript(path.join(SCRIPTS_DIR, f)) }));

const sceneIds = new Set();
const allScenes = [];
for (const { file, nodes } of parsed) {
    for (const node of nodes) {
        if (node.type !== 'scene') continue;
        if (sceneIds.has(node.id)) errors.push(`${file}: 场景 id 重复：${node.id}`);
        sceneIds.add(node.id);
        allScenes.push(node);
    }
}

// 结构校验：每个场景必须以 jump / ending / 全跳转 choice 收尾
const terminal = (item) => item.t === 'jump' || item.t === 'ending'
    || (item.t === 'choice' && item.options.length > 0 && item.options.every((o) => o.target))
    || (item.t === 'if' && item.else && terminal(item.then[item.then.length - 1] ?? {}) && terminal(item.else[item.else.length - 1] ?? {}));

for (const scene of allScenes) {
    const walk = (items, path) => {
        for (const item of items) {
            if (item.t === 'jump' && !sceneIds.has(item.target)) errors.push(`${scene.where}: @jump 的目标场景 "${item.target}" 不存在`);
            if (item.t === 'choice') {
                const withTarget = item.options.filter((o) => o.target).length;
                if (withTarget !== 0 && withTarget !== item.options.length) {
                    errors.push(`${item.where}: 同一个 @choice 里混用了带 "->" 和不带 "->" 的选项`);
                }
                for (const o of item.options) {
                    if (o.target && !sceneIds.has(o.target)) errors.push(`${item.where}: 选项 "${o.text}" 的目标场景 "${o.target}" 不存在`);
                }
            }
            if (item.t === 'if') { walk(item.then, path); if (item.else) walk(item.else, path); }
        }
    };
    walk(scene.items, scene.id);
    const last = scene.items[scene.items.length - 1];
    if (!last) { errors.push(`${scene.where}: 场景 ${scene.id} 是空的`); continue; }
    if (!terminal(last)) {
        warnings.push(`${scene.where}: 场景 ${scene.id} 的结尾不是 @jump / @ending / 全跳转 @choice，玩家可能卡住`);
    }
}

const variables = collectVariables(allScenes);

// 章节
const chapters = [];
let currentChapter = null;
for (const { nodes } of parsed) {
    for (const node of nodes) {
        if (node.type === 'chapter') {
            currentChapter = { id: chapterUuid(chapters.length), name: node.name, sceneIds: [], meta: { createdAt: NOW, updatedAt: NOW } };
            chapters.push(currentChapter);
            continue;
        }
        if (node.type === 'scene') {
            if (!currentChapter) {
                currentChapter = { id: chapterUuid(chapters.length), name: '未分章', sceneIds: [], meta: { createdAt: NOW, updatedAt: NOW } };
                chapters.push(currentChapter);
            }
            currentChapter.sceneIds.push(sceneUuid(node.id));
        }
    }
}

if (!sceneIds.has(ENTRY_SCENE)) errors.push(`入口场景 ${ENTRY_SCENE} 不存在（storydoc.entrySceneId 指向它）`);

const scenes = {};
for (const scene of allScenes) scenes[sceneUuid(scene.id)] = makeScene(scene);

const storydoc = {
    schemaVersion: 26,
    id: STORY_ID,
    name: STORY_NAME,
    entrySceneId: sceneUuid(ENTRY_SCENE),
    chapters,
    scenes,
    meta: { createdAt: NOW, updatedAt: NOW },
};

// ─────────────────────────────────────────── 报告

function countLines(items) {
    let n = 0;
    for (const item of items) {
        if (item.t === 'say') n++;
        if (item.t === 'if') { n += countLines(item.then); if (item.else) n += countLines(item.else); }
        if (item.t === 'choice') n++; // 选项本身也算一行
    }
    return n;
}

const fileStats = parsed.map(({ file, nodes }) => ({
    file,
    scenes: nodes.filter((n) => n.type === 'scene').length,
    lines: nodes.filter((n) => n.type === 'scene').reduce((a, s) => a + countLines(s.items), 0),
}));

console.log('── 剧本编译报告 ──');
for (const s of fileStats) console.log(`  ${s.file.padEnd(22)} 场景 ${String(s.scenes).padStart(3)}   台词 ${String(s.lines).padStart(4)}`);
console.log(`  合计：场景 ${allScenes.length}，台词 ${fileStats.reduce((a, b) => a + b.lines, 0)}，选项 ${counters.choices}，条件 ${counters.conditions}，变量 ${variables.size}`);
console.log(`  章节 ${chapters.length} 章：${chapters.map((c) => `${c.name}(${c.sceneIds.length})`).join('、')}`);
const endings = allScenes.flatMap((s) => {
    const found = [];
    const walk = (items) => { for (const i of items) { if (i.t === 'ending') found.push(i.name); if (i.t === 'if') { walk(i.then); if (i.else) walk(i.else); } } };
    walk(s.items);
    return found;
});
console.log(`  结局 ${endings.length} 个：${endings.join('、')}`);

if (warnings.length) {
    console.log(`\n警告 ${warnings.length} 条：`);
    for (const w of warnings.slice(0, 30)) console.log('  ! ' + w);
}
if (errors.length) {
    console.log(`\n错误 ${errors.length} 条：`);
    for (const e of errors.slice(0, 60)) console.log('  x ' + e);
    process.exit(1);
}

if (CHECK_ONLY) {
    console.log('\n校验通过（--check，未写入文件）');
    process.exit(0);
}

const storyDir = path.join(PROJECT_DIR, 'editor', 'story', 'stories', STORY_ID);
fs.mkdirSync(storyDir, { recursive: true });
fs.writeFileSync(path.join(storyDir, 'storydoc.json'), JSON.stringify(storydoc, null, 2), 'utf8');

fs.writeFileSync(path.join(PROJECT_DIR, 'editor', 'story', 'index.json'), JSON.stringify({
    schemaVersion: 2,
    stories: [{ id: STORY_ID, name: STORY_NAME, documentPath: `editor/story/stories/${STORY_ID}/storydoc.json`, createdAt: NOW, updatedAt: NOW }],
    meta: { createdAt: NOW, updatedAt: NOW },
    defaultStoryId: STORY_ID,
}, null, 2), 'utf8');

const entries = {};
for (const [name, info] of variables) {
    const id = variableId(name);
    entries[id] = {
        defaultValue: info.type === 'boolean' ? false : info.type === 'number' ? 0 : '',
        id,
        name,
        scope: name.startsWith('p_') ? 'persistent' : 'saved',
        storageKey: id,
        valueType: info.type,
    };
}
fs.writeFileSync(path.join(PROJECT_DIR, 'editor', 'variables.json'), JSON.stringify({
    entries, meta: { createdAt: NOW, updatedAt: NOW }, schemaVersion: 2,
}, null, 2), 'utf8');

console.log(`\n已写入 storydoc.json（${(fs.statSync(path.join(storyDir, 'storydoc.json')).size / 1024).toFixed(0)} KB）、story/index.json、variables.json`);
