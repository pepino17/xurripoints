// Pruebas de la lógica pura (saldos, repartos, tareas). Ejecutar: node tests/logic.test.mjs
import assert from 'node:assert/strict';
import * as L from '../app/logic.js';

const M = ['a', 'b'];
let n = 0;
const t = (name, fn) => { fn(); n++; console.log('✔', name); };

t('saldos: solo cuentan los aprobados; los vales mueven puntos a la pareja', () => {
  const P = [
    { type: 'claim', from: null, to: 'a', amount: 15, status: 'approved' },
    { type: 'reward', from: null, to: 'b', amount: 20, status: 'approved' },
    { type: 'redeem', from: 'b', to: 'a', amount: 10, status: 'approved' },
    { type: 'gift', from: 'a', to: 'b', amount: 5, status: 'approved' },
    { type: 'claim', from: null, to: 'a', amount: 99, status: 'pending' },
    { type: 'claim', from: null, to: 'a', amount: 99, status: 'rejected' },
  ];
  assert.deepEqual(L.balances(P, M), { a: 20, b: 15 });
});

t('vales pendientes apartan puntos', () => {
  const P = [
    { type: 'claim', from: null, to: 'a', amount: 50, status: 'approved' },
    { type: 'redeem', from: 'a', to: 'b', amount: 30, status: 'pending' },
  ];
  assert.equal(L.reserved(P, 'a'), 30);
  assert.equal(L.available(P, M, 'a'), 20);
});

t('repartos: 50/50, proporcional, sugar y a medida suman el total', () => {
  const o = { members: M, incomes: { a: 300000, b: 100000 }, customPctA: 70 };
  assert.deepEqual(L.computeShares(1001, 'equal', o), { a: 501, b: 500 });
  assert.deepEqual(L.computeShares(1000, 'proportional', o), { a: 750, b: 250 });
  assert.deepEqual(L.computeShares(1000, 'sugar', { ...o, sugar: 'b' }), { a: 0, b: 1000 });
  assert.deepEqual(L.computeShares(1000, 'custom', o), { a: 700, b: 300 });
  assert.deepEqual(L.computeShares(1000, 'proportional', { members: M, incomes: {} }), { a: 500, b: 500 });
});

t('deuda neta y liquidación', () => {
  const E = [
    { amount: 1000, paidBy: 'a', shares: { a: 500, b: 500 } },
    { amount: 400, paidBy: 'b', shares: { a: 0, b: 400 } },
  ];
  assert.deepEqual(L.netBalances(E, M), { a: 500, b: -500 });
  E.push({ kind: 'settle', amount: 500, paidBy: 'b', shares: { a: 500 } });
  assert.deepEqual(L.netBalances(E, M), { a: 0, b: 0 });
});

t('leer euros en formato español', () => {
  assert.equal(L.parseEur('12,5'), 1250);
  assert.equal(L.parseEur('1.234,56'), 123456);
  assert.equal(L.parseEur('1.234'), 123400);
  assert.equal(L.parseEur('12.50 €'), 1250);
  assert.ok(Number.isNaN(L.parseEur('')));
  assert.ok(Number.isNaN(L.parseEur('abc')));
});

t('próxima fecha de tareas que se repiten', () => {
  assert.equal(L.nextDue('2026-09-28', 'daily', '2026-09-28'), '2026-09-29');
  assert.equal(L.nextDue('2026-09-20', 'weekly', '2026-09-28'), '2026-10-04');
  assert.equal(L.nextDue('2026-10-01', 'weekly', '2026-09-28'), '2026-10-08');
  assert.equal(L.nextDue('2026-01-31', 'monthly', '2026-01-31'), '2026-02-28');
  assert.equal(L.nextDue(null, 'none', '2026-09-28'), null);
});

