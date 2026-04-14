export const navigatorHtml = `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;background:#000;display:flex;align-items:center;justify-content:center;overflow:hidden}
canvas{display:block;max-width:100%;max-height:100%;image-rendering:pixelated;image-rendering:crisp-edges}
#placeholder{position:absolute;color:#444;font-family:monospace;font-size:11px;text-align:center;padding:8px;pointer-events:none}
</style>
</head>
<body>
<canvas id="screen"></canvas>
<div id="placeholder">Tap the reload button
to fetch the screen</div>
<script>
var canvas = document.getElementById('screen');
var ctx = canvas.getContext('2d');
var placeholder = document.getElementById('placeholder');

/* Parameter lists for each drawing function ID (mirrors keysMap in index.js) */
var KEYS_MAP = {
  0:  ['fg'],
  1:  ['x','y','w','h','fg'],
  2:  ['x','y','w','h','fg'],
  3:  ['x','y','w','h','r','fg'],
  4:  ['x','y','w','h','r','fg'],
  5:  ['x','y','r','fg'],
  6:  ['x','y','r','fg'],
  7:  ['x','y','x2','y2','x3','y3','fg'],
  8:  ['x','y','x2','y2','x3','y3','fg'],
  9:  ['x','y','rx','ry','fg'],
  10: ['x','y','rx','ry','fg'],
  11: ['x','y','x1','y1','fg'],
  12: ['x','y','r','ir','startAngle','endAngle','fg','bg'],
  13: ['x','y','bx','by','wd','fg','bg'],
  14: ['x','y','size','fg','bg','txt'],
  15: ['x','y','size','fg','bg','txt'],
  16: ['x','y','size','fg','bg','txt'],
  17: ['x','y','size','fg','bg','txt'],
  18: ['x','y','center','ms','fs','file'],
  20: ['x','y','h','fg'],
  21: ['x','y','w','fg'],
  99: ['w','h','rotation']
};

function color565toCSS(c) {
  var r = Math.round((((c >> 11) & 0x1f) * 255) / 31);
  var g = Math.round((((c >>  5) & 0x3f) * 255) / 63);
  var b = Math.round(((c & 0x1f) * 255) / 31);
  return 'rgb('+r+','+g+','+b+')';
}

function roundRect(x, y, w, h, r, fill) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x+w, y,   x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x,   y+h, r);
  ctx.arcTo(x,   y+h, x,   y,   r);
  ctx.arcTo(x,   y,   x+w, y,   r);
  ctx.closePath();
  if (fill) ctx.fill(); else ctx.stroke();
}

function renderTFT(data) {
  placeholder.style.display = 'none';

  /* Size canvas before drawing so early draw ops are not clipped or cleared wrongly. */
  var scan = 0;
  while (scan < data.length && scan + 2 < data.length) {
    if (data[scan] !== 0xAA) break;
    var esz = data[scan + 1];
    var efn = data[scan + 2];
    if (efn === 99 && esz >= 9 && scan + esz <= data.length) {
      var bb = scan + 3;
      var cw = (data[bb] << 8) | data[bb + 1];
      var ch = (data[bb + 2] << 8) | data[bb + 3];
      if (cw > 0 && ch > 0 && cw <= 4096 && ch <= 4096) {
        canvas.width = cw;
        canvas.height = ch;
      }
      break;
    }
    if (esz < 3 || scan + esz > data.length) break;
    scan += esz;
  }

  var startData = 0;
  var screenText = [];

  function getInt8()  { return data[startData++]; }
  function getInt16() {
    var v = (data[startData] << 8) | data[startData+1];
    startData += 2;
    return v;
  }
  function getString(len) {
    var bytes = data.slice(startData, startData + len);
    startData += len;
    return new TextDecoder().decode(bytes);
  }

  function parseEntry(fn, size) {
    var keys = KEYS_MAP[fn];
    if (!keys) return {};
    var r = {};
    var left = size - 3;  /* size includes: 1-byte size field + 1-byte fn + 1-byte header */
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      if (k === 'txt' || k === 'file') {
        r[k] = getString(left);
      } else if (k === 'rotation' || k === 'fs') {
        left -= 1;
        r[k] = getInt8();
        if (k === 'fs') r[k] = r[k] === 0 ? 'SD' : 'FS';
      } else {
        left -= 2;
        r[k] = getInt16();
      }
    }
    return r;
  }

  var offset = 0;
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  while (offset < data.length) {
    if (data[offset] !== 0xAA) { break; }
    startData = offset + 1;
    var size = getInt8();
    var fn   = getInt8();
    offset  += size;

    if (!KEYS_MAP[fn]) continue;
    var p = parseEntry(fn, size);

    ctx.lineWidth   = 1;
    ctx.fillStyle   = '#000';
    ctx.strokeStyle = '#000';

    if (fn === 99) {
      /* SCREEN_INFO — dimensions + rotation only (no fg in protocol; firmware falls through to FILLSCREEN next) */
      canvas.width  = p.w;
      canvas.height = p.h;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, p.w, p.h);
    } else if (fn === 0) {
      /* FILLSCREEN */
      ctx.fillStyle = color565toCSS(p.fg);
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else if (fn === 1) {
      ctx.strokeStyle = color565toCSS(p.fg);
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    } else if (fn === 2) {
      ctx.fillStyle = color565toCSS(p.fg);
      ctx.fillRect(p.x, p.y, p.w, p.h);
    } else if (fn === 3) {
      ctx.strokeStyle = color565toCSS(p.fg);
      roundRect(p.x, p.y, p.w, p.h, p.r, false);
    } else if (fn === 4) {
      ctx.fillStyle = color565toCSS(p.fg);
      roundRect(p.x, p.y, p.w, p.h, p.r, true);
    } else if (fn === 5) {
      ctx.strokeStyle = color565toCSS(p.fg);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.stroke();
    } else if (fn === 6) {
      ctx.fillStyle = color565toCSS(p.fg);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI*2); ctx.fill();
    } else if (fn === 7) {
      ctx.strokeStyle = color565toCSS(p.fg);
      ctx.beginPath();
      ctx.moveTo(p.x,p.y); ctx.lineTo(p.x2,p.y2); ctx.lineTo(p.x3,p.y3);
      ctx.closePath(); ctx.stroke();
    } else if (fn === 8) {
      ctx.fillStyle = color565toCSS(p.fg);
      ctx.beginPath();
      ctx.moveTo(p.x,p.y); ctx.lineTo(p.x2,p.y2); ctx.lineTo(p.x3,p.y3);
      ctx.closePath(); ctx.fill();
    } else if (fn === 9) {
      ctx.strokeStyle = color565toCSS(p.fg);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI*2);
      ctx.stroke();
    } else if (fn === 10) {
      ctx.fillStyle = color565toCSS(p.fg);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI*2);
      ctx.fill();
    } else if (fn === 11) {
      ctx.strokeStyle = color565toCSS(p.fg);
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.x1,p.y1); ctx.stroke();
    } else if (fn === 12) {
      /* DRAWARC */
      var arcW  = p.r - p.ir || 1;
      var arcR  = (p.r + p.ir) / 2;
      var arcSa = ((p.startAngle + 90) * Math.PI) / 180;
      var arcEa = ((p.endAngle   + 90) * Math.PI) / 180;
      ctx.strokeStyle = color565toCSS(p.fg);
      ctx.lineWidth   = arcW;
      ctx.beginPath(); ctx.arc(p.x, p.y, arcR, arcSa, arcEa); ctx.stroke();
    } else if (fn === 13) {
      /* DRAWWIDELINE */
      ctx.strokeStyle = color565toCSS(p.fg);
      ctx.lineWidth   = p.wd || 1;
      ctx.beginPath(); ctx.moveTo(p.x,p.y); ctx.lineTo(p.bx,p.by); ctx.stroke();
    } else if (fn >= 14 && fn <= 17) {
      /* DRAWCENTRESTRING / DRAWRIGHTSTRING / DRAWSTRING / PRINT */
      var bg  = (p.bg === p.fg) ? 0 : p.bg;
      var txt = (p.txt || '').replace(/\\n/g, '');
      screenText.push(txt);
      /* Approximate TFT character width for the monospace font */
      var fw   = p.size === 3 ? 13.5 : p.size === 2 ? 9 : 4.5;
      var xOff = fn === 15 ? txt.length * fw : fn === 14 ? (txt.length * fw) / 2 : 0;
      var th = Math.max(8, (p.size || 1) * 8);
      var tw = Math.max(fw, txt.length * fw);
      /* Background fill */
      ctx.fillStyle = color565toCSS(bg);
      ctx.fillRect(p.x - xOff, p.y, tw, th);
      /* Text — reset state each draw (canvas resize can reset the context on some WebViews) */
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle    = color565toCSS(p.fg);
      ctx.font         = th + 'px monospace';
      ctx.textBaseline = 'top';
      ctx.textAlign    = fn === 14 ? 'center' : fn === 15 ? 'right' : 'left';
      ctx.fillText(txt, p.x, p.y);
    } else if (fn === 18) {
      /* DRAWIMAGE — skip: cannot send auth Cookie from within the WebView */
    } else if (fn === 20) {
      ctx.fillStyle = color565toCSS(p.fg);
      ctx.fillRect(p.x, p.y, 1, p.h);
    } else if (fn === 21) {
      ctx.fillStyle = color565toCSS(p.fg);
      ctx.fillRect(p.x, p.y, p.w, 1);
    }
  }

  /* Detect WiFi-related screens and notify RN */
  var allText = screenText.join(' ').toLowerCase();
  var isWifi  = allText.indexOf('wifi') !== -1
             || allText.indexOf('evil portal') !== -1
             || allText.indexOf('deauth') !== -1
             || allText.indexOf('handshake') !== -1;
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'wifiWarning', value: isWifi }));
}

function base64ToUint8Array(b64) {
  var binary = atob(b64);
  var bytes   = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function handleMessage(ev) {
  try {
    renderTFT(base64ToUint8Array(ev.data));
  } catch(e) {
    console.error('renderTFT error:', e);
  }
}

/* React Native WebView fires 'message' on document (Android) */
document.addEventListener('message', handleMessage);
window.addEventListener('message',   handleMessage);
</script>
</body>
</html>
`;