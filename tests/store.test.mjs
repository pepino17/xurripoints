// Prueba de app/store.js (FirebaseBackend) contra los emuladores de Firebase: cuentas, crear pareja, unirse,
// escuchar datos, propuestas y avisos, salir de la pareja y borrar la cuenta. Es lo mismo que hace la app en
// los dos móviles, pero sin móviles. Necesita los emuladores de auth y firestore (con las reglas de firestore.rules):
//   npx -y firebase-tools emulators:exec --only auth,firestore --project demo-xurripoints "node tests/store.test.mjs"
// En GitHub Actions: .github/workflows/rules.yml.
import assert from 'node:assert/strict';
import * as fbApp from 'firebase/app';
import * as fbAuth from 'firebase/auth';
import * as fbStore from 'firebase/firestore';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { FirebaseBackend } from '../app/store.js';

const fb = { ...fbApp, ...fbAuth, ...fbStore };
const emulator = { auth: process.env.FIREBASE_AUTH_EMULATOR_HOST, firestore: process.env.FIRESTORE_EMULATOR_HOST };
assert.ok(emulator.auth && emulator.firestore, 'Faltan los emuladores (FIREBASE_AUTH_EMULATOR_HOST / FIRESTORE_EMULATOR_HOST)');
const config = { apiKey: 'demo-key', authDomain: 'demo-xurripoints.firebaseapp.com', projectId: 'demo-xurripoints', appId: 'demo' };
const mk = name => new FirebaseBackend(fb, { name, config, persistence: fbAuth.inMemoryPersistence, emulator });
// Para comprobar lo que queda en la base sin reglas (como si fuéramos la consola de Firebase).
const admin = await initializeTestEnvironment({ projectId: 'demo-xurripoints' });
const exists = async path => { let ok = false; await admin.withSecurityRulesDisabled(async ctx => { ok = (await fbStore.getDoc(fbStore.doc(ctx.firestore(), path))).exists(); }); return ok; };

let n = 0, failed = 0;
async function t(name, fn) {
  try { await fn(); n++; console.log('✔', name); }
  catch (e) { failed++; console.error('✘', name, '\n   ', e && e.message); }
}

const A = mk('alice'), B = mk('bob'), X = mk('carol');
const prof = name => ({ name, emoji: '🐻', sugar: 'mami', income: 200000 });
const seed = { catalog: { earn: [{ id: 'e1', emoji: '🧽', title: 'Fregar', pts: 10 }], spend: [] }, settings: { taskPctA: 50 }, goal: { title: 'Meta', emoji: '🎯', target: 500, since: 1 } };
let code;

