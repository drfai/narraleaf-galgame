/**
 * 程序化生成的 SVG 背景美术 —— 视觉小说《星屑放课后》用。
 *
 * 约定
 *  - 默认导出 { [bgId]: (w, h) => '<svg ...>…</svg>' }，共 16 个背景。
 *  - 所有坐标都由 w/h 推导（内部统一用 X(u)/Y(v) 归一化助手），
 *    因此同一份代码出 1920×1080 或缩略图都成立，不写死像素。
 *  - <defs> 里的 id 一律带背景前缀（如 classroom_day_sky），
 *    多张图被塞进同一个 HTML 页面也不会互相抢 id。
 *  - 不使用 Math.random()：随机感来自固定种子的 mulberry32，
 *    同一 id 每次渲染完全一致。
 *  - 画风：扁平化日式动画背景。层次固定为
 *      天空/远景色块渐变 → 中景建筑或家具 → 近景遮挡物
 *      → 光效（光斑 / 光束）→ 暗角 → 粒子（花瓣 / 星点）
 *  - 不出现任何文字（无 <text>）、不画人物。
 */

// ============================================================== 基础工具

/** 固定种子伪随机（mulberry32）。 */
function makeRng(seed) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** 取 [a, b) 区间的伪随机数。 */
const span = (rng, a, b) => a + (b - a) * rng();
/** 从数组里取一个（确定性）。 */
const pick = (rng, list) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

/** 坐标/尺寸保留一位小数，减小文件体积。 */
const n1 = (v) => Math.round(v * 10) / 10;
const pts = (list) => list.map(([x, y]) => `${n1(x)},${n1(y)}`).join(' ');
const dPath = (list, close = true) =>
    `M ${list.map(([x, y]) => `${n1(x)} ${n1(y)}`).join(' L ')}${close ? ' Z' : ''}`;

const rect = (x, y, rw, rh, attrs) =>
    `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(Math.max(0, rw))}" height="${n1(Math.max(0, rh))}" ${attrs}/>`;
const poly = (list, attrs) => `<polygon points="${pts(list)}" ${attrs}/>`;
const path = (list, attrs, close = true) => `<path d="${dPath(list, close)}" ${attrs}/>`;
const line = (x1, y1, x2, y2, attrs) =>
    `<line x1="${n1(x1)}" y1="${n1(y1)}" x2="${n1(x2)}" y2="${n1(y2)}" ${attrs}/>`;
const circle = (cx, cy, r, attrs) => `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r)}" ${attrs}/>`;
const ellipse = (cx, cy, rx, ry, attrs) =>
    `<ellipse cx="${n1(cx)}" cy="${n1(cy)}" rx="${n1(rx)}" ry="${n1(ry)}" ${attrs}/>`;

const stops = (list) => list
    .map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"`
        + (op == null ? '' : ` stop-opacity="${op}"`) + '/>')
    .join('');

/** 线性渐变（默认 objectBoundingBox，自上而下）。 */
const lin = (id, list, o = {}) =>
    `<linearGradient id="${id}" x1="${o.x1 ?? 0}" y1="${o.y1 ?? 0}" x2="${o.x2 ?? 0}" y2="${o.y2 ?? 1}">`
    + `${stops(list)}</linearGradient>`;

/** 径向渐变（objectBoundingBox）。 */
const rad = (id, list, o = {}) =>
    `<radialGradient id="${id}" cx="${o.cx ?? 0.5}" cy="${o.cy ?? 0.5}" r="${o.r ?? 0.5}"`
    + (o.fx == null ? '' : ` fx="${o.fx}"`) + (o.fy == null ? '' : ` fy="${o.fy}"`)
    + `>${stops(list)}</radialGradient>`;

/** 高斯模糊滤镜，用来做柔光、光晕、云。 */
const blur = (id, sd) =>
    `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%">`
    + `<feGaussianBlur stdDeviation="${n1(sd)}"/></filter>`;

/** 组装完整 SVG 文档。 */
const svgDoc = (w, h, defs, body) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">`
    + `<defs>${defs.join('')}</defs>${body.join('')}</svg>`;

/** 暗角：径向渐变 + 全屏 rect，压住四角、把视线收进主体。 */
function vignette(prefix, w, h, color = '#000000', strength = 0.5, inner = 0.42, r = 0.8) {
    return {
        def: rad(`${prefix}vign`, [[inner, color, 0], [1, color, strength]], { cx: 0.5, cy: 0.5, r }),
        body: rect(0, 0, w, h, `fill="url(#${prefix}vign)"`),
    };
}

/** 产出一个以 (x,y) 为心、rx/ry 为半径的柔光椭圆元素（灯光 / 太阳 / 台灯）。 */
function softSpot(prefix, name, defs, body, x, y, rx, ry, color, opacity = 0.5) {
    defs.push(rad(`${prefix}${name}`, [
        [0, color, opacity], [0.5, color, opacity * 0.4], [1, color, 0],
    ]));
    body.push(ellipse(x, y, rx, ry, `fill="url(#${prefix}${name})"`));
}

// ============================================================== 教室（白天 / 黄昏 / 夜晚）

/**
 * 教室通用结构：后墙 + 地板 + 黑板 + 门 + 大窗 + 成排课桌 + 光效。
 * 三个变体共用几何，用调色板和 outside / floorFx / airFx 区分气氛。
 */
function classroomScene(pal, w, h) {
    const P = pal.prefix;
    const X = (u) => u * w;
    const Y = (v) => v * h;
    const defs = [];
    const body = [];
    const floorY = Y(pal.floorY);
    const [bx0, bx1, by0, by1] = pal.boardRect;
    const [dx0, dx1, dy0, dy1] = pal.doorRect;
    const [wx0, wx1, wy0, wy1] = pal.win;
    const ctx = { X, Y, w, h, defs, body, P };

    // ---------- 1. 后墙与地板 ----------
    defs.push(lin(`${P}wall`, pal.wall));
    defs.push(lin(`${P}floor`, pal.floor));
    body.push(rect(0, 0, w, h, `fill="url(#${P}wall)"`));
    body.push(rect(0, floorY, w, h - floorY + 1, `fill="url(#${P}floor)"`));

    // 地板透视线：全部汇聚到后墙附近一点，制造纵深
    for (let i = -5; i <= 5; i++) {
        body.push(line(X(0.46), floorY, X(0.46) + i * X(0.145), h + 6,
            `stroke="${pal.floorLine}" stroke-width="1.6" opacity="0.3"`));
    }
    // 横向板缝：越近越疏
    for (let i = 1; i <= 5; i++) {
        const t = i / 6;
        const y = floorY + (h - floorY) * (t * t * 0.85 + t * 0.15);
        body.push(line(0, y, w, y, `stroke="${pal.floorLine}" stroke-width="${n1(1 + i * 0.6)}" opacity="0.32"`));
    }
    // 踢脚线
    body.push(rect(0, floorY - Y(0.016), w, Y(0.016), `fill="${pal.skirting}"`));
    body.push(rect(0, floorY - Y(0.016), w, Y(0.004), `fill="${pal.skirtingTop}"`));

    // ---------- 2. 门（左） ----------
    body.push(rect(X(dx0) - X(0.006), Y(dy0) - Y(0.008), X(dx1 - dx0) + X(0.012), Y(dy1 - dy0) + Y(0.016),
        `fill="${pal.doorFrame}"`));
    body.push(rect(X(dx0), Y(dy0), X(dx1 - dx0), Y(dy1 - dy0), `fill="${pal.doorFill}"`));
    // 门上小窗
    body.push(rect(X(dx0 + 0.012), Y(dy0 + 0.03), X(dx1 - dx0 - 0.024), Y(0.09), `fill="${pal.doorGlass}"`));
    if (pal.doorOpen) {
        // 夜晚：门没关严，走廊的暖光从缝里漏进来
        defs.push(lin(`${P}doorLeak`, [[0, pal.doorLight, 0.95], [1, pal.doorLight, 0.15]], { x1: 0, y1: 0, x2: 1, y2: 0 }));
        body.push(rect(X(dx0 + 0.004), Y(dy0), X(0.012), Y(dy1 - dy0), `fill="url(#${P}doorLeak)"`));
    }

    // ---------- 3. 黑板 ----------
    const bp = Y(0.018);
    body.push(rect(X(bx0) - bp, Y(by0) - bp, X(bx1 - bx0) + bp * 2, Y(by1 - by0) + bp * 2, `fill="${pal.boardFrame}"`));
    body.push(rect(X(bx0), Y(by0), X(bx1 - bx0), Y(by1 - by0), `fill="${pal.boardFill}"`));
    defs.push(lin(`${P}boardGloss`, [[0, '#ffffff', 0.10], [0.45, '#ffffff', 0.03], [1, '#000000', 0.12]]));
    body.push(rect(X(bx0), Y(by0), X(bx1 - bx0), Y(by1 - by0), `fill="url(#${P}boardGloss)"`));
    // 黑板上的粉笔灰痕（抽象横抹，不是文字）
    for (let i = 0; i < 4; i++) {
        const t = 0.18 + i * 0.16;
        body.push(line(X(bx0 + 0.03), Y(by0 + (by1 - by0) * t), X(bx0 + 0.03) + X((bx1 - bx0) * (0.25 + i * 0.12)),
            Y(by0 + (by1 - by0) * t), `stroke="#ffffff" stroke-width="${n1(Y(0.006))}" opacity="${n1(0.05 + i * 0.012)}"`));
    }
    // 粉笔槽
    body.push(rect(X(bx0) - bp, Y(by1) + bp, X(bx1 - bx0) + bp * 2, Y(0.024), `fill="${pal.boardFrame}"`));
    body.push(rect(X(bx0) - bp, Y(by1) + bp, X(bx1 - bx0) + bp * 2, Y(0.008), `fill="${pal.tray}"`));

    // ---------- 4. 大窗 ----------
    const fx = X(wx0);
    const fy = Y(wy0);
    const fw = X(wx1 - wx0);
    const fh = Y(wy1 - wy0);
    const fr = Y(0.014);
    defs.push(`<clipPath id="${P}winClip"><rect x="${n1(fx)}" y="${n1(fy)}" width="${n1(fw)}" height="${n1(fh)}"/></clipPath>`);
    body.push(rect(fx - fr, fy - fr, fw + fr * 2, fh + fr * 2, `fill="${pal.frame}"`));
    defs.push(lin(`${P}sky`, pal.sky));
    body.push('<g clip-path="url(#' + P + 'winClip)">');
    body.push(rect(fx, fy, fw, fh, `fill="url(#${P}sky)"`));
    body.push(...pal.outside(ctx));
    body.push('</g>');
    // 窗棂：3 扇 + 上部亮窗横档
    for (let i = 1; i < 3; i++) {
        body.push(rect(fx + (fw / 3) * i - fr * 0.4, fy, fr * 0.8, fh, `fill="${pal.frame}"`));
    }
    body.push(rect(fx, fy + fh * 0.17, fw, fr * 0.85, `fill="${pal.frame}"`));
    // 窗台
    body.push(rect(fx - fr * 1.5, fy + fh, fw + fr * 3, fr * 1.5, `fill="${pal.frame}"`));
    // 玻璃反光
    defs.push(lin(`${P}glass`, [[0, '#ffffff', 0.20], [0.5, '#ffffff', 0.03], [1, '#ffffff', 0.10]], { x1: 0, y1: 0, x2: 1, y2: 1 }));
    body.push(poly([[fx, fy], [fx + fw * 0.45, fy], [fx + fw * 0.1, fy + fh], [fx, fy + fh]], `fill="url(#${P}glass)"`));

    // ---------- 5. 地面光效 / 窗影（在课桌之下） ----------
    if (pal.floorFx) pal.floorFx(ctx);

    // ---------- 6. 成排课桌 ----------
    const rows = [
        { y: 0.650, s: 0.72 },
        { y: 0.790, s: 0.94 },
        { y: 0.945, s: 1.16 },
    ];
    const cols = [0.16, 0.36, 0.64, 0.84];
    const desk = (cx, yF, s) => {
        const dw = X(0.165) * s;
        const dd = Y(0.026) * s;
        const th = Y(0.014) * s;
        const legL = Y(0.10) * s;
        const x0 = cx - dw / 2;
        const x1 = cx + dw / 2;
        const yb = yF + th + legL;
        const out = [];
        // 地面影子（光从右边来 → 影子偏左）
        out.push(poly([[x0, yF + th], [x1, yF + th], [x1 + pal.shadowDx * dw, yb + Y(0.012)],
            [x0 + pal.shadowDx * dw * 1.25, yb + Y(0.012)]], `fill="${pal.shadow}"`));
        // 椅子（在桌子后面，露出一截靠背）
        const cw = dw * 0.54;
        const chh = Y(0.062) * s;
        out.push(rect(cx - cw / 2, yF - dd - chh, cw, chh, `fill="${pal.chair}" rx="${n1(chh * 0.18)}"`));
        // 桌腿
        out.push(rect(x0 + dw * 0.06, yF + th, dw * 0.055, legL, `fill="${pal.leg}"`));
        out.push(rect(x1 - dw * 0.115, yF + th, dw * 0.055, legL, `fill="${pal.leg}"`));
        // 桌面（前缘宽、后缘窄的平行四边形 = 俯视一点点的透视）
        out.push(poly([[x0, yF], [x1, yF], [x1 - dw * 0.09, yF - dd], [x0 + dw * 0.09, yF - dd]], `fill="${pal.top}"`));
        // 前挡板
        out.push(poly([[x0, yF], [x1, yF], [x1, yF + th], [x0, yF + th]], `fill="${pal.front}"`));
        // 桌沿高光
        out.push(line(x0, yF, x1, yF, `stroke="${pal.edge}" stroke-width="${n1(Math.max(1, th * 0.22))}"`));
        return out.join('');
    };
    rows.forEach((row) => {
        const yF = Y(row.y);
        cols.forEach((c) => body.push(desk(X(c), yF, row.s)));
    });

    // ---------- 7. 空气光效（在课桌之上） ----------
    if (pal.airFx) pal.airFx(ctx);

    // ---------- 8. 暗角 ----------
    const v = vignette(P, w, h, pal.vignette, pal.vignetteStrength, 0.4, 0.82);
    defs.push(v.def);
    body.push(v.body);

    return svgDoc(w, h, defs, body);
}

// -------------------------------------------------------------- 白天教室

const PAL_CLASSROOM_DAY = {
    prefix: 'classroom_day_',
    floorY: 0.72,
    wall: [[0, '#f7f1e0'], [0.55, '#f1e8d3'], [1, '#e4d8be']],
    floor: [[0, '#dcc79c'], [0.5, '#cfb385'], [1, '#c0a273']],
    floorLine: '#a68a5f',
    skirting: '#c9b189',
    skirtingTop: '#e6d8b8',
    boardRect: [0.15, 0.50, 0.20, 0.52],
    doorRect: [0.015, 0.105, 0.24, 0.66],
    win: [0.56, 0.97, 0.12, 0.60],
    boardFrame: '#b98a58',
    boardFill: '#2f4a41',
    tray: '#d9bd92',
    doorFill: '#cba97a',
    doorFrame: '#a98a5e',
    doorGlass: '#e8e2cf',
    frame: '#fbf8f0',
    sky: [[0, '#8fd4f2'], [0.55, '#c6e8f6'], [1, '#e9f3e0']],
    top: '#e9d7b3',
    front: '#d2b98c',
    leg: '#ac8d66',
    chair: '#c1a377',
    edge: '#f8efdb',
    shadow: 'rgba(120,98,64,0.28)',
    shadowDx: -0.30,
    vignette: '#3b2c18',
    vignetteStrength: 0.34,
    outside: ({ X, Y, w, h }) => {
        const out = [];
        // 操场 / 草地
        out.push(rect(X(0), Y(0.40), w, Y(0.24), `fill="#8fc26d"`));
        out.push(rect(X(0), Y(0.40), w, Y(0.02), `fill="#a8d188"`));
        // 远处教学楼
        out.push(rect(X(0.52), Y(0.26), X(0.46), Y(0.15), `fill="#d5dade"`));
        out.push(rect(X(0.52), Y(0.235), X(0.46), Y(0.032), `fill="#9fabb2"`));
        for (let i = 0; i < 6; i++) {
            out.push(rect(X(0.545 + i * 0.072), Y(0.295), X(0.038), Y(0.045), `fill="#96a8b4" opacity="0.75"`));
        }
        // 绿树（两层色，深底 + 亮部）
        [[0.60, 0.355, 0.105], [0.745, 0.335, 0.125], [0.885, 0.375, 0.10], [0.475, 0.395, 0.075]]
            .forEach(([tx, ty, tr]) => {
                out.push(rect(X(tx - 0.008), Y(ty), X(0.016), Y(0.09), `fill="#6b5236"`));
                out.push(circle(X(tx), Y(ty), Y(tr * 0.95), `fill="#3d7a46"`));
                out.push(circle(X(tx) - Y(tr * 0.3), Y(ty) - Y(tr * 0.28), Y(tr * 0.72), `fill="#5fa055"`));
                out.push(circle(X(tx) + Y(tr * 0.34), Y(ty) + Y(tr * 0.16), Y(tr * 0.5), `fill="#2f6340"`));
            });
        // 树影
        out.push(ellipse(X(0.745), Y(0.425), Y(0.13), Y(0.022), `fill="#5f8f4d" opacity="0.7"`));
        return out;
    },
    airFx: ({ X, Y, w, h, defs, body, P }) => {
        defs.push(blur(`${P}beamBlur`, h * 0.014));
        defs.push(lin(`${P}beamFade`, [[0, '#fff6d8', 0.04], [0.45, '#fff6d8', 0.20], [1, '#fff2c8', 0.36]]));
        body.push(`<g filter="url(#${P}beamBlur)">`);
        // 三束平行的斜射阳光：从三扇窗落到地板左下方
        [[0.575, 0.650, 0.05, 0.25], [0.665, 0.795, 0.21, 0.43], [0.815, 0.955, 0.39, 0.63]]
            .forEach(([t0, t1, b0, b1]) => {
                body.push(poly([[X(t0), Y(0.10)], [X(t1), Y(0.10)], [X(b1), h], [X(b0), h]],
                    `fill="url(#${P}beamFade)"`));
            });
        body.push('</g>');
        softSpot(P, 'winGlow', defs, body, X(0.78), Y(0.28), X(0.30), Y(0.26), '#ffffff', 0.20);
    },
};

