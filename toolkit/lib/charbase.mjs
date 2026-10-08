/**
 * 角色立绘绘制基座：一份参数化的「正面半身」日式动画立绘。
 * 五名角色共用同一套画法，只换配色、发型、服装与配饰，保证风格统一。
 *
 * 画布 900x1400（可传入任意 w/h，坐标按比例换算），背景透明。
 */

export const POSES = ['normal', 'smile', 'sad', 'angry', 'surprise', 'shy'];

/** 每种表情只改眼睛 / 眉毛 / 嘴 / 腮红四个参数。 */
const EXPR = {
    normal: { eye: 'open', eyeH: 1.00, brow: 'flat', browY: 0, mouth: 'line', blush: 0.00, look: 0 },
    smile: { eye: 'happy', eyeH: 0.80, brow: 'soft', browY: -4, mouth: 'smile', blush: 0.18, look: 0 },
    sad: { eye: 'droop', eyeH: 0.90, brow: 'sad', browY: 2, mouth: 'frown', blush: 0.00, look: 0 },
    angry: { eye: 'narrow', eyeH: 0.70, brow: 'angry', browY: 6, mouth: 'flat', blush: 0.06, look: 0 },
    surprise: { eye: 'wide', eyeH: 1.22, brow: 'high', browY: -10, mouth: 'o', blush: 0.00, look: 0 },
    shy: { eye: 'open', eyeH: 0.94, brow: 'soft', browY: -4, mouth: 'wave', blush: 0.62, look: -0.35 },
};

const n = (v) => (Math.round(v * 100) / 100);

/**
 * @param {object} s 角色样式参数
 * @param {string} pose POSES 之一
 */
