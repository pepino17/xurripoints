/* ================================================================
   Xurripoints — interfaz. Pantallas: Inicio · Puntos · Tareas · Gastos · Pareja.
   Todo se pinta desde S.data (lo que manda el motor de datos) con render().
   Los botones llevan data-act="…" y los atiende ACT (delegación de eventos).
   ================================================================ */
import { createBackend, hasFirebaseConfig, peekDemoStash, dropDemoStash } from './store.js';
import * as L from './logic.js';
import { THIS_OR_THAT, WHO_MORE, DIE_PIPS } from './content.js';

const VERSION = '0.7.0';
const REPO = 'pepino17/xurripoints';
/** Enlace permanente: siempre descarga el último APK publicado en GitHub Releases. */
const APK_URL = `https://github.com/${REPO}/releases/latest/download/Xurripoints.apk`;

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
const isNative = () => !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
/** En Android, Capacitor abre las URL externas en el navegador del sistema (ahí se descarga el APK). */
function openExternal(url) { if (isNative()) location.href = url; else window.open(url, '_blank', 'noopener'); }
/** Menú nativo de compartir (WhatsApp, Telegram…). Si no hay, copia el texto. */
async function shareText(text) {
  const Sh = window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.Share;
  try {
    if (isNative() && Sh) { await Sh.share({ title: 'Xurripoints', text, dialogTitle: 'Compartir' }); return; }
    if (navigator.share) { await navigator.share({ title: 'Xurripoints', text }); return; }
    await navigator.clipboard.writeText(text);
    toast('Copiado: pégalo en WhatsApp 💬');
  } catch (e) { /* cancelado */ }
}

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
/* Catálogo pensado con criterio psicológico (docs/PSICOLOGIA.md):
   - GANAR = tareas de casa y carga mental. Los mimos (masajes, detalles…) NO se cobran: para eso está "Gracias".
   - VALES = favores que te hace la pareja, NO permisos. El tiempo libre de cada uno no se compra. */
const DEFAULT_EARN = [
  ['🍝', 'Hacer la cena', 15], ['🧽', 'Fregar los platos', 10], ['🧺', 'Poner una lavadora', 10],
  ['👕', 'Tender o doblar la ropa', 10], ['🛒', 'Hacer la compra', 15], ['🛁', 'Limpiar el baño', 20],
  ['🧹', 'Barrer o pasar la aspiradora', 15], ['🗑️', 'Bajar la basura', 5], ['🛏️', 'Cambiar las sábanas', 10],
  ['📅', 'Pedir una cita o hacer una gestión', 15], ['🎂', 'Organizar un plan o un regalo familiar', 20], ['🚗', 'Hacer de chófer', 10],
];
const DEFAULT_SPEND = [
  ['🙅', 'Me libras de una tarea', 20], ['🍳', 'Me cocinas mi plato favorito', 30], ['📺', 'Elijo yo la peli o serie', 10],
  ['😴', 'Siesta sin interrupciones', 15], ['💤', 'Duermo hasta tarde (tú con el desayuno)', 20], ['🕊️', 'Tarde libre de tareas (tú te encargas)', 40],
  ['🧺', 'Te encargas de la colada esta semana', 40], ['🍕', 'Elijo yo la cena', 15], ['🚗', 'Me llevas y me traes', 20],
  ['📋', 'Te encargas de una gestión que odio', 30],
];
// (Sin "deseo libre": un vale abierto es la puerta de vuelta a los permisos y a presionar con "lo he pagado".)
/* Planes: listas para decidir juntos. Ideas de partida pensadas para la novedad (hacer cosas nuevas juntos
   se asocia a más satisfacción en pareja: Aron et al., 2000). */
const IDEA_LISTS = [['pelis', '🎬', 'Pelis'], ['planes', '📍', 'Planes'], ['comida', '🍽️', 'Comida']];
const SEED_IDEAS = [
  ...['Una de Studio Ghibli', 'Un documental de naturaleza', 'Una comedia romántica', 'Una de miedo con mantita', 'Maratón de una saga', 'Una serie corta de una temporada']
    .map(title => ({ list: 'pelis', title })),
  ...['Cocinar juntos algo que nunca hayáis probado', 'Ruta a pie por un sitio nuevo', 'Noche de juegos de mesa', 'Picnic al atardecer',
    'Clase de algo juntos (baile, cerámica, cocina…)', 'Desayunar fuera un domingo', 'Escapada de un día a un pueblo', 'Museo o exposición',
    'Noche sin móviles', 'Karaoke en casa', 'Ver amanecer', 'Mercadillo o feria'].map(title => ({ list: 'planes', title })),
  ...['Pizza casera', 'Japonés', 'Tacos', 'Hamburguesas', 'Ramen', 'Algo del mercado y cocinar juntos', 'Brunch'].map(title => ({ list: 'comida', title })),
];
const THANKS_PRESETS = [['🍝', 'Por la cena'], ['🎧', 'Por escucharme'], ['😂', 'Por hacerme reír'], ['🤒', 'Por cuidarme'],
  ['🙌', 'Por encargarte de todo hoy'], ['🧺', 'Por la ropa'], ['💛', 'Por ser tú']];
/* Pregunta del día: la misma en los dos móviles. Para hablar en persona (no se guarda nada). */
const QUESTIONS = [
  '¿Qué es lo que más te ha gustado de esta semana juntos?', '¿Qué pequeño gesto mío te hace sentir querido o querida?',
  '¿Qué plan te apetecería hacer este mes que nunca hayamos hecho?', '¿Cuál es tu recuerdo favorito de nuestros primeros meses?',
  '¿Hay algo que te preocupe y te gustaría contarme?', '¿Qué te hace sentir más en casa?',
  'Si mañana tuviéramos el día libre, ¿cómo sería tu día perfecto conmigo?', '¿Qué canción te recuerda a nosotros?',
  '¿Qué admiras de mí que no me hayas dicho últimamente?', '¿En qué te puedo ayudar esta semana?',
  '¿Qué tarea de casa odias más y cuál no te importa hacer?', '¿Qué viaje te gustaría que hiciéramos algún día?',
  '¿Qué te ha hecho reír hoy?', '¿Hay algo que te gustaría que hiciéramos más a menudo?',
  '¿Qué te gustaría aprender este año?', '¿Cómo te gusta que te cuiden cuando estás malito o malita?',
  '¿Qué tradición nuestra te gustaría crear?', '¿Qué es lo más bonito que alguien ha hecho por ti?',
  '¿Qué tres palabras nos describen como pareja?', '¿Qué momento del día es tu favorito para estar juntos?',
  '¿Qué sueño tienes para dentro de cinco años?', '¿Qué comida te recuerda a tu infancia?',
  '¿De qué te sientes orgulloso u orgullosa últimamente?', '¿Qué necesitas más ahora mismo: espacio, compañía, ayuda o mimos?',
  '¿Qué te gustaría que te preguntara más a menudo?', '¿Qué cosa pequeña te alegraría mañana?',
  '¿Cuándo te has sentido más en equipo conmigo?', '¿Qué plan barato te hace muy feliz?',
  '¿Qué te gustaría celebrar este mes, aunque sea pequeño?', '¿Qué hábito te gustaría que cuidáramos juntos?',
  '¿A qué amigo o familiar echas de menos y podríamos ver?', '¿Qué fue lo primero que pensaste de mí?',
  '¿Qué te relaja más después de un día duro?', '¿Qué harías con una tarde entera solo para ti?',
  '¿Qué te ha costado esta semana y no me has contado?', '¿Qué foto nuestra te gusta más y por qué?',
  '¿Qué podríamos dejar de hacer para estar más tranquilos?', '¿Qué te gustaría agradecerme de este mes?',
  '¿Qué te hace sentir escuchado o escuchada de verdad?', '¿Qué cosa nueva te apetece probar conmigo?',
]
const mkItems = list => list.map(([emoji, title, pts]) => ({ id: L.uid8(), emoji, title, pts }));
const newCoupleSeed = () => ({
  catalog: { earn: mkItems(DEFAULT_EARN), spend: mkItems(DEFAULT_SPEND) }, settings: { taskPctA: 50 },
  goal: { title: 'Escapada juntos', emoji: '🏖️', target: 500, since: Date.now() },
  ideas: SEED_IDEAS,
});

const CATS = [
  ['super', '🛒', 'Súper'], ['casa', '🏠', 'Casa'], ['facturas', '💡', 'Facturas'], ['fuera', '🍽️', 'Comer fuera'],
  ['ocio', '🎉', 'Ocio'], ['viajes', '✈️', 'Viajes'], ['transporte', '🚗', 'Transporte'], ['regalos', '🎁', 'Regalos'],
  ['mascota', '🐾', 'Mascota'], ['salud', '💊', 'Salud'], ['otros', '📦', 'Otros'],
];
const catOf = id => CATS.find(c => c[0] === id) || CATS[CATS.length - 1];
const AVATARS = ['🐻', '🐰', '🦊', '🐱', '🐶', '🐼', '🐨', '🐸', '🦄', '🐧', '🐯', '🐹', '🍓', '🥑', '🥒', '🌻', '🌙', '⭐', '🍩', '🧁', '🍑', '🌈'];
const TASK_EMOJIS = ['🧽', '🗑️', '🛁', '🧺', '🛒', '🍳', '🛏️', '🧹', '🐾', '🪴', '🧾', '🚗', '👕', '🪟', '🧸', '📦'];
// Emojis de tareas y favores (sin masajes ni flores: el cariño va a Gracias; sin cañas, fútbol ni compras: no son permisos).
const ITEM_EMOJIS = ['🍝', '🧽', '🍳', '🧺', '🛒', '🧹', '📺', '😴', '🍕', '💤', '🚗', '🧾', '📅', '🪴', '🐾', '🛏️', '🎬', '☕', '🍰', '🌟'];
/** Tareas típicas para empezar de cero con un toque (libres; luego se reparten). */
const TYPICAL_TASKS = [['🧽', 'Fregar los platos', 10, 'daily'], ['🗑️', 'Bajar la basura', 5, 'daily'], ['🛒', 'Hacer la compra', 15, 'weekly'],
  ['🛁', 'Limpiar el baño', 20, 'weekly'], ['🧺', 'Poner lavadoras', 10, 'weekly'], ['🛏️', 'Cambiar las sábanas', 10, 'weekly'], ['🧹', 'Pasar la aspiradora', 15, 'weekly']];
const REPEAT_LABEL = { none: 'Una vez', daily: 'Cada día', weekly: 'Cada semana', monthly: 'Cada mes' };

/* ---------------- Estado ---------------- */
const S = {
  be: null, user: null, code: null, data: null,
  phase: 'boot',          // boot · auth · loading · pair · wait · alone (la pareja salió) · offline · app
  authMode: 'welcome',    // welcome · signup · login
  authError: '', busy: false,
  tab: 'home', ptab: 'vales', taskFilter: 'all', showDone: false,
  itab: 'planes', showDoneIdeas: false, qShift: 0, seenThanks: null,
  jtab: 'ideas', mtab: 'exp',             // Juntos: ideas · decidir · jugar  ·  Gastos: gastos · ahorro
  coinMode: 'coin', coinRes: '', coinFace: 'h', dice: 1, lastDice: [3, 5], diceRes: '',
  flipping: false, rolling: false, spinning: false, spinOpts: null,
  wheelText: '', wheelRot: 0, wheelRes: '', deferred: false,
  game: null, gscore: {}, tool: null,
  hint: {},               // ayudas de cada pantalla abiertas/cerradas a mano (si no, manda localStorage)
  enter: true,            // animación de entrada al cambiar de pestaña
  unwatch: null, sheet: null, seenPending: null, myPending: null,
  seenProps: null, myProps: null, seenLogs: null,
  dialog: null,           // función que cierra el diálogo abierto (confirmar / bienvenida)
  update: null,           // última versión publicada en GitHub (si se sabe)
  recurringDone: new Set(),
  closeTimer: null, notifySig: '', loadError: '',
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
const coin = (n, cls = '') => `<span class="pts ${cls}"><i class="xc"></i>${esc(n)}</span>`;
/** Números que vienen de la base de datos: siempre número (nunca texto que se pinte como HTML). */
const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
/** Modo sin puntos: se ocultan puntos, vales y meta (se pausa en Pareja). */
const noPoints = () => !!(C().settings && C().settings.noPoints);
const catalog = () => (C().catalog || { earn: [], spend: [] });
const taskPctA = () => (C().settings && Number.isFinite(C().settings.taskPctA) ? C().settings.taskPctA : 50);
const cap = t => String(t).charAt(0).toUpperCase() + String(t).slice(1);
/** Reparto de gastos de la pareja ("⭐ vuestro reparto"): por defecto en los gastos nuevos y en los fijos. */
const defaultSplit = () => (C().settings && C().settings.split) || { mode: 'equal', sugar: null, customPctA: 50 };
const splitIncomes = () => Object.fromEntries(MEMBERS().map(u => [u, prof(u).income || 0]));
/** Un reparto dicho en palabras, desde mi punto de vista (primero mi parte). Texto plano: escapar al pintar. */
function splitWords(mode, sugar, customPctA, incomes = splitIncomes()) {
  const me = ME(), [a] = MEMBERS();
  if (mode === 'default') { const d = defaultSplit(); return splitWords(d.mode, d.sugar, d.customPctA, incomes); }
  const pA = L.pctA(mode, { members: MEMBERS(), incomes, sugar, customPctA });
  const mine = Math.round(a === me ? pA : 100 - pA);
  if (mode === 'equal') return 'a medias';
  if (mode === 'proportional') return `según ingresos (${mine}/${100 - mine})`;
  if (mode === 'sugar') { const p = prof(sugar); return `sugar ${p.sugar === 'papi' ? 'papi' : 'mami'}: paga ${sugar === me ? 'todo tú' : `todo ${p.name}`}`; }
  return `a medida (${mine}/${100 - mine})`;
}
/** Reparto dicho con los nombres (para propuestas: lo lee la otra persona, así que sin "tú"). */
function splitNeutral(mode, sugar, customPctA) {
  const [a, b] = MEMBERS(), na = prof(a).name, nb = prof(b).name;
  if (mode === 'equal') return 'a medias';
  if (mode === 'sugar') { const p = prof(sugar); return `sugar ${p.sugar === 'papi' ? 'papi' : 'mami'}: paga todo ${p.name}`; }
  const pA = Math.round(L.pctA(mode, { members: MEMBERS(), incomes: splitIncomes(), sugar, customPctA }));
  return `${mode === 'proportional' ? 'según ingresos' : 'a medida'} (${na} ${pA}% · ${nb} ${100 - pA}%)`;
}
/** Página con título (y botón de volver, de ayuda o una acción a la derecha). */
function pageHead(title, { back = false, action = '', help = '' } = {}) {
  return `<div class="page-head">${back ? `<button class="btn icon ghost back-btn" data-act="tab" data-tab="home" aria-label="Volver">${ic('arrow-left')}</button>` : ''}
    <h1 class="page-title">${title}</h1>
    ${help ? `<button class="btn icon ghost help-btn" data-act="hint-toggle" data-v="${help}" aria-label="Ayuda de esta pantalla">${ic('circle-help')}</button>` : ''}
    ${action ? `<span class="ph-act">${action}</span>` : ''}</div>`;
}

/* ---------------- Ayudas de cada pantalla (tutorial por partes) ----------------
   La primera vez que entras en una pantalla, una tarjeta explica para qué sirve. Se cierra con
   "Entendido" y se vuelve a abrir con el botón ? del título. */
const HINTS = {
  tasks: ['🧽', 'Toca el <b>círculo</b> cuando hagas una tarea. <b>Libres</b>: las hace quien pueda. <b>Por turnos</b>: se van alternando solas.'],
  money: ['💸', 'Apuntad lo que pagáis: cada gasto <b>se reparte solo</b> y aquí veis cuánto hay que cuadrar. En <b>Ahorro</b>, huchas para ahorrar juntos.'],
  plans: ['🍿', '<b>Ideas</b>: votad pelis, planes y comida (si coincidís, ¡match!). <b>Decidir</b>: moneda, dados y ruleta. <b>Jugar</b>: juegos para dos en un móvil.'],
  points: ['🪙', 'Las tareas dan puntos y aquí los cambiáis por <b>favores</b>. Si tu pareja dice «ahora no», los puntos vuelven.'],
  couple: ['🤝', 'Lo que <b>acordáis</b> (repartos, precios, volver a los puntos) se cambia con una <b>propuesta</b>: cuando tu pareja dice que sí, cambia.'],
};
const hintOpen = k => (k in S.hint ? S.hint[k] : !lsGet('xp_hint_' + k));
function hintCard(k) {
  if (!HINTS[k] || !hintOpen(k)) return '';
  const [e, t] = HINTS[k];
  return `<div class="hint-card"><span class="hc-e">${e}</span><p>${t}</p><button class="btn sm" data-act="hint-ok" data-v="${k}">Entendido</button></div>`;
}

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
  S.user = user; S.data = null; S.code = null; S.seenPending = null; S.myPending = null; S.seenThanks = null;
  S.seenProps = null; S.myProps = null; S.seenLogs = null;
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
    S.loadError = errMsg(e);
    S.phase = 'offline'; render();
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
    // Pareja cerrada (la otra persona salió) → pantalla propia; con un solo miembro sin cerrar → esperando.
    S.phase = data.couple.members.length >= 2 ? 'app' : data.couple.closedAt ? 'alone' : 'wait';
    if (was !== 'app' && S.phase === 'app') S.enter = true;
    if (S.phase === 'app') { notifyNewRequests(); runRecurring(); }
    render();
    if (S.phase === 'app') { maybeWelcome(); syncReminders(); }
  }, err => { console.error(err); toast(errMsg(err)); });
}

/** Aviso dentro de la app cuando llega una petición nueva de la pareja. */
function notifyNewRequests() {
  const mine = pendingForMe();
  const ids = new Set(mine.map(t => t.id));
  if (S.seenPending) {
    const fresh = mine.filter(t => !S.seenPending.has(t.id));
    if (fresh.length) {
      const t = fresh[0];
      toast(`💌 ${pname()} ${t.type === 'redeem' ? 'te pide un vale' : 'ha hecho'}: ${t.title}`);
      vibrate([30, 60, 30]);
    }
  }
  S.seenPending = ids;
  // …y cuando la pareja contesta a algo que pedí yo.
  if (S.myPending) {
    for (const id of S.myPending) {
      const t = S.data.points.find(x => x.id === id);
      if (!t || t.resolvedBy === ME()) continue;
      if (t.status === 'approved') { toast(`✅ ${pname()} ha dicho que sí: ${t.title}${t.type === 'claim' ? ` (+${t.amount})` : ''}`); celebrate(); break; }
      if (t.status === 'rejected') { toast(`🙈 ${pname()} ha dicho que no: ${t.title}${t.reply ? ` — “${t.reply}”` : ''}`); break; }
    }
  }
  S.myPending = new Set(S.data.points.filter(t => t.status === 'pending' && t.createdBy === ME()).map(t => t.id));
  // Gracias que llegan
  const th = (S.data.thanks || []).filter(t => t.to === ME());
  if (S.seenThanks) {
    const fresh = th.find(t => !S.seenThanks.has(t.id));
    if (fresh) { toast(`💛 ${pname()} te da las gracias: ${fresh.text}`); vibrate([20, 40, 20]); }
  }
  S.seenThanks = new Set(th.map(t => t.id));
  // Propuestas que llegan y respuestas a las mías
  const props = proposalsForMe();
  if (S.seenProps) {
    const fresh = props.find(p => !S.seenProps.has(p.id));
    if (fresh) { toast(`🤝 ${pname()} propone: ${fresh.text}`); vibrate([30, 60, 30]); }
  }
  S.seenProps = new Set(props.map(p => p.id));
  if (S.myProps) {
    for (const id of S.myProps) {
      const p = PROPOSALS().find(x => x.id === id);
      if (!p || p.resolvedBy === ME()) continue;
      if (p.status === 'accepted') { toast(`✅ ${pname()} ha dicho que sí: ${p.text}`); celebrate(); break; }
      if (p.status === 'rejected') { toast(`💬 ${pname()} prefiere hablarlo: ${p.text}`); break; }
    }
  }
  S.myProps = new Set(myProposals().map(p => p.id));
  // Cambios de la pareja (borrar, editar…): nada cambia a escondidas
  const logs = logsForMe();
  if (S.seenLogs) {
    const fresh = logs.find(l => !S.seenLogs.has(l.id));
    if (fresh) toast(`📝 ${pname()} ${fresh.text}`);
  }
  S.seenLogs = new Set(logs.map(l => l.id));
}

/* ---------------- Reglas comunes: propuestas y avisos de cambios ----------------
   Lo que afecta a los dos no se cambia a solas (docs/PSICOLOGIA.md, regla 8):
   - Propuestas: reparto de gastos, reparto de tareas, precios del catálogo y volver a activar los puntos.
     Uno propone; cuando el otro dice que sí, se aplica (lo aplica el móvil de quien acepta).
   - Avisos (log): borrar o cambiar gastos, gastos fijos, tareas y huchas, sacar dinero, cambiar ingresos,
     pausar los puntos… La pareja lo ve en "Para ti" y puede recuperarlo/deshacerlo si hace falta. */
const PROPOSALS = () => (S.data && S.data.proposals) || [];
const pendingProposals = () => PROPOSALS().filter(p => p.status === 'pending').sort(byNewest);
const proposalsForMe = () => pendingProposals().filter(p => p.by !== ME());
const myProposals = () => pendingProposals().filter(p => p.by === ME());
const logsForMe = () => ((S.data && S.data.log) || []).filter(l => l.by !== ME() && !l.seenAt).sort(byNewest);
/** Con pareja hay que proponer; si no hay nadie más (pareja cerrada o esperando), se aplica directamente. */
const hasPartner = () => MEMBERS().length === 2;

