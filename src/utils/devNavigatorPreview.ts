/**
 * Synthetic TFT log stream for dev bypass — matches the WebView `renderTFT` parser
 * in NavigatorScreen (0xAA packets, fn 99 / 0 / 2 / 14 / 16, RGB565 big-endian).
 * D-pad commands update a fake menu highlight so Navigator feels interactive offline.
 */

const W = 260;
const H = 200;

/** RGB565 */
const C_BG = 0x1082;
const C_BAR = 0x07e0;
const C_BAR_TEXT = 0x0000;
const C_HILITE = 0x2d4a;
const C_TEXT = 0xffff;
const C_DIM = 0xc618;
const C_BORDER = 0x4208;

const MENU_ITEMS = ['File Manager', 'WiFi', 'IR', 'Sub-GHz', 'Settings'];

let menuIndex = 0;

function clampWrap(i: number): number {
  const n = MENU_ITEMS.length;
  return ((i % n) + n) % n;
}

/** Apply `nav …` side effects for the dev Navigator preview (no device). */
export function applyDevNavigatorNavCommand(command: string): void {
  const raw = command.trim().toLowerCase();
  const m = raw.match(/^nav\s+(\w+)(?:\s+(\d+))?$/);
  if (!m) {
    return;
  }
  const dir = m[1];
  switch (dir) {
    case 'up':
    case 'prev':
      menuIndex = clampWrap(menuIndex - 1);
      break;
    case 'down':
    case 'next':
      menuIndex = clampWrap(menuIndex + 1);
      break;
    case 'nextpage':
      menuIndex = clampWrap(menuIndex + 3);
      break;
    case 'prevpage':
      menuIndex = clampWrap(menuIndex - 3);
      break;
    case 'sel':
    case 'esc':
    default:
      break;
  }
}

export function resetDevNavigatorPreview(): void {
  menuIndex = 0;
}

function u16(n: number): [number, number] {
  return [(n >> 8) & 0xff, n & 0xff];
}

/** Single TFT packet: 0xAA, totalLen, fn, body... */
function pack(fn: number, body: number[]): Uint8Array {
  const total = 3 + body.length;
  if (total > 255) {
    throw new Error(`devNavigatorPreview: packet length ${total} > 255`);
  }
  const buf = new Uint8Array(total);
  buf[0] = 0xaa;
  buf[1] = total;
  buf[2] = fn;
  for (let i = 0; i < body.length; i++) {
    buf[3 + i] = body[i];
  }
  return buf;
}

function packFillRect(x: number, y: number, rw: number, rh: number, fg565: number): Uint8Array {
  const [xh, xl] = u16(x);
  const [yh, yl] = u16(y);
  const [wh, wl] = u16(rw);
  const [hh, hl] = u16(rh);
  const [fh, fl] = u16(fg565);
  return pack(2, [xh, xl, yh, yl, wh, wl, hh, hl, fh, fl]);
}

/** fn 14 centre / fn 16 left string */
/** Dev preview strings are ASCII-only (matches TFT / WebView TextDecoder). */
function asciiBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c > 127) {
      throw new Error('devNavigatorPreview: non-ASCII character');
    }
    out[i] = c;
  }
  return out;
}

const B64 =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    const bitmap = (a << 16) | (b << 8) | c;
    out += B64.charAt((bitmap >> 18) & 63);
    out += B64.charAt((bitmap >> 12) & 63);
    out += i + 1 < bytes.length ? B64.charAt((bitmap >> 6) & 63) : '=';
    out += i + 2 < bytes.length ? B64.charAt(bitmap & 63) : '=';
  }
  return out;
}

function packString(
  fn: 14 | 16,
  x: number,
  y: number,
  fontSize: number,
  fg565: number,
  bg565: number,
  text: string,
): Uint8Array {
  const utf8 = asciiBytes(text);
  const bodyLen = 10 + utf8.length;
  const total = 3 + bodyLen;
  if (total > 255) {
    throw new Error('devNavigatorPreview: string packet too long');
  }
  const buf = new Uint8Array(total);
  buf[0] = 0xaa;
  buf[1] = total;
  buf[2] = fn;
  let o = 3;
  for (const n of [x, y, fontSize, fg565, bg565]) {
    const [hi, lo] = u16(n);
    buf[o++] = hi;
    buf[o++] = lo;
  }
  buf.set(utf8, o);
  return buf;
}

function concat(...chunks: Uint8Array[]): Uint8Array {
  const n = chunks.reduce((s, c) => s + c.length, 0);
  const out = new Uint8Array(n);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

/** Full synthetic screen for current `menuIndex`. */
export function buildDevNavigatorTftBinary(): Uint8Array {
  const [wh, wl] = u16(W);
  const [hh, hl] = u16(H);

  const parts: Uint8Array[] = [];

  // SCREEN_INFO
  parts.push(pack(99, [wh, wl, hh, hl, 1]));
  // FILLSCREEN
  parts.push(pack(0, u16(C_BG)));

  // Top bar
  parts.push(packFillRect(0, 0, W, 34, C_BAR));
  parts.push(packString(14, Math.floor(W / 2), 8, 2, C_BAR_TEXT, C_BAR, 'Navigator (dev preview)'));

  // Subtitle
  parts.push(packString(16, 12, 42, 2, C_DIM, C_BG, 'BruceLink offline UI mock'));

  // Divider line
  parts.push(packFillRect(10, 62, W - 20, 1, C_BORDER));

  const rowY0 = 72;
  const rowH = 22;

  MENU_ITEMS.forEach((label, i) => {
    const y = rowY0 + i * rowH;
    const selected = i === menuIndex;
    const fg = selected ? C_TEXT : C_DIM;
    const bg = selected ? C_HILITE : C_BG;
    if (selected) {
      parts.push(packFillRect(6, y - 2, W - 12, rowH, C_HILITE));
    }
    const prefix = selected ? '> ' : '  ';
    parts.push(packString(16, 14, y, 2, fg, bg, `${prefix}${label}`));
  });

  // Footer hint
  parts.push(
    packString(16, 10, H - 18, 1, C_DIM, C_BG, 'D-pad moves highlight (no device)'),
  );

  return concat(...parts);
}

export function getDevNavigatorPreviewBase64(): string {
  return bytesToBase64(buildDevNavigatorTftBinary());
}
