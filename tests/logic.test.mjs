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

console.log(`\n${n} pruebas OK`);