function propose(kind, value, text) {
  if (!hasPartner()) { applyProposal({ kind, value }); toast('Guardado ✨'); return; }
  // Una propuesta nueva sustituye a la mía anterior del mismo tipo (en el catálogo, de la misma tarjeta).
  for (const p of myProposals()) {
    const same = p.kind === kind && (kind !== 'catalog' || (p.value && p.value.item && p.value.item.id === value.item.id));
    if (same) S.be.update('proposals', p.id, { status: 'cancelled', resolvedAt: Date.now(), resolvedBy: ME() }).catch(() => { });
  }
  S.be.add('proposals', { kind, value, text: String(text).slice(0, 140), by: ME(), createdAt: Date.now(), status: 'pending', resolvedAt: null, resolvedBy: null })
    .done.catch(err => toast(errMsg(err)));
  toast(`Propuesta enviada a ${pname()} 💬 Cambia cuando diga que sí`);
}
function applyProposal(p) {
  const v = p.value;
  let patch = null;
  if (p.kind === 'split') patch = { 'settings.split': v };
  else if (p.kind === 'taskPct') patch = { 'settings.taskPctA': num(v) };
  else if (p.kind === 'points-on') patch = { 'settings.noPoints': false };
  else if (p.kind === 'catalog' && v && (v.kind === 'earn' || v.kind === 'spend')) patch = { [`catalog.${v.kind}`]: L.applyCatalogOp(catalog()[v.kind], v) };
  if (patch) S.be.updateCouple(patch).catch(err => toast(errMsg(err)));
}
function answerProposal(p, yes) {
  if (!p || p.status !== 'pending') return;
  if (yes) applyProposal(p);
  S.be.update('proposals', p.id, { status: yes ? 'accepted' : 'rejected', resolvedAt: Date.now(), resolvedBy: ME() }).catch(err => toast(errMsg(err)));
}
/** Apunta un cambio para que la pareja lo vea. `data` = {col, id, doc, extra?} para poder recuperarlo/deshacerlo. */
function logChange(kind, text, data = null) {
  if (!hasPartner()) return;
  S.be.add('log', { kind, text: String(text).slice(0, 160), data, by: ME(), createdAt: Date.now(), seenAt: null, restoredAt: null }).done.catch(() => { });
}
/** Copia de un documento para guardarla en el aviso (sin el id). */
const snap = x => { const { id, ...doc } = x; return JSON.parse(JSON.stringify(doc)); };
/** Qué ha cambiado en un gasto (importe, quién pagó, reparto), dicho con nombres. */
function expenseChanges(prev, next) {
  const ch = [];
  if (num(prev.amount) !== num(next.amount)) ch.push(`${eur(prev.amount)} → ${eur(next.amount)}`);
  if (prev.paidBy !== next.paidBy) ch.push(`ahora pagó ${prof(next.paidBy).name}`);
  const pctOf = e => (e.customPctA != null ? e.customPctA : e.shares && e.amount ? Math.round((e.shares[MEMBERS()[0]] || 0) / e.amount * 100) : 50);
  if (prev.mode !== next.mode || (next.mode === 'sugar' && prev.sugar !== next.sugar) || (next.mode === 'custom' && pctOf(prev) !== pctOf(next)))
    ch.push(`reparto: ${next.mode === 'default' ? '⭐ vuestro reparto' : splitNeutral(next.mode, next.sugar, pctOf(next))}`);
  return ch;
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
    'auth/requires-recent-login': 'Por seguridad, vuelve a escribir tu contraseña.',
    'auth/operation-not-allowed': 'Falta activar Email/Contraseña en Firebase (Authentication).',
    'auth/configuration-not-found': 'Falta activar Authentication en Firebase.',
    'permission-denied': 'Sin permiso. ¿Están publicadas las reglas de Firestore?',
    'unavailable': 'Sin conexión. Se guardará cuando vuelva internet.',
    'failed-precondition': 'Falta crear la base de datos Firestore en Firebase.',
  };
  return M[code] || (e && e.message) || 'Algo ha fallado.';
}

/* ---------------- Render principal ---------------- */
/** ¿Estás escribiendo en la pantalla (no en una hoja)? Entonces no se repinta hasta que termines. */
function typingInScreen() {
  const a = document.activeElement;
  if (!a || !a.closest || !/^(INPUT|TEXTAREA)$/.test(a.tagName)) return false;
  if (S.phase === 'app') return !!a.closest('#view');
  return (S.phase === 'wait' || S.phase === 'pair') && !!a.closest('#app');
}
/** Clave de un desplegable (<details>) para que siga abierto al repintar. */
const detailsKey = d => d.dataset.k || ((d.querySelector('summary') || {}).textContent || '').trim();

function render() {
  if (typingInScreen()) { S.deferred = true; return; }
  const app = $('#app');
  const y = window.scrollY;
  // Los desplegables abiertos siguen abiertos (antes se cerraban solos cada minuto o al llegar datos).
  const openDetails = new Set($$('details[open]', app).map(detailsKey));
  document.body.dataset.phase = S.phase;
  if (S.phase === 'boot' || S.phase === 'loading') app.innerHTML = viewLoading();
  else if (S.phase === 'auth') app.innerHTML = viewAuth();
  else if (S.phase === 'pair') app.innerHTML = viewPair();
  else if (S.phase === 'wait') app.innerHTML = viewWait();
  else if (S.phase === 'alone') app.innerHTML = viewAlone();
  else if (S.phase === 'offline') app.innerHTML = viewOffline();
  else app.innerHTML = viewShell();
  if (openDetails.size) $$('details', app).forEach(d => { if (openDetails.has(detailsKey(d))) d.open = true; });
  icons();
  if (S.enter) { S.enter = false; window.scrollTo(0, 0); } else window.scrollTo(0, y);
}

function viewOffline() {
  return `<div class="auth wait">
    <div class="big-coin sm"><i class="xc"></i></div>
    <h1 class="h1">No he podido cargar vuestra pareja</h1>
    <p class="muted">${esc(S.loadError || 'Sin conexión.')}</p>
    <p class="muted small">Revisa internet y vuelve a probar. Tus datos están a salvo.</p>
    <button class="btn primary big" data-act="retry">${ic('refresh-cw')} Reintentar</button>
    <button class="btn link" data-act="logout">Cerrar sesión</button>
  </div>`;
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
      <p class="tagline">Vuestra casa, en equipo: <b>tareas</b> y <b>gastos</b> sin dramas, <b>gracias</b> a diario y <b>planes</b> juntos. Y las tareas dan puntos para pediros <b>favores</b>.</p>
      <div class="auth-actions">
        ${fbOk ? `
          <button class="btn primary big" data-act="auth-show" data-mode="signup">${ic('heart')} Crear cuenta</button>
          <button class="btn big" data-act="auth-show" data-mode="login">Ya tengo cuenta</button>
          <button class="btn link" data-act="demo-start">Probar en modo demo</button>`
        : `
          <button class="btn primary big" data-act="demo-start">${ic('sparkles')} Probar la app</button>
          <p class="note">🧪 <b>Versión de prueba.</b> De momento todo se guarda en este móvil y puedes hacer de los dos (arriba cambias de persona). Pronto podréis usarla cada uno en su móvil.</p>`}
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
    $('#au-email').value = email; $('#au-pass').value = pass;
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
  const stash = peekDemoStash();
  return `<div class="auth form pair">
    <div class="big-coin sm"><i class="xc"></i></div>
    <h1 class="h1">¿Quién eres? 💞</h1>
    <p class="muted">Rellena tu perfil y crea vuestra pareja, o únete con el código de tu churri.</p>
    <div class="stack">${profileFields()}</div>
    <div class="pair-actions">
      ${stash ? `<label class="switch-row"><input type="checkbox" id="pf-stash" checked><span class="sw" aria-hidden="true"></span>
        <span><b>Traer lo de la demo</b><small>Tus tareas, ideas, vales y huchas (sin el dinero ni los puntos de prueba)</small></span></label>` : ''}
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
    <details class="more wait-join" data-k="wait-join"><summary>¿Tu pareja ya creó la suya? <small>únete con su código</small></summary>
      <div class="join"><input class="inp code-inp" id="join-code" maxlength="6" placeholder="XXXXXX" autocapitalize="characters" autocomplete="off">
        <button class="btn mint" data-act="wait-join">Unirme</button></div>
    </details>
    <button class="btn link" data-act="logout">Cerrar sesión</button>
  </div>`;
}

/** Quien se queda cuando la otra persona sale de la pareja. */
function viewAlone() {
  const c = C();
  const gone = (c.formerMembers || []).slice(-1)[0];
  const demo = S.be.kind === 'demo';
  return `<div class="auth wait">
    <div class="big-emoji">🌿</div>
    <h1 class="h1">${esc(prof(gone).name)} ha salido de la pareja</h1>
    <p class="muted">Lo que apuntasteis juntos sigue aquí, solo para ti. Nadie más puede unirse a esta pareja.</p>
    <p class="muted small">Cuando quieras, bórralo todo y empieza de cero (con una pareja nueva o con la misma).</p>
    ${demo ? `<p class="note">🔁 Demo: así lo ve quien se queda.</p>` : ''}
    <button class="btn primary big" data-act="alone-reset">${ic('trash-2')} Borrar todo y empezar de cero</button>
    ${demo ? `<button class="btn link" data-act="demo-exit">Salir del modo demo</button>` : `<button class="btn link" data-act="logout">Cerrar sesión</button>`}
  </div>`;
}

/* ---------------- Carcasa (cabecera + pestaña + menú) ---------------- */
/** Peticiones de puntos que esperan mi respuesta (ninguna si los puntos están en pausa). */
function pendingForMe() { return noPoints() ? [] : S.data.points.filter(t => L.effStatus(t) === 'pending' && t.createdBy !== ME()).sort(byNewest); }

function viewShell() {
  const views = { home: viewHome, points: viewPoints, tasks: viewTasks, money: viewMoney, plans: viewJuntos, couple: viewCouple };
  if (S.tab === 'points' && noPoints()) S.tab = 'home';
  const nHome = pendingForMe().length + proposalsForMe().length + logsForMe().length
    + (S.data.thanks || []).filter(t => t.to === ME() && !t.seenAt).length;
  const today = L.ymd();
  const nTasks = S.data.tasks.filter(t => L.isActive(t) && t.assignee === ME() && t.due && t.due <= today).length;
  const tab = (id, icon, label, badge = 0) => `<button class="tab ${S.tab === id ? 'on' : ''}" data-act="tab" data-tab="${id}" aria-label="${label}">
      <span class="tab-ic">${ic(icon)}${badge ? `<b class="badge">${badge}</b>` : ''}</span><span class="tab-lb">${label}</span></button>`;
  return `
  <div class="bgfx" aria-hidden="true"></div>
  <header class="top">
    <div class="brand"><i class="xc"></i><span>Xurri<em>points</em></span></div>
    <button class="duo ${S.tab === 'couple' ? 'on' : ''}" data-act="tab" data-tab="couple" aria-label="Pareja y ajustes">${av(ME())}${av(PA())}<span class="duo-gear">${ic('settings')}</span></button>
  </header>
  ${S.be.kind === 'firebase' && !navigator.onLine ? `<div class="offline">${ic('wifi-off')} Sin conexión · lo que apuntes se sube al volver</div>` : ''}
  ${S.be.kind === 'demo' ? `<button class="demo-bar" data-act="demo-switch">Demo · eres <b>${esc(prof(ME()).name)}</b> ${ic('repeat-2')} cambiar</button>` : ''}
  <main class="view ${S.enter ? 'enter' : ''}" id="view">${views[S.tab]()}</main>
  <nav class="tabs">
    ${tab('home', 'heart', 'Inicio', nHome)}
    ${tab('tasks', 'list-checks', 'Tareas', nTasks)}
    <button class="tab-add" data-act="add-menu" aria-label="Apuntar algo"><span>${ic('plus')}</span></button>
    ${tab('money', 'wallet', 'Dinero')}
    ${tab('plans', 'party-popper', 'Juntos')}
  </nav>`;
}

/* ---------------- INICIO ---------------- */
function requestRow(t) {
  const redeem = t.type === 'redeem';
  return `<div class="todo ${redeem ? 'vale' : 'claim'}">
    <span class="td-e">${esc(t.emoji || '✨')}</span>
    <span class="td-body"><small>${esc(prof(t.createdBy).name)} ${redeem ? 'te pide un favor' : 'ha hecho'}</small><b>${esc(t.title)}</b>
      ${t.note ? `<small>“${esc(t.note)}”</small>` : ''}
      <small>${redeem ? `Si aceptas, te llegan ${coin(t.amount)}` : `${coin('+' + t.amount)} · cuenta sola en ${hoursLeft(t)} h`}</small></span>
    <span class="td-act">
      <button class="btn mint sm" data-act="approve" data-id="${t.id}">${redeem ? 'Aceptar' : '¡Gracias!'}</button>
      <button class="btn ghost sm" data-act="reject" data-id="${t.id}">${redeem ? 'Ahora no' : 'Hablar'}</button>
    </span>
  </div>`;
}
function thanksRowHome(t) {
  return `<div class="todo thanks"><span class="td-e">${esc(t.emoji || '💛')}</span>
    <span class="td-body"><small>${esc(pname())} te da las gracias</small><b>${esc(t.text)}</b></span>
    <button class="btn sm" data-act="thanks-seen" data-id="${t.id}" aria-label="Me encanta">❤️</button></div>`;
}
function proposalRow(p) {
  return `<div class="todo prop"><span class="td-e">🤝</span>
    <span class="td-body"><small>${esc(prof(p.by).name)} propone</small><b>${esc(p.text)}</b><small>Cambia cuando digas que sí</small></span>
    <span class="td-act">
      <button class="btn mint sm" data-act="prop-yes" data-id="${p.id}">Vale</button>
      <button class="btn ghost sm" data-act="prop-no" data-id="${p.id}">Lo hablamos</button>
    </span></div>`;
}
function logRow(l) {
  const canUndo = l.data && !l.restoredAt;
  return `<div class="todo log"><span class="td-e">📝</span>
    <span class="td-body"><small>Cambio · ${ago(l.createdAt)}</small><b>${esc(prof(l.by).name)} ${esc(l.text)}</b></span>
    <span class="td-act">
      <button class="btn sm" data-act="log-seen" data-id="${l.id}">Visto</button>
      ${canUndo ? `<button class="btn ghost sm" data-act="log-restore" data-id="${l.id}">${/del$/.test(l.kind) ? 'Recuperar' : 'Deshacer'}</button>` : ''}
    </span></div>`;
}
function myRequestRow(t) {
  return `<div class="mini-row">
    <span class="mr-emoji">${esc(t.emoji || '✨')}</span>
    <span class="mr-body"><b>${esc(t.title)}</b><small>${t.type === 'redeem' ? 'Favor pedido' : `Apuntado · cuenta solo en ${hoursLeft(t)} h`} · ${coin(t.amount)} · ${ago(t.createdAt)}</small></span>
    <button class="btn sm ghost" data-act="cancel" data-id="${t.id}">Anular</button>
  </div>`;
}

function historyRow(t) {
  const me = ME();
  const other = esc(pname());
  const st = L.effStatus(t);
  const who = {
    claim: t.to === me ? 'Lo hiciste tú' : `Lo hizo ${other}`,
    reward: t.createdBy === me ? `Se lo apuntaste a ${other}` : `${other} te lo apuntó`,
    redeem: t.from === me ? 'Pediste un favor' : `${other} te pidió un favor`,
    gift: t.from === me ? `Regalaste a ${other}` : `${other} te regaló`,
  }[t.type] || '';
  let sign = 'neutral', num = String(t.amount);
  if (st === 'approved' || st === 'pending') {
    if (t.to === me) { sign = 'plus'; num = '+' + t.amount; }
    else if (t.from === me) { sign = 'minus'; num = '−' + t.amount; }
  }
  const pill = L.isAutoAccepted(t) ? '<span class="pill auto">Contó solo</span>'
    : ({ pending: '<span class="pill wait">Pendiente</span>', rejected: '<span class="pill no">Lo habláis</span>', cancelled: '<span class="pill off">Anulado</span>' }[st] || '');
  return `<div class="hist ${st}">
    <span class="h-emoji">${esc(t.emoji || '✨')}</span>
    <span class="h-body"><b>${esc(t.title)}</b><small>${who} · ${ago(t.createdAt)} ${pill}</small>
      ${t.reply ? `<small class="h-reply">💬 “${esc(t.reply)}”</small>` : ''}</span>
    <span class="h-amt ${sign}">${num}</span>
  </div>`;
}

/* Primeros pasos: una lista corta en Inicio que se va marcando sola (el tutorial "haciendo"). */
const STEP_INFO = {
  tasks: ['🧽', 'Apuntad las tareas de casa'],
  split: ['⭐', 'Elegid cómo repartís los gastos'],
  expense: ['💸', 'Apuntad un gasto'],
  thanks: ['💛', 'Dad las primeras gracias'],
  vales: ['🎟️', 'Mirad qué favores podéis pediros'],
  notify: ['🔔', 'Activa el recordatorio diario'],
};
function stepsCard() {
  if (lsGet('xp_steps_off')) return '';
  const steps = L.firstSteps(S.data, ME(), { points: !noPoints(), notify: notifyHour() != null, sawVales: !!lsGet('xp_saw_vales') });
  const done = steps.filter(s => s.done).length;
  if (done === steps.length) return '';
  const next = steps.find(s => !s.done);
  return `<section class="card steps block">
    <div class="steps-head"><b>Primeros pasos</b><small>${done} de ${steps.length}</small>
      <button class="btn link sm" data-act="steps-hide">Ocultar</button></div>
    <span class="goal-bar"><span style="width:${Math.round(done / steps.length * 100)}%"></span></span>
    <div class="steps-list">${steps.map(s => {
      const [e, t] = STEP_INFO[s.id];
      return `<button class="step ${s.done ? 'done' : ''} ${s === next ? 'next' : ''}" data-act="step-go" data-v="${s.id}" ${s.done ? 'disabled' : ''}>
        <span class="st-ic">${s.done ? ic('check') : e}</span><span class="st-t">${t}</span>${s.done ? '' : ic('chevron-right')}</button>`;
    }).join('')}</div>
  </section>`;
}

function viewHome() {
  const me = ME(), P = S.data.points, pts = !noPoints();
  const toDecide = pendingForMe();
  const mine = pts ? P.filter(t => L.effStatus(t) === 'pending' && t.createdBy === me) : [];
  const thanks = (S.data.thanks || []).filter(t => t.to === me && !t.seenAt).sort(byNewest).slice(0, 3);
  const props = proposalsForMe(), logs = logsForMe().slice(0, 4);
  const today = L.ymd();
  const myTasks = activeTasks().filter(t => (t.assignee === me || !t.assignee) && t.due && t.due <= today).slice(0, 4);
  const net = L.netBalances(S.data.expenses, MEMBERS());
  const n = props.length + thanks.length + logs.length + toDecide.length + myTasks.length;
  // Lenguaje neutro: "para cuadrar", no "me debes" (el dinero es de los dos y sin prisas).
  const money = Math.abs(net[me]) < 1 ? '✨ Cuentas en paz'
    : `🤝 Para cuadrar: ${net[me] > 0 ? `${esc(pname())} → tú` : `tú → ${esc(pname())}`} <b>${eur(Math.abs(net[me]))}</b>`;
  return `
  ${updateBanner()}
  ${pts ? heroTogether() : ''}
  ${stepsCard()}
  <section class="block">
    <h2 class="h">Para ti ${n ? `<span class="count">${n}</span>` : ''}</h2>
    ${n ? `<div class="stack tight">${props.map(proposalRow).join('')}${thanks.map(thanksRowHome).join('')}${logs.map(logRow).join('')}${toDecide.map(requestRow).join('')}${myTasks.map(taskRow).join('')}</div>`
      : `<p class="empty">Todo al día ✨<br><small>Para apuntar algo, toca el <b>+</b> de abajo.</small></p>`}
    ${mine.length ? `<button class="btn link sm" data-act="ptab-go" data-v="hist">⏳ ${mine.length === 1 ? '1 cosa esperando' : `${mine.length} cosas esperando`} a ${esc(pname())}</button>` : ''}
    ${myProposals().length ? `<button class="btn link sm" data-act="props-sheet">🤝 ${myProposals().length === 1 ? '1 propuesta esperando' : `${myProposals().length} propuestas esperando`} a ${esc(pname())}</button>` : ''}
  </section>

  <button class="line-row" data-act="tab" data-tab="money"><span>${money}</span>${ic('chevron-right')}</button>
  ${questionCard()}`;
}
/** Arriba en Inicio: la META JUNTOS es la protagonista (cooperar, no competir: regla 4).
    Tus puntos salen pequeños y solo los tuyos; nada de marcador "tú contra tu pareja". */
function heroTogether() {
  const P = S.data.points, me = ME();
  const g = C().goal, target = g ? Math.max(1, num(g.target)) : 1;
  const prog = g ? L.goalProgress(P, g) : 0, pct = Math.min(100, Math.round(prog / target * 100));
  const wk = L.weekTogether(P);
  const mineAvail = L.available(P, MEMBERS(), me);
  return `<section class="hero">
    ${g ? `<button class="hero-goal big ${prog >= target ? 'done' : ''}" data-act="goal-edit">
        <span class="hg-e">${esc(g.emoji)}</span>
        <span class="hg-body"><small>${prog >= target ? '¡Meta conseguida! 🎉 Toca para celebrarlo' : 'Vuestra meta juntos'}</small>
          <b>${esc(g.title)}</b><span class="goal-bar"><span style="width:${pct}%"></span></span>
          <small>${prog} de ${target} puntos entre los dos${wk ? ` · +${wk} esta semana` : ''}</small></span></button>`
      : `<button class="hero-goal big" data-act="goal-edit"><span class="hg-e">🎯</span><span class="hg-body"><b>Poneos una meta juntos</b><small>Los puntos de los dos suman</small></span></button>`}
    <button class="hero-me" data-act="tab" data-tab="points">
      <span>Tienes ${coin(mineAvail)} para pedir favores</span><em>Vales ${ic('chevron-right')}</em></button>
  </section>`;
}

/* ---------------- PUNTOS ---------------- */
function viewPoints() {
  const tabs = [['vales', '🎟️ Vales'], ['earn', '✅ Acciones'], ['hist', '🕘 Historial']];
  if (!tabs.some(t => t[0] === S.ptab)) S.ptab = 'vales';
  const avail = L.available(S.data.points, MEMBERS(), ME());
  if (S.ptab === 'vales') lsSet('xp_saw_vales', '1'); // primer paso: "mirad qué favores podéis pediros"
  const catProps = pendingProposals().filter(p => p.kind === 'catalog').length;
  const propsLine = catProps ? `<button class="btn link sm" data-act="props-sheet">🤝 ${catProps === 1 ? '1 cambio' : `${catProps} cambios`} del catálogo esperando respuesta</button>` : '';
  let body = '';
  if (S.ptab === 'earn') {
    const items = catalog().earn;
    body = `<p class="hint">Toca una para apuntarla (tuya o de ${esc(pname())}). Los mimos no se cobran: para eso está <b>Gracias</b> 💛</p>${propsLine}
      <div class="earn-grid">${items.map((it, i) => `
        <div class="earn" style="--i:${i}">
          <button class="earn-main" data-act="earn-item" data-id="${esc(it.id)}"><span class="earn-emoji">${esc(it.emoji)}</span><b>${esc(it.title)}</b>${coin('+' + it.pts)}</button>
          <button class="edit-dot" data-act="cat-edit" data-kind="earn" data-id="${esc(it.id)}" aria-label="Editar">${ic('pencil')}</button>
        </div>`).join('')}
        <button class="earn add" data-act="cat-new" data-kind="earn">${ic('plus')}<b>Nueva acción</b></button>
      </div>`;
  } else if (S.ptab === 'vales') {
    const items = catalog().spend;
    body = `<p class="hint">Tienes ${coin(avail)} para pedir favores a ${esc(pname())}. Son <b>favores</b>, no permisos 💛</p>${propsLine}
      <div class="stack">${items.map((it, i) => couponCard(it, i, avail)).join('')}
        <button class="coupon add" data-act="cat-new" data-kind="spend">${ic('plus')} Nuevo vale</button>
      </div>`;
  } else {
    const mine = S.data.points.filter(t => L.effStatus(t) === 'pending' && t.createdBy === ME()).sort(byNewest);
    const all = [...S.data.points].sort(byNewest);
    body = `${mine.length ? `<h2 class="h sm">Esperando a ${esc(pname())}</h2><div class="card list">${mine.map(myRequestRow).join('')}</div><h2 class="h sm block">Todo</h2>` : ''}
      ${all.length ? `<div class="card list">${all.map(historyRow).join('')}</div>` : `<p class="empty">Todavía no hay movimientos.</p>`}`;
  }
  return `${pageHead('Puntos y vales', { back: true, help: 'points' })}${hintCard('points')}
    <div class="seg" role="tablist">${tabs.map(([k, l]) => `<button class="${S.ptab === k ? 'on' : ''}" data-act="ptab" data-v="${k}">${l}</button>`).join('')}</div>
    ${body}`;
}
const COUPON_TINTS = ['butter', 'rose', 'lilac', 'mint', 'peach'];
function couponCard(it, i, avail) {
  const pts = num(it.pts);
  const short = avail < pts;
  return `<div class="coupon ${COUPON_TINTS[i % COUPON_TINTS.length]} ${short ? 'short' : ''}" style="--i:${i}">
    <button class="cp-main" data-act="vale-item" data-id="${esc(it.id)}">
      <span class="cp-emoji">${esc(it.emoji)}</span>
      <span class="cp-body"><small>Vale por</small><b>${esc(it.title)}</b>${short ? `<em>Te faltan ${pts - avail}</em>` : ''}</span>
      <span class="cp-price"><i class="xc"></i>${pts}</span>
    </button>
    <button class="edit-dot" data-act="cat-edit" data-kind="spend" data-id="${esc(it.id)}" aria-label="Editar">${ic('pencil')}</button>
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
      ${t.pts && !noPoints() ? coin('+' + num(t.pts), 'sm') : ''}
    </button>
  </div>`;
}