// -------------------------------------------------------------- 黄昏教室

const PAL_CLASSROOM_EVENING = {
    prefix: 'classroom_evening_',
    floorY: 0.72,
    wall: [[0, '#e8b489'], [0.35, '#dd9a6b'], [0.75, '#bd7860'], [1, '#96604f']],
    floor: [[0, '#cd9060'], [0.55, '#a86a4c'], [1, '#7d4b41']],
    floorLine: '#6d3f38',
    skirting: '#8d5442',
    skirtingTop: '#d79a6a',
    boardRect: [0.15, 0.50, 0.20, 0.52],
    doorRect: [0.015, 0.105, 0.24, 0.66],
    win: [0.56, 0.97, 0.12, 0.60],
    boardFrame: '#8f5a3a',
    boardFill: '#332f28',
    tray: '#a97a4e',
    doorFill: '#9c6a45',
    doorFrame: '#7d5136',
    doorGlass: '#e0a55f',
    frame: '#f2cf9c',
    sky: [[0, '#5b4272'], [0.30, '#a9504a'], [0.60, '#ee8340'], [0.82, '#ffb45e'], [1, '#ffe0a4']],
    top: '#a4663f',
    front: '#834e33',
    leg: '#653a29',
    chair: '#8f5c3c',
    edge: '#ffc07a',
    shadow: 'rgba(74,34,66,0.34)',
    shadowDx: -0.85,
    vignette: '#2a1030',
    vignetteStrength: 0.48,
    outside: ({ X, Y, w, h, defs }) => {
        const out = [];
        // 低垂的太阳 + 光晕
        defs.push(rad('classroom_evening_sun', [[0, '#fff3c8', 0.95], [0.35, '#ffca74', 0.55], [1, '#ff9a4a', 0]]));
        out.push(ellipse(X(0.80), Y(0.50), Y(0.30), Y(0.30), 'fill="url(#classroom_evening_sun)"'));
        out.push(circle(X(0.80), Y(0.50), Y(0.062), 'fill="#fff0c0"'));
        // 被夕阳照亮的云带
        [[0.34, 0.16, 0.20, 0.016], [0.62, 0.10, 0.26, 0.013], [0.78, 0.22, 0.18, 0.012]]
            .forEach(([cx, cy, rx, ry]) => {
                out.push(ellipse(X(cx), Y(cy), X(rx), Y(ry), 'fill="#ffd9a0" opacity="0.55"'));
            });
        // 远景屋顶剪影
        out.push(poly([[X(0.42), Y(0.44)], [X(0.56), Y(0.36)], [X(0.70), Y(0.44)], [X(0.70), Y(0.66)], [X(0.42), Y(0.66)]],
            'fill="#6d4059" opacity="0.9"'));
        out.push(poly([[X(0.02), Y(0.46)], [X(0.20), Y(0.40)], [X(0.34), Y(0.46)], [X(0.34), Y(0.66)], [X(0.02), Y(0.66)]],
            'fill="#7a4560" opacity="0.85"'));
        out.push(rect(X(0), Y(0.55), w, Y(0.12), 'fill="#5b3350" opacity="0.75"'));
        // 树剪影
        [[0.16, 0.40, 0.085], [0.30, 0.38, 0.07]].forEach(([tx, ty, tr]) => {
            out.push(circle(X(tx), Y(ty), Y(tr), 'fill="#4b2b45"'));
            out.push(circle(X(tx) + Y(tr * 0.5), Y(ty) + Y(tr * 0.2), Y(tr * 0.7), 'fill="#43263d"'));
        });
        return out;
    },
    floorFx: ({ X, Y, w, h, defs, body, P }) => {
        // 斜射进来的橙色光带（从窗口铺到地板左下），右侧留出没被照到的暗部
        const mapX = (v) => 0.06 + ((v - 0.56) / 0.41) * 0.56;
        defs.push(lin(`${P}sunPatch`, [
            [0, '#ffca79', 0.60], [0.5, '#ff9f52', 0.40], [1, '#c05a4a', 0.12],
        ]));
        body.push(poly([[X(0.56), Y(0.58)], [X(0.99), Y(0.60)], [X(0.62), h], [X(0.06), h]],
            `fill="url(#${P}sunPatch)"`));
        // 窗棂投下的长影子（沿着同一套透视映射斜向左下）
        defs.push(lin(`${P}mullion`, [[0, '#4a2445', 0.46], [1, '#4a2445', 0.08]]));
        [[0.635, 0.006], [0.80, 0.006], [0.558, 0.012], [0.962, 0.010]].forEach(([mx, mw]) => {
            body.push(poly([
                [X(mx), Y(0.58)], [X(mx + mw), Y(0.58)],
                [X(mapX(mx + mw)), h], [X(mapX(mx)), h],
            ], `fill="url(#${P}mullion)"`));
        });
        // 黑板的长影
        body.push(poly([[X(0.15), Y(0.54)], [X(0.50), Y(0.54)], [X(0.24), Y(0.70)], [X(-0.08), Y(0.70)]],
            'fill="#6b3a52" opacity="0.32"'));
        softSpot(P, 'sunGlow', defs, body, X(0.78), Y(0.42), X(0.40), Y(0.34), '#ffd79a', 0.30);
    },
    airFx: ({ X, Y, w, h, defs, body, P }) => {
        defs.push(blur(`${P}beamBlur`, h * 0.016));
        defs.push(lin(`${P}beamFade`, [[0, '#ffb765', 0.05], [0.5, '#ffb765', 0.24], [1, '#ff9a4d', 0.40]]));
        body.push(`<g filter="url(#${P}beamBlur)">`);
        [[0.575, 0.650, 0.00, 0.16], [0.665, 0.795, 0.12, 0.32], [0.815, 0.955, 0.26, 0.48]]
            .forEach(([t0, t1, b0, b1]) => {
                body.push(poly([[X(t0), Y(0.10)], [X(t1), Y(0.10)], [X(b1), h], [X(b0), h]],
                    `fill="url(#${P}beamFade)"`));
            });
        body.push('</g>');
        softSpot(P, 'flare', defs, body, X(0.80), Y(0.34), X(0.32), Y(0.28), '#fff0c4', 0.30);
    },
};

// -------------------------------------------------------------- 夜晚教室

const PAL_CLASSROOM_NIGHT = {
    prefix: 'classroom_night_',
    floorY: 0.72,
    wall: [[0, '#1d2436'], [0.5, '#252e44'], [1, '#141926']],
    floor: [[0, '#222a3d'], [0.55, '#1a2131'], [1, '#101521']],
    floorLine: '#0c1120',
    skirting: '#2c3549',
    skirtingTop: '#3d4a68',
    boardRect: [0.15, 0.50, 0.20, 0.52],
    doorRect: [0.015, 0.105, 0.24, 0.66],
    win: [0.56, 0.97, 0.12, 0.60],
    boardFrame: '#39415a',
    boardFill: '#1e2a2c',
    tray: '#39415a',
    doorFill: '#2b3349',
    doorFrame: '#39415a',
    doorGlass: '#ffe3ab',
    doorOpen: true,
    doorLight: '#ffd98f',
    frame: '#4d5a7c',
    sky: [[0, '#070c1c'], [0.55, '#0e1730'], [1, '#1b2748']],
    top: '#2c3549',
    front: '#232b3d',
    leg: '#1a2130',
    chair: '#28304a',
    edge: '#6d86b8',
    shadow: 'rgba(4,7,14,0.55)',
    shadowDx: 0.22,
    vignette: '#000000',
    vignetteStrength: 0.62,
    outside: ({ X, Y, w, h, defs, P }) => {
        const out = [];
        const rng = makeRng(90210);
        // 星星
        for (let i = 0; i < 26; i++) {
            const sx = X(span(rng, 0.0, 1));
            const sy = Y(span(rng, 0.0, 0.62));
            out.push(circle(sx, sy, n1(span(rng, 0.7, 1.8)), `fill="#dfe9ff" opacity="${n1(span(rng, 0.3, 0.95))}"`));
        }
        // 月牙
        defs.push(rad(`${P}moonGlow`, [[0, '#cfe0ff', 0.5], [1, '#cfe0ff', 0]]));
        out.push(circle(X(0.78), Y(0.20), Y(0.14), `fill="url(#${P}moonGlow)"`));
        out.push(circle(X(0.78), Y(0.20), Y(0.048), 'fill="#e8f0ff"'));
        out.push(circle(X(0.795), Y(0.185), Y(0.042), 'fill="#101a34"'));
        // 远处楼影 + 两扇亮着的窗
        out.push(rect(X(0.04), Y(0.34), X(0.44), Y(0.16), 'fill="#0a1122"'));
        out.push(rect(X(0.10), Y(0.40), X(0.05), Y(0.045), 'fill="#c9a45f" opacity="0.75"'));
        out.push(rect(X(0.24), Y(0.44), X(0.045), Y(0.04), 'fill="#c9a45f" opacity="0.55"'));
        // 树剪影
        [[0.62, 0.40, 0.11], [0.86, 0.42, 0.09]].forEach(([tx, ty, tr]) => {
            out.push(circle(X(tx), Y(ty), Y(tr), 'fill="#050a16"'));
            out.push(circle(X(tx) + Y(tr * 0.6), Y(ty) + Y(tr * 0.25), Y(tr * 0.7), 'fill="#050a16"'));
        });
        return out;
    },
    floorFx: ({ X, Y, w, h, defs, body, P }) => {
        // 走廊灯从门缝洒进来的地板上的一块暖光
        defs.push(lin(`${P}doorPool`, [[0, '#ffe0a2', 0.42], [1, '#ffe0a2', 0.02]], { x1: 0, y1: 0, x2: 1, y2: 0.4 }));
        body.push(poly([[X(0.02), Y(0.66)], [X(0.13), Y(0.66)], [X(0.30), h], [X(-0.06), h]],
            `fill="url(#${P}doorPool)"`));
        // 窗户落下的一格冷光
        defs.push(lin(`${P}moonPatch`, [[0, '#9dc0ff', 0.26], [1, '#9dc0ff', 0.04]]));
        body.push(poly([[X(0.56), Y(0.60)], [X(0.97), Y(0.60)], [X(0.86), h], [X(0.40), h]],
            `fill="url(#${P}moonPatch)"`));
        for (let i = 0; i < 3; i++) {
            body.push(poly([
                [X(0.635 + i * 0.165), Y(0.60)], [X(0.645 + i * 0.165), Y(0.60)],
                [X(0.545 + i * 0.165), h], [X(0.525 + i * 0.165), h],
            ], 'fill="#0b1120" opacity="0.45"'));
        }
    },
    airFx: ({ X, Y, w, h, defs, body, P }) => {
        defs.push(blur(`${P}soft`, h * 0.018));
        // 门口暖光晕
        body.push(`<g filter="url(#${P}soft)" opacity="0.5">`);
        body.push(ellipse(X(0.07), Y(0.50), X(0.10), Y(0.34), 'fill="#ffd98f" opacity="0.55"'));
        body.push('</g>');
        // 窗口冷光晕
        softSpot(P, 'moonGlow2', defs, body, X(0.78), Y(0.34), X(0.36), Y(0.30), '#9fc2ff', 0.20);
        // 桌子上的冷色边缘光
        defs.push(lin(`${P}rim`, [[0, '#8fb2ff', 0.0], [1, '#8fb2ff', 0.18]]));
        body.push(rect(X(0.0), Y(0.55), w, Y(0.30), `fill="url(#${P}rim)"`));
    },
};

// ============================================================== 白天走廊

/**
 * 一点透视：所有纵深线汇聚到画布中部偏右的消失点。
 * 左墙一排窗（光从左边进来），右墙立柱 + 鞋柜，尽头一扇亮窗。
 */
function hallwayDay(w, h) {
    const P = 'hallway_day_';
    const X = (u) => u * w;
    const Y = (v) => v * h;
    const defs = [];
    const body = [];
    const farL = 0.385;
    const farR = 0.655;
    const xL = X(farL);
    const xR = X(farR);
    const yT = Y(0.295);
    const yB = Y(0.735);

    // 四个参数化映射：左墙 L、右墙 R、天顶 C、地板 F
    // u: 0 = 近端（画布外沿）, 1 = 远端（尽头墙）；v: 0 = 上/左, 1 = 下/右
    const L = (u, v) => [xL * u, (yT * u) + ((h + (yB - h) * u) - (yT * u)) * v];
    const R = (u, v) => [w + (xR - w) * u, (yT * u) + ((h + (yB - h) * u) - (yT * u)) * v];
    const C = (u, v) => { const xa = xL * u; const xb = w + (xR - w) * u; return [xa + (xb - xa) * v, yT * u]; };
    const F = (u, v) => { const xa = xL * u; const xb = w + (xR - w) * u; return [xa + (xb - xa) * v, h + (yB - h) * u]; };

    // ---------- 天顶 / 地板 / 尽头墙 ----------
    defs.push(lin(`${P}ceil`, [[0, '#fcfbf7'], [0.55, '#efebe1'], [1, '#d9d4c6']]));
    body.push(poly([[0, 0], [w, 0], [xR, yT], [xL, yT]], `fill="url(#${P}ceil)"`));
    defs.push(lin(`${P}floor`, [[0, '#e9d2ab'], [0.4, '#d9bd91'], [1, '#bfa06f']]));
    body.push(poly([[0, h], [w, h], [xR, yB], [xL, yB]], `fill="url(#${P}floor)"`));

    // 地板砖缝：横缝（远端变密）+ 纵缝（汇聚）
    for (let i = 1; i <= 9; i++) {
        const u = 1 - Math.pow(1 - i / 10, 2.1);
        body.push(line(...F(u, 0), ...F(u, 1), `stroke="#ac8f60" stroke-width="${n1(1 + u * 1.6)}" opacity="0.35"`));
    }
    for (let j = 0; j <= 8; j++) {
        const v = j / 8;
        body.push(line(...F(0, v), ...F(1, v), 'stroke="#ac8f60" stroke-width="1.6" opacity="0.22"'));
    }
    // 尽头墙 + 尽头窗
    body.push(rect(xL, yT, xR - xL, yB - yT, `fill="#f3f1e7"`));
    body.push(rect(xL, yB - Y(0.02), xR - xL, Y(0.02), 'fill="#cfc7b3"'));
    defs.push(lin(`${P}endWin`, [[0, '#e8f6fb'], [0.6, '#cfeaf5'], [1, '#b6dc9a']]));
    const ew = { x: xL + X(0.045), y: yT + Y(0.075), w: (xR - xL) - X(0.09), h: (yB - yT) * 0.62 };
    body.push(rect(ew.x - X(0.008), ew.y - Y(0.014), ew.w + X(0.016), ew.h + Y(0.028), 'fill="#fbfaf4"'));
    body.push(rect(ew.x, ew.y, ew.w, ew.h, `fill="url(#${P}endWin)"`));
    body.push(rect(ew.x + ew.w / 2 - X(0.004), ew.y, X(0.008), ew.h, 'fill="#fbfaf4"'));
    body.push(rect(ew.x, ew.y + ew.h * 0.30, ew.w, Y(0.008), 'fill="#fbfaf4"'));
    softSpot(P, 'endGlow', defs, body, ew.x + ew.w / 2, ew.y + ew.h / 2, X(0.20), Y(0.26), '#ffffff', 0.45);

    // ---------- 左墙：一排窗 ----------
    body.push(poly([L(0, 0), L(1, 0), L(1, 1), L(0, 1)], 'fill="#eef0e6"'));
    // 墙裙
    body.push(poly([L(0, 0.80), L(1, 0.80), L(1, 1), L(0, 1)], 'fill="#dfe0d2"'));
    const wins = [[0.05, 0.235], [0.295, 0.44], [0.485, 0.59], [0.63, 0.71], [0.745, 0.805]];
    defs.push(lin(`${P}win`, [[0, '#eaf7fc'], [0.62, '#cfe9f4'], [1, '#a8cf8e']]));
    wins.forEach(([u0, u1]) => {
        const a = L(u0, 0.16);
        const b = L(u1, 0.16);
        const c = L(u1, 0.60);
        const d = L(u0, 0.60);
        body.push(poly([[a[0] - X(0.008), a[1] - Y(0.016)], [b[0] + X(0.008), b[1] - Y(0.016)],
            [c[0] + X(0.008), c[1] + Y(0.016)], [d[0] - X(0.008), d[1] + Y(0.016)]], 'fill="#fbfaf4"'));
        body.push(poly([a, b, c, d], `fill="url(#${P}win)"`));
        // 窗棂 + 横档
        const m0 = L((u0 + u1) / 2, 0.16);
        const m1 = L((u0 + u1) / 2, 0.60);
        body.push(line(m0[0], m0[1], m1[0], m1[1], 'stroke="#fbfaf4" stroke-width="3"'));
        const h0 = L(u0, 0.32);
        const h1 = L(u1, 0.32);
        body.push(line(h0[0], h0[1], h1[0], h1[1], 'stroke="#fbfaf4" stroke-width="3"'));
        // 窗台
        body.push(poly([L(u0, 0.60), L(u1, 0.60), L(u1, 0.645), L(u0, 0.645)], 'fill="#e7e4d6"'));
    });

    // ---------- 右墙：立柱 + 鞋柜 ----------
    body.push(poly([R(0, 0), R(1, 0), R(1, 1), R(0, 1)], 'fill="#e2ddce"'));
    const pillars = [[0.075, 0.135], [0.30, 0.35], [0.475, 0.515], [0.615, 0.645], [0.735, 0.755]];
    pillars.forEach(([u0, u1]) => {
        body.push(poly([R(u0, 0), R(u1, 0), R(u1, 1), R(u0, 1)], 'fill="#d3ccb8"'));
        body.push(poly([R(u0, 0), R(u0 + (u1 - u0) * 0.25, 0), R(u0 + (u1 - u0) * 0.25, 1), R(u0, 1)], 'fill="#e6e0cd"'));
    });
    const lockers = [[0.145, 0.29], [0.36, 0.465], [0.525, 0.605], [0.655, 0.725]];
    lockers.forEach(([u0, u1]) => {
        body.push(poly([R(u0, 0.36), R(u1, 0.36), R(u1, 0.99), R(u0, 0.99)], 'fill="#9aa79c"'));
        body.push(poly([R(u0, 0.36), R(u1, 0.36), R(u1, 0.395), R(u0, 0.395)], 'fill="#b8c2b6"'));
        const n = 4 + Math.round((1 - u0) * 4);
        for (let i = 1; i < n; i++) {
            const uu = u0 + (u1 - u0) * (i / n);
            const p0 = R(uu, 0.40);
            const p1 = R(uu, 0.98);
            body.push(line(p0[0], p0[1], p1[0], p1[1], 'stroke="#7d8a80" stroke-width="1.6" opacity="0.8"'));
        }
    });

    // ---------- 天顶灯 ----------
    [[0.10, 0.185], [0.33, 0.395], [0.51, 0.555], [0.645, 0.675]].forEach(([u0, u1]) => {
        body.push(poly([C(u0, 0.40), C(u1, 0.40), C(u1, 0.60), C(u0, 0.60)], 'fill="#fffef2"'));
        body.push(poly([C(u0, 0.40), C(u1, 0.40), C(u1, 0.44), C(u0, 0.44)], 'fill="#e4e0d2"'));
    });

    // ---------- 光效：窗口落在地板与对墙上的光 ----------
    defs.push(lin(`${P}pool`, [[0, '#fff6d2', 0.45], [1, '#fff6d2', 0.05]]));
    wins.forEach(([u0, u1]) => {
        body.push(poly([F(u0, 0.02), F(u1, 0.02), F(u1, 0.46), F(u0, 0.46)], `fill="url(#${P}pool)"`));
        body.push(poly([R(u0 + 0.06, 0.20), R(u1 + 0.05, 0.20), R(u1 + 0.05, 0.70), R(u0 + 0.06, 0.70)],
            `fill="url(#${P}pool)" opacity="0.75"`));
    });
    defs.push(blur(`${P}soft`, h * 0.02));
    body.push(`<g filter="url(#${P}soft)">`);
    body.push(poly([[0, Y(0.12)], [X(0.34), Y(0.20)], [X(0.40), Y(0.74)], [0, Y(0.86)]], 'fill="#fffbe6" opacity="0.30"'));
    body.push(poly([[0, Y(0.30)], [X(0.44), Y(0.44)], [X(0.52), h], [X(0.06), h]], 'fill="#fff9dd" opacity="0.22"'));
    body.push('</g>');

    const v = vignette(P, w, h, '#4a3a24', 0.40, 0.42, 0.84);
    defs.push(v.def);
    body.push(v.body);
    return svgDoc(w, h, defs, body);
}

