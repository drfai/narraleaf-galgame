#!/usr/bin/env node
// galgame BGM synth: pure Node (no deps). Writes 9 seamless-looping WAVs, PCM16 mono 22050Hz.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SR = 22050;
const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, 'out');

/* ---------------- pitch tables ---------------- */
const PC = { C:0,'C#':1,D:2,'D#':3,E:4,F:5,'F#':6,G:7,'G#':8,A:9,'A#':10,B:11 };
const MODES = {
  major:[0,2,4,5,7,9,11], minor:[0,2,3,5,7,8,10],
  lydian:[0,2,4,6,7,9,11], wholetone:[0,2,4,6,8,10],
};
const QUAL = {
  maj:[0,4,7], min:[0,3,7], dim:[0,3,6], aug:[0,4,8], sus2:[0,2,7], sus4:[0,5,7],
  maj7:[0,4,7,11], min7:[0,3,7,10], dom7:[0,4,7,10],
};
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const midi = (pc, oct) => 12 * (oct + 1) + pc;

/* ---------------- oscillators / envelopes ---------------- */
function wave(kind, ph){
  const x = ph - Math.floor(ph);
  if (kind === 'sine') return Math.sin(2 * Math.PI * x);
  if (kind === 'triangle') return 4 * Math.abs(x - 0.5) - 1;
  return 2 * x - 1;                                    // saw
}
function gain(t, dur, o){
  if (t < 0) return 0;
  const atk = o.atk ?? 0.006, rel = o.rel ?? 0.4;
  let g = o.decay ? Math.exp(-t * o.decay) : 1;        // piano/pluck = exp decay
  if (atk > 0 && t < atk) g *= t / atk;
  if (t > dur) g *= Math.max(0, 1 - (t - dur) / rel);  // note-off release
  return g;
}
function note(buf, start, dur, freq, o = {}){
  const i0 = Math.max(0, Math.floor(start * SR));
  const i1 = Math.min(buf.length, Math.ceil((start + dur + (o.rel ?? 0.4)) * SR));
  const amp = o.amp ?? 0.2, nh = o.nh ?? 0, kind = o.wave ?? 'sine';
  let ph = 0; const dp = freq / SR;
  for (let i = i0; i < i1; i++){
    const g = gain(i / SR - start, dur, o);
    if (g <= 0) continue;
    let s = wave(kind, ph);
    if (nh) s += nh * Math.sin(4 * Math.PI * ph);      // 2nd harmonic
    buf[i] += amp * g * s;
    ph += dp; if (ph >= 1) ph -= 1;
  }
}

/* ---------------- simple feedback reverb (4 combs, ~25% wet) ---------------- */
function reverb(buf, wetAmt = 0.25){
  const dts = [0.0297, 0.0371, 0.0431, 0.0527], fbs = [0.78, 0.74, 0.71, 0.68];
  const wet = new Float32Array(buf.length);
  for (let k = 0; k < dts.length; k++){
    const d = Math.round(dts[k] * SR), F = fbs[k], line = new Float32Array(d);
    let idx = 0, lp = 0;
    for (let i = 0; i < buf.length; i++){
      const x = line[idx];
      lp = lp * 0.6 + x * 0.4;                         // damping
      line[idx] = buf[i] + lp * F;
      wet[i] += x * 0.5;
      if (++idx >= d) idx = 0;
    }
  }
  for (let i = 0; i < buf.length; i++) buf[i] = buf[i] * (1 - wetAmt) + wet[i] * wetAmt;
}

/* ---------------- looping: pick whole 4-bar loops inside 32..40s ---------------- */
const TARGET = 36, MIN = 32, MAX = 40;
function fitLoop(bpm){
  const d0 = 960 / bpm;                                // seconds per 4-bar loop
  for (let k = 1; k <= 6; k++){
    const dur = d0 * k;
    if (dur >= MIN && dur <= MAX) return { bpm, loops: k, dur };
  }
  let best = null;
  for (let k = 1; k <= 6; k++){
    const b = 960 * k / TARGET, dev = Math.abs(Math.log2(b / bpm));
    if (!best || dev < best.dev) best = { dev, bpm: b, loops: k, dur: TARGET };
  }
  return best;
}

/* ---------------- bass patterns: [beatOffset, durBeats, toneIdx(0=root,1=5th,2=8ve)] ---- */
const BASS = {
  whole: [[0, 3.6, 0]],
  half:  [[0, 1.7, 0], [2, 1.7, 0]],
  root5: [[0, 0.9, 0], [1.5, 0.4, 1], [2, 0.9, 0], [3, 0.4, 2]],
  pulse: Array.from({ length: 8 }, (_, i) => [i * 0.5, 0.42, i % 4 === 3 ? 1 : 0]),
  drone: [[0, 3.8, 0]],
};

