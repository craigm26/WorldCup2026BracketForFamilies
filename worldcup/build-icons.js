/* Generate the World Cup Hub app icons (soccer ball on the app's blue) with zero
   dependencies — just Node's zlib. Run once: `node build-icons.js`.
   Writes icons/{apple-touch-icon.png, icon-192.png, icon-512.png}. Supersamples 3x. */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ---- tiny PNG (RGBA) encoder ----
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b) { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0); const td = Buffer.concat([Buffer.from(type, 'ascii'), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td), 0); return Buffer.concat([len, td, crc]); }
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc(h * (w * 4 + 1));
  for (let y = 0; y < h; y++) { raw[y * (w * 4 + 1)] = 0; rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4); }
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ---- drawing helpers (unit space 0..1) ----
const NAVY = [0x16, 0x23, 0x5a];   // seams + pentagons (matches app ink)
const WHITE = [0xff, 0xff, 0xff];
const BLUE_T = [0x3a, 0x7b, 0xef];  // gradient top
const BLUE_B = [0x15, 0x32, 0x7f];  // gradient bottom

function inBg(x, y) { const r = 0.22; const dx = Math.max(r - x, x - (1 - r), 0), dy = Math.max(r - y, y - (1 - r), 0); return Math.hypot(dx, dy) <= r; }

// Regular pentagon (point-up) centred at (cx,cy), circumradius R, rotation rot.
function inPentagon(x, y, cx, cy, R, rot) {
  const dx = x - cx, dy = y - cy;
  let a = Math.atan2(dy, dx) - rot;
  const seg = (2 * Math.PI) / 5;
  a = ((a % seg) + seg) % seg;
  const apothem = R * Math.cos(Math.PI / 5);
  const rEdge = apothem / Math.cos(a - seg / 2);
  return Math.hypot(dx, dy) <= rEdge;
}
// Distance from point to segment (for seams).
function segDist(px, py, ax, ay, bx, by) {
  const vx = bx - ax, vy = by - ay, wx = px - ax, wy = py - ay;
  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / (vx * vx + vy * vy)));
  return Math.hypot(px - (ax + t * vx), py - (ay + t * vy));
}

function render(size) {
  const SS = 3, W = size * SS;
  const acc = new Float32Array(size * size * 4);
  const BC = [0.5, 0.5];            // ball centre
  const BR = 0.34;                  // ball radius
  const pent = { c: BC, R: 0.135, rot: -Math.PI / 2 };  // central pentagon, point up
  // 5 outer pentagon vertices (where seams point)
  const verts = [];
  for (let i = 0; i < 5; i++) { const a = pent.rot + i * (2 * Math.PI / 5); verts.push([BC[0] + pent.R * Math.cos(a), BC[1] + pent.R * Math.sin(a)]); }

  for (let yy = 0; yy < W; yy++) for (let xx = 0; xx < W; xx++) {
    const u = (xx + 0.5) / W, v = (yy + 0.5) / W;
    let col = null;
    if (inBg(u, v)) {
      const bg = BLUE_T.map((c, i) => Math.round(c + (BLUE_B[i] - c) * v));
      col = bg;
      const dBall = Math.hypot(u - BC[0], v - BC[1]);
      if (dBall <= BR) {
        col = WHITE;
        // central pentagon
        let black = inPentagon(u, v, BC[0], BC[1], pent.R * 0.62, pent.rot);
        // seams: from each central-pentagon vertex outward to the ball edge
        if (!black) for (let i = 0; i < 5; i++) {
          const a = pent.rot + i * (2 * Math.PI / 5);
          const ex = BC[0] + BR * Math.cos(a), ey = BC[1] + BR * Math.sin(a);
          if (segDist(u, v, verts[i][0], verts[i][1], ex, ey) <= 0.018) { black = true; break; }
        }
        // small partial pentagons at the ball edge (hint of the pattern)
        if (!black) for (let i = 0; i < 5; i++) {
          const a = pent.rot + (i + 0.5) * (2 * Math.PI / 5);
          const px = BC[0] + BR * 0.96 * Math.cos(a), py = BC[1] + BR * 0.96 * Math.sin(a);
          if (inPentagon(u, v, px, py, 0.052, a + Math.PI / 5)) { black = true; break; }
        }
        if (black) col = NAVY;
        // thin ring outline
        if (dBall > BR - 0.012) col = NAVY;
      }
    }
    const px = (Math.floor(yy / SS) * size + Math.floor(xx / SS)) * 4;
    if (col) { acc[px] += col[0]; acc[px + 1] += col[1]; acc[px + 2] += col[2]; acc[px + 3] += 255; }
  }
  const out = Buffer.alloc(size * size * 4); const n = SS * SS;
  for (let i = 0; i < size * size; i++) { out[i * 4] = Math.round(acc[i * 4] / n); out[i * 4 + 1] = Math.round(acc[i * 4 + 1] / n); out[i * 4 + 2] = Math.round(acc[i * 4 + 2] / n); out[i * 4 + 3] = Math.round(acc[i * 4 + 3] / n); }
  return encodePNG(size, size, out);
}

const dir = path.join(__dirname, 'icons');
fs.mkdirSync(dir, { recursive: true });
for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
  fs.writeFileSync(path.join(dir, name), render(size));
  console.log('   icons/' + name + ' (' + size + 'px)');
}
console.log('✓ World Cup icons generated.');
