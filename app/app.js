/* ================================================================
   Xurripoints — interfaz. Pantallas: Inicio · Puntos · Tareas · Gastos · Pareja.
   Todo se pinta desde S.data (lo que manda el motor de datos) con render().
   Los botones llevan data-act="…" y los atiende ACT (delegación de eventos).
   ================================================================ */
import { createBackend, hasFirebaseConfig } from './store.js';
import * as L from './logic.js';

const VERSION = '0.1.0';

/* ---------------- Utilidades ---------------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const EUR = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
const eur = c => EUR.format((c || 0) / 100);
const eurPlain = c => ((c || 0) / 100).toFixed(2).replace('.', ',');
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* nada */ } };
const icons = () => { try { window.lucide && lucide.createIcons(); } catch (e) { /* nada */ } };
const ic = name => `<i data-lucide="${name}"></i>`;
const byNewest = (a, b) => (b.createdAt || 0) - (a.createdAt || 0);
const vibrate = ms => { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* nada */ } };

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function ago(ts) {
  const s = (Date.now() - ts) / 1000;
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  const d = Math.floor(s / 86400);
  if (d === 1) return 'ayer';
  if (d < 7) return `hace ${d} días`;
  const dt = new Date(ts);
  return `${dt.getDate()} ${MONTHS[dt.getMonth()].slice(0, 3)}`;
}
function dueLabel(due) {
  if (!due) return '';
  const today = L.ymd();
  const diff = Math.round((L.parseYmd(due) - L.parseYmd(today)) / 86400e3);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  if (diff < 0) return `Hace ${-diff} días`;
  if (diff < 7) return `El ${DAYS[L.parseYmd(due).getDay()]}`;
  const d = L.parseYmd(due);
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
}

/* ---------------- Catálogo por defecto ---------------- */
const DEFAULT_EARN = [
  ['🍝', 'Hacer la cena', 15], ['🧽', 'Fregar los platos', 10], ['🧺', 'Poner una lavadora', 10],
  ['🛒', 'Hacer la compra', 15], ['🛁', 'Limpiar el baño', 20], ['🗑️', 'Bajar la basura', 5],
  ['🛏️', 'Hacer la cama', 5], ['💆', 'Dar un masaje', 20], ['☕', 'Desayuno en la cama', 20],
  ['🌹', 'Detalle sorpresa', 25], ['🎧', 'Escuchar sin juzgar', 15], ['🚗', 'Hacer de chófer', 10],
];
const DEFAULT_SPEND = [
  ['🍻', 'Salir con mis amigos/as', 50], ['📺', 'Elegir peli o serie', 10], ['😴', 'Siesta sin interrupciones', 15],
  ['🎮', 'Tarde de videojuegos', 30], ['🙅', 'Librarme de una tarea', 20], ['🍕', 'Cena de capricho (elijo yo)', 25],
  ['💤', 'Dormir hasta tarde el finde', 20], ['⚽', 'Ver el partido tranquilo', 25], ['🛍️', 'Tarde de compras', 30],
  ['🌟', 'Deseo libre', 100],
];
const mkItems = list => list.map(([emoji, title, pts]) => ({ id: L.uid8(), emoji, title, pts }));
const newCoupleSeed = () => ({ catalog: { earn: mkItems(DEFAULT_EARN), spend: mkItems(DEFAULT_SPEND) }, settings: { taskPctA: 50 } });

const CATS = [
  ['super', '🛒', 'Súper'], ['casa', '🏠', 'Casa'], ['facturas', '💡', 'Facturas'], ['fuera', '🍽️', 'Comer fuera'],
  ['ocio', '🎉', 'Ocio'], ['viajes', '✈️', 'Viajes'], ['transporte', '🚗', 'Transporte'], ['regalos', '🎁', 'Regalos'],
  ['mascota', '🐾', 'Mascota'], ['salud', '💊', 'Salud'], ['otros', '📦', 'Otros'],
];
const catOf = id => CATS.find(c => c[0] === id) || CATS[CATS.length - 1];
const AVATARS = ['🐻', '🐰', '🦊', '🐱', '🐶', '🐼', '🐨', '🐸', '🦄', '🐧', '🐯', '🐹', '🍓', '🥑', '🥒', '🌻', '🌙', '⭐', '🍩', '🧁', '🍑', '🌈'];
const TASK_EMOJIS = ['🧽', '🗑️', '🛁', '🧺', '🛒', '🍳', '🛏️', '🧹', '🐾', '🪴', '🧾', '🚗', '👕', '🪟', '🧸', '📦'];
const ITEM_EMOJIS = ['🍝', '🧽', '💆', '🌹', '☕', '🍻', '📺', '😴', '🎮', '🍕', '💤', '⚽', '🛍️', '🌟', '🎁', '💌', '🍷', '🎬', '🏖️', '🧁'];
const REPEAT_LABEL = { none: 'Una vez', daily: 'Cada día', weekly: 'Cada semana', monthly: 'Cada mes' };

/* ---------------- Estado ---------------- */
const S = {
  be: null, user: null, code: null, data: null,
  phase: 'boot',          // boot · auth · loading · pair · wait · app
  authMode: 'welcome',    // welcome · signup · login
  authError: '', busy: false,
  tab: 'home', ptab: 'earn', taskFilter: 'all', showDone: false,
  enter: true,            // animación de entrada al cambiar de pestaña
  unwatch: null, sheet: null, seenPending: null,
};

const C = () => S.data.couple;
const MEMBERS = () => C().members;
const ME = () => S.user.uid;
const PA = () => MEMBERS().find(u => u !== ME());
const prof = u => (C().profiles && C().profiles[u]) || { name: '¿?', emoji: '🙂', sugar: 'mami', income: 0 };
const pname = () => prof(PA()).name;
const nameOf = u => (u === ME() ? 'Tú' : prof(u).name);
const side = u => (u === MEMBERS()[0] ? 'a' : 'b');
const av = (u, cls = '') => `<span class="av ${side(u)} ${cls}">${esc(prof(u).emoji || '🙂')}</span>`;
const coin = (n, cls = '') => `<span class="pts ${cls}"><i class="xc"></i>${n}</span>`;
const catalog = () => (C().catalog || { earn: [], spend: [] });
const taskPctA = () => (C().settings && Number.isFinite(C().settings.taskPctA) ? C().settings.taskPctA : 50);

/* ---------------- Arranque ---------------- */
async function boot() {
  try {
    S.be = await createBackend(lsGet('xp_mode') === 'demo' ? 'demo' : 'cloud');
  } catch (e) {
    console.error(e);
    lsSet('xp_mode', 'demo');
    S.be = await createBackend('demo');
  }
  S.be.start(onUser);
}

async function onUser(user) {
  if (S.unwatch) { S.unwatch(); S.unwatch = null; }
  S.user = user; S.data = null; S.code = null; S.seenPending = null;
  closeSheet(true);
  if (!user) { S.phase = 'auth'; S.authMode = 'welcome'; render(); return; }
  S.phase = 'loading'; render();
  const cached = S.be.kind === 'firebase' ? lsGet('xp_code_' + user.uid) : null;
  if (cached) { watchCouple(cached); return; }
  try {
    const code = await S.be.getMyCoupleCode();
    if (!code) { S.phase = 'pair'; render(); return; }
    watchCouple(code);
  } catch (e) {
    console.error(e);
    toast(errMsg(e));
    S.phase = 'pair'; render();
  }
}

function watchCouple(code) {
  S.code = code;
  if (S.be.kind === 'firebase') lsSet('xp_code_' + S.user.uid, code);
  S.unwatch = S.be.watch(code, data => {
    if (!data.couple || !data.couple.members.includes(S.user.uid)) {
      // la pareja no existe o ya no soy miembro → volver a emparejar
      lsSet('xp_code_' + S.user.uid, null);
      if (S.unwatch) { S.unwatch(); S.unwatch = null; }
      S.data = null; S.phase = 'pair'; render(); return;
    }
    S.data = data;
    const was = S.phase;
    S.phase = data.couple.members.length < 2 ? 'wait' : 'app';
    if (was !== 'app' && S.phase === 'app') S.enter = true;
    if (S.phase === 'app') notifyNewRequests();
    render();
  }, err => { console.error(err); toast(errMsg(err)); });
}

/** Aviso dentro de la app cuando llega una petición nueva de la pareja. */
function notifyNewRequests() {
  const mine = S.data.points.filter(t => t.status === 'pending' && t.createdBy !== ME());
  const ids = new Set(mine.map(t => t.id));
  if (S.seenPending) {
    const fresh = mine.filter(t => !S.seenPending.has(t.id));
    if (fresh.length) {
      const t = fresh[0];
      toast(`💌 ${pname()} ${t.type === 'redeem' ? 'quiere canjear' : 'dice que ha hecho'}: ${t.title}`);
      vibrate([30, 60, 30]);
    }
  }
  S.seenPending = ids;
}

function errMsg(e) {
  const code = (e && e.code) || '';
  const M = {
    'auth/invalid-email': 'Ese email no parece válido.',
    'auth/missing-password': 'Escribe una contraseña.',
    'auth/weak-password': 'La contraseña necesita al menos 6 caracteres.',
    'auth/email-already-in-use': 'Ya hay una cuenta con ese email. Prueba a entrar.',
    'auth/invalid-credential': 'Email o contraseña incorrectos.',
    'auth/wrong-password': 'Email o contraseña incorrectos.',
    'auth/user-not-found': 'Email o contraseña incorrectos.',
    'auth/too-many-requests': 'Demasiados intentos. Espera un poco y vuelve a probar.',
    'auth/network-request-failed': 'Sin conexión. Revisa internet.',
    'auth/operation-not-allowed': 'Falta activar Email/Contraseña en Firebase (Authentication).',
    'auth/configuration-not-found': 'Falta activar Authentication en Firebase.',
    'permission-denied': 'Sin permiso. ¿Están publicadas las reglas de Firestore?',
    'unavailable': 'Sin conexión. Se guardará cuando vuelva internet.',
    'failed-precondition': 'Falta crear la base de datos Firestore en Firebase.',
  };
  return M[code] || (e && e.message) || 'Algo ha fallado.';
}