t('reparto automático de tareas libres', () => {
  const T = [
    { id: '1', pts: 20, repeat: 'weekly', assignee: 'a' },
    { id: '2', pts: 10, repeat: 'weekly', assignee: null },
    { id: '3', pts: 10, repeat: 'weekly', assignee: null },
    { id: '4', pts: 5, repeat: 'none', assignee: null, doneAt: 123 }, // hecha: no cuenta
  ];
  const plan = L.autoAssign(T, M, 50);
  assert.deepEqual(plan.map(p => p[1]).sort(), ['b', 'b']);
  const { load } = L.taskLoad(T, M);
  assert.equal(load.a, 20);
});

t('códigos de pareja: 6 caracteres sin letras confusas', () => {
  for (let i = 0; i < 200; i++) assert.match(L.genCode(), /^[A-HJ-NP-Z2-9]{6}$/);
});

t('gastos fijos: qué meses faltan por apuntar', () => {
  assert.equal(L.addMonth('2026-12'), '2027-01');
  assert.equal(L.addMonth('2026-01', -1), '2025-12');
  assert.deepEqual(L.recurringDue({ day: 1, startMonth: '2026-09', lastMonth: null }, '2026-09-28'), ['2026-09']);
  assert.deepEqual(L.recurringDue({ day: 30, startMonth: '2026-09', lastMonth: null }, '2026-09-28'), []);
  assert.deepEqual(L.recurringDue({ day: 5, startMonth: '2026-07', lastMonth: '2026-07' }, '2026-09-28'), ['2026-08', '2026-09']);
  assert.deepEqual(L.recurringDue({ day: 5, startMonth: '2026-07', lastMonth: '2026-09' }, '2026-09-28'), []);
  assert.equal(L.recurringDate('2026-02', 31), '2026-02-28');
});

t('versiones', () => {
  assert.ok(L.isNewer('0.3.0', '0.2.9'));
  assert.ok(L.isNewer('v1.0.0', '0.9.9'));
  assert.ok(!L.isNewer('0.2.0', '0.2.0'));
  assert.ok(!L.isNewer('0.1.9', '0.2.0'));
});

t('confianza por defecto: una reclamación sin respuesta en 24 h cuenta sola; los vales no', () => {
  const now = Date.now(), H = 3600e3;
  const P = [
    { type: 'claim', from: null, to: 'a', amount: 10, status: 'pending', createdAt: now - 25 * H },
    { type: 'claim', from: null, to: 'a', amount: 7, status: 'pending', createdAt: now - 2 * H },
    { type: 'redeem', from: 'a', to: 'b', amount: 5, status: 'pending', createdAt: now - 48 * H },
  ];
  assert.deepEqual(L.balances(P, M, now), { a: 10, b: 0 });
  assert.equal(L.reserved(P, 'a'), 5);
  assert.ok(L.isAutoAccepted(P[0], now));
  assert.ok(!L.isAutoAccepted(P[1], now));
});

t('meta juntos y semana juntos: cuentan los puntos nuevos de los dos', () => {
  const now = Date.now(), D = 86400e3;
  const P = [
    { from: null, to: 'a', amount: 10, status: 'approved', resolvedAt: now - D },
    { from: null, to: 'b', amount: 20, status: 'approved', resolvedAt: now - 2 * D },
    { from: 'a', to: 'b', amount: 50, status: 'approved', resolvedAt: now - D }, // vale: no suma a la meta
    { from: null, to: 'a', amount: 99, status: 'approved', resolvedAt: now - 20 * D },
  ];
  assert.equal(L.goalProgress(P, { since: now - 10 * D }, now), 30);
  assert.equal(L.weekTogether(P, now), 30);
});

t('planes: match cuando los dos votan que sí', () => {
  assert.ok(L.ideaState({ votes: { a: 1, b: 1 } }, M).match);
  assert.ok(!L.ideaState({ votes: { a: 1 } }, M).match);
  assert.ok(L.ideaState({ votes: { a: 1, b: -1 } }, M).vetoed);
  assert.equal(L.pickRandom([]), null);
  assert.equal(L.dayIndex(40, '2026-09-28'), L.dayIndex(40, '2026-09-28'));
});

