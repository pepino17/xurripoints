/* ================================================================
   Xurripoints — capa de datos. Dos motores con la MISMA interfaz:
   - FirebaseBackend: cada uno en su móvil, sincronizado al instante (Firestore + cuenta con email).
   - DemoBackend: todo en este dispositivo (localStorage). Simula a los dos miembros
     y deja cambiar de persona para probar peticiones y aprobaciones.

   Interfaz común:
     start(onUser)                  → llama onUser({uid,email}|null) al entrar/salir
     signUp / signIn / signOut / resetPassword
     getMyCoupleCode()              → código de pareja guardado en users/{uid} (o null)
     createCouple(profile, seed)    → crea la pareja y devuelve el código
     joinCouple(code, profile)      → se une a una pareja existente (máx. 2 miembros)
     watch(code, onData, onError)   → onData({couple, points, expenses, tasks, recurring, ideas, thanks, jars, saves}); devuelve "dejar de escuchar"
     updateCouple(patch)            → admite rutas con puntos: {'profiles.X.name': 'Ana'}
     add(col, data) → {id, done}  ·  set(col, id, data) (id fijo, idempotente)  ·  update(col, id, patch)  ·  remove(col, id)
     leaveCouple()                  → salgo de la pareja (si soy el último, se borra todo)
     deleteAccount(password)        → sale de la pareja, borra users/{uid} y la cuenta (solo Firebase)
   Las escrituras NO se esperan en la interfaz: Firestore las aplica al momento en local
   (funciona sin conexión) y las sube cuando hay red.
   ================================================================ */
import { genCode, uid8, ymd } from './logic.js';
import { firebaseConfig } from './firebase-config.js';

export function hasFirebaseConfig() {
  return !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.projectId && !/PEGA|TU_/i.test(firebaseConfig.apiKey));
}

// proposals = cambios de reglas comunes que el otro acepta · log = avisos de cambios (borrar, editar…)
const COLS = ['points', 'expenses', 'tasks', 'recurring', 'ideas', 'thanks', 'jars', 'saves', 'proposals', 'log'];
const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;

/* Lo útil de la demo se guarda aparte al salir de ella, para llevarlo a la pareja real (logic.demoToSeed). */
const DEMO_STASH = 'xurripoints_demo_stash';
export function peekDemoStash() { try { return JSON.parse(localStorage.getItem(DEMO_STASH)) || null; } catch (e) { return null; } }
export function dropDemoStash() { try { localStorage.removeItem(DEMO_STASH); } catch (e) { /* nada */ } }

/* ---------------- Firebase ---------------- */
/** Opciones solo para las pruebas (tests/store.test.mjs, con los emuladores): nombre de app, config,
    persistencia en memoria y conectar a los emuladores. La app usa los valores por defecto. */
export class FirebaseBackend {
  constructor(fb, { name, config = firebaseConfig, persistence, emulator } = {}) {
    this.kind = 'firebase';
    this.fb = fb;
    this.app = fb.initializeApp(config, name);
    this.auth = fb.initializeAuth(this.app, { persistence: persistence || [fb.indexedDBLocalPersistence, fb.browserLocalPersistence] });
    let localCache;
    try { localCache = emulator ? undefined : fb.persistentLocalCache({ tabManager: fb.persistentSingleTabManager() }); } catch (e) { localCache = undefined; }
    this.db = fb.initializeFirestore(this.app, localCache ? { localCache } : {});
    if (emulator) {
      fb.connectAuthEmulator(this.auth, `http://${emulator.auth}`, { disableWarnings: true });
      const [host, port] = emulator.firestore.split(':');
      fb.connectFirestoreEmulator(this.db, host, Number(port));
    }
    this.code = null;
  }
  get uid() { return this.auth.currentUser ? this.auth.currentUser.uid : null; }
  start(onUser) {
    if (this.unsubAuth) this.unsubAuth(); // si se reutiliza el motor, un solo oyente
    this.unsubAuth = this.fb.onAuthStateChanged(this.auth, u => onUser(u ? { uid: u.uid, email: u.email } : null));
  }
  signUp(email, pass) { return this.fb.createUserWithEmailAndPassword(this.auth, email, pass); }
  signIn(email, pass) { return this.fb.signInWithEmailAndPassword(this.auth, email, pass); }
  signOut() { this.code = null; return this.fb.signOut(this.auth); }
  resetPassword(email) { return this.fb.sendPasswordResetEmail(this.auth, email); }