/* ---------------- Render principal ---------------- */
function render() {
  const app = $('#app');
  const y = window.scrollY;
  document.body.dataset.phase = S.phase;
  if (S.phase === 'boot' || S.phase === 'loading') app.innerHTML = viewLoading();
  else if (S.phase === 'auth') app.innerHTML = viewAuth();
  else if (S.phase === 'pair') app.innerHTML = viewPair();
  else if (S.phase === 'wait') app.innerHTML = viewWait();
  else app.innerHTML = viewShell();
  icons();
  if (S.enter) { S.enter = false; window.scrollTo(0, 0); } else window.scrollTo(0, y);
}

function viewLoading() {
  return `<div class="center-screen"><div class="big-coin spin"><i class="xc"></i></div><p class="muted">Contando xurripoints…</p></div>`;
}

/* ---------------- Entrar / crear cuenta ---------------- */
function viewAuth() {
  const fbOk = hasFirebaseConfig();
  if (S.authMode === 'welcome') {
    return `<div class="auth">
      <div class="auth-art" aria-hidden="true">
        <div class="orbit"><span>💗</span><span>✨</span><span>💞</span><span>🍓</span></div>
        <div class="big-coin float"><i class="xc"></i></div>
      </div>
      <h1 class="logo">Xurri<em>points</em></h1>
      <p class="tagline">La moneda de vuestra relación. Ganad puntos <b>cuidándoos</b>, canjeadlos por <b>vales</b> y repartid <b>tareas y gastos</b> sin dramas.</p>
      <div class="auth-actions">
        ${fbOk ? `
          <button class="btn primary big" data-act="auth-show" data-mode="signup">${ic('heart')} Crear cuenta</button>
          <button class="btn big" data-act="auth-show" data-mode="login">Ya tengo cuenta</button>
          <button class="btn link" data-act="demo-start">Probar en modo demo</button>`
        : `
          <button class="btn primary big" data-act="demo-start">${ic('sparkles')} Probar en modo demo</button>
          <p class="note">🔌 La sincronización entre móviles aún no está conectada (falta la configuración de Firebase). Mientras, el modo demo guarda todo en este móvil y te deja hacer de los dos.</p>`}
      </div>
    </div>`;
  }
  const signup = S.authMode === 'signup';
  return `<div class="auth form">
    <button class="btn icon back" data-act="auth-show" data-mode="welcome" aria-label="Volver">${ic('arrow-left')}</button>
    <div class="big-coin sm"><i class="xc"></i></div>
    <h1 class="h1">${signup ? 'Crea tu cuenta' : '¡Hola de nuevo!'}</h1>
    <p class="muted">${signup ? 'Cada uno se crea la suya. Luego os unís con un código.' : 'Entra con tu email y contraseña.'}</p>
    <form id="auth-form" class="stack" autocomplete="on">
      <label class="field"><span>Email</span><input class="inp" id="au-email" type="email" autocomplete="email" inputmode="email" required></label>
      <label class="field"><span>Contraseña</span>
        <div class="pass"><input class="inp" id="au-pass" type="password" autocomplete="${signup ? 'new-password' : 'current-password'}" minlength="6" required>
        <button type="button" class="btn icon ghost" data-act="toggle-pass" aria-label="Ver contraseña">${ic('eye')}</button></div>
      </label>
      ${S.authError ? `<p class="error">${esc(S.authError)}</p>` : ''}
      <button class="btn primary big" type="submit" ${S.busy ? 'disabled' : ''}>${S.busy ? 'Un momento…' : (signup ? 'Crear cuenta' : 'Entrar')}</button>
      ${signup ? '' : `<button type="button" class="btn link" data-act="auth-forgot">He olvidado la contraseña</button>`}
      <button type="button" class="btn link" data-act="auth-show" data-mode="${signup ? 'login' : 'signup'}">${signup ? 'Ya tengo cuenta' : 'No tengo cuenta'}</button>
    </form>
  </div>`;
}

async function submitAuth(e) {
  e.preventDefault();
  const email = $('#au-email').value.trim(), pass = $('#au-pass').value;
  S.busy = true; S.authError = ''; render(); $('#au-email').value = email; $('#au-pass').value = pass;
  try {
    if (S.authMode === 'signup') await S.be.signUp(email, pass);
    else await S.be.signIn(email, pass);
    S.busy = false; // onUser se encarga del resto
  } catch (err) {
    S.busy = false; S.authError = errMsg(err); render();
    $('#au-email').value = email;
  }
}

/* ---------------- Emparejar ---------------- */
function profileFields(p = {}) {
  const emoji = p.emoji || AVATARS[0], sugar = p.sugar || 'mami';
  return `
    <div class="field"><span>Tu avatar</span>
      <div class="emoji-grid" id="pf-emoji">${AVATARS.map(e => `<button type="button" class="emo ${e === emoji ? 'on' : ''}" data-act="pick" data-v="${e}">${e}</button>`).join('')}</div>
    </div>
    <label class="field"><span>Tu nombre (o mote)</span><input class="inp" id="pf-name" maxlength="18" value="${esc(p.name || '')}" placeholder="Pepino, Churri, Bichito…"></label>
    <div class="field"><span>A la hora de invitar, eres…</span>
      <div class="chips" id="pf-sugar">
        <button type="button" class="chip ${sugar === 'mami' ? 'on' : ''}" data-act="pick" data-v="mami">💅 Sugar mami</button>
        <button type="button" class="chip ${sugar === 'papi' ? 'on' : ''}" data-act="pick" data-v="papi">🕶️ Sugar papi</button>
      </div>
    </div>
    <label class="field"><span>Ingresos al mes <small>(opcional · solo para repartir gastos de forma proporcional; lo verá tu pareja)</small></span>
      <div class="money-inp"><input class="inp" id="pf-income" inputmode="decimal" placeholder="0" value="${p.income ? eurPlain(p.income) : ''}"><b>€</b></div></label>`;
}
function readProfile() {
  const name = $('#pf-name').value.trim();
  const income = L.parseEur($('#pf-income').value);
  return {
    name: name || 'Churri',
    emoji: picked('pf-emoji') || AVATARS[0],
    sugar: picked('pf-sugar') || 'mami',
    income: Number.isFinite(income) ? income : 0,
  };
}

function viewPair() {
  return `<div class="auth form pair">
    <div class="big-coin sm"><i class="xc"></i></div>
    <h1 class="h1">¿Quién eres? 💞</h1>
    <p class="muted">Rellena tu perfil y crea vuestra pareja, o únete con el código de tu churri.</p>
    <div class="stack">${profileFields()}</div>
    <div class="pair-actions">
      <button class="btn primary big" data-act="pair-create">${ic('heart-handshake')} Crear nuestra pareja</button>
      <div class="or"><span>o tengo un código</span></div>
      <div class="join">
        <input class="inp code-inp" id="join-code" maxlength="6" placeholder="XXXXXX" autocapitalize="characters" autocomplete="off">
        <button class="btn mint" data-act="pair-join">Unirme</button>
      </div>
      <button class="btn link" data-act="logout">Cerrar sesión</button>
    </div>
  </div>`;
}

function viewWait() {
  const code = S.code || '';
  return `<div class="auth wait">
    <div class="auth-art sm" aria-hidden="true"><div class="orbit"><span>💌</span><span>✨</span></div><div class="big-coin float"><i class="xc"></i></div></div>
    <h1 class="h1">¡Ya casi!</h1>
    <p class="muted">Pásale este código a tu churri. Cuando se una desde su móvil, esta pantalla cambiará sola.</p>
    <div class="code-tiles">${[...code].map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</div>
    <div class="row-btns">
      <button class="btn" data-act="copy-code">${ic('copy')} Copiar</button>
      <button class="btn primary" data-act="share-code">${ic('send')} Enviar</button>
    </div>
    <p class="muted small">Esperando a tu pareja… <span class="dots"><i></i><i></i><i></i></span></p>
    <button class="btn link" data-act="logout">Cerrar sesión</button>
  </div>`;
}

/* ---------------- Carcasa (cabecera + pestaña + menú) ---------------- */
function pendingForMe() { return S.data.points.filter(t => t.status === 'pending' && t.createdBy !== ME()).sort(byNewest); }

function viewShell() {
  const views = { home: viewHome, points: viewPoints, tasks: viewTasks, money: viewMoney, couple: viewCouple };
  const nPending = pendingForMe().length;
  const today = L.ymd();
  const nTasks = S.data.tasks.filter(t => L.isActive(t) && t.assignee === ME() && t.due && t.due <= today).length;
  const tab = (id, icon, label, badge = 0) => `<button class="tab ${S.tab === id ? 'on' : ''}" data-act="tab" data-tab="${id}" aria-label="${label}">
      <span class="tab-ic">${ic(icon)}${badge ? `<b class="badge">${badge}</b>` : ''}</span><span class="tab-lb">${label}</span></button>`;
  return `
  <div class="bgfx" aria-hidden="true"></div>
  <header class="top">
    <div class="brand"><i class="xc"></i><span>Xurri<em>points</em></span></div>
    <button class="duo" data-act="tab" data-tab="couple" aria-label="Pareja">${av(ME())}${av(PA())}</button>
  </header>
  ${S.be.kind === 'demo' ? `<button class="demo-bar" data-act="demo-switch">Modo demo · eres <b>${esc(prof(ME()).name)}</b> ${ic('repeat-2')} cambiar a ${esc(pname())}</button>` : ''}
  <main class="view ${S.enter ? 'enter' : ''}" id="view">${views[S.tab]()}</main>
  <nav class="tabs">
    ${tab('home', 'heart', 'Inicio', nPending)}
    ${tab('points', 'coins', 'Puntos')}
    ${tab('tasks', 'list-checks', 'Tareas', nTasks)}
    ${tab('money', 'wallet', 'Gastos')}
    ${tab('couple', 'users', 'Pareja')}
  </nav>`;
}

/* ---------------- INICIO ---------------- */
function purseCard(u, bal, res) {
  return `<div class="purse-card ${side(u)}">
    <div class="purse-who">${av(u, 'lg')}<span>${esc(nameOf(u))}</span></div>
    <div class="purse-num">${bal}</div>
    <div class="purse-lb"><i class="xc"></i> xurripoints</div>
    ${res ? `<div class="purse-res">${res} apartados en vales</div>` : ''}
  </div>`;
}

