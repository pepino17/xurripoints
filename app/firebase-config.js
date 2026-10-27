/* Configuración de Firebase (la "web app" del proyecto). Cómo conseguirla: docs/FIREBASE.md.
   Estos valores NO son secretos: identifican el proyecto. Lo que protege los datos son las reglas
   de Firestore (firestore.rules), que solo dejan leer y escribir a los dos miembros de cada pareja.
   Mientras esto tenga "PEGA_AQUI", la app arranca solo en modo demo. */
export const firebaseConfig = {
  apiKey: 'AIzaSyDJ8gBABDdBtyX1yaspMmNi-Immul3XhjI',
  authDomain: 'xurripoints-80808.firebaseapp.com',
  projectId: 'xurripoints-80808',
  storageBucket: 'xurripoints-80808.firebasestorage.app',
  messagingSenderId: '834579493822',
  appId: '1:834579493822:web:205585362d536e62e87fef',
};
