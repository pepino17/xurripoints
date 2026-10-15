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

t('saldos: a quien no está en la pareja no se le apunta nada', () => {
  const P = [
    { type: 'claim', from: null, to: 'zzz', amount: 50, status: 'approved' }, // destino desconocido: no suma a nadie
    { type: 'gift', from: 'zzz', to: 'a', amount: 30, status: 'approved' },    // el que da no está: 'a' cobra igual
  ];
  assert.deepEqual(L.balances(P, M), { a: 30, b: 0 });
  assert.deepEqual(L.balances([], M), { a: 0, b: 0 });
});

t('vales: solo se apartan los vales pendientes que he pedido yo', () => {
  const P = [
    { type: 'redeem', from: 'a', to: 'b', amount: 30, status: 'pending' },
    { type: 'redeem', from: 'a', to: 'b', amount: 20, status: 'pending' },
    { type: 'redeem', from: 'a', to: 'b', amount: 99, status: 'approved' }, // resuelto: ya no aparta
    { type: 'redeem', from: 'b', to: 'a', amount: 40, status: 'pending' },  // lo pidió la pareja
    { type: 'claim', from: null, to: 'a', amount: 70, status: 'pending' },  // una reclamación no aparta
  ];
  assert.equal(L.reserved(P, 'a'), 50);
  assert.equal(L.reserved(P, 'b'), 40);
});

t('disponible: lo apartado en vales puede dejar el saldo en negativo', () => {
  const P = [
    { type: 'gift', from: 'b', to: 'a', amount: 10, status: 'approved' },
    { type: 'redeem', from: 'b', to: 'a', amount: 40, status: 'pending' },
  ];
  assert.equal(L.balances(P, M).b, -10);
  assert.equal(L.available(P, M, 'b'), -50);
});

t('repartos: 50/50, proporcional, sugar y a medida suman el total', () => {
  const o = { members: M, incomes: { a: 300000, b: 100000 }, customPctA: 70 };
  assert.deepEqual(L.computeShares(1001, 'equal', o), { a: 501, b: 500 });
  assert.deepEqual(L.computeShares(1000, 'proportional', o), { a: 750, b: 250 });
  assert.deepEqual(L.computeShares(1000, 'sugar', { ...o, sugar: 'b' }), { a: 0, b: 1000 });
  assert.deepEqual(L.computeShares(1000, 'custom', o), { a: 700, b: 300 });
  assert.deepEqual(L.computeShares(1000, 'proportional', { members: M, incomes: {} }), { a: 500, b: 500 });
});

t('% de reparto: modos raros y límites no rompen el reparto', () => {
  assert.equal(L.pctA('equal', { members: M }), 50);
  assert.equal(L.pctA('loquesea', { members: M }), 50, 'modo desconocido → mitad y mitad');
  assert.equal(L.pctA('sugar', { members: M }), 0, 'sugar sin decir quién → 0, no revienta');
  assert.equal(L.pctA('custom', { members: M, customPctA: 0 }), 0);
  assert.equal(L.pctA('custom', { members: M, customPctA: 100 }), 100);
  assert.equal(L.pctA('custom', { members: M, customPctA: 150 }), 100, 'por encima de 100 se recorta');
  assert.equal(L.pctA('custom', { members: M, customPctA: -20 }), 0, 'por debajo de 0 se recorta');
  assert.equal(L.pctA('custom', { members: M, customPctA: 'abc' }), 0, 'basura → 0, nunca NaN');
  assert.equal(L.pctA('custom', { members: M }), 50, 'sin decir nada → 50');
  assert.equal(L.pctA('proportional', { members: M, incomes: { a: -5, b: -5 } }), 50, 'ingresos negativos cuentan como 0');
  assert.equal(L.pctA('proportional', { members: M }), 50, 'sin ingresos → mitad y mitad');
});

t('reparto a medida: 0 % y 100 % dejan todo a uno de los dos', () => {
  assert.deepEqual(L.computeShares(1000, 'custom', { members: M, customPctA: 0 }), { a: 0, b: 1000 });
  assert.deepEqual(L.computeShares(1000, 'custom', { members: M, customPctA: 100 }), { a: 1000, b: 0 });
});

