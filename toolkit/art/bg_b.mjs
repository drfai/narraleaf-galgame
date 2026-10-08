/**
 * 4 张 galgame 背景（扁平日式动画风）：白天走廊 / 天台的昼·黄昏·夜。
 * 坐标全部按 w/h 比例推导；纯函数、无依赖、不使用 Math.random（星点用固定种子伪随机）。
 */

// mulberry32：固定种子伪随机，保证每次渲染完全一致。
const rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) >>> 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const wrap = (w, h, body) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>`;

const pts = (list) => list.map(([x, y]) => `${(+x).toFixed(1)},${(+y).toFixed(1)}`).join(' ');

// 一朵积云：几个椭圆拼出的扁平剪影
const cloud = (cx, cy, r, op, fill = '#ffffff') => {
    const puffs = [[0, 0, 1], [-0.82, 0.16, 0.7], [0.86, 0.12, 0.74], [-0.34, -0.42, 0.58], [0.44, -0.38, 0.6]];
    return `<g fill="${fill}" opacity="${op}">` + puffs.map(([dx, dy, k]) =>
        `<ellipse cx="${(cx + dx * r).toFixed(1)}" cy="${(cy + dy * r).toFixed(1)}" rx="${(r * k).toFixed(1)}" ry="${(r * k * 0.58).toFixed(1)}"/>`).join('') + `</g>`;
};

// 远景城市剪影：楼体从基线 y 向上生长
const skyline = (w, h, y, seed, fill) => {
    const r = rng(seed);
    let out = `<rect x="0" y="${y.toFixed(1)}" width="${w}" height="${(h - y).toFixed(1)}" fill="${fill}"/>`;
    for (let x = -0.02 * w; x < w;) {
        const bw = (0.018 + r() * 0.05) * w;
        const bh = (0.025 + r() * 0.12) * h;
        out += `<rect x="${x.toFixed(1)}" y="${(y - bh).toFixed(1)}" width="${bw.toFixed(1)}" height="${(bh + 2).toFixed(1)}" fill="${fill}"/>`;
        x += bw + (0.004 + r() * 0.014) * w;
    }
    return out;
};

// 护栏：立柱 + 上下横杆（+ 可选铁网 pattern）
const railing = (w, h, top, bot, color, meshId, posts) => {
    let out = `<g fill="${color}">`;
    for (let i = 0; i <= posts; i++) {
        const x = (i / posts) * w;
        out += `<rect x="${(x - 0.005 * w).toFixed(1)}" y="${top.toFixed(1)}" width="${(0.01 * w).toFixed(1)}" height="${(bot - top).toFixed(1)}"/>`;
    }
    out += `<rect x="0" y="${top.toFixed(1)}" width="${w}" height="${(0.013 * h).toFixed(1)}"/>` +
        `<rect x="0" y="${(bot - 0.012 * h).toFixed(1)}" width="${w}" height="${(0.012 * h).toFixed(1)}"/></g>`;
    if (meshId) out += `<rect x="0" y="${(top + 0.014 * h).toFixed(1)}" width="${w}" height="${(bot - top - 0.026 * h).toFixed(1)}" fill="url(#${meshId})"/>`;
    return out;
};

export default {
    // ── 白天走廊：消失点在右侧，左墙一排窗，地板长条光斑 ───────────────────
    hallway_day: (w, h) => {
        const s = w / 1920, mix = (a, b, t) => a + (b - a) * t;
        const vx = 0.84 * w, vy = 0.5 * h;
        const fl = vx - 0.075 * w, fr = vx + 0.075 * w, ft = vy - 0.3 * h, fb = vy + 0.32 * h;
        const xAt = (u, t) => mix(mix(0, w, u), mix(fl, fr, u), t);
        const ceil = (u, t) => [xAt(u, t), mix(0, ft, t)];
        const floor = (u, t) => [xAt(u, t), mix(h, fb, t)];
        const wx = (t) => mix(0, fl, t), wt = (t) => mix(0, ft, t), wb = (t) => mix(h, fb, t);
        // 窗按世界深度 z 等距排布，再投影到画面参数 t（t=z/(z+3)），越远越窄
        const tz = (z) => z / (z + 3);
        const win = [0, 1, 2, 3, 4].map((i) => [tz(1.5 + i * 1.6), tz(2.4 + i * 1.6)]);
        const winPts = (a, b) => pts([[wx(a), mix(wt(a), wb(a), 0.17)], [wx(b), mix(wt(b), wb(b), 0.17)],
            [wx(b), mix(wt(b), wb(b), 0.76)], [wx(a), mix(wt(a), wb(a), 0.76)]]);
        const glass = win.map(([a, b]) => `<polygon points="${winPts(a, b)}" fill="url(#hallway_day_glass)"/>`).join('');
        const pillars = win.slice(0, 4).map(([, b], i) => {
            const a2 = win[i + 1][0];
            return `<polygon points="${pts([[wx(b), wt(b)], [wx(a2), wt(a2)], [wx(a2), wb(a2)], [wx(b), wb(b)]])}" fill="#e3d3b5"/>`;
        }).join('');
        const boards = Array.from({ length: 9 }, (_, i) => i + 1).map((i) =>
            `<line x1="${mix(0, w, i / 10).toFixed(1)}" y1="${h}" x2="${mix(fl, fr, i / 10).toFixed(1)}" y2="${fb.toFixed(1)}" stroke="#b7834a" stroke-width="${1.4 * s}" opacity="0.35"/>`).join('');
        const strips = [[0.05, 0.1, 0.5], [0.22, 0.09, 0.42], [0.38, 0.11, 0.5], [0.56, 0.08, 0.36]].map(([u, dw, op]) =>
            `<polygon points="${pts([floor(u, 0.02), floor(u + dw, 0.02), floor(u + dw + 0.05, 0.92), floor(u + 0.05, 0.92)])}" fill="#fff4c9" opacity="${op}"/>`).join('');
        return wrap(w, h, `<defs>