function requestCard(t) {
  const u = t.createdBy;
  const redeem = t.type === 'redeem';
  return `<article class="ticket ${redeem ? 'is-vale' : 'is-claim'}">
    <div class="stub">${esc(t.emoji || '✨')}</div>
    <div class="tk-body">
      <div class="tk-kicker">${av(u, 'xs')} ${esc(prof(u).name)} ${redeem ? 'quiere canjear un vale' : 'dice que ha hecho'}</div>
      <div class="tk-title">${redeem ? '<small>Vale por</small> ' : ''}${esc(t.title)}</div>
      ${t.note ? `<div class="tk-note">“${esc(t.note)}”</div>` : ''}
      <div class="tk-meta">${redeem ? `${coin(t.amount)} pasarán a ti` : `${coin('+' + t.amount)} para ${esc(prof(u).name)}`} · ${ago(t.createdAt)}</div>
      <div class="tk-actions">
        <button class="btn mint sm" data-act="approve" data-id="${t.id}">${ic('check')} ${redeem ? 'Aceptar' : 'Aprobar'}</button>
        <button class="btn sm soft-berry" data-act="reject" data-id="${t.id}">${redeem ? 'Ahora no' : 'No cuela'}</button>
      </div>
    </div>
  </article>`;
}

function myRequestRow(t) {
  return `<div class="mini-row">
    <span class="mr-emoji">${esc(t.emoji || '✨')}</span>
    <span class="mr-body"><b>${esc(t.title)}</b><small>${t.type === 'redeem' ? 'Vale pedido' : 'Reclamado'} · ${coin(t.amount)} · ${ago(t.createdAt)}</small></span>
    <button class="btn sm ghost" data-act="cancel" data-id="${t.id}">Anular</button>
  </div>`;
}

function historyRow(t) {
  const me = ME();
  const other = esc(pname());
  const who = {
    claim: t.to === me ? 'Reclamaste tú' : `Reclamó ${other}`,
    reward: t.createdBy === me ? `Premiaste a ${other}` : `${other} te premió`,
    redeem: t.from === me ? 'Canjeaste un vale' : `${other} canjeó un vale`,
    gift: t.from === me ? `Regalaste a ${other}` : `${other} te regaló`,
  }[t.type] || '';
  let sign = 'neutral', num = String(t.amount);
  if (t.status === 'approved' || t.status === 'pending') {
    if (t.to === me) { sign = 'plus'; num = '+' + t.amount; }
    else if (t.from === me) { sign = 'minus'; num = '−' + t.amount; }
  }
  const pill = { pending: '<span class="pill wait">Pendiente</span>', rejected: '<span class="pill no">Rechazado</span>', cancelled: '<span class="pill off">Anulado</span>' }[t.status] || '';
  return `<div class="hist ${t.status}">
    <span class="h-emoji">${esc(t.emoji || '✨')}</span>
    <span class="h-body"><b>${esc(t.title)}</b><small>${who} · ${ago(t.createdAt)} ${pill}</small>
      ${t.reply ? `<small class="h-reply">💬 “${esc(t.reply)}”</small>` : ''}</span>
    <span class="h-amt ${sign}">${num}</span>
  </div>`;
}

function viewHome() {
  const me = ME(), pa = PA(), P = S.data.points;
  const bal = L.balances(P, MEMBERS());
  const toDecide = pendingForMe();
  const mine = P.filter(t => t.status === 'pending' && t.createdBy === me).sort(byNewest);
  const recent = P.filter(t => t.status === 'approved').sort((a, b) => (b.resolvedAt || b.createdAt) - (a.resolvedAt || a.createdAt)).slice(0, 5);
  const today = L.ymd();
  const myTasks = activeTasks().filter(t => (t.assignee === me || !t.assignee) && t.due && t.due <= today).slice(0, 4);
  const net = L.netBalances(S.data.expenses, MEMBERS());

  let money;
  if (Math.abs(net[me]) < 1) money = `<span class="mc-emoji">✨</span><span><b>Estáis en paz</b><small>Nadie debe nada</small></span>`;
  else if (net[me] > 0) money = `<span class="mc-emoji">💸</span><span><b>${esc(pname())} te debe ${eur(net[me])}</b><small>Toca para ver los gastos</small></span>`;
  else money = `<span class="mc-emoji">🙈</span><span><b>Le debes ${eur(-net[me])} a ${esc(pname())}</b><small>Toca para ver los gastos</small></span>`;

  return `
  <section class="purse">
    ${purseCard(me, bal[me], L.reserved(P, me))}
    <div class="purse-heart" aria-hidden="true">💞</div>
    ${purseCard(pa, bal[pa], L.reserved(P, pa))}
  </section>

  ${toDecide.length ? `<section class="block">
    <h2 class="h">Te toca decidir <span class="count">${toDecide.length}</span></h2>
    <div class="stack">${toDecide.map(requestCard).join('')}</div>
  </section>` : ''}

  <section class="quick">
    <button class="qa mint" data-act="quick" data-type="claim"><span class="qa-ic">${ic('hand-heart')}</span><b>Reclamar</b><small>He hecho algo</small></button>
    <button class="qa butter" data-act="quick" data-type="redeem"><span class="qa-ic">${ic('ticket')}</span><b>Pedir vale</b><small>Gastar puntos</small></button>
    <button class="qa rose" data-act="quick" data-type="reward"><span class="qa-ic">${ic('sparkles')}</span><b>Premiar</b><small>Dar puntos a ${esc(pname())}</small></button>
    <button class="qa lilac" data-act="quick" data-type="gift"><span class="qa-ic">${ic('gift')}</span><b>Regalar</b><small>De tu saldo</small></button>
  </section>

  <button class="money-chip" data-act="tab" data-tab="money">${money}${ic('chevron-right')}</button>

  <section class="block">
    <div class="h-row"><h2 class="h">Tus tareas de hoy</h2><button class="btn link sm" data-act="tab" data-tab="tasks">Ver todas</button></div>
    ${myTasks.length ? `<div class="stack tight">${myTasks.map(taskRow).join('')}</div>` : `<p class="empty">Nada pendiente para hoy 🌿</p>`}
  </section>

  ${mine.length ? `<section class="block">
    <h2 class="h">Esperando a ${esc(pname())}</h2>
    <div class="card list">${mine.map(myRequestRow).join('')}</div>
  </section>` : ''}

  <section class="block">
    <div class="h-row"><h2 class="h">Últimos movimientos</h2><button class="btn link sm" data-act="ptab-go" data-v="hist">Historial</button></div>
    ${recent.length ? `<div class="card list">${recent.map(historyRow).join('')}</div>` : `<p class="empty">Aún no hay movimientos. ¡Estrenad la hucha! 🐷</p>`}
  </section>`;
}

/* ---------------- PUNTOS ---------------- */
function viewPoints() {
  const tabs = [['earn', 'Ganar'], ['vales', 'Vales'], ['hist', 'Historial']];
  const avail = L.available(S.data.points, MEMBERS(), ME());
  let body = '';
  if (S.ptab === 'earn') {
    const items = catalog().earn;
    body = `<p class="hint">Toca una acción: la <b>reclamas</b> tú (${esc(pname())} la aprueba) o <b>premias</b> a ${esc(pname())}.</p>
      <div class="earn-grid">${items.map((it, i) => `
        <div class="earn" style="--i:${i}">
          <button class="earn-main" data-act="earn-item" data-id="${it.id}"><span class="earn-emoji">${esc(it.emoji)}</span><b>${esc(it.title)}</b>${coin('+' + it.pts)}</button>
          <button class="edit-dot" data-act="cat-edit" data-kind="earn" data-id="${it.id}" aria-label="Editar">${ic('pencil')}</button>
        </div>`).join('')}
        <button class="earn add" data-act="cat-new" data-kind="earn">${ic('plus')}<b>Nueva acción</b></button>
      </div>`;
  } else if (S.ptab === 'vales') {
    const items = catalog().spend;
    body = `<p class="hint">Tienes ${coin(avail)} disponibles. Pide un vale y, si ${esc(pname())} acepta, los puntos pasan a su hucha.</p>
      <div class="stack">${items.map((it, i) => couponCard(it, i, avail)).join('')}
        <button class="coupon add" data-act="cat-new" data-kind="spend">${ic('plus')} Nuevo vale</button>
      </div>`;
  } else {
    const all = [...S.data.points].sort(byNewest);
    body = all.length ? `<div class="card list">${all.map(historyRow).join('')}</div>` : `<p class="empty">Todavía no hay movimientos.</p>`;
  }
  return `<h1 class="page-title">Puntos</h1>
    <div class="seg" role="tablist">${tabs.map(([k, l]) => `<button class="${S.ptab === k ? 'on' : ''}" data-act="ptab" data-v="${k}">${l}</button>`).join('')}</div>
    ${body}`;
}
const COUPON_TINTS = ['butter', 'rose', 'lilac', 'mint', 'peach'];
function couponCard(it, i, avail) {
  const short = avail < it.pts;
  return `<div class="coupon ${COUPON_TINTS[i % COUPON_TINTS.length]} ${short ? 'short' : ''}" style="--i:${i}">
    <button class="cp-main" data-act="vale-item" data-id="${it.id}">
      <span class="cp-emoji">${esc(it.emoji)}</span>
      <span class="cp-body"><small>Vale por</small><b>${esc(it.title)}</b>${short ? `<em>Te faltan ${it.pts - avail}</em>` : ''}</span>
      <span class="cp-price"><i class="xc"></i>${it.pts}</span>
    </button>
    <button class="edit-dot" data-act="cat-edit" data-kind="spend" data-id="${it.id}" aria-label="Editar">${ic('pencil')}</button>
  </div>`;
}

