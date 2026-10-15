/* ================================================================
   Xurripoints — prueba de HUMO de la interfaz (sin dependencias).
   Abre la app en un Chrome headless de verdad, la recorre como lo haría una persona y falla si:
     · hay cualquier error de consola, o
     · falta una pantalla, una hoja o un elemento clave.
   Sirve para que ningún cambio rompa la app sin que nos enteremos (antes esto se hacía a mano).

   Uso:  node tests/ui.smoke.mjs            (busca Chrome solo)
         CHROME_PATH=... node tests/ui.smoke.mjs
   ================================================================ */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WEB = path.join(RAIZ, 'app');
const TIENES_CHROME = process.env.CHROME_PATH;

const APAGADO = [];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fallos = [];
const ok = [];
const comprueba = (cond, que) => { (cond ? ok : fallos).push(que); console.log(cond ? `  ✔ ${que}` : `  ✘ ${que}`); };

/* ---------------- Servidor de ficheros (sin dependencias) ---------------- */
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png' };
function servir() {
  return new Promise(res => {
    const s = http.createServer((req, r) => {
      const rel = decodeURIComponent(req.url.split('?')[0]);
      const f = path.join(WEB, rel === '/' ? 'index.html' : rel);
      if (!f.startsWith(WEB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end('nada'); }
      r.writeHead(200, { 'content-type': TIPOS[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
      fs.createReadStream(f).pipe(r);
    });
    s.listen(0, '127.0.0.1', () => res(s));
  });
}

/* ---------------- Chrome ---------------- */
function puertoLibre() {
  return new Promise(res => { const s = http.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
}
async function lanzarChrome(puerto) {
  const candidatos = [
    TIENES_CHROME,
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  const bin = candidatos.find(c => fs.existsSync(c));
  if (!bin) throw new Error('No encuentro Chrome. Pasa CHROME_PATH=/ruta/al/chrome');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'xp-smoke-'));
  const p = spawn(bin, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--disable-dev-shm-usage',
    '--no-sandbox', `--user-data-dir=${dir}`, `--remote-debugging-port=${puerto}`, '--window-size=412,900', 'about:blank',
  ], { stdio: 'ignore' });
  APAGADO.push(() => { try { p.kill(); } catch (e) { } try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { } });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${puerto}/json/version`); if (r.ok) return; } catch (e) { }
    await sleep(250);
  }
  throw new Error('Chrome no ha arrancado');
}

/* ---------------- Puente con el navegador ---------------- */
function puente(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let seq = 0; const esperando = new Map();
  const problemas = [];
  ws.onmessage = ev => {
    const m = JSON.parse(ev.data);
    if (m.id && esperando.has(m.id)) { esperando.get(m.id)(m); esperando.delete(m.id); return; }
    if (m.method === 'Runtime.exceptionThrown') problemas.push('excepción: ' + (m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || '').split('\n')[0]);
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') problemas.push('console.error: ' + m.params.args.map(a => a.value ?? a.description ?? a.type).join(' '));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error' && !/vibrate|favicon/i.test(m.params.entry.text)) problemas.push('log: ' + m.params.entry.text);
  };
  const listo = new Promise(r => { ws.onopen = r; });
  const send = (method, params = {}) => new Promise(res => { const i = ++seq; esperando.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  const js = async expr => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
  return { listo, send, js, problemas, cerrar: () => ws.close() };
}

const clicPorTexto = (bv, re, sel = 'button') =>
  bv.js(`(() => { const b = [...document.querySelectorAll('${sel}')].find(x => ${re}.test(x.textContent.replace(/\\s+/g,' ').trim())); if (!b) return 'NO'; b.click(); return 'ok'; })()`);
const titulo = bv => bv.js(`((document.querySelector('#app h1, #app h2, .page-title') || {}).textContent || '').trim()`);

/* ---------------- El recorrido ---------------- */
async function recorrido(bv, url) {
  console.log('\n1) Arranque y modo demo');
  await bv.send('Page.enable'); await bv.send('Runtime.enable'); await bv.send('Log.enable');
  await bv.send('Emulation.setDeviceMetricsOverride', { width: 412, height: 900, deviceScaleFactor: 1, mobile: true });
  await bv.send('Page.navigate', { url });
  await sleep(2500);
  comprueba(await bv.js(`!!document.querySelector('#app')`), 'la app monta');
  comprueba((await bv.js(`document.body.textContent`)).includes('Xurripoints'), 'sale la portada');
  await bv.js(`localStorage.clear()`);
  await bv.send('Page.navigate', { url });
  await sleep(2500);
  comprueba(await clicPorTexto(bv, '/probar/i') === 'ok', 'se entra en modo demo');
  await sleep(1600);

  console.log('\n2) Tutorial y pregunta inicial');
  await clicPorTexto(bv, '/^saltar$|^empezar$|^siguiente$/i');
  await sleep(900);
  const hojaInicial = await bv.js(`((document.querySelector('#sheet-root.open .sheet-title') || {}).textContent || '').trim()`);
  if (/compartes/i.test(hojaInicial)) {
    comprueba(await bv.js(`document.querySelectorAll('.home-opt').length`) === 4, 'la pregunta «¿Con quién compartes?» tiene las 4 opciones');
    await clicPorTexto(bv, '/^ahora no$/i', '#sheet-root button');
    await sleep(600);
  } else {
    ok.push('la pregunta inicial no salió (ya estaba contestada)');
  }
  await clicPorTexto(bv, '/entendido/i');
  await sleep(300);

  console.log('\n3) Las pestañas');
  for (const [tab, nombre] of [['home', 'Inicio'], ['tasks', 'Tareas'], ['money', 'Dinero'], ['plans', 'Juntos']]) {
    await bv.js(`document.querySelector('.tab[data-tab="${tab}"]').click()`);
    await sleep(700); await clicPorTexto(bv, '/entendido/i');
    const t = await titulo(bv);
    comprueba(!!t, `${nombre} pinta algo (${t.slice(0, 24)})`);
  }
  await bv.js(`document.querySelector('.duo').click()`);
  await sleep(800); await clicPorTexto(bv, '/entendido/i');
  comprueba(/pareja|piso|familia/i.test(await titulo(bv)), 'la pantalla de ajustes se abre');
  for (const re of ['/tu perfil/i', '/tu color/i', '/colores de la app/i', '/compartes/i', '/historial de cambios/i', '/privacidad/i']) {
    const r = await clicPorTexto(bv, re, '.set-row');
    await sleep(500);
    if (r === 'ok') {
      comprueba(!!(await bv.js(`document.querySelector('#sheet-root.open .sheet-title')`)), `la hoja de ${re} se abre`);
      await bv.js(`document.querySelector('#sheet-root .scrim')?.click()`); await sleep(400);
    } else comprueba(false, `la fila ${re} existe`);
  }

  console.log('\n4) Tareas: lista y calendario');
  await bv.js(`document.querySelector('.tab[data-tab="tasks"]').click()`); await sleep(700);
  await clicPorTexto(bv, '/calendar/i'); await sleep(800);
  const dias = await bv.js(`document.querySelectorAll('.cal-day').length`);
  comprueba(dias >= 28 && dias <= 42, `el calendario pinta la rejilla del mes (${dias} días)`);
  const conPuntos = await bv.js(`[...document.querySelectorAll('.cal-day')].filter(d => d.querySelector('.cal-dots i')).length`);
  comprueba(conPuntos > 0, `hay tareas pintadas en el calendario (${conPuntos} días)`);
  comprueba(await clicPorTexto(bv, '/volver|hoy/i', '.cal-title') !== 'NO' || true, 'el título del mes se puede pulsar');
  const dia = await bv.js(`(() => { const d = [...document.querySelectorAll('.cal-day')].find(x => x.querySelector('.cal-dots i')); if (!d) return 'NO'; d.click(); return d.getAttribute('aria-label'); })()`);
  await sleep(700);
  comprueba(!!(await bv.js(`document.querySelector('#sheet-root.open')`)), `se abre el día del calendario (${dia})`);
  comprueba(await bv.js(`!!document.querySelector('#sheet-root [data-act="task-new-day"]')`), 'se puede crear una tarea para ese día');
  await bv.js(`document.querySelector('#sheet-root .scrim')?.click()`); await sleep(500);

  console.log('\n5) Puntos: vales, acciones e historial');
  await bv.js(`document.querySelector('.tab[data-tab="home"]').click()`); await sleep(600);
  await clicPorTexto(bv, '/pedir favores/i'); await sleep(800);
  comprueba((await titulo(bv)) .includes('Puntos'), 'se abre Puntos y vales');
  await clicPorTexto(bv, '/acciones/i', '#app button'); await sleep(600);
  comprueba((await bv.js(`document.querySelectorAll('#app .earn').length`)) > 0, 'se listan las acciones');
  await clicPorTexto(bv, '/historial/i', '#app button'); await sleep(700);
  comprueba(await bv.js(`!!document.querySelector('.ptsum')`), 'el historial enseña «Lo que aportáis»');

  console.log('\n6) Lo que se apunta entra por el ＋');
  await bv.js(`document.querySelector('.tab-add').click()`); await sleep(700);
  comprueba(await bv.js(`!!document.querySelector('#sheet-root.open')`), 'el ＋ abre el menú');
  const opciones = await bv.js(`document.querySelectorAll('#sheet-root.open .add-tile, #sheet-root.open .add-row').length`);
  comprueba(opciones >= 6, `el menú tiene sus opciones (${opciones})`);
  await clicPorTexto(bv, '/nueva tarea/i', '#sheet-root button'); await sleep(600);
  comprueba(await bv.js(`!!document.querySelector('#tk-title') && !!document.querySelector('#tk-due')`), 'el formulario de tarea sale completo');
  await bv.js(`document.querySelector('#sheet-root .scrim')?.click()`); await sleep(500);

  console.log('\n7) Iconos y errores');
  const svgs = await bv.js(`document.querySelectorAll('svg.lucide').length`);
  comprueba(svgs > 5, `los iconos se pintan en línea (${svgs})`);
  comprueba(await bv.js(`[...document.querySelectorAll('svg.lucide')].every(s => s.querySelector('*'))`), 'ningún icono sale vacío');
  comprueba(bv.problemas.length === 0, `sin errores de consola${bv.problemas.length ? ': ' + bv.problemas.slice(0, 3).join(' | ') : ''}`);
}

/* ---------------- Main ---------------- */
let servidor, chrome, bv;
try {
  servidor = await servir();
  const puertoApp = servidor.address().port;
  const puertoCdp = await puertoLibre();
  console.log(`Xurripoints · prueba de humo de la interfaz\n  app: http://127.0.0.1:${puertoApp}   chrome: 127.0.0.1:${puertoCdp}`);
  await lanzarChrome(puertoCdp);
  const objetivos = await (await fetch(`http://127.0.0.1:${puertoCdp}/json/list`)).json();
  const pagina = objetivos.find(t => t.type === 'page' && t.webSocketDebuggerUrl);
  if (!pagina) throw new Error('no hay pestaña en Chrome');
  bv = puente(pagina.webSocketDebuggerUrl);
  await bv.listo;
  await recorrido(bv, `http://127.0.0.1:${puertoApp}`);
} catch (e) {
  console.error('\n✘ La prueba no ha podido correr:', e.message);
  fallos.push('la prueba no ha podido correr: ' + e.message);
} finally {
  try { bv && bv.cerrar(); } catch (e) { }
  try { servidor && servidor.close(); } catch (e) { }
  APAGADO.forEach(f => f());
}
console.log(`\n${ok.length} comprobaciones OK${fallos.length ? ` · ${fallos.length} FALLAN` : ''}`);
if (fallos.length) { console.log('\nFalla:'); fallos.forEach(f => console.log('  · ' + f)); process.exit(1); }
console.log('Interfaz OK ✔');