function viewTasks() {
  const [a, b] = MEMBERS();
  const { load } = L.taskLoad(S.data.tasks, MEMBERS());
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
  // La barra es una PREGUNTA para hablar ("¿os parece justo?"), no un marcador de quién hace más.
  return `${pageHead('Tareas', { help: 'tasks', action: `<button class="btn sm soft" data-act="task-new">${ic('plus')} Nueva</button>` })}${hintCard('tasks')}
    ${tot ? `<button class="load-mini" data-act="task-target" aria-label="Reparto de tareas: ${esc(prof(a).name)} ${pa}%, ${esc(prof(b).name)} ${100 - pa}%">
      <span class="lm-top"><b>¿Os parece justo el reparto?</b><small>acordado ${target}/${100 - target} ${ic('pencil')}</small></span>
      <span class="loadbar"><span class="a" style="width:${pa}%"></span><span class="b" style="width:${100 - pa}%"></span><i class="target" style="left:${target}%"></i></span>
      <span class="lm-legend"><span>${av(a, 'xs')} ${esc(prof(a).name)} ${pa}%</span><span>${100 - pa}% ${esc(prof(b).name)} ${av(b, 'xs')}</span></span>
      <small class="lm-note">Carga de la semana según lo apuntado. Si no os cuadra, habladlo 💬</small>
    </button>` : ''}
    ${nFree ? `<button class="btn link sm" data-act="task-auto">${ic('shuffle')} Repartir ${nFree === 1 ? 'la tarea libre' : `las ${nFree} libres`} de forma justa</button>` : ''}
    <div class="chips scroll">${filters.map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-act="task-filter" data-v="${k}">${esc(l)}</button>`).join('')}</div>
    ${groups.map(([title, list]) => list.length ? `<section class="block"><h2 class="h sm">${title}</h2><div class="stack tight">${list.map(taskRow).join('')}</div></section>` : '').join('')}
    ${!S.data.tasks.length ? `<section class="card typical"><b>¿Empezáis con las típicas? 🧽</b>
        <small>${TYPICAL_TASKS.map(t => t[0] + ' ' + t[1]).join(' · ')}</small>
        <div class="row-btns"><button class="btn primary sm" data-act="task-typical">Añadirlas (${TYPICAL_TASKS.length})</button>
        <button class="btn sm soft" data-act="task-new">${ic('plus')} Una a una</button></div></section>`
      : !act.length ? `<p class="empty">No hay tareas aquí.<br><button class="btn sm soft" data-act="task-new">${ic('plus')} Añadir una</button></p>` : ''}
    ${done.length ? `<section class="block">
      <button class="btn link sm" data-act="toggle-done">${S.showDone ? 'Ocultar' : 'Ver'} hechas (${done.length})</button>
      ${S.showDone ? `<div class="stack tight">${done.map(taskRow).join('')}</div>` : ''}
    </section>` : ''}`;
}

/* ---------------- GASTOS ---------------- */
function modeLabel(e) {
  if (e.kind === 'settle') return 'Liquidación';
  if (e.mode === 'default') return '⭐ Vuestro reparto';
  if (e.mode === 'custom' && e.shares && e.amount) {
    const [a] = MEMBERS();
    return esc(cap(splitWords('custom', null, Math.round((e.shares[a] || 0) / e.amount * 100))));
  }
  return esc(cap(splitWords(e.mode, e.sugar, e.customPctA ?? 50)));
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
    <span class="exp-body"><b>${esc(e.title || c[2])}</b><small>${e.recurringId ? '🔁 ' : ''}${e.paidBy === me ? 'Pagaste tú' : `Pagó ${esc(prof(e.paidBy).name)}`} · ${modeLabel(e)}</small></span>
    <span class="exp-amt">${eur(e.amount)}<small>tu parte ${eur((e.shares || {})[me] || 0)}</small></span>
  </button>`;
}

function viewMoney() {
  const segs = `<div class="seg">${[['exp', '💸 Gastos'], ['save', '🐷 Ahorro']].map(([k, l]) => `<button class="${S.mtab === k ? 'on' : ''}" data-act="mtab" data-v="${k}">${l}</button>`).join('')}</div>`;
  if (S.mtab === 'save') return `${pageHead('Dinero', { help: 'money', action: `<button class="btn sm soft" data-act="jar-new">${ic('plus')} Hucha</button>` })}${hintCard('money')}${segs}${viewSavings()}`;
  const me = ME(), pa = PA();
  const net = L.netBalances(S.data.expenses, MEMBERS());
  const d = defaultSplit();
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
  const even = Math.abs(net[me]) < 1;
  return `${pageHead('Dinero', { help: 'money', action: `<button class="btn sm soft" data-act="exp-new">${ic('plus')} Gasto</button>` })}${hintCard('money')}${segs}
    <section class="card sum-card">
      <div class="sum-row">${even
        ? `<span class="sum-e">✨</span><span class="sum-body"><small>Cuentas</small><b>En paz, todo cuadrado</b></span>`
        : `<span class="sum-e">🤝</span><span class="sum-body"><small>Para cuadrar · sin prisa</small><b>${net[me] < 0 ? `Tú → ${esc(pname())}` : `${esc(pname())} → tú`} ${eur(Math.abs(net[me]))}</b></span>
           <button class="btn sm primary" data-act="settle">Liquidar</button>`}</div>
      <button class="sum-row" data-act="split-default"><span class="sum-e">⭐</span>
        <span class="sum-body"><small>Vuestro reparto (por defecto)</small><b>${esc(cap(splitWords(d.mode, d.sugar, d.customPctA)))}</b></span>
        <span class="sum-edit">Cambiar ${ic('chevron-right')}</span></button>
      <div class="sum-row"><span class="sum-e">📅</span><span class="sum-body"><small>Este mes</small><b>${eur(total)}</b></span>
        ${total ? `<small class="sum-side">tú pagaste ${Math.round(paidMe / total * 100)}%</small>` : ''}</div>
      ${topCats.length ? `<div class="chips sum-cats">${topCats.map(([c, v]) => `<span class="chip static">${catOf(c)[1]} ${eur(v)}</span>`).join('')}</div>` : ''}
    </section>
    ${recurringSection()}
    ${groups.map(g => `<section class="block"><h2 class="h sm cap">${gLabel(g.k)}</h2><div class="card list">${g.list.map(expenseRow).join('')}</div></section>`).join('')}
    ${!exps.length ? `<p class="empty">Apuntad vuestro primer gasto con <b>+ Gasto</b>. Se reparte con «vuestro reparto» y lo podéis cambiar en cada uno.</p>` : ''}`;
}

/* ---------------- PAREJA ---------------- */
function viewCouple() {
  const me = ME(), pa = PA(), p = prof(me), q = prof(pa);
  const t = taskPctA();
  const [a, b] = MEMBERS();
  const since = new Date(C().createdAt || Date.now());
  const incomeTxt = x => (x.income ? `${eur(x.income)}/mes` : 'sin indicar');
  const pts = !noPoints(), demo = S.be.kind === 'demo';
  const nProps = pendingProposals().length;
  const g = C().goal;
  const row = (act, icon, title, sub, extra = '', end = ic('chevron-right')) =>
    `<button class="set-row" data-act="${act}" ${extra}><span class="sr-ic">${icon}</span><span class="sr-body"><b>${title}</b><small>${sub}</small></span>${end}</button>`;
  return `${pageHead('Pareja', { back: true, help: 'couple' })}${hintCard('couple')}
    <section class="couple-hero">
      <div class="ch-avs">${av(me, 'xl')}<span class="ch-heart">💗</span>${av(pa, 'xl')}</div>
      <p class="ch-names">${esc(p.name)} <span>&</span> ${esc(q.name)}</p>
      <p class="muted small">Juntos en Xurripoints desde el ${since.getDate()} de ${MONTHS[since.getMonth()]} de ${since.getFullYear()}</p>
    </section>

    <h2 class="h sm set-h">Vosotros</h2>
    <section class="card list">
      ${row('profile-edit', esc(p.emoji), 'Tu perfil', `${esc(p.name)} · Sugar ${p.sugar === 'papi' ? 'papi 🕶️' : 'mami 💅'} · ${incomeTxt(p)}`)}
      <div class="set-row"><span class="sr-ic">${esc(q.emoji)}</span><span class="sr-body"><b>${esc(q.name)}</b><small>Sugar ${q.sugar === 'papi' ? 'papi 🕶️' : 'mami 💅'} · ${incomeTxt(q)}</small></span></div>
      ${row('quick', '🫙', 'Tarro de gracias', `${(S.data.thanks || []).length} gracias guardadas`, 'data-type="thanks"')}
      <div class="set-row"><span class="sr-ic">🔑</span><span class="sr-body"><b>Código de pareja</b><small class="mono">${esc(S.code || C().code || '')}</small></span></div>
    </section>

    <h2 class="h sm set-h">Lo que acordáis <small>se cambia con una propuesta</small></h2>
    <section class="card list">
      ${nProps ? row('props-sheet', '🤝', `Propuestas pendientes · ${nProps}`, 'Lo que espera un «vale» de uno de los dos') : ''}
      ${row('split-default', '⭐', 'Reparto de gastos', esc(cap(splitWords(defaultSplit().mode, defaultSplit().sugar, defaultSplit().customPctA))))}
      ${row('task-target', '⚖️', 'Reparto de tareas', `${esc(prof(a).name)} ${t}% · ${esc(prof(b).name)} ${100 - t}%`)}
      ${pts ? row('ptab-go', '🎟️', 'Acciones y vales', `${catalog().earn.length} acciones · ${catalog().spend.length} vales · toca el lápiz para cambiarlos`, 'data-v="earn"') : ''}
      ${pts ? row('goal-edit', esc((g || {}).emoji || '🎯'), 'Meta juntos', `${g ? `${esc(g.title)} · ${num(g.target)} puntos` : 'Sin meta'}${(C().goalsDone || []).length ? ` · ${(C().goalsDone || []).length} conseguidas 🏆` : ''}`) : ''}
      ${row('points-toggle', '🪙', 'Puntos y vales', pts ? 'Activados · toca si preferís pausarlos' : 'En pausa · toca para proponer volver a activarlos', '', `<span class="sw-mini ${pts ? 'on' : ''}" aria-hidden="true"></span>`)}
      ${row('changes-sheet', '📝', 'Historial de cambios', 'Qué ha cambiado cada uno (y recuperar lo borrado)')}
    </section>

    <h2 class="h sm set-h">Ayuda</h2>
    <section class="card list">
      ${row('welcome', '💡', '¿Cómo funciona?', 'La explicación rápida, en 5 pasos')}
      ${row('steps-show', '✅', 'Primeros pasos', 'La lista de Inicio para empezar')}
      ${row('hints-reset', '❔', 'Ayudas de cada pantalla', 'Volver a ver la explicación de cada pestaña')}
      ${row('tips', '🌿', 'Para que la app sume', 'Ideas para usarla sin llevar la cuenta')}
    </section>

    <h2 class="h sm set-h">App</h2>
    <section class="card list">
      ${row('notify-sheet', '🔔', 'Recordatorio diario', notifyHour() != null ? `Activado · a las ${notifyHour()}:00` : 'Desactivado')}
      ${row('share-app', '📲', 'Pasar la app a alguien', 'Envía el enlace de descarga por WhatsApp', '', ic('share-2'))}
      ${row('check-update', '✨', `Versión ${VERSION}`, S.update && L.isNewer(S.update, VERSION) ? `Hay una nueva: ${esc(S.update)} · toca para descargarla` : 'Toca para buscar actualizaciones', '', ic('refresh-cw'))}
    </section>

    <h2 class="h sm set-h">Cuenta</h2>
    <section class="card list">
      ${demo ? `
        ${row('demo-switch', '🔁', 'Cambiar de persona', `Ahora eres ${esc(p.name)}`, '', '')}
        ${row('demo-reset', '🧹', 'Reiniciar la demo', 'Vuelve a los datos de ejemplo', '', '')}
        ${row('leave', '🚪', 'Salir de la pareja', 'Pruébalo: verás lo que le queda a quien se queda', '', '')}
        ${row('demo-exit', '👋', 'Salir del modo demo', hasFirebaseConfig() ? 'Para crear vuestra cuenta de verdad' : 'Borra los datos de prueba', '', '')}`
      : `
        <div class="set-row"><span class="sr-ic">✉️</span><span class="sr-body"><b>Tu cuenta</b><small>${esc(S.user.email || '')}</small></span></div>
        ${row('logout', '🔒', 'Cerrar sesión', 'Tus datos siguen guardados en la nube', '', '')}
        ${row('leave', '🚪', 'Salir de la pareja', `${esc(q.name)} conserva lo común; tus ingresos se borran`, '', '')}
        ${row('delete-sheet', '🗑️', 'Borrar mi cuenta', 'Sales de la pareja y se borra tu cuenta', '', '')}`}
    </section>
    <p class="foot">Xurripoints v${VERSION} · hecho con 💞</p>`;
}

/* Hojas de Pareja: propuestas, historial de cambios y borrar la cuenta */
function propsSheet() {
  const theirs = proposalsForMe(), mine = myProposals();
  const item = (p, act) => `<div class="hist"><span class="h-emoji">🤝</span><span class="h-body"><b>${esc(p.text)}</b>
      <small>${p.by === ME() ? 'Propones tú' : `Propone ${esc(prof(p.by).name)}`} · ${ago(p.createdAt)}</small></span>${act}</div>`;
  return `<h3 class="sheet-title">Propuestas 🤝</h3>
    <p class="muted">Lo que afecta a los dos cambia cuando los dos decís que sí.</p>
    ${theirs.length ? `<h4 class="h sm">Te toca responder</h4><div class="card list">${theirs.map(p => item(p, `<span class="td-act">
        <button class="btn mint sm" data-act="prop-yes" data-id="${p.id}">Vale</button>
        <button class="btn ghost sm" data-act="prop-no" data-id="${p.id}">Lo hablamos</button></span>`)).join('')}</div>
      ${theirs.length > 1 ? `<button class="btn mint wide" data-act="prop-all">Aceptarlas todas (${theirs.length})</button>` : ''}` : ''}
    ${mine.length ? `<h4 class="h sm block">Esperando a ${esc(pname())}</h4><div class="card list">${mine.map(p => item(p, `<button class="btn sm ghost" data-act="prop-cancel" data-id="${p.id}">Anular</button>`)).join('')}</div>` : ''}
    ${!theirs.length && !mine.length ? `<p class="empty">No hay nada pendiente ✨</p>` : ''}`;
}
function changesSheet() {
  const logs = ((S.data.log) || []).map(l => ({ ...l, _t: 'log' }));
  const props = PROPOSALS().filter(p => p.status !== 'pending').map(p => ({ ...p, _t: 'prop' }));
  const all = [...logs, ...props].sort(byNewest).slice(0, 40);
  const ST = { accepted: ['✅', 'aceptada'], rejected: ['💬', 'lo habláis'], cancelled: ['↩️', 'anulada'] };
  return `<h3 class="sheet-title">Historial de cambios 📝</h3>
    <p class="muted">Lo que ha cambiado cada uno. Nada cambia a escondidas.</p>
    ${all.length ? `<div class="card list">${all.map(x => x._t === 'log'
      ? `<div class="hist"><span class="h-emoji">📝</span><span class="h-body"><b>${esc(prof(x.by).name)} ${esc(x.text)}</b>
          <small>${ago(x.createdAt)}${x.restoredAt ? ' · recuperado' : ''}</small></span>
          ${x.data && !x.restoredAt && x.by !== ME() ? `<button class="btn sm ghost" data-act="log-restore" data-id="${x.id}">${/del$/.test(x.kind) ? 'Recuperar' : 'Deshacer'}</button>` : ''}</div>`
      : `<div class="hist"><span class="h-emoji">${(ST[x.status] || ['🤝'])[0]}</span><span class="h-body"><b>${esc(prof(x.by).name)} propuso: ${esc(x.text)}</b>
          <small>${ago(x.createdAt)} · ${(ST[x.status] || ['', x.status])[1]}</small></span></div>`).join('')}</div>`
      : `<p class="empty">Aún no ha cambiado nada ✨</p>`}`;
}
function deleteSheet() {
  return `<h3 class="sheet-title">Borrar mi cuenta 🗑️</h3>
    <p class="muted">Sales de la pareja y se borra tu cuenta. ${esc(pname())} conserva lo que habéis apuntado juntos (sin tus ingresos). Si eres el último, se borra todo. <b>No se puede deshacer.</b></p>
    <label class="field"><span>Escribe tu contraseña para confirmar</span>
      <input class="inp" id="del-pass" type="password" autocomplete="current-password"></label>
    <button class="btn danger big wide" data-act="delete-do">Borrar mi cuenta</button>`;
}

/* ================================================================
   HOJAS (bottom sheets) y avisos
   ================================================================ */
function openSheet(html, { onMount, ctx } = {}) {
  const root = $('#sheet-root');
  clearTimeout(S.closeTimer); root.classList.remove('closing');
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
  S.sheet = null; S.tool = null;
  document.body.classList.remove('noscroll');
  if (instant) { root.classList.remove('open', 'closing'); root.innerHTML = ''; return; }
  root.classList.add('closing');
  S.closeTimer = setTimeout(() => { root.classList.remove('open', 'closing'); root.innerHTML = ''; }, 180);
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

/* ---------------- Diálogos (confirmar y bienvenida) ---------------- */
/** Diálogo con varias salidas. buttons = [[valor, texto, 'primary'|'danger'|'']]. Devuelve el valor o null (cancelar). */
function askChoice({ title, text = '', buttons }) {
  if (S.dialog) S.dialog(null);
  return new Promise(resolve => {
    const root = $('#dialog-root');
    root.innerHTML = `<div class="dlg-scrim" data-dlg=""></div>
      <div class="dlg" role="alertdialog" aria-modal="true" aria-label="${esc(title)}">
        <h3 class="dlg-title">${esc(title)}</h3>${text ? `<p class="muted">${esc(text)}</p>` : ''}
        <div class="dlg-btns ${buttons.length > 1 ? 'col' : ''}">${buttons.map(([v, l, cls]) => `<button class="btn ${cls || ''}" data-dlg="${esc(v)}">${esc(l)}</button>`).join('')}
          <button class="btn ghost" data-dlg="">Cancelar</button></div>
      </div>`;
    root.classList.add('open');
    const done = v => { root.classList.remove('open'); root.innerHTML = ''; root.onclick = null; S.dialog = null; resolve(v || null); };
    S.dialog = done;
    root.onclick = e => { const b = e.target.closest('[data-dlg]'); if (b) done(b.dataset.dlg); };
  });
}
/** Confirmación con el estilo de la app (sustituye a confirm()). Devuelve una promesa true/false. */
async function askConfirm({ title, text = '', ok = 'Sí', danger = false }) {
  return (await askChoice({ title, text, buttons: [['1', ok, danger ? 'danger' : 'primary']] })) === '1';
}

/* ---------------- Bienvenida (tutorial en 5 pasos, con dibujitos de la app) ---------------- */
const WELCOME = [
  { v: `<div class="wv-chips"><span>🧽 Tareas</span><span>💸 Gastos</span><span>🍿 Planes</span><span>💛 Gracias</span></div>`,
    t: 'Vuestra casa, en equipo', x: 'Para organizaros en pareja <b>sin llevar la cuenta</b>: tareas, gastos, planes y gracias.' },
  { v: `<div class="wv-plus">${ic('plus')}</div>`,
    t: 'Todo empieza en el +', x: 'El botón <b>+</b> de abajo sirve para apuntar cualquier cosa: una tarea hecha, un gasto, unas gracias…' },
  { v: `<div class="wv-task"><span class="wv-check">${ic('check')}</span><b>Fregar los platos</b><span class="pts"><i class="xc"></i>+10</span></div>
        <div class="wv-coupon">🎟️ Vale por: <b>elijo yo la peli</b></div>`, points: true,
    t: 'Las tareas dan puntos', x: 'Con ellos os pedís <b>favores</b> (nunca permisos). Los mimos no se cobran: para eso está <b>Gracias</b> 💛' },
  { v: `<div class="wv-split"><span class="a" style="width:55%"></span><span class="b" style="width:45%"></span></div><div class="wv-cap">🤝 Para cuadrar: 24 € · sin prisa</div>`,
    t: 'Dinero sin dramas', x: 'Elegís <b>cómo repartís</b> una vez y cada gasto se reparte solo. La app os dice cuánto hay que cuadrar.' },
  { v: `<div class="wv-goal"><span>🏖️</span><span class="goal-bar"><span style="width:62%"></span></span></div>`,
    t: 'Sois un equipo', x: 'Lo que afecta a los dos (repartos, precios) se cambia con una <b>propuesta</b> que el otro acepta. Y en Inicio, <b>primeros pasos</b> para empezar.' },
];
const DEMO_SLIDE = { v: `<div class="wv-plus demo">${ic('repeat-2')}</div>`, t: 'Estás en la versión de prueba', x: 'Todo se guarda en este móvil. Con la barra de arriba <b>cambias de persona</b> para probar a pedir y a responder.' };
function maybeWelcome() { if (!lsGet('xp_welcome_v2') && !S.dialog) showWelcome(); }
function showWelcome() {
  if (S.dialog) S.dialog(false);
  const pts = !(S.data && S.data.couple && noPoints());
  const base = WELCOME.filter(s => pts || !s.points);
  const slides = S.be && S.be.kind === 'demo' ? [...base, DEMO_SLIDE] : base;
  const root = $('#dialog-root');
  let i = 0;
  const paint = () => {
    const s = slides[i];
    const last = i === slides.length - 1;
    root.innerHTML = `<div class="welcome" role="dialog" aria-modal="true" aria-label="Cómo funciona">
      <button class="btn link wl-skip" data-wl="close">Saltar</button>
      <div class="wl-card"><div class="wl-visual" aria-hidden="true">${s.v}</div><p class="wl-step">Paso ${i + 1} de ${slides.length}</p>
        <h2 class="wl-title">${s.t}</h2><p class="wl-text">${s.x}</p></div>
      <div class="wl-dots">${slides.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</div>
      <div class="wl-btns">${i ? `<button class="btn icon" data-wl="prev" aria-label="Anterior">${ic('arrow-left')}</button>` : ''}
        <button class="btn primary big" data-wl="${last ? 'close' : 'next'}">${last ? '¡Empezamos! 💞' : 'Siguiente'}</button></div>
    </div>`;
    icons();
  };
  const go = step => { i = Math.max(0, Math.min(slides.length - 1, i + step)); paint(); };
  const close = () => { lsSet('xp_welcome_v2', '1'); root.classList.remove('open'); root.innerHTML = ''; root.onclick = root.ontouchstart = root.ontouchend = null; S.dialog = null; };
  S.dialog = close;
  root.classList.add('open');
  root.onclick = e => { const b = e.target.closest('[data-wl]'); if (b) { const a = b.dataset.wl; if (a === 'close') close(); else go(a === 'next' ? 1 : -1); } };
  let x0 = null;
  root.ontouchstart = e => { x0 = e.touches[0].clientX; };
  root.ontouchend = e => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1); };
  paint();
}

