# storydoc.json 结构（NarraLeaf 剧本图）

> `schemaVersion: 26`（Studio 1.4.5 实测）。**不要手写这个文件**——用 toolkit 的 `build-story.mjs`
> 从 `.nls` 编译，或者让 Studio 自己维护。这份文档是为了让你在需要时能读懂 / 打补丁。

## 1. 整体

```jsonc
{
  "schemaVersion": 26,
  "id": "<storyId>",
  "name": "星屑放课后",
  "entrySceneId": "<入口场景 uuid>",
  "chapters": [ { "id": "<uuid>", "name": "第一章 …",
                  "sceneIds": ["<场景 uuid>", ...],
                  "meta": { "createdAt": "...", "updatedAt": "..." } } ],
  "scenes": {
    "<场景 uuid>": {
      "id": "<场景 uuid>",
      "name": "序章 · 只剩一个人的天文台",     // 显示名
      "runtimeName": "c_prologue",              // 稳定标识，调试与脚本用
      "description": "",
      "rootBlockIds": ["<block uuid>", ...],    // 顶层执行顺序
      "blocks": { "<block uuid>": { …block… } },
      "meta": { "createdAt": "...", "updatedAt": "..." },
      "defaultBackgroundAssetId": "<图片资产 id>"   // 编辑器预览用
    }
  },
  "meta": { "createdAt": "...", "updatedAt": "..." }
}
```

## 2. block 通用形态

```jsonc
{ "id": "<uuid>", "parentId": null, "childrenIds": [], "kind": "…", "payload": { … } }
```

`childrenIds` 是**子块**（不是分支内容），一个块自己是否含分支由 `kind` / `payload` 决定。
遍历顺序 = `rootBlockIds` 顺序 + 递归 `childrenIds`。

### kind 只有四种

| kind | 含义 |
|---|---|
| `nodeAction` | 会**等玩家**的行：对白、旁白、选项、选项分支 |
| `action` | 立即执行的演出/数据操作 |
| `control` | 控制流：条件、条件分支、循环、结局 |
| `jump` | 跳到别的场景 |

## 3. 已实测的 payload

### 3.1 文本（`kind: "nodeAction"`）

```jsonc
// 旁白
{ "action": "narration", "text": { "textId": "<uuid>", "role": "narration", "value": "……" } }
// 对白（characterId 决定名字牌）
{ "action": "dialogue", "characterId": "<角色 uuid>",
  "text": { "textId": "<uuid>", "role": "dialogue", "value": "……" } }
```

`role` 取值实测有 `narration` / `dialogue` / `choicePrompt` / `choiceOption`。
`textId` 是**本地化键**：源语言文本就在 `value` 里，其它语言的译文放
`editor/localization/<locale>.json` 的 `units[textId] = {sourceHash,status,target}`。

### 3.2 选项

```jsonc
// 选项组，childrenIds 是若干 choiceOption
{ "action": "choice",
  "prompt": { "textId": "<uuid>", "role": "choicePrompt", "value": "今天，去找谁？" } }

// 单个选项；它自己的 childrenIds 才是选中后要执行的块
{ "action": "choiceOption",
  "text": { "textId": "<uuid>", "role": "choiceOption", "value": "去图书馆。" } }
```

**选项可以有条件**（`choiceOption` 支持 `hiddenWhen` / `disabledWhen`，留空表示总是显示与可选）。
toolkit 的 `.nls` DSL 目前不用这两个字段，需要时直接在 storydoc 上补。

### 3.3 演出（`kind: "action"`）