  userRef() { return this.fb.doc(this.db, 'users', this.uid); }
  coupleRef(code = this.code) { return this.fb.doc(this.db, 'couples', code); }

  async getMyCoupleCode() {
    const s = await this.fb.getDoc(this.userRef());
    return s.exists() ? (s.data().couple || null) : null;
  }
  async createCouple(profile, seed) {
    const { fb } = this;
    for (let i = 0; i < 8; i++) {
      const code = genCode();
      const ref = this.coupleRef(code);
      try {
        await fb.runTransaction(this.db, async tx => {
          const s = await tx.get(ref);
          if (s.exists()) throw new Error('__ocupado__');
          tx.set(ref, { ...seed, code, members: [this.uid], profiles: { [this.uid]: profile }, createdAt: Date.now(), updatedAt: Date.now() });
        });
        await fb.setDoc(this.userRef(), { couple: code }, { merge: true });
        this.code = code;
        return code;
      } catch (e) {
        if (e.message !== '__ocupado__') throw e;
      }
    }
    throw new Error('No se pudo generar un código. Inténtalo otra vez.');
  }
  async joinCouple(code, profile) {
    const { fb } = this;
    code = String(code || '').trim().toUpperCase();
    const ref = this.coupleRef(code);
    try {
      await fb.runTransaction(this.db, async tx => {
        const s = await tx.get(ref);
        if (!s.exists()) throw new Error('No existe ninguna pareja con ese código.');
        const d = s.data();
        if (d.members.includes(this.uid)) return;
        if (d.closedAt) throw new Error('Esa pareja ya no está activa.');
        if (d.members.length >= 2) throw new Error('Esa pareja ya está completa.');
        tx.update(ref, { members: [...d.members, this.uid], [`profiles.${this.uid}`]: profile, updatedAt: Date.now() });
      });
    } catch (e) {
      // Las reglas no dejan ni leer una pareja completa o cerrada si no eres de ella: se explica claro.
      if (e && e.code === 'permission-denied') throw new Error('Esa pareja ya está completa o ya no está activa.');
      throw e;
    }
    await fb.setDoc(this.userRef(), { couple: code }, { merge: true });
    this.code = code;
    return code;
  }
  watch(code, onData, onError) {
    const { fb } = this;
    this.code = code;
    const data = { couple: null, ...Object.fromEntries(COLS.map(c => [c, []])) };
    const seen = new Set();
    const emit = key => { seen.add(key); if (seen.has('couple') && COLS.every(c => seen.has(c))) onData({ ...data }); };
    const unsubs = [
      fb.onSnapshot(this.coupleRef(code), s => { data.couple = s.exists() ? s.data() : null; emit('couple'); }, onError),
      ...COLS.map(col => fb.onSnapshot(fb.collection(this.db, 'couples', code, col), qs => {
        // Solo ids "normales" (los que crea la app): un id raro no llega nunca a pintarse en la pantalla.
        data[col] = qs.docs.filter(d => SAFE_ID.test(d.id)).map(d => ({ id: d.id, ...d.data() }));
        emit(col);
      }, onError)),
    ];
    return () => unsubs.forEach(u => { try { u(); } catch (e) { /* nada */ } });
  }
  updateCouple(patch) {
    return this.fb.updateDoc(this.coupleRef(), { ...patch, updatedAt: Date.now() });
  }
  add(col, data) {
    const ref = this.fb.doc(this.fb.collection(this.db, 'couples', this.code, col));
    const p = this.fb.setDoc(ref, data);
    return { id: ref.id, done: p };
  }
  set(col, id, data) { return this.fb.setDoc(this.fb.doc(this.db, 'couples', this.code, col, id), data); }
  update(col, id, patch) { return this.fb.updateDoc(this.fb.doc(this.db, 'couples', this.code, col, id), patch); }
  remove(col, id) { return this.fb.deleteDoc(this.fb.doc(this.db, 'couples', this.code, col, id)); }