/* ---------------- Gastos fijos ---------------- */
/** Apunta los gastos fijos que tocan (id fijo por mes → nunca duplica aunque lo hagan los dos móviles). */
function runRecurring() {
  const members = MEMBERS();
  const incomes = splitIncomes();
  for (const tpl of S.data.recurring || []) {
    const months = L.recurringDue(tpl);
    if (!months.length) continue;
    const lastM = months[months.length - 1];
    if (S.recurringDone.has(`${tpl.id}_${lastM}`)) continue;
    S.recurringDone.add(`${tpl.id}_${lastM}`);
    S.be.update('recurring', tpl.id, { lastMonth: lastM }).catch(err => toast(errMsg(err)));
    const sp = tpl.mode === 'default' ? defaultSplit() : tpl; // "⭐ vuestro reparto" → el que tengáis ahora
    for (const m of months) {
      const opts = { members, incomes, sugar: sp.sugar, customPctA: sp.customPctA ?? 50 };
      S.be.set('expenses', `rec_${tpl.id}_${m}`, {
        kind: 'expense', title: tpl.title, category: tpl.category, amount: tpl.amount, paidBy: tpl.paidBy,
        mode: sp.mode, sugar: sp.mode === 'sugar' ? sp.sugar : null, shares: L.computeShares(tpl.amount, sp.mode, opts),
        date: L.recurringDate(m, tpl.day), recurringId: tpl.id, createdBy: tpl.createdBy || ME(), createdAt: Date.now(),
      }).catch(err => toast(errMsg(err)));
    }
  }
}
function recurringSection() {
  const recs = S.data.recurring || [];
  if (!recs.length) return '';
  const me = ME();
  const monthly = recs.reduce((t, r) => t + (r.amount || 0), 0);
  return `<details class="fold block" data-k="rec"><summary>🔁 Gastos fijos <small>${recs.length} · ${eur(monthly)}/mes</small>${ic('chevron-down')}</summary>
    <div class="card list">${recs.map(r => `
    <button class="exp" data-act="tpl-edit" data-id="${esc(r.id)}">
      <span class="exp-ic">${catOf(r.category)[1]}</span>
      <span class="exp-body"><b>${esc(r.title)}</b><small>Día ${num(r.day)} · ${r.paidBy === me ? 'Pagas tú' : `Paga ${esc(prof(r.paidBy).name)}`} · ${modeLabel(r)}</small></span>
      <span class="exp-amt">${eur(r.amount)}<small>al mes</small></span>
    </button>`).join('')}</div>
    <p class="muted small">Para añadir otro: <b>+ Gasto</b> → Más opciones → Gasto fijo.</p></details>`;
}

/* ---------------- Actualizaciones (GitHub Releases) ---------------- */
function updateBanner() {
  if (!S.update || !L.isNewer(S.update, VERSION)) return '';
  return `<button class="update-bar" data-act="open-url" data-url="${APK_URL}">${ic('sparkles')}
    <span><b>Hay una versión nueva (${esc(S.update)})</b><small>Toca para descargarla e instalarla encima</small></span>${ic('download')}</button>`;
}
/** Mira la última release publicada (como mucho cada 6 h, salvo que se fuerce). Solo dentro del APK. */
async function checkUpdate(force = false) {
  if (!isNative() && !force) return null;
  if (!force && Date.now() - Number(lsGet('xp_upd_at') || 0) < 6 * 3600e3) { S.update = lsGet('xp_upd_v'); return S.update; }
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json' } });
    if (!r.ok) return null;
    const v = String((await r.json()).tag_name || '').replace(/^v/, '');
    lsSet('xp_upd_at', String(Date.now())); lsSet('xp_upd_v', v);
    S.update = v;
    if (S.phase === 'app' && !$('#sheet-root.open') && L.isNewer(v, VERSION)) render();
    return v;
  } catch (e) { return null; }
}

/* ---------------- Confianza, meta, gracias y pregunta del día ---------------- */
function hoursLeft(t) { return Math.max(1, Math.ceil((L.AUTO_ACCEPT_MS - (Date.now() - (t.createdAt || 0))) / 3600e3)); }

function goalSheet() {
  const g0 = C().goal, g = g0 ? { ...g0, target: Math.max(1, num(g0.target)) } : null;
  const done = g && L.goalProgress(S.data.points, g) >= g.target;
  const cur = done ? { title: '', emoji: '🎯', target: g.target } : (g || { title: '', emoji: '🎯', target: 500 });
  const form = `<div class="stack">
      <div class="emoji-line"><input class="inp emoji-inp" id="gl-emoji" maxlength="4" value="${esc(cur.emoji)}" aria-label="Emoji">
        <input class="inp" id="gl-title" maxlength="40" value="${esc(cur.title)}" placeholder="Escapada, cena especial, concierto…"></div>
      <div class="emoji-row">${['🏖️', '🍣', '🎢', '🎬', '🏕️', '💆', '🎤', '✈️'].map(e => `<button type="button" class="emo sm" data-act="set-emoji" data-target="gl-emoji" data-v="${e}">${e}</button>`).join('')}</div>
      <div class="field"><span>¿Cuántos puntos entre los dos?</span>
        <div class="chips" id="gl-target">${[200, 300, 500, 800, 1000].map(n => `<button type="button" class="chip ${n === cur.target ? 'on' : ''}" data-act="pick" data-v="${n}"><i class="xc"></i>${n}</button>`).join('')}</div></div>
      <button class="btn primary big" data-act="goal-save" data-renew="${done ? '1' : ''}">${done ? 'Empezar nueva meta' : 'Guardar'}</button>
    </div>`;
  if (done) {
    setTimeout(() => celebrate(['🎉', '💞', '✨', '🏆']), 200);
    return `<div class="big-emoji">${esc(g.emoji)}</div><h3 class="sheet-title center">¡Lo habéis conseguido!</h3>
      <p class="muted center">«${esc(g.title)}» · ${g.target} puntos entre los dos. Ahora toca hacerlo de verdad 💞</p>
      <h4 class="h sm">Siguiente meta</h4>${form}`;
  }
  return `<h3 class="sheet-title">Meta juntos 🎯</h3>
    <p class="muted">Todos los puntos que ganáis <b>los dos</b> suman aquí. Es un objetivo común, no una competición.</p>${form}`;
}
function thanksSheet() {
  const list = [...(S.data.thanks || [])].sort(byNewest).slice(0, 25);
  return `<h3 class="sheet-title">Dar las gracias 💛</h3>
    <p class="muted">Sin puntos: solo para que ${esc(pname())} sepa que lo has visto. Pequeños gracias a diario cuidan mucho la relación.</p>
    <div class="chips" id="th-quick">${THANKS_PRESETS.map(([e, t]) => `<button type="button" class="chip" data-act="pick" data-v="${e}|${esc(t)}">${e} ${esc(t)}</button>`).join('')}</div>
    <input class="inp" id="th-text" maxlength="120" placeholder="O escribe: Gracias por…">
    <button class="btn primary big wide" data-act="do-thanks">${ic('heart')} Enviar gracias</button>
    ${list.length ? `<h4 class="h sm jar-title">Vuestro tarro de gracias 🫙</h4><div class="card list">${list.map(t => `
      <div class="hist"><span class="h-emoji">${esc(t.emoji || '💛')}</span><span class="h-body"><b>${esc(t.text)}</b>
        <small>${t.from === ME() ? `Para ${esc(pname())}` : `De ${esc(pname())}`} · ${ago(t.createdAt)}${t.reaction ? ` · ${esc(t.reaction)}` : ''}</small></span></div>`).join('')}</div>` : ''}`;
}
function tipsSheet() {
  const tips = [
    ['💛', 'Los mimos no se cobran', 'Un masaje o un detalle valen más si no tienen precio. Para eso está <b>Gracias</b>.'],
    ['🎟️', 'Vales = favores, no permisos', 'Cada uno tiene derecho a su tiempo y a sus amigos. Los vales son para pedir ayuda o caprichos.'],
    ['🤝', 'Confianza por defecto', 'Lo que apuntas cuenta solo en 24 h. No hace falta revisar cada cosa que hace el otro.'],
    ['🎯', 'Sois un equipo', 'Los puntos de los dos llenan una meta común. Mirad la barra, no quién tiene más.'],
    ['🤝', 'Lo común se acuerda', 'Repartos, precios y volver a los puntos se cambian con una <b>propuesta</b> que el otro acepta. Y todo cambio se ve en el historial.'],
    ['🗣️', 'Lo importante se habla', 'Si algo se repite o molesta, habladlo en persona. La app ayuda, no sustituye una conversación.'],
    ['🌿', 'Es un juego', 'Si un día no apetece apuntar nada, no pasa nada. Y si los puntos sobran, <b>pausadlos</b> en Pareja → Puntos y vales.'],
    ['🚩', 'Si algo no va bien', 'Si la app se usa para controlar o dar permisos, pausad los puntos y hablad. Cada uno puede <b>salir de la pareja</b> cuando quiera. Si hay miedo, pedid ayuda (en España, el 016 es gratis y no sale en la factura).'],
  ];
  return `<h3 class="sheet-title">Para que la app sume 🌿</h3>
    <p class="muted">Pensado con lo que dice la psicología de pareja.</p>
    <div class="tips">${tips.map(([e, t, x]) => `<div class="tip-row"><span class="tip-e">${e}</span><span><b>${t}</b><small>${x}</small></span></div>`).join('')}</div>`;
}
function questionCard() {
  const q = QUESTIONS[(L.dayIndex(QUESTIONS.length) + S.qShift) % QUESTIONS.length];
  return `<section class="question block"><small>💬 Para hablar hoy, sin móvil</small><p>${esc(q)}</p>
    <button class="btn link sm" data-act="q-next">Otra pregunta</button></section>`;
}

/* ---------------- PLANES (decidir juntos) ---------------- */
const findIdea = id => (S.data.ideas || []).find(x => x.id === id);
function viewJuntos() {
  const tabs = [['ideas', '💡 Ideas'], ['decide', '🎲 Decidir'], ['play', '🎮 Jugar']];
  const body = S.jtab === 'decide' ? viewDecide() : S.jtab === 'play' ? viewPlay() : viewPlans();
  return `${pageHead('Juntos', { help: 'plans', action: S.jtab === 'ideas' ? `<button class="btn sm soft" data-act="idea-new">${ic('plus')} Idea</button>` : '' })}${hintCard('plans')}
    <div class="seg">${tabs.map(([k, l]) => `<button class="${S.jtab === k ? 'on' : ''}" data-act="jtab" data-v="${k}">${l}</button>`).join('')}</div>${body}`;
}
function viewPlans() {
  const members = MEMBERS(), me = ME();
  const all = (S.data.ideas || []).filter(x => x.list === S.itab);
  const open = all.filter(x => !x.doneAt);
  const matches = open.filter(x => L.ideaState(x, members).match);
  const others = open.filter(x => !L.ideaState(x, members).match).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const toVote = open.filter(x => !(x.votes || {})[me]);
  const done = all.filter(x => x.doneAt).sort((a, b) => b.doneAt - a.doneAt);
  return `<div class="chips">${IDEA_LISTS.map(([k, e, l]) => `<button class="chip ${S.itab === k ? 'on' : ''}" data-act="itab" data-v="${k}">${e} ${l}</button>`).join('')}</div>
    <section class="card decide">
      <p><b>¿No os decidís?</b><small>${matches.length ? `Coincidís en ${matches.length} ${matches.length === 1 ? 'idea' : 'ideas'} 💞` : 'Votad las ideas: cuando los dos decís que sí, hay match 💞'}</small></p>
      <div class="row-btns">
        <button class="btn primary" data-act="idea-roulette" ${open.length ? '' : 'disabled'}>${ic('dices')} Elegir al azar</button>
        <button class="btn soft" data-act="idea-swipe" ${toVote.length ? '' : 'disabled'}>${ic('thumbs-up')} Votar${toVote.length ? ` (${toVote.length})` : ''}</button>
      </div>
    </section>
    ${matches.length ? `<section class="block"><h2 class="h sm">Os apetece a los dos 💞</h2><div class="stack tight">${matches.map(ideaRow).join('')}</div></section>` : ''}
    <section class="block"><h2 class="h sm">Ideas</h2>${others.length ? `<div class="stack tight">${others.map(ideaRow).join('')}</div>` : `<p class="empty">Apuntad ideas con el + 💡</p>`}</section>
    ${done.length ? `<section class="block"><button class="btn link sm" data-act="toggle-done-ideas">📸 Recuerdos: lo que ya hicisteis (${done.length})</button>
      ${S.showDoneIdeas ? `<div class="stack tight">${done.map(ideaRow).join('')}</div>` : ''}</section>` : ''}`;
}
function ideaRow(x) {
  const members = MEMBERS(), me = ME(), v = x.votes || {};
  const st = L.ideaState(x, members);
  // El voto de tu pareja se ve cuando has votado tú (así nadie se deja llevar).
  const dot = u => {
    const hidden = u !== me && !v[me];
    const cls = hidden ? (v[u] ? 'hidden' : '') : v[u] === 1 ? 'up' : v[u] === -1 ? 'down' : '';
    return `<span class="vote-dot ${cls}" title="${hidden && v[u] ? 'Ya ha votado' : ''}">${av(u, 'xs')}</span>`;
  };
  const dt = x.doneAt ? new Date(x.doneAt) : null;
  return `<div class="idea ${st.match ? 'match' : ''} ${x.doneAt ? 'done' : ''}">
    <button class="idea-main" data-act="idea-open" data-id="${x.id}"><b>${esc(x.title)}</b>${x.note ? `<small>${esc(x.note)}</small>` : ''}${dt ? `<small>📸 ${dt.getDate()} de ${MONTHS[dt.getMonth()]}</small>` : ''}</button>
    <span class="idea-votes">${members.map(dot).join('')}</span>
    ${x.doneAt ? '' : `<span class="idea-my">
      <button class="vbtn ${v[me] === 1 ? 'on up' : ''}" data-act="idea-vote" data-id="${x.id}" data-v="1" aria-label="Me apetece">👍</button>
      <button class="vbtn ${v[me] === -1 ? 'on down' : ''}" data-act="idea-vote" data-id="${x.id}" data-v="-1" aria-label="No me apetece">👎</button></span>`}
  </div>`;
}
function voteIdea(id, v, fromSwipe = false) {
  const x = findIdea(id); if (!x) return;
  const me = ME(), pa = PA();
  const cur = (x.votes || {})[me] || 0;
  const next = !fromSwipe && cur === v ? 0 : v; // tocar otra vez el mismo voto lo quita
  S.be.update('ideas', id, { [`votes.${me}`]: next }).catch(err => toast(errMsg(err)));
  if (next === 1 && (x.votes || {})[pa] === 1) { celebrate(['💞', '🍿', '✨']); toast(`¡Match! A los dos os apetece: ${x.title} 💞`); }
}
function ideaForm(x) {
  const isNew = !x;
  x = x || { title: '', note: '', list: S.itab };
  return `<h3 class="sheet-title">${isNew ? 'Nueva idea 💡' : 'Idea'}</h3>
    <div class="stack">
      <div class="seg" id="id-list">${IDEA_LISTS.map(([k, e, l]) => `<button type="button" class="${x.list === k ? 'on' : ''}" data-act="pick" data-v="${k}">${e} ${l}</button>`).join('')}</div>
      <input class="inp" id="id-title" maxlength="80" value="${esc(x.title)}" placeholder="${x.list === 'pelis' ? 'Título de la peli o serie' : x.list === 'comida' ? 'Qué os apetece comer' : 'Un plan que os apetezca'}">
      <input class="inp" id="id-note" maxlength="140" value="${esc(x.note || '')}" placeholder="Dónde, enlace, notas… (opcional)">
      <button class="btn primary big" data-act="idea-save" data-id="${isNew ? '' : x.id}">Guardar</button>
      ${isNew ? '' : `<button class="btn mint" data-act="idea-done" data-id="${x.id}">${x.doneAt ? '↩️ Volver a ideas' : '📸 ¡Lo hicimos!'}</button>
        <button class="btn soft-berry" data-act="idea-delete" data-id="${x.id}">${ic('trash-2')} Borrar</button>`}
    </div>`;
}
/* Votar de una en una (tipo "swipe") */
function openSwipe() {
  const me = ME();
  const queue = (S.data.ideas || []).filter(x => x.list === S.itab && !x.doneAt && !(x.votes || {})[me]).map(x => x.id);
  openSheet('', { ctx: { queue, pos: 0, total: queue.length } });
  paintSwipe();
}
function nextSwipe() { if (!S.sheet || !S.sheet.queue) return; S.sheet.pos++; paintSwipe(); }
function paintSwipe() {
  const c = S.sheet;
  if (!c || !c.queue) return;
  if (c.pos >= c.queue.length) {
    const m = (S.data.ideas || []).filter(x => x.list === S.itab && !x.doneAt && L.ideaState(x, MEMBERS()).match).length;
    swapSheet(`<div class="big-emoji">🎉</div><h3 class="sheet-title center">¡Listo!</h3>
      <p class="muted center">${m ? `Coincidís en ${m} ${m === 1 ? 'idea' : 'ideas'} 💞` : `Cuando ${esc(pname())} vote, veréis en qué coincidís 💞`}</p>
      <button class="btn primary big wide" data-act="sheet-close">Vale</button>`);
    return;
  }
  const x = findIdea(c.queue[c.pos]);
  if (!x) { c.pos++; paintSwipe(); return; }
  swapSheet(`<p class="muted center">${c.pos + 1} de ${c.total}</p>
    <div class="swipe-card"><span class="sw-list">${IDEA_LISTS.find(l => l[0] === x.list)[1]}</span><b>${esc(x.title)}</b>${x.note ? `<small>${esc(x.note)}</small>` : ''}</div>
    <div class="swipe-btns">
      <button class="btn big soft-berry" data-act="swipe-vote" data-id="${x.id}" data-v="-1">👎 Paso</button>
      <button class="btn big mint" data-act="swipe-vote" data-id="${x.id}" data-v="1">👍 Me apetece</button>
    </div>
    <button class="btn link wide" data-act="swipe-skip">Saltar</button>`);
}
/* Ruleta: elige entre los match (o entre las ideas que nadie ha vetado) */
function openRoulette() {
  const members = MEMBERS();
  const open = (S.data.ideas || []).filter(x => x.list === S.itab && !x.doneAt);
  const matches = open.filter(x => L.ideaState(x, members).match);
  const pool = matches.length ? matches : open.filter(x => !L.ideaState(x, members).vetoed);
  if (!pool.length) { toast('No hay ideas sin veto. ¡Añadid alguna! 💡'); return; }
  const final = L.pickRandom(pool);
  openSheet(`<p class="muted center">${matches.length ? 'Entre lo que os apetece a los dos…' : 'Entre las ideas que nadie ha vetado…'}</p>
    <div class="roulette"><b id="rl-title">…</b></div>
    <div class="row-btns" id="rl-btns" hidden><button class="btn" data-act="idea-roulette">${ic('dices')} Otra</button><button class="btn primary" data-act="sheet-close">¡Vamos! 💞</button></div>`);
  let n = 0;
  const token = S.rouletteToken = (S.rouletteToken || 0) + 1; // si se abre otra ruleta, esta deja de pintar
  const spin = () => {
    const el = $('#rl-title'); if (!el || token !== S.rouletteToken) return;
    n++;
    if (n < 14) { el.textContent = L.pickRandom(pool).title; setTimeout(spin, 50 + n * 12); }
    else { el.textContent = final.title; el.parentElement.classList.add('landed'); $('#rl-btns').hidden = false; celebrate(['🎲', '💞', '✨']); }
  };
  spin();
}

