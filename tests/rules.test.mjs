// Pruebas de firestore.rules con el emulador de Firebase (necesita Java).
// En GitHub Actions: .github/workflows/rules.yml. En local (con Java instalado):
//   npx -y firebase-tools emulators:exec --only firestore --project demo-xurripoints "node tests/rules.test.mjs"
// Cada prueba imita las escrituras que hace la app (app/store.js y app/app.js).
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'demo-xurripoints',
  firestore: { rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8') },
});
const db = uid => env.authenticatedContext(uid).firestore();
const C = 'ABC234';
const P = (uid, extra = {}) => ({ name: uid, emoji: '🐻', sugar: 'mami', income: 150000, ...extra });
const seedCouple = { catalog: { earn: [], spend: [] }, settings: { taskPctA: 50 }, goal: { title: 'Escapada', emoji: '🏖️', target: 500, since: 1 } };

let n = 0, failed = 0;
async function t(name, fn) {
  try { await fn(); n++; console.log('✔', name); }
  catch (e) { failed++; console.error('✘', name, '\n   ', e.message); }
}
/** Pareja de alice y bob ya formada (sin pasar por las reglas). */
async function couple2() {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(), 'couples', C), { ...seedCouple, code: C, members: ['alice', 'bob'], profiles: { alice: P('alice'), bob: P('bob') }, createdAt: 1, updatedAt: 1 });
  });
}
const pt = (o) => ({ type: 'claim', from: null, to: 'alice', amount: 10, title: 'Fregar', emoji: '🧽', note: '', status: 'pending', createdBy: 'alice', createdAt: 1, resolvedAt: null, resolvedBy: null, taskId: null, ...o });

/* ---------------- Crear y unirse ---------------- */
await env.clearFirestore();
await t('crear una pareja propia', async () => {
  await assertSucceeds(setDoc(doc(db('alice'), 'couples', C), { ...seedCouple, code: C, members: ['alice'], profiles: { alice: P('alice') }, createdAt: 1, updatedAt: 1 }));
});
await t('no se puede crear una pareja a nombre de otro', async () => {
  await assertFails(setDoc(doc(db('bob'), 'couples', 'ZZZ999'), { ...seedCouple, code: 'ZZZ999', members: ['alice'], profiles: {} }));
});
await t('no se puede crear con una meta que no sea un número', async () => {
  await assertFails(setDoc(doc(db('bob'), 'couples', 'YYY888'), { ...seedCouple, goal: { title: 'x', target: '<img>' }, code: 'YYY888', members: ['bob'], profiles: {} }));
});
await t('con el código se puede leer una pareja que espera', async () => {
  await assertSucceeds(getDoc(doc(db('bob'), 'couples', C)));
});
await t('unirse: solo me añado yo y solo mi perfil', async () => {
  await assertSucceeds(updateDoc(doc(db('bob'), 'couples', C), { members: ['alice', 'bob'], 'profiles.bob': P('bob'), updatedAt: 2 }));
});
await t('una pareja completa no se puede leer ni unirse desde fuera', async () => {
  await assertFails(getDoc(doc(db('carol'), 'couples', C)));
  await assertFails(updateDoc(doc(db('carol'), 'couples', C), { members: ['alice', 'bob', 'carol'], 'profiles.carol': P('carol'), updatedAt: 3 }));
});

/* ---------------- Puntos ---------------- */
await couple2();
await t('reclamar mis puntos', async () => {
  await assertSucceeds(setDoc(doc(db('alice'), `couples/${C}/points/p1`), pt()));
});
await t('no puedo reclamar puntos para otro ni aprobármelos', async () => {
  await assertFails(setDoc(doc(db('alice'), `couples/${C}/points/p2`), pt({ to: 'bob' })));
  await assertFails(updateDoc(doc(db('alice'), `couples/${C}/points/p1`), { status: 'approved', resolvedAt: 2, resolvedBy: 'alice' }));
});
await t('mi pareja me da las gracias (aprueba)', async () => {
  await assertSucceeds(updateDoc(doc(db('bob'), `couples/${C}/points/p1`), { status: 'approved', resolvedAt: 2, resolvedBy: 'bob' }));
});
await t('puntos: solo enteros y solo para miembros de la pareja', async () => {
  await assertFails(setDoc(doc(db('alice'), `couples/${C}/points/p3`), pt({ amount: 10.5 })));
  await assertFails(setDoc(doc(db('alice'), `couples/${C}/points/p4`), pt({ type: 'reward', to: 'carol', status: 'approved' })));
  await assertSucceeds(setDoc(doc(db('alice'), `couples/${C}/points/p5`), pt({ type: 'reward', to: 'bob', status: 'approved' })));
});
await t('ids raros no se aceptan', async () => {
  await assertFails(setDoc(doc(db('alice'), `couples/${C}/points/"><img src=x>`), pt()));
});

