# 《星屑放课后》剧本格式 `.nls` 规范 v1

> 这是编剧唯一需要读的文件。你写的是**纯文本剧本**（扩展名 `.nls`），
> 由 `galgame-tools/build-story.mjs` 编译成 NarraLeaf Studio 的 storydoc。
> **只能使用本文件列出的指令、ID 与角色名。** 用错会在编译时报错。

---

## 1. 基本规则

* 文件是 UTF-8 纯文本，一行一条。空行忽略。以 `#` 开头的整行是注释。
* 一个文件里可以写多个场景，每个场景以 `@scene` 开头。
* 指令行以 `@` 开头；选项行以 `>` 开头；其余都是台词行。
* 中文标点：引号「」、破折号——、省略号……。台词本身**不要**再加外层引号。
* `{name}` 会被替换成主角名「星野悠」。
* 缩进不重要，但请用两个空格缩进 `@if` 内部，方便阅读。

---

## 2. 台词行

| 写法 | 含义 |
|---|---|
| `* 走廊里还留着粉笔的味道。` | **旁白**（无名牌） |
| `悠: 我只是想再看一会儿。` | 主角说话（名字牌显示「星野悠」） |
| `遥: 哟，还在这儿磨蹭什么？` | 角色说话 |
| `遥\|smile: 嘿嘿。` | 说话并**切换到该表情**（`\|` 前是角色名，后是表情 id） |

可用角色名（只能用这些）：

| 剧本里写 | 角色 |
|---|---|
| `悠` | 星野 悠（主角，无立绘） |
| `遥` | 白石 遥 |
| `澪` | 冬月 澪 |
| `灯里` | 神代 灯里 |
| `智也` | 小暮 智也 |
| `萩原` | 萩原 玲子（顾问老师） |

可用表情 pose（只能用这些，写错会退回 `normal` 并给出警告）：

`normal` `smile` `sad` `angry` `surprise` `shy`

> `悠` 没有立绘，给他写表情会被忽略。

---

## 3. 演出指令

| 指令 | 说明 |
|---|---|
| `@bg <bgId>` | 切换背景（淡入淡出） |
| `@bgm <bgmId>` | 切换背景音乐 |
| `@bgm off` | 停止音乐 |
| `@show <角色> <pose>` | 立绘登场（站位由角色设定固定，不用写位置） |
| `@expr <角色> <pose>` | 只换表情（角色须已在台上） |
| `@hide <角色>` | 退场 |
| `@hideAll` | 全部退场 |
| `@camera zoom <倍数>` | 镜头推近（如 `@camera zoom 1.12`） |
| `@camera reset` | 镜头复位 |
| `@ending <结局名>` | **结局节点**：故事在此结束，显示结局名 |

**背景 bgId（只能用这些）**：

`classroom_day` `classroom_evening` `classroom_night` `hallway_day`
`rooftop_day` `rooftop_sunset` `rooftop_night` `library`
`courtyard_sakura` `clubroom` `clubroom_night` `riverside_sunset`
`festival_night` `station_night` `observatory` `black`

**BGM bgmId（只能用这些）**：

`title` `daily` `bright` `romance` `sad` `tense` `mystery` `festival` `ending`

---

## 4. 变量与分支

```
@set progress = 1
@set flag_kiss = true
@set note = "some text"

@if flag_kiss
  * 她把伞往我这边斜了一点。
@else
  * 雨声把两个人之间填满了。
@endif

@if affinity >= 3
  ...
@endif
```

* `@if <变量>` —— 布尔变量直接写名字。
* `@if <变量> <运算> <值>` —— 运算：`==` `!=` `>` `>=` `<` `<=`；值可以是数字、`true`/`false`、或 `"字符串"`。
* `@else` / `@endif` 必须成对；**支持嵌套**（缩进只是给人看的）。
* 变量名用小写字母、数字、下划线。用 `p_` 前缀的变量会存成「跨存档持久变量」（例如 `p_true_unlocked`），其余存成「存档内变量」。
* 变量类型由**第一次赋值**推断：`true/false` → 布尔，数字 → 数值，`"..."` → 字符串。同一个变量前后类型必须一致。

---

## 5. 选项

```
@choice 我们要做什么？
> 做点真心的东西。 -> c_day1_honest
> 做点真的会有人来的东西。 -> c_day1_loud
```

```
@choice 追上去吗？
> 追上去。 -> hr_good_start
> 留在原地。 -> hr_normal_start
```

```
@choice （她低着头，等我说点什么。）
> 「今天也一起回去吧。」 -> c_walk_home
> 什么也没说。 -> c_silent
```

* `@choice <提示语>` 后面紧跟若干 `>` 行。
* `> 选项文字 -> 场景id` 跳到另一个场景；`-> 场景id` 可以省略，省略时**继续执行紧接着的下一行**（选项后的第一行内容 = 该选项的后续分支）。
* 同一个 `@choice` 的选项里，**不要混用**「跳转」和「不跳转」——要么全部都写 `->`，要么全部都不写。

---

## 6. 场景、章节与跳转

```
@chapter 第一章 星屑的约定

@scene c_prologue | 序章 · 只剩一个人的天文社
@bg classroom_evening
...
@jump c_day1_intro
```

* `@chapter <章节名>` 声明后续场景属于哪一章。一个文件开头必须至少有一个 `@chapter`。
* `@scene <场景id> | <场景名>` —— 场景 id 用下划线小写，**全局唯一**，命名前缀见第 7 节。
* `@jump <场景id>` 用于跳到另一个场景。
* 场景的**最后一个演出动作**必须是 `@jump` 或 `@ending`（或者以 `@choice` 结尾，且所有选项都带 `->`），否则玩家会卡在场景末尾。

---

## 7. 文件与前缀分工（防止场景 id 撞名）

| 文件 | 场景 id 前缀 | 内容 |
|---|---|---|
| `scripts/00_common.nls` | `c_` | 序章 + 共通线（三天自由行动 + 星见祭） |
| `scripts/10_haruka.nls` | `hr_` | 白石遥线（入口场景 `rt_haruka`） |
| `scripts/20_mio.nls` | `mi_` | 冬月澪线（入口场景 `rt_mio`） |
| `scripts/30_akari.nls` | `ak_` | 神代灯里线（入口场景 `rt_akari`） |
| `scripts/40_endings.nls` | `ed_` / `zz_` | 独自结局（入口 `rt_alone`）+ TRUE 线（`zz_true`） |

**场景 id 全局唯一**，跨文件也不能重名。

---

## 8. 自检

写完跑：

```powershell
cd <你的工程目录>-tools
node build-story.mjs --check
```

它会报出：未定义的角色名 / 表情 / 背景 / BGM、跳转目标不存在、`@if` 未闭合、场景没有结尾等问题。
**必须 0 错误**才算完成。