/* ---------------- JUNTOS · Decidir (moneda, dados, ruleta) ---------------- */
const WHEEL_COLORS = ['#FFD3E0', '#E0D8FF', '#FFE7A0', '#C9EFDD', '#FFD9C2', '#F3D2F0'];
function wheelPreset(k) {
  const open = list => (S.data.ideas || []).filter(x => x.list === list && !x.doneAt).map(x => x.title).slice(0, 12);
  if (k === 'who') return [prof(ME()).name, pname()];
  if (k === 'cena') return open('comida').length >= 2 ? open('comida') : ['Pizza', 'Sushi', 'Tacos', 'Pasta'];
  if (k === 'peli') return open('pelis').length >= 2 ? open('pelis') : ['Comedia', 'Acción', 'Romántica', 'Documental'];
  if (k === 'plan') return open('planes').length >= 2 ? open('planes') : ['Paseo', 'Cine', 'Juegos de mesa', 'Cena fuera'];
  return ['Sí', 'No'];
}
function wheelHtml(opts) {
  const n = Math.max(opts.length, 1), seg = 360 / n;
  const color = i => WHEEL_COLORS[(i === n - 1 && n % WHEEL_COLORS.length === 1) ? 1 : i % WHEEL_COLORS.length];
  const bg = opts.length ? `conic-gradient(${opts.map((_, i) => `${color(i)} ${i * seg}deg ${(i + 1) * seg}deg`).join(',')})` : 'var(--line)';
  const max = n <= 4 ? 16 : n <= 8 ? 12 : 9;
  const short = t => (t.length > max ? t.slice(0, max - 1) + '…' : t);
  return `<div class="wheel" id="wheel" style="background:${bg};transform:rotate(${S.wheelRot}deg)">
    ${opts.map((o, i) => `<span class="wl-label" style="transform:rotate(${i * seg + seg / 2}deg)"><em>${esc(short(o))}</em></span>`).join('')}</div>`;
}
function dieHtml(v, k) { return `<span class="die" id="die${k}">${Array.from({ length: 9 }, (_, p) => `<i class="${DIE_PIPS[v].includes(p) ? 'on' : ''}"></i>`).join('')}</span>`; }
/* Decidir: tres tarjetas; cada herramienta se abre en su hoja (antes las tres a la vez: pantalla muy larga). */
const TOOLS = [['coin', '🪙', 'Cara o cruz', 'O «¿a quién le toca?»'], ['dice', '🎲', 'Dados', 'Uno o dos'], ['wheel', '🎡', 'Ruleta', '¿Qué cenamos? ¿Qué vemos?']];
function viewDecide() {
  return `<p class="hint">Para cuando no os ponéis de acuerdo… que decida la suerte 🍀</p>
    <div class="games">${TOOLS.map(([k, e, t, d], i) => `<button class="game-card" style="--i:${i}" data-act="tool-open" data-v="${k}">
      <span class="gc-e">${e}</span><b>${t}</b><small>${d}</small></button>`).join('')}</div>`;
}
function paintTool() { if (S.tool && $('#sheet-root.open')) swapSheet(toolHtml(S.tool)); }
function toolHtml(k) {
  const opts = S.spinning && S.spinOpts ? S.spinOpts : L.parseOptions(S.wheelText);
  if (k === 'coin') return `<section class="tool">
    <div class="tool-head"><span class="tool-e">🪙</span><b>Cara o cruz</b></div>
    <div class="chips">${[['coin', 'Cara o cruz'], ['who', '¿A quién le toca?']].map(([k, l]) => `<button class="chip ${S.coinMode === k ? 'on' : ''}" data-act="coin-mode" data-v="${k}">${l}</button>`).join('')}</div>
    <button class="coin-flip" data-act="flip" aria-label="Lanzar la moneda"><span class="cf-coin ${S.coinFace === 't' ? 'face-t' : ''}" id="cf-coin">
      <span class="cf-face front"><i class="xc"></i></span><span class="cf-face back">✚</span></span></button>
    <p class="tool-res" id="cf-res">${S.flipping ? '…' : S.coinRes ? `<b>${esc(S.coinRes)}</b>` : 'Toca la moneda'}</p>
    <p class="coin-legend">${S.coinMode === 'who' ? `💗 ${esc(prof(MEMBERS()[0]).name)} · ✚ ${esc(prof(MEMBERS()[1]).name)}` : '💗 Cara · ✚ Cruz'}</p>
  </section>`;
  if (k === 'dice') return `<section class="tool">
    <div class="tool-head"><span class="tool-e">🎲</span><b>Dados</b></div>
    <div class="chips">${[1, 2].map(n => `<button class="chip ${S.dice === n ? 'on' : ''}" data-act="dice-n" data-v="${n}">${n} ${n === 1 ? 'dado' : 'dados'}</button>`).join('')}</div>
    <button class="dice-row" data-act="roll" aria-label="Tirar los dados">${Array.from({ length: S.dice }, (_, k) => dieHtml(S.lastDice[k] || 1, k)).join('')}</button>
    <p class="tool-res" id="dice-res">${S.diceRes ? `<b>${esc(S.diceRes)}</b>` : 'Toca los dados'}</p>
  </section>`;
  return `<section class="tool">
    <div class="tool-head"><span class="tool-e">🎡</span><b>Ruleta</b></div>
    <div class="chips scroll">${[['who', '🙋 ¿Quién?'], ['cena', '🍽️ ¿Qué cenamos?'], ['peli', '🎬 ¿Qué vemos?'], ['plan', '📍 ¿Qué hacemos?'], ['yesno', '👍 Sí o no']]
      .map(([k, l]) => `<button class="chip" data-act="wheel-preset" data-v="${k}" ${S.spinning ? 'disabled' : ''}>${l}</button>`).join('')}</div>
    <textarea class="inp" id="wh-opts" rows="3" placeholder="Escribe opciones: una por línea o separadas por comas" ${S.spinning ? 'readonly' : ''}>${esc(S.wheelText)}</textarea>
    <div class="wheel-wrap"><span class="wheel-pointer" aria-hidden="true"></span>${wheelHtml(opts)}
      <button class="wheel-hub" data-act="spin" ${opts.length < 2 || S.spinning ? 'disabled' : ''}>¡Girar!</button></div>
    <p class="tool-res" id="wh-res">${S.spinning ? 'Girando…' : S.wheelRes ? `🎉 <b>${esc(S.wheelRes)}</b>` : opts.length < 2 ? 'Pon al menos 2 opciones' : 'Toca ¡Girar!'}</p>
  </section>`;
}
function flipCoin() {
  const el = $('#cf-coin'); if (!el || S.flipping) return; // un lanzamiento cada vez
  S.flipping = true;
  const heads = L.randInt(2) === 0; // 50 % exacto con el generador del sistema
  el.classList.remove('flip-h', 'flip-t', 'face-t'); void el.offsetWidth;
  el.classList.add(heads ? 'flip-h' : 'flip-t');
  $('#cf-res').textContent = '…';
  setTimeout(() => {
    S.flipping = false;
    S.coinFace = heads ? 'h' : 't';
    const u = heads ? MEMBERS()[0] : MEMBERS()[1];
    S.coinRes = S.coinMode === 'who' ? (u === ME() ? 'Te toca a ti 🙋' : `Le toca a ${pname()} 👉`) : heads ? 'Cara 💗' : 'Cruz ✚';
    const c = $('#cf-coin'); if (c) { c.classList.remove('flip-h', 'flip-t'); c.classList.toggle('face-t', !heads); }
    const r = $('#cf-res'); if (r) r.innerHTML = `<b>${esc(S.coinRes)}</b>`;
    vibrate(20);
  }, 1150);
}
function rollDice() {
  if (S.rolling) return; // una tirada cada vez
  S.rolling = true;
  const n = S.dice; let k = 0;
  const tick = () => {
    const vals = Array.from({ length: n }, () => 1 + L.randInt(6));
    vals.forEach((v, i) => { const d = $(`#die${i}`); if (d) d.outerHTML = dieHtml(v, i); });
    $$('.die').forEach(d => d.classList.add('rolling'));
    if (++k < 10) { setTimeout(tick, 55 + k * 8); return; }
    $$('.die').forEach(d => d.classList.remove('rolling'));
    S.rolling = false;
    S.lastDice = vals; // el resultado es la última cara que se ve
    S.diceRes = n > 1 ? `${vals[0]} + ${vals[1]} = ${vals[0] + vals[1]}` : `Ha salido un ${vals[0]}`;
    const r = $('#dice-res'); if (r) r.innerHTML = `<b>${esc(S.diceRes)}</b>`;
    vibrate(20);
  };
  tick();
}
function spinWheel() {
  if (S.spinning) return; // un giro cada vez
  const opts = L.parseOptions(S.wheelText);
  if (opts.length < 2) { toast('Pon al menos 2 opciones ✍️'); return; }
  const i = L.randInt(opts.length); // todas las opciones con la misma probabilidad
  const seg = 360 / opts.length;
  S.spinning = true; S.spinOpts = opts; S.wheelRes = '';
  // Se para dentro del trozo elegido (a ±30 % del centro para que parezca natural, nunca en el borde).
  S.wheelRot = L.wheelTarget(S.wheelRot, i, opts.length, 5, (L.rand() - 0.5) * seg * 0.6);
  const w = $('#wheel'); if (w) w.style.transform = `rotate(${S.wheelRot}deg)`;
  const r = $('#wh-res'); if (r) r.textContent = 'Girando…';
  const hub = $('.wheel-hub'); if (hub) hub.disabled = true;
  const ta = $('#wh-opts'); if (ta) ta.readOnly = true;
  $$('[data-act="wheel-preset"]').forEach(b => { b.disabled = true; });
  setTimeout(() => {
    S.spinning = false; S.spinOpts = null;
    S.wheelRes = opts[i];
    const res = $('#wh-res'); if (res) res.innerHTML = `🎉 <b>${esc(opts[i])}</b>`;
    const h = $('.wheel-hub'); if (h) h.disabled = false;
    const t = $('#wh-opts'); if (t) t.readOnly = false;
    $$('[data-act="wheel-preset"]').forEach(b => { b.disabled = false; });
    celebrate(['🎡', '✨', '💞']);
  }, 3400);
}

/* ---------------- JUNTOS · Jugar (en el mismo móvil) ---------------- */
const GAMES = [
  ['ttt', '❌⭕', 'Tres en raya', 'El clásico. Rápido y sin trampas.'],
  ['c4', '🟣🩷', 'Conecta 4', 'Cuatro en línea antes que tu churri.'],
  ['rps', '✊✋✌️', 'Piedra, papel o tijera', 'Elige en secreto y pásale el móvil.'],
  ['tot', '🤔', 'Esto o aquello', '¿Coincidís? Cada uno elige en secreto.'],
  ['who', '🫵', '¿Quién es más probable…?', 'A la de tres, señalad a quién. Risas aseguradas.'],
];
function viewPlay() {
  return `<p class="hint">Juegos para dos en el mismo móvil, para cuando os aburrís juntos 😄</p>
    <div class="games">${GAMES.map(([k, e, t, d], i) => `<button class="game-card" style="--i:${i}" data-act="game-open" data-g="${k}">
      <span class="gc-e">${e}</span><b>${t}</b><small>${d}</small></button>`).join('')}</div>`;
}
const RPS = [['piedra', '✊', 'Piedra'], ['papel', '✋', 'Papel'], ['tijera', '✌️', 'Tijera']];
function newGame(g, prev) {
  const [a, b] = MEMBERS();
  const starter = prev && prev.starter ? (prev.starter === a ? b : a) : MEMBERS()[L.randInt(2)]; // 1.ª al azar, luego se alterna
  if (g === 'ttt') return { g, b: Array(9).fill(null), turn: starter, starter, res: null };
  if (g === 'c4') return { g, b: Array(L.C4_COLS * L.C4_ROWS).fill(null), turn: starter, starter, res: null, last: -1 };
  if (g === 'rps') return { g, phase: 'p1', first: starter, starter, picks: {} };
  if (g === 'tot') return { g, deck: L.shuffle(THIS_OR_THAT).slice(0, 7), i: 0, phase: 'p1', first: starter, starter, picks: {}, hits: 0 };
  return { g, deck: L.shuffle(WHO_MORE), i: 0 };
}
function openGame(g) {
  S.game = newGame(g);
  if (!S.gscore[g]) S.gscore[g] = { [MEMBERS()[0]]: 0, [MEMBERS()[1]]: 0, draw: 0 };
  openSheet(renderGame(), { ctx: { game: true } });
}
function paintGame() { if (S.game && $('#sheet-root.open')) swapSheet(renderGame()); }
const mark = u => `<span class="mk ${side(u)}">${u === MEMBERS()[0] ? '✕' : '◯'}</span>`;
function scoreLine(g) {
  const sc = S.gscore[g], [a, b] = MEMBERS();
  return `<div class="g-score">${av(a, 'xs')} <b>${sc[a]}</b><span>·</span><b>${sc[b]}</b> ${av(b, 'xs')}${sc.draw ? `<small>(${sc.draw} ${sc.draw === 1 ? 'empate' : 'empates'})</small>` : ''}</div>`;
}
function finishRound(g, res) {
  if (!res) return;
  S.gscore[g][res.who === 'draw' ? 'draw' : res.who]++;
  if (res.who !== 'draw') celebrate(['🏆', '✨', '💞']);
}
function renderGame() {
  const G = S.game, [a, b] = MEMBERS(), nm = u => esc(prof(u).name);
  const title = GAMES.find(x => x[0] === G.g)[2];
  if (G.g === 'ttt' || G.g === 'c4') {
    const res = G.res;
    const status = res ? (res.who === 'draw' ? 'Empate 🤝' : `¡Gana ${nm(res.who)}! 🏆`) : `Turno de ${nm(G.turn)} ${G.g === 'ttt' ? mark(G.turn) : `<span class="disc ${side(G.turn)} sm"></span>`}`;
    const board = G.g === 'ttt'
      ? `<div class="ttt">${G.b.map((c, i) => `<button class="cell ${c ? side(c) : ''} ${res && res.line.includes(i) ? 'win' : ''}" data-act="g-ttt" data-i="${i}" ${c || res ? 'disabled' : ''}>${c ? mark(c) : ''}</button>`).join('')}</div>`
      : `<div class="c4">${G.b.map((c, i) => `<button class="c4-cell" data-act="g-c4" data-c="${i % L.C4_COLS}" ${res ? 'disabled' : ''} aria-label="Columna ${i % L.C4_COLS + 1}">
          <span class="disc ${c ? side(c) : ''} ${res && res.line.includes(i) ? 'win' : ''} ${i === G.last ? 'drop' : ''}"></span></button>`).join('')}</div>`;
    return `<h3 class="sheet-title">${title}</h3>${scoreLine(G.g)}<p class="g-status">${status}</p>${board}
      ${res ? `<button class="btn primary big wide" data-act="g-again">Otra partida</button>` : ''}`;
  }
  if (G.g === 'rps' || G.g === 'tot') {
    const p1 = G.first, p2 = p1 === a ? b : a;
    const item = G.g === 'tot' ? G.deck[G.i] : null;
    const head = G.g === 'rps' ? `<h3 class="sheet-title">${title}</h3>${scoreLine('rps')}`
      : `<h3 class="sheet-title">${title}</h3><p class="muted">Ronda ${Math.min(G.i + 1, G.deck.length)} de ${G.deck.length} · coincidencias: <b>${G.hits}</b></p>`;
    const options = () => G.g === 'rps' ? RPS.map(([k, e, l]) => `<button class="pick-big" data-act="g-pick" data-v="${k}"><span>${e}</span>${l}</button>`).join('')
      : item.map((o, k) => `<button class="pick-big tot" data-act="g-pick" data-v="${k}">${esc(o)}</button>`).join('');
    if (G.phase === 'end') {
      return `${head}<div class="big-emoji">${G.hits >= 5 ? '💞' : G.hits >= 3 ? '😊' : '🤭'}</div>
        <p class="g-status">Coincidís en ${G.hits} de ${G.deck.length}</p>
        <p class="muted center">${G.hits >= 5 ? '¡Sois almas gemelas (al menos en esto)!' : G.hits >= 3 ? 'Ni tan iguales ni tan distintos: perfecto.' : 'Los opuestos se atraen, ¿no? 😄'}</p>
        <button class="btn primary big wide" data-act="g-again">Otra ronda</button>`;
    }
    if (G.phase === 'p1' || G.phase === 'p2') {
      const who = G.phase === 'p1' ? p1 : p2, other = who === a ? b : a;
      return `${head}<p class="g-status">${av(who, 'xs')} ${nm(who)}, elige en secreto</p>
        <p class="muted center">Que ${nm(other)} no mire 🙈</p>
        ${G.g === 'tot' ? `<p class="tot-q">¿Qué prefieres?</p>` : ''}<div class="picks">${options()}</div>`;
    }
    if (G.phase === 'pass') {
      return `${head}<div class="big-emoji">🤫</div><p class="g-status">¡Elegido!</p>
        <p class="muted center">Pásale el móvil a ${nm(p2)}</p>
        <button class="btn primary big wide" data-act="g-ready">Soy ${nm(p2)}, ¡listo!</button>`;
    }
    // revelar
    const pa1 = G.picks[p1], pa2 = G.picks[p2];
    if (G.g === 'rps') {
      const r = L.rpsResult(pa1, pa2);
      const e = k => RPS.find(x => x[0] === k)[1];
      return `${head}<div class="reveal"><span>${av(p1, 'xs')}<b>${e(pa1)}</b></span><em>vs</em><span><b>${e(pa2)}</b>${av(p2, 'xs')}</span></div>
        <p class="g-status">${r === 0 ? 'Empate 🤝' : `¡Gana ${nm(r === 1 ? p1 : p2)}! 🏆`}</p>
        <button class="btn primary big wide" data-act="g-again">Otra</button>`;
    }
    const same = pa1 === pa2;
    return `${head}<div class="reveal tot"><span>${av(p1, 'xs')} ${esc(item[pa1])}</span><span>${av(p2, 'xs')} ${esc(item[pa2])}</span></div>
      <p class="g-status">${same ? '¡Coincidís! 💞' : 'Esta vez no 🙃'}</p>
      <button class="btn primary big wide" data-act="g-next">${G.i + 1 < G.deck.length ? 'Siguiente' : 'Ver resultado'}</button>`;
  }
  // ¿Quién es más probable…?
  const q = G.deck[G.i % G.deck.length];
  return `<h3 class="sheet-title">${title}</h3>
    <div class="who-card"><small>¿Quién es más probable que…</small><b>${esc(q)}?</b></div>
    <p class="muted center">A la de tres, los dos señaláis 👉 1… 2… ¡3!</p>
    <div class="row-btns center-row">${av(a, 'lg')}${av(b, 'lg')}</div>
    <button class="btn primary big wide" data-act="g-next">Siguiente 🔀</button>`;
}
function playTtt(i) {
  const G = S.game; if (!G || G.res || G.b[i]) return;
  G.b[i] = G.turn;
  G.res = L.tttWinner(G.b);
  if (G.res) finishRound('ttt', G.res); else G.turn = G.turn === MEMBERS()[0] ? MEMBERS()[1] : MEMBERS()[0];
  vibrate(10); paintGame();
}
function playC4(c) {
  const G = S.game; if (!G || G.res) return;
  const r = L.c4Drop(G.b, c, G.turn);
  if (!r) { toast('Esa columna está llena'); return; }
  G.b = r.board; G.last = r.index;
  G.res = L.c4Winner(G.b);
  if (G.res) finishRound('c4', G.res); else G.turn = G.turn === MEMBERS()[0] ? MEMBERS()[1] : MEMBERS()[0];
  vibrate(10); paintGame();
}
function gamePick(v) {
  const G = S.game; if (!G) return;
  const [a, b] = MEMBERS(), p1 = G.first, p2 = p1 === a ? b : a;
  const val = G.g === 'tot' ? Number(v) : v;
  if (G.phase === 'p1') { G.picks[p1] = val; G.phase = 'pass'; }
  else if (G.phase === 'p2') {
    G.picks[p2] = val; G.phase = 'reveal';
    if (G.g === 'rps') { const r = L.rpsResult(G.picks[p1], G.picks[p2]); finishRound('rps', { who: r === 0 ? 'draw' : r === 1 ? p1 : p2 }); }
    else if (G.picks[p1] === G.picks[p2]) { G.hits++; celebrate(['💞', '✨']); }
  }
  vibrate(10); paintGame();
}
function gameNext() {
  const G = S.game; if (!G) return;
  if (G.g === 'who') { G.i++; paintGame(); return; }
  G.i++;
  if (G.i >= G.deck.length) G.phase = 'end';
  else { G.phase = 'p1'; G.picks = {}; G.first = G.first === MEMBERS()[0] ? MEMBERS()[1] : MEMBERS()[0]; }
  paintGame();
}

/* ---------------- Ahorro (huchas) ---------------- */
const findJar = id => (S.data.jars || []).find(j => j.id === id);
function viewSavings() {
  const jars = [...(S.data.jars || [])].sort((x, y) => (x.createdAt || 0) - (y.createdAt || 0));
  const saves = S.data.saves || [];
  const total = saves.reduce((t, x) => t + (x.amount || 0), 0);
  return `<section class="card save-total"><small>Ahorrado entre los dos</small><b>${eur(total)}</b>
      <small>${jars.length ? `en ${jars.length} ${jars.length === 1 ? 'hucha' : 'huchas'}` : 'Cread vuestra primera hucha con el +'}</small></section>
    ${jars.length ? `<div class="stack">${jars.map(j => {
      const saved = L.jarSaved(saves, j.id);
      const pct = j.target ? Math.min(100, Math.round(saved / j.target * 100)) : null;
      return `<div class="jar ${pct === 100 ? 'full' : ''}">
        <button class="jar-main" data-act="jar-open" data-id="${j.id}"><span class="jar-e">${esc(j.emoji)}</span>
          <span class="jar-body"><b>${esc(j.title)}</b>
            ${pct != null ? `<span class="goal-bar"><span style="width:${pct}%"></span></span>` : ''}
            <small>${eur(saved)}${j.target ? ` de ${eur(j.target)} · ${pct}%` : ''}</small></span></button>
        <button class="jar-add" data-act="save-add" data-id="${j.id}" aria-label="Añadir dinero">${ic('plus')}</button>
      </div>`;
    }).join('')}</div>` : `<p class="empty">Una hucha para algo que queráis los dos: un viaje, el sofá nuevo, un colchón para imprevistos… 🐷</p>`}
    <p class="tip">💡 Lo importante es el total, no quién pone más: cada uno aporta lo que puede.</p>`;
}
function jarForm(j) {
  const isNew = !j;
  j = j || { title: '', emoji: '✈️', target: 0 };
  return `<h3 class="sheet-title">${isNew ? 'Nueva hucha 🐷' : 'Editar hucha'}</h3>
    <div class="stack">
      <div class="emoji-line"><input class="inp emoji-inp" id="jr-emoji" maxlength="4" value="${esc(j.emoji)}" aria-label="Emoji">
        <input class="inp" id="jr-title" maxlength="40" value="${esc(j.title)}" placeholder="Viaje, sofá nuevo, imprevistos…"></div>
      <div class="emoji-row">${['✈️', '🛋️', '🏠', '🚗', '💍', '🐶', '🎄', '🛟', '🎁', '👶'].map(e => `<button type="button" class="emo sm" data-act="set-emoji" data-target="jr-emoji" data-v="${e}">${e}</button>`).join('')}</div>
      <label class="field"><span>Objetivo <small>(opcional)</small></span><div class="money-inp"><input class="inp" id="jr-target" inputmode="decimal" placeholder="0" value="${j.target ? eurPlain(j.target) : ''}"><b>€</b></div></label>
      <button class="btn primary big" data-act="jar-save" data-id="${isNew ? '' : j.id}">Guardar</button>
      ${isNew ? '' : `<button class="btn soft-berry" data-act="jar-delete" data-id="${j.id}">${ic('trash-2')} Borrar hucha</button>`}
    </div>`;
}
function jarSheet(j) {
  const saves = (S.data.saves || []).filter(x => x.jar === j.id).sort(byNewest);
  const saved = L.jarSaved(S.data.saves || [], j.id);
  const pct = j.target ? Math.min(100, Math.round(saved / j.target * 100)) : null;
  return `<div class="big-emoji">${esc(j.emoji)}</div><h3 class="sheet-title center">${esc(j.title)}</h3>
    <p class="save-big center">${eur(saved)}</p>
    ${pct != null ? `<span class="goal-bar"><span style="width:${pct}%"></span></span><p class="muted center">${pct}% de ${eur(j.target)}${pct === 100 ? ' · ¡Conseguido! 🎉' : ` · faltan ${eur(j.target - saved)}`}</p>` : ''}
    <div class="row-btns"><button class="btn mint" data-act="save-add" data-id="${j.id}">${ic('plus')} Añadir</button>
      <button class="btn" data-act="save-add" data-id="${j.id}" data-dir="out">${ic('minus')} Sacar</button></div>
    ${saves.length ? `<div class="card list jar-moves">${saves.map(x => `<div class="hist"><span class="h-emoji">${x.amount >= 0 ? '🐷' : '💸'}</span>
      <span class="h-body"><b>${x.note ? esc(x.note) : x.amount >= 0 ? 'Aportación' : 'Retirada'}</b><small>${x.by === ME() ? 'Tú' : esc(prof(x.by).name)} · ${esc(dueLabel(x.date))}</small></span>
      <span class="h-amt ${x.amount >= 0 ? 'plus' : 'minus'}">${x.amount >= 0 ? '+' : '−'}${eur(Math.abs(x.amount))}</span></div>`).join('')}</div>` : ''}
    <button class="btn link wide" data-act="jar-edit" data-id="${j.id}">${ic('pencil')} Editar hucha</button>`;
}
function saveForm(j, sign) {
  const me = ME(), pa = PA();
  return `<h3 class="sheet-title">${sign > 0 ? 'Añadir a' : 'Sacar de'} ${esc(j.emoji)} ${esc(j.title)}</h3>
    <div class="stack">
      <div class="amount-field"><input id="sv-amount" inputmode="decimal" placeholder="0,00" aria-label="Importe"><b>€</b></div>
      <div class="field"><span>${sign > 0 ? '¿Quién pone?' : '¿Quién lo saca?'}</span>
        <div class="seg who" id="sv-who">
          <button type="button" class="on" data-act="pick" data-v="${me}">${av(me, 'xs')} Yo</button>
          <button type="button" data-act="pick" data-v="${pa}">${av(pa, 'xs')} ${esc(pname())}</button>
          ${sign > 0 ? `<button type="button" data-act="pick" data-v="both">💞 Los dos</button>` : ''}
        </div></div>
      <input class="inp" id="sv-note" maxlength="60" placeholder="Nota (opcional): paga extra, cumpleaños…">
      <button class="btn ${sign > 0 ? 'primary' : ''} big" data-act="save-do" data-id="${j.id}" data-sign="${sign}">${sign > 0 ? '🐷 Añadir' : 'Sacar'}</button>
    </div>`;
}

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
  // "Lo ha hecho mi pareja" (antes "premiar"): apuntarle una tarea que hizo. Siempre tareas, nunca cariño.
  return `<h3 class="sheet-title">${claim ? '¿Qué has hecho? 💪' : `¿Qué ha hecho ${esc(pname())}? 🙌`}</h3>
    <p class="muted">${claim ? `${esc(pname())} te dará las gracias (y si se le pasa, cuenta solo en 24 h).` : `Se lo apuntas y le llegan los puntos al momento. Para los mimos, mejor <b>Gracias</b> 💛`}</p>
    <div class="pick-list">${items.map(it => `<button class="pick-row" data-act="do-points" data-type="${type}" data-id="${esc(it.id)}">
      <span class="pr-emoji">${esc(it.emoji)}</span><b>${esc(it.title)}</b>${coin('+' + num(it.pts))}</button>`).join('')}</div>
    <details class="custom-box"><summary>${ic('pencil-line')} Otra tarea…</summary>
      <div class="stack">
        <input class="inp" id="cu-title" maxlength="60" placeholder="${claim ? 'He montado el mueble de IKEA' : 'Ha montado la estantería'}">
        ${ptsChips('cu-pts', 10)}
        <button class="btn primary" data-act="do-points-custom" data-type="${type}">${claim ? 'Apuntar' : `Apuntárselo a ${esc(pname())}`}</button>
      </div>
    </details>
    ${claim ? '' : `<button class="btn link wide" data-act="quick" data-type="gift">o regálale de tus puntos 🎁</button>`}`;
}
function ptsChips(id, sel, list = [5, 10, 15, 20, 30, 50, 100]) {
  return `<div class="chips" id="${id}">${list.map(n => `<button type="button" class="chip ${n === sel ? 'on' : ''}" data-act="pick" data-v="${n}"><i class="xc"></i>${n}</button>`).join('')}</div>`;
}