// ============================================================== 天台：栏杆 / 水塔 / 地面

/** 铁网栏杆的网格 pattern。 */
function fencePattern(id, defs, tile, color, sw) {
    defs.push(`<pattern id="${id}" width="${n1(tile)}" height="${n1(tile)}" patternUnits="userSpaceOnUse">`
        + `<path d="M0 0 L${n1(tile)} ${n1(tile)} M${n1(tile)} 0 L0 ${n1(tile)}"`
        + ` stroke="${color}" stroke-width="${n1(sw)}" fill="none"/></pattern>`);
}

/** 天台水塔剪影：支腿 → 罐体 → 顶盖 → 爬梯。 */
function waterTower(o) {
    const { X, Y, w, h, body, baseY, col } = o;
    const x0 = X(o.x0 ?? 0.115);
    const x1 = X(o.x1 ?? 0.265);
    const y0 = Y(o.top ?? 0.10);
    const y1 = Y(o.bot ?? 0.30);
    const cx = (x0 + x1) / 2;
    const bw = x1 - x0;
    const legW = Math.max(2, w * 0.005);
    const base = Y(baseY);
    // 支腿（外八字 + 交叉支撑）
    [[x0 + bw * 0.08, x0 - bw * 0.06], [x0 + bw * 0.34, x0 + bw * 0.46],
        [x1 - bw * 0.34, x1 - bw * 0.46], [x1 - bw * 0.08, x1 + bw * 0.06]].forEach(([lx, bx]) => {
        body.push(line(lx, y1, bx, base, `stroke="${col.towerDark}" stroke-width="${n1(legW)}"`));
    });
    body.push(line(x0 + bw * 0.08, y1 + (base - y1) * 0.45, x1 - bw * 0.08, y1 + (base - y1) * 0.45,
        `stroke="${col.towerDark}" stroke-width="${n1(legW * 0.8)}"`));
    body.push(line(x0 + bw * 0.08, y1, x1 - bw * 0.08, y1 + (base - y1) * 0.5,
        `stroke="${col.towerDark}" stroke-width="${n1(legW * 0.7)}" opacity="0.85"`));
    // 罐体 + 底板
    body.push(rect(x0, y0, bw, y1 - y0, `fill="${col.tower}"`));
    body.push(ellipse(cx, y1 - (y1 - y0) * 0.06, bw / 2, (y1 - y0) * 0.10, `fill="${col.towerDark}"`));
    body.push(rect(x0, y0, bw * 0.28, y1 - y0, `fill="${col.towerLight}"`));
    body.push(ellipse(cx, y0, bw / 2, Y(0.022), `fill="${col.towerLight}"`));
    // 顶盖
    body.push(poly([[x0 - bw * 0.05, y0], [x1 + bw * 0.05, y0], [cx, y0 - Y(0.052)]], `fill="${col.towerDark}"`));
    body.push(line(cx, y0 - Y(0.052), cx, y0 - Y(0.075), `stroke="${col.towerDark}" stroke-width="${n1(legW)}"`));
    // 爬梯
    body.push(line(x1 - bw * 0.22, y0 + Y(0.01), x1 - bw * 0.22, y1, `stroke="${col.towerLight}" stroke-width="${n1(legW * 0.6)}"`));
    for (let i = 1; i < 6; i++) {
        const ly = y0 + (y1 - y0) * (i / 6);
        body.push(line(x1 - bw * 0.28, ly, x1 - bw * 0.16, ly, `stroke="${col.towerLight}" stroke-width="${n1(legW * 0.5)}"`));
    }
}

/**
 * 天台前景：水塔 → 铁网栏杆 → 女儿墙。地面由调用方先行绘制。
 * v0/v1 为各层的 y 归一化位置。
 */
function rooftopScaffold(o) {
    const { P, X, Y, w, h, defs, body, col } = o;
    const fenceTop = o.fenceTop ?? 0.28;
    const parapet = o.parapet ?? [0.645, 0.715];
    const pTop = Y(parapet[0]);
    const pBot = Y(parapet[1]);
    if (o.tower !== false) {
        waterTower({ X, Y, w, h, body, baseY: parapet[1] + 0.005, col, x0: o.towerX0 ?? 0.115, x1: o.towerX1 ?? 0.265, top: o.towerTop ?? 0.10, bot: o.towerBot ?? 0.30 });
    }
    // 铁网
    if (o.fence !== false) {
        const fTop = Y(fenceTop);
        fencePattern(`${P}mesh`, defs, X(o.meshTile ?? 0.0215), col.mesh, w * 0.0013);
        body.push(rect(0, fTop, w, pTop - fTop + 2, `fill="url(#${P}mesh)" opacity="${o.meshOpacity ?? 0.8}"`));
        // 网面整体的明暗（上亮下暗，避免一片死板的灰）
        defs.push(lin(`${P}fenceShade`, [[0, col.fenceLight, 0.30], [0.55, col.fenceLight, 0.04], [1, col.fenceDark, 0.26]]));
        body.push(rect(0, fTop, w, pTop - fTop + 2, `fill="url(#${P}fenceShade)"`));
        // 横杆（上下 + 中）
        [fenceTop + 0.008, 0.46, parapet[0] - 0.012].forEach((fy, i) => {
            body.push(rect(0, Y(fy) - Y(0.004), w, Y(0.008), `fill="${i === 0 ? col.railLight : col.rail}"`));
        });
        // 立柱
        const n = 7;
        for (let i = 0; i <= n; i++) {
            const px = X(i / n) - X(0.004);
            body.push(rect(px, fTop - Y(0.006), X(0.008), pTop - fTop + Y(0.012), `fill="${col.post}"`));
            body.push(rect(px - X(0.006), fTop - Y(0.016), X(0.02), Y(0.014), `fill="${col.post}"`));
        }
    }
    // 女儿墙
    body.push(rect(0, pTop, w, pBot - pTop, `fill="${col.parapet}"`));
    body.push(rect(0, pTop, w, Y(0.012), `fill="${col.coping}"`));
    body.push(rect(0, pBot - Y(0.010), w, Y(0.010), `fill="${col.parapetDark}"`));
    body.push(rect(0, (pTop + pBot) / 2 - Y(0.004), w, Y(0.008), `fill="${col.parapetDark}" opacity="0.5"`));
}

// ============================================================== 白天天台

function rooftopDay(w, h) {
    const P = 'rooftop_day_';
    const X = (u) => u * w;
    const Y = (v) => v * h;
    const defs = [];
    const body = [];
    const horizon = 0.515;

    // 天空
    defs.push(lin(`${P}sky`, [[0, '#3f97d8'], [0.35, '#7cc0e8'], [0.72, '#bfe4f4'], [1, '#e8f5fa']]));
    body.push(rect(0, 0, w, Y(0.62), `fill="url(#${P}sky)"`));
    softSpot(P, 'sun', defs, body, X(0.86), Y(0.10), X(0.34), Y(0.30), '#fff8d8', 0.45);

    // 积云：每一朵是若干重叠椭圆 + 冷色底
    const rng = makeRng(4711);
    const clouds = [[0.22, 0.20, 0.15], [0.60, 0.13, 0.11], [0.83, 0.30, 0.13], [0.40, 0.36, 0.09], [0.10, 0.42, 0.08]];
    clouds.forEach(([cx, cy, r]) => {
        const n = 7;
        for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI;
            const ex = X(cx) + Math.cos(a) * X(r * 1.5) * (i % 2 ? 0.62 : 0.95);
            const ey = Y(cy) + Math.sin(a) * Y(r * 0.55) - Y(r * 0.1);
            body.push(ellipse(ex, ey, X(r * 0.62), Y(r * 0.42), 'fill="#ffffff"'));
        }
        body.push(ellipse(X(cx), Y(cy + r * 0.30), X(r * 1.42), Y(r * 0.38), 'fill="#ffffff"'));
        body.push(ellipse(X(cx), Y(cy + r * 0.46), X(r * 1.30), Y(r * 0.22), 'fill="#cfe2ef" opacity="0.85"'));
        body.push(ellipse(X(cx - r * 0.35), Y(cy + r * 0.34), X(r * 0.85), Y(r * 0.24), 'fill="#e3eef6" opacity="0.7"'));
    });

    // 海 + 远处的岛
    defs.push(lin(`${P}sea`, [[0, '#2f7fb8'], [0.5, '#4d9dc9'], [1, '#7cbdd8']]));
    body.push(rect(0, Y(horizon), w, Y(0.66 - horizon), `fill="url(#${P}sea)"`));
    body.push(rect(0, Y(horizon), w, Y(0.004), 'fill="#dff0f8" opacity="0.9"'));
    for (let i = 0; i < 22; i++) {
        const sx = X(span(rng, 0, 1));
        const sy = Y(span(rng, horizon + 0.01, 0.62));
        body.push(line(sx, sy, sx + X(span(rng, 0.01, 0.035)), sy, 'stroke="#cfeaf6" stroke-width="2" opacity="0.5"'));
    }
    body.push(poly([[X(0.02), Y(horizon)], [X(0.10), Y(0.455)], [X(0.19), Y(horizon)]], 'fill="#5b7f92" opacity="0.85"'));
    body.push(poly([[X(0.30), Y(horizon)], [X(0.355), Y(0.472)], [X(0.41), Y(horizon)]], 'fill="#6b8c9c" opacity="0.8"'));
    body.push(rect(X(0.62), Y(0.485), X(0.36), Y(0.05), 'fill="#81949f" opacity="0.55"'));
    for (let i = 0; i < 9; i++) {
        body.push(rect(X(0.64 + i * 0.038), Y(0.495), X(0.016), Y(0.014), 'fill="#9fb0b8" opacity="0.6"'));
    }
    // 海鸥
    [[0.30, 0.14], [0.36, 0.19], [0.26, 0.24], [0.66, 0.22]].forEach(([bx, by]) => {
        const s = X(0.011);
        body.push(path([[bx * w - s, Y(by)], [bx * w - s * 0.3, Y(by) - Y(0.006)], [bx * w, Y(by)]],
            'stroke="#5d7f92" stroke-width="2.4" fill="none"', false));
        body.push(path([[bx * w, Y(by)], [bx * w + s * 0.3, Y(by) - Y(0.006)], [bx * w + s, Y(by)]],
            'stroke="#5d7f92" stroke-width="2.4" fill="none"', false));
    });

    // 地面（混凝土 + 透视缝 + 铁网投影）
    defs.push(lin(`${P}ground`, [[0, '#cfcdc6'], [0.45, '#c0beb6'], [1, '#a9a7a0']]));
    body.push(rect(0, Y(0.715), w, h - Y(0.715), `fill="url(#${P}ground)"`));
    for (let i = -6; i <= 6; i++) {
        body.push(line(X(0.5) + i * X(0.16), Y(0.715), X(0.5) + i * X(0.42), h, 'stroke="#9c9a93" stroke-width="1.8" opacity="0.45"'));
    }
    for (let i = 1; i <= 4; i++) {
        const y = Y(0.715 + (1 - 0.715) * Math.pow(i / 5, 1.7));
        body.push(line(0, y, w, y, 'stroke="#9c9a93" stroke-width="2" opacity="0.4"'));
    }
    fencePattern(`${P}meshGround`, defs, X(0.0215), '#8e8c86', w * 0.0013);
    body.push(rect(0, Y(0.715), w, Y(0.115), `fill="url(#${P}meshGround)" opacity="0.16"`));

    rooftopScaffold({
        P, X, Y, w, h, defs, body,
        col: {
            tower: '#8b98a6', towerLight: '#adbbc8', towerDark: '#6b7885',
            mesh: '#a9b3bb', fenceLight: '#ffffff', fenceDark: '#6d7a84',
            rail: '#b9c2c8', railLight: '#d7dee2', post: '#9aa5ad',
            parapet: '#c6c4bc', coping: '#e6e4dc', parapetDark: '#a8a69f',
        },
        meshOpacity: 0.55,
        towerX0: 0.115, towerX1: 0.255, towerTop: 0.10, towerBot: 0.295,
    });

    const v = vignette(P, w, h, '#2a4258', 0.34, 0.46, 0.86);
    defs.push(v.def);
    body.push(v.body);
    return svgDoc(w, h, defs, body);
}

// ============================================================== 黄昏天台