/* ---------------- TAREAS ---------------- */
function activeTasks() {
  return S.data.tasks.filter(L.isActive).sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999') || (a.createdAt - b.createdAt));
}
function assigneeLabel(t) {
  if (t.rotate) return `${ic('repeat-2')} ${t.assignee === ME() ? 'Te toca a ti' : `Le toca a ${esc(prof(t.assignee).name)}`}`;
  if (!t.assignee) return '🙋 Libre';
  return t.assignee === ME() ? 'Tú' : esc(prof(t.assignee).name);
}
function taskRow(t) {
  const today = L.ymd();
  const done = !L.isActive(t);
  const late = !done && t.due && t.due < today;
  const lastLog = (t.log || [])[0];
  return `<div class="task ${done ? 'done' : ''} ${late ? 'late' : ''} ${t.assignee ? side(t.assignee) : 'free'}">
    <button class="check" data-act="task-check" data-id="${t.id}" aria-label="${done ? 'Reabrir' : 'Marcar como hecha'}">${ic('check')}</button>
    <button class="task-main" data-act="task-edit" data-id="${t.id}">
      <span class="t-emoji">${esc(t.emoji || '🧹')}</span>
      <span class="t-body"><b>${esc(t.title)}</b>
        <small>${t.assignee ? av(t.assignee, 'xs') : ''} ${assigneeLabel(t)}${t.due && !done ? ` · <span class="${late ? 'late-txt' : ''}">${dueLabel(t.due)}</span>` : ''}${t.repeat && t.repeat !== 'none' ? ` · ${REPEAT_LABEL[t.repeat]}` : ''}${done && t.doneBy ? ` · hecha por ${esc(nameOf(t.doneBy))}` : ''}${!done && lastLog && t.repeat !== 'none' ? ` · última: ${esc(nameOf(lastLog.by))}` : ''}</small>
      </span>
      ${t.pts ? coin('+' + t.pts, 'sm') : ''}
    </button>
  </div>`;
}

function viewTasks() {
  const [a, b] = MEMBERS();
  const { load, free } = L.taskLoad(S.data.tasks, MEMBERS());
  const tot = load[a] + load[b];
  const pa = tot ? Math.round(load[a] / tot * 100) : 50;
  const target = taskPctA();
  const nFree = S.data.tasks.filter(t => L.isActive(t) && !t.assignee && !t.rotate).length;
  const me = ME(), today = L.ymd();
  const f = S.taskFilter;
  const pass = t => f === 'all' || (f === 'mine' && t.assignee === me) || (f === 'theirs' && t.assignee === PA()) || (f === 'free' && !t.assignee);
  const act = activeTasks().filter(pass);
  const groups = [
    ['Hoy y atrasadas', act.filter(t => t.due && t.due <= today)],
    ['Próximamente', act.filter(t => t.due && t.due > today)],
    ['Sin fecha', act.filter(t => !t.due)],
  ];
  const done = S.data.tasks.filter(t => !L.isActive(t) && pass(t)).sort((x, y) => (y.doneAt || 0) - (x.doneAt || 0)).slice(0, 15);
  const filters = [['all', 'Todas'], ['mine', 'Mías'], ['theirs', `De ${pname()}`], ['free', 'Libres']];
  return `<h1 class="page-title">Tareas</h1>
    <section class="card load-card">
      <div class="h-row"><h2 class="h sm">Reparto de la semana</h2><button class="btn link sm nowrap" data-act="task-target">${ic('scale')} ${target}/${100 - target}</button></div>
      <div class="loadbar" role="img" aria-label="${esc(prof(a).name)} ${pa}%, ${esc(prof(b).name)} ${100 - pa}%">
        <span class="a" style="width:${pa}%"></span><span class="b" style="width:${100 - pa}%"></span>
        <i class="target" style="left:${target}%"></i>
      </div>
      <div class="load-legend">
        <span>${av(a, 'xs')} ${esc(prof(a).name)} <b>${pa}%</b></span>
        <span><b>${100 - pa}%</b> ${esc(prof(b).name)} ${av(b, 'xs')}</span>
      </div>
      ${nFree ? `<button class="btn soft wide" data-act="task-auto">${ic('shuffle')} Repartir ${nFree === 1 ? 'la tarea libre' : `las ${nFree} libres`} de forma justa</button>` : ''}
      ${!tot && !free ? '' : `<p class="muted small">Cuenta los puntos de cada tarea y cuántas veces se repite a la semana.</p>`}
    </section>
    <div class="chips scroll">${filters.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="task-filter" data-v="${k}">${esc(l)}</button>`).join('')}</div>
    ${groups.map(([title, list]) => list.length ? `<section class="block"><h2 class="h sm">${title}</h2><div class="stack tight">${list.map(taskRow).join('')}</div></section>` : '').join('')}
    ${!act.length ? `<p class="empty">No hay tareas aquí. ¡Añade la primera con el +!</p>` : ''}
    ${done.length ? `<section class="block">
      <button class="btn link sm" data-act="toggle-done">${S.showDone ? 'Ocultar' : 'Ver'} hechas (${done.length})</button>
      ${S.showDone ? `<div class="stack tight">${done.map(taskRow).join('')}</div>` : ''}
    </section>` : ''}
    <button class="fab" data-act="task-new" aria-label="Nueva tarea">${ic('plus')}</button>`;
}

/* ---------------- GASTOS ---------------- */
function modeLabel(e) {
  if (e.kind === 'settle') return 'Liquidación';
  if (e.mode === 'equal') return '50/50';
  if (e.mode === 'proportional') return 'Proporcional';
  if (e.mode === 'sugar') { const p = prof(e.sugar); return `Sugar ${p.sugar === 'papi' ? 'papi' : 'mami'} ${esc(p.name)}`; }
  const [a, b] = MEMBERS();
  const pa = e.amount ? Math.round((e.shares[a] || 0) / e.amount * 100) : 50;
  return `A medida ${pa}/${100 - pa}`;
}
function expenseRow(e) {
  const me = ME();
  if (e.kind === 'settle') {
    const to = Object.keys(e.shares || {})[0];
    return `<button class="exp settle" data-act="exp-edit" data-id="${e.id}">
      <span class="exp-ic">🤝</span>
      <span class="exp-body"><b>${e.paidBy === me ? `Pagaste a ${esc(prof(to).name)}` : `${esc(prof(e.paidBy).name)} te pagó`}</b><small>Liquidación · ${esc(dueLabel(e.date).toLowerCase())}</small></span>
      <span class="exp-amt">${eur(e.amount)}</span>
    </button>`;
  }
  const c = catOf(e.category);
  return `<button class="exp" data-act="exp-edit" data-id="${e.id}">
    <span class="exp-ic">${c[1]}</span>
    <span class="exp-body"><b>${esc(e.title || c[2])}</b><small>${e.paidBy === me ? 'Pagaste tú' : `Pagó ${esc(prof(e.paidBy).name)}`} · ${modeLabel(e)}</small></span>
    <span class="exp-amt">${eur(e.amount)}<small>tu parte ${eur((e.shares || {})[me] || 0)}</small></span>
  </button>`;
}

function viewMoney() {
  const me = ME(), pa = PA();
  const net = L.netBalances(S.data.expenses, MEMBERS());
  let debt;
  if (Math.abs(net[me]) < 1) {
    debt = `<div class="debt-line">${av(me, 'lg')}<span class="debt-heart">🤝</span>${av(pa, 'lg')}</div>
      <p class="debt-big">Estáis en paz</p><p class="muted">Nadie le debe nada a nadie ✨</p>`;
  } else {
    const debtor = net[me] < 0 ? me : pa, creditor = debtor === me ? pa : me;
    debt = `<div class="debt-line">${av(debtor, 'lg')}<span class="debt-arrow">${ic('arrow-right')}</span>${av(creditor, 'lg')}</div>
      <p class="debt-big">${eur(Math.abs(net[me]))}</p>
      <p class="muted">${debtor === me ? `Le debes a ${esc(pname())}` : `${esc(pname())} te debe`}</p>
      <button class="btn primary" data-act="settle">${ic('hand-coins')} Liquidar</button>`;
  }
  const exps = [...S.data.expenses].sort((x, y) => (y.date || '').localeCompare(x.date || '') || (y.createdAt - x.createdAt));
  const ym = L.ymd().slice(0, 7);
  const month = exps.filter(e => e.kind !== 'settle' && (e.date || '').startsWith(ym));
  const total = month.reduce((s, e) => s + e.amount, 0);
  const paidMe = month.filter(e => e.paidBy === me).reduce((s, e) => s + e.amount, 0);
  const byCat = {};
  month.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });
  const topCats = Object.entries(byCat).sort((x, y) => y[1] - x[1]).slice(0, 4);

  const groups = [];
  for (const e of exps) {
    const k = (e.date || '').slice(0, 7);
    let g = groups.find(x => x.k === k);
    if (!g) { g = { k, list: [] }; groups.push(g); }
    g.list.push(e);
  }
  const gLabel = k => { if (!k) return 'Sin fecha'; const [y, m] = k.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };

  return `<h1 class="page-title">Gastos</h1>
    <section class="card debt-card">${debt}</section>
    <section class="card month-card">
      <div class="h-row"><h2 class="h sm">Este mes</h2><b class="month-total">${eur(total)}</b></div>
      ${total ? `<div class="paidbar"><span class="${side(me)}" style="width:${Math.round(paidMe / total * 100)}%"></span></div>
      <p class="muted small">Has pagado tú ${eur(paidMe)} (${Math.round(paidMe / total * 100)}%) · ${esc(pname())} ${eur(total - paidMe)}</p>
      <div class="chips">${topCats.map(([c, v]) => `<span class="chip static">${catOf(c)[1]} ${eur(v)}</span>`).join('')}</div>`
      : `<p class="muted small">Sin gastos este mes todavía.</p>`}
    </section>
    ${groups.map(g => `<section class="block"><h2 class="h sm cap">${gLabel(g.k)}</h2><div class="card list">${g.list.map(expenseRow).join('')}</div></section>`).join('')}
    ${!exps.length ? `<p class="empty">Apunta vuestro primer gasto con el + y elegid cómo repartirlo: 50/50, proporcional, sugar mami/papi o a medida.</p>` : ''}
    <button class="fab" data-act="exp-new" aria-label="Nuevo gasto">${ic('plus')}</button>`;
}

/* ---------------- PAREJA ---------------- */
function viewCouple() {
  const me = ME(), pa = PA(), p = prof(me), q = prof(pa);
  const t = taskPctA();
  const [a, b] = MEMBERS();
  const since = new Date(C().createdAt || Date.now());
  const incomeTxt = x => (x.income ? `${eur(x.income)}/mes` : 'sin indicar');
  return `<h1 class="page-title">Pareja</h1>
    <section class="couple-hero">
      <div class="ch-avs">${av(me, 'xl')}<span class="ch-heart">💗</span>${av(pa, 'xl')}</div>
      <p class="ch-names">${esc(p.name)} <span>&</span> ${esc(q.name)}</p>
      <p class="muted small">Juntos en Xurripoints desde el ${since.getDate()} de ${MONTHS[since.getMonth()]} de ${since.getFullYear()}</p>
    </section>
    <section class="card list">
      <button class="set-row" data-act="profile-edit"><span class="sr-ic">${esc(p.emoji)}</span><span class="sr-body"><b>Tu perfil</b><small>${esc(p.name)} · Sugar ${p.sugar === 'papi' ? 'papi 🕶️' : 'mami 💅'} · ${incomeTxt(p)}</small></span>${ic('chevron-right')}</button>
      <div class="set-row"><span class="sr-ic">${esc(q.emoji)}</span><span class="sr-body"><b>${esc(q.name)}</b><small>Sugar ${q.sugar === 'papi' ? 'papi 🕶️' : 'mami 💅'} · ${incomeTxt(q)}</small></span></div>
    </section>
    <section class="card list">
      <button class="set-row" data-act="task-target"><span class="sr-ic">⚖️</span><span class="sr-body"><b>Reparto de tareas</b><small>${esc(prof(a).name)} ${t}% · ${esc(prof(b).name)} ${100 - t}%</small></span>${ic('chevron-right')}</button>
      <button class="set-row" data-act="ptab-go" data-v="earn"><span class="sr-ic">🪙</span><span class="sr-body"><b>Acciones y vales</b><small>${catalog().earn.length} acciones · ${catalog().spend.length} vales · toca el lápiz para editar</small></span>${ic('chevron-right')}</button>
      <div class="set-row"><span class="sr-ic">🔑</span><span class="sr-body"><b>Código de pareja</b><small class="mono">${esc(S.code || C().code || '')}</small></span></div>
    </section>
    <section class="card list">
      ${S.be.kind === 'demo' ? `
        <button class="set-row" data-act="demo-switch"><span class="sr-ic">🔁</span><span class="sr-body"><b>Cambiar de persona</b><small>Ahora eres ${esc(p.name)}</small></span></button>
        <button class="set-row" data-act="demo-reset"><span class="sr-ic">🧹</span><span class="sr-body"><b>Reiniciar la demo</b><small>Vuelve a los datos de ejemplo</small></span></button>
        <button class="set-row" data-act="demo-exit"><span class="sr-ic">🚪</span><span class="sr-body"><b>Salir del modo demo</b><small>${hasFirebaseConfig() ? 'Para crear vuestra cuenta de verdad' : 'Borra los datos de prueba'}</small></span></button>`
      : `
        <div class="set-row"><span class="sr-ic">✉️</span><span class="sr-body"><b>Tu cuenta</b><small>${esc(S.user.email || '')}</small></span></div>
        <button class="set-row" data-act="logout"><span class="sr-ic">🚪</span><span class="sr-body"><b>Cerrar sesión</b><small>Tus datos siguen guardados en la nube</small></span></button>`}
    </section>
    <p class="foot">Xurripoints v${VERSION} · hecho con 💞</p>`;
}

/* ================================================================
   HOJAS (bottom sheets) y avisos
   ================================================================ */
function openSheet(html, { onMount, ctx } = {}) {
  const root = $('#sheet-root');
  root.innerHTML = `<div class="scrim" data-act="sheet-close"></div>
    <div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>
      <button class="btn icon ghost sheet-x" data-act="sheet-close" aria-label="Cerrar">${ic('x')}</button>
      <div class="sheet-body">${html}</div></div>`;
  root.classList.add('open');
  document.body.classList.add('noscroll');
  S.sheet = ctx || {};
  icons();
  onMount && onMount($('.sheet', root));
}
function swapSheet(html, onMount) {
  const body = $('#sheet-root .sheet-body');
  if (!body) return openSheet(html, { onMount });
  body.innerHTML = html;
  icons();
  onMount && onMount($('#sheet-root .sheet'));
}
function closeSheet(instant) {
  const root = $('#sheet-root');
  if (!root || !root.classList.contains('open')) return;
  S.sheet = null;
  document.body.classList.remove('noscroll');
  if (instant) { root.classList.remove('open', 'closing'); root.innerHTML = ''; return; }
  root.classList.add('closing');
  setTimeout(() => { root.classList.remove('open', 'closing'); root.innerHTML = ''; }, 180);
}
function toast(msg, opts = {}) {
  const root = $('#toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = `<span>${esc(msg)}</span>${opts.action ? `<button class="toast-btn">${esc(opts.action)}</button>` : ''}`;
  if (opts.action) el.querySelector('.toast-btn').onclick = () => { opts.onAction && opts.onAction(); el.remove(); };
  root.innerHTML = '';
  root.appendChild(el);
  setTimeout(() => el.classList.add('out'), opts.action ? 5000 : 3200);
  setTimeout(() => el.remove(), opts.action ? 5400 : 3600);
}
function celebrate(emojis = ['💗', '✨', '💞', '🪙']) {
  const layer = document.createElement('div');
  layer.className = 'confetti';
  for (let i = 0; i < 16; i++) {
    const s = document.createElement('span');
    s.textContent = emojis[i % emojis.length];
    const ang = (Math.PI * 2 * i) / 16 + Math.random() * 0.4;
    const dist = 90 + Math.random() * 90;
    s.style.setProperty('--x', `${Math.cos(ang) * dist}px`);
    s.style.setProperty('--y', `${Math.sin(ang) * dist - 60}px`);
    s.style.setProperty('--r', `${(Math.random() - 0.5) * 120}deg`);
    s.style.animationDelay = `${Math.random() * 80}ms`;
    layer.appendChild(s);
  }
  document.body.appendChild(layer);
  vibrate(25);
  setTimeout(() => layer.remove(), 1300);
}
/** Valor elegido dentro de un grupo de chips (.on). */
function picked(groupId) { const el = document.querySelector(`#${groupId} .on`); return el ? el.dataset.v : null; }