/* ---------------- Gastos, tareas, huchas… (tipos) ---------------- */
const exp = { kind: 'expense', title: 'Luz', category: 'facturas', amount: 5890, paidBy: 'alice', mode: 'equal', sugar: null, shares: { alice: 2945, bob: 2945 }, date: '2026-09-29', createdBy: 'alice', createdAt: 1 };
await t('gasto normal y gasto fijo del mes (id fijo)', async () => {
  await assertSucceeds(setDoc(doc(db('alice'), `couples/${C}/expenses/e1`), exp));
  await assertSucceeds(setDoc(doc(db('bob'), `couples/${C}/expenses/rec_tpl1_2026-09`), { ...exp, recurringId: 'tpl1' }));
});
await t('gasto con importe que no es entero → no', async () => {
  await assertFails(setDoc(doc(db('alice'), `couples/${C}/expenses/e2`), { ...exp, amount: '58,90' }));
  await assertFails(setDoc(doc(db('alice'), `couples/${C}/expenses/e3`), { ...exp, amount: 58.9 }));
});
await t('tareas: puntos enteros razonables', async () => {
  const task = { title: 'Basura', emoji: '🗑️', pts: 5, assignee: null, rotate: false, repeat: 'daily', due: '2026-09-29', doneAt: null, log: [], createdBy: 'alice', createdAt: 1 };
  await assertSucceeds(setDoc(doc(db('alice'), `couples/${C}/tasks/t1`), task));
  await assertSucceeds(updateDoc(doc(db('bob'), `couples/${C}/tasks/t1`), { assignee: 'bob' }));
  await assertFails(setDoc(doc(db('alice'), `couples/${C}/tasks/t2`), { ...task, pts: '<b>' }));
});
await t('gastos fijos, huchas, aportaciones e ideas', async () => {
  await assertSucceeds(setDoc(doc(db('alice'), `couples/${C}/recurring/tpl1`), { title: 'Alquiler', category: 'casa', amount: 75000, paidBy: 'alice', mode: 'default', sugar: null, customPctA: 50, day: 1, startMonth: '2026-09', lastMonth: null }));
  await assertSucceeds(updateDoc(doc(db('bob'), `couples/${C}/recurring/tpl1`), { lastMonth: '2026-09' }));
  await assertFails(setDoc(doc(db('alice'), `couples/${C}/recurring/tpl2`), { title: 'X', amount: 100, day: 31 }));
  await assertSucceeds(setDoc(doc(db('alice'), `couples/${C}/jars/j1`), { title: 'Viaje', emoji: '✈️', target: 0, createdBy: 'alice', createdAt: 1 }));
  await assertSucceeds(setDoc(doc(db('bob'), `couples/${C}/saves/s1`), { jar: 'j1', by: 'bob', amount: -500, note: '', date: '2026-09-29', createdAt: 1 }));
  await assertSucceeds(setDoc(doc(db('alice'), `couples/${C}/ideas/i1`), { list: 'pelis', title: 'Ghibli', note: '', votes: {}, createdBy: 'alice', createdAt: 1, doneAt: null }));
  await assertSucceeds(updateDoc(doc(db('bob'), `couples/${C}/ideas/i1`), { 'votes.bob': 1 }));
});
await t('gracias: las escribo yo; mi pareja solo marca "visto"', async () => {
  await assertSucceeds(setDoc(doc(db('alice'), `couples/${C}/thanks/g1`), { from: 'alice', to: 'bob', text: 'Por la cena', emoji: '🍝', createdAt: 1, seenAt: null, reaction: null }));
  await assertFails(setDoc(doc(db('alice'), `couples/${C}/thanks/g2`), { from: 'bob', to: 'alice', text: 'x', createdAt: 1 }));
  await assertSucceeds(updateDoc(doc(db('bob'), `couples/${C}/thanks/g1`), { seenAt: 2, reaction: '❤️' }));
  await assertFails(updateDoc(doc(db('bob'), `couples/${C}/thanks/g1`), { text: 'otra cosa' }));
});