function rooftopSunset(w, h) {
    const P = 'rooftop_sunset_';
    const X = (u) => u * w;
    const Y = (v) => v * h;
    const defs = [];
    const body = [];
    const horizon = 0.50;
    const rng = makeRng(20250);

    // 天空：紫 → 橙 → 金
    defs.push(lin(`${P}sky`, [
        [0, '#3b2a63'], [0.22, '#7b3f6d'], [0.44, '#c85a4b'], [0.62, '#f08a45'], [0.80, '#ffb75e'], [1, '#ffe2a4'],
    ]));
    body.push(rect(0, 0, w, Y(horizon + 0.02), `fill="url(#${P}sky)"`));
    // 太阳（压在海平线上）
    softSpot(P, 'sunGlow', defs, body, X(0.635), Y(horizon - 0.02), X(0.40), Y(0.30), '#ffd27a', 0.62);
    defs.push(rad(`${P}sun`, [[0, '#fff6cf', 1], [0.72, '#ffe08a', 1], [1, '#ffb44f', 0.9]]));
    body.push(circle(X(0.635), Y(horizon - 0.015), Y(0.072), `fill="url(#${P}sun)"`));
    // 云：横向拉长的条带，底紫顶金
    [[0.30, 0.14, 0.20, 0.026], [0.62, 0.09, 0.26, 0.020], [0.82, 0.20, 0.17, 0.019],
        [0.18, 0.27, 0.15, 0.016], [0.48, 0.33, 0.22, 0.014], [0.86, 0.38, 0.14, 0.012]]
        .forEach(([cx, cy, rx, ry]) => {
            body.push(ellipse(X(cx), Y(cy + ry * 0.6), X(rx), Y(ry * 1.3), 'fill="#6b3a68" opacity="0.85"'));
            body.push(ellipse(X(cx), Y(cy), X(rx), Y(ry), 'fill="#ffcf92" opacity="0.9"'));
            body.push(ellipse(X(cx - rx * 0.2), Y(cy - ry * 0.35), X(rx * 0.7), Y(ry * 0.6), 'fill="#fff0c0" opacity="0.75"'));
        });
    // 远山
    body.push(poly([[X(0), Y(horizon)], [X(0.10), Y(0.415)], [X(0.20), Y(horizon)]], 'fill="#5c3465"'));
    body.push(poly([[X(0.14), Y(horizon)], [X(0.26), Y(0.395)], [X(0.38), Y(horizon)]], 'fill="#4d2b5b"'));
    body.push(poly([[X(0.70), Y(horizon)], [X(0.80), Y(0.43)], [X(0.92), Y(horizon)]], 'fill="#55305f"'));

    // 海面 + 太阳反光柱
    defs.push(lin(`${P}sea`, [[0, '#e8845a'], [0.25, '#b2505a'], [0.6, '#6b3a68'], [1, '#42305c']]));
    body.push(rect(0, Y(horizon), w, Y(0.68 - horizon), `fill="url(#${P}sea)"`));
    body.push(rect(X(0.635) - X(0.10), Y(horizon), X(0.20), Y(0.68 - horizon), 'fill="#ffcf7e" opacity="0.30"'));
    for (let i = 0; i < 60; i++) {
        const t = rng();
        const sy = Y(horizon + 0.004 + t * (0.66 - horizon));
        const half = X(0.012 + t * 0.115);
        const cx = X(0.635) + X((rng() - 0.5) * 0.05) * t;
        body.push(line(cx - half, sy, cx + half, sy,
            `stroke="#ffe3a8" stroke-width="${n1(1.5 + t * 3.5)}" opacity="${n1(0.75 - t * 0.4)}"`));
    }
    for (let i = 0; i < 26; i++) {
        const sx = X(span(rng, 0, 1));
        const sy = Y(span(rng, horizon + 0.01, 0.665));
        body.push(line(sx, sy, sx + X(span(rng, 0.01, 0.04)), sy, 'stroke="#3a2a55" stroke-width="2" opacity="0.35"'));
    }

    // 地面（被夕阳染成暖灰紫）
    defs.push(lin(`${P}ground`, [[0, '#8c6472'], [0.4, '#6d4a62'], [1, '#4a3350']]));
    body.push(rect(0, Y(0.715), w, h - Y(0.715), `fill="url(#${P}ground)"`));
    defs.push(lin(`${P}floorLight`, [[0, '#ffc887', 0.42], [1, '#ff9d5c', 0.05]]));
    body.push(poly([[X(0.30), Y(0.715)], [X(1.0), Y(0.715)], [X(1.0), h], [X(0.02), h]], `fill="url(#${P}floorLight)"`));
    for (let i = -5; i <= 5; i++) {
        body.push(line(X(0.55) + i * X(0.10), Y(0.715), X(0.55) + i * X(0.30), h, 'stroke="#3d2a44" stroke-width="2" opacity="0.30"'));
    }

    rooftopScaffold({
        P, X, Y, w, h, defs, body,
        col: {
            tower: '#3b2b46', towerLight: '#5b4360', towerDark: '#241a30',
            mesh: '#2c2036', fenceLight: '#c98a6a', fenceDark: '#1c1426',
            rail: '#241a30', railLight: '#3b2b44', post: '#1f1729',
            parapet: '#382744', coping: '#6b4a5e', parapetDark: '#241a30',
        },
        meshOpacity: 0.75,
        towerX0: 0.70, towerX1: 0.83, towerTop: 0.115, towerBot: 0.30,
    });

    const v = vignette(P, w, h, '#2a1236', 0.48, 0.40, 0.86);
    defs.push(v.def);
    body.push(v.body);
    return svgDoc(w, h, defs, body);
}

// ============================================================== 星空天台

function rooftopNight(w, h) {
    const P = 'rooftop_night_';
    const X = (u) => u * w;
    const Y = (v) => v * h;
    const defs = [];
    const body = [];
    const horizon = 0.505;
    const rng = makeRng(881122);

    // 夜空
    defs.push(lin(`${P}sky`, [[0, '#050a1c'], [0.35, '#0a1430'], [0.68, '#16224a'], [1, '#2b3560']]));
    body.push(rect(0, 0, w, Y(0.70), `fill="url(#${P}sky)"`));
    // 银河：斜向的模糊亮带
    defs.push(blur(`${P}milkyBlur`, h * 0.045));
    body.push(`<g transform="rotate(-27 ${n1(X(0.5))} ${n1(Y(0.3))})" filter="url(#${P}milkyBlur)" opacity="0.85">`);
    body.push(ellipse(X(0.46), Y(0.28), X(0.46), Y(0.105), 'fill="#6f7fc0" opacity="0.32"'));
    body.push(ellipse(X(0.40), Y(0.26), X(0.32), Y(0.055), 'fill="#9aa8e0" opacity="0.28"'));
    body.push(ellipse(X(0.62), Y(0.34), X(0.26), Y(0.045), 'fill="#c9b6e8" opacity="0.22"'));
    body.push('</g>');
    // 银河里的密集星尘
    for (let i = 0; i < 220; i++) {
        const t = rng();
        const bx = X(0.06 + t * 0.88);
        const by = Y(0.05 + t * 0.42) + Y((rng() - 0.5) * 0.14);
        body.push(circle(bx, by, n1(span(rng, 0.5, 1.7)), `fill="#e8eeff" opacity="${n1(span(rng, 0.25, 0.9))}"`));
    }
    // 亮星（带十字光芒）
    const bright = [[0.13, 0.10, 1.0], [0.28, 0.22, 0.8], [0.47, 0.08, 0.9], [0.63, 0.18, 0.75],
        [0.78, 0.10, 1.0], [0.88, 0.27, 0.7], [0.36, 0.36, 0.65], [0.70, 0.40, 0.6], [0.20, 0.44, 0.55]];
    bright.forEach(([sx, sy, s]) => {
        const r = Y(0.004 * s);
        softSpot(P, `star${Math.round(sx * 1000)}`, defs, body, X(sx), Y(sy), r * 7, r * 7, '#cfe0ff', 0.55);
        body.push(circle(X(sx), Y(sy), r, 'fill="#ffffff"'));
        body.push(line(X(sx) - r * 6, Y(sy), X(sx) + r * 6, Y(sy), 'stroke="#dfe9ff" stroke-width="1.6" opacity="0.7"'));
        body.push(line(X(sx), Y(sy) - r * 6, X(sx), Y(sy) + r * 6, 'stroke="#dfe9ff" stroke-width="1.6" opacity="0.7"'));
    });
    // 流星
    defs.push(lin(`${P}meteor`, [[0, '#ffffff', 0], [0.72, '#dfeaff', 0.85], [1, '#ffffff', 0]], { x1: 1, y1: 0, x2: 0, y2: 0 }));
    body.push(path([[X(0.90), Y(0.06)], [X(0.62), Y(0.225)]], `stroke="url(#${P}meteor)" stroke-width="${n1(Y(0.007))}" fill="none"`, false));
    body.push(circle(X(0.90), Y(0.06), Y(0.007), 'fill="#ffffff"'));
    softSpot(P, 'meteorGlow', defs, body, X(0.90), Y(0.06), Y(0.05), Y(0.05), '#ffffff', 0.55);
    body.push(path([[X(0.40), Y(0.30)], [X(0.28), Y(0.375)]], `stroke="url(#${P}meteor)" stroke-width="${n1(Y(0.004))}" fill="none" opacity="0.75"`, false));
    // 地平线附近的城市灯火
    body.push(rect(0, Y(horizon), w, Y(0.70 - horizon), 'fill="#2a3358"'));
    body.push(rect(0, Y(horizon), w, Y(0.01), 'fill="#c98a4e" opacity="0.35"'));
    for (let i = 0; i < 90; i++) {
        const lx = X(span(rng, 0, 1));
        const ly = Y(span(rng, horizon + 0.005, 0.665));
        const lr = n1(span(rng, 0.8, 2.4));
        body.push(circle(lx, ly, lr, `fill="${pick(rng, ['#ffd27a', '#ffb45e', '#ffe9b0', '#9fd0ff'])}" opacity="${n1(span(rng, 0.35, 0.95))}"`));
    }
    softSpot(P, 'cityGlow', defs, body, X(0.5), Y(horizon + 0.03), X(0.75), Y(0.10), '#ffb45e', 0.22);

    // 地面：几乎全黑，带一点冷色反光
    defs.push(lin(`${P}ground`, [[0, '#161e3a'], [0.5, '#0e1428'], [1, '#080c18']]));
    body.push(rect(0, Y(0.715), w, h - Y(0.715), `fill="url(#${P}ground)"`));
    body.push(poly([[X(0.16), Y(0.715)], [X(0.52), Y(0.715)], [X(0.66), h], [X(0.04), h]], 'fill="#39466e" opacity="0.22"'));
    body.push(poly([[X(0.20), Y(0.715)], [X(0.26), Y(0.715)], [X(0.30), h], [X(0.02), h]], 'fill="#4a5a86" opacity="0.14"'));

    rooftopScaffold({
        P, X, Y, w, h, defs, body,
        col: {
            tower: '#070b16', towerLight: '#111a2e', towerDark: '#04060c',
            mesh: '#1b2444', fenceLight: '#8fa0c8', fenceDark: '#05080f',
            rail: '#04060c', railLight: '#131c31', post: '#04060c',
            parapet: '#080d18', coping: '#1b2440', parapetDark: '#04060c',
        },
        meshOpacity: 0.85,
        towerX0: 0.115, towerX1: 0.255, towerTop: 0.10, towerBot: 0.295,
    });

    const v = vignette(P, w, h, '#000000', 0.55, 0.36, 0.9);
    defs.push(v.def);
    body.push(v.body);
    return svgDoc(w, h, defs, body);
}

// ============================================================== 图书馆

/** 星图海报：深色底 + 网格 + 星点 + 连线（不出现任何文字）。 */
function starChart(o) {
    const { X, Y, defs, body, P, x, y, wd, ht, seed, glow } = o;
    const rng = makeRng(seed);
    const out = [];
    if (glow) {
        defs.push(rad(`${P}chartGlow${seed}`, [[0, '#ffe6b0', 0.55], [1, '#ffe6b0', 0]]));
        out.push(rect(x - X(0.03), y - Y(0.05), wd + X(0.06), ht + Y(0.10), `fill="url(#${P}chartGlow${seed})"`));
    }
    out.push(rect(x, y, wd, ht, `fill="#141d33"`));
    out.push(rect(x, y, wd, Y(0.008), 'fill="#2c3a5c"'));
    // 网格
    for (let i = 1; i < 4; i++) {
        out.push(line(x + (wd / 4) * i, y, x + (wd / 4) * i, y + ht, 'stroke="#26324e" stroke-width="1.4"'));
    }
    for (let i = 1; i < 3; i++) {
        out.push(line(x, y + (ht / 3) * i, x + wd, y + (ht / 3) * i, 'stroke="#26324e" stroke-width="1.4"'));
    }
    out.push(ellipse(x + wd * 0.5, y + ht * 0.5, wd * 0.34, ht * 0.30, 'fill="none" stroke="#33425f" stroke-width="1.6"'));
    // 星点 + 连线
    const stars = [];
    for (let i = 0; i < 26; i++) {
        const sx = x + wd * span(rng, 0.06, 0.94);
        const sy = y + ht * span(rng, 0.08, 0.92);
        const r = Math.max(1, wd * span(rng, 0.006, 0.022));
        stars.push([sx, sy]);
        out.push(circle(sx, sy, r, `fill="#dfe9ff" opacity="${n1(span(rng, 0.5, 1))}"`));
    }
    for (let i = 0; i < 5; i++) {
        const a = stars[Math.floor(rng() * stars.length)];
        const b = stars[Math.floor(rng() * stars.length)];
        if (!a || !b) continue;
        out.push(line(a[0], a[1], b[0], b[1], 'stroke="#5f7ab0" stroke-width="1.3" opacity="0.55"'));
    }
    out.push(rect(x - X(0.006), y - Y(0.008), wd + X(0.012), ht + Y(0.016), 'fill="none" stroke="#6b4a30" stroke-width="5"'));
    return out;
}

