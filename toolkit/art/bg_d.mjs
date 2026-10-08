/**
 * bg_d.mjs — 5 flat-anime galgame backgrounds as pure SVG strings.
 * All coordinates derive from (w, h). No text, no faces, no Math.random().
 */
const N = (v) => Math.round(v * 100) / 100;
const lcg = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const stops = (list) => list.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a === undefined ? '' : ` stop-opacity="${a}"`}/>`).join('');
const lin = (id, list, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(list)}</linearGradient>`;
const rad = (id, list, cx = 0.5, cy = 0.5, r = 0.5) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops(list)}</radialGradient>`;
const vig = (id, w, h, color = '#000', op = 0.6) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${N(w / 2)}" cy="${N(h / 2)}" r="${N(Math.hypot(w, h) / 2)}"><stop offset="0.42" stop-color="${color}" stop-opacity="0"/><stop offset="1" stop-color="${color}" stop-opacity="${op}"/></radialGradient>`;
const wrap = (w, h, defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><defs>${defs}</defs>${body}</svg>`;
const poly = (pts, fill, extra = '') => `<polygon points="${pts.map((p) => `${N(p[0])},${N(p[1])}`).join(' ')}" fill="${fill}"${extra}/>`;
const dots = (rnd, n, x, y, dw, dh, r0, r1, color, op = 1) => {
    let s = '';
    for (let i = 0; i < n; i++) s += `<circle cx="${N(x + rnd() * dw)}" cy="${N(y + rnd() * dh)}" r="${N(r0 + rnd() * (r1 - r0))}" fill="${color}" opacity="${op}"/>`;
    return s;
};

export default {
    // ── 黄昏河堤：橙紫天空 / 橙色河面反光 / 远处桥剪影 / 草坡与台阶 ──────────────
    riverside_sunset: (w, h) => {
        const hor = h * 0.575, sx = w * 0.63, rnd = lcg(11071);
        const defs =
            lin('riverside_sunset_sky', [[0, '#241844'], [0.30, '#6b3468'], [0.58, '#c9503a'], [0.80, '#f09540'], [1, '#ffdb9a']]) +
            lin('riverside_sunset_water', [[0, '#9c4a32'], [0.22, '#e08242'], [0.55, '#f2ab55'], [0.82, '#8a4a48'], [1, '#4a2a45']]) +
            lin('riverside_sunset_grass', [[0, '#6b8c53'], [0.45, '#3d5c3a'], [1, '#1e2f1d']]) +
            lin('riverside_sunset_ref', [[0, '#ffd489', 0], [0.5, '#ffeec2', 0.6], [1, '#ffab5c', 0]], 0, 0, 1, 0) +
            rad('riverside_sunset_glow', [[0, '#fff6d0', 0.95], [0.35, '#ffc266', 0.5], [1, '#ff8a3c', 0]]) +
            vig('riverside_sunset_vig', w, h, '#2a1030', 0.6);
        let b = `<rect width="${w}" height="${N(hor + 2)}" fill="url(#riverside_sunset_sky)"/>`;
        b += `<circle cx="${N(sx)}" cy="${N(hor - h * 0.06)}" r="${N(h * 0.27)}" fill="url(#riverside_sunset_glow)"/>`;
        b += `<circle cx="${N(sx)}" cy="${N(hor - h * 0.06)}" r="${N(h * 0.062)}" fill="#fff5d6"/>`;
        for (let i = 0; i < 8; i++) {
            const cw = w * (0.10 + rnd() * 0.26);
            b += `<rect x="${N(rnd() * (w - cw))}" y="${N(hor - h * (0.07 + rnd() * 0.36))}" width="${N(cw)}" height="${N(h * (0.004 + rnd() * 0.006))}" rx="${N(h * 0.007)}" fill="#ffd9a0" opacity="${N(0.16 + rnd() * 0.26)}"/>`;
        }
        b += `<rect y="${N(hor)}" width="${w}" height="${N(h - hor)}" fill="url(#riverside_sunset_water)"/>`;
        b += poly([[0, hor], [w * 0.34, hor - h * 0.035], [w * 0.62, hor - h * 0.012], [w, hor - h * 0.026], [w, hor + h * 0.014], [0, hor + h * 0.014]], '#5b3350');
        // 远处桥的剪影（桥面 + 桥墩 + 栏杆）
        const b0 = w * 0.28, b1 = w * 0.96, by = hor - h * 0.014;
        b += `<rect x="${N(b0)}" y="${N(by - h * 0.052)}" width="${N(b1 - b0)}" height="${N(h * 0.019)}" fill="#3a2140"/>`;
        b += `<rect x="${N(b0)}" y="${N(by - h * 0.055)}" width="${N(b1 - b0)}" height="${N(h * 0.006)}" fill="#54304f"/>`;
        for (let i = 0; i < 5; i++) b += `<rect x="${N(b0 + (b1 - b0) * (0.06 + i * 0.22))}" y="${N(by - h * 0.052)}" width="${N(w * 0.009)}" height="${N(h * 0.056)}" fill="#3a2140"/>`;
        for (let i = 0; i < 11; i++) b += `<rect x="${N(b0 + (b1 - b0) * (0.03 + i * 0.094))}" y="${N(by - h * 0.070)}" width="${N(w * 0.0035)}" height="${N(h * 0.019)}" fill="#4a2a4a"/>`;
        // 河面橙色反光带 + 波纹
        b += `<path d="M${N(sx - w * 0.032)} ${N(hor)} L${N(sx + w * 0.032)} ${N(hor)} L${N(sx + w * 0.17)} ${N(h)} L${N(sx - w * 0.17)} ${N(h)} Z" fill="url(#riverside_sunset_ref)" opacity="0.85"/>`;
        for (let i = 0; i < 16; i++) {
            const t = i / 15, rw = w * (0.03 + t * 0.17) * (0.5 + rnd() * 0.7);
            b += `<rect x="${N(sx - rw / 2 + (rnd() - 0.5) * w * 0.07)}" y="${N(hor + (h - hor) * (0.05 + 0.9 * t))}" width="${N(rw)}" height="${N(h * 0.004 + t * h * 0.005)}" rx="${N(h * 0.004)}" fill="#ffe6b4" opacity="${N(Math.max(0.06, 0.42 - 0.3 * t + rnd() * 0.14))}"/>`;
        }
        // 近景草坡斜堤 + 坡顶亮边
        b += poly([[0, h], [0, hor - h * 0.02], [w * 0.40, h * 0.90], [w * 0.47, h]], 'url(#riverside_sunset_grass)');
        b += poly([[0, hor - h * 0.02], [w * 0.40, h * 0.90], [w * 0.40, h * 0.925], [0, hor + h * 0.012]], '#8fae63', ' opacity="0.5"');
        // 堤上台阶
        for (let i = 0; i < 9; i++) {
            const sxx = w * (0.055 + i * 0.032), syy = h * (0.795 + i * 0.022);
            b += `<rect x="${N(sxx)}" y="${N(syy)}" width="${N(w * 0.042)}" height="${N(h * 0.017)}" fill="${i % 2 ? '#476b41' : '#334d2d'}"/>`;
            b += `<rect x="${N(sxx)}" y="${N(syy)}" width="${N(w * 0.042)}" height="${N(h * 0.004)}" fill="#9cba6c" opacity="0.4"/>`;
        }
        // 堤边栏杆立柱
        const edge = (x) => hor - h * 0.02 + (h * 0.92 - hor) * (x / (w * 0.40));
        for (const px of [0.03, 0.14, 0.25]) {
            const x = w * px, y = edge(x);
            b += `<rect x="${N(x)}" y="${N(y - h * 0.075)}" width="${N(w * 0.008)}" height="${N(h * 0.078)}" fill="#22301f"/>`;
        }
        b += `<path d="M${N(w * 0.03)} ${N(edge(w * 0.03) - h * 0.068)} L${N(w * 0.25)} ${N(edge(w * 0.25) - h * 0.068)}" stroke="#22301f" stroke-width="${N(h * 0.008)}" fill="none"/>`;
        // 近景草丛遮挡
        for (let i = 0; i < 14; i++) {
            const gx = w * (0.30 + rnd() * 0.18), gy = h * (0.88 + rnd() * 0.10);
            b += `<path d="M${N(gx)} ${N(h)} Q ${N(gx + w * 0.006)} ${N(gy - h * 0.06)} ${N(gx + w * (rnd() - 0.5) * 0.03)} ${N(gy - h * 0.11)}" stroke="#1b2a19" stroke-width="${N(w * 0.004)}" fill="none"/>`;
        }
        b += `<rect width="${w}" height="${h}" fill="url(#riverside_sunset_vig)"/>`;
        return wrap(w, h, defs, b);
    },

    // ── 星见祭夜市：摊位 + 红灯笼 + 暖橙灯 + 人群剪影 ─────────────────────────
    festival_night: (w, h) => {
        const gy = h * 0.74, rnd = lcg(771013);
        const defs =
            lin('festival_night_sky', [[0, '#050818'], [0.45, '#191a40'], [0.78, '#3b2148'], [1, '#5e2f38']]) +
            lin('festival_night_ground', [[0, '#43242c'], [0.45, '#251523'], [1, '#100812']]) +
            rad('festival_night_lamp', [[0, '#ffe0ad', 0.95], [0.35, '#ff9a4a', 0.45], [1, '#ff7a2a', 0]]) +
            rad('festival_night_haze', [[0, '#ff9a52', 0.4], [1, '#ff7a2a', 0]]) +
            vig('festival_night_vig', w, h, '#160a18', 0.62);
        let b = `<rect width="${w}" height="${N(gy + 2)}" fill="url(#festival_night_sky)"/>`;
        b += dots(rnd, 64, 0, 0, w, gy * 0.78, h * 0.0009, h * 0.0022, '#e8eeff', 0.75);
        b += `<ellipse cx="${N(w * 0.5)}" cy="${N(gy)}" rx="${N(w * 0.66)}" ry="${N(h * 0.30)}" fill="url(#festival_night_haze)"/>`;
        b += `<rect y="${N(gy)}" width="${w}" height="${N(h - gy)}" fill="url(#festival_night_ground)"/>`;
        b += `<ellipse cx="${N(w * 0.5)}" cy="${N(gy)}" rx="${N(w * 0.5)}" ry="${N(h * 0.10)}" fill="url(#festival_night_haze)" opacity="0.7"/>`;
        // 一排摊位（暖橙灯光 + 红棚）
        const stalls = [[0.015, 0.90], [0.205, 1.0], [0.40, 1.06], [0.60, 1.0], [0.795, 0.88]];
        for (const [sx0, sc] of stalls) {
            const sw = w * 0.185 * sc, cx = w * sx0, top = gy - h * 0.30 * sc, ch = h * 0.14 * sc, base = gy - h * 0.015 * sc;
            b += `<rect x="${N(cx)}" y="${N(base - h * 0.13 * sc)}" width="${N(sw)}" height="${N(h * 0.135 * sc)}" fill="#2a1520"/>`;
            b += `<rect x="${N(cx + sw * 0.08)}" y="${N(base - h * 0.115 * sc)}" width="${N(sw * 0.84)}" height="${N(h * 0.10 * sc)}" fill="url(#festival_night_lamp)" opacity="0.95"/>`;
            b += poly([[cx, top], [cx + sw, top], [cx + sw * 0.95, top + ch * 0.55], [cx + sw * 0.05, top + ch * 0.55]], '#c8452c');
            b += poly([[cx + sw * 0.05, top + ch * 0.55], [cx + sw * 0.95, top + ch * 0.55], [cx + sw * 0.99, top + ch], [cx + sw * 0.01, top + ch]], '#9c2f2c');
            for (let k = 0; k < 3; k++) b += poly([[cx + sw * (0.16 + k * 0.28), top], [cx + sw * (0.26 + k * 0.28), top], [cx + sw * (0.23 + k * 0.28), top + ch * 0.55], [cx + sw * (0.13 + k * 0.28), top + ch * 0.55]], '#e8703a');
            b += `<rect x="${N(cx - sw * 0.02)}" y="${N(base - h * 0.145 * sc)}" width="${N(sw * 1.04)}" height="${N(h * 0.016 * sc)}" fill="#4a2430"/>`;
            b += `<ellipse cx="${N(cx + sw * 0.5)}" cy="${N(base - h * 0.02 * sc)}" rx="${N(sw * 0.75)}" ry="${N(h * 0.055 * sc)}" fill="url(#festival_night_lamp)" opacity="0.5"/>`;
        }
        // 灯笼串（固定种子伪随机抖动）
        const P0 = [0, h * 0.17], C = [w * 0.5, h * 0.31], P1 = [w, h * 0.13];
        b += `<path d="M0 ${N(P0[1])} Q ${N(C[0])} ${N(C[1])} ${w} ${N(P1[1])}" fill="none" stroke="#1c1226" stroke-width="${N(h * 0.005)}"/>`;
        for (let i = 0; i < 16; i++) {
            const t = 0.045 + i * 0.0607, u = 1 - t;
            const x = u * u * P0[0] + 2 * u * t * C[0] + t * t * P1[0] + (rnd() - 0.5) * w * 0.004;
            const y = u * u * P0[1] + 2 * u * t * C[1] + t * t * P1[1] + h * 0.030;
            const r = h * (0.021 + rnd() * 0.008);
            b += `<circle cx="${N(x)}" cy="${N(y)}" r="${N(r * 3.4)}" fill="url(#festival_night_lamp)" opacity="0.5"/>`;
            b += `<rect x="${N(x - r * 0.1)}" y="${N(y - r * 1.9)}" width="${N(r * 0.2)}" height="${N(r * 0.6)}" fill="#e8c070"/>`;
            b += `<ellipse cx="${N(x)}" cy="${N(y)}" rx="${N(r * 0.88)}" ry="${N(r)}" fill="#e0402e"/>`;
            b += `<ellipse cx="${N(x)}" cy="${N(y)}" rx="${N(r * 0.55)}" ry="${N(r * 0.7)}" fill="#ff7a3a" opacity="0.8"/>`;
        }
        // 人群剪影（纯色块，无五官）
        for (let i = 0; i < 30; i++) {
            const far = rnd() < 0.42;
            const s = h * (far ? 0.042 + rnd() * 0.022 : 0.062 + rnd() * 0.03);
            const x = w * (0.01 + rnd() * 0.98), y = gy + h * (far ? -0.03 + rnd() * 0.03 : 0.02 + rnd() * 0.05);
            const c = far ? '#1e1224' : '#100913';
            b += `<ellipse cx="${N(x)}" cy="${N(y)}" rx="${N(s * 0.62)}" ry="${N(s * 0.40)}" fill="${c}"/>`;
            b += `<circle cx="${N(x)}" cy="${N(y - s * 0.42)}" r="${N(s * 0.23)}" fill="${c}"/>`;
        }
        // 近景头部遮挡
        b += `<ellipse cx="${N(w * 0.13)}" cy="${N(h * 1.02)}" rx="${N(w * 0.10)}" ry="${N(h * 0.16)}" fill="#0b060e"/>`;
        b += `<circle cx="${N(w * 0.13)}" cy="${N(h * 0.885)}" r="${N(h * 0.062)}" fill="#0b060e"/>`;
        b += `<circle cx="${N(w * 0.87)}" cy="${N(h * 0.925)}" r="${N(h * 0.055)}" fill="#0b060e"/>`;
        b += `<ellipse cx="${N(w * 0.87)}" cy="${N(h * 1.05)}" rx="${N(w * 0.09)}" ry="${N(h * 0.15)}" fill="#0b060e"/>`;
        b += `<rect width="${w}" height="${h}" fill="url(#festival_night_vig)"/>`;
        return wrap(w, h, defs, b);
    },

    // ── 夜晚车站月台：顶棚立柱 / 站灯光圈 / 信号灯与铁轨 ──────────────────────
    station_night: (w, h) => {
        const py = h * 0.775, vy = h * 0.60, rnd = lcg(31027);
        const roofY = (x) => (0.30 - 0.14 * (x / w)) * h;
        const defs =
            lin('station_night_sky', [[0, '#050b20'], [0.5, '#0e1c40'], [1, '#22375f']]) +
            lin('station_night_floor', [[0, '#3f4e6e'], [0.45, '#2b3652'], [1, '#171e30']]) +
            lin('station_night_roof', [[0, '#080f20'], [0.6, '#141d38'], [1, '#222c4e']]) +
            rad('station_night_lamp', [[0, '#f0f6ff', 0.9], [0.28, '#bcd2ff', 0.32], [1, '#8fb0ff', 0]]) +
            rad('station_night_signal', [[0, '#ffd8c8', 0.95], [0.35, '#ff3a2a', 0.5], [1, '#ff2a1a', 0]]) +
            vig('station_night_vig', w, h, '#04091a', 0.62);
        let b = `<rect width="${w}" height="${N(h)}" fill="url(#station_night_sky)"/>`;
        b += `<circle cx="${N(w * 0.74)}" cy="${N(h * 0.20)}" r="${N(h * 0.20)}" fill="#cfe0ff" opacity="0.13"/>`;
        b += `<circle cx="${N(w * 0.74)}" cy="${N(h * 0.20)}" r="${N(h * 0.045)}" fill="#e6eeff" opacity="0.55"/>`;
        b += dots(rnd, 44, 0, 0, w, h * 0.5, h * 0.0009, h * 0.002, '#dbe6ff', 0.6);
        // 对侧月台与轨道
        b += `<rect y="${N(vy)}" width="${w}" height="${N(h * 0.035)}" fill="#1b2742"/>`;
        b += `<rect y="${N(vy)}" width="${w}" height="${N(h * 0.006)}" fill="#41527a"/>`;
        b += poly([[0, vy + h * 0.035], [w, vy + h * 0.035], [w, py], [0, py]], '#111a2c');
        for (let i = 0; i < 16; i++) {
            const t = Math.pow(i / 15, 1.35), x = w * t;
            b += `<rect x="${N(x)}" y="${N(vy + h * 0.040)}" width="${N(w * 0.005 + w * 0.004 * t)}" height="${N(py - vy - h * 0.045)}" fill="#0b1220"/>`;
        }
        b += poly([[0, vy + h * 0.115], [w, vy + h * 0.098], [w, vy + h * 0.108], [0, vy + h * 0.126]], '#7d8ba8');
        b += poly([[0, vy + h * 0.150], [w, vy + h * 0.128], [w, vy + h * 0.140], [0, vy + h * 0.163]], '#6a789a');
        // 信号灯
        b += `<rect x="${N(w * 0.115)}" y="${N(vy - h * 0.055)}" width="${N(w * 0.004)}" height="${N(h * 0.06)}" fill="#0c1424"/>`;
        b += `<circle cx="${N(w * 0.117)}" cy="${N(vy - h * 0.058)}" r="${N(h * 0.045)}" fill="url(#station_night_signal)" opacity="0.85"/>`;
        b += `<circle cx="${N(w * 0.117)}" cy="${N(vy - h * 0.058)}" r="${N(h * 0.009)}" fill="#ff5a3a"/>`;
        b += `<circle cx="${N(w * 0.885)}" cy="${N(vy - h * 0.040)}" r="${N(h * 0.008)}" fill="#6cf0a8" opacity="0.9"/>`;
        b += `<rect x="${N(w * 0.883)}" y="${N(vy - h * 0.040)}" width="${N(w * 0.004)}" height="${N(h * 0.045)}" fill="#0c1424"/>`;
        // 月台地面 + 安全线 + 地砖透视
        b += `<rect y="${N(py)}" width="${w}" height="${N(h - py)}" fill="url(#station_night_floor)"/>`;
        b += `<rect y="${N(py)}" width="${w}" height="${N(h * 0.008)}" fill="#8d9cc0"/>`;
        b += `<rect y="${N(py + h * 0.030)}" width="${w}" height="${N(h * 0.020)}" fill="#cbb45e" opacity="0.85"/>`;
        for (let i = 0; i < 9; i++) {
            const x = w * (i / 8);
            b += `<path d="M${N(x)} ${N(h)} L${N(w * 0.42 + (x - w * 0.42) * 0.34)} ${N(py)}" stroke="#4c5a7c" stroke-width="${N(w * 0.0022)}" fill="none" opacity="0.7"/>`;
        }
        b += `<path d="M0 ${N(py + h * 0.075)} L${w} ${N(py + h * 0.055)}" stroke="#4c5a7c" stroke-width="${N(w * 0.0022)}" fill="none" opacity="0.6"/>`;
        // 顶棚 + 前梁 + 立柱（带蓝色轮廓光）
        b += poly([[0, 0], [w, 0], [w, h * 0.16], [0, h * 0.30]], 'url(#station_night_roof)');
        b += poly([[0, h * 0.30], [w, h * 0.16], [w, h * 0.185], [0, h * 0.325]], '#070d1c');
        b += poly([[0, 0], [w * 0.55, 0], [w * 0.28, h * 0.115], [0, h * 0.175]], '#1c2748', ' opacity="0.5"');
        for (const px of [0.10, 0.42, 0.74]) {
            const x = w * px, wt = roofY(x) + h * 0.02;
            b += `<rect x="${N(x - w * 0.011)}" y="${N(wt)}" width="${N(w * 0.022)}" height="${N(py - wt)}" fill="#0d1526"/>`;
            b += `<rect x="${N(x + w * 0.004)}" y="${N(wt)}" width="${N(w * 0.006)}" height="${N(py - wt)}" fill="#33456e" opacity="0.75"/>`;
            b += `<rect x="${N(x - w * 0.020)}" y="${N(py - h * 0.014)}" width="${N(w * 0.040)}" height="${N(h * 0.016)}" fill="#0a1120"/>`;
        }
        // 站灯光圈
        for (const lx of [0.26, 0.66]) {
            const x = w * lx, ly = roofY(x) + h * 0.10;
            b += `<rect x="${N(x - w * 0.0015)}" y="${N(roofY(x))}" width="${N(w * 0.003)}" height="${N(h * 0.045)}" fill="#0a1120"/>`;
            b += `<circle cx="${N(x)}" cy="${N(ly)}" r="${N(h * 0.19)}" fill="url(#station_night_lamp)"/>`;
            b += `<ellipse cx="${N(x)}" cy="${N(ly)}" rx="${N(w * 0.026)}" ry="${N(h * 0.012)}" fill="#eaf2ff"/>`;
            b += `<ellipse cx="${N(x)}" cy="${N(py + h * 0.09)}" rx="${N(w * 0.13)}" ry="${N(h * 0.05)}" fill="#bcd2ff" opacity="0.10"/>`;
        }
        // 长椅剪影
        b += `<rect x="${N(w * 0.60)}" y="${N(py + h * 0.085)}" width="${N(w * 0.16)}" height="${N(h * 0.014)}" fill="#111a2e"/>`;
        b += `<rect x="${N(w * 0.60)}" y="${N(py + h * 0.060)}" width="${N(w * 0.16)}" height="${N(h * 0.012)}" fill="#182444"/>`;
        for (const lx of [0.615, 0.745]) b += `<rect x="${N(w * lx)}" y="${N(py + h * 0.095)}" width="${N(w * 0.010)}" height="${N(h * 0.040)}" fill="#0d1526"/>`;
        b += `<rect width="${w}" height="${h}" fill="url(#station_night_vig)"/>`;
        return wrap(w, h, defs, b);
    },

    // ── 天文台圆顶内部：天窗星空 / 望远镜剪影 / 地面光斑 ───────────────────────
    observatory: (w, h) => {
        const fy = h * 0.78, rnd = lcg(902107);
        const slit = [[w * 0.26, h * 0.07], [w * 0.70, h * 0.03], [w * 0.77, h * 0.33], [w * 0.23, h * 0.29]];
        const defs =
            lin('observatory_dome', [[0, '#080b1f'], [0.55, '#131a3c'], [1, '#242b58']]) +
            lin('observatory_sky', [[0, '#030616'], [0.55, '#0b1436'], [1, '#1d2c60']]) +
            lin('observatory_floor', [[0, '#151b3a'], [1, '#070a18']]) +
            rad('observatory_patch', [[0, '#d6e4ff', 0.32], [0.55, '#8fa8e8', 0.13], [1, '#5a6bb0', 0]]) +
            rad('observatory_beam', [[0, '#cfe0ff', 0.18], [1, '#7f96e0', 0]]) +
            `<clipPath id="observatory_slit">${poly(slit, '#000')}</clipPath>` +
            vig('observatory_vig', w, h, '#03050e', 0.72);
        let b = `<rect width="${w}" height="${N(h)}" fill="url(#observatory_dome)"/>`;
        b += `<path d="M0 ${N(fy)} Q ${N(w * 0.5)} ${N(h * 0.16)} ${w} ${N(fy)} L${w} ${N(h)} L0 ${N(h)} Z" fill="#101538"/>`;
        for (let i = 0; i < 5; i++) {
            const off = (i - 2) * w * 0.13;
            b += `<path d="M${N(w * 0.5 + off)} ${N(fy)} Q ${N(w * 0.5 + off * 0.35)} ${N(h * 0.26)} ${N(w * 0.5 - off)} ${N(fy)}" fill="none" stroke="#1c2352" stroke-width="${N(w * 0.004)}" opacity="0.8"/>`;
        }
        // 天窗：星空 + 金属边框 + 两侧百叶
        b += `<g clip-path="url(#observatory_slit)"><rect width="${w}" height="${h}" fill="url(#observatory_sky)"/>`;
        b += dots(rnd, 90, 0, 0, w, h * 0.45, h * 0.0012, h * 0.0032, '#eef4ff', 0.9);
        b += dots(rnd, 5, w * 0.2, h * 0.02, w * 0.55, h * 0.3, h * 0.004, h * 0.007, '#bcd0ff', 0.35);
        b += `<ellipse cx="${N(w * 0.58)}" cy="${N(h * 0.14)}" rx="${N(w * 0.18)}" ry="${N(h * 0.07)}" fill="#3d4a94" opacity="0.25"/></g>`;
        b += poly(slit, 'none', ` stroke="#38427e" stroke-width="${N(w * 0.012)}"`);
        b += poly([[w * 0.20, h * 0.05], [w * 0.27, h * 0.068], [w * 0.24, h * 0.31], [w * 0.16, h * 0.29]], '#1a2148');
        b += poly([[w * 0.76, h * 0.03], [w * 0.85, h * 0.01], [w * 0.93, h * 0.30], [w * 0.78, h * 0.33]], '#1a2148');
        // 星光光束
        b += poly([[w * 0.30, h * 0.28], [w * 0.72, h * 0.30], [w * 0.86, h * 0.95], [w * 0.16, h * 0.95]], 'url(#observatory_beam)', ' opacity="0.5"');
        // 地面 + 圆形光斑
        b += `<rect y="${N(fy)}" width="${w}" height="${N(h - fy)}" fill="url(#observatory_floor)"/>`;
        b += `<path d="M0 ${N(fy)} Q ${N(w * 0.5)} ${N(h * 0.86)} ${w} ${N(fy)}" fill="none" stroke="#252e5c" stroke-width="${N(h * 0.006)}" opacity="0.7"/>`;
        b += `<ellipse cx="${N(w * 0.56)}" cy="${N(h * 0.895)}" rx="${N(w * 0.28)}" ry="${N(h * 0.078)}" fill="url(#observatory_patch)"/>`;
        b += `<ellipse cx="${N(w * 0.56)}" cy="${N(h * 0.895)}" rx="${N(w * 0.12)}" ry="${N(h * 0.034)}" fill="#cfdfff" opacity="0.10"/>`;
        // 望远镜剪影：镜筒 + 寻星镜 + 叉架 + 三脚架
        const tc = [w * 0.50, h * 0.60], rot = -24;
        b += `<g transform="translate(${N(tc[0])},${N(tc[1])}) rotate(${rot})">`;
        b += `<rect x="${N(-w * 0.215)}" y="${N(-h * 0.040)}" width="${N(w * 0.430)}" height="${N(h * 0.080)}" rx="${N(h * 0.010)}" fill="#04060e"/>`;
        b += `<rect x="${N(-w * 0.215)}" y="${N(-h * 0.040)}" width="${N(w * 0.430)}" height="${N(h * 0.018)}" fill="#1c2450"/>`;
        b += `<rect x="${N(w * 0.165)}" y="${N(-h * 0.050)}" width="${N(w * 0.050)}" height="${N(h * 0.100)}" rx="${N(h * 0.008)}" fill="#04060e"/>`;
        b += `<rect x="${N(-w * 0.055)}" y="${N(-h * 0.030)}" width="${N(w * 0.075)}" height="${N(h * 0.058)}" fill="#131a3c"/>`;
        b += `<rect x="${N(-w * 0.030)}" y="${N(-h * 0.072)}" width="${N(w * 0.130)}" height="${N(h * 0.022)}" rx="${N(h * 0.006)}" fill="#0a0f22"/>`;
        b += `</g>`;
        b += `<circle cx="${N(tc[0])}" cy="${N(tc[1] + h * 0.012)}" r="${N(h * 0.048)}" fill="#0a0f22"/>`;
        b += `<circle cx="${N(tc[0])}" cy="${N(tc[1] + h * 0.012)}" r="${N(h * 0.026)}" fill="#161e42"/>`;
        b += `<rect x="${N(tc[0] - w * 0.028)}" y="${N(tc[1] + h * 0.040)}" width="${N(w * 0.056)}" height="${N(h * 0.060)}" fill="#080c1c"/>`;
        for (const [ex, ey, ew] of [[0.30, 0.94, 0.020], [0.72, 0.95, 0.022], [0.51, 0.97, 0.018]]) {
            b += poly([[tc[0] - w * ew * 0.5, tc[1] + h * 0.085], [tc[0] + w * ew * 0.5, tc[1] + h * 0.085], [w * ex + w * ew * 0.7, h * ey], [w * ex - w * ew * 0.7, h * ey]], '#070b18');
        }
        b += `<ellipse cx="${N(w * 0.29)}" cy="${N(h * 0.945)}" rx="${N(w * 0.045)}" ry="${N(h * 0.014)}" fill="#05080f"/>`;
        b += `<ellipse cx="${N(w * 0.71)}" cy="${N(h * 0.955)}" rx="${N(w * 0.050)}" ry="${N(h * 0.015)}" fill="#05080f"/>`;
        b += `<rect width="${w}" height="${h}" fill="url(#observatory_vig)"/>`;
        return wrap(w, h, defs, b);
    },

    black: (w, h) => wrap(w, h, '', `<rect width="${w}" height="${h}" fill="#000000"/>`),
};
