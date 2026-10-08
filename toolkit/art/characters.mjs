/** 《星屑放课后》角色立绘：五名角色共用 lib/charbase.mjs 的画法，只换参数。 */
import { drawCharacter, POSES, AVATAR_RECT } from '../lib/charbase.mjs';

export { POSES, AVATAR_RECT };
export const CHARACTERS = ['haruka', 'mio', 'akari', 'tomo', 'hagiwara'];

const SPECS = {
    // 白石遥：亚麻色短发 + 侧边蝴蝶结发夹，蜜色皮肤，夏季水手服
    haruka: {
        key: 'haruka', hairStyle: 'short', outfit: 'sailor', accessory: 'clip', build: 0.30,
        skin: '#f4cda6', skinShade: '#dcae87', line: '#8a6244',
        hair: '#cfa95e', hairShade: '#9c7a35', hairLight: '#efd79a',
        eye: '#e0a028', eyeShade: '#9a5f14', eyeLight: '#ffd98a',
        cloth: '#f3f6f8', clothLight: '#ffffff', clothShade: '#b9bfc6',
        collar: '#f7fafc', ribbon: '#e8794a', shirt: '#ffffff', blushBase: 0.16,
        browColor: '#a8803a',
    },
    // 冬月澪：黑色长直发 + 紫色眼睛 + 左眼下泪痣，长袖校服
    mio: {
        key: 'mio', hairStyle: 'long', outfit: 'blazer', accessory: 'book', build: 0.29, mole: true,
        skin: '#fae6e2', skinShade: '#e3c4c2', line: '#7b5a63',
        hair: '#2c3048', hairShade: '#171a2b', hairLight: '#5d6489',
        eye: '#8f7ad6', eyeShade: '#5b47a0', eyeLight: '#c9bcf5',
        cloth: '#3a4a72', clothLight: '#4d5f8c', clothShade: '#222c46',
        collar: '#2c3a5e', ribbon: '#3f5fa8', shirt: '#f4f2f7', blushBase: 0.06,
        browColor: '#20233a',
    },
    // 神代灯里：深栗色低马尾 + 绿眼睛 + 会长徽章，制服笔挺
    akari: {
        key: 'akari', hairStyle: 'ponytail', outfit: 'blazer', accessory: 'badge', build: 0.29,
        skin: '#f8e3d4', skinShade: '#e0c1ad', line: '#7d5a49',
        hair: '#5f3b2f', hairShade: '#3d241c', hairLight: '#94614c',
        eye: '#3f7a52', eyeShade: '#255237', eyeLight: '#8fd0a3',
        cloth: '#4a3f5c', clothLight: '#5f5273', clothShade: '#2c2537',
        collar: '#3b3250', ribbon: '#2f4f8a', shirt: '#fbf8f4', blushBase: 0.10,
        browColor: '#4a2c22',
    },
    // 小暮智也：男生短发，白衬衫 + 松开领带
    tomo: {
        key: 'tomo', hairStyle: 'male', outfit: 'shirt', accessory: null, build: 0.33,
        skin: '#eec59b', skinShade: '#d3a67c', line: '#7b5533',
        hair: '#262a33', hairShade: '#14161d', hairLight: '#4d5464',
        eye: '#5d4a38', eyeShade: '#3a2d21', eyeLight: '#a3866a',
        cloth: '#eef1f4', clothLight: '#ffffff', clothShade: '#b4bac2',
        collar: '#e6eaee', ribbon: '#8c3f4a', shirt: '#ffffff', blushBase: 0.0,
        browColor: '#1c1f26',
    },
    // 萩原玲子：盘发 + 细框眼镜 + 米色开衫
    hagiwara: {
        key: 'hagiwara', hairStyle: 'bun', outfit: 'cardigan', accessory: 'glasses', build: 0.31,
        skin: '#f6ddc6', skinShade: '#dcbda3', line: '#7a5a44',
        hair: '#4d352a', hairShade: '#301f18', hairLight: '#7d5844',
        eye: '#6b5a48', eyeShade: '#463a2d', eyeLight: '#a89279',
        cloth: '#e0cfae', clothLight: '#f2e6cd', clothShade: '#b09a76',
        collar: '#d9c6a2', ribbon: '#a8535f', shirt: '#fbf8f3', blushBase: 0.04,
        browColor: '#3a261d',
    },
};

const table = {};
for (const c of CHARACTERS) {
    for (const p of POSES) table[`${c}_${p}`] = (w = 900, h = 1400) => drawCharacter(SPECS[c], p, w, h);
}

export default table;
