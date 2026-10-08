/** 4 张 galgame 背景（扁平日式动画风）。纯函数、无依赖、无 Math.random；坐标按 w/h 推导；id 带前缀。 */
const n1 = (v) => Math.round(v * 10) / 10; const r2 = (v) => Math.round(v * 100) / 100;
const rng = (seed) => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};
const sp = (g, a, b) => a + (b - a) * g(); const pick = (g, l) => l[Math.min(l.length - 1, Math.floor(g() * l.length))];
const P = (l) => l.map(([x, y]) => `${n1(x)},${n1(y)}`).join(' '); const PG = (l, a) => `<polygon points="${P(l)}" ${a}/>`;
const PT = (l, a, close = true) => `<path d="M ${l.map(([x, y]) => `${n1(x)} ${n1(y)}`).join(' L ')}${close ? ' Z' : ''}" ${a}/>`;
const R = (x, y, ww, hh, a) => `<rect x="${n1(x)}" y="${n1(y)}" width="${n1(Math.max(0, ww))}" height="${n1(Math.max(0, hh))}" ${a}/>`;
const C = (cx, cy, r, a) => `<circle cx="${n1(cx)}" cy="${n1(cy)}" r="${n1(r)}" ${a}/>`;
const E = (cx, cy, rx, ry, a) => `<ellipse cx="${n1(cx)}" cy="${n1(cy)}" rx="${n1(rx)}" ry="${n1(ry)}" ${a}/>`;
const L = (x1, y1, x2, y2, a) => `<line x1="${n1(x1)}" y1="${n1(y1)}" x2="${n1(x2)}" y2="${n1(y2)}" ${a}/>`; const rt = (d, cx, cy) => ` transform="rotate(${r2(d)} ${n1(cx)} ${n1(cy)})"`;
const ST = (l) => l.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op == null ? '' : ` stop-opacity="${op}"`}/>`).join('');
const LG = (id, l, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${ST(l)}</linearGradient>`;
const RG = (id, l, o = {}) => `<radialGradient id="${id}" cx="${o.cx ?? 0.5}" cy="${o.cy ?? 0.5}" r="${o.r ?? 0.5}">${ST(l)}</radialGradient>`;
const svg = (w, h, defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${defs}</defs>${body}</svg>`;

// ============================================================ 1. 图书馆（棕绿）
const library = (w, h) => {
    const X = (u) => u * w, Y = (v) => v * h, g = rng(1103);
    const defs = [
        LG('library_wall', [[0, '#43301f'], [0.5, '#2e2014'], [1, '#1b1108']]), LG('library_floor', [[0, '#82592f'], [0.45, '#553819'], [1, '#291a0c']]),
        LG('library_win', [[0, '#fffbe8'], [0.55, '#ffeda9'], [1, '#f4c97a']]), LG('library_beam', [[0, '#fff4d0', 0.5], [1, '#ffeab0', 0]]),
        LG('library_table', [[0, '#c8944f'], [1, '#784f22']]), RG('library_glow', [[0, '#ffe9a2', 0.85], [1, '#ffd873', 0]]),
        RG('library_vig', [[0.45, '#000', 0], [0.8, '#0a0704', 0.38], [1, '#0a0704', 0.82]]),
    ].join('');
    let s = R(0, 0, w, h, 'fill="url(#library_wall)"') + R(0, Y(0.655), w, h - Y(0.655), 'fill="url(#library_floor)"');
    for (let i = 1; i < 7; i++) s += L(0, Y(0.655 + i * 0.05), w, Y(0.655 + i * 0.05), 'stroke="#2a1a0c" stroke-opacity="0.35" stroke-width="2"');
    s += R(0, Y(0.30), w, Y(0.022), 'fill="#241708"') + R(0, Y(0.322), w, Y(0.014), 'fill="#3d2917"');
    // 高窗 + 光柱
    const wins = []; for (let i = 0; i < 3; i++) {
        const wx = X(0.278 + i * 0.154), ww = X(0.126), wy = Y(0.055), wh = Y(0.255);
        wins.push([wx, wy, ww, wh]);
        s += R(wx - X(0.009), wy - Y(0.022), ww + X(0.018), wh + Y(0.042), 'fill="#4a3117"')
            + R(wx, wy, ww, wh, 'fill="url(#library_win)"')
            + R(wx + ww * 0.47, wy, ww * 0.06, wh, 'fill="#5c3f21"')
            + R(wx, wy + wh * 0.4, ww, wh * 0.045, 'fill="#5c3f21"')
            + R(wx - X(0.018), wy + wh + Y(0.02), ww + X(0.036), Y(0.012), 'fill="#5c3f21"');
    }
    for (const [wx, wy, ww, wh] of wins)
        s += PG([[wx, wy + wh], [wx + ww, wy + wh], [wx + ww + X(0.09), Y(1)], [wx - X(0.15), Y(1)]], 'fill="url(#library_beam)"');
    // 两侧高书架
    const bookCols = ['#7d3b2e', '#4a5c39', '#8a6a33', '#5b3f5e', '#3f5b62', '#8f7a4a', '#6b3a3a', '#42533f'];
    const shelfAt = (x, y, sw, sh, rows) => {
        let o = R(x, y, sw, sh, 'fill="#20150a"') + R(x - sw * 0.04, y - sh * 0.025, sw * 1.08, sh * 0.03, 'fill="#5a3d20"');
        const rh = sh / rows;
        for (let i = 0; i < rows; i++) {
            const ry = y + i * rh, base = ry + rh * 0.86;
            o += R(x, base, sw, rh * 0.13, 'fill="#5a3d20"');
            let cx = x + sw * 0.04;
            const end = x + sw * 0.96;
            while (cx < end - sw * 0.03) {
                const bw = Math.min(sp(g, sw * 0.025, sw * 0.06), end - cx);
                const bh = (rh * 0.78) * sp(g, 0.84, 1);
                o += R(cx, base - bh, bw * 0.92, bh, `fill="${pick(g, bookCols)}"`);
                cx += bw + sw * 0.008;
            }
        }
        return o;
    };
    s += shelfAt(X(0.02), Y(0.10), X(0.165), Y(0.52), 5) + shelfAt(X(0.815), Y(0.10), X(0.165), Y(0.52), 5);
    s += shelfAt(X(0.21), Y(0.40), X(0.58), Y(0.215), 2);
    // 长木桌
    const tx = X(0.195), tw = X(0.61), ty = Y(0.695), th = Y(0.052);
    s += PG([[tx - X(0.02), ty], [tx + tw + X(0.02), ty], [tx + tw, ty + th], [tx, ty + th]], 'fill="url(#library_table)"')
        + PG([[tx, ty + th], [tx + tw, ty + th], [tx + tw, ty + th + Y(0.022)], [tx, ty + th + Y(0.022)]], 'fill="#5b3a17"')
        + R(tx + X(0.045), ty + th + Y(0.02), X(0.024), Y(0.155), 'fill="#472d15"')
        + R(tx + tw - X(0.07), ty + th + Y(0.02), X(0.024), Y(0.155), 'fill="#472d15"')
        + E(X(0.5), Y(0.90), X(0.30), Y(0.055), 'fill="#301f0f" opacity="0.45"');
    // 绿色台灯 x2
    for (const cx of [X(0.335), X(0.655)]) { const ly = ty + th * 0.45;
        s += C(cx, ly, X(0.075), 'fill="url(#library_glow)"')
            + E(cx, ly + Y(0.012), X(0.03), Y(0.013), 'fill="#1e3a2b"')
            + R(cx - X(0.007), ly - Y(0.072), X(0.014), Y(0.072), 'fill="#234436"')
            + PG([[cx - X(0.056), ly - Y(0.05)], [cx + X(0.056), ly - Y(0.05)], [cx + X(0.03), ly - Y(0.112)], [cx - X(0.03), ly - Y(0.112)]], 'fill="#2f6b4f"')
            + E(cx, ly - Y(0.052), X(0.05), Y(0.011), 'fill="#ffe89a" opacity="0.9"');
    }
    // 地板反光 + 尘埃
    for (const [wx, , ww] of wins) s += PG([[wx + ww * 0.1, Y(0.66)], [wx + ww * 0.9, Y(0.66)], [wx + ww * 0.75, Y(0.98)], [wx - ww * 0.08, Y(0.98)]], 'fill="#ffe6ab" opacity="0.10"');
    s += E(X(0.5), Y(0.88), X(0.32), Y(0.10), 'fill="#ffe6ab" opacity="0.10"');
    for (let i = 0; i < 46; i++) s += C(sp(g, X(0.18), X(0.86)), sp(g, Y(0.34), Y(0.95)), sp(g, w * 0.0012, w * 0.0032), `fill="#fff5cf" opacity="${r2(sp(g, 0.15, 0.5))}"`);
    s += R(0, 0, w, h, 'fill="url(#library_vig)"');
    return svg(w, h, defs, s);
};

// ====================================================== 2. 樱花中庭（粉白）
const courtyard_sakura = (w, h) => {
    const X = (u) => u * w, Y = (v) => v * h, g = rng(2029);
    const defs = [
        LG('sakura_sky', [[0, '#a9d2f2'], [0.55, '#dcebf7'], [1, '#f8eff2']]), LG('sakura_wall', [[0, '#f0e3cb'], [1, '#d6c3a3']]),
        LG('sakura_ground', [[0, '#dbc9b6'], [0.6, '#c2ab95'], [1, '#9c8672']]), LG('sakura_trunk', [[0, '#7a5442'], [1, '#4e3227']]),
        RG('sakura_sun', [[0, '#fff6d8', 0.7], [1, '#fff6d8', 0]]), RG('sakura_vig', [[0.5, '#000', 0], [0.85, '#3a2431', 0.22], [1, '#3a2431', 0.55]]),
    ].join('');
    let s = R(0, 0, w, h, 'fill="url(#sakura_sky)"') + C(X(0.84), Y(0.12), X(0.26), 'fill="url(#sakura_sun)"');
    // 教学楼
    const by = Y(0.17), bh = Y(0.47);
    s += R(0, by - Y(0.022), w, Y(0.03), 'fill="#b4a184"') + R(0, by + bh - Y(0.012), w, Y(0.026), 'fill="#c8b598"')
        + R(0, by, w, bh, 'fill="url(#sakura_wall)"');
    const cols = ['#8ea6b8', '#9db3c3'];
    for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 9; c++) {
            const wx = X(0.035 + c * 0.107), wy = Y(0.215 + r * 0.138), ww = X(0.072), wh = Y(0.092);
            s += R(wx - X(0.004), wy - Y(0.008), ww + X(0.008), wh + Y(0.016), 'fill="#f7f1e4"')
                + R(wx, wy, ww, wh, `fill="${cols[(r + c) % 2]}"`)
                + R(wx + ww * 0.47, wy, ww * 0.06, wh, 'fill="#f7f1e4"')
                + R(wx, wy + wh * 0.45, ww, wh * 0.07, 'fill="#f7f1e4"');
        }
    }
    // 地面
    const gy = by + bh;
    s += R(0, gy, w, h - gy, 'fill="url(#sakura_ground)"') + PG([[X(0.30), gy], [X(0.74), gy], [X(0.92), h], [X(0.06), h]], 'fill="#cbb6a0" opacity="0.5"');
    // 樱花树
    const trunk = (bx, byy, tx, tyy, bw) => PT([[bx - bw, byy], [bx + bw, byy], [tx + bw * 0.32, tyy], [tx - bw * 0.32, tyy]], 'fill="url(#sakura_trunk)"')
        + L(tx, tyy + (byy - tyy) * 0.25, tx - bw * 2.6, tyy + (byy - tyy) * 0.05, `stroke="#5d3d2f" stroke-width="${n1(bw * 0.9)}" stroke-linecap="round"`)
        + L(tx, tyy + (byy - tyy) * 0.35, tx + bw * 2.4, tyy + (byy - tyy) * 0.12, `stroke="#5d3d2f" stroke-width="${n1(bw * 0.75)}" stroke-linecap="round"`);
    const bloom = (cx, cy, rx, ry, cols, n) => {
        let o = '';
        for (let i = 0; i < n; i++) { const a = g() * Math.PI * 2, rr = Math.sqrt(g());
            o += C(cx + Math.cos(a) * rx * rr, cy + Math.sin(a) * ry * rr, Math.min(rx, ry) * sp(g, 0.2, 0.36), `fill="${pick(g, cols)}"`); }
        return o;
    };
    const tree = (bx, byy, cx, cy, rx, ry, layer) => {
        const cols = layer === 'far' ? ['#fbdce7', '#ffeef4', '#fff7fa', '#f6cddc'] : ['#eeaec6', '#f7c9da', '#fbdfe9', '#ffffff', '#e79ab8'];
        return trunk(bx, byy, cx, cy + ry * 0.7, X(layer === 'far' ? 0.012 : 0.022)) + bloom(cx, cy, rx, ry, cols, layer === 'far' ? 26 : 54)
            + bloom(cx - rx * 0.3, cy - ry * 0.35, rx * 0.55, ry * 0.5, ['#fff6fa', '#ffffff'], layer === 'far' ? 8 : 16);
    };
    s += tree(X(0.46), gy + Y(0.02), X(0.47), Y(0.33), X(0.115), Y(0.115), 'far')
        + tree(X(0.155), Y(0.83), X(0.145), Y(0.27), X(0.205), Y(0.205), 'near')
        + tree(X(0.855), Y(0.85), X(0.87), Y(0.30), X(0.20), Y(0.20), 'near');
    // 树影 + 落地花瓣
    s += E(X(0.16), Y(0.855), X(0.20), Y(0.035), 'fill="#8f7a68" opacity="0.35"')
        + E(X(0.86), Y(0.875), X(0.19), Y(0.032), 'fill="#8f7a68" opacity="0.35"');
    for (let i = 0; i < 40; i++) s += E(sp(g, X(0.04), X(0.96)), sp(g, Y(0.83), Y(0.99)), sp(g, w * 0.004, w * 0.011), sp(g, h * 0.002, h * 0.005), `fill="${pick(g, ['#f8cddd', '#ffe6ee', '#eeaec6'])}" opacity="0.7"`);
    // 长椅
    const bxc = X(0.31), byy = Y(0.775), bw2 = X(0.17);
    s += E(bxc + bw2 * 0.5, Y(0.895), bw2 * 0.6, Y(0.022), 'fill="#8f7a68" opacity="0.35"');
    for (let i = 0; i < 3; i++) s += R(bxc, byy + Y(0.008) * i, bw2, Y(0.014), 'fill="#9c7448"');
    for (let i = 0; i < 2; i++) s += R(bxc, byy - Y(0.062) + Y(0.038) * i, bw2, Y(0.016), 'fill="#a87e50"');
    s += R(bxc + bw2 * 0.06, byy, X(0.014), Y(0.11), 'fill="#5f4128"')
        + R(bxc + bw2 * 0.88, byy, X(0.014), Y(0.11), 'fill="#5f4128"')
        + R(bxc + bw2 * 0.06, byy - Y(0.068), X(0.012), Y(0.075), 'fill="#6b4a2c"')
        + R(bxc + bw2 * 0.9, byy - Y(0.068), X(0.012), Y(0.075), 'fill="#6b4a2c"');
    // 飘落花瓣
    for (let i = 0; i < 58; i++) {
        const px = sp(g, X(0.02), X(0.98)), py = sp(g, Y(0.05), Y(0.95));
        s += E(px, py, sp(g, w * 0.005, w * 0.010), sp(g, h * 0.003, h * 0.006),
            `fill="${pick(g, ['#ffd9e6', '#f7bcd0', '#ffffff', '#ffc4d8'])}" opacity="${r2(sp(g, 0.5, 0.95))}"${rt(sp(g, 0, 180), px, py)}`);
    }
    s += R(0, 0, w, h, 'fill="url(#sakura_vig)"');
    return svg(w, h, defs, s);
};

// =============================== 3/4. 天文社活动室（白天 / 夜晚，同一间屋子）
const clubScene = (w, h, night) => {
    const X = (u) => u * w, Y = (v) => v * h, g = rng(night ? 4099 : 3301);
    const p = night ? 'clubnight' : 'clubday';
    const c = night
        ? { wall: ['#2b3752', '#1a2338'], floor: ['#1e2a44', '#0f1727'], desk: ['#7d6038', '#4c3a20'], edge: '#3a2b16', legs: '#2a2f3c', box: '#6d573c', boxD: '#4a3a28', tripod: '#2b303c',
            frame: '#3d4a62', gap: '#0a1224', glass: '#0d1c38', vig: 0.88, sky: ['#16305e', '#060d1e'], prop: '#4a5a78' }
        : { wall: ['#f5ebd3', '#e0d0ac'], floor: ['#d5ad76', '#b58a53'], desk: ['#e0bd83', '#b78e55'], edge: '#a97c45', legs: '#9c8358', box: '#cda672', boxD: '#b08a55', tripod: '#545a66',
            frame: '#a98d63', gap: '#241c10', glass: '#cfe4f4', vig: 0.42, sky: ['#eef7ff', '#c6e0f6'], prop: '#8fa8bd' };
    const defs = [
        LG(`${p}_wall`, [[0, c.wall[0]], [1, c.wall[1]]]), LG(`${p}_floor`, [[0, c.floor[0]], [1, c.floor[1]]]),
        LG(`${p}_sky`, [[0, c.sky[0]], [1, c.sky[1]]]), LG(`${p}_desk`, [[0, c.desk[0]], [1, c.desk[1]]]),
        LG(`${p}_poster`, [[0, '#28405f'], [1, '#12213a']]),
        RG(`${p}_glow`, [[0, '#ffd98a', 0.75], [0.55, '#ffc45e', 0.28], [1, '#ffb43c', 0]]),
        RG(`${p}_vig`, [[0.4, '#000', 0], [0.78, '#05070d', night ? 0.5 : 0.12], [1, '#05070d', c.vig]]),
        `<clipPath id="${p}_clipWin">${R(X(0.63), Y(0.095), X(0.285), Y(0.315), '')}</clipPath>`,
        `<clipPath id="${p}_clipPoster">${R(X(0.095), Y(0.145), X(0.185), Y(0.24), '')}</clipPath>`,
    ].join('');
    const wallY = Y(0.70); let s = R(0, 0, w, wallY, `fill="url(#${p}_wall)"`) + R(0, wallY - Y(0.05), w, Y(0.05), 'fill="#00000022"')
        + R(0, wallY, w, h - wallY, `fill="url(#${p}_floor)"`);
    for (let i = 1; i < 6; i++) s += L(0, wallY + (h - wallY) * (i / 6) ** 1.5, w, wallY + (h - wallY) * (i / 6) ** 1.5, `stroke="${c.edge}" stroke-opacity="0.35" stroke-width="2"`);
    for (let i = 0; i < 9; i++) s += L(X(0.02 + i * 0.12), wallY, X(-0.14 + i * 0.17), h, `stroke="${c.edge}" stroke-opacity="0.22" stroke-width="2"`);
    // 关不严的窗
    const winX = X(0.63), winY = Y(0.095), winW = X(0.285), winH = Y(0.315), hx = winX + winW * 0.52;
    s += R(winX - X(0.012), winY - Y(0.025), winW + X(0.024), winH + Y(0.05), `fill="${c.frame}"`)
        + R(winX, winY, winW, winH, `fill="url(#${p}_sky)"`);
    if (night) {
        let st = '';
        for (let i = 0; i < 34; i++) st += C(sp(g, winX, winX + winW), sp(g, winY, winY + winH), sp(g, w * 0.0015, w * 0.004), `fill="#e8f2ff" opacity="${r2(sp(g, 0.35, 0.95))}"`);
        st += C(winX + winW * 0.72, winY + winH * 0.24, X(0.021), 'fill="#f4f7ff" opacity="0.92"') + C(winX + winW * 0.75, winY + winH * 0.22, X(0.021), `fill="${c.sky[1]}" opacity="0.85"`);
        s += `<g clip-path="url(#${p}_clipWin)">${st}</g>`;
    } else {
        s += R(winX, winY, winW, winH * 0.45, 'fill="#ffffff" opacity="0.35"');
    }
    s += PG([[hx, winY], [hx + winH * 0.09, winY], [hx, winY + winH]], `fill="${c.gap}"`)
        + R(hx, winY, winW * 0.48, winH, `fill="${c.glass}" opacity="0.95"${rt(5, hx, winY + winH)}`)
        + R(hx + winW * 0.21, winY, winW * 0.035, winH, `fill="${c.frame}"${rt(5, hx, winY + winH)}`)
        + R(winX - X(0.012), winY, winW * 0.52, winH, `fill="${c.glass}" opacity="0.2"`)
        + R(winX - X(0.024), winY + winH + Y(0.022), winW + X(0.048), Y(0.014), `fill="${c.frame}"`);
    // 星图海报
    s += R(X(0.093), Y(0.142), X(0.189), Y(0.246), 'fill="#00000026"')
        + R(X(0.095), Y(0.145), X(0.185), Y(0.24), `fill="url(#${p}_poster)" rx="${n1(X(0.006))}"`);
    {
        let po = '';
        const stx = [], sty = [];
        for (let i = 0; i < 26; i++) { const x = sp(g, X(0.105), X(0.27)), y = sp(g, Y(0.155), Y(0.375)); stx.push(x); sty.push(y); po += C(x, y, sp(g, w * 0.0016, w * 0.004), `fill="#dbe8ff" opacity="${r2(sp(g, 0.4, 1))}"`); }
        for (let i = 0; i < 5; i++) po += L(stx[i], sty[i], stx[i + 1], sty[i + 1], 'stroke="#8fb4e8" stroke-opacity="0.5" stroke-width="1.6"');
        po += C(X(0.235), Y(0.19), X(0.02), 'fill="none" stroke="#7ea6dd" stroke-opacity="0.6" stroke-width="2"');
        s += `<g clip-path="url(#${p}_clipPoster)">${po}</g>`;
    }
    // 四张拼在一起的课桌
    const desks = [
        [X(0.30), Y(0.535), X(0.20), Y(0.045)], [X(0.505), Y(0.535), X(0.20), Y(0.045)],
        [X(0.275), Y(0.60), X(0.225), Y(0.052)], [X(0.495), Y(0.60), X(0.225), Y(0.052)],
    ];
    for (const [dx, dy, dw, dh] of desks) {
        s += PG([[dx, dy], [dx + dw, dy], [dx + dw - dw * 0.04, dy + dh], [dx + dw * 0.04, dy + dh]], `fill="url(#${p}_desk)"`)
            + PG([[dx + dw * 0.04, dy + dh], [dx + dw - dw * 0.04, dy + dh], [dx + dw - dw * 0.04, dy + dh + Y(0.016)], [dx + dw * 0.04, dy + dh + Y(0.016)]], `fill="${c.edge}"`)
            + R(dx + dw * 0.08, dy + dh + Y(0.012), X(0.012), Y(0.20), `fill="${c.legs}"`)
            + R(dx + dw * 0.88, dy + dh + Y(0.012), X(0.012), Y(0.20), `fill="${c.legs}"`);
    }
    // 桌上道具
    s += R(X(0.335), Y(0.545), X(0.075), Y(0.05), `fill="${c.prop}" opacity="0.95"${rt(-7, X(0.37), Y(0.57))}`)
        + R(X(0.60), Y(0.552), X(0.045), Y(0.038), `fill="${night ? '#c8d8f0' : '#f2e6cf'}" opacity="0.95"`)
        + C(X(0.585), Y(0.62), X(0.017), `fill="${c.edge}"`) + C(X(0.585), Y(0.62), X(0.011), `fill="${night ? '#3a2f1c' : '#e7dcc4'}"`);
    // 纸箱
    s += R(X(0.795), Y(0.72), X(0.145), Y(0.215), `fill="${c.box}"`)
        + PG([[X(0.795), Y(0.72)], [X(0.87), Y(0.695)], [X(0.94), Y(0.72)], [X(0.867), Y(0.742)]], `fill="${c.boxD}"`)
        + L(X(0.867), Y(0.72), X(0.867), Y(0.935), `stroke="${c.boxD}" stroke-width="3"`)
        + R(X(0.825), Y(0.615), X(0.105), Y(0.105), `fill="${c.box}"`)
        + PG([[X(0.825), Y(0.615)], [X(0.878), Y(0.596)], [X(0.93), Y(0.615)], [X(0.877), Y(0.633)]], `fill="${c.boxD}"`);
    // 三脚架
    s += L(X(0.205), Y(0.50), X(0.148), Y(0.94), `stroke="${c.tripod}" stroke-width="${n1(w * 0.006)}" stroke-linecap="round"`)
        + L(X(0.205), Y(0.50), X(0.262), Y(0.94), `stroke="${c.tripod}" stroke-width="${n1(w * 0.006)}" stroke-linecap="round"`)
        + L(X(0.205), Y(0.50), X(0.208), Y(0.88), `stroke="${c.tripod}" stroke-width="${n1(w * 0.005)}" stroke-linecap="round"`)
        + R(X(0.164), Y(0.545), X(0.082), Y(0.022), `fill="${c.tripod}" rx="${n1(w * 0.004)}"${rt(-14, X(0.205), Y(0.556))}`)
        + C(X(0.205), Y(0.50), X(0.012), `fill="${night ? '#93a6c4' : '#6b7480'}"`);
    // 光效
    if (night) {
        s += E(X(0.60), Y(0.60), X(0.31), Y(0.30), `fill="url(#${p}_glow)"`)
            + E(X(0.60), Y(0.56), X(0.13), Y(0.20), 'fill="#ffd98a" opacity="0.16"')
            + E(X(0.60), Y(0.655), X(0.033), Y(0.011), `fill="${c.edge}"`)
            + R(X(0.593), Y(0.575), X(0.014), Y(0.08), `fill="${c.edge}"`)
            + PG([[X(0.545), Y(0.63)], [X(0.655), Y(0.63)], [X(0.628), Y(0.565)], [X(0.572), Y(0.565)]], 'fill="#3c2c14"')
            + E(X(0.60), Y(0.632), X(0.05), Y(0.012), 'fill="#ffe6a8" opacity="0.95"')
            + `<g clip-path="url(#${p}_clipPoster)">${E(X(0.265), Y(0.355), X(0.16), Y(0.20), 'fill="#ffcf7a" opacity="0.45"')}</g>`;
    } else {
        s += PG([[winX, wallY - Y(0.02)], [winX + winW, wallY - Y(0.02)], [winX + winW - X(0.34), h], [winX - X(0.10), h]], 'fill="#fff4d2" opacity="0.3"')
            + PG([[winX, winY], [winX + winW, winY], [winX + winW - X(0.10), wallY], [winX - X(0.04), wallY]], 'fill="#ffffff" opacity="0.12"');
    }
    s += R(0, 0, w, h, `fill="url(#${p}_vig)"`);
    return svg(w, h, defs, s);
};

export default {
    library,
    courtyard_sakura,
    clubroom: (w, h) => clubScene(w, h, false),
    clubroom_night: (w, h) => clubScene(w, h, true),
};