/* ---------------- Propuestas y avisos de cambios ---------------- */
const prop = { kind: 'split', value: { mode: 'equal', sugar: null, customPctA: 50 }, text: 'Vuestro reparto de gastos: a medias', by: 'alice', createdAt: 1, status: 'pending', resolvedAt: null, resolvedBy: null };
await t('propuestas: propongo yo, decide mi pareja', async () => {
  await assertSucceeds(setDoc(doc(db('alice'), `couples/${C}/proposals/r1`), prop));
  await assertFails(updateDoc(doc(db('alice'), `couples/${C}/proposals/r1`), { status: 'accepted', resolvedAt: 2, resolvedBy: 'alice' }));
  await assertSucceeds(updateDoc(doc(db('bob'), `couples/${C}/proposals/r1`), { status: 'accepted', resolvedAt: 2, resolvedBy: 'bob' }));
  await assertFails(updateDoc(doc(db('alice'), `couples/${C}/proposals/r1`), { status: 'cancelled', resolvedAt: 3, resolvedBy: 'alice' }));
  await assertFails(setDoc(doc(db('alice'), `couples/${C}/proposals/r2`), { ...prop, by: 'bob' }));
});
await t('quien propone puede anular su propuesta pendiente', async () => {
  await assertSucceeds(setDoc(doc(db('alice'), `couples/${C}/proposals/r3`), prop));
  await assertSucceeds(updateDoc(doc(db('alice'), `couples/${C}/proposals/r3`), { status: 'cancelled', resolvedAt: 2, resolvedBy: 'alice' }));
});
await t('ajustes comunes: el reparto se guarda (lo aplica quien acepta)', async () => {
  await assertSucceeds(updateDoc(doc(db('bob'), 'couples', C), { 'settings.split': { mode: 'equal', sugar: null, customPctA: 50 }, updatedAt: 3 }));
  await assertSucceeds(updateDoc(doc(db('bob'), 'couples', C), { 'settings.noPoints': true, updatedAt: 4 }));
  await assertFails(updateDoc(doc(db('bob'), 'couples', C), { 'settings.taskPctA': '50', updatedAt: 5 }));
});
/* ---------------- Xurripoints Plus ---------------- */
const DAY = 86400000;
const trial = (o = {}) => ({ tier: 'trial', source: 'trial', since: Date.now(), until: Date.now() + 14 * DAY, by: 'alice', ...o });
await t('Plus: la app no se puede dar el plan de pago ni una prueba larga o a nombre de otro', async () => {
  await assertFails(updateDoc(doc(db('alice'), 'couples', C), { plus: { tier: 'plus', source: 'play', since: 1, until: null, by: 'alice' }, updatedAt: 6 }));
  await assertFails(updateDoc(doc(db('alice'), 'couples', C), { plus: trial({ until: Date.now() + 60 * DAY }), updatedAt: 6 }));
  await assertFails(updateDoc(doc(db('alice'), 'couples', C), { plus: trial({ by: 'bob' }), updatedAt: 6 }));
  await assertFails(updateDoc(doc(db('alice'), 'couples', C), { plus: { ...trial(), extra: 1 }, updatedAt: 6 }));
  await assertFails(updateDoc(doc(db('carol'), 'couples', C), { plus: trial({ by: 'carol' }), updatedAt: 6 }));
});
await t('Plus: un miembro empieza la prueba gratis (14 días) una sola vez', async () => {
  await assertSucceeds(updateDoc(doc(db('alice'), 'couples', C), { plus: trial(), updatedAt: 6 }));
  await assertFails(updateDoc(doc(db('bob'), 'couples', C), { plus: trial({ by: 'bob' }), updatedAt: 7 }));      // otra prueba
  await assertFails(updateDoc(doc(db('alice'), 'couples', C), { 'plus.until': Date.now() + 99 * DAY, updatedAt: 7 })); // alargarla
  await assertFails(updateDoc(doc(db('alice'), 'couples', C), { 'plus.tier': 'plus', updatedAt: 7 }));
  await assertSucceeds(updateDoc(doc(db('bob'), 'couples', C), { 'settings.taskPctA': 55, updatedAt: 8 })); // lo demás sigue igual
});
await t('Plus: no se puede crear una pareja que ya venga con Plus', async () => {
  await assertFails(setDoc(doc(db('dave'), 'couples', 'PLS777'), { ...seedCouple, code: 'PLS777', members: ['dave'], profiles: { dave: P('dave') }, plus: trial({ by: 'dave' }) }));
});