function libraryScene(w, h) {
    const P = 'library_';
    const X = (u) => u * w;
    const Y = (v) => v * h;
    const defs = [];
    const body = [];
    const rng = makeRng(60607);
    const shelfTop = 0.05;
    const shelfBot = 0.62;

    // 墙 / 地板
    defs.push(lin(`${P}wall`, [[0, '#4a3a2e'], [0.5, '#3b2e24'], [1, '#2a2018']]));
    body.push(rect(0, 0, w, h, `fill="url(#${P}wall)"`));
    defs.push(lin(`${P}floor`, [[0, '#4b3524'], [0.5, '#3a2a1d'], [1, '#241a12']]));
    body.push(rect(0, Y(0.62), w, h - Y(0.62), `fill="url(#${P}floor)"`));
    for (let i = -6; i <= 6; i++) {
        body.push(line(X(1.12) + i * X(0.10), Y(0.62), X(1.32) + i * X(0.34), h, 'stroke="#5b422c" stroke-width="2" opacity="0.35"'));
    }

    // ---------- 书架（整面墙，5 个隔间 × 3 层） ----------
    const bays = [0.02, 0.215, 0.41, 0.605, 0.80, 0.98];
    body.push(rect(X(0.0), Y(shelfTop - 0.02), w, Y(shelfBot - shelfTop + 0.04), 'fill="#3a2a1e"'));
    body.push(rect(X(0.0), Y(shelfTop - 0.02), w, Y(0.014), 'fill="#6d4d33"'));
    const bookCols = ['#8c4b3c', '#3f5d47', '#4a5478', '#a07a45', '#6d4a5e', '#2f4a52', '#8a6a4a', '#5d6b3f', '#7a4436', '#40556b'];
    const shelfYs = [[0.075, 0.245], [0.275, 0.445], [0.475, 0.62]];
    bays.slice(0, -1).forEach((u0, bi) => {
        const u1 = bays[bi + 1] - 0.014;
        if (u1 <= u0) return;
        // 隔间背板
        body.push(rect(X(u0), Y(shelfTop), X(u1 - u0), Y(shelfBot - shelfTop), 'fill="#241a12"'));
        shelfYs.forEach(([sy0, sy1]) => {
            const boardY = Y(sy1);
            body.push(rect(X(u0), boardY, X(u1 - u0), Y(0.014), 'fill="#6d4d33"'));
            body.push(rect(X(u0), boardY, X(u1 - u0), Y(0.004), 'fill="#8a6444"'));
            // 一排书：宽度、高度、颜色都不同，偶尔留空隙
            let uu = u0 + 0.006;
            const shelfH = Y(sy1 - sy0) * 0.92;
            while (uu < u1 - 0.012) {
                const bw = span(rng, 0.008, 0.021);
                if (rng() < 0.07) { uu += bw * 0.6; continue; }
                const bh = shelfH * span(rng, 0.68, 1.0);
                const bx = X(uu);
                const byTop = boardY - bh;
                body.push(rect(bx, byTop, X(bw) * 0.88, bh, `fill="${pick(rng, bookCols)}"`));
                body.push(rect(bx, byTop, X(bw) * 0.88, Y(0.004), 'fill="#ffffff" opacity="0.13"'));
                if (rng() < 0.25) {
                    body.push(rect(bx + X(bw) * 0.3, byTop + bh * 0.45, X(bw) * 0.4, Y(0.006), 'fill="#c9a86a" opacity="0.6"'));
                }
                uu += bw;
            }
            // 侧板
            body.push(rect(X(u0), Y(sy0), X(0.008), Y(sy1 - sy0), 'fill="#543a26"'));
            body.push(rect(X(u1) - X(0.008), Y(sy0), X(0.008), Y(sy1 - sy0), 'fill="#4a3222"'));
        });
        // 立柱
        body.push(rect(X(bays[bi + 1] - 0.016), Y(shelfTop - 0.02), X(0.02), Y(shelfBot - shelfTop + 0.06), 'fill="#6d4d33"'));
        body.push(rect(X(bays[bi + 1] - 0.016), Y(shelfTop - 0.02), X(0.007), Y(shelfBot - shelfTop + 0.06), 'fill="#8f6a48"'));
    });
    // 檐口 + 顶部阴影
    body.push(rect(0, Y(shelfTop - 0.035), w, Y(0.02), 'fill="#7a5637"'));
    defs.push(lin(`${P}ceilShade`, [[0, '#0d0a06', 0.85], [1, '#0d0a06', 0.15]]));
    body.push(rect(0, 0, w, Y(0.12), `fill="url(#${P}ceilShade)"`));

    // ---------- 左侧窗（画外光的来源） ----------
    defs.push(lin(`${P}win`, [[0, '#2a3a44'], [0.4, '#7fa9b8'], [1, '#e8f2ee']], { x1: 0, y1: 0, x2: 1, y2: 0.4 }));
    body.push(poly([[0, Y(0.06)], [X(0.10), Y(0.11)], [X(0.10), Y(0.44)], [0, Y(0.52)]], `fill="url(#${P}win)"`));
    body.push(rect(X(0.099), Y(0.105), X(0.012), Y(0.34), 'fill="#c9b28c"'));
    softSpot(P, 'winGlow', defs, body, X(0.06), Y(0.28), X(0.26), Y(0.34), '#e8f4ff', 0.30);

    // ---------- 长桌 ----------
    const tA = [X(0.20), Y(0.735)];
    const tB = [X(0.84), Y(0.735)];
    const tC = [X(0.94), Y(0.855)];
    const tD = [X(0.08), Y(0.855)];
    body.push(poly([tA, tB, tC, tD], 'fill="#8a5f3d"'));
    defs.push(lin(`${P}tableTop`, [[0, '#a97a4e'], [0.45, '#8f6440'], [1, '#6d4a2e']]));
    body.push(poly([tA, tB, tC, tD], `fill="url(#${P}tableTop)" opacity="0.85"`));
    body.push(poly([tA, tB, [tB[0], tB[1] + Y(0.006)], [tA[0], tA[1] + Y(0.006)]], 'fill="#c9a06a" opacity="0.6"'));
    body.push(poly([tD, tC, [tC[0], tC[1] + Y(0.035)], [tD[0], tD[1] + Y(0.035)]], 'fill="#5b3d26"'));
    [[0.14, 0.90], [0.32, 0.94], [0.70, 0.94], [0.88, 0.90]].forEach(([lx, ly]) => {
        body.push(rect(X(lx), Y(0.855), X(0.03), Y(ly - 0.855), 'fill="#4a3222"'));
        body.push(rect(X(lx), Y(0.855), X(0.009), Y(ly - 0.855), 'fill="#6b4a30"'));
    });

    // 椅子靠背（桌子后面露出两把）
    [[0.30, 0.72, 0.10], [0.66, 0.72, 0.10]].forEach(([cx, cy, cw]) => {
        body.push(rect(X(cx - cw / 2), Y(cy - 0.13), X(cw), Y(0.10), 'fill="#5b3d26" rx="6"'));
        body.push(rect(X(cx - cw / 2), Y(cy - 0.13), X(cw), Y(0.012), 'fill="#7a5637"'));
    });

    // ---------- 桌上的东西 ----------
    // 书堆
    const stack = [[0.16, 0.795, 0.10, '#8c4b3c'], [0.165, 0.782, 0.09, '#3f5d47'], [0.158, 0.770, 0.105, '#a07a45']];
    stack.forEach(([sx, sy, sw, sc]) => {
        body.push(rect(X(sx), Y(sy), X(sw), Y(0.017), `fill="${sc}"`));
        body.push(rect(X(sx), Y(sy), X(sw), Y(0.004), 'fill="#ffffff" opacity="0.2"'));
    });
    // 摊开的书
    body.push(poly([[X(0.44), Y(0.79)], [X(0.60), Y(0.785)], [X(0.605), Y(0.815)], [X(0.443), Y(0.822)]], 'fill="#e8e0c8"'));
    body.push(line(X(0.522), Y(0.787), X(0.524), Y(0.818), 'stroke="#b3a689" stroke-width="3"'));
    // 两盏绿罩台灯
    [[0.30, 0.775], [0.72, 0.775]].forEach(([lx, ly], i) => {
        const bx = X(lx);
        const by = Y(ly + 0.055);
        defs.push(rad(`${P}lampGlow${i}`, [[0, '#ffdf9a', 0.85], [0.45, '#ffc46a', 0.35], [1, '#ffb45e', 0]]));
        body.push(ellipse(bx, Y(ly + 0.05), X(0.16), Y(0.12), `fill="url(#${P}lampGlow${i})"`));
        body.push(ellipse(bx, by, X(0.055), Y(0.012), 'fill="#2f3a35"'));
        body.push(rect(bx - X(0.006), Y(ly + 0.012), X(0.012), Y(0.045), 'fill="#2f3a35"'));
        body.push(poly([[bx - X(0.062), Y(ly + 0.018)], [bx + X(0.062), Y(ly + 0.018)],
            [bx + X(0.034), Y(ly - 0.022)], [bx - X(0.034), Y(ly - 0.022)]], 'fill="#2f6b4f"'));
        body.push(poly([[bx - X(0.062), Y(ly + 0.018)], [bx + X(0.062), Y(ly + 0.018)],
            [bx + X(0.058), Y(ly + 0.008)], [bx - X(0.058), Y(ly + 0.008)]], 'fill="#3f8a63"'));
        body.push(ellipse(bx, Y(ly + 0.020), X(0.052), Y(0.010), 'fill="#ffeec0" opacity="0.95"'));
    });

    // ---------- 光效 ----------
    defs.push(blur(`${P}soft`, h * 0.02));
    body.push(`<g filter="url(#${P}soft)">`);
    body.push(poly([[X(0.02), Y(0.06)], [X(0.30), Y(0.10)], [X(0.58), Y(0.62)], [X(0.06), Y(0.72)]], 'fill="#dceaf2" opacity="0.16"'));
    body.push('</g>');
    for (let i = 0; i < 46; i++) {
        const t = rng();
        body.push(circle(X(0.04 + t * 0.52), Y(0.12 + t * 0.55 + span(rng, -0.06, 0.06)),
            n1(span(rng, 0.8, 2.2)), `fill="#fff4d8" opacity="${n1(span(rng, 0.15, 0.5))}"`));
    }
    const v = vignette(P, w, h, '#150e08', 0.6, 0.34, 0.86);
    defs.push(v.def);
    body.push(v.body);
    return svgDoc(w, h, defs, body);
}

// ============================================================== 樱花中庭

function courtyardSakura(w, h) {
    const P = 'courtyard_sakura_';
    const X = (u) => u * w;
    const Y = (v) => v * h;
    const defs = [];
    const body = [];
    const rng = makeRng(31337);

    // 天空（淡蓝白，春天）
    defs.push(lin(`${P}sky`, [[0, '#a9d8ef'], [0.45, '#cfe9f4'], [1, '#f2f6ee']]));
    body.push(rect(0, 0, w, Y(0.52), `fill="url(#${P}sky)"`));
    softSpot(P, 'sun', defs, body, X(0.80), Y(0.10), X(0.40), Y(0.34), '#fff6d8', 0.40);
    // 远处的教学楼（右）
    body.push(rect(X(0.56), Y(0.24), X(0.46), Y(0.26), 'fill="#d9d5c8"'));
    body.push(rect(X(0.56), Y(0.215), X(0.46), Y(0.03), 'fill="#b0aa9a"'));
    for (let r = 0; r < 2; r++) {
        for (let i = 0; i < 7; i++) {
            body.push(rect(X(0.585 + i * 0.062), Y(0.29 + r * 0.09), X(0.036), Y(0.055), 'fill="#8fa4ad" opacity="0.85"'));
        }
    }
    // 常绿树丛（背景）
    [[0.50, 0.47, 0.055], [0.62, 0.50, 0.05], [0.75, 0.48, 0.045]].forEach(([cx, cy, r]) => {
        body.push(circle(X(cx), Y(cy), Y(r * 2.2), 'fill="#5d8a55"'));
        body.push(circle(X(cx) - Y(r), Y(cy - r * 0.6), Y(r * 1.6), 'fill="#76a566"'));
    });
    // 地面：草地 + 石板路
    defs.push(lin(`${P}ground`, [[0, '#a8c47e'], [0.35, '#93b46e'], [1, '#7d9c5f']]));
    body.push(rect(0, Y(0.52), w, h - Y(0.52), `fill="url(#${P}ground)"`));
    body.push(poly([[X(0.40), Y(0.52)], [X(0.60), Y(0.52)], [X(0.92), h], [X(0.06), h]], 'fill="#d9cfbb"'));
    for (let i = 1; i <= 7; i++) {
        const t = Math.pow(i / 8, 1.5);
        const y = Y(0.52) + (h - Y(0.52)) * t;
        const halfTop = (0.10 + t * 0.33) * w;
        body.push(line(X(0.5) - halfTop, y, X(0.5) + halfTop, y, 'stroke="#bfb49d" stroke-width="2.6" opacity="0.8"'));
    }
    // 中庭矮篱
    body.push(rect(0, Y(0.505), w, Y(0.035), 'fill="#6f9a5c"'));
    body.push(rect(0, Y(0.505), w, Y(0.008), 'fill="#8cb573"'));

    // ---------- 樱花树 ----------
    const tree = (cx, baseY, scale, seed) => {
        const tr = makeRng(seed);
        const out = [];
        const trunkW = 0.022 * scale;              // 以 w 为单位
        const canopyY = baseY - 0.34 * scale;
        const trunkTop = canopyY + 0.13 * scale;
        // 地面落瓣（先画，压在树干下面）
        out.push(ellipse(X(cx), Y(baseY + 0.014), X(0.155) * scale, Y(0.018), 'fill="#f3c2d5" opacity="0.75"'));
        // 树干 + 枝
        out.push(poly([[X(cx - trunkW * 0.55), Y(baseY)], [X(cx + trunkW * 0.55), Y(baseY)],
            [X(cx + trunkW * 0.26), Y(trunkTop)], [X(cx - trunkW * 0.26), Y(trunkTop)]], 'fill="#5b4632"'));
        [[-1, 0.10, -0.075], [1, 0.12, 0.065], [-0.6, 0.18, -0.10], [0.7, 0.20, 0.11]].forEach(([s, dy, dx]) => {
            out.push(path([[X(cx), Y(trunkTop - dy * scale * 0.4)], [X(cx + dx * scale), Y(trunkTop - dy * scale)]],
                'stroke="#5b4632" stroke-width="' + n1(X(0.009 * scale)) + '" fill="none"', false));
        });
        // 树冠：三层粉色椭圆团（x 用 w 量纲、y 用 h 量纲，画出来才不会被拉长）
        const layers = [
            { col: '#eea8c6', rx: 0.105, ry: 0.150, bx: 0.062, by: 0.095, n: 9 },
            { col: '#f9c6da', rx: 0.082, ry: 0.120, bx: 0.055, by: 0.080, n: 7 },
            { col: '#fde6ef', rx: 0.048, ry: 0.078, bx: 0.048, by: 0.066, n: 5 },
        ];
        layers.forEach((L, li) => {
            for (let i = 0; i < L.n; i++) {
                const a = (i / L.n) * Math.PI * 2 + li * 1.7;
                out.push(ellipse(
                    X(cx) + Math.cos(a) * X(L.rx * scale * 0.9),
                    Y(canopyY) + Math.sin(a) * Y(L.ry * scale * 0.9),
                    X(L.bx * scale * span(tr, 0.85, 1.2)),
                    Y(L.by * scale * span(tr, 0.80, 1.25)),
                    `fill="${L.col}"`));
            }
            out.push(ellipse(X(cx), Y(canopyY), X(L.rx * scale), Y(L.ry * scale * 0.82), `fill="${L.col}"`));
        });
        return out;
    };
    body.push(...tree(0.17, 0.80, 1.15, 11));
    body.push(...tree(0.84, 0.72, 0.95, 22));
    body.push(...tree(0.50, 0.60, 0.52, 33));

    // ---------- 木长椅 ----------
    const bench = (bx, by, bw) => {
        const out = [];
        out.push(rect(X(bx - bw / 2), Y(by), X(bw), Y(0.022), 'fill="#a9743f"'));
        out.push(rect(X(bx - bw / 2), Y(by), X(bw), Y(0.006), 'fill="#c99659"'));
        out.push(rect(X(bx - bw / 2), Y(by - 0.055), X(bw), Y(0.018), 'fill="#9a6837"'));
        out.push(rect(X(bx - bw / 2), Y(by - 0.055), X(bw), Y(0.005), 'fill="#bd8a4e"'));
        [[-1, 0], [1, 0]].forEach(([s]) => {
            out.push(rect(X(bx + s * bw * 0.38), Y(by + 0.022), X(0.014), Y(0.05), 'fill="#6b4a2c"'));
        });
        out.push(ellipse(X(bx), Y(by + 0.075), X(bw * 0.55), Y(0.012), 'fill="#6f8f57" opacity="0.6"'));
        return out.join('');
    };
    body.push(bench(0.63, 0.80, 0.20));
    body.push(bench(0.30, 0.68, 0.13));

    // ---------- 花瓣 ----------
    for (let i = 0; i < 110; i++) {
        const px = X(span(rng, 0, 1));
        const py = Y(span(rng, 0.05, 1));
        const rx = n1(span(rng, 2.2, 5.4));
        const ry = n1(rx * span(rng, 0.5, 0.8));
        const rot = n1(span(rng, 0, 180));
        body.push(ellipse(px, py, rx, ry,
            `fill="${pick(rng, ['#fbd2e0', '#f8bfd3', '#fde8f0', '#ffffff'])}" opacity="${n1(span(rng, 0.45, 0.95))}"`
            + ` transform="rotate(${rot} ${n1(px)} ${n1(py)})"`));
    }

    const v = vignette(P, w, h, '#5a3f52', 0.32, 0.45, 0.88);
    defs.push(v.def);
    body.push(v.body);
    return svgDoc(w, h, defs, body);
}

// ============================================================== 天文社活动室（白天 / 夜晚）

/**
 * 活动室通用结构：四张拼起来的桌子、墙上星图海报、关不严的窗。
 */