/* ---------------- Puntos: crear, aprobar… ---------------- */
function addPoints(o) {
  const me = ME(), now = Date.now();
  const pending = o.type === 'claim' || o.type === 'redeem';
  const doc = {
    type: o.type, from: o.from ?? null, to: o.to, amount: Math.round(o.amount),
    title: (o.title || '').slice(0, 60), emoji: o.emoji || '✨', note: (o.note || '').slice(0, 140),
    status: pending ? 'pending' : 'approved', createdBy: me, createdAt: now,
    resolvedAt: pending ? null : now, resolvedBy: pending ? null : me, taskId: o.taskId || null,
  };
  const r = S.be.add('points', doc);
  r.done.catch(err => toast(errMsg(err)));
  return r.id;
}

function pointsPicker(type) {
  const items = catalog().earn;
  const claim = type === 'claim';
  return `<h3 class="sheet-title">${claim ? '¿Qué has hecho? 💪' : `¿Qué ha hecho ${esc(pname())}? ✨`}</h3>
    <p class="muted">${claim ? `${esc(pname())} tendrá que aprobarlo.` : 'Los puntos le llegan al momento.'}</p>
    <div class="pick-list">${items.map(it => `<button class="pick-row" data-act="do-points" data-type="${type}" data-id="${it.id}">
      <span class="pr-emoji">${esc(it.emoji)}</span><b>${esc(it.title)}</b>${coin('+' + it.pts)}</button>`).join('')}</div>
    <details class="custom-box"><summary>${ic('pencil-line')} Otra cosa…</summary>
      <div class="stack">
        <input class="inp" id="cu-title" maxlength="60" placeholder="${claim ? 'He montado el mueble de IKEA' : 'Me ha hecho reír un montón'}">
        ${ptsChips('cu-pts', 10)}
        <button class="btn primary" data-act="do-points-custom" data-type="${type}">${claim ? 'Reclamar' : `Premiar a ${esc(pname())}`}</button>
      </div>
    </details>`;
}
function ptsChips(id, sel, list = [5, 10, 15, 20, 30, 50, 100]) {
  return `<div class="chips" id="${id}">${list.map(n => `<button type="button" class="chip ${n === sel ? 'on' : ''}" data-act="pick" data-v="${n}"><i class="xc"></i>${n}</button>`).join('')}</div>`;
}

function redeemPicker() {
  const avail = L.available(S.data.points, MEMBERS(), ME());
  return `<h3 class="sheet-title">Pedir un vale 🎟️</h3>
    <p class="muted">Tienes ${coin(avail)} disponibles.</p>
    <div class="stack">${catalog().spend.map((it, i) => couponCard(it, i, avail)).join('')}</div>`;
}
function redeemConfirm(it) {
  const avail = L.available(S.data.points, MEMBERS(), ME());
  const short = avail < it.pts;
  return `<div class="coupon big butter"><div class="cp-main"><span class="cp-emoji">${esc(it.emoji)}</span><span class="cp-body"><small>Vale por</small><b>${esc(it.title)}</b></span><span class="cp-price"><i class="xc"></i>${it.pts}</span></div></div>
    <p class="muted">Si ${esc(pname())} acepta, ${it.pts} de tus puntos pasan a su hucha.</p>
    <label class="field"><span>¿Cuándo? ¿Algún detalle? <small>(opcional)</small></span>
      <input class="inp" id="rd-note" maxlength="140" placeholder="El sábado por la noche 🍻"></label>
    ${short ? `<p class="error">Te faltan ${it.pts - avail} puntos. ¡A ganarlos! 💪</p>` : ''}
    <button class="btn primary big wide" data-act="do-redeem" data-id="${it.id}" ${short ? 'disabled' : ''}>${ic('ticket')} Pedir vale</button>`;
}
function giftSheet() {
  const avail = L.available(S.data.points, MEMBERS(), ME());
  return `<h3 class="sheet-title">Regalar a ${esc(pname())} 🎁</h3>
    <p class="muted">Sale de tu saldo (tienes ${coin(avail)}).</p>
    ${ptsChips('gf-pts', 10, [5, 10, 20, 30, 50, 100])}
    <label class="field"><span>Mensaje <small>(opcional)</small></span><input class="inp" id="gf-note" maxlength="60" placeholder="Porque sí 💗"></label>
    <button class="btn primary big wide" data-act="do-gift">${ic('gift')} Regalar</button>`;
}

