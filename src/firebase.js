// Punto de entrada del paquete de Firebase. `npm run build` lo empaqueta con esbuild en
// app/vendor/firebase.js (un solo archivo ESM, sin CDN: la app funciona offline dentro del APK).
// Si necesitas otra función de Firebase, expórtala aquí y vuelve a ejecutar `npm run build`.
export { initializeApp } from 'firebase/app';
export {
  initializeAuth, indexedDBLocalPersistence, browserLocalPersistence,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
  onAuthStateChanged, sendPasswordResetEmail,
  deleteUser, reauthenticateWithCredential, EmailAuthProvider,
  connectAuthEmulator, inMemoryPersistence,
} from 'firebase/auth';
export {
  initializeFirestore, persistentLocalCache, persistentSingleTabManager,
  doc, collection, getDoc, getDocs, setDoc, updateDoc, addDoc, deleteDoc,
  onSnapshot, runTransaction, deleteField, connectFirestoreEmulator,
} from 'firebase/firestore';