<linearGradient id="hallway_day_wall" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#f8f0dd"/><stop offset="0.55" stop-color="#e9d9bd"/><stop offset="1" stop-color="#f5e8d1"/></linearGradient>
<linearGradient id="hallway_day_ceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fcf5e6"/><stop offset="1" stop-color="#efe2c8"/></linearGradient>
<linearGradient id="hallway_day_floor" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#bf8c53"/><stop offset="0.6" stop-color="#e2bb85"/><stop offset="1" stop-color="#f7e1bf"/></linearGradient>
<linearGradient id="hallway_day_glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d8edff"/><stop offset="0.55" stop-color="#ffffff"/><stop offset="1" stop-color="#ffefc0"/></linearGradient>
<radialGradient id="hallway_day_glow" cx="0.5" cy="0.5" r="0.75"><stop offset="0" stop-color="#fff6d5" stop-opacity="0.9"/><stop offset="1" stop-color="#fff6d5" stop-opacity="0"/></radialGradient>
<radialGradient id="hallway_day_vig" cx="0.84" cy="0.5" r="0.8"><stop offset="0.35" stop-color="#3a2410" stop-opacity="0"/><stop offset="1" stop-color="#3a2410" stop-opacity="0.45"/></radialGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#hallway_day_wall)"/>
<polygon points="${pts([[0, 0], [w, 0], [fr, ft], [fl, ft]])}" fill="url(#hallway_day_ceil)"/>
<polygon points="${pts([[0, h], [fl, fb], [fr, fb], [w, h]])}" fill="url(#hallway_day_floor)"/>
<polygon points="${pts([[w, 0], [w, h], [fr, fb], [fr, ft]])}" fill="#e4d0aa"/>
<polygon points="${pts([[0, 0], [fl, ft], [fl, fb], [0, h]])}" fill="#f7ecd7"/>
${pillars}
<line x1="0" y1="${h}" x2="${fl.toFixed(1)}" y2="${fb.toFixed(1)}" stroke="#c08f55" stroke-width="${2.6 * s}"/>
<line x1="0" y1="0" x2="${fl.toFixed(1)}" y2="${ft.toFixed(1)}" stroke="#d9c8a6" stroke-width="${2.6 * s}"/>
${boards}
<rect x="${fl.toFixed(1)}" y="${ft.toFixed(1)}" width="${(fr - fl).toFixed(1)}" height="${(fb - ft).toFixed(1)}" fill="#fdf7ea"/>
<rect x="${(fl + 0.022 * w).toFixed(1)}" y="${(ft + 0.2 * (fb - ft)).toFixed(1)}" width="${(0.1 * w).toFixed(1)}" height="${(0.6 * (fb - ft)).toFixed(1)}" fill="#c9a374"/>
${glass}
${strips}
<ellipse cx="${vx.toFixed(1)}" cy="${vy.toFixed(1)}" rx="${(0.42 * w).toFixed(1)}" ry="${(0.5 * h).toFixed(1)}" fill="url(#hallway_day_glow)"/>
<rect width="${w}" height="${h}" fill="url(#hallway_day_vig)"/>`);
    },

    // ── 白天天台：蓝天积云 + 水泥地 + 水塔 + 绿铁网 + 远景城市 ─────────────
    rooftop_day: (w, h) => {
        const s = w / 1920;
        const hor = 0.585 * h, parapet = 0.605 * h, deckY = 0.63 * h, railTop = 0.45 * h;
        const tx = 0.17 * w, tw = 0.12 * w, tt = 0.3 * h, tb = 0.6 * h;
        const joints = Array.from({ length: 6 }, (_, i) => i + 1).map((i) =>
            `<line x1="${(i / 7 * w).toFixed(1)}" y1="${h}" x2="${(0.5 * w + (i / 7 - 0.5) * 0.7 * w).toFixed(1)}" y2="${deckY.toFixed(1)}" stroke="#8e8c84" stroke-width="${1.6 * s}" opacity="0.5"/>`).join('');
        return wrap(w, h, `<defs>