await t('avisos: los escribo yo; mi pareja marca visto/recuperado; nadie los borra', async () => {
  const log = { kind: 'exp-del', text: 'borró el gasto «Luz» · 58,90 €', data: { col: 'expenses', id: 'e1', label: 'el gasto «Luz»', doc: exp }, by: 'alice', createdAt: 1, seenAt: null, restoredAt: null };
  await assertSucceeds(setDoc(doc(db('alice'), `couples/${C}/log/l1`), log));
  await assertFails(updateDoc(doc(db('alice'), `couples/${C}/log/l1`), { seenAt: 2 }));
  await assertSucceeds(updateDoc(doc(db('bob'), `couples/${C}/log/l1`), { seenAt: 2, restoredAt: 2 }));
  await assertFails(updateDoc(doc(db('bob'), `couples/${C}/log/l1`), { text: 'nada' }));
  await assertFails(deleteDoc(doc(db('alice'), `couples/${C}/log/l1`)));
  await assertFails(setDoc(doc(db('alice'), `couples/${C}/log/l2`), { ...log, by: 'bob' }));
});

/* ---------------- Salir de la pareja y borrar todo ---------------- */
await t('con dos miembros no se borran los puntos', async () => {
  await assertFails(deleteDoc(doc(db('alice'), `couples/${C}/points/p1`)));
  await assertFails(deleteDoc(doc(db('alice'), 'couples', C)));
});
await t('salir: tengo que borrar mis ingresos y no puedo echar al otro', async () => {
  await assertFails(updateDoc(doc(db('bob'), 'couples', C), { members: ['alice'], formerMembers: ['bob'], closedAt: 5, 'profiles.bob': P('bob', { left: true }), updatedAt: 5 }));
  await assertFails(updateDoc(doc(db('bob'), 'couples', C), { members: ['bob'], formerMembers: ['alice'], closedAt: 5, 'profiles.alice': { name: 'alice', emoji: '🐻', left: true }, updatedAt: 5 }));
});
await t('salir de la pareja (bob)', async () => {
  await assertSucceeds(updateDoc(doc(db('bob'), 'couples', C), { members: ['alice'], formerMembers: ['bob'], closedAt: 5, 'profiles.bob': { name: 'bob', emoji: '🐻', left: true }, updatedAt: 5 }));
  await assertSucceeds(setDoc(doc(db('bob'), 'users', 'bob'), { couple: null }, { merge: true }));
});
await t('quien sale ya no ve nada y nadie se une a una pareja cerrada', async () => {
  await assertFails(getDoc(doc(db('bob'), `couples/${C}/expenses/e1`)));
  await assertFails(getDoc(doc(db('carol'), 'couples', C)));
  await assertFails(updateDoc(doc(db('carol'), 'couples', C), { members: ['alice', 'carol'], 'profiles.carol': P('carol'), updatedAt: 6 }));
});
await t('quien se queda sola puede borrarlo todo', async () => {
  const a = db('alice');
  for (const path of ['points/p1', 'points/p5', 'expenses/e1', 'tasks/t1', 'thanks/g1', 'proposals/r1', 'log/l1', 'jars/j1', 'saves/s1', 'ideas/i1', 'recurring/tpl1'])
    await assertSucceeds(deleteDoc(doc(a, `couples/${C}/${path}`)));
  await assertSucceeds(deleteDoc(doc(a, 'couples', C)));
});

/* ---------------- Usuarios ---------------- */
await t('cada uno solo ve su users/{uid}', async () => {
  await assertSucceeds(setDoc(doc(db('alice'), 'users', 'alice'), { couple: C }));
  await assertFails(getDoc(doc(db('bob'), 'users', 'alice')));
  await assertSucceeds(deleteDoc(doc(db('alice'), 'users', 'alice')));
});

await env.cleanup();
console.log(`\n${n} pruebas de reglas OK${failed ? ` · ${failed} FALLAN` : ''}`);
process.exit(failed ? 1 : 0);