function clubroomScene(pal, w, h) {
    const P = pal.prefix;
    const X = (u) => u * w;
    const Y = (v) => v * h;
    const defs = [];
    const body = [];
    const ctx = { X, Y, w, h, defs, body, P };
    const [wx0, wx1, wy0, wy1] = pal.win;

    // ---------- 墙 / 地板 ----------
    defs.push(lin(`${P}wall`, pal.wall));
    body.push(rect(0, 0, w, h, `fill="url(#${P}wall)"`));
    defs.push(lin(`${P}floor`, pal.floor));
    body.push(rect(0, Y(0.66), w, h - Y(0.66), `fill="url(#${P}floor)"`));
    for (let i = -5; i <= 5; i++) {
        body.push(line(X(0.52) + i * X(0.12), Y(0.66), X(0.52) + i * X(0.36), h, `stroke="${pal.floorLine}" stroke-width="2" opacity="0.4"`));
    }
    body.push(rect(0, Y(0.66) - Y(0.014), w, Y(0.014), `fill="${pal.skirting}"`));

    // ---------- 窗（关不严：右扇错开一条缝） ----------
    const fx = X(wx0);
    const fy = Y(wy0);
    const fw = X(wx1 - wx0);
    const fh = Y(wy1 - wy0);
    const fr = Y(0.014);
    defs.push(`<clipPath id="${P}clip"><rect x="${n1(fx)}" y="${n1(fy)}" width="${n1(fw)}" height="${n1(fh)}"/></clipPath>`);
    body.push(rect(fx - fr, fy - fr, fw + fr * 2, fh + fr * 2, `fill="${pal.frame}"`));
    defs.push(lin(`${P}sky`, pal.sky));
    body.push('<g clip-path="url(#' + P + 'clip)">');
    body.push(rect(fx, fy, fw, fh, `fill="url(#${P}sky)"`));
    body.push(...pal.outside(ctx));
    body.push('</g>');
    // 中挺 + 左扇
    body.push(rect(fx + fw * 0.5 - fr * 0.45, fy, fr * 0.9, fh, `fill="${pal.frame}"`));
    // 右扇关不严：略微错开，露出一条亮缝
    defs.push(lin(`${P}gap`, [[0, pal.gapLight, 0.95], [1, pal.gapLight, 0.35]]));
    body.push(rect(fx + fw * 0.5 - fr, fy, fr * 0.55, fh, `fill="url(#${P}gap)"`));
    body.push(poly([[fx + fw * 0.52, fy - fr * 0.2], [fx + fw, fy - fr * 0.9],
        [fx + fw, fy + fh + fr * 0.9], [fx + fw * 0.52, fy + fh + fr * 0.2]], `fill="${pal.sash}" opacity="0.55"`));
    body.push(rect(fx, fy + fh * 0.18, fw, fr * 0.8, `fill="${pal.frame}"`));
    body.push(rect(fx - fr * 1.4, fy + fh, fw + fr * 2.8, fr * 1.5, `fill="${pal.frame}"`));

    // ---------- 星图海报 ----------
    body.push(...starChart({ X, Y, defs, body, P, x: X(0.44), y: Y(0.12), wd: X(0.19), ht: Y(0.28), seed: 71, glow: pal.chartGlow }));
    body.push(...starChart({ X, Y, defs, body, P, x: X(0.67), y: Y(0.15), wd: X(0.15), ht: Y(0.23), seed: 72, glow: false }));
    body.push(...starChart({ X, Y, defs, body, P, x: X(0.87), y: Y(0.17), wd: X(0.10), ht: Y(0.16), seed: 73, glow: false }));

    // ---------- 后方矮柜 ----------
    body.push(rect(X(0.06), Y(0.50), X(0.30), Y(0.16), `fill="${pal.cabinet}"`));
    body.push(rect(X(0.06), Y(0.50), X(0.30), Y(0.014), `fill="${pal.cabinetTop}"`));
    for (let i = 1; i < 3; i++) {
        body.push(line(X(0.06 + 0.10 * i), Y(0.51), X(0.06 + 0.10 * i), Y(0.66), `stroke="${pal.cabinetLine}" stroke-width="2.4"`));
    }

    // ---------- 四张拼起来的桌子 ----------
    const A = [X(0.20), Y(0.635)];
    const B = [X(0.80), Y(0.635)];
    const C = [X(0.90), Y(0.865)];
    const D = [X(0.10), Y(0.865)];
    // 桌面四角做双线性插值：u 横向、v 从后到前
    const T = (u, v) => {
        const bx = A[0] + (B[0] - A[0]) * u;      // 后缘
        const by = A[1] + (B[1] - A[1]) * u;
        const fx2 = D[0] + (C[0] - D[0]) * u;     // 前缘
        const fy2 = D[1] + (C[1] - D[1]) * u;
        return [bx + (fx2 - bx) * v, by + (fy2 - by) * v];
    };
    // 桌面阴影
    body.push(ellipse(X(0.5), Y(0.90), X(0.44), Y(0.045), 'fill="#000000" opacity="0.20"'));
    const offs = [[-2, 3], [2, -2], [3, 2], [-2, -1]];
    const quad4 = (u0, u1, v0, v1, k) => {
        const [ox, oy] = offs[k];
        return [T(u0, v0), T(u1, v0), T(u1, v1), T(u0, v1)].map(([px, py]) => [px + ox, py + oy]);
    };
    const pieces = [[0, 0.5, 0, 0.5], [0.5, 1, 0, 0.5], [0, 0.5, 0.5, 1], [0.5, 1, 0.5, 1]];
    pieces.forEach(([u0, u1, v0, v1], i) => {
        const q = quad4(u0, u1, v0, v1, i);
        body.push(poly(q, `fill="${i % 2 ? pal.deskTop : pal.deskTopAlt}"`));
        body.push(poly([q[0], q[1], [q[1][0], q[1][1] + Y(0.006)], [q[0][0], q[0][1] + Y(0.006)]], `fill="${pal.deskEdge}" opacity="0.7"`));
    });
    // 桌沿 + 前挡板 + 桌腿
    body.push(poly([D, C, [C[0], C[1] + Y(0.026)], [D[0], D[1] + Y(0.026)]], `fill="${pal.deskFront}"`));
    [[0.14, 0.10], [0.50, 0.088], [0.86, 0.10]].forEach(([lx, lw]) => {
        body.push(rect(X(lx - lw / 2), Y(0.865) + Y(0.026), X(lw * 0.16), Y(0.11), `fill="${pal.deskLeg}"`));
        body.push(rect(X(lx - lw / 2), Y(0.865) + Y(0.026), X(lw * 0.05), Y(0.11), `fill="${pal.deskLegLight}"`));
    });
    // 椅子（桌后三把 + 桌前一把的靠背）
    [[0.24, 0.615, 0.10], [0.50, 0.615, 0.10], [0.76, 0.615, 0.10]].forEach(([cx, cy, cw]) => {
        body.push(rect(X(cx - cw / 2), Y(cy - 0.12), X(cw), Y(0.095), `fill="${pal.chair}" rx="8"`));
        body.push(rect(X(cx - cw / 2), Y(cy - 0.12), X(cw), Y(0.010), `fill="${pal.chairEdge}"`));
        body.push(rect(X(cx - cw / 2 + 0.012), Y(cy - 0.03), X(cw - 0.024), Y(0.03), `fill="${pal.chair}"`));
    });

    // ---------- 桌上的杂物 ----------
    body.push(poly([[X(0.30), Y(0.700)], [X(0.42), Y(0.694)], [X(0.424), Y(0.726)], [X(0.303), Y(0.734)]], `fill="${pal.paper}"`));
    body.push(poly([[X(0.31), Y(0.706)], [X(0.41), Y(0.700)], [X(0.412), Y(0.716)], [X(0.312), Y(0.723)]], `fill="${pal.paperLine}" opacity="0.5"`));
    body.push(poly([[X(0.56), Y(0.712)], [X(0.70), Y(0.706)], [X(0.703), Y(0.736)], [X(0.562), Y(0.742)]], `fill="${pal.paper}"`));
    // 马克杯
    body.push(rect(X(0.47), Y(0.700), X(0.036), Y(0.038), `fill="${pal.mug}" rx="${n1(Y(0.006))}"`));
    body.push(ellipse(X(0.488), Y(0.700), X(0.018), Y(0.006), `fill="${pal.mugTop}"`));
    body.push(...pal.props(ctx));

    // ---------- 光效 ----------
    pal.light(ctx);

    const v = vignette(P, w, h, pal.vignette, pal.vignetteStrength, 0.38, 0.84);
    defs.push(v.def);
    body.push(v.body);
    return svgDoc(w, h, defs, body);
}

// -------------------------------------------------------------- 活动室（白天）

const PAL_CLUBROOM_DAY = {
    prefix: 'clubroom_',
    wall: [[0, '#eef0e2'], [0.55, '#e3e6d4'], [1, '#d2d6bf']],
    floor: [[0, '#d9bd93'], [0.5, '#c8a97e'], [1, '#b3936a']],
    floorLine: '#a9885e',
    skirting: '#c3bda6',
    win: [0.06, 0.34, 0.16, 0.52],
    frame: '#f7f4e8',
    sash: '#cfd6c8',
    gapLight: '#ffffff',
    sky: [[0, '#8fd0ee'], [0.55, '#c9e9f4'], [1, '#e6f3de']],
    cabinet: '#b9a479', cabinetTop: '#cdb98d', cabinetLine: '#9c8862',
    deskTop: '#dcc49b', deskTopAlt: '#d2b992', deskEdge: '#f0e0c0', deskFront: '#b99a70',
    deskLeg: '#8f7450', deskLegLight: '#a98d63',
    chair: '#a3895f', chairEdge: '#c0a678',
    paper: '#f7f3e4', paperLine: '#b9b39c', mug: '#7f9fb5', mugTop: '#c9dbe6',
    chartGlow: false,
    outside: ({ X, Y, w }) => {
        const out = [];
        out.push(rect(X(0), Y(0.40), w, Y(0.30), 'fill="#95c273"'));
        out.push(rect(X(0), Y(0.40), w, Y(0.02), 'fill="#aad086"'));
        out.push(rect(X(0.52), Y(0.24), X(0.48), Y(0.18), 'fill="#d6dbdd"'));
        out.push(rect(X(0.52), Y(0.215), X(0.48), Y(0.03), 'fill="#a6b1b6"'));
        [[0.62, 0.36, 0.09], [0.78, 0.34, 0.11]].forEach(([tx, ty, tr]) => {
            out.push(circle(X(tx), Y(ty), Y(tr), 'fill="#3f7a46"'));
            out.push(circle(X(tx) - Y(tr * 0.3), Y(ty) - Y(tr * 0.3), Y(tr * 0.7), 'fill="#5fa055"'));
        });
        return out;
    },
    props: ({ X, Y, defs, body, P }) => {
        // 地球仪
        defs.push(rad(`${P}globe`, [[0, '#8fc0d8', 0.9], [0.6, '#5f92b0', 0.9], [1, '#3f6b88', 0.9]], { cx: 0.36, cy: 0.34, r: 0.7 }));
        body.push(ellipse(X(0.80), Y(0.686), X(0.045), Y(0.042), `fill="url(#${P}globe)"`));
        body.push(line(X(0.80), Y(0.728), X(0.80), Y(0.748), 'stroke="#8f7450" stroke-width="5"'));
        body.push(ellipse(X(0.80), Y(0.750), X(0.038), Y(0.008), 'fill="#8f7450"'));
        // 几本散落的书
        body.push(rect(X(0.13), Y(0.700), X(0.10), Y(0.016), 'fill="#8c4b3c"'));
        body.push(rect(X(0.135), Y(0.686), X(0.09), Y(0.015), 'fill="#3f5d47"'));
        return [];
    },
    light: ({ X, Y, w, h, defs, body, P }) => {
        defs.push(blur(`${P}soft`, h * 0.016));
        defs.push(lin(`${P}beam`, [[0, '#fff8dc', 0.05], [1, '#fff8dc', 0.34]]));
        body.push(`<g filter="url(#${P}soft)">`);
        body.push(poly([[X(0.06), Y(0.16)], [X(0.34), Y(0.16)], [X(0.62), h], [X(0.14), h]], `fill="url(#${P}beam)"`));
        body.push(poly([[X(0.28), Y(0.16)], [X(0.35), Y(0.16)], [X(0.56), h], [X(0.40), h]], `fill="url(#${P}beam)" opacity="0.8"`));
        body.push('</g>');
        softSpot(P, 'winGlow', defs, body, X(0.20), Y(0.34), X(0.26), Y(0.24), '#ffffff', 0.35);
    },
    vignette: '#2e3a2a',
    vignetteStrength: 0.36,
};

// -------------------------------------------------------------- 活动室（夜晚）

const PAL_CLUBROOM_NIGHT = {
    prefix: 'clubroom_night_',
    wall: [[0, '#1b2133'], [0.55, '#232a3f'], [1, '#131824']],
    floor: [[0, '#1d2434'], [0.5, '#171d2b'], [1, '#0e1220']],
    floorLine: '#0b0f1a',
    skirting: '#2a3247',
    win: [0.06, 0.34, 0.16, 0.52],
    frame: '#3d4761',
    sash: '#4a5570',
    gapLight: '#cfe0ff',
    sky: [[0, '#050a1a'], [0.5, '#0c1530'], [1, '#1a2547']],
    cabinet: '#2b3349',
    cabinetTop: '#3d4560', cabinetLine: '#232a3d',
    deskTop: '#3a3a46', deskTopAlt: '#333340', deskEdge: '#5b6273', deskFront: '#2b2b36',
    deskLeg: '#22222c', deskLegLight: '#34343f',
    chair: '#2d2d3a', chairEdge: '#454b5e',
    paper: '#d8d3c2', paperLine: '#8f8a78', mug: '#5c7a92', mugTop: '#93aec2',
    chartGlow: true,
    outside: ({ X, Y, w, defs, P }) => {
        const out = [];
        const rng = makeRng(5150);
        for (let i = 0; i < 22; i++) {
            out.push(circle(X(span(rng, 0, 1)), Y(span(rng, 0, 0.5)), n1(span(rng, 0.8, 2.0)),
                `fill="#dfe9ff" opacity="${n1(span(rng, 0.3, 0.95))}"`));
        }
        defs.push(rad(`${P}moon`, [[0, '#d8e6ff', 0.55], [1, '#d8e6ff', 0]]));
        out.push(circle(X(0.74), Y(0.20), Y(0.13), `fill="url(#${P}moon)"`));
        out.push(circle(X(0.74), Y(0.20), Y(0.045), 'fill="#eaf1ff"'));
        out.push(circle(X(0.755), Y(0.188), Y(0.038), 'fill="#0c1530"'));
        out.push(rect(X(0), Y(0.42), w, Y(0.28), 'fill="#070d1c"'));
        out.push(circle(X(0.70), Y(0.40), Y(0.13), 'fill="#050a16"'));
        out.push(circle(X(0.24), Y(0.43), Y(0.10), 'fill="#050a16"'));
        return out;
    },
    props: ({ X, Y, defs, body, P }) => {
        // 桌面台灯（绿色灯罩）+ 摊开的观测记录
        const lx = X(0.30);
        const ly = Y(0.665);
        defs.push(rad(`${P}lampPool`, [[0, '#ffe3a2', 0.85], [0.4, '#ffcb74', 0.42], [1, '#ffb45e', 0]]));
        body.push(ellipse(lx, Y(0.720), X(0.30), Y(0.16), `fill="url(#${P}lampPool)"`));
        body.push(ellipse(lx, Y(0.742), X(0.062), Y(0.014), 'fill="#232b3a"'));
        body.push(rect(lx - X(0.006), Y(0.700), X(0.012), Y(0.045), 'fill="#232b3a"'));
        body.push(poly([[lx - X(0.070), Y(0.706)], [lx + X(0.070), Y(0.706)],
            [lx + X(0.038), Y(0.662)], [lx - X(0.038), Y(0.662)]], 'fill="#2f6b4f"'));
        body.push(poly([[lx - X(0.070), Y(0.706)], [lx + X(0.070), Y(0.706)],
            [lx + X(0.066), Y(0.698)], [lx - X(0.066), Y(0.698)]], 'fill="#428c66"'));
        body.push(ellipse(lx, Y(0.708), X(0.058), Y(0.011), 'fill="#ffeec0" opacity="0.95"'));
        // 摊开的本子
        body.push(poly([[X(0.50), Y(0.700)], [X(0.66), Y(0.694)], [X(0.664), Y(0.728)], [X(0.503), Y(0.734)]], 'fill="#d8d3c2"'));
        body.push(line(X(0.582), Y(0.697), X(0.584), Y(0.731), 'stroke="#a9a390" stroke-width="3"'));
        body.push(line(X(0.52), Y(0.708), X(0.57), Y(0.705), 'stroke="#9c9682" stroke-width="2"'));
        body.push(line(X(0.52), Y(0.716), X(0.57), Y(0.713), 'stroke="#9c9682" stroke-width="2"'));
        body.push(line(X(0.60), Y(0.706), X(0.65), Y(0.703), 'stroke="#9c9682" stroke-width="2"'));
        // 望远镜剪影（墙角）
        body.push(line(X(0.90), Y(0.50), X(0.86), Y(0.72), 'stroke="#111624" stroke-width="7"'));
        body.push(line(X(0.94), Y(0.50), X(0.94), Y(0.72), 'stroke="#111624" stroke-width="7"'));
        body.push(line(X(0.90), Y(0.50), X(0.94), Y(0.72), 'stroke="#111624" stroke-width="5"'));
        body.push(line(X(0.94), Y(0.50), X(0.86), Y(0.72), 'stroke="#111624" stroke-width="5"'));
        body.push(rect(X(0.845), Y(0.42), X(0.19), Y(0.075), 'fill="#0e1320" rx="10"'));
        body.push(rect(X(0.955), Y(0.435), X(0.045), Y(0.045), 'fill="#0a0e18" rx="6"'));
        return [];
    },
    light: ({ X, Y, w, h, defs, body, P }) => {
        // 台灯照到墙上的暖光 + 窗缝的冷光
        softSpot(P, 'wallGlow', defs, body, X(0.30), Y(0.60), X(0.30), Y(0.28), '#ffc978', 0.30);
        defs.push(blur(`${P}soft`, h * 0.018));
        defs.push(lin(`${P}gapBeam`, [[0, '#cfe0ff', 0.30], [1, '#cfe0ff', 0.04]]));
        body.push(`<g filter="url(#${P}soft)">`);
        body.push(poly([[X(0.31), Y(0.16)], [X(0.35), Y(0.16)], [X(0.56), h], [X(0.40), h]], `fill="url(#${P}gapBeam)"`));
        body.push('</g>');
        softSpot(P, 'moonGlow', defs, body, X(0.20), Y(0.30), X(0.24), Y(0.22), '#a8c4ff', 0.22);
    },
    vignette: '#000000',
    vignetteStrength: 0.62,
};

// ============================================================== 黄昏河堤