<linearGradient id="rooftop_day_sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1c68cc"/><stop offset="0.55" stop-color="#69b4ea"/><stop offset="1" stop-color="#d8f0fb"/></linearGradient>
<linearGradient id="rooftop_day_deck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cbc9be"/><stop offset="0.45" stop-color="#bdbbb0"/><stop offset="1" stop-color="#92908a"/></linearGradient>
<linearGradient id="rooftop_day_tank" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#83878c"/><stop offset="0.42" stop-color="#d3d7da"/><stop offset="1" stop-color="#767a7f"/></linearGradient>
<pattern id="rooftop_day_mesh" width="${(0.0095 * w).toFixed(1)}" height="${(0.0095 * w).toFixed(1)}" patternUnits="userSpaceOnUse"><path d="M0 0 ${(0.0095 * w).toFixed(1)} ${(0.0095 * w).toFixed(1)} M${(0.0095 * w).toFixed(1)} 0 0 ${(0.0095 * w).toFixed(1)}" stroke="#3e7d4a" stroke-width="${1.5 * s}" opacity="0.85"/></pattern>
<radialGradient id="rooftop_day_sun" cx="0.4" cy="0.04" r="0.62"><stop offset="0" stop-color="#fffbe6" stop-opacity="0.9"/><stop offset="1" stop-color="#fffbe6" stop-opacity="0"/></radialGradient>
<radialGradient id="rooftop_day_vig" cx="0.5" cy="0.45" r="0.8"><stop offset="0.42" stop-color="#173352" stop-opacity="0"/><stop offset="1" stop-color="#173352" stop-opacity="0.34"/></radialGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#rooftop_day_sky)"/>
${cloud(0.24 * w, 0.17 * h, 0.075 * w, 0.92)}${cloud(0.63 * w, 0.11 * h, 0.055 * w, 0.82)}
${cloud(0.86 * w, 0.25 * h, 0.065 * w, 0.72)}${cloud(0.46 * w, 0.3 * h, 0.038 * w, 0.6)}
${skyline(w, h, hor, 11, '#9db7cf')}
<rect x="0" y="${parapet.toFixed(1)}" width="${w}" height="${(deckY - parapet).toFixed(1)}" fill="#cac8bd"/>
${railing(w, h, railTop, parapet, '#2f6b3d', 'rooftop_day_mesh', 9)}
<rect x="0" y="${deckY.toFixed(1)}" width="${w}" height="${(h - deckY).toFixed(1)}" fill="url(#rooftop_day_deck)"/>
${joints}
<rect x="${(0.78 * w).toFixed(1)}" y="${(0.66 * h).toFixed(1)}" width="${(0.13 * w).toFixed(1)}" height="${(0.1 * h).toFixed(1)}" fill="#b2b0a6"/>
<rect x="${(0.79 * w).toFixed(1)}" y="${(0.675 * h).toFixed(1)}" width="${(0.11 * w).toFixed(1)}" height="${(0.02 * h).toFixed(1)}" fill="#8e8c83"/>
<rect x="${(0.79 * w).toFixed(1)}" y="${(0.705 * h).toFixed(1)}" width="${(0.11 * w).toFixed(1)}" height="${(0.02 * h).toFixed(1)}" fill="#8e8c83"/>
<path d="M${(tx - 0.052 * w).toFixed(1)} ${(0.7 * h).toFixed(1)} L${(tx - 0.028 * w).toFixed(1)} ${tb.toFixed(1)} M${(tx + 0.052 * w).toFixed(1)} ${(0.7 * h).toFixed(1)} L${(tx + 0.028 * w).toFixed(1)} ${tb.toFixed(1)}" stroke="#6a6e73" stroke-width="${7 * s}" fill="none"/>
<rect x="${(tx - tw / 2).toFixed(1)}" y="${tt.toFixed(1)}" width="${tw.toFixed(1)}" height="${(tb - tt).toFixed(1)}" rx="${6 * s}" fill="url(#rooftop_day_tank)"/>
<rect x="${(tx - tw / 2).toFixed(1)}" y="${(tt + 0.09 * h).toFixed(1)}" width="${tw.toFixed(1)}" height="${(0.012 * h).toFixed(1)}" fill="#6f7378" opacity="0.7"/>
<path d="M${(tx - tw * 0.6).toFixed(1)} ${tt.toFixed(1)} L${tx.toFixed(1)} ${(tt - 0.055 * h).toFixed(1)} L${(tx + tw * 0.6).toFixed(1)} ${tt.toFixed(1)} Z" fill="#5d6165"/>
<rect x="${(tx + tw * 0.42).toFixed(1)}" y="${(tt + 0.03 * h).toFixed(1)}" width="${(3.5 * s).toFixed(1)}" height="${(tb - tt - 0.03 * h).toFixed(1)}" fill="#5f6367" opacity="0.8"/>
<rect width="${w}" height="${h}" fill="url(#rooftop_day_sun)"/>
<rect width="${w}" height="${h}" fill="url(#rooftop_day_vig)"/>`);
    },

    // ── 黄昏天台：橙紫渐变 + 海面反光 + 栏杆剪影 ──────────────────────────
    rooftop_sunset: (w, h) => {
        const s = w / 1920, r = rng(90210);
        const hor = 0.65 * h, seaBot = 0.8 * h, railTop = 0.51 * h;
        let refl = '';
        for (let i = 0; i < 30; i++) {
            const t = r();
            const y = hor + t * (seaBot - hor);
            const half = (0.012 + 0.075 * (1 - t)) * w * (0.4 + 0.9 * r());
            const cx = 0.63 * w + (r() - 0.5) * 0.36 * w * (1 - t);
            refl += `<rect x="${(cx - half / 2).toFixed(1)}" y="${y.toFixed(1)}" width="${half.toFixed(1)}" height="${(2.6 * s).toFixed(1)}" rx="${1.3 * s}" fill="#ffe1a2" opacity="${(0.25 + 0.55 * (1 - t)).toFixed(2)}"/>`;
        }
        return wrap(w, h, `<defs>
