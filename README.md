# narraleaf-galgame

**用代码做一个完整的、能玩的 galgame —— 然后交给 [NarraLeaf Studio](https://www.narraleaf.com/) 编辑、预览、打包。**

这是一个给 AI 编程助手（DeepSeek Harness / Claude Code 等支持 `SKILL.md` 的宿主）用的 **skill**：
它把「剧本 → 剧本图、文字 → 美术、参数 → 音乐」整条链路做成可重复执行的工具链，
产出的是一份**真正符合 NarraLeaf Studio 工程格式**的项目，而不是另起炉灶的网页引擎。

> Demo 就是仓库里这套默认内容跑出来的：**41 个场景 / 2264 行对白 / 8 个结局 / 10 章**，
> 16 张背景 + 30 张立绘 + 9 首 BGM 全部由代码生成，仓库里**没有一个二进制素材**。

```
《星屑放课后》
废部倒计时三十天，只剩一个人的天文社，和三个把心愿寄放在星空里的女孩。
夏天结束的时候，你必须决定——把望远镜对准谁。
```

---

## 它解决什么问题

做 galgame 的重复劳动几乎都在「把文字变成引擎能吃的格式」上。这个 skill 把这几件事固化成命令：

| 你写 | 它生成 |
|---|---|
| `scripts/*.nls`（纯文本剧本） | NarraLeaf 的 `storydoc.json`（场景 / 故事块图 / 选项 / 条件 / 跳转 / 结局） |
| `art/bg_*.mjs`（SVG 生成函数） | 16 张 1920×1080 背景 PNG + 资产库登记（含 sha256、分组、分片存放） |
| `lib/charbase.mjs` + `art/characters.mjs`（一套参数化画法 + 每个角色的配色） | 30 张 900×1400 透明立绘 + 608×608 对话头像 + `character.json` |
| `audio/make-audio.mjs`（和弦进行参数表） | 9 首 22050 Hz 单声道 16-bit、**无缝循环**的 BGM WAV |
| `game.config.mjs` | `.nlproj`（msgpack 项目配置）、变量表、角色表、插件依赖表 |

外加一个**真机验收**回路：通过 CDP 驱动 Studio 的 Dev Mode，点进游戏里读 DOM，
确认标题画面在、点击能推进、选项能弹出、背景与立绘真的加载、**运行日志 0 错误 0 警告**。

---

## 环境要求

本工具链是 **[NarraLeaf Studio](https://github.com/NarraLeaf/NarraLeaf-Studio)** 的配套工具，
必须先装好 Studio 本体：

| 依赖 | 说明 |
|---|---|
| **[NarraLeaf Studio](https://github.com/NarraLeaf/NarraLeaf-Studio)** | 目标编辑器 / 运行时。本工具链针对 **v1.4.5** 实测（[release 页面](https://github.com/NarraLeaf/NarraLeaf-Studio/releases/tag/v1.4.5)，Windows 装 `NarraLeaf-Studio-Setup-1.4.5-x64.exe`）。默认装在 `%LOCALAPPDATA%\Programs\NarraLeaf Studio`，会自动探测 |
| Node.js 18+ | 用到 `fs.cpSync` 与内置 `WebSocket`，建议 20 以上 |
| Chrome 或 Edge | 把 SVG 渲染成 PNG，会自动探测 |

> 上游项目：[NarraLeaf/NarraLeaf-Studio](https://github.com/NarraLeaf/NarraLeaf-Studio)（*All-in-one IDE for NarraLeaf Projects*，MPL-2.0）
> 官网：<https://www.narraleaf.com> · 全部版本：<https://github.com/NarraLeaf/NarraLeaf-Studio/releases>
>
> 本仓库**不分发** Studio 的任何代码或素材，只在你本机上调用已安装的 Studio。

---

## 安装

作为 skill 装进你的宿主（DSH 会扫描 `~/.dsh/skills` 与 `~/.agents/skills`，一层目录一个 skill）：

```bash
git clone https://github.com/<you>/narraleaf-galgame.git "%USERPROFILE%\.dsh\skills\narraleaf-galgame"
```

或者 Claude Code 之类的宿主：

```bash
git clone https://github.com/<you>/narraleaf-galgame.git ~/.claude/skills/narraleaf-galgame
```

装好后直接对助手说「**用 narraleaf-galgame 做一个 XX 题材的 galgame**」即可。

---

## 直接手动用

不一定需要 AI 助手，工具链本身就能跑。

```bash
# 1. 开一个新游戏（会复制一份 toolkit 到 <工程目录>-tools，每个游戏一份互不干扰）
node toolkit/init.mjs --name "银河食堂" --dir "D:\games\银河食堂"

# 2. 之后的日常都在复制出来的那份里
cd "D:\games\银河食堂-tools"
node build-all.mjs --story   # 改完 scripts/*.nls 重编译剧本（几秒）
node build-all.mjs           # 美术/音乐也重做
node play.mjs                # 开始游戏
node play.mjs --stop         # 关掉 Studio
```

`init.mjs` 会：复制 toolkit → 写配置 → 用 Studio 自带模板生成工程 → 全量构建（约 3–5 分钟，46 张图 + 9 首曲子）。

---

## 剧本长什么样

`.nls` 是纯文本，编剧不需要碰 JSON：

```
@chapter 第一章 只有一个月
@scene c_day1_intro | 第一天 · 今天去找谁
@bg classroom_day
@bgm daily
* 粉笔灰在窗边的光里飘着。
遥|smile: 呐，{name}，你在发呆的时候，嘴角会往下掉一点点哦。
悠: ……大概吧。
@if flag_roof_promise
  * 我想起昨天天台上的风。
@endif
@choice 今天，去找谁？
> 去操场，白石遥应该还在跑。 -> c_d1_haruka
> 去图书馆，那里总有人在看书。 -> c_d1_mio
> 去学生会室，先把规则问清楚。 -> c_d1_akari
```

编译时做完整校验：角色名 / 表情 / 背景 / BGM 是否白名单内、`@if` 是否闭合、
跳转目标是否存在、场景结尾会不会让玩家卡住。`node build-story.mjs --check` 只校验不写文件。

完整语法见 [`toolkit/docs/SCRIPT_FORMAT.md`](toolkit/docs/SCRIPT_FORMAT.md)，
「怎么把一句设定变成角色表 / 路线表 / 场景 id 清单」见 [`toolkit/docs/STORY_BIBLE.md`](toolkit/docs/STORY_BIBLE.md)。

---

## 仓库结构

```
SKILL.md                 助手读的说明书：工作流、改哪些文件、交付前的验收清单
references/
  project-format.md      NarraLeaf 工程格式：.nlproj（msgpack）、目录布局、资产分片、
                         character.json、界面蓝图里写死的 id、项目信任、单实例与自动更新
  storydoc-schema.md     剧本图全部 block 类型与 payload 形状（逐条实测）
  pitfalls.md            踩过的坑
toolkit/
  init.mjs               开新游戏
  game.config.mjs        游戏配置模板
  lib/config.mjs         配置解析 + Studio/Chrome 自动探测
  lib/ids.mjs            稳定 ID 派生（同一个名字每次构建得到同一个 uuid）
  lib/charbase.mjs       参数化立绘绘制基座（头/发/眼/眉/嘴/腮红/服装/配饰）
  build-story.mjs        .nls 剧本编译器（含校验）
  create-project.mjs     复刻 Studio 的「新建项目」（msgpack 写 .nlproj）
  register-assets.mjs    图片/音频 → 资产库 + 立绘 + 头像 + character.json
  render-svg.mjs         SVG 模块 → PNG（无头 Chrome，失败重试 + 非零退出）
  png-stats.mjs          纯 Node 的 PNG 解码与统计（没有眼睛时怎么验收美术）
  patch-config.mjs       就地更新 .nlproj（插件依赖版本按本机已安装的写）
  patch-ui.mjs           替换界面占位文字
  build-all.mjs          一键全量构建
  cdp.mjs / play.mjs     驱动 Studio 做验收 / 一键启动游戏
  art/                   bg_a~bg_d.mjs（16 张背景）+ characters.mjs（5 名角色）
  audio/make-audio.mjs   9 首合成 BGM
  scripts/*.nls          示例剧本（41 场 / 2264 行 / 8 结局）
  docs/                  剧本格式 + 设定集
```

---

## 几个关键事实

这些是逆向 NarraLeaf Studio 1.4.5 得到的，写在这里省得别人再踩一遍：

* `.nlproj` 是 **MessagePack**（Studio 自带 `msgpack-lite`，可直接 require）。
* 标题画面的「开始游戏」蓝图把 `storyId` 和入口场景 uuid **写死**在 `uigraphs.json` 里，
  所以新工程必须沿用模板那两个 id。工具链的 `sceneUuid()` 已经处理了。
* 停 BGM 不能发 `stopSound`（会报「音效 sound 未在播放」），要用**不带 `assetId` 的 `setBgm`**。
* 插件依赖表里的版本号必须等于**本机已安装**的版本，否则 Studio 判为「插件不可用」。
* Studio 是**单实例**应用：已有实例在跑时重新启动只会把请求转交过去，`--remote-debugging-port` 会被忽略。
* Studio 会**静默自动更新**，安装期间 `exe` 会短暂消失。

更多见 [`references/pitfalls.md`](references/pitfalls.md)。

---

## English

A skill + toolkit that builds a **complete, playable visual novel** as a genuine
[NarraLeaf Studio](https://www.narraleaf.com/) project — story graph, characters, backgrounds, BGM and
multiple endings, all authored as code (plain-text script → SVG art → synthesized audio) and verified by
actually launching the game and reading its DOM. The repository contains **no binary assets**: every
background, sprite and music track is generated by the scripts.

```bash
node toolkit/init.mjs --name "My Game" --dir "D:\games\MyGame"
cd "D:\games\MyGame-tools"
node build-all.mjs && node play.mjs
```

Requires NarraLeaf Studio, Node 18+, and Chrome/Edge. See `SKILL.md` for the workflow and
`references/` for the reverse-engineered project format.

---

## 声明 / Notices

* 本项目是 **[NarraLeaf Studio](https://github.com/NarraLeaf/NarraLeaf-Studio) 的非官方配套工具**，
  与 NarraLeaf 组织及其作者无隶属关系，也未获其背书。
* 仓库**不包含** NarraLeaf Studio 的任何代码或素材。工具链在构建时读取你本机安装的
  Studio 自带的工程模板（`resources/resources/templates/skeleton`）作为起点——
  其中的少量模板素材（标题画面背景、界面音效）会留在你自己的工程里，版权归原作者所有。
* 目标版本：**NarraLeaf Studio v1.4.5**
  （[release](https://github.com/NarraLeaf/NarraLeaf-Studio/releases/tag/v1.4.5)）。
  工程格式（`.nlproj` 的 msgpack 字段、`storydoc.json` 的 block 形状）是逐项实测得来的，
  Studio 升级大版本后可能需要重新核对——`references/` 里记的就是这一版的事实。
* 示例剧本、美术与音乐均为本项目原创（由工具链生成），随 MIT 协议提供。
* NarraLeaf Studio 采用 **MPL-2.0**（见其仓库 `LICENSE`）；其运行时 `narraleaf-react` 亦为 MPL-2.0。
  本仓库以 MIT 发布，两者互不影响。

## License

MIT — 见 [LICENSE](LICENSE)。