t('reparto: nunca se pierde ni se inventa un céntimo', () => {
  const casos = [
    [1, 'equal', { members: M }],
    [3, 'proportional', { members: M, incomes: { a: 1, b: 2 } }],
    [101, 'custom', { members: M, customPctA: 70 }],
    [999, 'proportional', { members: M, incomes: { a: 33333, b: 66667 } }],
    [2, 'custom', { members: M, customPctA: 33.3 }],
    [7, 'sugar', { members: M, sugar: 'b' }],
  ];
  for (const [amount, mode, opts] of casos) {
    const sh = L.computeShares(amount, mode, opts);
    const suma = Object.values(sh).reduce((s, c) => s + c, 0);
    assert.equal(suma, amount, `${mode} de ${amount} → ${JSON.stringify(sh)}`);
    assert.ok(Object.values(sh).every(c => Number.isInteger(c) && c >= 0), 'céntimos enteros y no negativos');
  }
  // Caso límite de un solo miembro: el total tampoco se pierde.
  const solo = L.computeShares(10, 'equal', { members: ['a'] });
  assert.equal(Object.values(solo).reduce((s, c) => s + c, 0), 10);
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

t('deuda neta: sin gastos no hay deuda y los pagos de fuera se ignoran', () => {
  assert.deepEqual(L.netBalances([], M), { a: 0, b: 0 });
  assert.deepEqual(L.netBalances([{ amount: 999, paidBy: 'zzz', shares: { zzz: 999 } }], M), { a: 0, b: 0 });
});

t('deuda neta: se cuadra en céntimos y lo que uno debe es lo que el otro cobra', () => {
  const E = [
    { amount: 999, paidBy: 'a', shares: { a: 500, b: 499 } },
    { amount: 1, paidBy: 'b', shares: { a: 0, b: 1 } },
    { kind: 'settle', amount: 400, paidBy: 'a', shares: { b: 400 } },
  ];
  const n = L.netBalances(E, M);
  assert.deepEqual(n, { a: 899, b: -899 });
  assert.equal(n.a + n.b, 0, 'siempre net[a] = −net[b]');
});

t('leer euros en formato español', () => {
  assert.equal(L.parseEur('12,5'), 1250);
  assert.equal(L.parseEur('1.234,56'), 123456);
  assert.equal(L.parseEur('1.234'), 123400);
  assert.equal(L.parseEur('12.50 €'), 1250);
  assert.ok(Number.isNaN(L.parseEur('')));
  assert.ok(Number.isNaN(L.parseEur('abc')));
});

t('leer euros: más formatos, números y basura que hay que rechazar', () => {
  assert.equal(L.parseEur('1.234.567,89'), 123456789);
  assert.equal(L.parseEur('0,01'), 1);
  assert.equal(L.parseEur('12'), 1200);
  assert.equal(L.parseEur('.5'), 50);
  assert.equal(L.parseEur('  12,00  € '), 1200, 'espacios y símbolo fuera');
  assert.equal(L.parseEur(5), 500, 'si ya viene número');
  assert.equal(L.parseEur('1.23'), 123, 'un punto con dos decimales es decimal, no miles');
  for (const basura of ['', null, undefined, 'abc', ',', '.', '-', '-12,50', '1,234.56', '12,345', '1.2.3', '12,3456']) {
    assert.ok(Number.isNaN(L.parseEur(basura)), `debería ser NaN: ${JSON.stringify(basura)}`);
  }
});

t('próxima fecha de tareas que se repiten', () => {
  assert.equal(L.nextDue('2026-09-28', 'daily', '2026-09-28'), '2026-09-29');
  assert.equal(L.nextDue('2026-09-20', 'weekly', '2026-09-28'), '2026-10-04');
  assert.equal(L.nextDue('2026-10-01', 'weekly', '2026-09-28'), '2026-10-08');
  assert.equal(L.nextDue('2026-01-31', 'monthly', '2026-01-31'), '2026-02-28');
  assert.equal(L.nextDue(null, 'none', '2026-09-28'), null);
});

t('próxima fecha: salta los periodos atrasados y aguanta el fin de año', () => {
  assert.equal(L.nextDue('2026-09-20', 'daily', '2026-09-28'), '2026-09-29', 'una diaria atrasada salta a mañana');
  assert.equal(L.nextDue('2026-12-31', 'weekly', '2027-01-04'), '2027-01-07');
  assert.equal(L.nextDue('2026-12-31', 'monthly', '2027-01-05'), '2027-01-31');
  assert.equal(L.nextDue('2028-02-29', 'monthly', '2028-03-01', 31), '2028-03-31', 'año bisiesto: febrero dura 29');
  assert.equal(L.nextDue('2027-01-31', 'monthly', '2027-02-05', 31), '2027-02-28', '2027 no es bisiesto');
  assert.equal(L.nextDue('2026-09-01', 'none', '2026-09-28'), null);
  assert.equal(L.nextDue('2026-09-01', null, '2026-09-28'), null);
});

t('addPeriod: diaria, semanal y mensual cruzan meses y años', () => {
  assert.equal(L.addPeriod('2026-02-28', 'daily'), '2026-03-01');
  assert.equal(L.addPeriod('2026-12-31', 'weekly'), '2027-01-07');
  assert.equal(L.addPeriod('2026-01-31', 'monthly'), '2026-02-28');
  assert.equal(L.addPeriod('2026-02-28', 'monthly', 31), '2026-03-31', 'marzo recupera el 31');
  assert.equal(L.addPeriod('2028-01-31', 'monthly', 31), '2028-02-29', 'bisiesto');
  assert.equal(L.addPeriod('2026-05-10', 'loquesea'), '2026-05-10', 'repeat desconocido: no mueve la fecha');
});

// Arreglado en v0.11.0: `nextDue` devuelve null con un `repeat` que no conoce (antes se colgaba el móvil).
t('próxima fecha: un repeat desconocido no cuelga la app', () => {
  assert.equal(L.nextDue('2026-01-01', 'yearly', '2026-09-28'), null);
  assert.equal(L.nextDue('2026-01-01', '', '2026-09-28'), null);
  assert.equal(L.nextDue('2026-01-01', 'none', '2026-09-28'), null);
  assert.equal(L.nextDue('2026-01-01', 'daily', '2026-01-04'), '2026-01-05');
  assert.deepEqual(L.taskOccurrences({ id: 'x', title: 'x', pts: 5, repeat: 'yearly', due: '2026-01-01' }, '2026-10-01', 30), []);
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

t('carga: los puntos raros cuentan como 5 y las tareas hechas no cargan a nadie', () => {
  const T = [
    { id: 'f1', pts: 'vaya', repeat: 'weekly' },            // pts basura → 5
    { id: 'f2', pts: 0, repeat: 'weekly' },                 // 0 → 5
    { id: 'f3', pts: -20, repeat: 'weekly' },               // negativo → 5
    { id: 'f4', pts: 30, repeat: 'weekly', rotate: true },  // en turnos: mitad y mitad
    { id: 'f5', pts: 40, repeat: 'weekly', assignee: 'a' }, // con persona
    { id: 'f6', pts: 5, repeat: 'none', doneAt: 1 },        // hecha: fuera
  ];
  const { load, free } = L.taskLoad(T, M);
  assert.equal(load.a, 40 + 15, 'la suya + media de la de turnos');
  assert.equal(load.b, 15);
  assert.equal(free, 15, 'las tres libres de 5 puntos no las carga nadie');
});

t('reparto automático: no se queda ninguna tarea libre por repartir', () => {
  const T = [
    { id: 'f1', pts: 'vaya', repeat: 'weekly' },
    { id: 'f2', pts: 5, repeat: 'weekly' },
    { id: 'f3', pts: 5, repeat: 'weekly' },
    { id: 'f4', pts: 30, repeat: 'weekly', rotate: true },
    { id: 'f5', pts: 40, repeat: 'weekly', assignee: 'a' },
    { id: 'f6', pts: 5, repeat: 'none', doneAt: 1 },
  ];
  const plan = L.autoAssign(T, M, 50);
  assert.deepEqual(plan.map(p => p[0]).sort(), ['f1', 'f2', 'f3'], 'todas las libres activas salen');
  assert.ok(plan.every(([, uid]) => uid === 'a' || uid === 'b'));
  assert.equal(new Set(plan.map(p => p[0])).size, plan.length, 'sin repetir ninguna');
});

t('reparto automático: con el objetivo a un lado, todo va a ese lado', () => {
  const T = [{ id: '1', pts: 5, repeat: 'weekly' }, { id: '2', pts: 5, repeat: 'weekly' }];
  assert.deepEqual(L.autoAssign(T, M, 100).map(p => p[1]), ['a', 'a']);
  assert.deepEqual(L.autoAssign(T, M, 0).map(p => p[1]), ['b', 'b']);
});

t('reparto automático: con cargas iguales empareja y no toca las tareas', () => {
  const T = Array.from({ length: 4 }, (_, i) => ({ id: String(i), pts: 5, repeat: 'weekly' }));
  const copia = JSON.stringify(T);
  const plan = L.autoAssign(T, M, 50);
  assert.deepEqual(plan.map(p => p[1]), ['a', 'b', 'a', 'b']);
  assert.equal(JSON.stringify(T), copia, 'no modifica la lista original');
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

t('addMonth: salta años en los dos sentidos y no pierde el cero', () => {
  assert.equal(L.addMonth('2026-01', 0), '2026-01');
  assert.equal(L.addMonth('2026-01', 12), '2027-01');
  assert.equal(L.addMonth('2026-12', 1), '2027-01');
  assert.equal(L.addMonth('2026-06', 13), '2027-07');
  assert.equal(L.addMonth('2026-10', 3), '2027-01');
  assert.equal(L.addMonth('2026-01', -1), '2025-12');
  assert.equal(L.addMonth('2026-01', -13), '2024-12');
  assert.equal(L.addMonth('2026-02', -2), '2025-12');
});

t('gastos fijos: día fuera de rango y nunca más de 24 meses de golpe', () => {
  assert.equal(L.recurringDate('2026-02', 0), '2026-02-01', 'el día 0 se recorta a 1');
  assert.equal(L.recurringDate('2026-02', -3), '2026-02-01');
  assert.equal(L.recurringDate('2026-02', 99), '2026-02-28');
  assert.equal(L.recurringDate('2026-02', null), '2026-02-01');
  assert.equal(L.recurringDate('2026-07', 15), '2026-07-15');
  // El mes en curso solo se apunta cuando ya ha llegado el día de la plantilla.
  assert.deepEqual(L.recurringDue({ day: 28, startMonth: '2026-06', lastMonth: null }, '2026-09-15'), ['2026-06', '2026-07', '2026-08']);
  assert.deepEqual(L.recurringDue({ day: 28, startMonth: '2026-06', lastMonth: null }, '2026-09-30'), ['2026-06', '2026-07', '2026-08', '2026-09']);
  assert.deepEqual(L.recurringDue({ day: 15, startMonth: '2026-12', lastMonth: null }, '2027-01-20'), ['2026-12', '2027-01'], 'diciembre → enero');
  assert.equal(L.recurringDue({ day: 1, startMonth: '2020-01', lastMonth: null }, '2026-09-28').length, 24, 'tope de 24');
});

t('versiones', () => {
  assert.ok(L.isNewer('0.3.0', '0.2.9'));
  assert.ok(L.isNewer('v1.0.0', '0.9.9'));
  assert.ok(!L.isNewer('0.2.0', '0.2.0'));
  assert.ok(!L.isNewer('0.1.9', '0.2.0'));
});

t('versiones: números de distinto largo y valores que faltan', () => {
  assert.ok(!L.isNewer('1.0', '1.0.0'), '1.0 y 1.0.0 son la misma versión');
  assert.ok(L.isNewer('1.0.1', '1.0'), 'un parche más gana');
  assert.ok(L.isNewer('0.10.0', '0.9.9'), 'se compara número a número, no como texto');
  assert.ok(!L.isNewer(undefined, '0.0.1'));
  assert.ok(!L.isNewer('0.0.0', '0.0.0'));
  assert.ok(!L.isNewer('', ''));
  assert.ok(!L.isNewer('1.2.3.4', '1.2.3'), 'solo cuentan los tres primeros números');
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

t('confianza por defecto: la frontera exacta de las 24 h', () => {
  const now = Date.now();
  const base = { type: 'claim', from: null, to: 'a', amount: 10, status: 'pending' };
  assert.equal(L.AUTO_ACCEPT_MS, 24 * 3600e3, '24 horas justas');
  assert.equal(L.effStatus({ ...base, createdAt: now - L.AUTO_ACCEPT_MS }, now), 'approved', 'justo a las 24 h ya cuenta');
  assert.equal(L.effStatus({ ...base, createdAt: now - L.AUTO_ACCEPT_MS + 1 }, now), 'pending', 'un milisegundo antes, todavía no');
  assert.equal(L.effStatus({ ...base }, now), 'pending', 'sin createdAt no se acepta sola');
  // Solo las reclamaciones: un premio o un vale pendientes no se aceptan solos.
  assert.equal(L.effStatus({ type: 'reward', from: null, to: 'a', status: 'pending', createdAt: now - 48 * 3600e3 }, now), 'pending');
  assert.equal(L.effStatus({ type: 'redeem', from: 'a', to: 'b', status: 'pending', createdAt: now - 48 * 3600e3 }, now), 'pending');
  assert.ok(!L.isAutoAccepted({ ...base, status: 'approved', createdAt: now - 48 * 3600e3 }, now), 'ya aprobado no es "autoaceptado"');
  assert.equal(L.effStatus({ ...base, status: 'rejected', createdAt: now - 48 * 3600e3 }, now), 'rejected');
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

t('meta juntos: lo que no tiene fecha, los traspasos y las viejas no cuentan igual', () => {
  const now = Date.now(), D = 86400e3;
  const P = [
    { from: null, to: 'a', amount: 10, status: 'approved' },                              // sin fecha: solo con la meta desde 0
    { from: 'a', to: 'b', amount: 100, status: 'approved', resolvedAt: now - D },          // traspaso (vale/regalo)
    { type: 'claim', from: null, to: 'b', amount: 5, status: 'pending', createdAt: now - 25 * 3600e3 }, // aceptada sola: sí
    { from: null, to: 'a', amount: 7, status: 'rejected', createdAt: now - D },
    { from: null, to: 'a', amount: 3, status: 'approved', createdAt: now - 30 * D },
  ];
  assert.equal(L.goalProgress(P, { since: 0 }, now), 18, 'desde el principio: 10 + 5 + 3');
  assert.equal(L.goalProgress(P, { since: now - 2 * D }, now), 5, 'desde hace 2 días: solo la aceptada sola');
  assert.equal(L.goalProgress(P, null, now), 0);
});

t('planes: match cuando los dos votan que sí', () => {
  assert.ok(L.ideaState({ votes: { a: 1, b: 1 } }, M).match);
  assert.ok(!L.ideaState({ votes: { a: 1 } }, M).match);
  assert.ok(L.ideaState({ votes: { a: 1, b: -1 } }, M).vetoed);
  assert.equal(L.pickRandom([]), null);
  assert.equal(L.dayIndex(40, '2026-09-28'), L.dayIndex(40, '2026-09-28'));
});

t('planes: el match necesita a los dos y un voto suelto no basta', () => {
  assert.deepEqual(L.ideaState({ votes: { a: 1, b: 1 } }, M), { match: true, ups: 2, vetoed: false });
  assert.deepEqual(L.ideaState({ votes: { a: 1 } }, M), { match: false, ups: 1, vetoed: false });
  assert.deepEqual(L.ideaState({}, M), { match: false, ups: 0, vetoed: false });
  assert.equal(L.ideaState({ votes: { a: 1 } }, ['a']).match, false, 'con una sola persona no hay match');
  assert.equal(L.ideaState({ votes: { a: 1, b: 2 } }, M).ups, 1, 'un voto raro (2) no cuenta como sí');
});

t('pregunta del día: mismo día, mismo índice (y con n=0 no revienta)', () => {
  assert.equal(L.dayIndex(0, '2026-01-01'), 0);
  for (const n of [1, 5, 40]) {
    const i = L.dayIndex(n, '2026-06-15');
    assert.ok(Number.isInteger(i) && i >= 0 && i < n, `n=${n} → ${i}`);
  }
  assert.equal(L.dayIndex(7, '2026-01-01'), L.dayIndex(7, '2026-01-01'));
  assert.equal(typeof L.pickRandom(['a', 'b', 'c'], () => 0.99), 'string');
  assert.equal(L.pickRandom([], () => 0.5), null);
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

t('ahorro: aportaciones sin importe y retiradas que dejan la hucha en negativo', () => {
  assert.equal(L.jarSaved([], 'x'), 0);
  assert.equal(L.jarSaved([{ jar: 'x' }], 'x'), 0, 'sin importe cuenta 0');
  assert.equal(L.jarSaved([{ jar: 'x', amount: 100 }, { jar: 'x', amount: -250 }, { jar: 'y', amount: 999 }], 'x'), -150);
});

t('ruleta: las opciones se limpian, se cortan a 12 y la elegida queda arriba', () => {
  assert.deepEqual(L.parseOptions(''), []);
  assert.deepEqual(L.parseOptions(' , \n , '), []);
  assert.deepEqual(L.parseOptions('a\nb, c'), ['a', 'b', 'c']);
  assert.equal(L.parseOptions(Array.from({ length: 15 }, (_, i) => 'o' + i).join(',')).length, 12, 'como mucho 12');
  // Con una sola opción, con giro previo y con un poco de desvío, la elegida queda bajo la flecha.
  for (const [prev, i, n, jit] of [[0, 0, 1, 0], [725, 2, 3, 5], [1800, 5, 6, -12]]) {
    const r = L.wheelTarget(prev, i, n, 3, jit);
    const center = i * (360 / n) + 180 / n + jit;
    assert.equal(((center + r) % 360 + 360) % 360, 0, `prev=${prev} i=${i} n=${n}`);
    assert.ok(r > prev, 'la ruleta siempre avanza');
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

t('tres en raya y conecta 4: la otra diagonal, columnas y el fondo del tablero', () => {
  assert.deepEqual(L.tttWinner(['a', 'b', 'a', 'b', 'a', 'b', 'a', 'b', 'a']).line, [0, 4, 8]);
  assert.deepEqual(L.tttWinner(['a', 'b', null, 'a', 'b', null, 'a', 'b', null]).line, [0, 3, 6]);
  const first = L.c4Drop(Array(42).fill(null), 0, 'a');
  assert.equal(first.index, 35, 'la ficha cae al fondo');
  assert.equal(L.c4Drop(first.board, 0, 'b').index, 28, 'la siguiente va justo encima');
  assert.equal(L.c4Winner(first.board), null, 'dos fichas no ganan');
  let h = Array(42).fill(null);
  [[0, 'a'], [1, 'a'], [2, 'a']].forEach(([c, w]) => { h = L.c4Drop(h, c, w).board; });
  assert.equal(L.c4Winner(h), null, 'tres seguidas no bastan en conecta 4');
  h = L.c4Drop(h, 3, 'a').board;
  assert.equal(L.c4Winner(h).who, 'a');
});

t('piedra, papel o tijera', () => {
  assert.equal(L.rpsResult('piedra', 'tijera'), 1);
  assert.equal(L.rpsResult('piedra', 'papel'), -1);
  assert.equal(L.rpsResult('papel', 'papel'), 0);
  assert.equal(L.shuffle([1, 2, 3, 4]).length, 4);
});

t('piedra, papel o tijera: las tres victorias y una baraja reproducible', () => {
  assert.equal(L.rpsResult('tijera', 'papel'), 1);
  assert.equal(L.rpsResult('papel', 'piedra'), 1);
  assert.equal(L.rpsResult('tijera', 'piedra'), -1);
  assert.equal(L.rpsResult('papel', 'tijera'), -1);
  const src = [1, 2, 3, 4];
  const seq = [0.1, 0.9, 0.4, 0.7];
  const a = L.shuffle(src, () => seq.shift() ?? 0.5);
  assert.equal(a.length, 4);
  assert.deepEqual(src, [1, 2, 3, 4], 'la lista original no se toca');
  assert.deepEqual([...a].sort(), [1, 2, 3, 4], 'no se pierde ni se inventa nada');
  assert.equal(L.shuffle([]).length, 0);
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

t('recordatorios: una mensual atrasada cuenta hoy y una diaria vieja no se cuelga', () => {
  const from = '2026-10-10';
  assert.deepEqual(L.taskDays({ repeat: 'daily', due: '2026-09-01' }, from, 3), ['2026-10-10', '2026-10-11', '2026-10-12']);
  assert.deepEqual(L.taskDays({ repeat: 'monthly', due: '2026-08-31' }, from, 40), ['2026-10-10', '2026-10-30']);
  assert.deepEqual(L.taskDays({ repeat: 'weekly', due: '2026-10-10' }, from, 7), ['2026-10-10'], 'el final del rango no se incluye');
  assert.deepEqual(L.taskDays({ repeat: 'yearly', due: '2026-10-12' }, from, 7), ['2026-10-12'], 'un repeat raro con fecha futura no cuelga');
});

t('propuestas del catálogo: añadir, cambiar y borrar', () => {
  const list = [{ id: 'x', title: 'Fregar', pts: 10, emoji: '🧽' }];
  assert.deepEqual(L.applyCatalogOp(list, { op: 'upsert', item: { id: 'x', pts: 15 } })[0], { id: 'x', title: 'Fregar', pts: 15, emoji: '🧽' });
  assert.equal(L.applyCatalogOp(list, { op: 'upsert', item: { id: 'y', title: 'Basura', pts: 5 } }).length, 2);
  assert.deepEqual(L.applyCatalogOp(list, { op: 'delete', item: { id: 'x' } }), []);
  assert.deepEqual(L.applyCatalogOp(undefined, { op: 'delete', item: { id: 'x' } }), []);
  assert.equal(list[0].pts, 10); // no cambia la lista original
});

t('catálogo: borrar lo que no existe, operación sin item y aviso de duplicados', () => {
  const list = [{ id: 'x', title: 'Fregar', pts: 10 }];
  assert.deepEqual(L.applyCatalogOp(list, { op: 'delete', item: { id: 'no-existe' } }), list, 'borrar algo que no está deja la lista igual');
  assert.equal(L.applyCatalogOp(list, null), list, 'sin operación, la misma lista');
  assert.equal(L.applyCatalogOp(list, { op: 'upsert' }), list, 'sin item, la misma lista');
  assert.deepEqual(L.applyCatalogOp(list, { op: 'upsert', item: { id: 'x', title: 'Fregar', pts: 10 } }), list, 'el mismo upsert no duplica');
  assert.equal(L.applyCatalogOp(list, { op: 'loquesea', item: { id: 'y', title: 'Basura', pts: 5 } }).length, 2, 'una op rara se trata como añadir');
  assert.equal(list.length, 1, 'la lista original no se modifica nunca');
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

t('primeros pasos: los puntos se pueden quitar y un gasto sin tipo también cuenta', () => {
  const base = L.firstSteps({ expenses: [{ amount: 5 }] }, 'a');
  assert.equal(base.find(s => s.id === 'expense').done, true, 'cualquier gasto que no sea liquidación cuenta');
  assert.equal(base.find(s => s.id === 'vales').done, false);
  assert.deepEqual(base.map(s => s.id), ['tasks', 'split', 'expense', 'thanks', 'vales', 'notify']);
  assert.ok(!L.firstSteps({}, 'a', { points: false }).some(s => s.id === 'vales'), 'sin puntos no hay paso de vales');
  assert.equal(L.firstSteps({}, 'a', { sawVales: true }).find(s => s.id === 'vales').done, true);
  const g = L.firstSteps({ thanks: [{ from: 'b' }], couple: { settings: { split: 'proportional' } } }, 'a');
  assert.equal(g.find(s => s.id === 'thanks').done, false, 'las gracias de la pareja no me marcan el paso a mí');
  assert.equal(g.find(s => s.id === 'split').done, true, 'el reparto guardado en ajustes cuenta');
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

t('de la demo a la cuenta real: copia de verdad y valores por defecto', () => {
  const demo = {
    me: 'demoB',
    couple: { members: ['demoA', 'demoB'], catalog: { earn: [{ id: 'e', title: 'Fregar', pts: 10 }], spend: [] } },
    tasks: [{ id: '1', title: 'Platos', assignee: 'demoB', rotate: true, doneAt: null }],
    ideas: [{ id: 'i', title: 'Pizza', votes: { demoA: 1 } }], // yo no voté
    jars: [
      { id: 'j1', title: 'Viaje', emoji: '✈️', target: 1000, saved: 500, createdBy: 'demoA' },
      { id: 'j2', title: 'Coche', emoji: '🚗' }, // sin objetivo
    ],
  };
  const s = L.demoToSeed(demo, 'yo');
  s.catalog.earn[0].title = 'Otro';
  assert.equal(demo.couple.catalog.earn[0].title, 'Fregar', 'el catálogo va copiado, no compartido');
  assert.equal(s.tasks[0].rotate, true);
  assert.equal(s.tasks[0].assignee, 'yo', 'una tarea en turnos pasa a ser mía');
  assert.deepEqual(s.ideas[0].votes, {}, 'si yo no voté, no queda voto de nadie');
  assert.deepEqual(s.jars.map(j => j.title), ['Viaje', 'Coche']);
  assert.deepEqual(s.jars.map(j => j.target), [1000, 0], 'sin objetivo → 0');
  assert.ok(s.jars.every(j => !('saved' in j) && !('id' in j)), 'las huchas van sin su dinero ni su id');
  assert.equal(L.demoToSeed({ me: 'x' }, 'yo'), null, 'sin pareja no hay nada que llevarse');
  assert.equal(L.demoToSeed({ couple: { members: ['demoA', 'demoB'] } }, 'yo').catalog, null);
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

t('Plus: un plan caducado, milisegundos de frontera y la fecha en texto', () => {
  const now = Date.now(), D = 86400e3;
  const caducado = L.plusState({ plus: { tier: 'plus', until: now - D } }, now);
  assert.equal(caducado.active, false);
  assert.equal(caducado.trialUsed, true, 'aunque caduque, la prueba ya se gastó');
  assert.equal(caducado.tier, 'plus');
  assert.equal(caducado.daysLeft, 0);
  assert.equal(L.plusState({ plus: { tier: 'plus', until: now } }, now).active, false, 'justo al expirar ya no vale');
  assert.equal(L.plusState({ plus: { tier: 'plus', until: now + 1 } }, now).daysLeft, 1, 'un milisegundo → 1 día');
  assert.equal(L.plusState({ plus: { tier: 'plus', until: String(now + D) } }, now).active, true, 'acepta la fecha como texto');
  assert.equal(L.plusState({ plus: { tier: 'plus', until: null } }, now).daysLeft, Infinity);
  assert.equal(L.plusState({ plus: { tier: 'trial', until: null } }, now).active, false, 'una prueba sin fin no vale');
  assert.equal(L.plusState({ plus: 'vaya' }, now).active, false);
  assert.equal(L.plusState(null, now).trialUsed, false);
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

t('resumen del mes: mes vacío, subida/bajada y meses con fecha basura', () => {
  assert.deepEqual(L.monthSummary([], '2026-09'), { total: 0, count: 0, prevTotal: 0, fixed: 0, byCat: [], diffPct: null });
  const E = [
    { kind: 'expense', amount: 50, category: 'a', date: '2026-09-10' },
    { kind: 'expense', amount: 100, category: 'b', date: '2026-08-10' },
  ];
  assert.equal(L.monthSummary(E, '2026-09').diffPct, -50, 'la mitad menos que el mes anterior');
  assert.equal(L.monthSummary(E, '2026-08').diffPct, null, 'sin mes anterior no hay %');
  assert.deepEqual(L.expenseMonths([]), []);
  assert.deepEqual(L.expenseMonths([{ kind: 'expense', amount: 1, date: 'sin-fecha' }]), [], 'las fechas basura se descartan');
  assert.deepEqual(L.expenseMonths([{ kind: 'expense', amount: 1, date: '2026-09-01' }, { kind: 'expense', amount: 1, date: '2026-09-02' }]), ['2026-09'], 'los meses no se repiten');
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

t('CSV: ninguna celda deja pasar una fórmula y sin gastos solo hay cabecera', () => {
  assert.equal(L.csvCell('=1+1'), "'=1+1");
  assert.equal(L.csvCell('+x'), "'+x");
  assert.equal(L.csvCell('@x'), "'@x");
  assert.equal(L.csvCell('-x'), "'-x");
  assert.equal(L.csvCell('\tx'), "'\tx");
  assert.equal(L.csvCell('a;b'), '"a;b"', 'el punto y coma va entrecomillado');
  assert.equal(L.csvCell('a"b'), '"a""b"', 'las comillas se doblan');
  assert.equal(L.csvCell(null), '');
  assert.equal(L.csvCell(0), '0');
  assert.equal(L.expensesCsv([], M).slice(1).split('\r\n').length, 1, 'sin gastos: solo la cabecera');
  const fila = L.expensesCsv([{ kind: 'settle', amount: 100, paidBy: 'b', date: '2026-09-04', shares: {} }], M).slice(1).split('\r\n')[1];
  assert.equal(fila, '2026-09-04;Liquidación;;1,00;;;;Pago a ', 'una liquidación sin shares no revienta');
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

t('revisión semanal: el día exacto del corte no cuenta y una aceptada sola sí', () => {
  const now = Date.now(), D = 86400e3;
  const fromDay = L.ymd(new Date(now - 7 * D));
  const w = L.weekStats({
    expenses: [
      { kind: 'expense', amount: 100, date: fromDay },
      { kind: 'expense', amount: 200, date: L.ymd(new Date(now)) },
    ],
    points: [{ type: 'claim', from: null, to: 'a', amount: 9, status: 'pending', createdAt: now - 25 * 3600e3 }],
  }, now);
  assert.equal(w.spent, 200, 'lo del primer día del rango queda fuera');
  assert.equal(w.points, 9, 'una reclamación aceptada sola cuenta como puntos de la semana');
});

t('calendario: la rejilla es de lunes a domingo y cubre el mes entero', () => {
  for (const ym of ['2026-10', '2026-02', '2026-11', '2027-02', '2028-02']) {
    const weeks = L.monthGrid(ym);
    assert.ok(weeks.length >= 4 && weeks.length <= 6, `${ym}: ${weeks.length} semanas`);
    for (const w of weeks) assert.equal(w.length, 7, `${ym}: una semana no tiene 7 días`);
    assert.equal(L.parseYmd(weeks[0][0]).getDay(), 1, `${ym} no empieza en lunes`);
    const all = weeks.flat();
    for (let i = 1; i < all.length; i++) assert.equal(all[i], L.addDays(all[i - 1], 1), `${ym}: hueco entre días`);
    const [y, m] = ym.split('-').map(Number);
    const lastDay = String(new Date(y, m, 0).getDate()).padStart(2, '0');
    assert.ok(all.includes(`${ym}-01`), `${ym}: falta el día 1`);
    assert.ok(all.includes(`${ym}-${lastDay}`), `${ym}: falta el último día`);
    assert.equal(all.filter(d => d.startsWith(ym)).length, new Date(y, m, 0).getDate(), `${ym}: faltan días del mes`);
  }
  assert.deepEqual(L.monthGrid('vaya'), []);
  assert.equal(L.WEEKDAYS.length, 7);
});

t('calendario: cada tarea en su día (sin arrastrar las atrasadas)', () => {
  const daily = { id: 'd', title: 'Platos', pts: 5, repeat: 'daily', due: '2026-10-01' };
  const weekly = { id: 'w', title: 'Sábado', pts: 5, repeat: 'weekly', due: '2026-10-03' };
  const once = { id: 'o', title: 'Una vez', pts: 5, repeat: 'none', due: '2026-10-05' };
  assert.deepEqual(L.taskOccurrences(daily, '2026-10-01', 3), ['2026-10-01', '2026-10-02', '2026-10-03']);
  assert.deepEqual(L.taskOccurrences(weekly, '2026-10-01', 21), ['2026-10-03', '2026-10-10', '2026-10-17']);
  assert.deepEqual(L.taskOccurrences(once, '2026-10-01', 31), ['2026-10-05']);
  assert.deepEqual(L.taskOccurrences(once, '2026-09-01', 31), [], 'una tarea de octubre no puede salir en septiembre');
  assert.deepEqual(L.taskOccurrences({ ...once, due: '2026-09-20' }, '2026-10-01', 31), [], 'atrasada: no se arrastra a hoy');
  assert.deepEqual(L.taskOccurrences({ ...once, doneAt: 1 }, '2026-10-01', 31), [], 'ya hecha');
  assert.deepEqual(L.taskOccurrences({ ...once, due: null }, '2026-10-01', 31), [], 'sin fecha');
  // Una diaria que empezó hace años salta al rango sin recorrerlo entero (y sin colgarse).
  assert.deepEqual(L.taskOccurrences({ ...daily, due: '2020-01-01' }, '2026-10-01', 2), ['2026-10-01', '2026-10-02']);
});

t('calendario: una tarea del 31 no se queda en el 28, y las viejas no cuestan', () => {
  const m31 = { id: 'm', title: 'Facturas', pts: 5, repeat: 'monthly', due: '2026-01-31', dueDay: 31 };
  assert.deepEqual(L.taskOccurrences(m31, '2026-02-01', 60), ['2026-02-28', '2026-03-31']); // febrero recorta, marzo vuelve al 31
  assert.equal(L.nextDue('2026-01-31', 'monthly', '2026-02-01', 31), '2026-02-28');
  assert.equal(L.nextDue('2026-02-28', 'monthly', '2026-03-01', 31), '2026-03-31');
  assert.equal(L.nextDue('2026-01-31', 'monthly', '2026-02-01'), '2026-02-28'); // sin dueDay (tareas de antes) igual que siempre
  // Una semanal que empezó hace años: el salto rápido da lo mismo que ir paso a paso (2016-01-04 fue lunes).
  const vieja = { id: 'v', title: 'Platos', pts: 5, repeat: 'weekly', due: '2016-01-04' };
  const occ = L.taskOccurrences(vieja, '2026-10-01', 21);
  assert.equal(occ[0], '2026-10-05');
  assert.equal(L.parseYmd(occ[0]).getDay(), 1);
  assert.deepEqual(L.taskOccurrences({ ...vieja, repeat: 'daily' }, '2026-10-01', 2), ['2026-10-01', '2026-10-02']);
});

t('calendario: el mapa de días y el orden dentro de un día', () => {
  const tasks = [
    { id: '1', title: 'Platos', assignee: 'b', repeat: 'daily', due: '2026-10-01', pts: 5 },
    { id: '2', title: 'Basura', assignee: 'a', repeat: 'daily', due: '2026-10-01', pts: 5 },
    { id: '3', title: 'Libre', assignee: null, repeat: 'daily', due: '2026-10-01', pts: 5 },
  ];
  const byDay = L.tasksByDay(tasks, '2026-10-01', 2);
  assert.deepEqual(Object.keys(byDay).sort(), ['2026-10-01', '2026-10-02']);
  assert.equal(byDay['2026-10-01'].length, 3);
  assert.deepEqual(L.dayTasks(byDay['2026-10-01'], M).map(t => t.id), ['2', '1', '3']); // A, luego B, luego libres
  assert.deepEqual(L.gridRange([['2026-09-28', '2026-09-29']]), { from: '2026-09-28', days: 2 });
  assert.equal(L.gridRange([]), null);
});

t('calendario: una persona desconocida cuenta como libre y el mapa acumula tareas', () => {
  const list = [
    { id: 'lib', title: 'Aaa', assignee: null },
    { id: 'raro', title: 'Bbb', assignee: 'zzz' }, // nadie de la pareja
    { id: 'mio', title: 'Ccc', assignee: 'a' },
  ];
  assert.deepEqual(L.dayTasks(list, M).map(t => t.id), ['mio', 'lib', 'raro'], 'primero los de la pareja, luego los libres por título');
  assert.deepEqual(L.dayTasks(null, M), []);
  const tasks = [
    { id: '1', title: 'Uno', repeat: 'daily', due: '2026-10-01', pts: 5 },
    { id: '2', title: 'Dos', repeat: 'daily', due: '2026-10-01', pts: 5 },
  ];
  assert.equal(L.tasksByDay(tasks, '2026-10-01', 1)['2026-10-01'].length, 2, 'dos tareas el mismo día se acumulan');
});

t('puntos aportados: lo que suma cada uno, sin contar los traspasos', () => {
  const now = Date.now();
  const P = [
    { type: 'claim', from: null, to: 'a', amount: 15, status: 'approved' },
    { type: 'reward', from: null, to: 'b', amount: 20, status: 'approved' },
    { type: 'redeem', from: 'b', to: 'a', amount: 10, status: 'approved' },   // traspaso: no es aportación
    { type: 'gift', from: 'a', to: 'b', amount: 5, status: 'approved' },      // traspaso
    { type: 'claim', from: null, to: 'a', amount: 99, status: 'rejected' },   // no cuenta
    { type: 'claim', from: null, to: 'b', amount: 7, status: 'pending', createdAt: now - 25 * 3600e3 }, // aceptada sola
  ];
  assert.deepEqual(L.earnedBy(P, M, now), { a: 15, b: 27 });
  assert.deepEqual(L.earnedBy([], M), { a: 0, b: 0 });
});

t('puntos aportados: los de fuera de la pareja no suman a nadie', () => {
  assert.deepEqual(L.earnedBy([{ from: null, to: 'zzz', amount: 50, status: 'approved' }], M), { a: 0, b: 0 });
  const P = [
    { type: 'reward', from: null, to: 'a', amount: 12, status: 'approved' }, // un premio sí aporta a quien lo recibe
    { type: 'redeem', from: 'a', to: 'b', amount: 12, status: 'approved' },  // un vale no
  ];
  assert.deepEqual(L.earnedBy(P, M), { a: 12, b: 0 });
});

t('colores de cada uno: solo se aceptan las claves de la paleta', () => {
  assert.equal(L.colorOf('menta')[2], '#6FCBA8');
  assert.equal(L.colorOf('rosa')[0], 'rosa');
  assert.equal(L.colorOf('no-existe')[0], 'rosa', 'clave desconocida → el color de siempre');
  assert.equal(L.colorOf(undefined)[0], 'rosa');
  assert.equal(L.colorOf('red; background:url(x)')[0], 'rosa', 'nada que venga de la base puede acabar en el CSS');
  assert.equal(L.colorOf(null, 1)[0], 'lila');
  assert.equal(L.PERSON_COLORS.length, 6);
  assert.ok(L.PERSON_COLORS.every(c => c.length === 5));
  assert.ok(L.PERSON_COLORS.every(c => [c[2], c[3], c[4]].every(v => /^#[0-9A-F]{6}$/i.test(v))), 'colores en hexadecimal');
  assert.deepEqual(L.DEFAULT_COLORS, ['rosa', 'lila']);
});

t('colores: un índice de reserva fuera de rango vuelve al primero', () => {
  assert.equal(L.colorOf('lila', 99)[0], 'lila', 'si la clave existe, manda la clave');
  assert.equal(L.colorOf('no-existe', 99)[0], 'rosa');
  assert.equal(L.colorOf(undefined, -1)[0], 'rosa');
});

t('modo casa: las palabras de cada modo (y si llega basura, las de siempre)', () => {
  assert.equal(L.HOMES.length, 4);
  assert.ok(L.HOMES.every(h => h.length === 4 && h[0] && h[2] && h[3]));
  assert.equal(L.homeOf({ settings: { home: 'piso' } }), 'piso');
  assert.equal(L.homeOf({ settings: { home: 'vaya' } }), 'pareja');
  assert.equal(L.homeOf({}), 'pareja');
  assert.equal(L.homeOf(null), 'pareja');
  assert.equal(L.wordsOf('piso').la, 'tu compi de piso');
  assert.equal(L.wordsOf('familia').crear, 'Crear nuestra casa');
  assert.equal(L.wordsOf('distancia').sitio, 'Pareja');
  assert.equal(L.wordsOf(undefined).la, 'tu pareja');
  assert.ok(L.HOMES.every(([k]) => L.wordsOf(k).la && L.wordsOf(k).sitio && L.wordsOf(k).casa && L.wordsOf(k).crear && L.wordsOf(k).salir));
  assert.equal(L.homeLabel('piso'), 'Compañeros de piso');
  assert.equal(L.homeLabel(undefined), 'Vivimos juntos');
});

t('modo casa: un ajuste que no es un objeto no rompe las palabras', () => {
  assert.equal(L.homeOf({ settings: { home: 42 } }), 'pareja');
  assert.equal(L.homeOf({ settings: null }), 'pareja');
  assert.equal(L.homeOf({ settings: 'piso' }), 'pareja', 'settings tiene que ser un objeto');
  assert.equal(L.wordsOf('vaya').sitio, 'Pareja');
  assert.equal(L.homeLabel('vaya'), 'Vivimos juntos');
});

/* ================================================================
   Segunda ronda: lo que toca a fechas, calendario, dinero y Plus (v0.9–v0.11).
   ================================================================ */

t('mensual del 31: el día se conserva mes a mes (y febrero solo lo recorta)', () => {
  let d = '2026-01-31';
  const prox = [];
  for (let i = 0; i < 12; i++) { d = L.nextDue(d, 'monthly', d, 31); prox.push(d); }
  assert.deepEqual(prox, [
    '2026-02-28', '2026-03-31', '2026-04-30', '2026-05-31', '2026-06-30', '2026-07-31',
    '2026-08-31', '2026-09-30', '2026-10-31', '2026-11-30', '2026-12-31', '2027-01-31',
  ], 'febrero baja al 28, pero el mes siguiente vuelve al 31 (no se queda en el 28)');
  assert.equal(L.addPeriod('2026-04-30', 'monthly', 31), '2026-05-31', 'tras un abril de 30 vuelve al 31');
  assert.equal(L.addPeriod('2027-02-28', 'monthly', 31), '2027-03-31', '2027 no es bisiesto y marzo recupera el 31');
});

t('tareas muy antiguas: una mensual del año 2000 llega bien a hoy', () => {
  assert.equal(L.nextDue('2000-01-31', 'monthly', '2026-10-15', 31), '2026-10-31', 'con dueDay no se descuelga');
  assert.equal(L.nextDue('2000-01-31', 'monthly', '2026-10-15'), '2026-10-28', 'sin dueDay (tareas de antes): se queda en el 28');
  assert.equal(L.nextDue(null, 'daily', '2026-09-28'), '2026-09-29', 'sin fecha se cuenta desde hoy');
  assert.deepEqual(L.taskOccurrences({ id: 'm', pts: 5, repeat: 'monthly', due: '2000-01-31', dueDay: 31 }, '2026-10-15', 20), ['2026-10-31'],
    'el calendario recorre 26 años sin colgarse');
});

// Arreglado en v0.12.0: `nextDue` salta por aritmética (antes cortaba a las 500 vueltas y devolvía una fecha del pasado).
t('próxima fecha: una diaria de hace años no vuelve al pasado', () => {
  assert.equal(L.nextDue('2000-01-01', 'daily', '2026-10-15'), '2026-10-16');
  assert.deepEqual(L.taskDays({ repeat: 'daily', due: '2000-01-01' }, '2026-10-10', 3), ['2026-10-10', '2026-10-11', '2026-10-12']);
});

// Arreglado en v0.12.0: `taskDays` (los recordatorios) ya le pasa el día del mes a `addPeriod`, como el calendario.
t('recordatorios: la mensual del 31 sigue cayendo el 31', () => {
  assert.deepEqual(L.taskDays({ repeat: 'monthly', due: '2026-01-31', dueDay: 31 }, '2026-02-01', 90), ['2026-02-01', '2026-02-28', '2026-03-31', '2026-04-30']);
});

t('repeat corrupto: nada se cuelga y no se inventa ninguna fecha', () => {
  for (const raro of ['yearly', 'DAILY', 'Monthly', 42, true, {}]) {
    assert.equal(L.nextDue('2026-01-01', raro, '2026-09-28'), null, `nextDue con repeat ${JSON.stringify(raro)}`);
    // Un repeat raro no se repite: la tarea se ve en su fecha (como una de una vez) y no desaparece.
    assert.deepEqual(L.taskOccurrences({ id: 'x', pts: 5, repeat: raro, due: '2026-10-05' }, '2026-10-01', 30), ['2026-10-05'], `calendario con repeat ${JSON.stringify(raro)}`);
  }
  // Sin periodo («», null, 'none') no hay bucle que hacer: la tarea es de una sola vez y aparece en su día.
  for (const sinPeriodo of ['', null, undefined, 'none']) {
    assert.equal(L.nextDue('2026-01-01', sinPeriodo, '2026-09-28'), null, `nextDue con ${JSON.stringify(sinPeriodo)}`);
    assert.deepEqual(L.taskOccurrences({ id: 'x', pts: 5, repeat: sinPeriodo, due: '2026-10-05' }, '2026-10-01', 30), ['2026-10-05'], `calendario con ${JSON.stringify(sinPeriodo)}`);
  }
  assert.deepEqual(L.taskDays({ repeat: 'yearly', due: '2026-10-01' }, '2026-10-10', 7), ['2026-10-10'], 'un repeat raro atrasado cuenta hoy, sin colgarse');
  assert.equal(L.addPeriod('2026-05-10', 'loquesea'), '2026-05-10', 'fecha sin mover');
});

t('calendario: los bordes del rango y una diaria de hace seis años', () => {
  const once = { id: 'o', title: 'Una vez', pts: 5, repeat: 'none', due: '2026-10-01' };
  assert.deepEqual(L.taskOccurrences(once, '2026-10-01', 1), ['2026-10-01'], 'el día de inicio entra');
  assert.deepEqual(L.taskOccurrences({ ...once, due: '2026-10-08' }, '2026-10-01', 7), [], 'el último día del rango NO entra');
  assert.deepEqual(L.taskOccurrences({ ...once, due: '2026-10-07' }, '2026-10-01', 7), ['2026-10-07'], 'un día antes del final sí');
  const vieja = L.taskOccurrences({ id: 'd', title: 'Platos', pts: 5, repeat: 'daily', due: '2020-01-01' }, '2026-10-01', 42);
  assert.equal(vieja.length, 42, 'el salto rápido no pierde ni repite días');
  assert.equal(vieja[0], '2026-10-01');
  assert.equal(vieja[41], '2026-11-11');
  assert.ok(vieja.every((d, i) => i === 0 || L.addDays(vieja[i - 1], 1) === d), 'días seguidos, sin huecos');
});

t('calendario: la semanal de 2016 cae siempre en lunes y la del 31 en bisiesto', () => {
  const w = L.taskOccurrences({ id: 'w', title: 'Platos', pts: 5, repeat: 'weekly', due: '2016-01-04' }, '2026-10-01', 42);
  assert.equal(w[0], '2026-10-05', 'el primer lunes después del inicio');
  assert.ok(w.every(d => L.parseYmd(d).getDay() === 1), 'todas en lunes, como el día original');
  assert.ok(w.every((d, i) => i === 0 || L.addDays(w[i - 1], 7) === d), 'de siete en siete');
  assert.ok(w.every(d => d >= '2026-10-01'));
  assert.deepEqual(L.taskOccurrences({ id: 'm', pts: 5, repeat: 'monthly', due: '2028-01-31', dueDay: 31 }, '2028-02-01', 60), ['2028-02-29', '2028-03-31'], 'año bisiesto: el 29 y luego el 31');
});

t('calendario: la rejilla lleva las filas justas (4 en febrero, 6 en un mes largo)', () => {
  assert.equal(L.monthGrid('2027-02').length, 4, 'febrero de 2027 empieza en lunes: 4 filas exactas');
  assert.equal(L.monthGrid('2026-02').length, 5, 'febrero de 2026 empieza en domingo: 5 filas');
  assert.equal(L.monthGrid('2026-08').length, 6, 'agosto de 2026 empieza en sábado y tiene 31 días: 6 filas');
  assert.deepEqual(L.monthGrid('2026-00'), [], 'mes 0 → nada');
  assert.deepEqual(L.monthGrid(''), []);
  assert.deepEqual(L.monthGrid(null), []);
  assert.deepEqual(L.gridRange(L.monthGrid('2026-10')), { from: '2026-09-28', days: 35 });
});

t('calendario: el rango de una rejilla irregular, vacía o sin rejilla', () => {
  assert.deepEqual(L.gridRange([['2026-09-28', '2026-09-29'], ['2026-09-30']]), { from: '2026-09-28', days: 3 });
  assert.equal(L.gridRange([]), null);
  assert.equal(L.gridRange(null), null);
  assert.equal(L.gridRange(undefined), null);
  const r = L.gridRange(L.monthGrid('2026-02'));
  assert.equal(L.parseYmd(r.from).getDay(), 1, 'la rejilla siempre empieza en lunes');
  assert.equal(r.days % 7, 0, 'y son semanas enteras');
});

t('calendario: dos tareas que caen el mismo día salen las dos', () => {
  const T = [
    { id: 'd', title: 'D', pts: 5, repeat: 'daily', due: '2026-10-01' },
    { id: 'w', title: 'W', pts: 5, repeat: 'weekly', due: '2026-10-03' },
    { id: 'o', title: 'O', pts: 5, repeat: 'none', due: '2026-10-02', doneAt: 5 },
  ];
  const m = L.tasksByDay(T, '2026-10-01', 4);
  assert.deepEqual(Object.keys(m), ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04'], 'solo los días con algo, en orden');
  assert.deepEqual(m['2026-10-03'].map(t => t.id), ['d', 'w'], 'la diaria y la semanal coinciden ese día');
  assert.deepEqual(m['2026-10-02'].map(t => t.id), ['d'], 'la ya hecha no aparece');
  assert.equal(L.tasksByDay([], '2026-10-01', 7)['2026-10-01'], undefined);
});

t('calendario: el orden de un día no toca la lista original', () => {
  const list = [
    { id: '1', title: 'Zzz', assignee: null },
    { id: '2', title: 'Aaa', assignee: null },
    { id: '3', title: 'Mmm', assignee: 'b' },
  ];
  const copia = JSON.stringify(list);
  const ord = L.dayTasks(list, []);
  assert.deepEqual(ord.map(t => t.id), ['2', '3', '1'], 'sin nadie en la pareja manda el título');
  assert.notEqual(ord, list, 'devuelve una lista nueva');
  assert.equal(JSON.stringify(list), copia, 'la original no se toca');
  assert.deepEqual(L.dayTasks([{ id: 'x', title: 'X' }], M).map(t => t.id), ['x'], 'una tarea sin título ni persona no revienta');
});

t('modo casa: cualquier basura cae en «pareja» y las palabras nunca van vacías', () => {
  const basura = [
    { settings: { home: 'PISO' } }, { settings: { home: 'piso2' } }, { settings: { home: '' } },
    { settings: { home: 0 } }, { settings: { home: null } }, { settings: [] }, 'piso', 42, [], true, undefined, null,
  ];
  for (const c of basura) {
    const h = L.homeOf(c);
    assert.ok(L.HOMES.some(([k]) => k === h), `homeOf(${JSON.stringify(c)}) → ${JSON.stringify(h)} debería ser una de las 4 claves`);
    assert.equal(L.wordsOf(h).la, L.wordsOf('pareja').la, `con ${JSON.stringify(c)} habla de «tu pareja»`);
  }
  const campos = ['la', 'sitio', 'casa', 'crear', 'salir'];
  for (const [k] of L.HOMES) for (const f of campos) assert.ok(L.wordsOf(k)[f], `${k}.${f} no puede quedar vacío`);
  assert.notEqual(L.wordsOf('piso').casa, L.wordsOf('familia').casa, 'cada modo tiene sus palabras');
  assert.equal(new Set(L.HOMES.map(h => h[2])).size, 4, 'las 4 etiquetas son distintas');
  assert.equal(L.homeLabel(null), 'Vivimos juntos');
  assert.equal(L.homeLabel('familia'), 'Familia');
});

// Arreglado en v0.12.0: `homeOf` solo acepta texto con una clave conocida (antes un array colaba y descuadraba).
t('modo casa: un home que no es texto cae en «pareja»', () => {
  assert.equal(L.homeOf({ settings: { home: ['piso'] } }), 'pareja');
  assert.equal(L.homeOf({ settings: { home: {} } }), 'pareja');
  assert.equal(L.homeOf({ settings: { home: 'piso' } }), 'piso');
});

t('colores: la base oscura de los 6 se lee sobre el fondo suave y sobre blanco', () => {
  const lum = hex => {
    const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (x, y) => { const a = lum(x), b = lum(y); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
  for (const [key, , mid, dark, soft] of L.PERSON_COLORS) {
    assert.equal(ratio(dark, '#FFFFFF') >= 4.5, true, `${key}: la base oscura (${dark}) tiene que leerse sobre blanco`);
    assert.equal(ratio(dark, soft) >= 3, true, `${key}: la base oscura (${dark}) tiene que distinguirse del fondo suave (${soft})`);
    assert.ok(lum(soft) > 0.7, `${key}: el fondo suave (${soft}) tiene que ser claro`);
    assert.ok(lum(dark) < 0.25, `${key}: la base (${dark}) tiene que ser oscura`);
    assert.ok(ratio(mid, soft) > 1.4, `${key}: el color de la persona (${mid}) se ve sobre su fondo suave`);
  }
  for (const col of [2, 3, 4]) assert.equal(new Set(L.PERSON_COLORS.map(c => c[col])).size, 6, `los 6 colores de la columna ${col} son distintos`);
});

t('puntos: importes 0 y negativos, tipos que no conocemos y destino de fuera', () => {
  assert.deepEqual(L.balances([{ type: 'claim', from: null, to: 'a', amount: 0, status: 'approved' }], M), { a: 0, b: 0 }, 'un 0 no mueve nada');
  assert.deepEqual(L.balances([{ type: 'gift', from: 'a', to: 'b', amount: -5, status: 'approved' }], M), { a: 5, b: -5 }, 'un importe corrupto resta igual');
  assert.deepEqual(L.balances([{ type: 'loquesea', from: 'a', to: 'b', amount: 5, status: 'approved' }], M), { a: -5, b: 5 }, 'el saldo mira el estado y las partes, no el tipo');
  assert.deepEqual(L.balances([{ type: 'claim', from: null, to: 'a', amount: 9 }], M), { a: 0, b: 0 }, 'sin status no cuenta');
  assert.deepEqual(L.earnedBy([
    { type: 'claim', from: null, to: 'a', amount: 0, status: 'approved' },
    { type: 'claim', from: null, to: 'zzz', amount: 9, status: 'approved' },
  ], M), { a: 0, b: 0 });
  assert.equal(L.reserved([
    { type: 'redeem', from: 'a', to: 'b', amount: 0, status: 'pending' },
    { type: 'redeem', from: 'zzz', to: 'a', amount: 9, status: 'pending' },
  ], 'a'), 0, 'nadie más aparta puntos por mí');
  assert.equal(L.reserved([{ type: 'redeem', from: 'a', to: 'b', amount: 30, status: 'rejected' }], 'a'), 0, 'un vale rechazado ya no aparta');
  assert.equal(L.available([
    { type: 'claim', from: null, to: 'a', amount: 50, status: 'approved' },
    { type: 'redeem', from: 'a', to: 'b', amount: 50, status: 'pending' },
  ], M, 'a'), 0, 'todo apartado en vales: disponible a cero');
});

t('meta juntos: manda el momento en que se resolvió, y sin `since` cuenta todo', () => {
  const now = Date.now(), D = 86400e3;
  assert.equal(L.goalProgress([{ from: null, to: 'a', amount: 10, status: 'approved', createdAt: now - 30 * D, resolvedAt: now - D }], { since: now - 2 * D }, now), 10, 'vale el resolvedAt, no la fecha de creación');
  assert.equal(L.goalProgress([{ from: null, to: 'a', amount: 7, status: 'approved' }], { since: undefined }, now), 7, 'sin `since` cuenta desde el principio');
  assert.equal(L.goalProgress([{ from: null, to: 'a', amount: -4, status: 'approved', createdAt: 1 }], { since: 0 }, now), -4, 'importes corruptos restan');
  assert.equal(L.goalProgress([{ type: 'claim', from: null, to: 'a', amount: 5, status: 'pending', createdAt: now - 25 * 3600e3 }], { since: 0 }, now), 5, 'una reclamación aceptada sola suma');
});

t('revisión semanal: importes 0, liquidaciones, log sin fecha y puntos que ya eran de una tarea', () => {
  const now = Date.now(), D = 86400e3;
  const w = L.weekStats({
    tasks: [{ log: [{ by: 'a' }, { at: 0 }, { at: now }] }],
    expenses: [
      { kind: 'expense', amount: 0, date: L.ymd(new Date(now)) },
      { amount: 500, date: L.ymd(new Date(now - D)) },
      { kind: 'expense', amount: 111 },
      { kind: 'settle', amount: 777, date: L.ymd(new Date(now)) },
    ],
    points: [
      { type: 'claim', from: null, to: 'a', amount: 3, status: 'approved', createdAt: now, taskId: 't' },
      { type: 'reward', from: null, to: 'a', amount: 4, status: 'approved', createdAt: now },
    ],
  }, now);
  assert.deepEqual(w, { tasksDone: 2, thanks: 0, plans: [], spent: 500, points: 7 });
});

// Arreglado en v0.12.0: `weekStats` descarta las fechas que no son fechas (antes 'sin-fecha' colaba y sumaba).
t('revisión semanal: una fecha basura no suma gasto', () => {
  assert.equal(L.weekStats({ expenses: [{ kind: 'expense', amount: 999, date: 'sin-fecha' }] }).spent, 0);
  assert.equal(L.weekStats({ expenses: [{ kind: 'expense', amount: 500, date: L.ymd() }] }).spent, 500);
});

t('resumen del mes: importes 0 y negativos, categoría vacía y fijo sin id', () => {
  const E = [
    { kind: 'expense', amount: 0, category: '', date: '2026-09-01' },
    { kind: 'expense', amount: -500, date: '2026-09-02' },
    { amount: 100, date: '' },
    { kind: 'expense', amount: 100, date: '2026-09-03', recurringId: '' },
  ];
  const s = L.monthSummary(E, '2026-09');
  assert.equal(s.total, -400, 'un importe negativo (devolución) resta');
  assert.equal(s.count, 3, 'el gasto sin fecha no entra en el mes');
  assert.deepEqual(s.byCat, [['otros', -400]], 'sin categoría cae en «otros»');
  assert.equal(s.fixed, 0, 'un recurringId vacío no es gasto fijo');
  assert.equal(s.diffPct, null, 'sin mes anterior no hay %');
});

t('CSV: categoría desconocida, pagador de fuera, sin shares y fila sin fecha', () => {
  const E = [
    { kind: 'expense', amount: 0, category: '', paidBy: 'a', date: '', shares: { a: 0, b: 0 }, title: 'Cero' },
    { kind: 'expense', amount: 1234, category: 'desconocida', paidBy: 'zzz', date: '2026-09-02', shares: { a: 600, b: 634 }, title: 'Raro' },
    { kind: 'settle', amount: 500, paidBy: 'a', date: '2026-09-03', shares: { b: 500, a: 0 } },
    { kind: 'expense', amount: 100, date: '2026-09-04', paidBy: 'b', title: 'Sin shares', category: 'x' },
  ];
  const lines = L.expensesCsv(E, M, { names: { a: 'Ana' }, cats: {} }).slice(1).split('\r\n');
  assert.equal(lines.length, 5, 'cabecera + 4 gastos');
  assert.equal(lines[1], ';Cero;;0,00;Ana;0,00;0,00;Gasto', 'sin fecha va la primera y un importe 0 es 0,00');
  assert.equal(lines[2], '2026-09-02;Raro;desconocida;12,34;;6,00;6,34;Gasto', 'pagador de fuera y categoría sin nombre');
  assert.equal(lines[3], '2026-09-03;Liquidación;;5,00;Ana;;;Pago a ', 'liquidación: coge el primer uid de shares');
  assert.equal(lines[4], '2026-09-04;Sin shares;x;1,00;;0,00;0,00;Gasto');
});

t('CSV y euros: más basura y los números que llegan como número', () => {
  assert.equal(L.csvCell(12), '12');
  assert.equal(L.csvCell(true), 'true');
  assert.equal(L.csvCell(undefined), '');
  assert.equal(L.csvCell('a"b;c'), '"a""b;c"', 'comillas y punto y coma: entrecomillado y comilla doblada');
  assert.equal(L.csvCell('\n=1+1'), '"\n=1+1"', 'un salto de línea va entrecomillado: no coloca filas nuevas');
  assert.equal(L.parseEur(0), 0);
  assert.equal(L.parseEur('0,00'), 0);
  assert.equal(L.parseEur('1.000.000'), 100000000);
  assert.equal(L.parseEur('12.345'), 1234500, '1.234 = mil doscientos');
  assert.equal(L.parseEur('1.234.567'), 123456700);
  assert.equal(L.parseEur('  10  ,  5 '), 1050);
  assert.equal(L.parseEur('12,'), 1200);
  for (const basura of ['1,000,000', '-0,01', '+5', '1e3', '1,234', '..5', true, NaN, {}]) {
    assert.ok(Number.isNaN(L.parseEur(basura)), `debería ser NaN: ${JSON.stringify(basura)}`);
  }
});

t('reparto automático: no deja ninguna libre y no toca nada de la lista', () => {
  const T = [
    Object.freeze({ id: '1', pts: 20, repeat: 'weekly', assignee: 'a' }),
    Object.freeze({ id: '2', pts: 10, repeat: 'weekly' }),
    Object.freeze({ id: '3', pts: 10, repeat: 'weekly' }),
    Object.freeze({ id: '4', pts: 30, repeat: 'weekly', rotate: true }),
    Object.freeze({ id: '5', pts: 5, repeat: 'none', doneAt: 1 }),
  ];
  const copia = JSON.stringify(T);
  const plan = L.autoAssign(T, M, 50); // congeladas: si escribiera algo, reventaría aquí
  assert.deepEqual(plan, [['2', 'b'], ['3', 'b']], 'las libres van a quien va por detrás');
  assert.ok(plan.every(([, uid]) => M.includes(uid)), 'nadie de fuera de la pareja');
  assert.equal(new Set(plan.map(p => p[0])).size, plan.length, 'sin repetir ninguna');
  assert.equal(JSON.stringify(T), copia, 'la lista original no cambia');
  assert.ok(T.every(t => !('assignee' in t) || t.id === '1'), 'nadie cambia de persona');
  const C = [
    { id: '1', pts: 5, repeat: 'weekly' }, { id: '2', pts: 5, repeat: 'weekly' },
    { id: '3', pts: 5, repeat: 'weekly' }, { id: '4', pts: 5, repeat: 'weekly' },
  ];
  const cargas = { a: 0, b: 0 };
  for (const [id, uid] of L.autoAssign(C, M, 50)) cargas[uid] += C.find(x => x.id === id).pts;
  assert.equal(cargas.a, cargas.b, 'con todo igual, cada uno carga lo mismo');
});

t('carga: quien no está en la pareja no carga a nadie, y en turnos hacen falta dos', () => {
  assert.deepEqual(L.taskLoad([{ id: 'r', pts: 30, repeat: 'weekly', assignee: 'zzz' }], M), { load: { a: 0, b: 0 }, free: 30 }, 'la tarea de alguien de fuera queda libre');
  assert.deepEqual(L.taskLoad([{ id: 'r', pts: 30, repeat: 'weekly', rotate: true }], ['a']), { load: { a: 0 }, free: 30 }, 'con una sola persona no hay turnos');
  assert.equal(L.taskWeight({ pts: 10, repeat: 'yearly' }), 10, 'un repeat que no conocemos cuenta como una vez');
  assert.equal(L.taskWeight({ pts: 10 }), 10, 'sin repeat, cuenta como una vez');
});

// Arreglado en v0.12.0: `autoAssign` también reparte la tarea de alguien que ya no está en la pareja.
t('reparto automático: también reparte la de quien ya no está', () => {
  assert.deepEqual(L.autoAssign([{ id: 'r', pts: 30, repeat: 'weekly', assignee: 'zzz' }], M, 50), [['r', 'a']]);
});

t('Plus: planes con datos raros, `until` corrupto y la prueba de 14 días exacta', () => {
  const now = Date.now(), D = 86400e3;
  assert.deepEqual(L.plusState({ plus: {} }, now), { active: false, trialUsed: true, tier: 'trial', daysLeft: 0, forever: false }, 'un plus vacío ya gastó la prueba');
  const raro = L.plusState({ plus: { tier: 'premium', until: now + D } }, now);
  assert.equal(raro.tier, 'trial', 'un tier que no conocemos se trata como prueba');
  assert.equal(raro.active, true);
  assert.equal(L.plusState({ plus: { tier: 'plus', until: 0 } }, now).active, false, 'until 0: caducado');
  assert.equal(L.plusState({ plus: { tier: 'plus', until: 'vaya' } }, now).active, false, 'until que no es número: caducado');
  assert.equal(L.plusState({ plus: { tier: 'plus', until: 'vaya' } }, now).tier, 'plus', 'aunque no valga, el tier se respeta');
  assert.equal(L.plusState({ plus: { tier: 'trial', until: null } }, now).daysLeft, 0, 'una prueba sin fin no vale y no da días infinitos');
  assert.equal(L.plusState({ plus: [] }, now).active, false, 'un plus que no es un objeto normal no activa nada');
  assert.equal(L.plusState({ plus: { tier: 'plus', until: null } }, now).forever, true);
  assert.deepEqual(L.trialDoc(null, 0), { tier: 'trial', source: 'trial', since: 0, until: 14 * D, by: null });
  assert.equal(L.trialDoc('a', now).until - now, 14 * D, 'la prueba dura 14 días justos');
});

t('azar y estado: el índice del día cambia cada día y un movimiento sin status no puntúa', () => {
  const semana = ['2026-06-15', '2026-06-16', '2026-06-17', '2026-06-18', '2026-06-19', '2026-06-20', '2026-06-21'];
  const idx = semana.map(d => L.dayIndex(40, d));
  assert.ok(idx.every(i => Number.isInteger(i) && i >= 0 && i < 40), `fuera de rango: ${idx}`);
  assert.equal(new Set(idx).size, 7, 'la pregunta cambia cada día');
  assert.equal(new Set(semana.map(d => L.dayIndex(7, d))).size, 7, 'con 7 preguntas, una distinta cada día');
  assert.equal(L.dayIndex(1, '2026-06-15'), 0);
  const now = Date.now();
  assert.equal(L.effStatus({ status: 'pending', createdAt: now - 48 * 3600e3 }, now), 'pending', 'sin tipo no hay confianza por defecto');
  assert.equal(L.effStatus({ type: 'claim', createdAt: now - 48 * 3600e3 }, now), undefined, 'sin status, no está aprobado');
  assert.deepEqual(L.balances([{ type: 'claim', from: null, to: 'a', amount: 99 }], M), { a: 0, b: 0 }, 'sin status no hay puntos fantasma');
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
