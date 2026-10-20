// Gera os ícones PNG do PWA sem dependências externas (apenas Node).
// Uso: npm run icons
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons');
mkdirSync(outDir, { recursive: true });

const GREEN = [27, 138, 75];
const WHITE = [255, 255, 255];

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // profundidade
  header[9] = 6; // RGBA
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Distância assinada simples (em unidades de 0..100) para cada forma da cesta.
function inRoundedRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/** Retorna 'white' | 'green' | null para um ponto em coordenadas 0..100 (cesta centralizada). */
function basketPixel(x, y) {
  // alças
  if (distToSegment(x, y, 36, 44, 44, 26) <= 3.2) return 'white';
  if (distToSegment(x, y, 64, 44, 56, 26) <= 3.2) return 'white';
  // corpo (trapézio arredondado)
  const top = 42;
  const bottom = 74;
  if (y >= top && y <= bottom) {
    const t = (y - top) / (bottom - top);
    const half = 28 - 4 * t;
    if (Math.abs(x - 50) <= half && inRoundedRect(x, y, 50 - half, top, 50 + half, bottom, 4)) {
      for (const sx of [41, 50, 59]) {
        if (distToSegment(x, y, sx, 52, sx, 65) <= 2.2) return 'green';
      }
      return 'white';
    }
  }
  return null;
}

function render(size, { maskable }) {
  const rgba = Buffer.alloc(size * size * 4);
  const samples = 3;
  // Em ícones maskable o desenho ocupa a "zona segura" (~66% central).
  const scale = maskable ? 0.72 : 1;
  const radius = maskable ? 0 : 22; // cantos arredondados só no ícone normal

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const x = ((px + (sx + 0.5) / samples) / size) * 100;
          const y = ((py + (sy + 0.5) / samples) / size) * 100;
          const bg = maskable || inRoundedRect(x, y, 0, 0, 100, 100, radius);
          if (!bg) continue;
          const bx = (x - 50) / scale + 50;
          const by = (y - 50) / scale + 50;
          const hit = basketPixel(bx, by);
          const color = hit === 'white' ? WHITE : GREEN;
          r += color[0];
          g += color[1];
          b += color[2];
          a += 255;
        }
      }
      const count = samples * samples;
      const i = (py * size + px) * 4;
      const covered = a / 255;
      rgba[i] = covered ? Math.round(r / covered) : 0;
      rgba[i + 1] = covered ? Math.round(g / covered) : 0;
      rgba[i + 2] = covered ? Math.round(b / covered) : 0;
      rgba[i + 3] = Math.round(a / count);
    }
  }
  return encodePng(size, rgba);
}

const files = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, true],
];

for (const [name, size, maskable] of files) {
  writeFileSync(join(outDir, name), render(size, { maskable }));
  console.log(`Gerado public/icons/${name}`);
}
