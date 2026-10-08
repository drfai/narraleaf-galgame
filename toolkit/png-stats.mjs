/**
 * 极简 PNG 解码 + 统计。用来在没有眼睛的情况下检查渲染结果：
 * 尺寸、不透明覆盖率、包围盒、主色、是否整张空白。
 *
 *   node png-stats.mjs <png...>
 */
import fs from 'node:fs';
import zlib from 'node:zlib';

export function decodePng(file) {
    const buf = fs.readFileSync(file);
    if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('not a png');
    let pos = 8;
    let width = 0, height = 0, bitDepth = 0, colorType = 0;
    const idat = [];
    let palette = null, trns = null;
    while (pos < buf.length) {
        const len = buf.readUInt32BE(pos);
        const type = buf.toString('ascii', pos + 4, pos + 8);
        const data = buf.subarray(pos + 8, pos + 8 + len);
        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            bitDepth = data[8];
            colorType = data[9];
        } else if (type === 'IDAT') idat.push(data);
        else if (type === 'PLTE') palette = Buffer.from(data);
        else if (type === 'tRNS') trns = Buffer.from(data);
        else if (type === 'IEND') break;
        pos += 12 + len;
    }
    if (bitDepth !== 8) throw new Error(`unsupported bit depth ${bitDepth}`);
    const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[colorType];
    if (!channels) throw new Error(`unsupported color type ${colorType}`);
    const raw = zlib.inflateSync(Buffer.concat(idat));
    const stride = width * channels;
    const out = Buffer.alloc(width * height * 4);
    let prev = Buffer.alloc(stride);
    let off = 0;
    for (let y = 0; y < height; y++) {
        const filter = raw[off++];
        const line = Buffer.from(raw.subarray(off, off + stride));
        off += stride;
        for (let x = 0; x < stride; x++) {
            const a = x >= channels ? line[x - channels] : 0;
            const b = prev[x];
            const c = x >= channels ? prev[x - channels] : 0;
            switch (filter) {
                case 0: break;
                case 1: line[x] = (line[x] + a) & 255; break;
                case 2: line[x] = (line[x] + b) & 255; break;
                case 3: line[x] = (line[x] + ((a + b) >> 1)) & 255; break;
                case 4: {
                    const p = a + b - c;
                    const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
                    line[x] = (line[x] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
                    break;
                }
                default: throw new Error('bad filter ' + filter);
            }
        }
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            if (colorType === 6) {
                out[i] = line[x * 4]; out[i + 1] = line[x * 4 + 1]; out[i + 2] = line[x * 4 + 2]; out[i + 3] = line[x * 4 + 3];
            } else if (colorType === 2) {
                out[i] = line[x * 3]; out[i + 1] = line[x * 3 + 1]; out[i + 2] = line[x * 3 + 2]; out[i + 3] = 255;
            } else if (colorType === 0) {
                out[i] = out[i + 1] = out[i + 2] = line[x]; out[i + 3] = 255;
            } else if (colorType === 4) {
                out[i] = out[i + 1] = out[i + 2] = line[x * 2]; out[i + 3] = line[x * 2 + 1];
            } else if (colorType === 3) {
                const p = line[x] * 3;
                out[i] = palette[p]; out[i + 1] = palette[p + 1]; out[i + 2] = palette[p + 2];
                out[i + 3] = trns && line[x] < trns.length ? trns[line[x]] : 255;
            }
        }
        prev = line;
    }
    return { width, height, channels, pixels: out };
}

export function stats(img) {
    const { width, height, pixels } = img;
    let opaque = 0, transparent = 0;
    let minX = width, minY = height, maxX = -1, maxY = -1;
    const colors = new Map();
    let sumR = 0, sumG = 0, sumB = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;
            const a = pixels[i + 3];
            if (a < 16) { transparent++; continue; }
            opaque++;
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            sumR += pixels[i]; sumG += pixels[i + 1]; sumB += pixels[i + 2];
            const key = `${pixels[i] >> 4},${pixels[i + 1] >> 4},${pixels[i + 2] >> 4}`;
            colors.set(key, (colors.get(key) ?? 0) + 1);
        }
    }
    const top = [...colors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([k, n]) => `rgb(${k.split(',').map((v) => v * 16 + 8).join(',')}) ${(n / Math.max(1, opaque) * 100).toFixed(0)}%`);
    return {
        size: `${width}x${height}`,
        opaqueRatio: +(opaque / (width * height)).toFixed(3),
        bbox: maxX < 0 ? null : [minX, minY, maxX, maxY],
        distinctColors: colors.size,
        meanColor: opaque ? [sumR / opaque, sumG / opaque, sumB / opaque].map((v) => Math.round(v)) : null,
        topColors: top,
    };
}

if (process.argv[1] && process.argv[1].endsWith('png-stats.mjs')) {
    for (const file of process.argv.slice(2)) {
        try {
            console.log(file.replace(/^.*[\\/]/, ''), JSON.stringify(stats(decodePng(file))));
        } catch (error) {
            console.log(file, 'ERROR', error.message);
        }
    }
}
