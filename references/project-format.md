# NarraLeaf Studio 工程格式

> 这些内容是对 Studio 1.4.5 实测反推出来的。改工程文件前先读这份。

## 1. `.nlproj` = msgpack

工程根目录下唯一的 `*<工程名>.nlproj` 是**项目配置**，内容是 **MessagePack**（不是 JSON，不是加密）。
Studio 自己的编解码器在
`<Studio>/resources/app.asar.unpacked/node_modules/msgpack-lite`，直接用 `createRequire` 加载即可：

```js
const require = createRequire(import.meta.url);
const msgpack = require(path.join(studioDir, 'resources', 'app.asar.unpacked', 'node_modules', 'msgpack-lite'));
const config = msgpack.decode(fs.readFileSync(nlprojPath));
```

字段（Studio 的 `ProjectConfigData`）：

```jsonc
{
  "name": "游戏名",
  "identifier": "com.example.mygame",      // 反向域名，构建时用作 appId
  "metadata": { "description": "", "author": "", "website": "", "version": "1.0.0",
                "resolution": { "width": 1920, "height": 1080 } },
  "app": {
    "network": { "policy": "off", "allowHttp": false, "allowRemoteResource": false,
                 "allowRemoteScript": false, "allowlist": [] },
    "preferences": { /* 玩家默认偏好，见下 */ },
    "mobile": { "orientation": "landscape", "fit": "contain",
                "cropAnchorX": "center", "cropAnchorY": "center" },
    "localization": { "sourceLocale": "zh-CN", "locales": [{ "code": "zh-CN", "displayName": "中文（简体）" }] }
  },
  "dependencies": {                          // 插件依赖表，可省略
    "schemaVersion": 1,
    "plugins": [{ "id": "narraleaf.gallery", "name": "Gallery", "publisher": "NarraLeaf Studio",
                  "builtIn": true, "authoredVersion": "3.3.0", "hard": true, "usedBy": {} }]
  }
}
```

`preferences` 的默认值（`normalizePlayerPreferences`）：
`cps:10, textRevealDuration:120, gameSpeed:1, autoForward:false, autoForwardDelay:3000, showDialog:true,
skip:true, skipReadText:false, skipDelay:0, skipInterval:100, globalVolume:1, bgmVolume:1, soundVolume:1,
voiceVolume:1, voiceEndMode:"stop", voiceFadeDuration:0, muteOnWindowBlur:false`

**关于 `dependencies`**：`authoredVersion` 必须等于**本机已安装**的插件版本，否则 Studio 会报「插件不可用」。
版本从 `%APPDATA%\NarraLeaf Studio\plugins\plugin-registry.json` 的
`plugin.records.<id>.manifest.version` 读。**整张表省略也可以**——此时 Studio 保守地把所有已启用插件都装进运行时，
代价是开发模式会提示「某插件不在依赖表中」。建议写上，且每次 Studio 更新插件后重跑 `patch-config.mjs`。

## 2. 目录布局

```
<工程>/
  <名字>.nlproj
  .nlstudio/                     Studio 自己的元数据（editor.json 等）
  assets/
    assets.metadata.<类>.json     资产元数据：id → {id,type,name,hash,source,meta,tags,description,groupId}
    assets.groups.<类>.json       分组  id → {id,name,category,createdAt,updatedAt}
    assets.order.<类>.json        {"assetIds":[...],"groupIds":[...]}
    content/<2>/<2>/<28>          资产本体：资产 id 去掉连字符后 2/2/28 切分
  editor/
    story/index.json              {schemaVersion:2, stories:[{id,name,documentPath,...}], defaultStoryId}
    story/stories/<storyId>/storydoc.json    ★ 剧本
    variables.json                {entries:{id:{defaultValue,id,name,scope,storageKey,valueType}},schemaVersion:2}
    services/character.json       角色
    ui/uidoc.json                 界面（几百 KB 的元件树）
    ui/uigraphs.json              蓝图（标题画面的「开始游戏」在这里）
    localization/keys.json        界面文案目录 + <locale>.json 翻译
    save-schema.json / audio-tracks.json / brand.json / app-tags.json / dlc.json
  resources/characters/avatars/<角色id>/<poseId>.png   对话头像（608×608）
```

类的取值：元数据分片 `audio/blueprint/font/image/json/model/other/video`；
分组与排序分片 `data/font/image/media/model/other`。

**资产本体路径**：`assetId.replace(/-/g,'')` → `[0:2]/[2:4]/[4:32]`。

## 3. 角色（`editor/services/character.json`）