/* ---------------- Catálogo (editar) ---------------- */
function catalogForm(kind, it) {
  const isNew = !it;
  it = it || { emoji: kind === 'earn' ? '✨' : '🎟️', title: '', pts: kind === 'earn' ? 10 : 30 };
  return `<h3 class="sheet-title">${isNew ? (kind === 'earn' ? 'Nueva acción' : 'Nuevo vale') : 'Editar'}</h3>
    <div class="stack">
      <div class="emoji-line"><input class="inp emoji-inp" id="ct-emoji" maxlength="4" value="${esc(it.emoji)}" aria-label="Emoji">
        <input class="inp" id="ct-title" maxlength="50" value="${esc(it.title)}" placeholder="${kind === 'earn' ? 'Regar las plantas' : 'Noche de chicas/chicos'}"></div>
      <div class="emoji-row" id="ct-emojis">${ITEM_EMOJIS.map(e => `<button type="button" class="emo sm" data-act="set-emoji" data-target="ct-emoji" data-v="${e}">${e}</button>`).join('')}</div>
      <div class="field"><span>${kind === 'earn' ? 'Puntos que da' : 'Puntos que cuesta'}</span>
        <div class="stepper"><button type="button" class="btn icon" data-act="step" data-target="ct-pts" data-d="-5">${ic('minus')}</button>
        <input class="inp num" id="ct-pts" inputmode="numeric" value="${it.pts}"><button type="button" class="btn icon" data-act="step" data-target="ct-pts" data-d="5">${ic('plus')}</button></div></div>
      <button class="btn primary big" data-act="cat-save" data-kind="${kind}" data-id="${isNew ? '' : it.id}">Guardar</button>
      ${isNew ? '' : `<button class="btn soft-berry" data-act="cat-delete" data-kind="${kind}" data-id="${it.id}">${ic('trash-2')} Borrar</button>`}
    </div>`;
}

/* ---------------- Tareas (formulario) ---------------- */
function taskForm(t) {
  const isNew = !t;
  t = t || { title: '', emoji: '🧹', pts: 10, assignee: null, rotate: false, repeat: 'weekly', due: L.ymd() };
  const me = ME(), pa = PA();
  const who = t.rotate ? 'rotate' : (t.assignee || 'free');
  return `<h3 class="sheet-title">${isNew ? 'Nueva tarea' : 'Editar tarea'}</h3>
    <div class="stack">
      <div class="emoji-line"><input class="inp emoji-inp" id="tk-emoji" maxlength="4" value="${esc(t.emoji)}" aria-label="Emoji">
        <input class="inp" id="tk-title" maxlength="50" value="${esc(t.title)}" placeholder="Fregar los platos"></div>
      <div class="emoji-row">${TASK_EMOJIS.map(e => `<button type="button" class="emo sm" data-act="set-emoji" data-target="tk-emoji" data-v="${e}">${e}</button>`).join('')}</div>
      <div class="field"><span>¿De quién es?</span>
        <div class="chips" id="tk-who">
          <button type="button" class="chip ${who === me ? 'on' : ''}" data-act="pick" data-v="${me}">${esc(prof(me).emoji)} Mía</button>
          <button type="button" class="chip ${who === pa ? 'on' : ''}" data-act="pick" data-v="${pa}">${esc(prof(pa).emoji)} De ${esc(pname())}</button>
          <button type="button" class="chip ${who === 'free' ? 'on' : ''}" data-act="pick" data-v="free">🙋 Libre</button>
          <button type="button" class="chip ${who === 'rotate' ? 'on' : ''}" data-act="pick" data-v="rotate">🔁 Por turnos</button>
        </div></div>
      <div class="field"><span>¿Se repite?</span>
        <div class="chips" id="tk-repeat">${Object.entries(REPEAT_LABEL).map(([k, l]) => `<button type="button" class="chip ${t.repeat === k ? 'on' : ''}" data-act="pick" data-v="${k}">${l}</button>`).join('')}</div></div>
      <label class="field"><span>${t.repeat && t.repeat !== 'none' ? 'Próxima vez' : 'Fecha'} <small>(opcional)</small></span><input class="inp" id="tk-due" type="date" value="${t.due || ''}"></label>
      <div class="field"><span>Xurripoints al hacerla</span>${ptsChips('tk-pts', t.pts || 0, [0, 5, 10, 15, 20, 30, 50])}</div>
      <button class="btn primary big" data-act="task-save" data-id="${isNew ? '' : t.id}">Guardar</button>
      ${isNew ? '' : `<button class="btn soft-berry" data-act="task-delete" data-id="${t.id}">${ic('trash-2')} Borrar tarea</button>`}
    </div>`;
}

function completeTask(t) {
  const me = ME(), now = Date.now();
  const prev = { doneAt: t.doneAt || null, doneBy: t.doneBy || null, due: t.due || null, assignee: t.assignee || null, log: t.log || [] };
  const patch = { log: [{ by: me, at: now }, ...(t.log || [])].slice(0, 30) };
  if (t.repeat && t.repeat !== 'none') {
    patch.due = L.nextDue(t.due, t.repeat);
    if (t.rotate) patch.assignee = MEMBERS().find(u => u !== me);
  } else {
    patch.doneAt = now; patch.doneBy = me;
  }
  S.be.update('tasks', t.id, patch).catch(err => toast(errMsg(err)));
  let claimId = null;
  if (t.pts > 0) claimId = addPoints({ type: 'claim', to: me, amount: t.pts, title: t.title, emoji: t.emoji, taskId: t.id });
  celebrate(['✅', '✨', '💪', '🪙']);
  toast(t.pts ? `¡Hecha! +${t.pts} cuando ${pname()} lo apruebe` : '¡Hecha!', {
    action: 'Deshacer',
    onAction: () => {
      S.be.update('tasks', t.id, prev).catch(err => toast(errMsg(err)));
      if (claimId) S.be.update('points', claimId, { status: 'cancelled', resolvedAt: Date.now(), resolvedBy: me }).catch(() => { });
    },
  });
}

/* ---------------- Gastos (formulario) ---------------- */
function expenseForm(e) {
  const isNew = !e;
  const me = ME(), pa = PA();
  const [a] = MEMBERS();
  const lastMode = lsGet('xp_last_mode') || 'equal';
  e = e || { title: '', category: 'super', amount: 0, paidBy: me, mode: lastMode.startsWith('sugar') ? 'equal' : lastMode, date: L.ymd() };
  const modeV = e.mode === 'sugar' ? `sugar:${e.sugar}` : e.mode;
  const customMe = e.mode === 'custom' && e.amount ? Math.round((e.shares[me] || 0) / e.amount * 100) : 50;
  const sugarChip = u => { const p = prof(u); return `<button type="button" class="chip ${modeV === 'sugar:' + u ? 'on' : ''}" data-act="pick" data-v="sugar:${u}">${p.sugar === 'papi' ? '🕶️ Sugar papi' : '💅 Sugar mami'} <small>${esc(p.name)}</small></button>`; };
  return `<h3 class="sheet-title">${isNew ? 'Nuevo gasto' : 'Editar gasto'}</h3>
    <div class="stack">
      <div class="amount-field"><input id="ex-amount" inputmode="decimal" placeholder="0,00" value="${e.amount ? eurPlain(e.amount) : ''}" aria-label="Importe"><b>€</b></div>
      <input class="inp" id="ex-title" maxlength="50" value="${esc(e.title)}" placeholder="¿En qué? (Mercadona, cena, luz…)">
      <div class="chips scroll" id="ex-cat">${CATS.map(([id, em, lb]) => `<button type="button" class="chip ${e.category === id ? 'on' : ''}" data-act="pick" data-v="${id}">${em} ${lb}</button>`).join('')}</div>
      <div class="field"><span>¿Quién ha pagado?</span>
        <div class="seg who" id="ex-paid">
          <button type="button" class="${e.paidBy === me ? 'on' : ''}" data-act="pick" data-v="${me}">${av(me, 'xs')} Yo</button>
          <button type="button" class="${e.paidBy === pa ? 'on' : ''}" data-act="pick" data-v="${pa}">${av(pa, 'xs')} ${esc(pname())}</button>
        </div></div>
      <div class="field"><span>¿Cómo lo repartís?</span>
        <div class="chips" id="ex-mode">
          <button type="button" class="chip ${modeV === 'equal' ? 'on' : ''}" data-act="pick" data-v="equal">⚖️ 50/50</button>
          <button type="button" class="chip ${modeV === 'proportional' ? 'on' : ''}" data-act="pick" data-v="proportional">📊 Proporcional</button>
          ${sugarChip(a === me ? me : pa)}${sugarChip(a === me ? pa : me)}
          <button type="button" class="chip ${modeV === 'custom' ? 'on' : ''}" data-act="pick" data-v="custom">🎚️ A medida</button>
        </div></div>
      <div class="custom-split" id="ex-custom" ${modeV === 'custom' ? '' : 'hidden'}>
        <input type="range" id="ex-range" min="0" max="100" step="5" value="${customMe}" aria-label="Parte que pagas tú">
      </div>
      <div class="split-preview" id="ex-preview"></div>
      <label class="field"><span>Fecha</span><input class="inp" id="ex-date" type="date" value="${e.date || L.ymd()}"></label>
      <button class="btn primary big" data-act="exp-save" data-id="${isNew ? '' : e.id}">Guardar</button>
      ${isNew ? '' : `<button class="btn soft-berry" data-act="exp-delete" data-id="${e.id}">${ic('trash-2')} Borrar gasto</button>`}
    </div>`;
}
function readExpenseSplit() {
  const me = ME(), pa = PA();
  const amount = L.parseEur($('#ex-amount').value);
  const mv = picked('ex-mode') || 'equal';
  const [mode, sugar] = mv.split(':');
  const members = MEMBERS();
  const incomes = { [me]: prof(me).income || 0, [pa]: prof(pa).income || 0 };
  const myPct = Number($('#ex-range').value);
  const customPctA = members[0] === me ? myPct : 100 - myPct;
  const opts = { members, incomes, sugar, customPctA };
  return { amount, mode, sugar: sugar || null, opts };
}
function updateExpensePreview() {
  const me = ME(), pa = PA();
  const { amount, mode, opts } = readExpenseSplit();
  $('#ex-custom').hidden = mode !== 'custom';
  const pA = L.pctA(mode, opts);
  const myPct = Math.round(MEMBERS()[0] === me ? pA : 100 - pA);
  const amt = Number.isFinite(amount) ? amount : 0;
  const sh = L.computeShares(amt, mode, opts);
  let warn = '';
  if (mode === 'proportional' && !(prof(me).income > 0 && prof(pa).income > 0)) {
    warn = `<p class="warn">Para repartir proporcional, poned vuestros ingresos en <b>Pareja → perfil</b>. Mientras, sale 50/50.</p>`;
  }
  $('#ex-preview').innerHTML = `
    <div class="sp-bar"><span class="${side(me)}" style="width:${myPct}%"></span><span class="${side(pa)}" style="width:${100 - myPct}%"></span></div>
    <div class="sp-legend"><span>${av(me, 'xs')} Tú <b>${eur(sh[me])}</b> <small>${myPct}%</small></span><span><small>${100 - myPct}%</small> <b>${eur(sh[pa])}</b> ${esc(pname())} ${av(pa, 'xs')}</span></div>${warn}`;
}