function redeemPicker() {
  const avail = L.available(S.data.points, MEMBERS(), ME());
  return `<h3 class="sheet-title">Pedir un favor 🎟️</h3>
    <p class="muted">Tienes ${coin(avail)} disponibles.</p>
    <div class="stack">${catalog().spend.map((it, i) => couponCard(it, i, avail)).join('')}</div>`;
}
function redeemConfirm(it) {
  const avail = L.available(S.data.points, MEMBERS(), ME());
  const pts = num(it.pts);
  const short = avail < pts;
  return `<div class="coupon big butter"><div class="cp-main"><span class="cp-emoji">${esc(it.emoji)}</span><span class="cp-body"><small>Vale por</small><b>${esc(it.title)}</b></span><span class="cp-price"><i class="xc"></i>${pts}</span></div></div>
    <p class="muted">Si ${esc(pname())} acepta, ${pts} de tus puntos pasan a ${esc(pname())}. Si dice «ahora no», no pasa nada: vuelven a ti.</p>
    <label class="field"><span>¿Cuándo? ¿Algún detalle? <small>(opcional)</small></span>
      <input class="inp" id="rd-note" maxlength="140" placeholder="El sábado, después de comer"></label>
    ${short ? `<p class="error">Te faltan ${pts - avail} puntos. ¡A ganarlos! 💪</p>` : ''}
    <button class="btn primary big wide" data-act="do-redeem" data-id="${esc(it.id)}" ${short ? 'disabled' : ''}>${ic('ticket')} Pedir vale</button>`;
}
function giftSheet() {
  const avail = L.available(S.data.points, MEMBERS(), ME());
  return `<h3 class="sheet-title">Regalar a ${esc(pname())} 🎁</h3>
    <p class="muted">Sale de tus puntos (tienes ${coin(avail)}).</p>
    ${ptsChips('gf-pts', 10, [5, 10, 20, 30, 50, 100])}
    <label class="field"><span>Mensaje <small>(opcional)</small></span><input class="inp" id="gf-note" maxlength="60" placeholder="Porque sí 💗"></label>
    <button class="btn primary big wide" data-act="do-gift">${ic('gift')} Regalar</button>`;
}

/* ---------------- Catálogo (editar) ---------------- */
function catalogForm(kind, it) {
  const isNew = !it;
  it = it || { emoji: kind === 'earn' ? '✨' : '🎟️', title: '', pts: kind === 'earn' ? 10 : 30 };
  const rule = kind === 'earn'
    ? 'Tareas de casa y cosas «invisibles» (gestiones, citas, planes). Los mimos no se cobran: van a <b>Gracias</b> 💛'
    : 'Un vale es un <b>favor</b> concreto que te hace tu pareja. Nada de permisos (amigos, familia, tu tiempo) ni deseos sin concretar.';
  return `<h3 class="sheet-title">${isNew ? (kind === 'earn' ? 'Nueva acción' : 'Nuevo vale') : 'Editar'}</h3>
    <p class="muted small">${rule}${hasPartner() ? ` ${esc(pname())} tendrá que aceptar el cambio.` : ''}</p>
    <div class="stack">
      <div class="emoji-line"><input class="inp emoji-inp" id="ct-emoji" maxlength="4" value="${esc(it.emoji)}" aria-label="Emoji">
        <input class="inp" id="ct-title" maxlength="50" value="${esc(it.title)}" placeholder="${kind === 'earn' ? 'Regar las plantas' : 'Me cubres la cena del jueves'}"></div>
      <div class="emoji-row" id="ct-emojis">${ITEM_EMOJIS.map(e => `<button type="button" class="emo sm" data-act="set-emoji" data-target="ct-emoji" data-v="${e}">${e}</button>`).join('')}</div>
      <div class="field"><span>${kind === 'earn' ? 'Puntos que da' : 'Puntos que cuesta'}</span>
        <div class="stepper"><button type="button" class="btn icon" data-act="step" data-target="ct-pts" data-d="-5">${ic('minus')}</button>
        <input class="inp num" id="ct-pts" inputmode="numeric" value="${num(it.pts)}"><button type="button" class="btn icon" data-act="step" data-target="ct-pts" data-d="5">${ic('plus')}</button></div></div>
      <button class="btn primary big" data-act="cat-save" data-kind="${kind}" data-id="${isNew ? '' : esc(it.id)}">${hasPartner() ? 'Proponer' : 'Guardar'}</button>
      ${isNew ? '' : `<button class="btn soft-berry" data-act="cat-delete" data-kind="${kind}" data-id="${esc(it.id)}">${ic('trash-2')} Borrar</button>`}
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
      <div class="field"><span>¿De quién es?</span>
        <div class="chips" id="tk-who">
          <button type="button" class="chip ${who === me ? 'on' : ''}" data-act="pick" data-v="${me}">${esc(prof(me).emoji)} Mía</button>
          <button type="button" class="chip ${who === pa ? 'on' : ''}" data-act="pick" data-v="${pa}">${esc(prof(pa).emoji)} De ${esc(pname())}</button>
          <button type="button" class="chip ${who === 'free' ? 'on' : ''}" data-act="pick" data-v="free">🙋 Libre</button>
          <button type="button" class="chip ${who === 'rotate' ? 'on' : ''}" data-act="pick" data-v="rotate">🔁 Por turnos</button>
        </div></div>
      <div class="field"><span>¿Se repite?</span>
        <div class="chips" id="tk-repeat">${Object.entries(REPEAT_LABEL).map(([k, l]) => `<button type="button" class="chip ${t.repeat === k ? 'on' : ''}" data-act="pick" data-v="${k}">${l}</button>`).join('')}</div></div>
      <details class="more"><summary>Más opciones <small>fecha${noPoints() ? '' : ', puntos'}, icono</small></summary>
        <div class="stack">
          <label class="field"><span>${t.repeat && t.repeat !== 'none' ? 'Próxima vez' : 'Fecha'} <small>(opcional)</small></span><input class="inp" id="tk-due" type="date" value="${t.due || ''}"></label>
          ${noPoints() ? '' : `<div class="field"><span>Xurripoints al hacerla</span>${ptsChips('tk-pts', num(t.pts), [0, 5, 10, 15, 20, 30, 50])}</div>`}
          <div class="emoji-row">${TASK_EMOJIS.map(e => `<button type="button" class="emo sm" data-act="set-emoji" data-target="tk-emoji" data-v="${e}">${e}</button>`).join('')}</div>
        </div></details>
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
  const pts = noPoints() ? 0 : num(t.pts);
  if (pts > 0) claimId = addPoints({ type: 'claim', to: me, amount: pts, title: t.title, emoji: t.emoji, taskId: t.id });
  celebrate(['✅', '✨', '💪', '🪙']);
  toast(pts ? `¡Hecha! +${pts} cuando ${pname()} te dé las gracias` : '¡Hecha! ✨', {
    action: 'Deshacer',
    onAction: () => {
      S.be.update('tasks', t.id, prev).catch(err => toast(errMsg(err)));
      if (claimId) S.be.update('points', claimId, { status: 'cancelled', resolvedAt: Date.now(), resolvedBy: me }).catch(() => { });
    },
  });
}

/* ---------------- Gastos (formulario) ---------------- */
/** "Tú 55% · Churri 45%" según los ingresos. */
function propText(inc = splitIncomes()) {
  const me = ME(), [a] = MEMBERS();
  const pA = L.pctA('proportional', { members: MEMBERS(), incomes: inc });
  const mine = Math.round(a === me ? pA : 100 - pA);
  return `Tú ${mine}% · ${pname()} ${100 - mine}%`;
}
/** Lista de formas de repartir (radio). prefix → ids: #prefix-mode, #prefix-custom, #prefix-range. */
function splitPicker(prefix, sel, includeDefault, customMe = 50) {
  const me = ME(), pa = PA(), [a, b] = MEMBERS();
  const inc = splitIncomes();
  const d = defaultSplit();
  const sugarOpt = u => { const p = prof(u); return [`sugar:${u}`, p.sugar === 'papi' ? '🕶️' : '💅', `Sugar ${p.sugar === 'papi' ? 'papi' : 'mami'} (${u === me ? 'tú' : p.name})`, u === me ? 'Lo pagas todo tú' : `Lo paga todo ${p.name}`]; };
  const opts = [
    ...(includeDefault ? [['default', '⭐', 'Vuestro reparto', cap(splitWords(d.mode, d.sugar, d.customPctA))]] : []),
    ['equal', '⚖️', 'A medias', '50/50'],
    ['proportional', '📊', 'Según ingresos', inc[me] > 0 && inc[pa] > 0 ? propText(inc) : 'Falta poner los ingresos de los dos'],
    sugarOpt(a), sugarOpt(b),
    ['custom', '🎚️', 'A medida', 'Elegís el porcentaje'],
  ];
  return `<div class="radio-list" id="${prefix}-mode">${opts.map(([v, i, t, sub]) => `<button type="button" class="radio ${sel === v ? 'on' : ''}" data-act="pick" data-v="${esc(v)}">
      <span class="r-ic">${i}</span><span class="r-body"><b>${esc(t)}</b><small>${esc(sub)}</small></span><span class="r-dot"></span></button>`).join('')}</div>
    <div class="custom-split" id="${prefix}-custom" ${sel === 'custom' ? '' : 'hidden'}>
      <div class="cs-row"><span>Tú <b id="${prefix}-mine">${customMe}%</b></span><span><b id="${prefix}-theirs">${100 - customMe}%</b> ${esc(pname())}</span></div>
      <input type="range" id="${prefix}-range" min="0" max="100" step="5" value="${customMe}" aria-label="Parte que pagas tú"></div>`;
}
/** Lee el reparto elegido. "⭐ vuestro reparto" se traduce al reparto de la pareja. */
function readSplit(prefix, incomes = splitIncomes()) {
  const me = ME(), members = MEMBERS();
  let v = picked(`${prefix}-mode`) || 'equal';
  const viaDefault = v === 'default';
  let customPctA;
  if (viaDefault) { const d = defaultSplit(); v = d.mode === 'sugar' ? `sugar:${d.sugar}` : d.mode; customPctA = d.customPctA ?? 50; }
  const [mode, sugar] = v.split(':');
  if (!viaDefault) { const r = $(`#${prefix}-range`); const myPct = r ? Number(r.value) : 50; customPctA = members[0] === me ? myPct : 100 - myPct; }
  return { mode, sugar: sugar || null, customPctA, viaDefault, opts: { members, incomes, sugar: sugar || null, customPctA } };
}
function splitPreview(amount, mode, opts) {
  const me = ME(), pa = PA();
  const pA = L.pctA(mode, opts);
  const myPct = Math.round(MEMBERS()[0] === me ? pA : 100 - pA);
  const sh = L.computeShares(Number.isFinite(amount) ? amount : 0, mode, opts);
  const warn = mode === 'proportional' && !(opts.incomes[me] > 0 && opts.incomes[pa] > 0)
    ? `<p class="warn">Para «según ingresos» falta poner los ingresos de los dos (cada uno en su perfil). Mientras, sale a medias.</p>` : '';
  return `<div class="sp-bar"><span class="${side(me)}" style="width:${myPct}%"></span><span class="${side(pa)}" style="width:${100 - myPct}%"></span></div>
    <div class="sp-legend"><span>${av(me, 'xs')} Tú <b>${eur(sh[me])}</b> <small>${myPct}%</small></span><span><small>${100 - myPct}%</small> <b>${eur(sh[pa])}</b> ${esc(pname())} ${av(pa, 'xs')}</span></div>${warn}`;
}
function syncCustom(prefix) {
  const sel = picked(`${prefix}-mode`);
  const box = $(`#${prefix}-custom`); if (box) box.hidden = sel !== 'custom';
  const r = $(`#${prefix}-range`);
  if (r) { $(`#${prefix}-mine`).textContent = r.value + '%'; $(`#${prefix}-theirs`).textContent = (100 - r.value) + '%'; }
  return sel;
}