```jsonc
// 换背景
{ "action": "setBackground", "assetId": "<图片资产 id>" }   // 也可用 { "color": "#000" }

// 立绘：enter / exit / move / expression / setName / setMotion / setSkin / setParams
{ "action": "character", "operation": "enter",
  "characterId": "<角色 uuid>", "pose": "smile",
  "transform": { "mode": "props", "durationMs": 400 } }
{ "action": "character", "operation": "exit", "characterId": "<角色 uuid>",
  "transform": { "to": { "opacity": 0 }, "durationMs": 500 } }
{ "action": "character", "operation": "expression", "characterId": "<角色 uuid>", "pose": "sad" }

// 音乐 / 音效
{ "action": "audio", "operation": "setBgm", "assetId": "<音频资产 id>",
  "audioTrackId": "bgm", "fadeMs": 1200, "loop": true, "volume": 0.6 }
{ "action": "audio", "operation": "setBgm", "audioTrackId": "bgm", "fadeMs": 900 }   // ★ 停 BGM 的正确写法
{ "action": "audio", "operation": "playSound", "assetId": "<音频资产 id>", "audioTrackId": "sound" }

// 变量
{ "action": "setVariable",
  "target": { "scope": "saved", "variableId": "<变量 uuid>" },   // scope: saved | persistent | scene
  "value": true }                                                // 也可用 expression:{source,ast}

// 镜头
{ "action": "camera", "operation": "transform",
  "transform": { "mode": "props", "to": { "zoom": 1.12 }, "durationMs": 1600, "easing": "easeOut" } }
{ "action": "camera", "operation": "reset", "durationMs": 900, "easing": "easeInOut" }
```

### 3.4 条件（`kind: "control"`）

```jsonc
// 条件容器，childrenIds 是若干 conditionBranch，按顺序求值
{ "control": "condition" }

// 一个分支
{ "control": "conditionBranch", "branch": "if",
  "condition": {
    "kind": "variable",                                     // ★ 变量条件必须带这个值
    "target": { "scope": "saved", "variableId": "<变量 uuid>" },
    "operator": "isTrue"                                    // 或 equals/notEquals/greaterThan/
  } }                                                       //   greaterOrEqual/lessThan/lessOrEqual/isFalse
{ "control": "conditionBranch", "branch": "else" }           // else 分支没有 condition
```

条件求值逻辑（editor 与 runtime 一致）：
`kind === "expression"` → 走表达式 AST；`kind === "blueprint"` → 蓝图；**其它情况一律按变量比较处理**，
所以 `kind` 只要不是那两个特殊值就行，`"variable"` 是编辑器自己写出来的值。
`isTrue` / `isFalse` **不带 `value`**，其余 operator 带 `value`。

### 3.5 结局（`kind: "control"`）

```jsonc
{ "control": "ending", "name": "同一片星空下" }
```

故事在这里**终止**（不是跳转）。结局名是自由文本，会进入画廊 / 通关记录。

### 3.6 跳转（`kind: "jump"`）

```jsonc
{ "kind": "jump",
  "payload": { "targetSceneId": "<场景 uuid>",
               "transition": { "kind": "throughColor", "durationMs": 800,
                               "props": { "color": "#000000" }, "holdMs": 200 } } }
```

`kind:"jump"` 的 `childrenIds` 会被 Studio 归一化成空数组。

### 3.7 循环

`{ "control": "repeat", "times": N }` 或带 `"until"`。toolkit 的 DSL 没有用到，但结构存在。

## 4. 变量表（`editor/variables.json`）

```jsonc
{ "schemaVersion": 2,
  "entries": {
    "<变量 uuid>": { "defaultValue": false, "id": "<变量 uuid>", "name": "flag_kiss",
                     "scope": "saved", "storageKey": "<变量 uuid>", "valueType": "boolean" } },
  "meta": { "createdAt": "...", "updatedAt": "..." } }
```

`valueType` ∈ `string | integer | float | boolean | json | array`。
`scope` ∈ `saved`（存档内）| `persistent`（跨存档）| `scene`（本场景内）。
`target.variableId` 指的是这里的 **id**，不是 `storageKey`。

## 5. 归一化规则（Studio 打开文件时会自动修的东西）

* `scenes[].blocks[].id` 以 **key** 为准（会覆盖块里写的 `id`）。
* `childrenIds` 里指向不存在的块会被剔掉；`parentId` 指向不存在时置 `null` 并补进 `rootBlockIds`。
* `kind === "jump"` 的 `childrenIds` 一律清空。
* 没有场景引用的 chapter 会被剔除；`entrySceneId` 不合法时会退回第一个有内容的场景。
* 少字段（`description`、`meta`）会补齐默认值。

所以就算手写时有点小瑕疵，Studio 也会修；但**块之间的引用必须自洽**，否则表现为「剧情卡住」。