await t('crear cuentas', async () => {
  await A.signUp('alice@test.com', 'secreto1');
  await B.signUp('bob@test.com', 'secreto2');
  await X.signUp('carol@test.com', 'secreto3');
  assert.ok(A.uid && B.uid && X.uid);
});
await t('crear pareja y guardar el código en users/{uid}', async () => {
  code = await A.createCouple(prof('Alice'), seed);
  assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(await A.getMyCoupleCode(), code);
});
await t('unirse con el código', async () => {
  await B.joinCouple(code.toLowerCase(), prof('Bob'));
  assert.equal(await B.getMyCoupleCode(), code);
});
await t('una tercera persona no puede unirse (mensaje claro)', async () => {
  await assert.rejects(X.joinCouple(code, prof('Carol')), /completa o ya no está activa/);
});
await t('escuchar: llegan la pareja y todas las colecciones (también propuestas y avisos)', async () => {
  const data = await new Promise((resolve, reject) => {
    const stop = A.watch(code, d => { if (d.couple && d.couple.members.length === 2) { stop(); resolve(d); } }, reject);
  });
  for (const col of ['points', 'expenses', 'tasks', 'recurring', 'ideas', 'thanks', 'jars', 'saves', 'proposals', 'log']) assert.ok(Array.isArray(data[col]), col);
  assert.deepEqual(data.couple.members, [A.uid, B.uid]);
});
await t('escrituras como las de la app: puntos, gasto, gasto fijo, propuesta, aviso', async () => {
  await A.add('points', { type: 'claim', from: null, to: A.uid, amount: 10, title: 'Fregar', emoji: '🧽', note: '', status: 'pending', createdBy: A.uid, createdAt: Date.now(), resolvedAt: null, resolvedBy: null, taskId: null }).done;
  const exp = { kind: 'expense', title: 'Luz', category: 'facturas', amount: 5890, paidBy: A.uid, mode: 'equal', sugar: null, shares: { [A.uid]: 2945, [B.uid]: 2945 }, date: '2026-09-29', createdBy: A.uid, createdAt: Date.now() };
  await A.add('expenses', exp).done;
  await B.set('expenses', 'rec_tpl1_2026-09', { ...exp, recurringId: 'tpl1' });
  const p = B.add('proposals', { kind: 'split', value: { mode: 'equal', sugar: null, customPctA: 50 }, text: 'Vuestro reparto de gastos: a medias', by: B.uid, createdAt: Date.now(), status: 'pending', resolvedAt: null, resolvedBy: null });
  await p.done;
  await A.updateCouple({ 'settings.split': { mode: 'equal', sugar: null, customPctA: 50 } }); // lo aplica quien acepta
  await A.update('proposals', p.id, { status: 'accepted', resolvedAt: Date.now(), resolvedBy: A.uid });
  await A.add('log', { kind: 'exp-del', text: 'borró el gasto «Luz» · 58,90 €', data: null, by: A.uid, createdAt: Date.now(), seenAt: null, restoredAt: null }).done;
});
await t('salir de la pareja (Bob): la pareja se cierra y sus ingresos se borran', async () => {
  await B.leaveCouple();
  assert.equal(await B.getMyCoupleCode(), null);
  const s = await fbStore.getDoc(A.coupleRef(code));
  const d = s.data();
  assert.deepEqual(d.members, [A.uid]);
  assert.deepEqual(d.formerMembers, [B.uid]);
  assert.ok(d.closedAt);
  assert.equal(d.profiles[B.uid].left, true);
  assert.ok(!('income' in d.profiles[B.uid]));
  assert.equal(d.profiles[A.uid].income, 200000); // lo de Alice no se toca
});
await t('quien sale ya no ve la pareja y nadie puede unirse a una pareja cerrada', async () => {
  await assert.rejects(fbStore.getDoc(fbStore.doc(B.db, 'couples', code)));
  await assert.rejects(X.joinCouple(code, prof('Carol')), /completa o ya no está activa/);
});
await t('borrar la cuenta de Alice (la última): se borra la pareja entera y su cuenta', async () => {
  const uid = A.uid;
  await assert.rejects(A.deleteAccount('mal'), e => /auth\//.test(e.code || ''));
  assert.equal(await exists(`couples/${code}`), true); // con la contraseña mal no se borra nada
  await A.deleteAccount('secreto1');
  assert.equal(await exists(`couples/${code}`), false);
  assert.equal(await exists(`couples/${code}/expenses/rec_tpl1_2026-09`), false);
  assert.equal(await exists(`users/${uid}`), false);
  await assert.rejects(A.signIn('alice@test.com', 'secreto1'));
});
await t('borrar la cuenta de Bob (ya sin pareja)', async () => {
  const uid = B.uid;
  await B.deleteAccount('secreto2');
  assert.equal(await exists(`users/${uid}`), false);
  await assert.rejects(B.signIn('bob@test.com', 'secreto2'));
});

await Promise.all([A, B, X].map(x => fbApp.deleteApp(x.app).catch(() => { })));
await admin.cleanup();
console.log(`\n${n} pruebas de datos OK${failed ? ` · ${failed} FALLAN` : ''}`);
process.exit(failed ? 1 : 0);