export function drawCharacter(s, pose, w = 900, h = 1400) {
    pose = POSES.includes(pose) ? pose : 'normal';
    const e = EXPR[pose];
    const uid = `${s.key}_${pose}`;
    const L = [];

    // ── 关键尺寸
    const cx = w * 0.5;
    const headTop = h * 0.078;
    const headBot = h * 0.336;
    const headH = headBot - headTop;
    const headRX = w * 0.156;
    const headCY = headTop + headH * 0.5;
    const eyeY = headTop + headH * 0.585;
    const eyeDX = w * 0.072;
    const eyeW = w * 0.083;
    const eyeH = h * 0.0365 * e.eyeH;
    const chinY = headBot;
    const neckTop = headBot - h * 0.012;
    const shoulderY = h * 0.415;
    const bodyBot = h * 1.005;
    const sw = w * (s.build ?? 0.30);
    const stroke = Math.max(1.6, h * 0.0038);

    const hairMain = s.hair;
    const hairDark = s.hairShade;
    const hairLight = s.hairLight;
    const skin = s.skin;
    const skinShade = s.skinShade;

    // ── defs
    L.push(`<defs>
<linearGradient id="${uid}_iris" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${s.eyeShade}"/><stop offset="0.55" stop-color="${s.eye}"/><stop offset="1" stop-color="${s.eyeLight}"/>
</linearGradient>
<linearGradient id="${uid}_hair" x1="0" y1="0" x2="0.25" y2="1">
  <stop offset="0" stop-color="${hairLight}"/><stop offset="0.45" stop-color="${hairMain}"/><stop offset="1" stop-color="${hairDark}"/>
</linearGradient>
<linearGradient id="${uid}_cloth" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="${s.clothLight}"/><stop offset="1" stop-color="${s.cloth}"/>
</linearGradient>
<radialGradient id="${uid}_blush" cx="0.5" cy="0.5" r="0.5">
  <stop offset="0" stop-color="#f2807f" stop-opacity="0.75"/><stop offset="1" stop-color="#f2807f" stop-opacity="0"/>
</radialGradient>
</defs>`);

    // ── 后发（在身体之后，先画）
    const back = {
        short: `<path d="M ${n(cx - headRX * 1.20)} ${n(headCY + headH * 0.30)} Q ${n(cx - headRX * 1.30)} ${n(headTop - h * 0.012)} ${n(cx)} ${n(headTop - h * 0.016)} Q ${n(cx + headRX * 1.30)} ${n(headTop - h * 0.012)} ${n(cx + headRX * 1.20)} ${n(headCY + headH * 0.30)} Q ${n(cx)} ${n(headCY + headH * 0.16)} ${n(cx - headRX * 1.20)} ${n(headCY + headH * 0.30)} Z" fill="url(#${uid}_hair)" stroke="${hairDark}" stroke-width="${n(stroke)}"/>`,
        long: `<path d="M ${n(cx - headRX * 1.28)} ${n(h * 0.78)} Q ${n(cx - headRX * 1.62)} ${n(headTop + headH * 0.5)} ${n(cx - headRX * 1.30)} ${n(headTop - h * 0.014)} Q ${n(cx)} ${n(headTop - h * 0.022)} ${n(cx + headRX * 1.30)} ${n(headTop - h * 0.014)} Q ${n(cx + headRX * 1.62)} ${n(headTop + headH * 0.5)} ${n(cx + headRX * 1.28)} ${n(h * 0.78)} Q ${n(cx)} ${n(h * 0.70)} ${n(cx - headRX * 1.28)} ${n(h * 0.78)} Z" fill="url(#${uid}_hair)" stroke="${hairDark}" stroke-width="${n(stroke)}"/>`,
        ponytail: `<path d="M ${n(cx - headRX * 1.22)} ${n(headCY + headH * 0.28)} Q ${n(cx - headRX * 1.34)} ${n(headTop - h * 0.010)} ${n(cx)} ${n(headTop - h * 0.014)} Q ${n(cx + headRX * 1.34)} ${n(headTop - h * 0.010)} ${n(cx + headRX * 1.22)} ${n(headCY + headH * 0.28)} Q ${n(cx)} ${n(headCY + headH * 0.14)} ${n(cx - headRX * 1.22)} ${n(headCY + headH * 0.28)} Z" fill="url(#${uid}_hair)" stroke="${hairDark}" stroke-width="${n(stroke)}"/>
<path d="M ${n(cx + headRX * 1.05)} ${n(headCY - headH * 0.16)} Q ${n(cx + headRX * 1.95)} ${n(headCY + headH * 0.20)} ${n(cx + headRX * 1.55)} ${n(h * 0.72)} Q ${n(cx + headRX * 1.20)} ${n(h * 0.60)} ${n(cx + headRX * 1.15)} ${n(headCY + headH * 0.12)} Z" fill="${hairMain}" stroke="${hairDark}" stroke-width="${n(stroke)}"/>`,
        male: `<path d="M ${n(cx - headRX * 1.12)} ${n(headCY + headH * 0.16)} Q ${n(cx - headRX * 1.18)} ${n(headTop - h * 0.010)} ${n(cx)} ${n(headTop - h * 0.014)} Q ${n(cx + headRX * 1.18)} ${n(headTop - h * 0.010)} ${n(cx + headRX * 1.12)} ${n(headCY + headH * 0.16)} Q ${n(cx)} ${n(headCY + headH * 0.06)} ${n(cx - headRX * 1.12)} ${n(headCY + headH * 0.16)} Z" fill="url(#${uid}_hair)" stroke="${hairDark}" stroke-width="${n(stroke)}"/>`,
        bun: `<path d="M ${n(cx - headRX * 1.20)} ${n(headCY + headH * 0.24)} Q ${n(cx - headRX * 1.30)} ${n(headTop - h * 0.010)} ${n(cx)} ${n(headTop - h * 0.014)} Q ${n(cx + headRX * 1.30)} ${n(headTop - h * 0.010)} ${n(cx + headRX * 1.20)} ${n(headCY + headH * 0.24)} Q ${n(cx)} ${n(headCY + headH * 0.10)} ${n(cx - headRX * 1.20)} ${n(headCY + headH * 0.24)} Z" fill="url(#${uid}_hair)" stroke="${hairDark}" stroke-width="${n(stroke)}"/>
<circle cx="${n(cx + headRX * 0.05)}" cy="${n(headTop - h * 0.030)}" r="${n(headRX * 0.44)}" fill="${hairMain}" stroke="${hairDark}" stroke-width="${n(stroke)}"/>`,
    }[s.hairStyle];
    L.push(back);

    // ── 身体
    const bodyPath = `M ${n(cx - sw * 1.35)} ${n(bodyBot)} L ${n(cx - sw * 1.30)} ${n(shoulderY + h * 0.075)} Q ${n(cx - sw * 1.26)} ${n(shoulderY - h * 0.008)} ${n(cx - sw * 0.62)} ${n(shoulderY - h * 0.020)} L ${n(cx + sw * 0.62)} ${n(shoulderY - h * 0.020)} Q ${n(cx + sw * 1.26)} ${n(shoulderY - h * 0.008)} ${n(cx + sw * 1.30)} ${n(shoulderY + h * 0.075)} L ${n(cx + sw * 1.35)} ${n(bodyBot)} Z`;
    L.push(`<path d="${bodyPath}" fill="url(#${uid}_cloth)" stroke="${s.clothShade}" stroke-width="${n(stroke)}"/>`);

    // 脖子
    L.push(`<path d="M ${n(cx - w * 0.052)} ${n(neckTop)} L ${n(cx + w * 0.052)} ${n(neckTop)} L ${n(cx + w * 0.058)} ${n(shoulderY - h * 0.004)} L ${n(cx - w * 0.058)} ${n(shoulderY - h * 0.004)} Z" fill="${skinShade}"/>`);

    // 领口 / 领带 / 配饰（服装差异）
    const collarY = shoulderY - h * 0.012;
    const vTop = shoulderY - h * 0.022;
    const vBot = shoulderY + h * 0.085;
    if (s.outfit === 'sailor') {
        L.push(`<path d="M ${n(cx - sw * 0.70)} ${n(collarY)} L ${n(cx)} ${n(vBot)} L ${n(cx + sw * 0.70)} ${n(collarY)} L ${n(cx + sw * 0.52)} ${n(collarY - h * 0.008)} L ${n(cx)} ${n(vBot - h * 0.028)} L ${n(cx - sw * 0.52)} ${n(collarY - h * 0.008)} Z" fill="${s.collar}" stroke="${s.clothShade}" stroke-width="${n(stroke)}"/>`);
        L.push(`<path d="M ${n(cx - w * 0.030)} ${n(vBot - h * 0.020)} L ${n(cx - w * 0.062)} ${n(vBot + h * 0.030)} L ${n(cx)} ${n(vBot + h * 0.010)} L ${n(cx + w * 0.062)} ${n(vBot + h * 0.030)} L ${n(cx + w * 0.030)} ${n(vBot - h * 0.020)} Z" fill="${s.ribbon}" stroke="${s.clothShade}" stroke-width="${n(stroke)}"/>`);
    } else if (s.outfit === 'blazer') {
        L.push(`<path d="M ${n(cx - sw * 0.78)} ${n(vTop)} L ${n(cx)} ${n(vBot)} L ${n(cx + sw * 0.78)} ${n(vTop)} L ${n(cx + sw * 1.30)} ${n(shoulderY + h * 0.075)} L ${n(cx - sw * 1.30)} ${n(shoulderY + h * 0.075)} Z" fill="${s.collar}" stroke="${s.clothShade}" stroke-width="${n(stroke)}"/>`);
        L.push(`<path d="M ${n(cx - sw * 0.46)} ${n(vTop)} L ${n(cx + sw * 0.10)} ${n(vBot + h * 0.012)} L ${n(cx - sw * 0.14)} ${n(vBot + h * 0.070)} Z" fill="${s.shirt}" stroke="${s.clothShade}" stroke-width="${n(stroke)}"/>`);
        L.push(`<path d="M ${n(cx + sw * 0.46)} ${n(vTop)} L ${n(cx - sw * 0.10)} ${n(vBot + h * 0.012)} L ${n(cx + sw * 0.14)} ${n(vBot + h * 0.070)} Z" fill="${s.shirt}" stroke="${s.clothShade}" stroke-width="${n(stroke)}"/>`);
        L.push(`<path d="M ${n(cx - w * 0.034)} ${n(vBot - h * 0.006)} L ${n(cx - w * 0.062)} ${n(vBot + h * 0.036)} L ${n(cx)} ${n(vBot + h * 0.014)} L ${n(cx + w * 0.062)} ${n(vBot + h * 0.036)} L ${n(cx + w * 0.034)} ${n(vBot - h * 0.006)} Z" fill="${s.ribbon}" stroke="${s.clothShade}" stroke-width="${n(stroke)}"/>`);
    } else if (s.outfit === 'shirt') {
        L.push(`<path d="M ${n(cx - sw * 0.52)} ${n(vTop)} L ${n(cx)} ${n(vBot + h * 0.004)} L ${n(cx + sw * 0.52)} ${n(vTop)} L ${n(cx + sw * 0.34)} ${n(vTop - h * 0.006)} L ${n(cx)} ${n(vBot - h * 0.030)} L ${n(cx - sw * 0.34)} ${n(vTop - h * 0.006)} Z" fill="${s.shirt}" stroke="${s.clothShade}" stroke-width="${n(stroke)}"/>`);
        L.push(`<path d="M ${n(cx - w * 0.030)} ${n(vBot - h * 0.014)} L ${n(cx - w * 0.048)} ${n(vBot + h * 0.044)} L ${n(cx + w * 0.030)} ${n(vBot + h * 0.010)} L ${n(cx + w * 0.052)} ${n(vBot + h * 0.040)} L ${n(cx + w * 0.026)} ${n(vBot - h * 0.016)} Z" fill="${s.ribbon}" stroke="${s.clothShade}" stroke-width="${n(stroke)}"/>`);
    } else {
        // cardigan：开衫两片 + 内搭
        L.push(`<path d="M ${n(cx - sw * 0.50)} ${n(vTop)} L ${n(cx)} ${n(vBot + h * 0.010)} L ${n(cx + sw * 0.50)} ${n(vTop)} L ${n(cx + sw * 1.24)} ${n(shoulderY + h * 0.075)} L ${n(cx + sw * 0.42)} ${n(shoulderY + h * 0.075)} L ${n(cx)} ${n(vBot + h * 0.010)} L ${n(cx - sw * 0.42)} ${n(shoulderY + h * 0.075)} L ${n(cx - sw * 1.24)} ${n(shoulderY + h * 0.075)} Z" fill="${s.collar}" stroke="${s.clothShade}" stroke-width="${n(stroke)}"/>`);
        L.push(`<path d="M ${n(cx - sw * 0.34)} ${n(vTop + h * 0.010)} L ${n(cx + sw * 0.34)} ${n(vTop + h * 0.010)} L ${n(cx + sw * 0.26)} ${n(bodyBot)} L ${n(cx - sw * 0.26)} ${n(bodyBot)} Z" fill="${s.shirt}" stroke="${s.clothShade}" stroke-width="${n(stroke)}"/>`);
    }

    // ── 脸
    const face = `M ${n(cx - headRX)} ${n(eyeY - headH * 0.06)}
      C ${n(cx - headRX)} ${n(headTop + headH * 0.10)} ${n(cx - headRX * 0.66)} ${n(headTop)} ${n(cx)} ${n(headTop)}
      C ${n(cx + headRX * 0.66)} ${n(headTop)} ${n(cx + headRX)} ${n(headTop + headH * 0.10)} ${n(cx + headRX)} ${n(eyeY - headH * 0.06)}
      C ${n(cx + headRX)} ${n(eyeY + headH * 0.16)} ${n(cx + headRX * 0.52)} ${n(chinY)} ${n(cx)} ${n(chinY)}
      C ${n(cx - headRX * 0.52)} ${n(chinY)} ${n(cx - headRX)} ${n(eyeY + headH * 0.16)} ${n(cx - headRX)} ${n(eyeY - headH * 0.06)} Z`;
    L.push(`<path d="${face}" fill="${skin}" stroke="${s.line}" stroke-width="${n(stroke)}"/>`);
    // 耳朵
    L.push(`<ellipse cx="${n(cx - headRX)}" cy="${n(eyeY + headH * 0.02)}" rx="${n(w * 0.018)}" ry="${n(h * 0.020)}" fill="${skinShade}"/>`);
    L.push(`<ellipse cx="${n(cx + headRX)}" cy="${n(eyeY + headH * 0.02)}" rx="${n(w * 0.018)}" ry="${n(h * 0.020)}" fill="${skinShade}"/>`);

    // ── 眼睛
    const eye = (sign) => {
        const ex = cx + sign * eyeDX;
        const look = e.look * eyeW * 0.30;
        const out = [];
        out.push(`<ellipse cx="${n(ex)}" cy="${n(eyeY)}" rx="${n(eyeW * 0.54)}" ry="${n(eyeH)}" fill="#ffffff" stroke="${s.line}" stroke-width="${n(stroke * 0.8)}"/>`);
        if (e.eye === 'happy') {
            out.push(`<path d="M ${n(ex - eyeW * 0.50)} ${n(eyeY + eyeH * 0.20)} Q ${n(ex)} ${n(eyeY - eyeH * 0.95)} ${n(ex + eyeW * 0.50)} ${n(eyeY + eyeH * 0.20)}" fill="none" stroke="${s.line}" stroke-width="${n(stroke * 2.0)}" stroke-linecap="round"/>`);
        } else {
            out.push(`<ellipse cx="${n(ex + look)}" cy="${n(eyeY + eyeH * 0.06)}" rx="${n(eyeW * 0.40)}" ry="${n(eyeH * 0.86)}" fill="url(#${uid}_iris)"/>`);
            out.push(`<ellipse cx="${n(ex + look)}" cy="${n(eyeY + eyeH * 0.10)}" rx="${n(eyeW * 0.18)}" ry="${n(eyeH * 0.44)}" fill="#20161e"/>`);
            out.push(`<circle cx="${n(ex + look - eyeW * 0.16)}" cy="${n(eyeY - eyeH * 0.42)}" r="${n(eyeW * 0.13)}" fill="#ffffff" opacity="0.95"/>`);
            out.push(`<circle cx="${n(ex + look + eyeW * 0.15)}" cy="${n(eyeY + eyeH * 0.34)}" r="${n(eyeW * 0.06)}" fill="#ffffff" opacity="0.7"/>`);
            // 上睫毛
            const lidY = e.eye === 'droop' ? eyeY - eyeH * 0.34 : e.eye === 'narrow' ? eyeY - eyeH * 0.52 : eyeY - eyeH * 0.94;
            out.push(`<path d="M ${n(ex - eyeW * 0.58)} ${n(eyeY - eyeH * 0.40)} Q ${n(ex)} ${n(lidY - eyeH * 0.25)} ${n(ex + eyeW * 0.58)} ${n(eyeY - eyeH * 0.44)}" fill="none" stroke="${s.line}" stroke-width="${n(stroke * 2.4)}" stroke-linecap="round"/>`);
            if (e.eye === 'wide') {
                out.push(`<path d="M ${n(ex - eyeW * 0.50)} ${n(eyeY + eyeH * 0.62)} Q ${n(ex)} ${n(eyeY + eyeH * 0.88)} ${n(ex + eyeW * 0.50)} ${n(eyeY + eyeH * 0.60)}" fill="none" stroke="${s.line}" stroke-width="${n(stroke * 1.1)}" stroke-linecap="round"/>`);
            }
        }
        return out.join('');
    };
    L.push(eye(-1), eye(1));

    // ── 眉毛
    const brow = (sign) => {
        const bx = cx + sign * eyeDX;
        const bw = eyeW * 0.62;
        const by = eyeY - eyeH * 1.55 + e.browY;
        const inner = sign * -1; // 内侧方向
        const cfg = {
            flat: [0, 0], soft: [2, -3], sad: [8, -7], angry: [-7, 9], high: [-5, -8],
        }[e.brow] ?? [0, 0];
        const y1 = by + cfg[0] * (sign > 0 ? 1 : 1) * (inner > 0 ? 1 : 1);
        const y2 = by + cfg[1];
        return `<path d="M ${n(bx - bw)} ${n(sign < 0 ? y1 : y2)} Q ${n(bx)} ${n(Math.min(y1, y2) - h * 0.004)} ${n(bx + bw)} ${n(sign < 0 ? y2 : y1)}" fill="none" stroke="${s.browColor ?? s.hairShade}" stroke-width="${n(stroke * 2.2)}" stroke-linecap="round"/>`;
    };
    L.push(brow(-1), brow(1));

    // ── 鼻子 + 嘴
    L.push(`<path d="M ${n(cx + w * 0.006)} ${n(eyeY + headH * 0.22)} l ${n(-w * 0.010)} ${n(h * 0.008)}" fill="none" stroke="${s.line}" stroke-width="${n(stroke * 0.9)}" stroke-linecap="round" opacity="0.6"/>`);
    const my = eyeY + headH * 0.40;
    const mw = w * 0.028;
    const mouth = {
        line: `<path d="M ${n(cx - mw)} ${n(my)} Q ${n(cx)} ${n(my + h * 0.005)} ${n(cx + mw)} ${n(my)}" fill="none" stroke="${s.line}" stroke-width="${n(stroke * 1.3)}" stroke-linecap="round"/>`,
        smile: `<path d="M ${n(cx - mw * 1.2)} ${n(my - h * 0.004)} Q ${n(cx)} ${n(my + h * 0.016)} ${n(cx + mw * 1.2)} ${n(my - h * 0.004)}" fill="none" stroke="${s.line}" stroke-width="${n(stroke * 1.5)}" stroke-linecap="round"/>`,
        frown: `<path d="M ${n(cx - mw * 1.1)} ${n(my + h * 0.008)} Q ${n(cx)} ${n(my - h * 0.006)} ${n(cx + mw * 1.1)} ${n(my + h * 0.008)}" fill="none" stroke="${s.line}" stroke-width="${n(stroke * 1.4)}" stroke-linecap="round"/>`,
        flat: `<path d="M ${n(cx - mw)} ${n(my + h * 0.002)} L ${n(cx + mw)} ${n(my + h * 0.002)}" fill="none" stroke="${s.line}" stroke-width="${n(stroke * 1.4)}" stroke-linecap="round"/>`,
        o: `<ellipse cx="${n(cx)}" cy="${n(my + h * 0.006)}" rx="${n(mw * 0.66)}" ry="${n(h * 0.011)}" fill="#8c4a52" stroke="${s.line}" stroke-width="${n(stroke * 0.9)}"/>`,
        wave: `<path d="M ${n(cx - mw)} ${n(my)} q ${n(mw * 0.5)} ${n(-h * 0.008)} ${n(mw)} 0 q ${n(mw * 0.5)} ${n(h * 0.008)} ${n(mw)} 0" fill="none" stroke="${s.line}" stroke-width="${n(stroke * 1.4)}" stroke-linecap="round"/>`,
    }[e.mouth];
    L.push(mouth);

    // ── 腮红
    const blush = s.blushBase + e.blush;
    if (blush > 0.01) {
        L.push(`<ellipse cx="${n(cx - headRX * 0.62)}" cy="${n(eyeY + headH * 0.20)}" rx="${n(w * 0.040)}" ry="${n(h * 0.017)}" fill="url(#${uid}_blush)" opacity="${n(Math.min(1, blush))}"/>`);
        L.push(`<ellipse cx="${n(cx + headRX * 0.62)}" cy="${n(eyeY + headH * 0.20)}" rx="${n(w * 0.040)}" ry="${n(h * 0.017)}" fill="url(#${uid}_blush)" opacity="${n(Math.min(1, blush))}"/>`);
    }
    if (pose === 'angry') {
        L.push(`<path d="M ${n(cx + headRX * 0.30)} ${n(headTop + headH * 0.16)} l ${n(w * 0.034)} ${n(-h * 0.008)} M ${n(cx + headRX * 0.34)} ${n(headTop + headH * 0.20)} l ${n(w * 0.030)} ${n(h * 0.006)}" stroke="#d0564f" stroke-width="${n(stroke * 1.6)}" stroke-linecap="round"/>`);
    }

    // ── 前发（刘海）
    const bangs = {
        short: `<path d="M ${n(cx - headRX * 1.06)} ${n(eyeY - headH * 0.10)} Q ${n(cx - headRX * 1.12)} ${n(headTop - h * 0.012)} ${n(cx)} ${n(headTop - h * 0.014)} Q ${n(cx + headRX * 1.12)} ${n(headTop - h * 0.012)} ${n(cx + headRX * 1.06)} ${n(eyeY - headH * 0.10)} Q ${n(cx + headRX * 0.86)} ${n(eyeY - headH * 0.30)} ${n(cx + headRX * 0.50)} ${n(eyeY - headH * 0.18)} Q ${n(cx + headRX * 0.22)} ${n(eyeY - headH * 0.40)} ${n(cx - headRX * 0.06)} ${n(eyeY - headH * 0.20)} Q ${n(cx - headRX * 0.40)} ${n(eyeY - headH * 0.42)} ${n(cx - headRX * 0.74)} ${n(eyeY - headH * 0.20)} Q ${n(cx - headRX * 0.94)} ${n(eyeY - headH * 0.26)} ${n(cx - headRX * 1.06)} ${n(eyeY - headH * 0.10)} Z"`,
        long: `<path d="M ${n(cx - headRX * 1.08)} ${n(eyeY - headH * 0.06)} Q ${n(cx - headRX * 1.14)} ${n(headTop - h * 0.014)} ${n(cx)} ${n(headTop - h * 0.016)} Q ${n(cx + headRX * 1.14)} ${n(headTop - h * 0.014)} ${n(cx + headRX * 1.08)} ${n(eyeY - headH * 0.06)} Q ${n(cx + headRX * 0.90)} ${n(eyeY - headH * 0.34)} ${n(cx + headRX * 0.46)} ${n(eyeY - headH * 0.16)} Q ${n(cx + headRX * 0.30)} ${n(eyeY - headH * 0.44)} ${n(cx - headRX * 0.02)} ${n(eyeY - headH * 0.22)} Q ${n(cx - headRX * 0.36)} ${n(eyeY - headH * 0.46)} ${n(cx - headRX * 0.72)} ${n(eyeY - headH * 0.18)} Q ${n(cx - headRX * 0.96)} ${n(eyeY - headH * 0.28)} ${n(cx - headRX * 1.08)} ${n(eyeY - headH * 0.06)} Z"`,
        ponytail: `<path d="M ${n(cx - headRX * 1.06)} ${n(eyeY - headH * 0.12)} Q ${n(cx - headRX * 1.12)} ${n(headTop - h * 0.012)} ${n(cx)} ${n(headTop - h * 0.014)} Q ${n(cx + headRX * 1.12)} ${n(headTop - h * 0.012)} ${n(cx + headRX * 1.06)} ${n(eyeY - headH * 0.12)} Q ${n(cx + headRX * 1.00)} ${n(eyeY - headH * 0.14)} ${n(cx + headRX * 0.80)} ${n(eyeY - headH * 0.26)} Q ${n(cx + headRX * 0.40)} ${n(eyeY - headH * 0.10)} ${n(cx)} ${n(eyeY - headH * 0.26)} Q ${n(cx - headRX * 0.40)} ${n(eyeY - headH * 0.10)} ${n(cx - headRX * 0.80)} ${n(eyeY - headH * 0.26)} Q ${n(cx - headRX * 1.00)} ${n(eyeY - headH * 0.14)} ${n(cx - headRX * 1.06)} ${n(eyeY - headH * 0.12)} Z"`,
        male: `<path d="M ${n(cx - headRX * 1.02)} ${n(eyeY - headH * 0.18)} Q ${n(cx - headRX * 1.10)} ${n(headTop - h * 0.010)} ${n(cx)} ${n(headTop - h * 0.012)} Q ${n(cx + headRX * 1.10)} ${n(headTop - h * 0.010)} ${n(cx + headRX * 1.02)} ${n(eyeY - headH * 0.18)} L ${n(cx + headRX * 0.72)} ${n(eyeY - headH * 0.30)} L ${n(cx + headRX * 0.48)} ${n(eyeY - headH * 0.14)} L ${n(cx + headRX * 0.20)} ${n(eyeY - headH * 0.34)} L ${n(cx - headRX * 0.10)} ${n(eyeY - headH * 0.16)} L ${n(cx - headRX * 0.44)} ${n(eyeY - headH * 0.34)} L ${n(cx - headRX * 0.74)} ${n(eyeY - headH * 0.16)} Z"`,
        bun: `<path d="M ${n(cx - headRX * 1.04)} ${n(eyeY - headH * 0.14)} Q ${n(cx - headRX * 1.10)} ${n(headTop - h * 0.010)} ${n(cx)} ${n(headTop - h * 0.012)} Q ${n(cx + headRX * 1.10)} ${n(headTop - h * 0.010)} ${n(cx + headRX * 1.04)} ${n(eyeY - headH * 0.14)} Q ${n(cx + headRX * 0.70)} ${n(eyeY - headH * 0.40)} ${n(cx + headRX * 0.24)} ${n(eyeY - headH * 0.22)} Q ${n(cx - headRX * 0.24)} ${n(eyeY - headH * 0.44)} ${n(cx - headRX * 0.70)} ${n(eyeY - headH * 0.22)} Q ${n(cx - headRX * 0.94)} ${n(eyeY - headH * 0.30)} ${n(cx - headRX * 1.04)} ${n(eyeY - headH * 0.14)} Z"`,
    }[s.hairStyle];
    L.push(`<path d="${bangs}" fill="url(#${uid}_hair)" stroke="${hairDark}" stroke-width="${n(stroke)}"/>`);
    // 侧发
    L.push(`<path d="M ${n(cx - headRX * 1.04)} ${n(eyeY - headH * 0.16)} Q ${n(cx - headRX * 1.20)} ${n(eyeY + headH * 0.30)} ${n(cx - headRX * 0.96)} ${n(chinY + h * 0.030)} Q ${n(cx - headRX * 0.80)} ${n(eyeY + headH * 0.34)} ${n(cx - headRX * 0.82)} ${n(eyeY - headH * 0.06)} Z" fill="url(#${uid}_hair)" stroke="${hairDark}" stroke-width="${n(stroke)}"/>`);
    L.push(`<path d="M ${n(cx + headRX * 1.04)} ${n(eyeY - headH * 0.16)} Q ${n(cx + headRX * 1.20)} ${n(eyeY + headH * 0.30)} ${n(cx + headRX * 0.96)} ${n(chinY + h * 0.030)} Q ${n(cx + headRX * 0.80)} ${n(eyeY + headH * 0.34)} ${n(cx + headRX * 0.82)} ${n(eyeY - headH * 0.06)} Z" fill="url(#${uid}_hair)" stroke="${hairDark}" stroke-width="${n(stroke)}"/>`);
    // 高光
    L.push(`<path d="M ${n(cx - headRX * 0.78)} ${n(headTop + headH * 0.10)} Q ${n(cx - headRX * 0.30)} ${n(headTop + headH * 0.02)} ${n(cx + headRX * 0.30)} ${n(headTop + headH * 0.10)}" fill="none" stroke="${hairLight}" stroke-width="${n(h * 0.010)}" stroke-linecap="round" opacity="0.5"/>`);

    // ── 配饰
    if (s.accessory === 'clip') {
        L.push(`<g transform="translate(${n(cx - headRX * 0.92)},${n(headTop + headH * 0.24)}) rotate(-16)">
<path d="M ${n(-w * 0.036)} ${n(-h * 0.010)} L 0 ${n(-h * 0.020)} L ${n(w * 0.036)} ${n(-h * 0.010)} L 0 ${n(h * 0.012)} Z" fill="#e4614f" stroke="#a63f33" stroke-width="${n(stroke)}"/>
<circle cx="0" cy="${n(-h * 0.004)}" r="${n(w * 0.008)}" fill="#ffd9a0"/></g>`);
    }
    if (s.accessory === 'badge') {
        L.push(`<circle cx="${n(cx - sw * 0.62)}" cy="${n(shoulderY + h * 0.052)}" r="${n(w * 0.021)}" fill="#e8c268" stroke="#a8842f" stroke-width="${n(stroke)}"/>
<circle cx="${n(cx - sw * 0.62)}" cy="${n(shoulderY + h * 0.052)}" r="${n(w * 0.010)}" fill="#fff3cf" opacity="0.8"/>`);
    }
    if (s.accessory === 'glasses') {
        const gx = eyeDX;
        const gy = eyeY - h * 0.004;
        L.push(`<g fill="none" stroke="#6d6a63" stroke-width="${n(stroke * 1.4)}">
<rect x="${n(cx - gx - eyeW * 0.66)}" y="${n(gy - eyeH * 1.30)}" width="${n(eyeW * 1.32)}" height="${n(eyeH * 1.80)}" rx="${n(eyeH * 0.45)}"/>
<rect x="${n(cx + gx - eyeW * 0.66)}" y="${n(gy - eyeH * 1.30)}" width="${n(eyeW * 1.32)}" height="${n(eyeH * 1.80)}" rx="${n(eyeH * 0.45)}"/>
<path d="M ${n(cx - eyeW * 0.66)} ${n(gy - eyeH * 0.50)} L ${n(cx + eyeW * 0.66)} ${n(gy - eyeH * 0.50)}"/>
<path d="M ${n(cx - gx - eyeW * 0.66)} ${n(gy - eyeH * 0.55)} L ${n(cx - headRX * 1.10)} ${n(gy - eyeH * 0.35)}"/>
<path d="M ${n(cx + gx + eyeW * 0.66)} ${n(gy - eyeH * 0.55)} L ${n(cx + headRX * 1.10)} ${n(gy - eyeH * 0.35)}"/></g>`);
        L.push(`<rect x="${n(cx - gx - eyeW * 0.66)}" y="${n(gy - eyeH * 1.30)}" width="${n(eyeW * 1.32)}" height="${n(eyeH * 1.80)}" rx="${n(eyeH * 0.45)}" fill="#bcd8e8" opacity="0.18"/>
<rect x="${n(cx + gx - eyeW * 0.66)}" y="${n(gy - eyeH * 1.30)}" width="${n(eyeW * 1.32)}" height="${n(eyeH * 1.80)}" rx="${n(eyeH * 0.45)}" fill="#bcd8e8" opacity="0.18"/>`);
    }
    if (s.accessory === 'book') {
        L.push(`<g transform="translate(${n(cx + sw * 0.30)},${n(shoulderY + h * 0.085)}) rotate(-8)">
<rect x="${n(-w * 0.115)}" y="${n(-h * 0.045)}" width="${n(w * 0.230)}" height="${n(h * 0.090)}" rx="${n(h * 0.006)}" fill="#7a5a3c" stroke="#4c3722" stroke-width="${n(stroke)}"/>
<rect x="${n(-w * 0.108)}" y="${n(-h * 0.040)}" width="${n(w * 0.216)}" height="${n(h * 0.080)}" rx="${n(h * 0.004)}" fill="#efe3cd"/>
<path d="M 0 ${n(-h * 0.040)} L 0 ${n(h * 0.040)}" stroke="#c9b492" stroke-width="${n(stroke)}"/>
<path d="M ${n(-w * 0.088)} ${n(-h * 0.018)} L ${n(-w * 0.016)} ${n(-h * 0.018)} M ${n(-w * 0.088)} ${n(-h * 0.004)} L ${n(-w * 0.030)} ${n(-h * 0.004)}" stroke="#b9a17d" stroke-width="${n(stroke * 0.8)}" fill="none"/></g>`);
    }
    if (s.mole) {
        L.push(`<circle cx="${n(cx + headRX * 0.30)}" cy="${n(eyeY + headH * 0.17)}" r="${n(w * 0.0055)}" fill="${s.line}" opacity="0.8"/>`);
    }

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${L.join('')}</svg>`;
}

/** 从立绘里裁出对话框头像用的归一化矩形（正方形构图）。 */
export const AVATAR_RECT = { x: 0.267, y: 0.045, w: 0.467, h: 0.30 };