  /** Salir de la pareja. Quien se queda conserva el historial común; de mí solo queda el nombre y el
      avatar (los ingresos se borran). Nadie más puede unirse a una pareja cerrada.
      Si soy el último miembro, se borra todo. */
  async leaveCouple() {
    const { fb } = this, me = this.uid;
    const code = this.code || await this.getMyCoupleCode();
    if (!code) return;
    this.code = code;
    const ref = this.coupleRef(code);
    let last = false;
    await fb.runTransaction(this.db, async tx => {
      const s = await tx.get(ref);
      if (!s.exists()) return;
      const d = s.data();
      if (!d.members.includes(me)) return;
      if (d.members.length <= 1) { last = true; return; }
      const p = (d.profiles || {})[me] || {};
      tx.update(ref, {
        members: d.members.filter(u => u !== me),
        formerMembers: [...(d.formerMembers || []), me],
        closedAt: Date.now(),
        [`profiles.${me}`]: { name: p.name || '¿?', emoji: p.emoji || '🙂', left: true },
        updatedAt: Date.now(),
      });
    });
    if (last) await this.deleteAll(code);
    await fb.setDoc(this.userRef(), { couple: null }, { merge: true });
    this.code = null;
  }
  /** Borra la pareja entera (solo se puede siendo el único miembro: ver firestore.rules). */
  async deleteAll(code = this.code) {
    const { fb } = this;
    for (const col of COLS) {
      const qs = await fb.getDocs(fb.collection(this.db, 'couples', code, col));
      await Promise.all(qs.docs.map(d => fb.deleteDoc(d.ref)));
    }
    await fb.deleteDoc(this.coupleRef(code));
  }
  /** Borrar mi cuenta: pide la contraseña (Firebase exige haber entrado hace poco), sale de la pareja,
      borra users/{uid} y la cuenta. */
  async deleteAccount(password) {
    const { fb } = this, u = this.auth.currentUser;
    if (!u) return;
    await fb.reauthenticateWithCredential(u, fb.EmailAuthProvider.credential(u.email, password));
    await this.leaveCouple();
    await fb.deleteDoc(this.userRef());
    await fb.deleteUser(u);
  }
}

/* ---------------- Demo (un solo dispositivo) ---------------- */
const DEMO_KEY = 'xurripoints_demo_v1';

function setPath(obj, path, value) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) { if (typeof o[keys[i]] !== 'object' || o[keys[i]] === null) o[keys[i]] = {}; o = o[keys[i]]; }
  o[keys[keys.length - 1]] = value;
}

