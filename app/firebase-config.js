/* Configuración de Firebase (la "web app" del proyecto). Cómo conseguirla: docs/FIREBASE.md.
   Estos valores NO son secretos: identifican el proyecto. Lo que protege los datos son las reglas
   de Firestore (firestore.rules), que solo dejan leer y escribir a los dos miembros de cada pareja.
   Mientras esto tenga "PEGA_AQUI", la app arranca solo en modo demo. */
export const firebaseConfig = {
  apiKey: 'PEGA_AQUI',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};
