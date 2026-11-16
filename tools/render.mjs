// Render một trang HTML ra PNG bằng Chrome headless qua DevTools Protocol.
// Khác với `chrome --screenshot`: chờ TẤT CẢ font (mọi subset, kể cả tiếng Việt) tải xong,
// và chờ window.__ready nếu trang có (cảnh three.js), rồi mới chụp.
//
// node tools/render.mjs <file.html> <out.png|out.pdf> [width] [height] [scale] [--transparent]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const only = (args.find(a => a.startsWith('--only=')) || '').slice(7);   // chỉ chụp 1 phần tử (nền trong suốt)
const pad = +((args.find(a => a.startsWith('--pad=')) || '--pad=40').slice(6));
const transparent = args.includes('--transparent') || !!only;
const waitMs = +((args.find(a => a.startsWith('--wait=')) || '--wait=0').slice(7)); // chờ thêm (vd. hiệu ứng)
const [inFile, outFile, w = '1920', h = '1080', s = '2'] = args.filter(a => !a.startsWith('--'));
const W = +w, H = +h, S = +s;
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9300 + Math.floor(Math.random() * 500);

const chrome = spawn(CHROME, [
  '--headless=new', '--hide-scrollbars', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${mkdtempSync(resolve(tmpdir(), 'chr-'))}`,
  '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist',
  `--window-size=${W},${H}`, 'about:blank',
], { stdio: 'ignore' });

const sleep = ms => new Promise(r => setTimeout(r, ms));
let targets;
for (let i = 0; i < 50; i++) {
  try { targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (targets.length) break; } catch {}
  await sleep(200);
}
const page = targets.find(t => t.type === 'page');
const ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map(); const events = [];
ws.addEventListener('message', ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } else events.push(m);
});
const send = (method, params = {}) => new Promise(r => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: S, mobile: false });
if (transparent) await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
await send('Page.navigate', { url: /^https?:/.test(inFile) ? inFile : pathToFileURL(resolve(inFile)).href });
for (let i = 0; i < 300 && !events.some(e => e.method === 'Page.loadEventFired'); i++) await sleep(100);

const check = await send('Runtime.evaluate', {
  awaitPromise: true, returnByValue: true,
  expression: `(async () => {
    await Promise.all([...document.fonts].map(f => f.load().catch(() => {})));
    await document.fonts.ready;
    for (let i = 0; i < 600 && ('__ready' in window) && !window.__ready; i++) await new Promise(r => setTimeout(r, 100));
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const fonts = [...document.fonts];
    return { fonts: fonts.length, failed: fonts.filter(f => f.status !== 'loaded').map(f => f.family + ' ' + f.weight + ' ' + f.unicodeRange.slice(0, 20)),
             ready: window.__ready ?? null, err: window.__err ?? null };
  })()`,
});
console.log(JSON.stringify(check.result?.result?.value ?? check));
if (waitMs) await sleep(waitMs);
let clip;
if (only) {
  const r = await send('Runtime.evaluate', { returnByValue: true, expression: `(() => {
    const el = document.querySelector(${JSON.stringify(only)});
    if (!el) return null;
    document.documentElement.style.background = 'transparent'; document.body.style.background = 'transparent';
    // ẩn mọi thứ, chỉ hiện phần tử cần chụp (và các phần tử con của nó)
    const st = document.createElement('style');
    st.textContent = 'body *{visibility:hidden!important} [data-only], [data-only] *{visibility:visible!important}';
    document.head.appendChild(st); el.setAttribute('data-only', '');
    const b = el.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height };
  })()` });
  const b = r.result.result.value;
  if (!b) { console.log('selector not found', only); process.exit(1); }
  clip = { x: Math.max(0, b.x - pad), y: Math.max(0, b.y - pad), scale: 1 };
  clip.width = Math.min(W, b.x + b.w + pad) - clip.x; clip.height = Math.min(H, b.y + b.h + pad) - clip.y;
  console.log('element', JSON.stringify(b), 'clip', JSON.stringify(clip));
  await new Promise(r => setTimeout(r, 300));
}
if (outFile.toLowerCase().endsWith('.pdf')) {
  // PDF vector 1 trang đúng khổ W×H px (96px = 1 inch): chữ giữ là chữ, hình khối giữ là vector
  const pdf = await send('Page.printToPDF', { printBackground: true, paperWidth: W / 96, paperHeight: H / 96,
    marginTop: 0, marginBottom: 0, marginLeft: 0, marginRight: 0, pageRanges: '1', scale: 1 });
  if (!pdf.result) { console.log(JSON.stringify(pdf)); process.exit(1); }
  writeFileSync(outFile, Buffer.from(pdf.result.data, 'base64'));
} else {
  const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false, ...(clip ? { clip } : {}) });
  writeFileSync(outFile, Buffer.from(shot.result.data, 'base64'));
}
console.log('saved', outFile);
ws.close(); chrome.kill();
process.exit(0);
