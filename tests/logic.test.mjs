// Pruebas de la lógica pura (saldos, repartos, tareas). Ejecutar: node tests/logic.test.mjs
import assert from 'node:assert/strict';
import * as L from '../app/logic.js';

const M = ['a', 'b'];
let n = 0;
const pending = [];
const ok = name => { n++; console.log('✔', name); };
const t = (name, fn) => { const r = fn(); if (r && r.then) pending.push(r.then(() => ok(name))); else ok(name); };

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

t('recordatorios: qué días toca cada tarea', () => {
  const from = '2026-09-28';
  assert.deepEqual(L.taskDays({ repeat: 'daily', due: '2026-09-28' }, from, 3), ['2026-09-28', '2026-09-29', '2026-09-30']);
  assert.deepEqual(L.taskDays({ repeat: 'weekly', due: '2026-09-20' }, from, 8), ['2026-09-28', '2026-10-04']); // atrasada → hoy
  assert.deepEqual(L.taskDays({ repeat: 'none', due: '2026-09-30' }, from, 7), ['2026-09-30']);
  assert.deepEqual(L.taskDays({ repeat: 'none', due: '2026-10-30' }, from, 7), []);
  assert.deepEqual(L.taskDays({ repeat: 'none', due: '2026-09-01', doneAt: 1 }, from, 7), []); // hecha
  assert.deepEqual(L.taskDays({ repeat: 'weekly', due: null }, from, 7), []);                  // sin fecha
  assert.equal(L.addDays('2026-12-31', 1), '2027-01-01');
});

t('propuestas del catálogo: añadir, cambiar y borrar', () => {
  const list = [{ id: 'x', title: 'Fregar', pts: 10, emoji: '🧽' }];
  assert.deepEqual(L.applyCatalogOp(list, { op: 'upsert', item: { id: 'x', pts: 15 } })[0], { id: 'x', title: 'Fregar', pts: 15, emoji: '🧽' });
  assert.equal(L.applyCatalogOp(list, { op: 'upsert', item: { id: 'y', title: 'Basura', pts: 5 } }).length, 2);
  assert.deepEqual(L.applyCatalogOp(list, { op: 'delete', item: { id: 'x' } }), []);
  assert.deepEqual(L.applyCatalogOp(undefined, { op: 'delete', item: { id: 'x' } }), []);
  assert.equal(list[0].pts, 10); // no cambia la lista original
});

t('primeros pasos: se marcan solos', () => {
  const none = L.firstSteps({}, 'a');
  assert.ok(none.every(s => !s.done));
  assert.equal(none.length, 6);
  const some = L.firstSteps({
    tasks: [{}], expenses: [{ kind: 'settle' }], thanks: [{ from: 'b' }],
    proposals: [{ kind: 'split', status: 'pending', by: 'a' }],
  }, 'a', { points: false, notify: true });
  assert.deepEqual(some.map(s => [s.id, s.done]), [['tasks', true], ['split', true], ['expense', false], ['thanks', false], ['notify', true]]);
});

t('de la demo a la cuenta real: sin personas de la demo', () => {
  const demo = {
    me: 'demoB',
    couple: { members: ['demoA', 'demoB'], catalog: { earn: [{ id: 'e', title: 'Fregar', pts: 10 }], spend: [] } },
    tasks: [
      { id: '1', title: 'Basura', assignee: 'demoB', rotate: false, doneAt: null },
      { id: '2', title: 'Baño', assignee: 'demoA', rotate: false, doneAt: 5 },
      { id: '3', title: 'Platos', assignee: 'demoA', rotate: true, doneAt: null },
    ],
    ideas: [{ id: 'i', title: 'Pizza', votes: { demoA: 1, demoB: -1 } }],
    jars: [{ id: 'j', title: 'Viaje', emoji: '✈️', target: 1000, createdBy: 'demoA' }],
  };
  const s = L.demoToSeed(demo, 'yo');
  assert.deepEqual(s.tasks.map(t => t.assignee), ['yo', null, 'yo']);
  assert.equal(s.tasks[1].doneBy, 'yo');
  assert.ok(s.tasks.every(t => !('id' in t)));
  assert.deepEqual(s.ideas[0].votes, { yo: -1 });
  assert.deepEqual(s.jars, [{ title: 'Viaje', emoji: '✈️', target: 1000 }]);
  assert.equal(s.catalog.earn[0].title, 'Fregar');
  assert.ok(!JSON.stringify(s).includes('demoA'));
  assert.equal(L.demoToSeed(null, 'yo'), null);
});

t('Plus: prueba de 14 días, plan de pago y "para siempre"', () => {
  const now = Date.now(), D = 86400e3;
  assert.deepEqual(L.plusState({}, now), { active: false, trialUsed: false, tier: null, daysLeft: 0, forever: false });
  const trial = L.trialDoc('a', now);
  assert.equal(trial.until - trial.since, 14 * D);
  const s = L.plusState({ plus: trial }, now + 3 * D);
  assert.ok(s.active && s.trialUsed && s.tier === 'trial' && s.daysLeft === 11);
  const over = L.plusState({ plus: trial }, now + 15 * D);
  assert.ok(!over.active && over.trialUsed && over.daysLeft === 0); // la prueba no se repite
  assert.ok(L.plusState({ plus: { tier: 'plus', until: null } }, now).forever);
  assert.ok(L.plusState({ plus: { tier: 'plus', until: null } }, now).active);
  assert.ok(!L.plusState({ plus: { tier: 'trial', until: null } }, now).active); // una prueba sin fin no vale
  assert.ok(!L.plusState({ plus: { tier: 'plus', until: 'mañana' } }, now).active);
});