t('ahorro y ruleta', () => {
  assert.equal(L.jarSaved([{ jar: 'x', amount: 5000 }, { jar: 'x', amount: -1000 }, { jar: 'y', amount: 99 }], 'x'), 4000);
  assert.deepEqual(L.parseOptions('Pizza, Sushi\n  \nTacos'), ['Pizza', 'Sushi', 'Tacos']);
  // la opción elegida queda arriba: (centro + giro) múltiplo de 360
  for (const [prev, i, n] of [[0, 0, 4], [725, 2, 3], [1800, 5, 6]]) {
    const r = L.wheelTarget(prev, i, n);
    const center = i * (360 / n) + 180 / n;
    assert.equal(((center + r) % 360 + 360) % 360, 0);
    assert.ok(r > prev);
  }
});

t('tres en raya y conecta 4', () => {
  assert.deepEqual(L.tttWinner(['a', 'a', 'a', null, 'b', 'b', null, null, null]).line, [0, 1, 2]);
  assert.equal(L.tttWinner(['a', 'b', 'a', 'a', 'b', 'b', 'b', 'a', 'a']).who, 'draw');
  assert.equal(L.tttWinner(Array(9).fill(null)), null);
  let b = Array(42).fill(null);
  for (let k = 0; k < 4; k++) b = L.c4Drop(b, 3, 'a').board; // vertical
  assert.equal(L.c4Winner(b).who, 'a');
  let d = Array(42).fill(null);
  [[0, 'a'], [1, 'b'], [1, 'a'], [2, 'b'], [2, 'b'], [2, 'a'], [3, 'b'], [3, 'b'], [3, 'b'], [3, 'a']].forEach(([c, w]) => { d = L.c4Drop(d, c, w).board; });
  assert.equal(L.c4Winner(d).who, 'a'); // diagonal
  let full = Array(42).fill(null);
  for (let k = 0; k < 6; k++) full = L.c4Drop(full, 0, 'a').board;
  assert.equal(L.c4Drop(full, 0, 'b'), null); // columna llena
});

t('piedra, papel o tijera', () => {
  assert.equal(L.rpsResult('piedra', 'tijera'), 1);
  assert.equal(L.rpsResult('piedra', 'papel'), -1);
  assert.equal(L.rpsResult('papel', 'papel'), 0);
  assert.equal(L.shuffle([1, 2, 3, 4]).length, 4);
});

t('azar justo: moneda, dado, ruleta y baraja salen parejos', () => {
  // Prueba chi-cuadrado: con estas muestras, un generador justo casi nunca supera el umbral (p ≈ 0,001).
  const chi2 = (counts, expected) => counts.reduce((s, c) => s + (c - expected) ** 2 / expected, 0);
  const tally = (n, k, fn) => { const c = Array(k).fill(0); for (let i = 0; i < n; i++) c[fn()]++; return c; };
  const coin = tally(60000, 2, () => L.randInt(2));
  assert.ok(chi2(coin, 30000) < 10.8, `moneda ${coin}`);            // gl=1
  const die = tally(60000, 6, () => L.randInt(6));
  assert.ok(chi2(die, 10000) < 20.5, `dado ${die}`);                // gl=5
  const wheel = tally(70000, 7, () => L.randInt(7));
  assert.ok(chi2(wheel, 10000) < 22.5, `ruleta ${wheel}`);          // gl=6
  // Baraja: cada elemento acaba en cada posición con la misma frecuencia
  const pos = Array.from({ length: 4 }, () => Array(4).fill(0));
  for (let i = 0; i < 40000; i++) L.shuffle([0, 1, 2, 3]).forEach((v, p) => pos[v][p]++);
  for (const row of pos) assert.ok(chi2(row, 10000) < 16.3, `baraja ${row}`); // gl=3
  // Rangos correctos
  for (let i = 0; i < 2000; i++) { const x = L.rand(); assert.ok(x >= 0 && x < 1); const k = L.randInt(3); assert.ok(k >= 0 && k < 3 && Number.isInteger(k)); }
  assert.equal(L.randInt(1), 0);
  assert.equal(L.randInt(0), 0);
});

console.log(`\n${n} pruebas OK`);