class DemoBackend {
  constructor() {
    this.kind = 'demo';
    this.onUser = null;
    this.listeners = new Set();
    try { this.data = JSON.parse(localStorage.getItem(DEMO_KEY)) || null; } catch (e) { this.data = null; }
    if (this.data) COLS.forEach(c => { if (!Array.isArray(this.data[c])) this.data[c] = []; }); // demos antiguas
  }
  get uid() { return this.data ? this.data.me : null; }
  save() {
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(this.data)); } catch (e) { /* sin almacenamiento */ }
    const snap = this.snapshot();
    queueMicrotask(() => this.listeners.forEach(fn => fn(snap)));
  }
  snapshot() {
    const d = this.data;
    return { couple: structuredClone(d.couple), ...Object.fromEntries(COLS.map(c => [c, structuredClone(d[c])])) };
  }
  start(onUser) { this.onUser = onUser; onUser(this.data ? { uid: this.data.me, email: 'modo demo' } : null); }
  /** Crea la demo con datos de ejemplo para que se vea viva desde el principio. */
  begin(fullSeed) {
    const { ideas: seedIdeas = [], ...seed } = fullSeed;
    const A = 'demoA', B = 'demoB';
    const now = Date.now(), H = 3600e3, D = 24 * H, t = ymd();
    const pts = (type, from, to, amount, title, emoji, status, createdBy, ago) => ({ id: uid8(), type, from, to, amount, title, emoji, status, createdBy, createdAt: now - ago, resolvedAt: status === 'pending' ? null : now - ago + H, resolvedBy: status === 'pending' ? null : (createdBy === A ? B : A), note: '' });
    const eq = (amount) => ({ [A]: Math.round(amount / 2), [B]: amount - Math.round(amount / 2) });
    this.data = {
      me: A,
      couple: {
        ...seed, code: 'DEMO42', members: [A, B], createdAt: now - 20 * D, updatedAt: now,
        goal: { title: 'Escapada juntos', emoji: '🏖️', target: 300, since: now - 20 * D },
        settings: { ...(seed.settings || {}), split: { mode: 'proportional', sugar: null, customPctA: 50 } },
        profiles: {
          [A]: { name: 'Pepino', emoji: '🥒', sugar: 'papi', income: 210000 },
          [B]: { name: 'Churri', emoji: '🍓', sugar: 'mami', income: 170000 },
        },
      },
      points: [
        pts('claim', null, A, 15, 'Hacer la cena', '🍝', 'approved', A, 6 * D),
        pts('claim', null, B, 20, 'Limpiar el baño', '🛁', 'approved', B, 5 * D),
        pts('reward', null, B, 20, 'Encargarse de la cita del médico', '📅', 'approved', A, 4.5 * D),
        pts('claim', null, B, 15, 'Poner el lavavajillas', '🍽️', 'approved', B, 3.5 * D),
        pts('reward', null, A, 25, 'Montar el mueble del salón', '🔧', 'approved', B, 4 * D),
        pts('claim', null, A, 10, 'Fregar los platos', '🧽', 'approved', A, 3 * D),
        pts('redeem', B, A, 30, 'Tarde de series (elijo yo)', '📺', 'approved', B, 2 * D),
        pts('claim', null, B, 15, 'Hacer la compra', '🛒', 'pending', B, 3 * H),
        pts('claim', null, A, 10, 'Poner una lavadora', '🧺', 'approved', A, 1 * D),
      ],
      expenses: [
        { id: uid8(), kind: 'expense', title: 'Compra Mercadona', category: 'super', amount: 6420, paidBy: A, mode: 'equal', shares: eq(6420), date: ymd(new Date(now - 5 * D)), createdBy: A, createdAt: now - 5 * D },
        { id: uid8(), kind: 'expense', title: 'Cena japo', category: 'fuera', amount: 4800, paidBy: B, mode: 'equal', shares: eq(4800), date: ymd(new Date(now - 3 * D)), createdBy: B, createdAt: now - 3 * D },
        { id: uid8(), kind: 'expense', title: 'Entradas del concierto', category: 'ocio', amount: 9000, paidBy: A, mode: 'sugar', sugar: A, shares: { [A]: 9000, [B]: 0 }, date: ymd(new Date(now - 2 * D)), createdBy: A, createdAt: now - 2 * D },
        { id: uid8(), kind: 'expense', title: 'Luz', category: 'facturas', amount: 5890, paidBy: B, mode: 'proportional', shares: { [A]: 3255, [B]: 2635 }, date: ymd(new Date(now - 1 * D)), createdBy: B, createdAt: now - 1 * D },
      ],
      tasks: [
        { id: uid8(), title: 'Fregar los platos', emoji: '🧽', pts: 10, assignee: A, rotate: true, repeat: 'daily', due: t, doneAt: null, log: [], createdBy: A, createdAt: now - 10 * D },
        { id: uid8(), title: 'Bajar la basura', emoji: '🗑️', pts: 5, assignee: B, rotate: false, repeat: 'daily', due: t, doneAt: null, log: [], createdBy: A, createdAt: now - 10 * D },
        { id: uid8(), title: 'Limpiar el baño', emoji: '🛁', pts: 20, assignee: B, rotate: false, repeat: 'weekly', due: ymd(new Date(now + 2 * D)), doneAt: null, log: [], createdBy: B, createdAt: now - 10 * D },
        { id: uid8(), title: 'Hacer la compra', emoji: '🛒', pts: 15, assignee: null, rotate: false, repeat: 'weekly', due: ymd(new Date(now + 1 * D)), doneAt: null, log: [], createdBy: A, createdAt: now - 10 * D },
        { id: uid8(), title: 'Cambiar las sábanas', emoji: '🛏️', pts: 10, assignee: null, rotate: false, repeat: 'weekly', due: ymd(new Date(now + 4 * D)), doneAt: null, log: [], createdBy: A, createdAt: now - 8 * D },
        { id: uid8(), title: 'Pedir cita veterinario', emoji: '🐾', pts: 5, assignee: A, rotate: false, repeat: 'none', due: null, doneAt: null, log: [], createdBy: B, createdAt: now - 2 * D },
      ],
      ideas: seedIdeas.map((it, i) => ({
        id: uid8(), ...it, note: it.note || '', createdBy: i % 2 ? B : A, createdAt: now - (30 - i) * H, doneAt: null,
        // algunos votos de ejemplo para que se vea un "match"
        votes: i === 0 || i === 13 ? { [A]: 1, [B]: 1 } : i % 3 === 0 ? { [B]: 1 } : {},
      })),
      thanks: [
        { id: uid8(), from: B, to: A, text: 'Por hacerme la cena cuando llegué tarde', emoji: '🍝', createdAt: now - 5 * H, seenAt: null, reaction: null },
        { id: uid8(), from: A, to: B, text: 'Por escucharme ayer', emoji: '🎧', createdAt: now - 2 * D, seenAt: now - 2 * D, reaction: '❤️' },
      ],
      jars: [
        { id: 'japon', title: 'Viaje a Japón', emoji: '✈️', target: 300000, createdBy: A, createdAt: now - 60 * D },
        { id: 'colchon', title: 'Colchón para imprevistos', emoji: '🛟', target: 0, createdBy: B, createdAt: now - 40 * D },
      ],
      saves: [
        { id: uid8(), jar: 'japon', by: A, amount: 20000, note: 'Primer empujón', date: ymd(new Date(now - 50 * D)), createdAt: now - 50 * D },
        { id: uid8(), jar: 'japon', by: B, amount: 20000, note: '', date: ymd(new Date(now - 49 * D)), createdAt: now - 49 * D },
        { id: uid8(), jar: 'japon', by: A, amount: 15000, note: 'Paga extra 🎉', date: ymd(new Date(now - 10 * D)), createdAt: now - 10 * D },
        { id: uid8(), jar: 'colchon', by: B, amount: 5000, note: '', date: ymd(new Date(now - 30 * D)), createdAt: now - 30 * D },
      ],
      recurring: [
        { id: 'alquiler', title: 'Alquiler', category: 'casa', amount: 75000, paidBy: A, mode: 'default', sugar: null, customPctA: 50, day: 1, startMonth: t.slice(0, 7), lastMonth: null, createdBy: A, createdAt: now - 20 * D },
      ],
      // Una propuesta de ejemplo: Churri propone subir un vale (se acepta o se habla).
      proposals: (() => {
        const it = ((seed.catalog || {}).spend || []).find(x => x.title === 'Elijo yo la cena');
        return it ? [{ id: uid8(), kind: 'catalog', value: { op: 'upsert', kind: 'spend', item: { ...it, pts: 20 } },
          text: `Vale «${it.title}»: ${it.pts} → 20 puntos`, by: B, createdAt: now - 2 * H, status: 'pending', resolvedAt: null, resolvedBy: null }] : [];
      })(),
      log: [],
    };
    this.save();
    this.onUser && this.onUser({ uid: A, email: 'modo demo' });
  }
  /** Cambia de persona (probar a aprobar lo que pidió la otra). */
  switchPersona() {
    const [a, b] = this.data.couple.members;
    this.data.me = this.data.me === a ? b : a;
    this.save();
    this.onUser && this.onUser({ uid: this.data.me, email: 'modo demo' });
  }
  /** Salir de la demo. Con keep, lo útil se guarda aparte para llevarlo a la pareja real. */
  signOut({ keep = false } = {}) {
    try {
      if (keep && this.data) localStorage.setItem(DEMO_STASH, JSON.stringify(this.data));
      localStorage.removeItem(DEMO_KEY);
    } catch (e) { /* sin almacenamiento */ }
    this.data = null;
    this.onUser && this.onUser(null);
    return Promise.resolve();
  }
  /** En la demo, "salir de la pareja" te convierte en la otra persona para ver lo que le queda a quien se queda. */
  leaveCouple() {
    const c = this.data.couple, me = this.data.me;
    const rest = c.members.filter(u => u !== me);
    if (!rest.length) return this.signOut();
    c.members = rest;
    c.formerMembers = [...(c.formerMembers || []), me];
    c.closedAt = Date.now();
    c.profiles[me] = { name: c.profiles[me].name, emoji: c.profiles[me].emoji, left: true };
    this.data.me = rest[0];
    this.save();
    this.onUser && this.onUser({ uid: this.data.me, email: 'modo demo' });
    return Promise.resolve();
  }
  async getMyCoupleCode() { return this.data ? this.data.couple.code : null; }
  watch(code, onData) {
    this.listeners.add(onData);
    queueMicrotask(() => onData(this.snapshot()));
    return () => this.listeners.delete(onData);
  }
  updateCouple(patch) {
    for (const [k, v] of Object.entries(patch)) setPath(this.data.couple, k, structuredClone(v));
    this.data.couple.updatedAt = Date.now();
    this.save();
    return Promise.resolve();
  }
  add(col, data) {
    const id = uid8();
    this.data[col].push({ id, ...structuredClone(data) });
    this.save();
    return { id, done: Promise.resolve() };
  }
  set(col, id, data) {
    const list = this.data[col];
    const i = list.findIndex(x => x.id === id);
    const doc = { id, ...structuredClone(data) };
    if (i >= 0) list[i] = doc; else list.push(doc);
    this.save();
    return Promise.resolve();
  }
  update(col, id, patch) {
    const it = this.data[col].find(x => x.id === id);
    if (it) for (const [k, v] of Object.entries(patch)) setPath(it, k, structuredClone(v));
    this.save();
    return Promise.resolve();
  }
  remove(col, id) {
    this.data[col] = this.data[col].filter(x => x.id !== id);
    this.save();
    return Promise.resolve();
  }
}

// Firebase solo se puede iniciar UNA vez por sesión (initializeApp/initializeAuth fallan si se repiten).
// Si se entra y se sale de la demo, se reutiliza el mismo motor.
let firebaseSingleton = null;
export async function createBackend(mode) {
  if (mode === 'demo' || !hasFirebaseConfig()) return new DemoBackend();
  if (!firebaseSingleton) {
    const fb = await import('./vendor/firebase.js');
    firebaseSingleton = new FirebaseBackend(fb);
  }
  return firebaseSingleton;
}