function riversideSunset(w, h) {
    const P = 'riverside_sunset_';
    const X = (u) => u * w;
    const Y = (v) => v * h;
    const defs = [];
    const body = [];
    const rng = makeRng(70717);
    const waterY = 0.435;
    const waterBot = 0.645;

    // 天空
    defs.push(lin(`${P}sky`, [
        [0, '#4a3a78'], [0.20, '#8a4a76'], [0.42, '#cf6350'], [0.62, '#f2914a'], [0.82, '#ffc06a'], [1, '#ffe6ae'],
    ]));
    body.push(rect(0, 0, w, Y(waterY + 0.01), `fill="url(#${P}sky)"`));
    // 云带
    [[0.24, 0.10, 0.22, 0.016], [0.66, 0.07, 0.28, 0.013], [0.48, 0.20, 0.24, 0.012], [0.84, 0.29, 0.16, 0.010]]
        .forEach(([cx, cy, rx, ry]) => {
            body.push(ellipse(X(cx), Y(cy + ry * 0.7), X(rx), Y(ry * 1.5), 'fill="#7a4270" opacity="0.75"'));
            body.push(ellipse(X(cx), Y(cy), X(rx), Y(ry), 'fill="#ffd79c" opacity="0.9"'));
        });
    // 太阳
    softSpot(P, 'sunGlow', defs, body, X(0.345), Y(0.35), X(0.34), Y(0.26), '#ffd07a', 0.55);
    defs.push(rad(`${P}sun`, [[0, '#fff4cd', 1], [0.7, '#ffdf96', 1], [1, '#ffb457', 0.85]]));
    body.push(circle(X(0.345), Y(0.352), Y(0.062), `fill="url(#${P}sun)"`));
    // 对岸：树丛 + 远处的房子 + 电线杆
    body.push(rect(X(0), Y(0.398), w, Y(0.042), 'fill="#5a4a6a"'));
    [[0.06, 0.40, 0.030], [0.16, 0.398, 0.024], [0.44, 0.40, 0.026], [0.58, 0.398, 0.022], [0.92, 0.40, 0.028]]
        .forEach(([cx, cy, r]) => {
            body.push(circle(X(cx), Y(cy), Y(r * 2.4), 'fill="#4a3a5c"'));
        });
    [[0.28, 0.372, 0.05], [0.68, 0.368, 0.06], [0.82, 0.376, 0.04]].forEach(([cx, cy, cw]) => {
        body.push(rect(X(cx - cw / 2), Y(cy), X(cw), Y(0.036), 'fill="#4d3b5e"'));
        body.push(poly([[X(cx - cw / 2), Y(cy)], [X(cx), Y(cy - 0.018)], [X(cx + cw / 2), Y(cy)]], 'fill="#3f3050"'));
        body.push(rect(X(cx - cw * 0.3), Y(cy + 0.012), X(0.010), Y(0.012), 'fill="#ffce7a" opacity="0.8"'));
    });
    for (let i = 0; i < 5; i++) {
        body.push(line(X(0.36 + i * 0.14), Y(0.40), X(0.36 + i * 0.14), Y(0.352), 'stroke="#3f3050" stroke-width="3"'));
    }
    body.push(line(X(0.36), Y(0.356), X(0.92), Y(0.356), 'stroke="#3f3050" stroke-width="2.4"'));
    body.push(line(X(0.36), Y(0.368), X(0.92), Y(0.368), 'stroke="#3f3050" stroke-width="2.4"'));

    // 远处的桥（横跨河面）
    const bridgeY = 0.375;
    body.push(rect(X(0.30), Y(bridgeY), X(0.70), Y(0.020), 'fill="#4a3455"'));
    body.push(rect(X(0.30), Y(bridgeY - 0.014), X(0.70), Y(0.008), 'fill="#3d2b47"'));
    for (let i = 0; i <= 8; i++) {
        const bx = 0.32 + i * 0.082;
        body.push(rect(X(bx), Y(bridgeY + 0.012), X(0.008), Y(0.55 - bridgeY), 'fill="#42304e"'));
    }
    for (let i = 0; i < 4; i++) {
        body.push(line(X(0.36 + i * 0.164), Y(bridgeY), X(0.44 + i * 0.164), Y(0.50), 'stroke="#4a3455" stroke-width="3" opacity="0.9"'));
    }
    for (let i = 0; i < 14; i++) {
        body.push(line(X(0.32 + i * 0.048), Y(bridgeY - 0.012), X(0.32 + i * 0.048), Y(bridgeY), 'stroke="#5a4066" stroke-width="2"'));
    }

    // 河面
    defs.push(lin(`${P}water`, [[0, '#c9684f'], [0.22, '#8a4a64'], [0.6, '#54406e'], [1, '#3a2f55']]));
    body.push(rect(0, Y(waterY), w, Y(waterBot - waterY), `fill="url(#${P}water)"`));
    // 太阳在河面上的反光柱
    body.push(rect(X(0.345) - X(0.075), Y(waterY), X(0.15), Y(waterBot - waterY), 'fill="#ffc879" opacity="0.35"'));
    for (let i = 0; i < 70; i++) {
        const t = rng();
        const sy = Y(waterY + 0.006 + t * (waterBot - waterY - 0.01));
        const half = X(0.010 + t * 0.10);
        const cx = X(0.345) + X((rng() - 0.5) * 0.05) * t;
        body.push(line(cx - half, sy, cx + half, sy,
            `stroke="#ffe3ac" stroke-width="${n1(1.4 + t * 3.2)}" opacity="${n1(0.85 - t * 0.45)}"`));
    }
    for (let i = 0; i < 30; i++) {
        const sx = X(span(rng, 0, 1));
        const sy = Y(span(rng, waterY + 0.01, waterBot - 0.01));
        body.push(line(sx, sy, sx + X(span(rng, 0.015, 0.055)), sy, 'stroke="#2f2450" stroke-width="2.2" opacity="0.4"'));
    }
    body.push(rect(0, Y(waterY), w, Y(0.004), 'fill="#ffe0a8" opacity="0.7"'));
    // 近岸的暗色底衬（保证堤顶与水面之间不露空）
    body.push(rect(0, Y(0.640), w, h - Y(0.640), 'fill="#243a1e"'));

    // 近岸草堤：堤顶线从左下缓坡到右侧
    const crest = (u) => 0.72 - 0.075 * u;
    const crestPts = [];
    for (let i = 0; i <= 12; i++) crestPts.push([X(i / 12), Y(crest(i / 12))]);
    defs.push(lin(`${P}grass`, [[0, '#6f8a4a'], [0.28, '#54703a'], [0.7, '#3b5229'], [1, '#26381c']]));
    body.push(path([...crestPts, [w, h], [0, h]], `fill="url(#${P}grass)"`));
    // 堤顶亮边（夕阳打在草尖上）
    body.push(path(crestPts, 'stroke="#c9a75c" stroke-width="5" fill="none" opacity="0.85"', false));
    // 草叶
    for (let i = 0; i < 420; i++) {
        const gx = X(span(rng, 0, 1));
        const t = span(rng, 0, 1);
        const gy = Y(crest(gx / w) + t * (1 - crest(gx / w)));
        const gh = Y(0.012 + t * 0.05) * span(rng, 0.6, 1.4);
        const lean = (rng() - 0.5) * 0.02 * w;
        body.push(path([[gx, gy], [gx + lean, gy - gh]],
            `stroke="${pick(rng, ['#39501f', '#2a3c16', '#4d6630', '#8a9a52'])}" stroke-width="${n1(1.4 + t * 2)}" fill="none" opacity="0.8"`, false));
    }
    // 堤顶的护栏（白杆，剪影对着河面）
    const railY = (u) => crest(u) - 0.055;
    for (let i = 0; i <= 9; i++) {
        const u = i / 9;
        body.push(rect(X(u) - X(0.004), Y(railY(u)), X(0.008), Y(0.062), 'fill="#e2d6bd" opacity="0.92"'));
        body.push(ellipse(X(u), Y(railY(u)), X(0.008), Y(0.010), 'fill="#e2d6bd" opacity="0.92"'));
    }
    body.push(path([[0, Y(railY(0) + 0.012)], [w, Y(railY(1) + 0.012)]], 'stroke="#e6dcc4" stroke-width="5" opacity="0.9" fill="none"', false));
    body.push(path([[0, Y(railY(0) + 0.038)], [w, Y(railY(1) + 0.038)]], 'stroke="#d8ccb2" stroke-width="4" opacity="0.85" fill="none"', false));
    // 岸边水草
    [[0.06, 0.30], [0.72, 0.24], [0.88, 0.18]].forEach(([cx, s]) => {
        for (let i = 0; i < 14; i++) {
            const bx = X(cx) + (i - 7) * X(0.006);
            body.push(path([[bx, Y(waterY + 0.004)], [bx + (i - 7) * X(0.0016), Y(waterY - s * 0.03)]],
                'stroke="#2f3a28" stroke-width="3" fill="none" opacity="0.9"', false));
        }
    });

    const v = vignette(P, w, h, '#2a1a38', 0.44, 0.40, 0.86);
    defs.push(v.def);
    body.push(v.body);
    return svgDoc(w, h, defs, body);
}

// ============================================================== 星见祭夜市

/** 一个摊位：暗棚 → 暖光 → 条纹帐 → 灯笼 → 柜台。 */
function festivalStall(o) {
    const { X, Y, defs, body, P, cx, sw, top, bot, seed } = o;
    const rng = makeRng(seed);
    const x0 = X(cx - sw / 2);
    const x1 = X(cx + sw / 2);
    const yTop = Y(top);
    const yBot = Y(bot);
    const out = [];
    // 内部（暖光）
    defs.push(rad(`${P}in${seed}`, [[0, '#ffd98f', 0.95], [0.6, '#e08b3c', 0.75], [1, '#7a3a22', 0.7]]));
    out.push(rect(x0, yTop, x1 - x0, yBot - yTop, `fill="url(#${P}in${seed})"`));
    // 后墙的暗部
    out.push(rect(x0, yTop, x1 - x0, Y(0.045), 'fill="#2a1a18" opacity="0.85"'));
    // 条纹帐（下沿宽的梯形）：整体裁进梯形里，避免条纹溢出色块
    const awn = [[x0 - X(0.012), yTop + Y(0.030)], [x1 + X(0.012), yTop + Y(0.030)],
        [x1 - X(0.030), yTop - Y(0.040)], [x0 + X(0.030), yTop - Y(0.040)]];
    defs.push(`<clipPath id="${P}awn${seed}"><polygon points="${pts(awn)}"/></clipPath>`);
    out.push(`<g clip-path="url(#${P}awn${seed})">`);
    out.push(poly(awn, 'fill="#e8e2d2"'));
    const stripe = pick(rng, ['#c0392f', '#2f5f8a', '#3f7a4a']);
    const step = (x1 - x0 + X(0.024)) / 9;
    for (let i = 0; i < 9; i += 2) {
        out.push(rect(x0 - X(0.012) + step * i, yTop - Y(0.06), step, Y(0.12), `fill="${stripe}"`));
    }
    out.push(rect(x0 - X(0.02), yTop - Y(0.06), (x1 - x0) + X(0.04), Y(0.12), 'fill="#000000" opacity="0.10"'));
    out.push(rect(x0 - X(0.02), yTop - Y(0.06), (x1 - x0) + X(0.04), Y(0.02), 'fill="#000000" opacity="0.16"'));
    out.push('</g>');
    // 帐沿
    out.push(poly([[x0 - X(0.012), yTop + Y(0.030)], [x1 + X(0.012), yTop + Y(0.030)],
        [x1 + X(0.012), yTop + Y(0.040)], [x0 - X(0.012), yTop + Y(0.040)]], 'fill="#8f2f28"'));
    // 立柱
    out.push(rect(x0, yTop + Y(0.02), X(0.010), yBot - yTop - Y(0.02), 'fill="#3a251c"'));
    out.push(rect(x1 - X(0.010), yTop + Y(0.02), X(0.010), yBot - yTop - Y(0.02), 'fill="#3a251c"'));
    // 柜台
    out.push(rect(x0 - X(0.010), yBot - Y(0.075), (x1 - x0) + X(0.020), Y(0.075), 'fill="#5b3a26"'));
    out.push(rect(x0 - X(0.010), yBot - Y(0.075), (x1 - x0) + X(0.020), Y(0.012), 'fill="#8a5f3d"'));
    out.push(rect(x0 - X(0.010), yBot - Y(0.020), (x1 - x0) + X(0.020), Y(0.020), 'fill="#3a251c"'));
    // 灯笼
    const n = 2 + Math.floor(rng() * 2);
    for (let i = 0; i < n; i++) {
        const lx = x0 + (x1 - x0) * ((i + 1) / (n + 1));
        const ly = yTop - Y(0.008) + Y(0.012) * (i % 2);
        const lrx = X(0.022);
        const lry = Y(0.030);
        defs.push(rad(`${P}lamp${seed}_${i}`, [[0, '#ffb45e', 0.7], [1, '#ff8a3c', 0]]));
        out.push(ellipse(lx, ly, lrx * 3.4, lry * 3.0, `fill="url(#${P}lamp${seed}_${i})"`));
        out.push(line(lx, yTop - Y(0.045), lx, ly - lry, 'stroke="#3a251c" stroke-width="2.4"'));
        out.push(ellipse(lx, ly, lrx, lry, 'fill="#e8543c"'));
        out.push(ellipse(lx, ly, lrx * 0.72, lry * 0.92, 'fill="#ff7a4a"'));
        out.push(rect(lx - lrx * 0.5, ly - lry - Y(0.004), lrx, Y(0.008), 'fill="#2a1a18"'));
        out.push(rect(lx - lrx * 0.5, ly + lry - Y(0.004), lrx, Y(0.008), 'fill="#2a1a18"'));
    }
    return out.join('');
}

function festivalNight(w, h) {
    const P = 'festival_night_';
    const X = (u) => u * w;
    const Y = (v) => v * h;
    const defs = [];
    const body = [];
    const rng = makeRng(191919);

    // 夜空
    defs.push(lin(`${P}sky`, [[0, '#0a1026'], [0.45, '#182046'], [0.78, '#2f3358'], [1, '#4a3a52']]));
    body.push(rect(0, 0, w, Y(0.60), `fill="url(#${P}sky)"`));
    for (let i = 0; i < 70; i++) {
        body.push(circle(X(span(rng, 0, 1)), Y(span(rng, 0, 0.42)), n1(span(rng, 0.7, 1.9)),
            `fill="#e8eeff" opacity="${n1(span(rng, 0.25, 0.9))}"`));
    }
    // 远处神社的鸟居剪影
    const torii = (tx, ty, s) => {
        const out = [];
        out.push(rect(X(tx - 0.0015 * s), Y(ty), X(0.003 * s), Y(0.05 * s), 'fill="#1a1420"'));
        out.push(rect(X(tx + 0.030 * s), Y(ty), X(0.003 * s), Y(0.05 * s), 'fill="#1a1420"'));
        out.push(rect(X(tx - 0.006 * s), Y(ty - 0.004 * s), X(0.046 * s), Y(0.007 * s), 'fill="#1a1420"'));
        out.push(poly([[X(tx - 0.011 * s), Y(ty - 0.004 * s)], [X(tx + 0.051 * s), Y(ty - 0.004 * s)],
            [X(tx + 0.046 * s), Y(ty - 0.011 * s)], [X(tx - 0.006 * s), Y(ty - 0.011 * s)]], 'fill="#1a1420"'));
        return out.join('');
    };
    body.push(torii(0.06, 0.40, 1.0));
    body.push(torii(0.86, 0.44, 0.7));
    softSpot(P, 'fairGlow', defs, body, X(0.5), Y(0.62), X(0.72), Y(0.30), '#ffb45e', 0.30);

    // 地面（夜市土路 + 摊位暖光）
    defs.push(lin(`${P}ground`, [[0, '#3a2a30'], [0.4, '#2a1f28'], [1, '#181220']]));
    body.push(rect(0, Y(0.60), w, h - Y(0.60), `fill="url(#${P}ground)"`));
    defs.push(lin(`${P}groundGlow`, [[0, '#ffb45e', 0.42], [1, '#ff9a4a', 0.06]]));
    body.push(rect(0, Y(0.60), w, Y(0.24), `fill="url(#${P}groundGlow)"`));
    for (let i = 0; i < 26; i++) {
        body.push(line(X(span(rng, 0, 1)), Y(span(rng, 0.62, 1)), X(span(rng, 0, 1)), Y(span(rng, 0.62, 1)),
            `stroke="#c98a4e" stroke-width="2" opacity="0.12"`));
    }

    // 一排摊位（从近到远，尺度递减）
    body.push(festivalStall({ X, Y, defs, body, P, cx: 0.13, sw: 0.24, top: 0.44, bot: 0.93, seed: 31 }));
    body.push(festivalStall({ X, Y, defs, body, P, cx: 0.37, sw: 0.23, top: 0.455, bot: 0.90, seed: 32 }));
    body.push(festivalStall({ X, Y, defs, body, P, cx: 0.60, sw: 0.21, top: 0.465, bot: 0.875, seed: 33 }));
    body.push(festivalStall({ X, Y, defs, body, P, cx: 0.81, sw: 0.19, top: 0.475, bot: 0.855, seed: 34 }));
    body.push(festivalStall({ X, Y, defs, body, P, cx: 0.97, sw: 0.16, top: 0.485, bot: 0.84, seed: 35 }));

    // 天空里的灯笼串（悬链线）
    const cat = [];
    for (let i = 0; i <= 40; i++) {
        const u = i / 40;
        const y = 0.055 + Math.sin(Math.PI * u) * 0.085 + u * 0.02;
        cat.push([X(u), Y(y)]);
    }
    body.push(path(cat, 'stroke="#2a1f28" stroke-width="2.6" fill="none" opacity="0.9"', false));
    for (let i = 1; i < 40; i += 2) {
        const [lx, ly] = cat[i];
        const lr = X(0.011);
        defs.push(rad(`${P}sky${i}`, [[0, '#ffb45e', 0.6], [1, '#ff8a3c', 0]]));
        body.push(ellipse(lx, ly, lr * 3, lr * 2.6, `fill="url(#${P}sky${i})"`));
        body.push(ellipse(lx, ly, lr, lr * 1.35, 'fill="#e8543c"'));
        body.push(ellipse(lx, ly, lr * 0.7, lr * 1.2, 'fill="#ff8a55"'));
        body.push(rect(lx - lr * 0.5, ly - lr * 1.5, lr, lr * 0.35, 'fill="#2a1a18"'));
    }

    // 前景暗色地面 + 暖色反光
    body.push(path([[0, h], [w, h], [w, Y(0.965)], [0, Y(0.99)]], 'fill="#120c16" opacity="0.85"'));

    const v = vignette(P, w, h, '#0a0610', 0.55, 0.38, 0.86);
    defs.push(v.def);
    body.push(v.body);
    return svgDoc(w, h, defs, body);
}

// ============================================================== 夜晚车站