t('resumen del mes: total, categorías, parte fija y mes anterior (sin liquidaciones)', () => {
  const E = [
    { kind: 'expense', amount: 6000, category: 'super', date: '2026-09-02' },
    { kind: 'expense', amount: 75000, category: 'casa', date: '2026-09-01', recurringId: 'alq' },
    { kind: 'expense', amount: 4000, category: 'super', date: '2026-09-20' },
    { kind: 'settle', amount: 99999, date: '2026-09-21', shares: { a: 99999 } },
    { kind: 'expense', amount: 42500, category: 'casa', date: '2026-08-10' },
  ];
  const s = L.monthSummary(E, '2026-09');
  assert.equal(s.total, 85000);
  assert.equal(s.count, 3);
  assert.equal(s.fixed, 75000);
  assert.deepEqual(s.byCat, [['casa', 75000], ['super', 10000]]);
  assert.equal(s.diffPct, 100);
  assert.equal(L.monthSummary(E, '2026-08').diffPct, null);
  assert.deepEqual(L.expenseMonths(E), ['2026-09', '2026-08']);
});

t('exportar gastos a CSV para Excel (y sin fórmulas coladas)', () => {
  const E = [
    { kind: 'expense', title: 'Cena; japo', amount: 4801, category: 'fuera', paidBy: 'a', shares: { a: 2401, b: 2400 }, date: '2026-09-03', createdAt: 2 },
    { kind: 'settle', amount: 1000, paidBy: 'b', shares: { a: 1000 }, date: '2026-09-04', createdAt: 3 },
    { kind: 'expense', title: '=HYPERLINK("x")', amount: 100, category: 'otros', paidBy: 'b', shares: { a: 50, b: 50 }, date: '2026-09-01', createdAt: 1 },
  ];
  const csv = L.expensesCsv(E, M, { names: { a: 'Ana', b: 'Bea' }, cats: { fuera: 'Comer fuera' } });
  assert.ok(csv.startsWith('﻿'));
  const lines = csv.slice(1).split('\r\n');
  assert.equal(lines[0], 'Fecha;Concepto;Categoría;Importe (€);Pagó;Parte de Ana (€);Parte de Bea (€);Tipo');
  assert.equal(lines[1], `2026-09-01;"'=HYPERLINK(""x"")";otros;1,00;Bea;0,50;0,50;Gasto`); // ordenado por fecha
  assert.equal(lines[2], '2026-09-03;"Cena; japo";Comer fuera;48,01;Ana;24,01;24,00;Gasto');
  assert.equal(lines[3], '2026-09-04;Liquidación;;10,00;Bea;;;Pago a Ana');
  assert.equal(L.csvCell('-5'), "'-5");
});

t('revisión semanal: la semana de los dos, sumada', () => {
  const now = Date.now(), D = 86400e3;
  const w = L.weekStats({
    tasks: [{ log: [{ by: 'a', at: now - D }, { by: 'b', at: now - 2 * D }, { by: 'a', at: now - 9 * D }] }, { log: [] }],
    thanks: [{ createdAt: now - D }, { createdAt: now - 10 * D }],
    ideas: [{ title: 'Picnic', doneAt: now - 3 * D }, { title: 'Cine', doneAt: null }],
    expenses: [{ kind: 'expense', amount: 1000, date: L.ymd(new Date(now - D)) }, { kind: 'settle', amount: 500, date: L.ymd(new Date(now)) }],
    points: [
      { type: 'claim', from: null, to: 'a', amount: 10, status: 'approved', createdAt: now - D, resolvedAt: now - D },              // cuenta
      { type: 'claim', from: null, to: 'b', amount: 5, status: 'approved', createdAt: now - D, resolvedAt: now - D, taskId: 't1' }, // ya está en el log
      { type: 'claim', from: null, to: 'b', amount: 5, status: 'rejected', createdAt: now - D },                                     // no
    ],
  }, now);
  assert.deepEqual(w, { tasksDone: 3, thanks: 1, plans: ['Picnic'], spent: 1000, points: 15 });
});

t('la versión es la misma en CHANGELOG, package.json y app.js', async () => {
  const fs = await import('node:fs');
  const read = f => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
  const changelog = (read('CHANGELOG.md').match(/\[(\d+\.\d+\.\d+)\]/) || [])[1];
  const pkg = JSON.parse(read('package.json')).version;
  const app = (read('app/app.js').match(/const VERSION = '([\d.]+)'/) || [])[1];
  assert.ok(changelog, 'el CHANGELOG no tiene ninguna versión [x.y.z]');
  assert.equal(pkg, changelog, `package.json (${pkg}) ≠ CHANGELOG (${changelog})`);
  assert.equal(app, changelog, `app.js VERSION (${app}) ≠ CHANGELOG (${changelog})`);
  // En git siempre 'github': GitHub Actions lo cambia a 'play' solo para el .aab de Google Play.
  assert.match(read('app/channel.js'), /CHANNEL = 'github'/, "app/channel.js tiene que ser 'github' en el repo");
});

await Promise.all(pending);
console.log(`\n${n} pruebas OK`);