/* ---------------- one song -> Float32Array (length = loop length, seam-crossfaded) ---- */
const XFADE = 1.2, TAIL = 3.0;
function renderSong(s){
  const mode = MODES[s.mode ?? 'major'], key = PC[s.key];
  const fit = fitLoop(s.bpm);
  const beat = 60 / fit.bpm, bar = 4 * beat, L = fit.dur, nBars = 4 * fit.loops;
  // render 1 extra bar past the loop point so the crossfade carries real continuation audio
  const buf = new Float32Array(Math.ceil((L + bar + TAIL) * SR));
  let step = 0;
  for (let b = 0; b <= nBars; b++){
    const t0 = b * bar;
    const [deg, q] = s.prog[b % 4];
    const root = key + mode[deg % mode.length] + 12 * Math.floor(deg / mode.length);
    const iv = QUAL[q];
    const p = s.pad;
    for (const off of iv){
      note(buf, t0, bar * 0.98, mtof(midi(root + off, p.oct)),
        { wave: p.wave, amp: p.amp, atk: p.atk, rel: p.rel, nh: p.nh });
      if (p.oct2 != null)
        note(buf, t0, bar * 0.98, mtof(midi(root + off, p.oct2)),
          { wave: p.wave, amp: p.amp * (p.amp2 ?? 0.4), atk: p.atk + 0.3, rel: p.rel });
    }
    if (p.cluster)                                       // minor-2nd tension tone
      note(buf, t0, bar * 0.98, mtof(midi(root + p.cluster, p.oct)),
        { wave: p.wave, amp: p.amp * 0.35, atk: p.atk, rel: p.rel });

    const bs = s.bass, tones = [root, root + 7, root + 12];
    for (const [bo, dbt, ti] of BASS[bs.pat ?? 'whole'])
      note(buf, t0 + bo * beat, dbt * beat, mtof(midi(tones[ti], bs.oct)),
        { wave: bs.wave ?? 'sine', amp: bs.amp, decay: bs.decay, atk: bs.atk ?? 0.01,
          rel: bs.rel ?? 0.15, nh: bs.nh ?? 0.12 });

    const ld = s.lead;
    if (ld?.arp){
      const steps = Math.round(4 / ld.arp.rate);
      for (let i = 0; i < steps; i++, step++){
        const o = ld.arp.order[step % ld.arp.order.length];
        if (o < 0) continue;                             // rest
        const j = o % iv.length, shift = 12 * Math.floor(o / iv.length);
        note(buf, t0 + i * ld.arp.rate * beat, ld.arp.rate * beat * 0.95,
          mtof(midi(root + iv[j] + shift, ld.oct)),
          { wave: ld.wave, amp: ld.amp, decay: ld.decay, rel: ld.rel ?? 0.5,
            atk: ld.atk ?? 0.005, nh: ld.nh ?? 0.25 });
      }
    }
    if (ld?.notes){
      for (const [bo, dbt, semi] of ld.notes)
        note(buf, t0 + bo * beat, dbt * beat, mtof(midi(key + semi, ld.oct)),
          { wave: ld.wave, amp: ld.amp, decay: ld.decay, rel: ld.rel ?? 0.6,
            atk: ld.atk ?? 0.01, nh: ld.nh ?? 0.25 });
    }
  }
  reverb(buf, s.wet ?? 0.25);
  // seam crossfade: last XFADE s (start of the next lap) blended into the first XFADE s
  const head = buf.slice(0, Math.round(L * SR));
  const nX = Math.round(XFADE * SR), nL = Math.round(L * SR);
  for (let i = 0; i < nX; i++){
    const t = i / nX;
    head[i] = head[i] * t + buf[nL + i] * (1 - t);
  }
  return head;
}

