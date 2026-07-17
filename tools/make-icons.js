// Generates the PWA icons. Run once with `npm run icons`; output is committed.
// Raw PNG encoder — Node's zlib does the only hard part.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [27, 42, 65];
const CAT = [252, 191, 73];
const DARK = [27, 42, 65];

let crcTable = null;
function crc32(buf) {
  if (!crcTable) {
    crcTable = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c;
    }
  }
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, rgb) {
  const stride = size * 3 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0; // filter: none
    rgb.copy(raw, y * stride + 1, y * size * 3, (y + 1) * size * 3);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // colour type: truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function makeIcon(size) {
  const rgb = Buffer.alloc(size * size * 3);
  const put = (x, y, c) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 3;
    rgb[i] = c[0]; rgb[i + 1] = c[1]; rgb[i + 2] = c[2];
  };
  const disc = (cx, cy, r, c) => {
    for (let y = Math.floor(cy - r); y <= cy + r; y++) {
      for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) put(x, y, c);
      }
    }
  };
  const tri = (ax, ay, bx, by, cx2, cy2, c) => {
    const minX = Math.min(ax, bx, cx2), maxX = Math.max(ax, bx, cx2);
    const minY = Math.min(ay, by, cy2), maxY = Math.max(ay, by, cy2);
    const sign = (x1, y1, x2, y2, x3, y3) => (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
    for (let y = Math.floor(minY); y <= maxY; y++) {
      for (let x = Math.floor(minX); x <= maxX; x++) {
        const d1 = sign(x, y, ax, ay, bx, by);
        const d2 = sign(x, y, bx, by, cx2, cy2);
        const d3 = sign(x, y, cx2, cy2, ax, ay);
        const neg = d1 < 0 || d2 < 0 || d3 < 0;
        const pos = d1 > 0 || d2 > 0 || d3 > 0;
        if (!(neg && pos)) put(x, y, c);
      }
    }
  };

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) put(x, y, BG);

  // Maskable safe zone: keep art inside the middle 80%.
  const cx = size / 2, cy = size * 0.55, r = size * 0.22;
  tri(cx - r * 0.95, cy - r * 0.45, cx - r * 0.35, cy - r * 1.5, cx - r * 0.1, cy - r * 0.6, CAT);
  tri(cx + r * 0.95, cy - r * 0.45, cx + r * 0.35, cy - r * 1.5, cx + r * 0.1, cy - r * 0.6, CAT);
  disc(cx, cy, r, CAT);
  disc(cx - r * 0.35, cy - r * 0.12, r * 0.1, DARK);
  disc(cx + r * 0.35, cy - r * 0.12, r * 0.1, DARK);
  disc(cx, cy + r * 0.22, r * 0.09, DARK);

  return encodePng(size, rgb);
}

mkdirSync('icons', { recursive: true });
for (const size of [192, 512]) {
  writeFileSync(`icons/icon-${size}.png`, makeIcon(size));
  console.log(`wrote icons/icon-${size}.png`);
}