<linearGradient id="rooftop_sunset_sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1c4e"/><stop offset="0.3" stop-color="#6b3a74"/><stop offset="0.5" stop-color="#b8566c"/><stop offset="0.66" stop-color="#e8803d"/><stop offset="0.82" stop-color="#ffc267"/><stop offset="1" stop-color="#ffd98d"/></linearGradient>
<linearGradient id="rooftop_sunset_sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffb45e"/><stop offset="0.35" stop-color="#c2646a"/><stop offset="1" stop-color="#5b2b52"/></linearGradient>
<linearGradient id="rooftop_sunset_deck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#33203f"/><stop offset="1" stop-color="#1b1029"/></linearGradient>
<pattern id="rooftop_sunset_mesh" width="${(0.011 * w).toFixed(1)}" height="${(0.011 * w).toFixed(1)}" patternUnits="userSpaceOnUse"><path d="M0 0 ${(0.011 * w).toFixed(1)} ${(0.011 * w).toFixed(1)} M${(0.011 * w).toFixed(1)} 0 0 ${(0.011 * w).toFixed(1)}" stroke="#2a1c3a" stroke-width="${1.7 * s}" opacity="0.7"/></pattern>
<radialGradient id="rooftop_sunset_sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff6d2"/><stop offset="0.35" stop-color="#ffd47e" stop-opacity="0.85"/><stop offset="1" stop-color="#ff9a4d" stop-opacity="0"/></radialGradient>
<radialGradient id="rooftop_sunset_bloom" cx="0.63" cy="0.62" r="0.55"><stop offset="0" stop-color="#ffce85" stop-opacity="0.55"/><stop offset="1" stop-color="#ffce85" stop-opacity="0"/></radialGradient>
<radialGradient id="rooftop_sunset_vig" cx="0.5" cy="0.45" r="0.8"><stop offset="0.4" stop-color="#1b0f2c" stop-opacity="0"/><stop offset="1" stop-color="#1b0f2c" stop-opacity="0.5"/></radialGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#rooftop_sunset_sky)"/>
<circle cx="${(0.63 * w).toFixed(1)}" cy="${(0.615 * h).toFixed(1)}" r="${(0.19 * h).toFixed(1)}" fill="url(#rooftop_sunset_sun)"/>
<circle cx="${(0.63 * w).toFixed(1)}" cy="${(0.615 * h).toFixed(1)}" r="${(0.052 * h).toFixed(1)}" fill="#fff3cf"/>
${cloud(0.18 * w, 0.2 * h, 0.07 * w, 0.5, '#6d3f78')}${cloud(0.55 * w, 0.12 * h, 0.06 * w, 0.42, '#8a4a76')}
${cloud(0.82 * w, 0.26 * h, 0.062 * w, 0.45, '#c46a5e')}${cloud(0.34 * w, 0.34 * h, 0.05 * w, 0.5, '#e08a55')}
${skyline(w, h, hor, 5, '#3c2447')}
<rect x="0" y="${hor.toFixed(1)}" width="${w}" height="${(seaBot - hor).toFixed(1)}" fill="url(#rooftop_sunset_sea)"/>
${refl}
${railing(w, h, railTop, seaBot, '#2a1c3a', 'rooftop_sunset_mesh', 8)}
<rect x="0" y="${seaBot.toFixed(1)}" width="${w}" height="${(h - seaBot).toFixed(1)}" fill="url(#rooftop_sunset_deck)"/>
<line x1="0" y1="${(h * 0.9).toFixed(1)}" x2="${w}" y2="${(h * 0.88).toFixed(1)}" stroke="#472c56" stroke-width="${2 * s}" opacity="0.6"/>
<rect width="${w}" height="${h}" fill="url(#rooftop_sunset_bloom)"/>
<rect width="${w}" height="${h}" fill="url(#rooftop_sunset_vig)"/>`);
    },

    // ── 星空天台：银河带 + 疏密星点 + 流星 + 栏杆地面剪影 ─────────────────
    rooftop_night: (w, h) => {
        const s = w / 1920, r = rng(777);
        const hor = 0.7 * h, deckY = 0.82 * h, railTop = 0.55 * h;
        const bandY = (x) => 0.06 * h + (x / w) * 0.22 * h;
        let stars = '';
        for (let i = 0; i < 220; i++) {
            const big = r() > 0.93;
            stars += `<circle cx="${(r() * w).toFixed(1)}" cy="${(r() * hor).toFixed(1)}" r="${((0.55 + r() * 1.6) * s * (big ? 1.9 : 1)).toFixed(2)}" fill="#ffffff" opacity="${(0.3 + r() * 0.7).toFixed(2)}"/>`;
        }
        for (let i = 0; i < 150; i++) {
            const x = r() * w, y = bandY(x) + (r() - 0.5) * 0.16 * h;
            if (y < 0 || y > hor) continue;
            stars += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.4 + r() * 1.2).toFixed(2)}" fill="#e8efff" opacity="${(0.25 + r() * 0.6).toFixed(2)}"/>`;
        }
        let lights = '';
        for (let i = 0; i < 46; i++) {
            const warm = r() > 0.5;
            lights += `<rect x="${(r() * w).toFixed(1)}" y="${(hor - r() * 0.035 * h).toFixed(1)}" width="${(1.8 * s).toFixed(1)}" height="${(1.8 * s).toFixed(1)}" fill="${warm ? '#ffd894' : '#bfe0ff'}" opacity="0.85"/>`;
        }
        const meteor = (x, y, len) =>
            `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x + len * 0.46).toFixed(1)}" y2="${(y + len).toFixed(1)}" stroke="url(#rooftop_night_meteor)" stroke-width="${2.8 * s}" stroke-linecap="round"/>`;
        return wrap(w, h, `<defs>
<linearGradient id="rooftop_night_sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03061a"/><stop offset="0.45" stop-color="#0d1a3e"/><stop offset="0.78" stop-color="#1d3161"/><stop offset="1" stop-color="#2f4471"/></linearGradient>
<linearGradient id="rooftop_night_deck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1226"/><stop offset="1" stop-color="#04070f"/></linearGradient>
<linearGradient id="rooftop_night_meteor" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="#cfe0ff" stop-opacity="0.55"/><stop offset="1" stop-color="#cfe0ff" stop-opacity="0"/></linearGradient>
<radialGradient id="rooftop_night_way" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#9fb0e6" stop-opacity="0.34"/><stop offset="0.5" stop-color="#7d8fd0" stop-opacity="0.16"/><stop offset="1" stop-color="#7d8fd0" stop-opacity="0"/></radialGradient>
<radialGradient id="rooftop_night_moon" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#dfe6ff" stop-opacity="0.55"/><stop offset="1" stop-color="#dfe6ff" stop-opacity="0"/></radialGradient>
<pattern id="rooftop_night_mesh" width="${(0.012 * w).toFixed(1)}" height="${(0.012 * w).toFixed(1)}" patternUnits="userSpaceOnUse"><path d="M0 0 ${(0.012 * w).toFixed(1)} ${(0.012 * w).toFixed(1)} M${(0.012 * w).toFixed(1)} 0 0 ${(0.012 * w).toFixed(1)}" stroke="#070c1c" stroke-width="${1.8 * s}" opacity="0.9"/></pattern>
<radialGradient id="rooftop_night_vig" cx="0.5" cy="0.42" r="0.78"><stop offset="0.35" stop-color="#01030a" stop-opacity="0"/><stop offset="1" stop-color="#01030a" stop-opacity="0.62"/></radialGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#rooftop_night_sky)"/>
<g transform="rotate(7 ${(w / 2).toFixed(1)} ${(h * 0.22).toFixed(1)})">
<ellipse cx="${(w * 0.5).toFixed(1)}" cy="${(h * 0.22).toFixed(1)}" rx="${(0.5 * w).toFixed(1)}" ry="${(0.075 * h).toFixed(1)}" fill="url(#rooftop_night_way)"/>
<ellipse cx="${(w * 0.36).toFixed(1)}" cy="${(h * 0.2).toFixed(1)}" rx="${(0.22 * w).toFixed(1)}" ry="${(0.045 * h).toFixed(1)}" fill="url(#rooftop_night_way)" opacity="0.8"/>
<ellipse cx="${(w * 0.68).toFixed(1)}" cy="${(h * 0.25).toFixed(1)}" rx="${(0.17 * w).toFixed(1)}" ry="${(0.036 * h).toFixed(1)}" fill="url(#rooftop_night_way)"/>
</g>
${stars}
<circle cx="${(0.82 * w).toFixed(1)}" cy="${(0.14 * h).toFixed(1)}" r="${(0.075 * h).toFixed(1)}" fill="url(#rooftop_night_moon)"/>
<circle cx="${(0.82 * w).toFixed(1)}" cy="${(0.14 * h).toFixed(1)}" r="${(0.028 * h).toFixed(1)}" fill="#f3f0dc"/>
<circle cx="${(0.808 * w).toFixed(1)}" cy="${(0.132 * h).toFixed(1)}" r="${(0.007 * h).toFixed(1)}" fill="#dfdcc4" opacity="0.7"/>
${meteor(0.3 * w, 0.1 * h, 0.14 * h)}${meteor(0.58 * w, 0.16 * h, 0.1 * h)}
${skyline(w, h, hor, 23, '#060b18')}
${lights}
${railing(w, h, railTop, deckY, '#050a16', 'rooftop_night_mesh', 8)}
<rect x="0" y="${deckY.toFixed(1)}" width="${w}" height="${(h - deckY).toFixed(1)}" fill="url(#rooftop_night_deck)"/>
<line x1="0" y1="${(h * 0.9).toFixed(1)}" x2="${w}" y2="${(h * 0.885).toFixed(1)}" stroke="#182545" stroke-width="${2 * s}" opacity="0.7"/>
<rect width="${w}" height="${h}" fill="url(#rooftop_night_vig)"/>`);
    },
};