function stationNight(w, h) {
    const P = 'station_night_';
    const X = (u) => u * w;
    const Y = (v) => v * h;
    const defs = [];
    const body = [];
    const rng = makeRng(4444);

    // 夜空
    defs.push(lin(`${P}sky`, [[0, '#080f26'], [0.6, '#122045'], [1, '#26355c']]));
    body.push(rect(0, 0, w, h, `fill="url(#${P}sky)"`));
    for (let i = 0; i < 60; i++) {
        body.push(circle(X(span(rng, 0, 1)), Y(span(rng, 0, 0.45)), n1(span(rng, 0.7, 1.8)),
            `fill="#dfe9ff" opacity="${n1(span(rng, 0.2, 0.85))}"`));
    }
    // 对面站台 / 栅栏
    body.push(rect(0, Y(0.545), w, Y(0.10), 'fill="#141c33"'));
    body.push(rect(0, Y(0.545), w, Y(0.008), 'fill="#26304d"'));
    for (let i = 0; i < 40; i++) {
        body.push(rect(X(i / 40), Y(0.552), X(0.004), Y(0.088), 'fill="#1c2540"'));
    }
    for (let i = 0; i < 25; i++) {
        body.push(circle(X(span(rng, 0, 1)), Y(span(rng, 0.556, 0.60)), n1(span(rng, 1, 2.2)),
            `fill="#ffd27a" opacity="${n1(span(rng, 0.3, 0.9))}"`));
    }
    body.push(rect(0, Y(0.635), w, Y(0.012), 'fill="#2a3350"'));

    // 道床 + 双轨
    defs.push(lin(`${P}ballast`, [[0, '#1b2133'], [1, '#101627']]));
    body.push(rect(0, Y(0.647), w, Y(0.075), `fill="url(#${P}ballast)"`));
    for (let i = 0; i < 26; i++) {
        body.push(rect(X(i / 26 + 0.004), Y(0.655), X(0.022), Y(0.055), 'fill="#232a40" opacity="0.8"'));
    }
    [0.677, 0.706].forEach((ry) => {
        body.push(rect(0, Y(ry), w, Y(0.008), 'fill="#5c6478"'));
        body.push(rect(0, Y(ry), w, Y(0.003), 'fill="#9aa4b8"'));
    });

    // 站台地面（透视）
    defs.push(lin(`${P}plat`, [[0, '#39404f'], [0.4, '#2e3543'], [1, '#222834']]));
    body.push(poly([[0, h], [w, h], [w, Y(0.760)], [0, Y(0.722)]], `fill="url(#${P}plat)"`));
    // 站台边缘的黄线 + 白线
    body.push(poly([[0, Y(0.722)], [w, Y(0.760)], [w, Y(0.772)], [0, Y(0.734)]], 'fill="#c9a13c"'));
    body.push(poly([[0, Y(0.734)], [w, Y(0.772)], [w, Y(0.777)], [0, Y(0.739)]], 'fill="#8f7530" opacity="0.7"'));
    body.push(poly([[0, Y(0.700)], [w, Y(0.700)], [w, Y(0.712)], [0, Y(0.712)]], 'fill="#d8dae0" opacity="0.35"'));
    for (let i = -8; i <= 8; i++) {
        body.push(line(X(0.5) + i * X(0.10), Y(0.78), X(0.5) + i * X(0.34), h, 'stroke="#4a5262" stroke-width="2" opacity="0.5"'));
    }
    for (let i = 1; i <= 4; i++) {
        const y = Y(0.78 + (1 - 0.78) * Math.pow(i / 5, 1.6));
        body.push(line(0, y, w, y, 'stroke="#4a5262" stroke-width="2" opacity="0.4"'));
    }

    // 顶棚
    defs.push(lin(`${P}canopy`, [[0, '#0d1324'], [0.6, '#161d33'], [1, '#1e2740']]));
    body.push(poly([[0, 0], [w, 0], [w, Y(0.205)], [0, Y(0.285)]], `fill="url(#${P}canopy)"`));
    body.push(poly([[0, Y(0.285)], [w, Y(0.205)], [w, Y(0.222)], [0, Y(0.303)]], 'fill="#2c3550"'));
    // 顶棚下的横梁（按透视收窄）
    for (let i = 0; i < 9; i++) {
        const u = Math.pow(i / 8, 1.35);
        const x = X(u);
        const hgt = Y(0.285 - 0.08 * u);
        body.push(rect(x - X(0.006), hgt, X(0.012) * (1 - u * 0.6), Y(0.285 - 0.062 * u) - hgt, 'fill="#0b1020" opacity="0.85"'));
    }
    body.push(line(X(0), Y(0.268), X(w), Y(0.196), 'stroke="#0b1020" stroke-width="6" opacity="0.7"'));

    // 站灯（一排，越远越小）+ 光晕
    const lamps = [[0.10, 0.335], [0.30, 0.318], [0.50, 0.303], [0.70, 0.292], [0.88, 0.283]];
    lamps.forEach(([lx, ly], i) => {
        const s = 1 - i * 0.13;
        const px = X(lx);
        const py = Y(ly);
        defs.push(rad(`${P}lamp${i}`, [[0, '#ffe6ae', 0.85], [0.45, '#ffcb74', 0.32], [1, '#ffb45e', 0]]));
        body.push(ellipse(px, py, X(0.075) * s, Y(0.075) * s, `fill="url(#${P}lamp${i})"`));
        body.push(line(px, Y(0.285 - 0.08 * lx), px, py - Y(0.022) * s, 'stroke="#2a3350" stroke-width="3"'));
        body.push(poly([[px - X(0.030) * s, py + Y(0.020) * s], [px + X(0.030) * s, py + Y(0.020) * s],
            [px + X(0.018) * s, py - Y(0.018) * s], [px - X(0.018) * s, py - Y(0.018) * s]], 'fill="#2a3350"'));
        body.push(ellipse(px, py + Y(0.019) * s, X(0.026) * s, Y(0.008) * s, 'fill="#fff2cd"'));
    });
    // 站台上的灯光反射
    lamps.forEach(([lx], i) => {
        const s = 1 - i * 0.13;
        body.push(poly([[X(lx) - X(0.03) * s, Y(0.79)], [X(lx) + X(0.03) * s, Y(0.79)],
            [X(lx) + X(0.055) * s, h], [X(lx) - X(0.055) * s, h]], 'fill="#ffe0a2" opacity="0.12"'));
    });

    // 远处的信号灯
    defs.push(rad(`${P}signal`, [[0, '#ff5a4a', 0.9], [1, '#ff5a4a', 0]]));
    body.push(circle(X(0.935), Y(0.612), Y(0.032), `fill="url(#${P}signal)"`));
    body.push(circle(X(0.935), Y(0.612), Y(0.008), 'fill="#ff7a6a"'));
    body.push(rect(X(0.9335), Y(0.612), X(0.003), Y(0.038), 'fill="#1a2038"'));
    defs.push(rad(`${P}signal2`, [[0, '#6affa0', 0.8], [1, '#6affa0', 0]]));
    body.push(circle(X(0.055), Y(0.640), Y(0.024), `fill="url(#${P}signal2)"`));
    body.push(circle(X(0.055), Y(0.640), Y(0.006), 'fill="#a8ffc8"'));

    // 柱子
    [[0.20, 0.30], [0.62, 0.24]].forEach(([pxu, tw]) => {
        body.push(rect(X(pxu), Y(0.222), X(tw * 0.06), Y(0.66), 'fill="#1a2138"'));
        body.push(rect(X(pxu), Y(0.222), X(tw * 0.02), Y(0.66), 'fill="#2f3b5c"'));
    });

    const v = vignette(P, w, h, '#04070f', 0.55, 0.36, 0.9);
    defs.push(v.def);
    body.push(v.body);
    return svgDoc(w, h, defs, body);
}

// ============================================================== 天文台圆顶内部

function observatory(w, h) {
    const P = 'observatory_';
    const X = (u) => u * w;
    const Y = (v) => v * h;
    const defs = [];
    const body = [];
    const rng = makeRng(130013);
    const cx = X(0.5);
    const cy = Y(0.86);
    const rx = X(0.80);
    const ry = Y(0.90);
    // 天窗（楔形开口）
    const slit = [[X(0.375), Y(-0.02)], [X(0.625), Y(-0.02)], [X(0.72), Y(0.86)], [X(0.28), Y(0.86)]];

    // 1) 整幅夜空（透过天窗看到的部分）
    defs.push(lin(`${P}sky`, [[0, '#050a1c'], [0.4, '#0a1430'], [0.75, '#141f42'], [1, '#1d2a52']]));
    body.push(rect(0, 0, w, h, `fill="url(#${P}sky)"`));
    const starField = (count, top, bot, bright) => {
        for (let i = 0; i < count; i++) {
            const sx = X(span(rng, 0.05, 0.95));
            const sy = Y(span(rng, top, bot));
            const r = n1(span(rng, 0.7, bright ? 3.0 : 1.8));
            body.push(circle(sx, sy, r, `fill="#e8eeff" opacity="${n1(span(rng, 0.3, 1))}"`));
        }
    };
    starField(90, 0.02, 0.82, false);
    // 银河
    defs.push(blur(`${P}milky`, h * 0.04));
    body.push(`<g transform="rotate(-20 ${n1(cx)} ${n1(Y(0.5))})" filter="url(#${P}milky)" opacity="0.85">`);
    body.push(ellipse(X(0.46), Y(0.52), X(0.34), Y(0.10), 'fill="#8090cc" opacity="0.30"'));
    body.push(ellipse(X(0.52), Y(0.48), X(0.24), Y(0.05), 'fill="#b6a8dc" opacity="0.24"'));
    body.push('</g>');

    // 2) 圆顶壳体（挖掉天窗）
    defs.push(rad(`${P}shell`, [[0, '#39425e', 0.62], [0.55, '#161d31', 0.85], [1, '#080c18', 0.98]], { cx: 0.5, cy: 0.62, r: 0.62 }));
    body.push(`<g clip-path="url(#${P}domeClip)">`);
    body.push(ellipse(cx, cy, rx, ry, `fill="url(#${P}shell)"`));
    body.push('</g>');
    // 圆顶轮廓
    defs.push(`<clipPath id="${P}domeClip"><ellipse cx="${n1(cx)}" cy="${n1(cy)}" rx="${n1(rx)}" ry="${n1(ry)}"/></clipPath>`);
    defs.push(`<clipPath id="${P}slitClip"><polygon points="${pts(slit)}"/></clipPath>`);

    // 3) 天窗重新开出来：把夜空画回楔形里，并加更密的星
    body.push(`<g clip-path="url(#${P}slitClip)">`);
    body.push(rect(0, 0, w, h, `fill="url(#${P}sky)"`));
    starField(120, 0.0, 0.9, true);
    defs.push(blur(`${P}milky2`, h * 0.035));
    body.push(`<g transform="rotate(-22 ${n1(cx)} ${n1(Y(0.45))})" filter="url(#${P}milky2)">`);
    body.push(ellipse(X(0.48), Y(0.40), X(0.22), Y(0.16), 'fill="#93a2e0" opacity="0.40"'));
    body.push(ellipse(X(0.52), Y(0.34), X(0.14), Y(0.07), 'fill="#cbbde8" opacity="0.35"'));
    body.push('</g>');
    for (let i = 0; i < 4; i++) {
        const bx = X(span(rng, 0.32, 0.68));
        const by = Y(span(rng, 0.05, 0.60));
        const r = Y(0.0045);
        softSpot(P, `bs${i}`, defs, body, bx, by, r * 8, r * 8, '#cfe0ff', 0.5);
        body.push(circle(bx, by, r, 'fill="#ffffff"'));
    }
    // 天窗边缘的一线反光
    body.push(poly(slit, 'fill="none" stroke="#8fa0c8" stroke-width="4" opacity="0.55"'));
    body.push('</g>');

    // 4) 圆顶的经线肋 + 纬线环（只画在壳体上，天窗处要挖掉）
    defs.push(`<mask id="${P}ribMask" maskUnits="userSpaceOnUse" x="0" y="0" width="${w}" height="${h}">`
        + `<ellipse cx="${n1(cx)}" cy="${n1(cy)}" rx="${n1(rx)}" ry="${n1(ry)}" fill="#ffffff"/>`
        + `<polygon points="${pts(slit)}" fill="#000000"/></mask>`);
    body.push(`<g mask="url(#${P}ribMask)" opacity="0.75">`);
    for (let i = -5; i <= 5; i++) {
        const k = Math.abs(i) / 5;
        const erx = rx * Math.cos((i / 5) * (Math.PI / 2) * 0.92);
        body.push(`<ellipse cx="${n1(cx)}" cy="${n1(cy)}" rx="${n1(Math.abs(erx))}" ry="${n1(ry)}" fill="none" stroke="#4a5578" stroke-width="${n1(3 - k * 1.4)}" opacity="${n1(0.5 - k * 0.2)}"/>`);
    }
    body.push(`<ellipse cx="${n1(cx)}" cy="${n1(Y(0.62))}" rx="${n1(rx * 0.80)}" ry="${n1(Y(0.13))}" fill="none" stroke="#4a5578" stroke-width="3" opacity="0.45"/>`);
    body.push(`<ellipse cx="${n1(cx)}" cy="${n1(Y(0.78))}" rx="${n1(rx * 0.52)}" ry="${n1(Y(0.09))}" fill="none" stroke="#4a5578" stroke-width="3" opacity="0.4"/>`);
    body.push('</g>');

    // 5) 地板 + 暗房红灯
    defs.push(lin(`${P}floor`, [[0, '#161a28'], [1, '#0a0d16']]));
    body.push(ellipse(cx, Y(0.90), X(1.05), Y(0.22), `fill="url(#${P}floor)"`));
    body.push(rect(0, Y(0.93), w, h - Y(0.93), 'fill="#080b12"'));
    softSpot(P, 'redLamp', defs, body, X(0.14), Y(0.70), X(0.20), Y(0.24), '#c0392f', 0.45);
    body.push(circle(X(0.14), Y(0.70), Y(0.012), 'fill="#e8534a"'));
    body.push(rect(X(0.132), Y(0.70), X(0.016), Y(0.06), 'fill="#1a1420"'));

    // 6) 望远镜剪影
    const tubeA = [X(0.42), Y(0.70)];
    const tubeB = [X(0.74), Y(0.26)];
    body.push(line(X(0.575), Y(0.74), X(0.545), Y(0.96), 'stroke="#0a0e18" stroke-width="' + n1(X(0.035)) + '"'));
    body.push(line(X(0.63), Y(0.72), X(0.665), Y(0.96), 'stroke="#0a0e18" stroke-width="' + n1(X(0.028)) + '"'));
    body.push(line(X(0.545), Y(0.96), X(0.665), Y(0.96), 'stroke="#0a0e18" stroke-width="' + n1(Y(0.02)) + '"'));
    body.push(line(X(0.44), Y(0.74), X(0.42), Y(0.95), 'stroke="#0a0e18" stroke-width="' + n1(X(0.022)) + '"'));
    // 叉臂
    body.push(line(X(0.50), Y(0.60), X(0.47), Y(0.80), 'stroke="#131826" stroke-width="' + n1(X(0.016)) + '"'));
    body.push(line(X(0.50), Y(0.60), X(0.60), Y(0.78), 'stroke="#131826" stroke-width="' + n1(X(0.016)) + '"'));
    // 镜筒
    body.push(line(tubeA[0], tubeA[1], tubeB[0], tubeB[1], 'stroke="#0a0e18" stroke-width="' + n1(Y(0.075)) + '"'));
    body.push(line(tubeB[0], tubeB[1], X(0.79), Y(0.205), 'stroke="#0a0e18" stroke-width="' + n1(Y(0.088)) + '"'));
    // 镜筒高光 + 物镜
    body.push(line(tubeA[0], tubeA[1] - Y(0.028), tubeB[0] + X(0.01), tubeB[1] - Y(0.026),
        'stroke="#5b6a92" stroke-width="3" opacity="0.55"'));
    body.push(ellipse(X(0.795), Y(0.20), X(0.018), Y(0.040), 'fill="#1a2238" transform="rotate(32 ' + n1(X(0.795)) + ' ' + n1(Y(0.20)) + ')"'));
    // 寻星镜
    body.push(line(X(0.60), Y(0.55), X(0.70), Y(0.40), 'stroke="#0d1220" stroke-width="' + n1(Y(0.026)) + '"'));
    // 配重
    body.push(line(X(0.44), Y(0.80), X(0.36), Y(0.90), 'stroke="#0d1220" stroke-width="' + n1(X(0.02)) + '"'));
    body.push(ellipse(X(0.34), Y(0.915), X(0.030), Y(0.035), 'fill="#0d1220"'));

    const v = vignette(P, w, h, '#000000', 0.6, 0.30, 0.92);
    defs.push(v.def);
    body.push(v.body);
    return svgDoc(w, h, defs, body);
}

// ============================================================== 纯黑

function black(w, h) {
    return svgDoc(w, h, [], [rect(0, 0, w, h, 'fill="#000000"')]);
}

// ============================================================== 导出表
export default {
    classroom_day: (w, h) => classroomScene(PAL_CLASSROOM_DAY, w, h),
    classroom_evening: (w, h) => classroomScene(PAL_CLASSROOM_EVENING, w, h),
    classroom_night: (w, h) => classroomScene(PAL_CLASSROOM_NIGHT, w, h),
    hallway_day: hallwayDay,
    rooftop_day: rooftopDay,
    rooftop_sunset: rooftopSunset,
    rooftop_night: rooftopNight,
    library: libraryScene,
    courtyard_sakura: courtyardSakura,
    clubroom: (w, h) => clubroomScene(PAL_CLUBROOM_DAY, w, h),
    clubroom_night: (w, h) => clubroomScene(PAL_CLUBROOM_NIGHT, w, h),
    riverside_sunset: riversideSunset,
    festival_night: festivalNight,
    station_night: stationNight,
    observatory,
    black,
};