function settleSheet() {
  const me = ME(), pa = PA();
  const net = L.netBalances(S.data.expenses, MEMBERS());
  const debtor = net[me] < 0 ? me : pa, creditor = debtor === me ? pa : me;
  const amt = Math.abs(net[me]);
  return `<h3 class="sheet-title">Liquidar cuentas 🤝</h3>
    <p class="muted">${debtor === me ? `¿Le has pagado a ${esc(pname())}?` : `¿${esc(pname())} te ha pagado?`} Apunta cuánto (por Bizum, efectivo…).</p>
    <div class="amount-field"><input id="st-amount" inputmode="decimal" value="${eurPlain(amt)}" aria-label="Importe"><b>€</b></div>
    <button class="btn primary big wide" data-act="settle-save" data-from="${debtor}" data-to="${creditor}">${ic('check')} Apuntar pago</button>`;
}

/* ---------------- Perfil / objetivo de tareas ---------------- */
function targetSheet() {
  const [a, b] = MEMBERS();
  const t = taskPctA();
  return `<h3 class="sheet-title">Reparto de tareas ⚖️</h3>
    <p class="muted">¿Qué parte de la carga de casa lleva cada uno? El botón <b>Repartir</b> intentará acercarse a esto.</p>
    <div class="chips" id="tg-quick">${[50, 60, 40, 70, 30].map(v => `<button type="button" class="chip ${t === v ? 'on' : ''}" data-act="tg-set" data-v="${v}">${v}/${100 - v}</button>`).join('')}</div>
    <div class="tg-row"><span>${av(a, 'xs')} ${esc(prof(a).name)} <b id="tg-a">${t}%</b></span><span><b id="tg-b">${100 - t}%</b> ${esc(prof(b).name)} ${av(b, 'xs')}</span></div>
    <input type="range" id="tg-range" min="0" max="100" step="5" value="${t}" aria-label="Porcentaje">
    <button class="btn primary big wide" data-act="tg-save">Guardar</button>`;
}

/* ================================================================
   ACCIONES (data-act)
   ================================================================ */
const findPoint = id => S.data.points.find(t => t.id === id);
const findTask = id => S.data.tasks.find(t => t.id === id);
const findExp = id => S.data.expenses.find(t => t.id === id);
const findItem = (kind, id) => catalog()[kind].find(x => x.id === id);