```jsonc
{
  "characters": [{
    "profile": {
      "id": "<uuid>",
      "name": "白石 遥",
      "nicknames": [], "tags": [], "thumbnail": null, "attributes": {}, "description": "",
      "appearance": {
        "kind": "preset",
        "defaultPoseId": "normal",
        "poses": [{
          "assetId": "<图片资产 id>",     // 整张立绘
          "id": "normal", "name": "普通",
          "portrait": { "x": 0.267, "y": 0.045, "w": 0.467, "h": 0.30 }   // 归一化裁剪框，用来烘头像
        }],
        "avatars": { "normal": { "baked": "bcc76075" } }   // 头像缓存键，取头像 png 的 sha256 前 8 位即可
      },
      "entranceTransform": {                              // 这个角色的固定站位
        "position": { "xalign": 0.28, "yalign": 0.52, "yoffset": 0 },
        "zoom": 0.62
      }
    }
  }],
  "groups": {}, "version": 2
}
```

* **没有立绘的角色**（主角）：`appearance: { defaultPoseId: null, kind: "preset", poses: [] }`，不要写 `avatars`。
* 立绘站位是**每个角色一个**（`entranceTransform`），所以多人同框时各占各的位置，不需要在剧本里指定坐标。
* 主角也要在 `characters` 里有一条，否则对白名字牌取不到名字。

## 4. 资产库写入要点

写一个新资产要同时做三件事，缺一不可：

1. 把二进制写到 `assets/content/<2>/<2>/<28>`
2. 在 `assets.metadata.<类>.json` 里登记 `{id,type,name,hash:<sha256 hex>,source:"local",meta:{},tags:[],description:"",groupId}`
3. 把 id 追加进 `assets.order.<类>.json` 的 `assetIds`（`groupIds` 保持与 groups 一致）

`meta` 留 `{}` 即可（骨架模板也是空的）。分组可以把 `groupId` 指向已有的组，也可以新建。

**模板自带的资产要保留**：标题画面用的两张背景（`93bad884…`、`5322b0e3…`）与三个界面音效
（`e54ece05…`、`8ceaaf48…`、`2c8f3d76…`）都被 `uidoc.json` / `uigraphs.json` 直接引用，
删掉会让标题画面缺图、按钮没声音。所以是**合并**，不是覆盖。

## 5. 界面与蓝图里的硬编码 id

`uidoc.json` / `uigraphs.json` 里写死了骨架模板的故事 id 与入口场景 id：

```
"type": "blueprint.game.startStory",
"params": { "storyId": "71bb159f-1322-4539-b09f-9593a426a67d",
            "sceneId": "f306e2d5-70c0-421b-ba8a-c7b2d3ce9d33" }
```

**所以新工程的 `storyId` 必须沿用 `71bb159f-1322-4539-b09f-9593a426a67d`，
入口场景必须占用 `f306e2d5-70c0-421b-ba8a-c7b2d3ce9d33` 这个 uuid。**
toolkit 的 `sceneUuid()` 已经这么做了：`entryScene` 这个场景固定映射到那个 uuid，其它场景由名字稳定派生。

标题画面的游戏名是 `uidoc.json` 里一个 `nl.text` 元件的 `"text": "你的游戏"`，`patch-ui.mjs` 会替换它。

## 6. 项目信任（project trust）

从模板向导以外的方式创建的工程，第一次打开会弹「项目信任」窗口，点「信任」后才能运行 / 预览 / 构建。
信任状态存在 `%APPDATA%\NarraLeaf Studio\authorization\project-trust.json`，按**绝对路径**记账，
同一路径以后再打开不会再问。用 CDP 驱动 GUI 时可以点掉它：

```js
[...document.querySelectorAll('button')].find(b => b.innerText.trim() === '信任').click()
```

## 7. 目录以外的运行态

* Studio 是**单实例**应用：已经有实例在跑时，再启动一次只会把请求转交给旧实例，
  `--remote-debugging-port` 会被忽略。要驱动 GUI 必须先关掉旧实例。
* 启动参数直接给 `.nlproj` 路径就会打开该工程：
  `"NarraLeaf Studio.exe" "C:\...\星屑放课后.nlproj" --remote-debugging-port=9222`
* Studio 会**自动检查并静默安装更新**。更新过程中 `NarraLeaf Studio.exe` 会短暂消失（安装包替换），
  脚本里遇到「找不到文件」先确认是不是正在升级，等安装进程结束再继续。
* App 内部资源在 `resources/app.asar`（打包）与 `resources/app.asar.unpacked`（未打包）两处。
  逆向读源码时用 `.unpacked` 那一份（`/dist/main/index.js` 是主进程 bundle，minified）。
