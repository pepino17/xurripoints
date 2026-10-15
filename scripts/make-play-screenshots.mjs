/* ================================================================
   Genera las CAPTURAS para la ficha de Google Play (1080×1920) usando el modo demo.
   Salida: assets/play/01-inicio.png … 06-pareja.png
   Uso: node scripts/make-play-screenshots.mjs   (necesita Chrome; CHROME_PATH si no está en su sitio)
   ================================================================ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(RAIZ, 'app');
const SALIDA = path.join(RAIZ, 'assets', 'play');
fs.mkdirSync(SALIDA, { recursive: true });

const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const apagado = [];

/* Servidor de ficheros */
const servidor = await new Promise(res => {
  const s = http.createServer((req, r) => {
    const rel = decodeURIComponent(req.url.split('?')[0]);
    const f = path.join(WEB, rel === '/' ? 'index.html' : rel);
    if (!f.startsWith(WEB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(''); }
    r.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(r);
  });
  s.listen(0, '127.0.0.1', () => res(s));
});
const puertoApp = servidor.address().port;

/* Chrome */
const puertoCdp = await new Promise(res => { const s = http.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const bin = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean).find(c => fs.existsSync(c));
if (!bin) { console.error('No encuentro Chrome. Pasa CHROME_PATH=...'); process.exit(1); }
const dirTmp = fs.mkdtempSync(path.join(os.tmpdir(), 'xp-play-'));
const chrome = spawn(bin, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars', '--no-first-run',
  `--user-data-dir=${dirTmp}`, `--remote-debugging-port=${puertoCdp}`, '--window-size=540,960', 'about:blank'], { stdio: 'ignore' });
apagado.push(() => { try { chrome.kill(); } catch (e) { } try { fs.rmSync(dirTmp, { recursive: true, force: true }); } catch (e) { } });
for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${puertoCdp}/json/version`)).ok) break; } catch (e) { } await sleep(250); }

/* Puente CDP */
const objetivos = await (await fetch(`http://127.0.0.1:${puertoCdp}/json/list`)).json();
const pagina = objetivos.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
const ws = new WebSocket(pagina.webSocketDebuggerUrl);
let seq = 0; const esperando = new Map();
ws.onmessage = ev => { const m = JSON.parse(ev.data); if (m.id && esperando.has(m.id)) { esperando.get(m.id)(m); esperando.delete(m.id); } };
await new Promise(r => { ws.onopen = r; });
const send = (m, p = {}) => new Promise(res => { const i = ++seq; esperando.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const js = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true })).result?.result?.value;
const foto = async nombre => {
  const r = await send('Page.captureScreenshot', { format: 'png' });   // solo lo que se ve (1080×1920 con escala 2)
  fs.writeFileSync(path.join(SALIDA, nombre), Buffer.from(r.result.data, 'base64'));
  console.log('  ✔', nombre);
};
const clic = (re, sel = 'button') => js(`(() => { const b = [...document.querySelectorAll('${sel}')].find(x => ${re}.test(x.textContent.replace(/\\s+/g,' ').trim())); if (!b) return 'NO'; b.click(); return 'ok'; })()`);
const cerrar = async () => { for (let i = 0; i < 4; i++) { const r = await js(`(() => { const b = [...document.querySelectorAll('button')].find(x => /^(saltar|entendido|ahora no|vale)$/i.test(x.textContent.replace(/\\s+/g,' ').trim())); if (b) { b.click(); return 1; } const s = document.querySelector('#sheet-root .scrim, #dialog-root .scrim'); if (s) { s.click(); return 1; } return 0; })()`); if (!r) break; await sleep(350); } };

await send('Runtime.enable'); await send('Page.enable');
// 540×960 con escala 2 → PNG de 1080×1920 (lo que pide Google Play)
await send('Emulation.setDeviceMetricsOverride', { width: 540, height: 960, deviceScaleFactor: 2, mobile: true });
await send('Page.navigate', { url: `http://127.0.0.1:${puertoApp}` });
await sleep(1200);
await js(`localStorage.clear()`);
await send('Page.navigate', { url: `http://127.0.0.1:${puertoApp}` });
await sleep(2600);
await clic('/probar/i'); await sleep(1500); await cerrar();

console.log('Capturas:');
await foto('01-inicio.png');                                                   // meta juntos + para ti
await js(`document.querySelector('.tab[data-tab="tasks"]').click()`); await sleep(700);
await clic('/calendario/i', '#app button'); await sleep(800); await foto('02-calendario.png');
await js(`document.querySelector('.tab[data-tab="money"]').click()`); await sleep(700); await cerrar(); await foto('03-dinero.png');
await js(`document.querySelector('.tab[data-tab="home"]').click()`); await sleep(600);
await clic('/pedir favores/i'); await sleep(800);
await clic('/historial/i', '#app button'); await sleep(700); await foto('04-puntos.png');
await js(`document.querySelector('#app [data-act="back"]')?.click()`); await sleep(500);
await js(`document.querySelector('.tab[data-tab="plans"]').click()`); await sleep(800); await cerrar(); await foto('05-juntos.png');
await js(`document.querySelector('.duo').click()`); await sleep(800); await cerrar(); await foto('06-pareja.png');

console.log('\nListo. Están en assets/play/');
try { ws.close(); } catch (e) { }
servidor.close();
apagado.forEach(f => f());