/* ---------------- songs ---------------- */
const SONGS = [
  { id: 'title', key: 'C', mode: 'major', bpm: 54,
    prog: [[0, 'maj7'], [5, 'min7'], [3, 'maj7'], [4, 'sus4']],
    pad:  { oct: 3, wave: 'triangle', amp: 0.14, atk: 0.9, rel: 1.4, nh: 0.22 },
    bass: { oct: 1, pat: 'whole', wave: 'sine', amp: 0.28, decay: 0.5 },
    lead: { oct: 5, wave: 'sine', amp: 0.17, nh: 0.3, decay: 1.1, rel: 0.6,
            arp: { rate: 1, order: [0, -1, 2, -1, 4, -1, 2, -1] } } },

  { id: 'daily', key: 'F', mode: 'major', bpm: 100,
    prog: [[0, 'maj'], [4, 'maj'], [5, 'min7'], [3, 'maj7']],
    pad:  { oct: 3, wave: 'triangle', amp: 0.11, atk: 0.25, rel: 0.5, nh: 0.2 },
    bass: { oct: 1, pat: 'half', wave: 'sine', amp: 0.26, decay: 0.7 },
    lead: { oct: 5, wave: 'triangle', amp: 0.14, nh: 0.2, decay: 1.0, rel: 0.4,
            arp: { rate: 0.5, order: [0, 2, 4, 2] } } },

  { id: 'bright', key: 'D', mode: 'major', bpm: 126,
    prog: [[0, 'maj'], [4, 'maj'], [5, 'min7'], [3, 'maj']],
    pad:  { oct: 3, wave: 'triangle', amp: 0.09, atk: 0.15, rel: 0.35, nh: 0.2 },
    bass: { oct: 1, pat: 'pulse', wave: 'sine', amp: 0.24, decay: 0.9, rel: 0.1 },
    lead: { oct: 5, wave: 'sine', amp: 0.15, nh: 0.35, decay: 2.2, rel: 0.35,
            arp: { rate: 0.5, order: [0, 1, 2, 1, 0, 2, 3, 2] } } },

  { id: 'romance', key: 'A', mode: 'major', bpm: 60,
    prog: [[0, 'maj7'], [5, 'min7'], [3, 'maj7'], [4, 'sus4']],
    pad:  { oct: 3, wave: 'triangle', amp: 0.15, atk: 1.0, rel: 1.3, nh: 0.18 },
    bass: { oct: 1, pat: 'whole', wave: 'sine', amp: 0.26, decay: 0.45 },
    lead: { oct: 4, wave: 'sine', amp: 0.19, nh: 0.3, decay: 1.2, rel: 0.8,
            notes: [[0,2,11],[2,2,9],[4,2,7],[6,2,4],[8,2,9],[10,2,7],[12,2,2],[14,2,11]] } },

  { id: 'sad', key: 'A', mode: 'minor', bpm: 52,
    prog: [[0, 'min'], [5, 'maj'], [3, 'min'], [4, 'maj']],
    pad:  { oct: 3, wave: 'triangle', amp: 0.14, atk: 1.4, rel: 1.8, nh: 0.15 },
    bass: { oct: 1, pat: 'whole', wave: 'sine', amp: 0.30, decay: 0.4 },
    lead: { oct: 3, wave: 'sine', amp: 0.18, nh: 0.28, decay: 0.9, rel: 0.9,
            notes: [[0,2.5,0],[2,1.5,3],[4,2.5,8],[6,1.5,0],[8,2.5,5],[10,1.5,2],[12,2.5,7],[14,1.5,11]] } },

  { id: 'tense', key: 'D', mode: 'minor', bpm: 108,
    prog: [[0, 'min'], [6, 'maj'], [1, 'dim'], [4, 'min']],
    pad:  { oct: 3, wave: 'saw', amp: 0.07, atk: 0.7, rel: 0.6, cluster: 1 },
    bass: { oct: 1, pat: 'drone', wave: 'sine', amp: 0.30, atk: 0.25, rel: 0.3, nh: 0.2 },
    lead: { oct: 4, wave: 'saw', amp: 0.085, decay: 7.0, rel: 0.12, nh: 0.3,
            arp: { rate: 0.5, order: [0, 0, 0, 0, 0, 0, 0, 0] } } },

  { id: 'mystery', key: 'C', mode: 'lydian', bpm: 58,
    prog: [[0, 'maj7'], [1, 'maj7'], [6, 'min7'], [4, 'sus2']],
    pad:  { oct: 3, wave: 'sine', amp: 0.13, atk: 2.4, rel: 2.6, nh: 0.12 },
    bass: { oct: 1, pat: 'drone', wave: 'sine', amp: 0.17, atk: 1.2, rel: 1.5 },
    lead: { oct: 6, wave: 'sine', amp: 0.10, nh: 0.1, decay: 0.8, rel: 1.2,
            arp: { rate: 2, order: [0, -1, 2, -1] } } },

  { id: 'festival', key: 'G', mode: 'major', bpm: 132,
    prog: [[0, 'maj'], [4, 'maj'], [5, 'min'], [3, 'maj']],
    pad:  { oct: 3, wave: 'triangle', amp: 0.10, atk: 0.12, rel: 0.3, nh: 0.22 },
    bass: { oct: 1, pat: 'root5', wave: 'sine', amp: 0.28, decay: 1.4, rel: 0.12 },
    lead: { oct: 6, wave: 'sine', amp: 0.11, nh: 0.4, decay: 3.2, rel: 0.5,
            arp: { rate: 0.5, order: [0, 1, 2, 1] } } },

  { id: 'ending', key: 'C', mode: 'major', bpm: 50,
    prog: [[0, 'maj7'], [3, 'maj7'], [4, 'maj'], [5, 'min7']],
    pad:  { oct: 3, oct2: 4, amp: 0.15, amp2: 0.4, wave: 'triangle', atk: 1.1, rel: 1.6, nh: 0.25 },
    bass: { oct: 1, pat: 'half', wave: 'sine', amp: 0.30, decay: 0.5 },
    lead: { oct: 5, wave: 'sine', amp: 0.16, nh: 0.32, decay: 1.6, rel: 0.7,
            arp: { rate: 1, order: [0, 1, 2, 3] } } },
];

