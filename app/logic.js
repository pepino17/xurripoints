/* ================================================================
   Xurripoints — lógica pura (sin DOM ni Firebase). Se puede probar con Node:
   `node tests/logic.test.mjs`.
   - Dinero SIEMPRE en céntimos (enteros). Puntos, enteros.
   - "A" = members[0] (quien creó la pareja), "B" = members[1].
   ================================================================ */

export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I para no confundir

export function genCode(len = 6) {
  let s = '';
  const buf = new Uint32Array(len);
  (globalThis.crypto || { getRandomValues: a => a.map(() => Math.floor(Math.random() * 2 ** 32)) }).getRandomValues(buf);
  for (let i = 0; i < len; i++) s += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length];
  return s;
}

export function uid8() { return Math.random().toString(36).slice(2, 10); }

/* ---------------- Fechas (siempre locales, formato YYYY-MM-DD) ---------------- */
export function ymd(d = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export function parseYmd(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
export function addPeriod(s, repeat) {
  const d = parseYmd(s);
  if (repeat === 'daily') d.setDate(d.getDate() + 1);
  else if (repeat === 'weekly') d.setDate(d.getDate() + 7);
  else if (repeat === 'monthly') {
    const day = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth() + 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
  }
  return ymd(d);
}
export function addDays(s, n) { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
/** Próxima fecha de una tarea que se repite, al completarla hoy (salta los periodos atrasados). */
export function nextDue(due, repeat, today = ymd()) {
  if (!repeat || repeat === 'none') return null;
  let d = due || today;
  do { d = addPeriod(d, repeat); } while (d <= today);
  return d;
}

/* ---------------- Xurripoints ----------------
   Cada movimiento: { type, from, to, amount, status }
   - claim  (reclamar): from=null → to=yo. La pareja da las gracias (acepta). Si no contesta en 24 h,
                        cuenta sola: CONFIANZA POR DEFECTO (evita que uno "audite" al otro; ver docs/PSICOLOGIA.md).
   - reward (premiar):  from=null → to=pareja. Aprobado al momento (lo da quien lo crea).
   - redeem (vale):     from=yo → to=pareja. Pendiente: si la pareja acepta, los puntos pasan a ella.
                        Los vales SIEMPRE necesitan respuesta (piden algo del tiempo de la otra persona).
   - gift   (regalar):  from=yo → to=pareja. Aprobado al momento.
   Saldo = lo recibido − lo entregado, solo de movimientos aprobados (o aceptados solos). */
export const AUTO_ACCEPT_MS = 24 * 3600e3;
/** Estado real de un movimiento: una reclamación sin respuesta en 24 h se da por aceptada. */
export function effStatus(t, now = Date.now()) {
  if (t.status === 'pending' && t.type === 'claim' && t.createdAt && now - t.createdAt >= AUTO_ACCEPT_MS) return 'approved';
  return t.status;
}
export function isAutoAccepted(t, now = Date.now()) { return t.status === 'pending' && effStatus(t, now) === 'approved'; }

export function balances(points, members, now = Date.now()) {
  const b = Object.fromEntries(members.map(u => [u, 0]));
  for (const t of points) {
    if (effStatus(t, now) !== 'approved') continue;
    if (t.to != null && t.to in b) b[t.to] += t.amount;
    if (t.from != null && t.from in b) b[t.from] -= t.amount;
  }
  return b;
}
/** Puntos "apartados" en vales pedidos que aún no se han contestado. */
export function reserved(points, uid) {
  return points.filter(t => t.status === 'pending' && t.type === 'redeem' && t.from === uid).reduce((s, t) => s + t.amount, 0);
}
export function available(points, members, uid) {
  return balances(points, members)[uid] - reserved(points, uid);
}
/** Meta juntos: puntos NUEVOS (reclamados o premiados) que habéis sumado entre los dos desde que empezó. */
export function goalProgress(points, goal, now = Date.now()) {
  if (!goal) return 0;
  return points.filter(t => t.from == null && effStatus(t, now) === 'approved' && (t.resolvedAt || t.createdAt || 0) >= (goal.since || 0))
    .reduce((s, t) => s + t.amount, 0);
}

/* ---------------- Planes (decidir juntos) ----------------
   Idea: { list:'pelis'|'planes'|'comida', title, note, votes:{uid: 1 | -1}, doneAt }.
   Match = los dos han votado 👍. */
export function ideaState(idea, members) {
  const v = idea.votes || {};
  const ups = members.filter(u => v[u] === 1).length;
  return { match: members.length > 1 && ups === members.length, ups, vetoed: members.some(u => v[u] === -1) };
}
/* ---------------- Azar justo ----------------
   Generador criptográfico del sistema (crypto.getRandomValues) en vez de Math.random, y enteros por
   "rechazo" para que ninguna opción salga más que otra (sin sesgo de módulo). */
const CRYPTO = globalThis.crypto && globalThis.crypto.getRandomValues ? globalThis.crypto : null;
function u32() { const b = new Uint32Array(1); CRYPTO.getRandomValues(b); return b[0]; }
/** Número al azar en [0, 1). */
export function rand() { return CRYPTO ? u32() / 2 ** 32 : Math.random(); }
/** Entero al azar en [0, n), todos con la misma probabilidad. */
export function randInt(n) {
  n = Math.floor(n);
  if (!(n > 0)) return 0;
  if (!CRYPTO) return Math.floor(Math.random() * n);
  const lim = Math.floor(2 ** 32 / n) * n; // descarta el trozo final que haría unas opciones más probables
  let x;
  do { x = u32(); } while (x >= lim);
  return x % n;
}
export function pickRandom(list, rnd) { return list.length ? list[rnd ? Math.floor(rnd() * list.length) : randInt(list.length)] : null; }
/** Índice que cambia cada día pero es el mismo en los dos móviles (pregunta del día). */
export function dayIndex(n, day = ymd()) {
  let h = 7;
  for (const c of day) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return n ? h % n : 0;
}

/* ---------------- Gastos ----------------
   Gasto: { amount, paidBy, shares: {uid: céntimos que le tocan} }. La suma de shares = amount.
   Liquidación (kind:'settle'): paidBy = quien paga la deuda, shares = {quien cobra: amount}. */
export const SPLIT_MODES = ['equal', 'proportional', 'sugar', 'custom'];

/** % que le toca a members[0] según el modo. */
export function pctA(mode, { members, incomes = {}, sugar, customPctA = 50 }) {
  const [a, b] = members;
  if (mode === 'equal') return 50;
  if (mode === 'proportional') {
    const ia = Math.max(0, incomes[a] || 0), ib = Math.max(0, incomes[b] || 0);
    if (ia + ib <= 0) return 50;
    return (ia / (ia + ib)) * 100;
  }
  if (mode === 'sugar') return sugar === a ? 100 : 0;
  if (mode === 'custom') return Math.min(100, Math.max(0, Number(customPctA) || 0));
  return 50;
}
export function computeShares(amount, mode, opts) {
  const [a, b] = opts.members;
  const sa = Math.round(amount * pctA(mode, opts) / 100);
  return { [a]: sa, [b]: amount - sa };
}
/** Neto por persona: > 0 = le deben; < 0 = debe. Siempre net[a] = −net[b]. */
export function netBalances(expenses, members) {
  const n = Object.fromEntries(members.map(u => [u, 0]));
  for (const e of expenses) {
    if (e.paidBy in n) n[e.paidBy] += e.amount;
    for (const [u, c] of Object.entries(e.shares || {})) if (u in n) n[u] -= c;
  }
  return n;
}
/** Convierte "12,5" / "12.50 €" / "1.234,56" en céntimos. NaN si no es válido. */
export function parseEur(str) {
  let s = String(str ?? '').replace(/[€\s]/g, '');
  if (!s) return NaN;
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.'); // formato español: 1.234,56
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');   // 1.234 = mil doscientos…
  if (!/^\d*\.?\d{0,2}$/.test(s) || s === '.') return NaN;
  return Math.round(parseFloat(s) * 100);
}

/* ---------------- Gastos fijos (se repiten cada mes) ----------------
   Plantilla: { day (1-28), startMonth 'YYYY-MM', lastMonth 'YYYY-MM'|null, … }.
   Cada mes se crea el gasto con id fijo `rec_<plantilla>_<YYYY-MM>` → si los dos móviles lo crean
   a la vez escriben el MISMO documento (no hay duplicados). */
export function addMonth(ym, n = 1) {
  let [y, m] = ym.split('-').map(Number);
  m += n;
  y += Math.floor((m - 1) / 12);
  m = (((m - 1) % 12) + 12) % 12 + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}
/** Meses que faltan por apuntar de una plantilla hasta hoy (máx. 24 de golpe). */
export function recurringDue(tpl, today = ymd()) {
  const cur = today.slice(0, 7), d = Number(today.slice(8, 10));
  let m = tpl.lastMonth ? addMonth(tpl.lastMonth) : tpl.startMonth;
  const out = [];
  for (let i = 0; m && m <= cur && i < 24; i++, m = addMonth(m)) {
    if (m < cur || (tpl.day || 1) <= d) out.push(m);
  }
  return out;
}
export function recurringDate(month, day) { return `${month}-${String(Math.min(28, Math.max(1, day || 1))).padStart(2, '0')}`; }

/** ¿La versión a (p. ej. "0.3.0") es más nueva que b? */
export function isNewer(a, b) {
  const pa = String(a || '').replace(/^v/, '').split('.').map(Number), pb = String(b || '').replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) > (pb[i] || 0);
  return false;
}
/** Puntos nuevos que habéis sumado ENTRE LOS DOS en los últimos 7 días (no se compara quién más). */
export function weekTogether(points, now = Date.now()) {
  return points.filter(t => t.from == null && effStatus(t, now) === 'approved' && (t.resolvedAt || t.createdAt || 0) >= now - 7 * 86400e3)
    .reduce((s, t) => s + t.amount, 0);
}

/* ---------------- Tareas ----------------
   Tarea: { title, pts, assignee (uid|null=libre), rotate (por turnos), repeat, due, doneAt }
   "Carga semanal" = Σ peso × veces por semana. Peso = pts (mínimo 5 para que las tareas sin puntos cuenten). */
export const REPEAT_PER_WEEK = { daily: 7, weekly: 1, monthly: 0.25, none: 1 };
export function taskWeight(t) { return Math.max(Number(t.pts) || 0, 5) * (REPEAT_PER_WEEK[t.repeat || 'none'] ?? 1); }
export function isActive(t) { return (t.repeat && t.repeat !== 'none') || !t.doneAt; }
/** Días (YYYY-MM-DD) en los que toca una tarea desde `from` durante `days` días (para los recordatorios).
    Una tarea atrasada cuenta hoy. Sin fecha → ningún día. */
export function taskDays(t, from = ymd(), days = 7) {
  if (!isActive(t) || !t.due) return [];
  const end = addDays(from, days);
  const repeats = t.repeat && t.repeat !== 'none';
  if (!repeats) { const d = t.due < from ? from : t.due; return d < end ? [d] : []; }
  const out = [];
  let cur = t.due;
  if (cur < from) { out.push(from); cur = nextDue(t.due, t.repeat, from); }
  for (let i = 0; cur < end && i < 40; i++, cur = addPeriod(cur, t.repeat)) if (!out.includes(cur)) out.push(cur);
  return out;
}
export function taskLoad(tasks, members) {
  const load = Object.fromEntries(members.map(u => [u, 0]));
  let free = 0;
  for (const t of tasks) {
    if (!isActive(t)) continue;
    const w = taskWeight(t);
    if (t.rotate && members.length === 2) { load[members[0]] += w / 2; load[members[1]] += w / 2; }
    else if (t.assignee && t.assignee in load) load[t.assignee] += w;
    else free += w;
  }
  return { load, free };
}
/** Reparte las tareas libres para acercarse al % objetivo de members[0]. Devuelve [[taskId, uid], ...]. */
export function autoAssign(tasks, members, targetPctA = 50) {
  const [a, b] = members;
  const { load } = taskLoad(tasks, members);
  const ta = Math.max(targetPctA, 1) / 100, tb = Math.max(100 - targetPctA, 1) / 100;
  const free = tasks.filter(t => isActive(t) && !t.assignee && !t.rotate).sort((x, y) => taskWeight(y) - taskWeight(x));
  const out = [];
  for (const t of free) {
    const w = taskWeight(t);
    // a quien, tras asignarle esta tarea, quede más cerca de su objetivo
    const who = (load[a] + w) / ta <= (load[b] + w) / tb ? a : b;
    load[who] += w;
    out.push([t.id, who]);
  }
  return out;
}

/* ---------------- Ahorro (huchas) ---------------- */
/** Lo ahorrado en una hucha: suma de aportaciones (las retiradas son negativas). */
export function jarSaved(saves, jarId) { return saves.filter(s => s.jar === jarId).reduce((t, s) => t + (s.amount || 0), 0); }

/* ---------------- Decidir: ruleta ---------------- */
/** Opciones escritas una por línea o separadas por comas (máx. 12). */
export function parseOptions(text) { return String(text || '').split(/[\n,]+/).map(s => s.trim()).filter(Boolean).slice(0, 12); }
/** Giro final (grados, sentido horario) para que la opción i de n quede bajo la flecha de arriba. */
export function wheelTarget(prevRot, i, n, turns = 5, jitter = 0) {
  const seg = 360 / n;
  const center = i * seg + seg / 2 + jitter;
  const base = prevRot - (((prevRot % 360) + 360) % 360);
  return base + turns * 360 + ((360 - center) % 360 + 360) % 360;
}

/* ---------------- Juegos para dos ---------------- */
export const TTT_LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
/** Tres en raya: {who, line} si alguien gana, {who:'draw'} si empate, null si sigue. */
export function tttWinner(b) {
  for (const [x, y, z] of TTT_LINES) if (b[x] && b[x] === b[y] && b[x] === b[z]) return { who: b[x], line: [x, y, z] };
  return b.every(Boolean) ? { who: 'draw', line: [] } : null;
}
export const C4_COLS = 7, C4_ROWS = 6;
/** Conecta 4: deja caer una ficha en la columna. Devuelve {board, index} o null si está llena. */
export function c4Drop(board, col, who) {
  for (let r = C4_ROWS - 1; r >= 0; r--) {
    const i = r * C4_COLS + col;
    if (!board[i]) { const nb = board.slice(); nb[i] = who; return { board: nb, index: i }; }
  }
  return null;
}
export function c4Winner(b) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let r = 0; r < C4_ROWS; r++) for (let c = 0; c < C4_COLS; c++) {
    const w = b[r * C4_COLS + c];
    if (!w) continue;
    for (const [dr, dc] of dirs) {
      const line = [r * C4_COLS + c];
      for (let k = 1, rr = r + dr, cc = c + dc; k < 4; k++, rr += dr, cc += dc) {
        if (rr < 0 || rr >= C4_ROWS || cc < 0 || cc >= C4_COLS || b[rr * C4_COLS + cc] !== w) break;
        line.push(rr * C4_COLS + cc);
      }
      if (line.length === 4) return { who: w, line };
    }
  }
  return b.every(Boolean) ? { who: 'draw', line: [] } : null;
}
/** Piedra, papel o tijera: 1 si gana a, -1 si gana b, 0 empate. */
export const RPS_BEATS = { piedra: 'tijera', papel: 'piedra', tijera: 'papel' };
export function rpsResult(a, b) { return a === b ? 0 : RPS_BEATS[a] === b ? 1 : -1; }
/** Baraja (Fisher-Yates): todas las ordenaciones igual de probables. */
export function shuffle(list, rnd) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd ? Math.floor(rnd() * (i + 1)) : randInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
