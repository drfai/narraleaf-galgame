# 踩过的坑（都是实测踩出来的）

## 一、工程与工具链

### `stopSound` 不能用来停 BGM
`{ "action": "audio", "operation": "stopSound", "audioTrackId": "bgm" }` 会报运行时错误
**「音效 "sound" 未在播放；需要由此前的音效行开始播放」**——非 `setBgm` 的操作会去解析「名字」对应的音源，
解析不到就报错，而 `audioTrackId` 不参与这个解析。
**停 BGM 的正确写法是 `setBgm` 不带 `assetId`**：

```json
{ "action": "audio", "operation": "setBgm", "audioTrackId": "bgm", "fadeMs": 900 }
```

runtime 里 `operation === "setBgm" && !assetId` 就是「把背景音乐设为 null」。

### 插件依赖表的版本号必须等于本机已安装版本
写了 `dependencies` 但 `authoredVersion` 对不上（例如 Studio 升级把 gallery 从 3.1.0 变成 3.3.0），
Studio 会判定该依赖 **suppressed / 不可用**，在仪表盘上显示「本项目需要的 1 个插件不可用」。
版本从 `%APPDATA%\NarraLeaf Studio\plugins\plugin-registry.json` 实时读，别写死。

### Studio 是单实例，`--remote-debugging-port` 会被忽略
已经有实例在跑（托盘常驻）时，再启动一次只会把打开请求转交给旧实例，新进程立刻退出，
调试端口根本没开。**要驱动 GUI 必须先 `taskkill /IM "NarraLeaf Studio.exe" /F`**。

### Dev Mode 的 `entry` 参数是必需的
`devMode.launch(projectPath, entry)` 里 `entry` 不能省，否则主进程 `describeEntry` 读 `entry.kind` 报
`TypeError: Cannot read properties of undefined (reading 'kind')`，返回 `{status:"error"}`。
合法取值：

```js
{ kind: 'surface', surfaceId: 'narraleaf-studio:main-surface' }     // 标题画面
{ kind: 'story', storyId: '<storyId>', sceneId: '<场景 uuid>' }      // 直接进某个场景
{ kind: 'extension', extensionId: '<插件 id>' }
```

### Studio 会静默自动更新
启动时会检查更新，下载完成后**退出即安装**。安装期间 `NarraLeaf Studio.exe` 会消失几十秒，
脚本会报「系统找不到指定的文件」。等 `NarraLeaf-Studio-Setup-*.exe` 进程结束后再继续。

### 应用内资源分两处
`resources/app.asar`（打包）与 `resources/app.asar.unpacked`（未打包）。
**逆向读源码要读 `.unpacked` 那份**；只存在于 asar 里的文件（例如 `/dist/main/index.js`）需要自己解 asar
（标准格式：偏移 4 读 pickle size、偏移 12 读 header JSON 长度、JSON 在 16 起、内容基址 = 8 + pickleSize）。
注意 asar 条目里 `"unpacked": true` 的**没有 offset**，内容是实体文件在 `.unpacked` 目录下。

## 二、这个 harness 上的操作坑

### PowerShell 读写 UTF-8 中文文件会毁掉内容
`Get-Content -Raw | Set-Content` 会把中文变成乱码（编码被按 GBK 解释）。
**所有含中文的文本文件一律用 `read` / `write` / `edit` 工具操作，不要过 PowerShell 管道。**

### 模型可能没有图像输入能力
如果 `read_image` 报「model does not declare image input」，就别指望肉眼验收美术。改用程序化验证：

* `toolkit/png-stats.mjs`：纯 Node 解 PNG，报尺寸 / 不透明覆盖率 / 包围盒 / 颜色数 / 主色分布
* 用无头 Chrome 画「像素探针」页，在**归一化坐标点位采样实际 RGB**，确认主体元素落在预期位置
  （这一招在一个只有代码没有眼睛的场景下非常有效：樱花树冠误用 `circle` 导致纵向拉长埋掉树干、
  河堤左下角露出一块透明，都是这样查出来的）
* 判断「是不是画成了纯色块」：`distinctColors` 太小、或单色占比 > 90%
* 注意 `black` 这种**纯黑背景**必然只有 1 种颜色，这是期望结果，不要当成失败

### 截图可以照，但别声称看过
`Page.captureScreenshot` 存 PNG 给用户看是没问题的；但如果没有图像输入能力，
**不要描述画面内容**，只能说「已截图，请自行查看」。

## 三、剧本图

### 场景必须以跳转 / 结局收尾
最后一个块不是 `jump` / `ending` / 全跳转的 `choice`，玩家会卡在场景末尾。
toolkit 的编译器会就此发**警告**（不是错误），改稿时别忽略。

### `@choice` 与它的 `>` 选项之间不能夹普通台词
toolkit 的解析器允许夹 `@camera` 之类的**指令**（会把它挪到选项块之前），
但夹台词会让选项失去归属。写的时候老老实实「先提示语、紧跟选项」。

### 同一个 `@choice` 不要混用带 `->` 和不带 `->` 的选项
带 `->` 的选项下面挂一个 jump 块；不带 `->` 的选项表示「继续执行选项之后的块」。
混用会让一部分选项继承到另一部分的内容。

### 变量类型一旦确定就不能变
`@set flag = true` 之后再 `@set flag = 1` 会被编译器拒绝（Studio 侧的类型也会错乱）。
布尔、数值、字符串三者分开用。

### 结局不是跳转
`{ "control": "ending" }` 让故事**终止**。如果还想要「回到标题」，那是界面蓝图（uigraphs）的活，
不是剧本的活；剧本里写 jump 是没用的。

## 四、资产

### 资产要三处同时写
内容文件 + `metadata`（含 sha256）+ `order`。只写内容文件，Studio 里看不到；
只写 metadata 不写内容，运行时报资源加载失败。

### 模板自带资产要保留
标题画面的两张背景与三个界面音效被 `uidoc.json` / `uigraphs.json` 直接引用（`assetId` / `soundAssetId`）。
新资产是**追加**，不要清空 metadata 文件。

### 头像的 `baked` 字段
`profile.appearance.avatars.<pose>.baked` 是缓存键。取头像 PNG 的 sha256 前 8 位就行；
对不上最多让 Studio 重新烘一次，不会坏。

### 立绘站位是「每个角色一个」
`entranceTransform.position` 属于**角色**而不是某一次出场。所以三个人同框不会重叠的前提是
你在 `character.json` 里给他们设了不同的 `xalign`。剧本里没有「放左边/放右边」这种参数。
