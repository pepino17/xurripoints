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

console.log(`\n${n} pruebas OK`);
