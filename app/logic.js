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
/** Próxima fecha de una tarea que se repite, al completarla hoy (salta los periodos atrasados). */
export function nextDue(due, repeat, today = ymd()) {
  if (!repeat || repeat === 'none') return null;
  let d = due || today;
  do { d = addPeriod(d, repeat); } while (d <= today);
  return d;
}

/* ---------------- Xurripoints ----------------
   Cada movimiento: { type, from, to, amount, status }
   - claim  (reclamar): from=null → to=yo. Pendiente hasta que la pareja apruebe.
   - reward (premiar):  from=null → to=pareja. Aprobado al momento (lo da quien lo crea).
   - redeem (vale):     from=yo → to=pareja. Pendiente: si la pareja acepta, los puntos pasan a ella.
   - gift   (regalar):  from=yo → to=pareja. Aprobado al momento.
   Saldo = lo recibido − lo entregado, solo de movimientos aprobados. */
export function balances(points, members) {
  const b = Object.fromEntries(members.map(u => [u, 0]));
  for (const t of points) {
    if (t.status !== 'approved') continue;
    if (t.to != null && t.to in b) b[t.to] += t.amount;
    if (t.from != null && t.from in b) b[t.from] -= t.amount;
  }
  return b;
}
/** Puntos "apartados" en vales pedidos que aún no se han contestado. */
export function reserved(points, uid) {
  return points.filter(t => t.status === 'pending' && t.from === uid).reduce((s, t) => s + t.amount, 0);
}
export function available(points, members, uid) {
  return balances(points, members)[uid] - reserved(points, uid);
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

/* ---------------- Tareas ----------------
   Tarea: { title, pts, assignee (uid|null=libre), rotate (por turnos), repeat, due, doneAt }
   "Carga semanal" = Σ peso × veces por semana. Peso = pts (mínimo 5 para que las tareas sin puntos cuenten). */
export const REPEAT_PER_WEEK = { daily: 7, weekly: 1, monthly: 0.25, none: 1 };
export function taskWeight(t) { return Math.max(Number(t.pts) || 0, 5) * (REPEAT_PER_WEEK[t.repeat || 'none'] ?? 1); }
export function isActive(t) { return (t.repeat && t.repeat !== 'none') || !t.doneAt; }
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