/* ---------------- wav io ---------------- */
function writeWav(file, data){
  const n = data.length, b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8);
  b.write('fmt ', 12); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++){
    const v = Math.max(-1, Math.min(1, data[i]));
    b.writeInt16LE(Math.round(v * 32767), 44 + 2 * i);
  }
  fs.writeFileSync(file, b);
}
const db = v => (v > 0 ? 20 * Math.log10(v) : -Infinity);

function inspect(file){
  const b = fs.readFileSync(file);
  const sr = b.readUInt32LE(24), ch = b.readUInt16LE(22), bits = b.readUInt16LE(34);
  const n = (b.length - 44) / 2, seg = Math.round(sr * 0.5);
  let peak = 0, sum = 0, h = 0, t = 0, maxd = 0, prev = null;
  for (let i = 0; i < n; i++){
    const raw = b.readInt16LE(44 + 2 * i), v = raw / 32768, a = Math.abs(v);
    if (a > peak) peak = a;
    sum += v * v;
    if (i < seg) h += v * v;
    if (i >= n - seg) t += v * v;
    if (prev !== null) maxd = Math.max(maxd, Math.abs(raw - prev));
    prev = raw;
  }
  const rms = Math.sqrt(sum / n);
  const hr = Math.sqrt(h / Math.min(seg, n)), tr = Math.sqrt(t / Math.min(seg, n));
  const wrap = Math.abs(b.readInt16LE(44) - b.readInt16LE(44 + 2 * (n - 1)));
  return { file: path.basename(file), bytes: b.length, sec: n / sr, sr, ch, bits,
           peak, rms, ratio: tr > 0 ? hr / tr : Infinity, wrap, maxd };
}

/* ---------------- main ---------------- */
fs.mkdirSync(OUT, { recursive: true });
const rows = [];
for (const s of SONGS){
  const data = renderSong(s);
  let peak = 0;
  for (const v of data) peak = Math.max(peak, Math.abs(v));
  const g = peak > 0 ? 0.7079 / peak : 0;              // normalize to -3 dBFS
  for (let i = 0; i < data.length; i++) data[i] *= g;
  const file = path.join(OUT, `${s.id}.wav`);
  writeWav(file, data);
  rows.push(inspect(file));
}
console.log('file        bytes      sec     sr     ch  bits   peakdB   rmsdB  head/tail  seam/max');
for (const r of rows)
  console.log(
    r.file.padEnd(11),
    String(r.bytes).padStart(8),
    r.sec.toFixed(2).padStart(7),
    String(r.sr).padStart(6),
    String(r.ch).padStart(3),
    String(r.bits).padStart(4),
    db(r.peak).toFixed(2).padStart(8),
    db(r.rms).toFixed(2).padStart(7),
    r.ratio.toFixed(2).padStart(10),
    (r.wrap + '/' + r.maxd).padStart(11));
const bad = rows.filter(r => r.sr !== 22050 || r.ch !== 1 || r.bits !== 16 ||
  r.bytes > 2 * 1024 * 1024 || r.sec < 32 || r.sec > 40 || r.ratio >= 3 || r.peak > 0.71 ||
  r.wrap > r.maxd);
console.log(bad.length ? `FAIL: ${bad.map(r => r.file).join(', ')}` : 'OK: all 9 files pass spec checks');