const ACT = {
  /* navegación */
  'tab': d => { if (S.tab !== d.tab) { S.tab = d.tab; S.enter = true; render(); } },
  'ptab': d => { S.ptab = d.v; render(); },
  'ptab-go': d => { S.tab = 'points'; S.ptab = d.v; S.enter = true; render(); },
  'task-filter': d => { S.taskFilter = d.v; render(); },
  'toggle-done': () => { S.showDone = !S.showDone; render(); },
  'sheet-close': () => closeSheet(),

  /* controles genéricos */
  'pick': (d, el) => {
    const group = el.parentElement;
    $$('.on', group).forEach(x => x.classList.remove('on'));
    el.classList.add('on');
    S.sheet && S.sheet.onChange && S.sheet.onChange();
  },
  'set-emoji': d => { const inp = document.getElementById(d.target); if (inp) inp.value = d.v; },
  'step': d => { const inp = document.getElementById(d.target); if (inp) inp.value = Math.max(1, Math.min(1000, (parseInt(inp.value, 10) || 0) + Number(d.d))); },
  'toggle-pass': (d, el) => { const i = $('#au-pass'); i.type = i.type === 'password' ? 'text' : 'password'; },

  /* entrar */
  'auth-show': d => { S.authMode = d.mode; S.authError = ''; render(); },
  'auth-forgot': async () => {
    const email = $('#au-email').value.trim();
    if (!email) { S.authError = 'Escribe tu email arriba y vuelve a pulsar.'; render(); return; }
    try { await S.be.resetPassword(email); toast('Te hemos enviado un email para cambiar la contraseña 📬'); }
    catch (err) { S.authError = errMsg(err); render(); $('#au-email').value = email; }
  },
  'demo-start': async () => {
    lsSet('xp_mode', 'demo');
    if (S.be.kind !== 'demo') { S.be = await createBackend('demo'); S.be.start(onUser); }
    S.tab = 'home'; S.enter = true;
    S.be.begin(newCoupleSeed());
    toast('Modo demo: arriba puedes cambiar de persona 🔁');
  },
  'demo-switch': () => { const next = pname(); S.be.switchPersona(); toast(`Ahora eres ${next}`); },
  'demo-reset': () => { if (confirm('¿Borrar todo lo de la demo y volver a los datos de ejemplo?')) { S.be.begin(newCoupleSeed()); S.tab = 'home'; S.enter = true; } },
  'demo-exit': async () => {
    if (!confirm('¿Salir del modo demo? Se borran los datos de prueba.')) return;
    await S.be.signOut();
    lsSet('xp_mode', null);
    S.be = await createBackend('cloud');
    S.be.start(onUser);
  },
  'logout': async () => {
    if (!confirm('¿Cerrar sesión?')) return;
    if (S.user && S.be.kind === 'firebase') lsSet('xp_code_' + S.user.uid, null);
    await S.be.signOut();
  },

  /* emparejar */
  'pair-create': async (d, el) => {
    const p = readProfile();
    el.disabled = true;
    try { const code = await S.be.createCouple(p, newCoupleSeed()); watchCouple(code); }
    catch (err) { toast(errMsg(err)); el.disabled = false; }
  },
  'pair-join': async (d, el) => {
    const code = $('#join-code').value.trim().toUpperCase();
    if (code.length !== 6) { toast('El código tiene 6 letras/números.'); return; }
    const p = readProfile();
    el.disabled = true;
    try { await S.be.joinCouple(code, p); S.enter = true; watchCouple(code); celebrate(); }
    catch (err) { toast(errMsg(err)); el.disabled = false; }
  },
  'copy-code': async () => {
    try { await navigator.clipboard.writeText(S.code); toast('Código copiado 📋'); }
    catch (e) { toast(`Tu código: ${S.code}`); }
  },
  'share-code': async () => {
    const text = `¡Únete a mí en Xurripoints! 💞 Nuestro código de pareja es: ${S.code}`;
    try {
      if (navigator.share) await navigator.share({ title: 'Xurripoints', text });
      else { await navigator.clipboard.writeText(text); toast('Mensaje copiado: pégalo en WhatsApp 💬'); }
    } catch (e) { /* cancelado */ }
  },

  /* puntos */
  'quick': d => {
    if (d.type === 'claim' || d.type === 'reward') openSheet(pointsPicker(d.type));
    else if (d.type === 'redeem') openSheet(redeemPicker());
    else openSheet(giftSheet());
  },
  'earn-item': d => {
    const it = findItem('earn', d.id); if (!it) return;
    openSheet(`<div class="big-emoji">${esc(it.emoji)}</div><h3 class="sheet-title center">${esc(it.title)}</h3><p class="center">${coin('+' + it.pts, 'lg')}</p>
      <div class="stack">
        <button class="btn mint big" data-act="do-points" data-type="claim" data-id="${it.id}">${ic('hand-heart')} Lo he hecho yo · reclamar</button>
        <button class="btn primary big" data-act="do-points" data-type="reward" data-id="${it.id}">${ic('sparkles')} Lo ha hecho ${esc(pname())} · premiar</button>
      </div>`);
  },
  'do-points': d => {
    const it = findItem('earn', d.id); if (!it) return;
    doPoints(d.type, it.title, it.emoji, it.pts);
  },
  'do-points-custom': d => {
    const title = $('#cu-title').value.trim();
    if (!title) { toast('Escribe qué ha pasado ✍️'); return; }
    doPoints(d.type, title, d.type === 'claim' ? '💪' : '✨', Number(picked('cu-pts') || 10));
  },
  'vale-item': d => {
    const it = findItem('spend', d.id); if (!it) return;
    if ($('#sheet-root.open')) swapSheet(redeemConfirm(it)); else openSheet(redeemConfirm(it));
  },
  'do-redeem': d => {
    const it = findItem('spend', d.id); if (!it) return;
    if (L.available(S.data.points, MEMBERS(), ME()) < it.pts) { toast('No te llegan los puntos 😅'); return; }
    addPoints({ type: 'redeem', from: ME(), to: PA(), amount: it.pts, title: it.title, emoji: it.emoji, note: $('#rd-note').value.trim() });
    closeSheet();
    toast(`Vale pedido 🎟️ Ahora le toca a ${pname()}`);
  },
  'do-gift': () => {
    const n = Number(picked('gf-pts') || 0);
    if (L.available(S.data.points, MEMBERS(), ME()) < n) { toast('No te llegan los puntos 😅'); return; }
    const note = $('#gf-note').value.trim();
    addPoints({ type: 'gift', from: ME(), to: PA(), amount: n, title: note || 'Regalo', emoji: '🎁' });
    closeSheet(); celebrate(['🎁', '💗', '✨']);
    toast(`Le has regalado ${n} a ${pname()} 🎁`);
  },
  'approve': d => {
    const t = findPoint(d.id); if (!t || t.status !== 'pending') return;
    if (t.type === 'redeem' && L.balances(S.data.points, MEMBERS())[t.from] < t.amount) { toast(`A ${pname()} ya no le llegan los puntos`); return; }
    S.be.update('points', t.id, { status: 'approved', resolvedAt: Date.now(), resolvedBy: ME() }).catch(err => toast(errMsg(err)));
    celebrate();
    toast(t.type === 'redeem' ? `¡Vale aceptado! +${t.amount} para ti 💗` : `Aprobado: +${t.amount} para ${pname()} ✨`);
  },
  'reject': d => {
    const t = findPoint(d.id); if (!t) return;
    openSheet(`<h3 class="sheet-title">${t.type === 'redeem' ? 'Ahora no' : 'No cuela'} 🙈</h3>
      <p class="muted">¿Le dices por qué? <small>(opcional)</small></p>
      <div class="chips" id="rj-quick">${['Hoy no 🙈', 'Negociamos 😏', 'Mejor otro día', 'Eso no fue así 🤨'].map(s => `<button type="button" class="chip" data-act="pick" data-v="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <input class="inp" id="rj-reply" maxlength="100" placeholder="O escribe algo…">
      <button class="btn soft-berry big wide" data-act="do-reject" data-id="${t.id}">Rechazar</button>`);
  },
  'do-reject': d => {
    const reply = $('#rj-reply').value.trim() || picked('rj-quick') || '';
    S.be.update('points', d.id, { status: 'rejected', resolvedAt: Date.now(), resolvedBy: ME(), reply }).catch(err => toast(errMsg(err)));
    closeSheet(); toast('Rechazado');
  },
  'cancel': d => {
    S.be.update('points', d.id, { status: 'cancelled', resolvedAt: Date.now(), resolvedBy: ME() }).catch(err => toast(errMsg(err)));
    toast('Petición anulada');
  },

  /* catálogo */
  'cat-new': d => openSheet(catalogForm(d.kind)),
  'cat-edit': d => { const it = findItem(d.kind, d.id); if (it) openSheet(catalogForm(d.kind, it)); },
  'cat-save': d => {
    const title = $('#ct-title').value.trim();
    const pts = Math.max(1, Math.min(1000, parseInt($('#ct-pts').value, 10) || 0));
    const emoji = $('#ct-emoji').value.trim() || '✨';
    if (!title) { toast('Ponle un nombre ✍️'); return; }
    const list = [...catalog()[d.kind]];
    if (d.id) { const i = list.findIndex(x => x.id === d.id); if (i >= 0) list[i] = { ...list[i], title, pts, emoji }; }
    else list.push({ id: L.uid8(), title, pts, emoji });
    S.be.updateCouple({ [`catalog.${d.kind}`]: list }).catch(err => toast(errMsg(err)));
    closeSheet(); toast('Guardado ✨');
  },
  'cat-delete': d => {
    if (!confirm('¿Borrar?')) return;
    S.be.updateCouple({ [`catalog.${d.kind}`]: catalog()[d.kind].filter(x => x.id !== d.id) }).catch(err => toast(errMsg(err)));
    closeSheet();
  },

  /* tareas */
  'task-new': () => openSheet(taskForm(), { ctx: {} }),
  'task-edit': d => { const t = findTask(d.id); if (t) openSheet(taskForm(t)); },
  'task-save': d => {
    const title = $('#tk-title').value.trim();
    if (!title) { toast('Ponle un nombre a la tarea ✍️'); return; }
    const who = picked('tk-who') || 'free';
    const repeat = picked('tk-repeat') || 'none';
    const data = {
      title, emoji: $('#tk-emoji').value.trim() || '🧹', pts: Number(picked('tk-pts') || 0),
      assignee: who === 'free' ? null : (who === 'rotate' ? (findTask(d.id)?.assignee || ME()) : who),
      rotate: who === 'rotate', repeat, due: $('#tk-due').value || null,
    };
    if (d.id) S.be.update('tasks', d.id, data).catch(err => toast(errMsg(err)));
    else S.be.add('tasks', { ...data, doneAt: null, doneBy: null, log: [], createdBy: ME(), createdAt: Date.now() }).done.catch(err => toast(errMsg(err)));
    closeSheet(); toast(d.id ? 'Tarea guardada' : 'Tarea añadida 📝');
  },
  'task-delete': d => { if (!confirm('¿Borrar esta tarea?')) return; S.be.remove('tasks', d.id).catch(err => toast(errMsg(err))); closeSheet(); },
  'task-check': d => {
    const t = findTask(d.id); if (!t) return;
    if (!L.isActive(t)) { S.be.update('tasks', t.id, { doneAt: null, doneBy: null }).catch(err => toast(errMsg(err))); return; }
    completeTask(t);
  },
  'task-auto': () => {
    const plan = L.autoAssign(S.data.tasks, MEMBERS(), taskPctA());
    plan.forEach(([id, u]) => S.be.update('tasks', id, { assignee: u }).catch(err => toast(errMsg(err))));
    const mine = plan.filter(p => p[1] === ME()).length;
    toast(`Repartidas: ${mine} para ti y ${plan.length - mine} para ${pname()} 🔀`);
  },
  'task-target': () => openSheet(targetSheet(), {
    onMount: () => {
      const r = $('#tg-range');
      r.addEventListener('input', () => { $('#tg-a').textContent = r.value + '%'; $('#tg-b').textContent = (100 - r.value) + '%'; $$('#tg-quick .chip').forEach(c => c.classList.toggle('on', c.dataset.v === r.value)); });
    },
  }),
  'tg-set': (d, el) => { const r = $('#tg-range'); r.value = d.v; r.dispatchEvent(new Event('input')); },
  'tg-save': () => { S.be.updateCouple({ 'settings.taskPctA': Number($('#tg-range').value) }).catch(err => toast(errMsg(err))); closeSheet(); toast('Objetivo guardado ⚖️'); },

  /* gastos */
  'exp-new': () => openExpense(),
  'exp-edit': d => {
    const e = findExp(d.id); if (!e) return;
    if (e.kind === 'settle') {
      openSheet(`<h3 class="sheet-title">Liquidación 🤝</h3><p class="muted">${esc(nameOf(e.paidBy))} → ${esc(nameOf(Object.keys(e.shares)[0]))} · ${eur(e.amount)}</p>
        <button class="btn soft-berry big wide" data-act="exp-delete" data-id="${e.id}">${ic('trash-2')} Borrar este pago</button>`);
    } else openExpense(e);
  },
  'exp-save': d => {
    const { amount, mode, sugar, opts } = readExpenseSplit();
    if (!Number.isFinite(amount) || amount <= 0) { toast('Escribe el importe 💶'); return; }
    const category = picked('ex-cat') || 'otros';
    const data = {
      kind: 'expense', title: $('#ex-title').value.trim() || catOf(category)[2], category, amount,
      paidBy: picked('ex-paid') || ME(), mode, sugar: mode === 'sugar' ? sugar : null,
      shares: L.computeShares(amount, mode, opts), date: $('#ex-date').value || L.ymd(), updatedAt: Date.now(),
    };
    lsSet('xp_last_mode', mode);
    if (d.id) S.be.update('expenses', d.id, data).catch(err => toast(errMsg(err)));
    else S.be.add('expenses', { ...data, createdBy: ME(), createdAt: Date.now() }).done.catch(err => toast(errMsg(err)));
    closeSheet(); toast(d.id ? 'Gasto guardado' : `Apuntado: ${eur(amount)} 💸`);
  },
  'exp-delete': d => { if (!confirm('¿Borrar?')) return; S.be.remove('expenses', d.id).catch(err => toast(errMsg(err))); closeSheet(); },
  'settle': () => openSheet(settleSheet()),
  'settle-save': d => {
    const amount = L.parseEur($('#st-amount').value);
    if (!Number.isFinite(amount) || amount <= 0) { toast('Escribe el importe 💶'); return; }
    S.be.add('expenses', { kind: 'settle', title: 'Liquidación', category: 'otros', amount, paidBy: d.from, mode: 'settle', shares: { [d.to]: amount }, date: L.ymd(), createdBy: ME(), createdAt: Date.now() }).done.catch(err => toast(errMsg(err)));
    closeSheet(); celebrate(['🤝', '💸', '✨']); toast('¡Cuentas al día! 🤝');
  },

  /* perfil */
  'profile-edit': () => openSheet(`<h3 class="sheet-title">Tu perfil</h3><div class="stack">${profileFields(prof(ME()))}
    <button class="btn primary big" data-act="profile-save">Guardar</button></div>`),
  'profile-save': () => {
    S.be.updateCouple({ [`profiles.${ME()}`]: readProfile() }).catch(err => toast(errMsg(err)));
    closeSheet(); toast('Perfil guardado 💗');
  },
};

function doPoints(type, title, emoji, pts) {
  if (type === 'claim') {
    addPoints({ type: 'claim', to: ME(), amount: pts, title, emoji });
    closeSheet(); toast(`Reclamado: +${pts}. Ahora ${pname()} lo aprueba 💌`);
  } else {
    addPoints({ type: 'reward', to: PA(), amount: pts, title, emoji });
    closeSheet(); celebrate(); toast(`¡${pname()} recibe +${pts}! ✨`);
  }
}
function openExpense(e) {
  openSheet(expenseForm(e), {
    ctx: { onChange: updateExpensePreview },
    onMount: () => {
      ['#ex-amount', '#ex-range'].forEach(s => $(s).addEventListener('input', updateExpensePreview));
      updateExpensePreview();
      if (!e) setTimeout(() => $('#ex-amount').focus(), 250);
    },
  });
}

/* ---------------- Eventos globales ---------------- */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const fn = ACT[el.dataset.act];
  if (!fn) return;
  e.preventDefault();
  fn(el.dataset, el, e);
});
document.addEventListener('submit', e => { if (e.target.id === 'auth-form') submitAuth(e); });
document.addEventListener('input', e => { if (e.target.id === 'join-code') e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });

/* Botón atrás de Android (native.js): cierra la hoja, vuelve a Inicio; si no, deja salir. */
window.__xpBack = () => {
  if ($('#sheet-root.open')) { closeSheet(); return true; }
  if (S.phase === 'app' && S.tab !== 'home') { S.tab = 'home'; S.enter = true; render(); return true; }
  if (S.phase === 'auth' && S.authMode !== 'welcome') { S.authMode = 'welcome'; render(); return true; }
  return false;
};
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });

// Refresca los "hace X min" y el cambio de día si la app se queda abierta.
setInterval(() => { if (S.phase === 'app' && !$('#sheet-root.open')) render(); }, 60e3);

render();
boot();
