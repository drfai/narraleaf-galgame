/**
 * 每个 galgame 一份的游戏配置。
 *
 * 这是**模板**：新开游戏时跑一次
 *     node init.mjs --name "游戏名" --dir "工程目录"
 * init 会把它复制到 `<工程目录>-tools\game.config.mjs` 并填好路径，
 * 之后你只需要改那一份，不用改这里。
 *
 * 里面的角色 / 背景 / BGM 清单是一套可以直接构建的默认值，
 * 想让游戏先跑起来可以照用，之后再按自己的设定替换。
 */
export default {
    // ── 机器相关，留空自动探测
    studioDir: '',          // NarraLeaf Studio 安装目录，例如 'C:\\Users\\me\\AppData\\Local\\Programs\\NarraLeaf Studio'
    chromePath: '',         // 用于 SVG→PNG 渲染的 Chrome/Edge，留空自动探测

    // ── 工程（init.mjs 会覆盖这几项）
    projectName: '我的galgame',
    projectDir: '',                                    // ← 工程目录，init 会填
    workDir: '',                                       // ← 渲染中间产物目录，留空则放在工程旁边
    appId: 'com.example.mygame',
    description: '',
    author: '',
    version: '1.0.0',
    sourceLocale: 'zh-CN',
    resolution: { width: 1920, height: 1080 },
    dependencies: ['narraleaf.gallery', 'narraleaf.quick-save'],   // 项目用到的插件；版本按本机已安装的写

    // ── 故事。storyId / entrySceneUuid 对应骨架模板里被界面蓝图写死的两个 id，
    //      **不要改**，否则标题画面的「开始游戏」找不到故事。
    storyId: '71bb159f-1322-4539-b09f-9593a426a67d',
    storyName: '我的galgame',
    entryScene: 'c_prologue',
    entrySceneUuid: 'f306e2d5-70c0-421b-ba8a-c7b2d3ce9d33',
    titleSurfaceId: 'narraleaf-studio:main-surface',

    // ── 角色。script = 剧本里写的称呼；sprite=false 表示没有立绘（主角）
    characters: [
        { key: 'yuu', script: '悠', name: '星野 悠', sprite: false },
        { key: 'haruka', script: '遥', name: '白石 遥', sprite: true },
        { key: 'mio', script: '澪', name: '冬月 澪', sprite: true },
        { key: 'akari', script: '灯里', name: '神代 灯里', sprite: true },
        { key: 'tomo', script: '智也', name: '小暮 智也', sprite: true },
        { key: 'hagiwara', script: '萩原', name: '萩原 玲子', sprite: true },
    ],

    // ── 表情。art/characters.mjs 必须为每个有立绘的角色画出所有这些表情
    poses: ['normal', 'smile', 'sad', 'angry', 'surprise', 'shy'],
    poseNames: { normal: '普通', smile: '微笑', sad: '难过', angry: '生气', surprise: '惊讶', shy: '害羞' },

    // ── 立绘在舞台上的固定站位（每个角色一个，多人同框不会重叠）
    stage: {
        haruka: { xalign: 0.28, yalign: 0.52, yoffset: 0, zoom: 0.62 },
        mio: { xalign: 0.50, yalign: 0.52, yoffset: 0, zoom: 0.62 },
        akari: { xalign: 0.72, yalign: 0.52, yoffset: 0, zoom: 0.62 },
        tomo: { xalign: 0.34, yalign: 0.52, yoffset: 0, zoom: 0.58 },
        hagiwara: { xalign: 0.66, yalign: 0.52, yoffset: 0, zoom: 0.58 },
    },

    // ── 背景。art/ 下的 bg_*.mjs 必须为每个 id 生成一张 1920x1080 的 PNG
    backgrounds: [
        { id: 'classroom_day', name: '教室·白天' },
        { id: 'classroom_evening', name: '教室·黄昏' },
        { id: 'classroom_night', name: '教室·夜' },
        { id: 'hallway_day', name: '走廊·白天' },
        { id: 'rooftop_day', name: '天台·白天' },
        { id: 'rooftop_sunset', name: '天台·黄昏' },
        { id: 'rooftop_night', name: '天台·星空' },
        { id: 'library', name: '图书馆' },
        { id: 'courtyard_sakura', name: '樱花中庭' },
        { id: 'clubroom', name: '天文社活动室' },
        { id: 'clubroom_night', name: '天文社活动室·夜' },
        { id: 'riverside_sunset', name: '河堤·黄昏' },
        { id: 'festival_night', name: '星见祭夜市' },
        { id: 'station_night', name: '车站·夜' },
        { id: 'observatory', name: '天文台圆顶' },
        { id: 'black', name: '黑场' },
    ],

    // ── BGM。audio/make-audio.mjs 必须为每个 id 生成 <file>
    bgms: [
        { id: 'title', name: '标题', file: 'title.wav' },
        { id: 'daily', name: '日常', file: 'daily.wav' },
        { id: 'bright', name: '明快', file: 'bright.wav' },
        { id: 'romance', name: '恋爱', file: 'romance.wav' },
        { id: 'sad', name: '悲伤', file: 'sad.wav' },
        { id: 'tense', name: '紧张', file: 'tense.wav' },
        { id: 'mystery', name: '星空·悬念', file: 'mystery.wav' },
        { id: 'festival', name: '星见祭', file: 'festival.wav' },
        { id: 'ending', name: '结局', file: 'ending.wav' },
    ],
};