function expenseForm(e, { template = false } = {}) {
  const isNew = !e;
  const me = ME(), pa = PA();
  e = e || { title: '', category: 'super', amount: 0, paidBy: me, mode: 'default', date: L.ymd() };
  const sel = e.mode === 'default' ? 'default' : e.mode === 'sugar' ? `sugar:${e.sugar}` : e.mode;
  const customMe = e.mode !== 'custom' ? 50
    : template ? Math.round(MEMBERS()[0] === me ? (e.customPctA ?? 50) : 100 - (e.customPctA ?? 50))
    : (e.amount ? Math.round(((e.shares || {})[me] || 0) / e.amount * 100) : 50);
  const cat = catOf(e.category);
  return `<h3 class="sheet-title">${template ? 'Gasto fijo 🔁' : isNew ? 'Nuevo gasto' : 'Editar gasto'}</h3>
    ${template ? `<p class="muted">Se apunta solo cada mes. Los cambios cuentan desde el próximo.</p>` : ''}
    <div class="stack">
      <div class="exp-head">
        <button type="button" class="cat-btn" id="ex-catbtn" data-act="toggle-panel" data-p="ex-catp" aria-label="Categoría">${cat[1]}</button>
        <input class="inp" id="ex-title" maxlength="50" value="${esc(e.title)}" placeholder="¿En qué? (súper, cena, luz…)">
      </div>
      <div class="panel" id="ex-catp" hidden><div class="chips" id="ex-cat">${CATS.map(([id, em, lb]) => `<button type="button" class="chip ${e.category === id ? 'on' : ''}" data-act="pick" data-v="${id}">${em} ${lb}</button>`).join('')}</div></div>
      <div class="amount-field"><input id="ex-amount" inputmode="decimal" placeholder="0,00" value="${e.amount ? eurPlain(e.amount) : ''}" aria-label="Importe"><b>€</b></div>
      <p class="sentence">Pagó <button type="button" class="pill" data-act="toggle-panel" data-p="ex-paidp"><span id="ex-paid-lb">tú</span>${ic('chevron-down')}</button>
        y se reparte <button type="button" class="pill" data-act="toggle-panel" data-p="ex-splitp"><span id="ex-split-lb">…</span>${ic('chevron-down')}</button></p>
      <div class="panel" id="ex-paidp" hidden><div class="seg who" id="ex-paid">
        <button type="button" class="${e.paidBy === me ? 'on' : ''}" data-act="pick" data-v="${me}">${av(me, 'xs')} Yo</button>
        <button type="button" class="${e.paidBy === pa ? 'on' : ''}" data-act="pick" data-v="${pa}">${av(pa, 'xs')} ${esc(pname())}</button>
      </div></div>
      <div class="panel" id="ex-splitp" hidden>${splitPicker('ex', sel, true, customMe)}</div>
      <div class="split-preview" id="ex-preview"></div>
      ${template
        ? `<label class="field"><span>Día de cada mes <small>(1-28)</small></span><input class="inp" id="ex-day" type="number" inputmode="numeric" min="1" max="28" value="${e.day || 1}"></label>`
        : `<details class="more" ${e.date && e.date !== L.ymd() ? 'open' : ''}><summary>Más opciones <small>fecha${isNew ? ', gasto fijo' : ''}</small></summary>
          <div class="stack">
            <label class="field"><span>Fecha</span><input class="inp" id="ex-date" type="date" value="${e.date || L.ymd()}"></label>
            ${isNew ? `<label class="switch-row"><input type="checkbox" id="ex-rec"><span class="sw" aria-hidden="true"></span>
              <span><b>🔁 Gasto fijo</b><small>Se apunta solo cada mes, el mismo día (alquiler, luz, Netflix…)</small></span></label>` : ''}
          </div></details>`}
      <button class="btn primary big" data-act="exp-save" data-id="${isNew ? '' : e.id}" ${template ? 'data-tpl="1"' : ''}>Guardar</button>
      ${isNew ? '' : template
        ? `<button class="btn soft-berry" data-act="tpl-delete" data-id="${e.id}">${ic('repeat-2')} Dejar de repetir</button>`
        : `<button class="btn soft-berry" data-act="exp-delete" data-id="${e.id}">${ic('trash-2')} Borrar gasto</button>`}
    </div>`;
}
function readExpenseSplit() { return { amount: L.parseEur($('#ex-amount').value), ...readSplit('ex') }; }
function updateExpensePreview(group) {
  const me = ME();
  const { amount, mode, sugar, customPctA, viaDefault, opts } = readExpenseSplit();
  const sel = syncCustom('ex');
  const payer = picked('ex-paid') || me;
  $('#ex-paid-lb').textContent = payer === me ? 'tú' : pname();
  $('#ex-split-lb').textContent = (viaDefault ? '⭐ ' : '') + splitWords(mode, sugar, customPctA);
  $('#ex-catbtn').textContent = catOf(picked('ex-cat') || 'otros')[1];
  // Cerrar el desplegable al elegir (menos "a medida", que necesita el deslizador).
  if (group && group.id === 'ex-paid') $('#ex-paidp').hidden = true;
  if (group && group.id === 'ex-cat') $('#ex-catp').hidden = true;
  if (group && group.id === 'ex-mode' && sel !== 'custom') $('#ex-splitp').hidden = true;
  $('#ex-preview').innerHTML = splitPreview(amount, mode, opts);
}
/* Reparto por defecto de la pareja */
function splitDefaultSheet() {
  const d = defaultSplit(), me = ME(), [a] = MEMBERS();
  const sel = d.mode === 'sugar' ? `sugar:${d.sugar}` : d.mode;
  const cA = d.customPctA ?? 50;
  return `<h3 class="sheet-title">Vuestro reparto ⭐</h3>
    <p class="muted">Cómo repartís normalmente los gastos. Se usa en los gastos nuevos y en los fijos; al apuntar cada gasto lo podéis cambiar.${hasPartner() ? ` Como os afecta a los dos, <b>${esc(pname())} tiene que aceptarlo</b>.` : ''}</p>
    ${splitPicker('df', sel, false, a === me ? cA : 100 - cA)}
    <label class="field df-income"><span>Tus ingresos al mes <small>(para «según ingresos»; ${esc(pname())} pone los suyos en su móvil)</small></span>
      <div class="money-inp"><input class="inp" id="df-income" inputmode="decimal" placeholder="0" value="${prof(me).income ? eurPlain(prof(me).income) : ''}"><b>€</b></div></label>
    <p class="muted small">Así quedaría un gasto de 100 €:</p>
    <div class="split-preview" id="df-preview"></div>
    <button class="btn primary big wide" data-act="split-save">${hasPartner() ? 'Proponer' : 'Guardar'}</button>`;
}
function dfIncomes() {
  const inc = splitIncomes(), typed = L.parseEur($('#df-income').value);
  if (Number.isFinite(typed)) inc[ME()] = typed;
  return inc;
}
function updateDefaultPreview() {
  const sel = syncCustom('df');
  const inc = dfIncomes();
  const { mode, opts } = readSplit('df', inc);
  $('.df-income').hidden = sel !== 'proportional';
  $('#df-preview').innerHTML = splitPreview(10000, mode, opts);
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
    <p class="muted">¿Qué parte de la carga de casa os parece justa para cada uno? No es un marcador: sirve para <b>hablarlo</b>. La barra cuenta los puntos de cada tarea × las veces que se repite a la semana. Apuntad también lo invisible: citas, planes, cumpleaños. El botón <b>Repartir</b> intentará acercarse a esto.</p>
    <div class="chips" id="tg-quick">${[50, 60, 40, 70, 30].map(v => `<button type="button" class="chip ${t === v ? 'on' : ''}" data-act="tg-set" data-v="${v}">${v}/${100 - v}</button>`).join('')}</div>
    <div class="tg-row"><span>${av(a, 'xs')} ${esc(prof(a).name)} <b id="tg-a">${t}%</b></span><span><b id="tg-b">${100 - t}%</b> ${esc(prof(b).name)} ${av(b, 'xs')}</span></div>
    <input type="range" id="tg-range" min="0" max="100" step="5" value="${t}" aria-label="Porcentaje">
    <button class="btn primary big wide" data-act="tg-save">${hasPartner() ? 'Proponer' : 'Guardar'}</button>`;
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
  'retry': () => { if (S.user) onUser(S.user); },
  'wait-join': async (d, el) => {
    const code = $('#join-code').value.trim().toUpperCase();
    if (code.length !== 6) { toast('El código tiene 6 letras/números.'); return; }
    if (code === S.code) { toast('Ese es tu propio código 😉 Pásaselo a tu pareja.'); return; }
    const p = (S.data && S.data.couple && S.data.couple.profiles && S.data.couple.profiles[ME()]) || { name: 'Churri', emoji: '🐻', sugar: 'mami', income: 0 };
    el.disabled = true;
    try {
      await S.be.joinCouple(code, p);
      if (S.unwatch) { S.unwatch(); S.unwatch = null; }
      S.enter = true; watchCouple(code); celebrate();
    } catch (err) { toast(errMsg(err)); el.disabled = false; }
  },
  'task-typical': () => {
    const now = Date.now(), today = L.ymd();
    TYPICAL_TASKS.forEach(([emoji, title, pts, repeat], i) => S.be.add('tasks', {
      title, emoji, pts, repeat, assignee: null, rotate: false, due: today, doneAt: null, doneBy: null, log: [], createdBy: ME(), createdAt: now + i,
    }).done.catch(err => toast(errMsg(err))));
    toast(`${TYPICAL_TASKS.length} tareas añadidas 🧽 Pulsad «Repartir» para dividirlas`);
  },
  'notify-sheet': () => openSheet(notifySheet()),
  'notify-save': async () => {
    const h = Number(picked('nt-hour') || 20);
    if (isNative()) {
      const ok = window.__xpNotify && await window.__xpNotify.enable();
      if (!ok) { toast('Sin permiso de notificaciones. Actívalo en Ajustes del móvil → Apps → Xurripoints.'); return; }
    }
    lsSet('xp_notify', String(h)); S.notifySig = '';
    syncReminders();
    closeSheet(); render(); toast(`Recordatorio a las ${h}:00 🔔`);
  },
  'notify-off': () => {
    lsSet('xp_notify', null); S.notifySig = '';
    if (window.__xpNotify) window.__xpNotify.clear();
    closeSheet(); render(); toast('Recordatorio desactivado');
  },

  /* tutorial: primeros pasos y ayudas de cada pantalla */
  'steps-hide': () => { lsSet('xp_steps_off', '1'); render(); toast('Los tienes en Pareja → Ayuda'); },
  'steps-show': () => { lsSet('xp_steps_off', null); S.tab = 'home'; S.enter = true; render(); },
  'step-go': d => {
    const go = tab => { S.tab = tab; S.enter = true; render(); };
    if (d.v === 'tasks') go('tasks');
    else if (d.v === 'split') ACT['split-default']();
    else if (d.v === 'expense') openExpense();
    else if (d.v === 'thanks') openSheet(thanksSheet());
    else if (d.v === 'vales') { S.ptab = 'vales'; go('points'); }
    else if (d.v === 'notify') openSheet(notifySheet());
  },
  'hint-ok': d => { lsSet('xp_hint_' + d.v, '1'); S.hint[d.v] = false; render(); },
  'hint-toggle': d => { S.hint[d.v] = !hintOpen(d.v); render(); },
  'hints-reset': () => { Object.keys(HINTS).forEach(k => lsSet('xp_hint_' + k, null)); S.hint = {}; toast('Verás otra vez la ayuda de cada pantalla ❔'); },

  /* reglas comunes: propuestas y avisos de cambios */
  'prop-yes': d => {
    const p = PROPOSALS().find(x => x.id === d.id);
    answerProposal(p, true); celebrate(['🤝', '✨']); toast('¡Hecho! Ya está cambiado 🤝');
    if ($('#sheet-root.open') && S.sheet && S.sheet.props) swapSheet(propsSheet());
  },
  'prop-no': d => {
    const p = PROPOSALS().find(x => x.id === d.id);
    answerProposal(p, false); toast(`Se lo decimos a ${pname()}: mejor lo habláis 💬`);
    if ($('#sheet-root.open') && S.sheet && S.sheet.props) swapSheet(propsSheet());
  },
  'prop-all': () => { proposalsForMe().forEach(p => answerProposal(p, true)); closeSheet(); celebrate(['🤝', '✨']); toast('¡Todo aceptado! 🤝'); },
  'prop-cancel': d => {
    S.be.update('proposals', d.id, { status: 'cancelled', resolvedAt: Date.now(), resolvedBy: ME() }).catch(err => toast(errMsg(err)));
    toast('Propuesta anulada'); closeSheet();
  },
  'props-sheet': () => openSheet(propsSheet(), { ctx: { props: true } }),
  'changes-sheet': () => openSheet(changesSheet()),
  'log-seen': d => { S.be.update('log', d.id, { seenAt: Date.now() }).catch(err => toast(errMsg(err))); },
  'log-restore': async d => {
    const l = (S.data.log || []).find(x => x.id === d.id);
    if (!l || !l.data || l.restoredAt) return;
    const undo = !/del$/.test(l.kind);
    if (!await askConfirm({ title: undo ? '¿Deshacer este cambio?' : '¿Recuperarlo?', text: `${prof(l.by).name} ${l.text}`, ok: undo ? 'Deshacer' : 'Recuperar' })) return;
    [l.data, ...(l.data.extra || [])].forEach(x => S.be.set(x.col, x.id, x.doc).catch(err => toast(errMsg(err))));
    S.be.update('log', l.id, { seenAt: Date.now(), restoredAt: Date.now() }).catch(() => { });
    const what = l.data.label || 'un cambio';
    logChange('restore', undo ? `deshizo el cambio de ${prof(l.by).name} en ${what}` : `recuperó ${what} (lo había borrado ${prof(l.by).name})`);
    closeSheet(); toast(undo ? 'Deshecho ↩️' : 'Recuperado ↩️');
  },
  'points-toggle': async () => {
    if (!noPoints()) {
      if (!await askConfirm({ title: '¿Pausar los puntos?', text: 'Se ocultan los puntos, los vales y la meta. No se borra nada. Para volver a activarlos, lo decidís los dos.', ok: 'Pausar' })) return;
      S.be.updateCouple({ 'settings.noPoints': true }).catch(err => toast(errMsg(err)));
      logChange('points-off', 'ha pausado los puntos y vales 🌿');
      toast('Puntos en pausa 🌿 Tareas, gastos, gracias y planes siguen igual');
    } else if (myProposals().some(p => p.kind === 'points-on')) toast(`Ya se lo has propuesto a ${pname()} 💬`);
    else propose('points-on', true, 'Volver a activar los puntos y vales');
  },

  /* salir de la pareja y borrar la cuenta */
  'leave': async () => {
    const demo = S.be.kind === 'demo';
    if (!await askConfirm({
      title: '¿Salir de la pareja?',
      text: `${pname()} conservará lo que habéis apuntado juntos (sin tus ingresos) y nadie más podrá unirse a esta pareja. No se puede deshacer.${demo ? ' (Demo: después verás lo que le queda a quien se queda.)' : ''}`,
      ok: 'Salir de la pareja', danger: true,
    })) return;
    const uid = S.user.uid;
    if (S.unwatch) { S.unwatch(); S.unwatch = null; }
    closeSheet(true);
    try { await S.be.leaveCouple(); }
    catch (err) { toast(errMsg(err)); onUser(S.user); return; }
    if (!demo) { lsSet('xp_code_' + uid, null); onUser(S.user); toast('Has salido de la pareja'); }
  },
  'alone-reset': async (d, el) => {
    if (!await askConfirm({ title: '¿Borrar todo?', text: 'Se borran para siempre los datos de esta pareja.', ok: 'Borrar todo', danger: true })) return;
    if (S.be.kind === 'demo') { S.recurringDone.clear(); S.tab = 'home'; S.enter = true; S.be.begin(newCoupleSeed()); return; }
    el.disabled = true;
    const uid = S.user.uid;
    if (S.unwatch) { S.unwatch(); S.unwatch = null; }
    try { await S.be.leaveCouple(); lsSet('xp_code_' + uid, null); onUser(S.user); toast('Borrado. Puedes empezar de cero 🌱'); }
    catch (err) { el.disabled = false; toast(errMsg(err)); onUser(S.user); }
  },
  'delete-sheet': () => openSheet(deleteSheet()),
  'delete-do': async (d, el) => {
    const pass = $('#del-pass').value;
    if (!pass) { toast('Escribe tu contraseña ✍️'); return; }
    el.disabled = true;
    const uid = S.user.uid;
    if (S.unwatch) { S.unwatch(); S.unwatch = null; }
    try {
      await S.be.deleteAccount(pass);
      lsSet('xp_code_' + uid, null);
      toast('Cuenta borrada. ¡Gracias por probar Xurripoints! 💞');
    } catch (err) { el.disabled = false; toast(errMsg(err)); onUser(S.user); }
  },
  'tool-open': d => { S.tool = d.v; openSheet(toolHtml(d.v), { ctx: { tool: d.v } }); S.tool = d.v; },

  /* controles genéricos */
  'pick': (d, el) => {
    const group = el.parentElement;
    $$('.on', group).forEach(x => x.classList.remove('on'));
    el.classList.add('on');
    S.sheet && S.sheet.onChange && S.sheet.onChange(group);
  },
  'toggle-panel': d => {
    const p = document.getElementById(d.p); if (!p) return;
    const open = p.hidden;
    $$('.panel', p.closest('.sheet') || document).forEach(x => { x.hidden = true; });
    p.hidden = !open;
  },
  'add-menu': () => openSheet(addMenu()),
  'add': d => {
    const k = d.k;
    if (k === 'claim' || k === 'reward') openSheet(pointsPicker(k));
    else if (k === 'thanks') openSheet(thanksSheet());
    else if (k === 'redeem') openSheet(redeemPicker());
    else if (k === 'expense') openExpense();
    else if (k === 'task') openSheet(taskForm());
    else if (k === 'idea') openSheet(ideaForm());
    else if (k === 'save') savePick();
  },
  'split-default': () => openSheet(splitDefaultSheet(), {
    ctx: { onChange: updateDefaultPreview },
    onMount: () => { ['#df-range', '#df-income'].forEach(x => $(x).addEventListener('input', updateDefaultPreview)); updateDefaultPreview(); },
  }),
  'split-save': () => {
    const inc = dfIncomes();
    const { mode, sugar, customPctA } = readSplit('df', inc);
    const d = defaultSplit();
    // Mis ingresos son míos: se guardan al momento (y la pareja lo ve en el historial).
    if (inc[ME()] !== (prof(ME()).income || 0)) {
      S.be.updateCouple({ [`profiles.${ME()}.income`]: inc[ME()] }).catch(err => toast(errMsg(err)));
      logChange('income', 'ha actualizado sus ingresos (cuentan en el reparto «según ingresos»)');
    }
    closeSheet();
    const same = d.mode === mode && (mode !== 'sugar' || d.sugar === sugar) && (mode !== 'custom' || d.customPctA === customPctA);
    if (same && C().settings && C().settings.split) { toast('Guardado ✨'); return; }
    // El reparto es de los dos: se propone.
    propose('split', { mode, sugar: sugar || null, customPctA: customPctA ?? 50 }, `Vuestro reparto de gastos: ${splitNeutral(mode, sugar, customPctA)}`);
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
  'demo-reset': async () => {
    if (!await askConfirm({ title: '¿Reiniciar la demo?', text: 'Se borra lo que hayas probado y vuelven los datos de ejemplo.', ok: 'Reiniciar' })) return;
    S.recurringDone.clear(); S.be.begin(newCoupleSeed()); S.tab = 'home'; S.enter = true;
  },
  'demo-exit': async () => {
    if (hasFirebaseConfig()) {
      // Con cuenta de verdad disponible: te puedes llevar lo útil (tareas, ideas, vales, huchas) a la pareja real.
      const v = await askChoice({
        title: '¿Salir del modo demo?',
        text: '¿Te llevas tus tareas, ideas, vales y huchas a vuestra pareja de verdad? (El dinero y los puntos de prueba no.)',
        buttons: [['keep', 'Sí, llevármelas', 'primary'], ['drop', 'No, borrarlo todo', 'soft-berry']],
      });
      if (!v) return;
      await S.be.signOut({ keep: v === 'keep' });
    } else {
      if (!await askConfirm({ title: '¿Salir del modo demo?', text: 'Se borran los datos de prueba.', ok: 'Salir', danger: true })) return;
      await S.be.signOut();
    }
    lsSet('xp_mode', null);
    S.be = await createBackend('cloud');
    S.be.start(onUser);
  },
  'logout': async () => {
    if (!await askConfirm({ title: '¿Cerrar sesión?', text: 'Tus datos siguen guardados en la nube.', ok: 'Cerrar sesión' })) return;
    if (S.user && S.be.kind === 'firebase') lsSet('xp_code_' + S.user.uid, null);
    await S.be.signOut();
  },

  /* emparejar */
  'pair-create': async (d, el) => {
    if (!needName()) return;
    const p = readProfile();
    el.disabled = true;
    try {
      const { ideas, ...seed } = newCoupleSeed();
      // ¿Viene de la demo? Se lleva catálogo, tareas, ideas y huchas (logic.demoToSeed).
      const stash = peekDemoStash();
      const fromDemo = stash && $('#pf-stash') && $('#pf-stash').checked ? L.demoToSeed(stash, ME()) : null;
      if (fromDemo && fromDemo.catalog) seed.catalog = fromDemo.catalog;
      const code = await S.be.createCouple(p, seed);
      watchCouple(code);
      const add = (col, doc) => S.be.add(col, doc).done.catch(() => { });
      const now = Date.now();
      if (fromDemo) {
        fromDemo.tasks.forEach((t, i) => add('tasks', { ...t, createdBy: ME(), createdAt: t.createdAt || now + i }));
        fromDemo.ideas.forEach((x, i) => add('ideas', { ...x, note: x.note || '', createdBy: ME(), createdAt: x.createdAt || now + i, doneAt: x.doneAt || null }));
        fromDemo.jars.forEach((j, i) => add('jars', { ...j, createdBy: ME(), createdAt: now + i }));
        dropDemoStash();
      } else ideas.forEach(it => add('ideas', { ...it, note: '', votes: {}, createdBy: ME(), createdAt: now, doneAt: null }));
    }
    catch (err) { toast(errMsg(err)); el.disabled = false; }
  },
  'pair-join': async (d, el) => {
    const code = $('#join-code').value.trim().toUpperCase();
    if (code.length !== 6) { toast('El código tiene 6 letras/números.'); return; }
    if (!needName()) return;
    const p = readProfile();
    el.disabled = true;
    try { await S.be.joinCouple(code, p); S.enter = true; watchCouple(code); celebrate(); }
    catch (err) { toast(errMsg(err)); el.disabled = false; }
  },
  'copy-code': async () => {
    try { await navigator.clipboard.writeText(S.code); toast('Código copiado 📋'); }
    catch (e) { toast(`Tu código: ${S.code}`); }
  },
  'share-code': () => shareText(`¡Únete a mí en Xurripoints! 💞\n1️⃣ Descarga la app: ${APK_URL}\n2️⃣ Crea tu cuenta y pon nuestro código: ${S.code}`),
  'share-app': () => shareText(`Te paso Xurripoints 💞, una app para organizaros en pareja: tareas, gastos, planes y gracias (y puntos para pediros favores). Descárgala aquí (Android): ${APK_URL}`),
  'welcome': () => showWelcome(),
  'open-url': d => openExternal(d.url),
  'check-update': async () => {
    if (S.update && L.isNewer(S.update, VERSION)) { openExternal(APK_URL); return; }
    toast('Buscando…');
    const v = await checkUpdate(true);
    if (v == null) toast('No he podido comprobarlo (¿sin internet?)');
    else if (L.isNewer(v, VERSION)) { toast(`¡Hay versión nueva: ${v}! Toca otra vez para descargarla`); render(); }
    else toast('Tienes la última versión ✨');
  },

  /* puntos */
  'quick': d => {
    if (d.type === 'claim' || d.type === 'reward') openSheet(pointsPicker(d.type));
    else if (d.type === 'redeem') openSheet(redeemPicker());
    else if (d.type === 'thanks') openSheet(thanksSheet());
    else openSheet(giftSheet());
  },
  'earn-item': d => {
    const it = findItem('earn', d.id); if (!it) return;
    openSheet(`<div class="big-emoji">${esc(it.emoji)}</div><h3 class="sheet-title center">${esc(it.title)}</h3><p class="center">${coin('+' + num(it.pts), 'lg')}</p>
      <div class="stack">
        <button class="btn mint big" data-act="do-points" data-type="claim" data-id="${esc(it.id)}">${ic('check-check')} Lo he hecho yo</button>
        <button class="btn primary big" data-act="do-points" data-type="reward" data-id="${esc(it.id)}">${ic('sparkles')} Lo ha hecho ${esc(pname())}</button>
      </div>`);
  },
  'do-points': d => {
    const it = findItem('earn', d.id); if (!it) return;
    doPoints(d.type, it.title, it.emoji, num(it.pts));
  },
  'do-points-custom': d => {
    const title = $('#cu-title').value.trim();
    if (!title) { toast('Escribe qué tarea ha sido ✍️'); return; }
    doPoints(d.type, title, d.type === 'claim' ? '💪' : '🙌', Number(picked('cu-pts') || 10));
  },
  'vale-item': d => {
    const it = findItem('spend', d.id); if (!it) return;
    if ($('#sheet-root.open')) swapSheet(redeemConfirm(it)); else openSheet(redeemConfirm(it));
  },
  'do-redeem': d => {
    const it = findItem('spend', d.id); if (!it) return;
    const pts = num(it.pts);
    if (pts <= 0 || L.available(S.data.points, MEMBERS(), ME()) < pts) { toast('No te llegan los puntos 😅'); return; }
    addPoints({ type: 'redeem', from: ME(), to: PA(), amount: pts, title: it.title, emoji: it.emoji, note: $('#rd-note').value.trim() });
    closeSheet();
    toast(`Vale pedido 🎟️ ${pname()} te dirá algo`);
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
    toast(t.type === 'redeem' ? `¡Vale aceptado! +${t.amount} para ti 💗` : `Gracias enviadas: +${t.amount} para ${pname()} 💛`);
  },
  'reject': d => {
    const t = findPoint(d.id); if (!t) return;
    const redeem = t.type === 'redeem';
    const quick = redeem ? ['Hoy no puedo 🙈', 'Mejor otro día 💛', '¿Lo negociamos? 😏'] : ['¿Lo hablamos luego?', 'Creo que faltó algo 🙈', 'Gracias, pero no cuenta 💛'];
    openSheet(`<h3 class="sheet-title">${redeem ? 'Ahora no 🙈' : 'Lo hablamos 💬'}</h3>
      <p class="muted">Un «no» también se puede decir bonito. ¿Le dejas un mensaje? <small>(opcional)</small></p>
      <div class="chips" id="rj-quick">${quick.map(q => `<button type="button" class="chip" data-act="pick" data-v="${esc(q)}">${esc(q)}</button>`).join('')}</div>
      <input class="inp" id="rj-reply" maxlength="100" placeholder="O escribe algo con cariño…">
      <button class="btn big wide" data-act="do-reject" data-id="${t.id}">Enviar</button>`);
  },
  'do-reject': d => {
    const reply = $('#rj-reply').value.trim() || picked('rj-quick') || '';
    S.be.update('points', d.id, { status: 'rejected', resolvedAt: Date.now(), resolvedBy: ME(), reply }).catch(err => toast(errMsg(err)));
    closeSheet(); toast('Enviado 💬');
  },
  /* gracias, meta, planes */
  'do-thanks': () => {
    const typed = $('#th-text').value.trim();
    const [pe, pt] = (picked('th-quick') || '').split('|');
    const text = typed || pt;
    if (!text) { toast('Elige o escribe por qué ✍️'); return; }
    S.be.add('thanks', { from: ME(), to: PA(), text: text.slice(0, 120), emoji: typed ? '💛' : (pe || '💛'), createdAt: Date.now(), seenAt: null, reaction: null }).done.catch(err => toast(errMsg(err)));
    closeSheet(); celebrate(['💛', '💗', '✨']); toast(`Gracias enviadas a ${pname()} 💛`);
  },
  'thanks-seen': d => { S.be.update('thanks', d.id, { seenAt: Date.now(), reaction: '❤️' }).catch(err => toast(errMsg(err))); celebrate(['❤️', '💛']); },
  'goal-edit': () => openSheet(goalSheet()),
  'goal-save': d => {
    const title = $('#gl-title').value.trim() || 'Nuestra meta';
    const emoji = $('#gl-emoji').value.trim() || '🎯';
    const target = Number(picked('gl-target') || 500);
    const g = C().goal;
    const patch = {};
    if (d.renew === '1' && g) patch.goalsDone = [...(C().goalsDone || []), { title: g.title, emoji: g.emoji, target: g.target, doneAt: Date.now() }];
    patch.goal = { title, emoji, target, since: d.renew === '1' || !g ? Date.now() : g.since };
    S.be.updateCouple(patch).catch(err => toast(errMsg(err)));
    if (!g || g.title !== title || num(g.target) !== target || d.renew === '1') logChange('goal', `ha puesto la meta juntos: ${emoji} «${title}» · ${target} puntos`);
    closeSheet(); toast(d.renew === '1' ? '¡Nueva meta! A por ella 💪' : 'Meta guardada 🎯');
  },
  'tips': () => openSheet(tipsSheet()),
  'q-next': () => { S.qShift++; render(); },
  'itab': d => { S.itab = d.v; render(); },
  'jtab': d => { S.jtab = d.v; S.enter = true; render(); },
  'mtab': d => { S.mtab = d.v; S.enter = true; render(); },
  /* decidir */
  'coin-mode': d => { S.coinMode = d.v; S.coinRes = ''; paintTool(); },
  'flip': () => flipCoin(),
  'dice-n': d => { S.dice = Number(d.v); S.diceRes = ''; paintTool(); },
  'roll': () => rollDice(),
  'wheel-preset': d => { if (S.spinning) return; S.wheelText = wheelPreset(d.v).join('\n'); S.wheelRes = ''; paintTool(); },
  'spin': () => spinWheel(),
  /* jugar */
  'game-open': d => openGame(d.g),
  'g-ttt': d => playTtt(Number(d.i)),
  'g-c4': d => playC4(Number(d.c)),
  'g-pick': d => gamePick(d.v),
  'g-ready': () => { S.game.phase = 'p2'; paintGame(); },
  'g-next': () => gameNext(),
  'g-again': () => { const g = S.game.g; S.game = newGame(g, S.game); paintGame(); },
  /* ahorro */
  'jar-new': () => openSheet(jarForm()),
  'jar-edit': d => { const j = findJar(d.id); if (j) openSheet(jarForm(j)); },
  'jar-save': d => {
    const title = $('#jr-title').value.trim();
    if (!title) { toast('Ponle un nombre a la hucha ✍️'); return; }
    const t = L.parseEur($('#jr-target').value);
    const data = { title: title.slice(0, 40), emoji: $('#jr-emoji').value.trim() || '🐷', target: Number.isFinite(t) && t > 0 ? t : 0 };
    if (d.id) S.be.update('jars', d.id, data).catch(err => toast(errMsg(err)));
    else S.be.add('jars', { ...data, createdBy: ME(), createdAt: Date.now() }).done.catch(err => toast(errMsg(err)));
    closeSheet(); toast(d.id ? 'Hucha guardada 🐷' : 'Hucha creada 🐷 ¡A llenarla juntos!');
  },
  'jar-delete': async d => {
    if (!await askConfirm({ title: '¿Borrar esta hucha?', text: 'Se borran también sus movimientos (el dinero real no se toca 😉).', ok: 'Borrar', danger: true })) return;
    const j = findJar(d.id), saves = (S.data.saves || []).filter(x => x.jar === d.id);
    S.be.remove('jars', d.id).catch(err => toast(errMsg(err)));
    saves.forEach(x => S.be.remove('saves', x.id).catch(() => { }));
    if (j) logChange('jar-del', `borró la hucha «${j.title}» (${eur(L.jarSaved(saves, d.id))})`,
      { col: 'jars', id: j.id, label: `la hucha «${j.title}»`, doc: snap(j), extra: saves.map(x => ({ col: 'saves', id: x.id, doc: snap(x) })) });
    closeSheet();
  },
  'jar-open': d => { const j = findJar(d.id); if (j) openSheet(jarSheet(j)); },
  'save-add': d => { const j = findJar(d.id); if (j) openSheet(saveForm(j, d.dir === 'out' ? -1 : 1)); },
  'save-do': d => {
    const amount = L.parseEur($('#sv-amount').value);
    if (!Number.isFinite(amount) || amount <= 0) { toast('Escribe el importe 💶'); return; }
    const j = findJar(d.id); if (!j) return;
    const sign = Number(d.sign) || 1;
    const who = picked('sv-who') || ME();
    const note = $('#sv-note').value.trim().slice(0, 60);
    const before = L.jarSaved(S.data.saves || [], j.id);
    if (sign < 0 && amount > before) { toast(`Solo hay ${eur(before)} en esta hucha`); return; }
    const base = { jar: j.id, note, date: L.ymd(), createdAt: Date.now() };
    if (who === 'both') {
      const half = Math.round(amount / 2);
      MEMBERS().forEach((u, k) => S.be.add('saves', { ...base, by: u, amount: sign * (k === 0 ? half : amount - half) }).done.catch(err => toast(errMsg(err))));
    } else S.be.add('saves', { ...base, by: who, amount: sign * amount }).done.catch(err => toast(errMsg(err)));
    closeSheet();
    const after = before + sign * amount;
    if (sign > 0 && j.target && before < j.target && after >= j.target) { celebrate(['🐷', '🎉', '💞', '✨']); toast(`¡Hucha llena! ${j.title} ${j.emoji} 🎉`); }
    else if (sign > 0) { celebrate(['🐷', '💶', '✨']); toast(`+${eur(amount)} a ${j.title} 🐷`); }
    else { toast(`Sacado ${eur(amount)} de ${j.title}`); logChange('save-out', `sacó ${eur(amount)} de la hucha «${j.title}»${note ? ` (${note})` : ''}`); }
  },
  'toggle-done-ideas': () => { S.showDoneIdeas = !S.showDoneIdeas; render(); },
  'idea-new': () => openSheet(ideaForm()),
  'idea-open': d => { const x = findIdea(d.id); if (x) openSheet(ideaForm(x)); },
  'idea-save': d => {
    const title = $('#id-title').value.trim();
    if (!title) { toast('Escribe la idea ✍️'); return; }
    const data = { title: title.slice(0, 80), note: $('#id-note').value.trim().slice(0, 140), list: picked('id-list') || S.itab };
    if (d.id) S.be.update('ideas', d.id, data).catch(err => toast(errMsg(err)));
    else S.be.add('ideas', { ...data, votes: { [ME()]: 1 }, createdBy: ME(), createdAt: Date.now(), doneAt: null }).done.catch(err => toast(errMsg(err)));
    S.itab = data.list; closeSheet(); toast(d.id ? 'Guardado' : 'Idea apuntada 💡 (con tu 👍)');
  },
  'idea-done': d => {
    const x = findIdea(d.id); if (!x) return;
    S.be.update('ideas', d.id, { doneAt: x.doneAt ? null : Date.now() }).catch(err => toast(errMsg(err)));
    closeSheet();
    if (!x.doneAt) { celebrate(['📸', '💞', '✨']); toast('¡Guardado en vuestros recuerdos! 📸'); }
  },
  'idea-delete': async d => {
    if (!await askConfirm({ title: '¿Borrar esta idea?', ok: 'Borrar', danger: true })) return;
    S.be.remove('ideas', d.id).catch(err => toast(errMsg(err))); closeSheet();
  },
  'idea-vote': d => voteIdea(d.id, Number(d.v)),
  'idea-swipe': () => openSwipe(),
  'swipe-vote': d => { voteIdea(d.id, Number(d.v), true); nextSwipe(); },
  'swipe-skip': () => nextSwipe(),
  'idea-roulette': () => openRoulette(),
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
    // Los precios son de los dos: el cambio se PROPONE (L.applyCatalogOp lo aplica cuando la pareja acepta).
    const old = d.id ? findItem(d.kind, d.id) : null;
    const item = { id: old ? old.id : L.uid8(), title, pts, emoji };
    const what = d.kind === 'earn' ? 'acción' : 'vale';
    let text;
    if (!old) text = `Nuevo ${what}: ${emoji} «${title}» · ${pts} puntos`;
    else {
      const ch = [];
      if (old.title !== title) ch.push(`se llama «${title}»`);
      if (num(old.pts) !== pts) ch.push(`${num(old.pts)} → ${pts} puntos`);
      if (old.emoji !== emoji) ch.push(`icono ${emoji}`);
      if (!ch.length) { closeSheet(); return; }
      text = `${d.kind === 'earn' ? 'Acción' : 'Vale'} «${old.title}»: ${ch.join(', ')}`;
    }
    closeSheet();
    propose('catalog', { op: 'upsert', kind: d.kind, item }, text);
  },
  'cat-delete': async d => {
    const it = findItem(d.kind, d.id); if (!it) return;
    if (!await askConfirm({ title: hasPartner() ? '¿Proponer quitar esta tarjeta?' : '¿Borrar esta tarjeta?', ok: hasPartner() ? 'Proponer' : 'Borrar', danger: true })) return;
    closeSheet();
    propose('catalog', { op: 'delete', kind: d.kind, item: { id: it.id } }, `Quitar ${d.kind === 'earn' ? 'la acción' : 'el vale'} ${it.emoji} «${it.title}»`);
  },

  /* tareas */
  'task-new': () => openSheet(taskForm(), { ctx: {} }),
  'task-edit': d => { const t = findTask(d.id); if (t) openSheet(taskForm(t)); },
  'task-save': d => {
    const title = $('#tk-title').value.trim();
    if (!title) { toast('Ponle un nombre a la tarea ✍️'); return; }
    const who = picked('tk-who') || 'free';
    const repeat = picked('tk-repeat') || 'none';
    const prevTask = d.id ? findTask(d.id) : null;
    const data = {
      // Con los puntos en pausa no se ven, pero se conservan (por si se vuelven a activar).
      title, emoji: $('#tk-emoji').value.trim() || '🧹', pts: noPoints() ? num(prevTask && prevTask.pts) : Number(picked('tk-pts') || 0),
      assignee: who === 'free' ? null : (who === 'rotate' ? (findTask(d.id)?.assignee || ME()) : who),
      rotate: who === 'rotate', repeat, due: $('#tk-due').value || null,
    };
    if (d.id) S.be.update('tasks', d.id, data).catch(err => toast(errMsg(err)));
    else S.be.add('tasks', { ...data, doneAt: null, doneBy: null, log: [], createdBy: ME(), createdAt: Date.now() }).done.catch(err => toast(errMsg(err)));
    closeSheet(); toast(d.id ? 'Tarea guardada' : 'Tarea añadida 📝');
  },
  'task-delete': async d => {
    if (!await askConfirm({ title: '¿Borrar esta tarea?', ok: 'Borrar', danger: true })) return;
    const t = findTask(d.id);
    S.be.remove('tasks', d.id).catch(err => toast(errMsg(err)));
    if (t) logChange('task-del', `borró la tarea ${t.emoji || ''} «${t.title}»`, { col: 'tasks', id: t.id, label: `la tarea «${t.title}»`, doc: snap(t) });
    closeSheet();
  },
  'task-check': d => {
    const t = findTask(d.id); if (!t) return;
    if (!L.isActive(t)) {
      S.be.update('tasks', t.id, { doneAt: null, doneBy: null }).catch(err => toast(errMsg(err)));
      const claim = S.data.points.find(p => p.taskId === t.id && p.createdBy === ME() && L.effStatus(p) === 'pending');
      if (claim) S.be.update('points', claim.id, { status: 'cancelled', resolvedAt: Date.now(), resolvedBy: ME() }).catch(() => { });
      toast(claim ? 'Tarea reabierta (y anulados sus puntos pendientes)' : 'Tarea reabierta');
      return;
    }
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
  'tg-save': () => {
    const v = Number($('#tg-range').value), [a, b] = MEMBERS();
    closeSheet();
    if (v === taskPctA()) return;
    propose('taskPct', v, `Reparto de tareas: ${prof(a).name} ${v}% · ${prof(b).name} ${100 - v}%`);
  },

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
    const { amount, mode, sugar, customPctA, viaDefault, opts } = readExpenseSplit();
    if (!Number.isFinite(amount) || amount <= 0) { toast('Escribe el importe 💶'); return; }
    const category = picked('ex-cat') || 'otros';
    const base = { title: $('#ex-title').value.trim() || catOf(category)[2], category, amount, paidBy: picked('ex-paid') || ME() };
    // Los gastos fijos pueden seguir "⭐ vuestro reparto" (mode 'default'): si lo cambiáis, cambian los próximos meses.
    const tplSplit = viaDefault ? { mode: 'default', sugar: null, customPctA: 50 } : { mode, sugar: mode === 'sugar' ? sugar : null, customPctA };
    if (d.tpl) { // editar un gasto fijo (afecta al dinero de los próximos meses → la pareja lo ve y puede deshacerlo)
      const day = Math.min(28, Math.max(1, parseInt($('#ex-day').value, 10) || 1));
      const prevTpl = (S.data.recurring || []).find(x => x.id === d.id);
      S.be.update('recurring', d.id, { ...base, ...tplSplit, day, updatedAt: Date.now() }).catch(err => toast(errMsg(err)));
      if (prevTpl) {
        const ch = expenseChanges(prevTpl, { ...base, ...tplSplit });
        if (ch.length || num(prevTpl.day) !== day) logChange('rec-edit', `cambió el gasto fijo «${prevTpl.title}»: ${[...ch, ...(num(prevTpl.day) !== day ? [`día ${day}`] : [])].join(', ')}`,
          { col: 'recurring', id: prevTpl.id, label: `el gasto fijo «${prevTpl.title}»`, doc: snap(prevTpl) });
      }
      closeSheet(); toast('Gasto fijo guardado 🔁'); return;
    }
    const date = $('#ex-date').value || L.ymd();
    if (!d.id && $('#ex-rec') && $('#ex-rec').checked) { // nuevo gasto fijo: se apunta solo (este mes incluido)
      S.be.add('recurring', { ...base, ...tplSplit, day: Math.min(28, Number(date.slice(8, 10))), startMonth: date.slice(0, 7), lastMonth: null, createdBy: ME(), createdAt: Date.now() }).done.catch(err => toast(errMsg(err)));
      closeSheet(); toast(`Gasto fijo: ${eur(amount)} cada mes 🔁`); return;
    }
    const data = { kind: 'expense', ...base, mode, sugar: mode === 'sugar' ? sugar : null, shares: L.computeShares(amount, mode, opts), date, updatedAt: Date.now() };
    if (d.id) {
      const prev = findExp(d.id);
      S.be.update('expenses', d.id, data).catch(err => toast(errMsg(err)));
      const ch = prev ? expenseChanges(prev, data) : [];
      if (ch.length) logChange('exp-edit', `cambió el gasto «${prev.title}»: ${ch.join(', ')}`, { col: 'expenses', id: prev.id, label: `el gasto «${prev.title}»`, doc: snap(prev) });
    } else S.be.add('expenses', { ...data, createdBy: ME(), createdAt: Date.now() }).done.catch(err => toast(errMsg(err)));
    closeSheet(); toast(d.id ? 'Gasto guardado' : `Apuntado: ${eur(amount)} 💸`);
  },
  'exp-delete': async d => {
    if (!await askConfirm({ title: '¿Borrar este gasto?', text: 'Las cuentas se recalculan sin él.', ok: 'Borrar', danger: true })) return;
    const e = findExp(d.id);
    S.be.remove('expenses', d.id).catch(err => toast(errMsg(err)));
    if (e) logChange('exp-del', e.kind === 'settle' ? `borró un pago de ${eur(e.amount)} (${prof(e.paidBy).name} → ${prof(Object.keys(e.shares || {})[0]).name})` : `borró el gasto «${e.title}» · ${eur(e.amount)}`,
      { col: 'expenses', id: e.id, label: e.kind === 'settle' ? `un pago de ${eur(e.amount)}` : `el gasto «${e.title}»`, doc: snap(e) });
    closeSheet();
  },
  'tpl-edit': d => { const r = (S.data.recurring || []).find(x => x.id === d.id); if (r) openExpense(r, { template: true }); },
  'tpl-delete': async d => {
    if (!await askConfirm({ title: '¿Dejar de repetir este gasto?', text: 'Los meses ya apuntados se quedan como están.', ok: 'Dejar de repetir', danger: true })) return;
    const r = (S.data.recurring || []).find(x => x.id === d.id);
    S.be.remove('recurring', d.id).catch(err => toast(errMsg(err)));
    if (r) logChange('rec-del', `dejó de repetir el gasto fijo «${r.title}» · ${eur(r.amount)}/mes`, { col: 'recurring', id: r.id, label: `el gasto fijo «${r.title}»`, doc: snap(r) });
    closeSheet();
  },
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
    if (!needName()) return;
    const p = readProfile();
    S.be.updateCouple({ [`profiles.${ME()}`]: p }).catch(err => toast(errMsg(err)));
    if (p.income !== (prof(ME()).income || 0)) logChange('income', 'ha actualizado sus ingresos (cuentan en el reparto «según ingresos»)');
    closeSheet(); toast('Perfil guardado 💗');
  },
};

/* ---------------- Nombre obligatorio ---------------- */
function needName() {
  const inp = $('#pf-name');
  if (inp && !inp.value.trim()) { toast('Pon tu nombre o un mote ✍️'); inp.focus(); return false; }
  return true;
}

/* ---------------- Recordatorio diario (notificaciones locales) ---------------- */
const notifyHour = () => { const v = lsGet('xp_notify'); return v == null ? null : Number(v); };
function notifySheet() {
  const h = notifyHour();
  return `<h3 class="sheet-title">Recordatorio diario 🔔</h3>
    <p class="muted">Un aviso al día con <b>lo que os toca</b> y lo que <b>espera tu respuesta</b>. Solo si hay algo: si no, no molesta.</p>
    <div class="field"><span>¿A qué hora?</span>
      <div class="chips" id="nt-hour">${[9, 14, 19, 20, 21, 22].map(x => `<button type="button" class="chip ${(h ?? 20) === x ? 'on' : ''}" data-act="pick" data-v="${x}">${x}:00</button>`).join('')}</div></div>
    ${isNative() ? '' : `<p class="warn">Los avisos funcionan en la app de Android (aquí, en el navegador, no suenan).</p>`}
    <p class="muted small">Sin servidor: el móvil programa los avisos de los próximos días cada vez que abres la app.</p>
    <div class="stack"><button class="btn primary big" data-act="notify-save">${h != null ? 'Guardar' : 'Activar'}</button>
      ${h != null ? `<button class="btn" data-act="notify-off">Desactivar</button>` : ''}</div>`;
}
/** Avisos de los próximos 7 días: tareas que te tocan (o libres) y, hoy, lo que espera tu respuesta. */
function buildReminders(hour) {
  const me = ME(), today = L.ymd(), now = Date.now();
  const other = PA();
  // Días en los que me toca cada tarea. Por turnos: la próxima es de quien le toca ahora y luego se alterna.
  const myDays = new Map();
  for (const t of S.data.tasks) {
    if (!L.isActive(t)) continue;
    let days = L.taskDays(t, today, 7);
    if (t.rotate) days = days.filter((_, i) => (i % 2 === 0 ? t.assignee : (t.assignee === me ? other : me)) === me);
    else if (t.assignee && t.assignee !== me) days = [];
    if (days.length) myDays.set(t, days);
  }
  const pend = pendingForMe().length + proposalsForMe().length;
  const out = [];
  for (let k = 0; k < 7; k++) {
    const day = L.addDays(today, k);
    const at = L.parseYmd(day); at.setHours(hour, 0, 0, 0);
    if (at.getTime() <= now + 60e3) continue;
    const names = [...myDays].filter(([, days]) => days.includes(day)).map(([t]) => t.title);
    const bits = [];
    if (names.length) bits.push(`Toca: ${names.slice(0, 3).join(', ')}${names.length > 3 ? ` y ${names.length - 3} más` : ''}`);
    if (k === 0 && pend) bits.push(`${pend} ${pend === 1 ? 'cosa espera' : 'cosas esperan'} tu respuesta`);
    if (!bits.length) continue;
    out.push({ id: 2100 + k, at: at.getTime(), title: k === 0 && pend ? `💌 ${pname()} te espera` : '🧽 Hoy en casa', body: bits.join(' · ') });
  }
  return out;
}
function syncReminders() {
  const h = notifyHour();
  if (h == null || !isNative() || !window.__xpNotify || S.phase !== 'app') return;
  const list = buildReminders(h);
  const sig = JSON.stringify(list);
  if (sig === S.notifySig) return; // solo si cambia algo
  S.notifySig = sig;
  window.__xpNotify.sync(list);
}

/* ---------------- Botón + (apuntar cualquier cosa) ----------------
   Más fácil sin quitar nada: 4 opciones grandes (lo de cada día) y el resto en "Más", en filas pequeñas. */
function addMenu() {
  const pts = !noPoints();
  const main = [
    ...(pts ? [['claim', '✅', 'Ya lo he hecho', 'Una tarea de casa', 'mint']] : []),
    ['thanks', '💛', 'Dar las gracias', 'Sin puntos, con cariño', 'rose'],
    ['expense', '💸', 'Un gasto', 'Y cómo lo repartís', 'butter'],
    ['task', '🧽', 'Nueva tarea', 'Para organizaros', 'lilac'],
    ...(pts ? [] : [['idea', '💡', 'Una idea', 'Peli, plan o comida', 'mint']]),
  ];
  const more = [
    ...(pts ? [['redeem', '🎟️', 'Pedir un favor', 'Con tus puntos'], ['reward', '🙌', `Lo ha hecho ${pname()}`, 'Apúntaselo tú'], ['idea', '💡', 'Una idea', 'Peli, plan o comida']] : []),
    ['save', '🐷', 'Ahorrar', 'Poner dinero en una hucha'],
  ];
  return `<h3 class="sheet-title">¿Qué quieres apuntar?</h3>
    <div class="add-grid">${main.map(([k, e, t, sub, c], i) => `<button class="add-tile ${c}" style="--i:${i}" data-act="add" data-k="${k}">
      <span class="at-e">${e}</span><b>${esc(t)}</b><small>${esc(sub)}</small></button>`).join('')}</div>
    <p class="add-more-lb">Más</p>
    <div class="add-more">${more.map(([k, e, t, sub]) => `<button class="add-row" data-act="add" data-k="${k}">
      <span class="ar-e">${e}</span><span class="ar-t"><b>${esc(t)}</b><small>${esc(sub)}</small></span>${ic('chevron-right')}</button>`).join('')}</div>`;
}
function savePick() {
  const jars = S.data.jars || [];
  if (!jars.length) { openSheet(jarForm()); return; }
  if (jars.length === 1) { openSheet(saveForm(jars[0], 1)); return; }
  openSheet(`<h3 class="sheet-title">¿En qué hucha? 🐷</h3><div class="pick-list">${jars.map(j => `<button class="pick-row" data-act="save-add" data-id="${esc(j.id)}">
    <span class="pr-emoji">${esc(j.emoji)}</span><b>${esc(j.title)}</b><small>${eur(L.jarSaved(S.data.saves || [], j.id))}</small></button>`).join('')}</div>`);
}

function doPoints(type, title, emoji, pts) {
  if (type === 'claim') {
    addPoints({ type: 'claim', to: ME(), amount: pts, title, emoji });
    closeSheet(); toast(`Apuntado: +${pts} 💪 ${pname()} lo verá`);
  } else {
    addPoints({ type: 'reward', to: PA(), amount: pts, title, emoji });
    closeSheet(); celebrate(); toast(`Apuntado a ${pname()}: +${pts} 🙌`);
  }
}
function openExpense(e, opt = {}) {
  openSheet(expenseForm(e, opt), {
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
document.addEventListener('input', e => {
  if (e.target.id === 'join-code') e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (e.target.id === 'wh-opts' && !S.spinning) {
    S.wheelText = e.target.value; S.wheelRes = '';
    const opts = L.parseOptions(S.wheelText), w = $('#wheel');
    if (w) w.outerHTML = wheelHtml(opts);
    const hub = $('.wheel-hub'); if (hub) hub.disabled = opts.length < 2;
    const r = $('#wh-res'); if (r) r.textContent = opts.length < 2 ? 'Pon al menos 2 opciones' : 'Toca ¡Girar!';
  }
});
document.addEventListener('focusout', () => { if (S.deferred) setTimeout(() => { if (!typingInScreen()) { S.deferred = false; render(); } }, 0); });

/* Botón atrás de Android (native.js): cierra la hoja, vuelve a Inicio; si no, deja salir. */
window.__xpBack = () => {
  if (S.dialog) { S.dialog(false); return true; }
  if ($('#sheet-root.open')) { closeSheet(); return true; }
  if (S.phase === 'app' && S.tab !== 'home') { S.tab = 'home'; S.enter = true; render(); return true; }
  if (S.phase === 'auth' && S.authMode !== 'welcome') { S.authMode = 'welcome'; render(); return true; }
  return false;
};
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (S.dialog) S.dialog(false); else closeSheet(); } });
['online', 'offline'].forEach(ev => window.addEventListener(ev, () => { if (S.phase === 'app' && !$('#sheet-root.open')) render(); }));

// Refresca los "hace X min" y el cambio de día si la app se queda abierta.
setInterval(() => { if (S.phase === 'app' && !$('#sheet-root.open')) render(); }, 60e3);

render();
boot();
checkUpdate();
