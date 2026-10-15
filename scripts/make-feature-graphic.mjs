/* ================================================================
   Genera el GRÁFICO DESTACADO de Google Play (1024×500) con el icono y las tipografías de la app.
   Salida: assets/feature-graphic-1024x500.png
   Uso: node scripts/make-feature-graphic.mjs
   ================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const salida = path.join(RAIZ, 'assets', 'feature-graphic-1024x500.png');
const icono = fs.readFileSync(path.join(RAIZ, 'app', 'icon.svg'), 'utf8')
  .replace('<svg ', '<svg width="200" height="200" ')
  .replace(/<rect width="512" height="512"[^>]*\/>\s*/, '');   // sin el cuadrado de fondo: solo la moneda

const fuente = n => 'file:///' + path.join(RAIZ, 'app', 'fonts', n).replace(/\\/g, '/');
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
  @font-face { font-family:'Fraunces'; font-weight:500 900; font-display:block; src:url('${fuente('6NU78FyLNQOQZAnv9bYEvDiIdE9Ea92usiIk_WBq8U_9v0c2WS01xC9TeA.woff2')}') format('woff2'); }
  @font-face { font-family:'Lexend'; font-weight:300 700; font-display:block; src:url('${fuente('wlpwgwvFAVdoq2_v-6QU.woff2')}') format('woff2'); }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { width:1024px; height:500px; overflow:hidden; font-family:'Lexend',sans-serif; color:#3B2335;
         background:linear-gradient(118deg,#FFF6F0 0%,#FFE7EE 42%,#F1EAFF 100%);
         display:flex; align-items:center; gap:40px; padding:0 62px; position:relative; }
  .brillo { position:absolute; border-radius:50%; filter:blur(2px); opacity:.5; }
  .b1 { width:340px; height:340px; right:-90px; top:-120px; background:radial-gradient(circle,#FFD9E6,transparent 68%); }
  .b2 { width:300px; height:300px; left:-70px; bottom:-130px; background:radial-gradient(circle,#E4DAFF,transparent 68%); }
  .coin { flex:none; filter:drop-shadow(0 14px 24px rgba(180,80,110,.28)); }
  .txt { display:flex; flex-direction:column; gap:12px; z-index:1; }
  h1 { font-family:'Fraunces',Georgia,serif; font-weight:800; font-size:92px; line-height:.98; letter-spacing:-2px; }
  h1 em { font-style:italic; color:#D65580; }
  .sub { font-size:29px; line-height:1.25; color:#6E5264; font-weight:500; max-width:560px; }
  .chips { display:flex; gap:10px; margin-top:6px; }
  .chip { font-size:21px; font-weight:600; padding:8px 18px; border-radius:99px; background:rgba(255,255,255,.85);
          box-shadow:0 2px 0 rgba(214,85,128,.18), 0 8px 18px -12px rgba(59,35,53,.5); }
</style></head><body>
  <span class="brillo b1"></span><span class="brillo b2"></span>
  <div class="coin">${icono}</div>
  <div class="txt">
    <h1>Xurri<em>points</em></h1>
    <p class="sub">Tareas, gastos y gracias<br>sin llevar la cuenta</p>
    <div class="chips"><span class="chip">🧽 Tareas</span><span class="chip">💸 Gastos</span><span class="chip">💛 Gracias</span><span class="chip">🎟️ Favores</span></div>
  </div>
</body></html>`;

const tmp = path.join(os.tmpdir(), 'xp-feature.html');
fs.writeFileSync(tmp, html, 'utf8');

const chrome = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
].filter(Boolean).find(c => fs.existsSync(c));
if (!chrome) { console.error('No encuentro Chrome. Pasa CHROME_PATH=/ruta/al/chrome'); process.exit(1); }

await new Promise(res => {
  const p = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--window-size=1024,500',
    `--screenshot=${salida}`, 'file:///' + tmp.replace(/\\/g, '/')], { stdio: 'ignore' });
  p.on('exit', res);
});
const stat = fs.statSync(salida);
console.log(`Gráfico destacado → ${salida}  (${(stat.size / 1024).toFixed(0)} KB, 1024×500)`);
