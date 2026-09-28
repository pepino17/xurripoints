# Xurripoints

App Android para parejas (Capacitor + Firebase): moneda propia, vales, tareas y gastos compartidos.
Lee SIEMPRE `COMO_TRABAJAR.md` y `CONTEXTO.md`.

## Reglas clave
- Todo en español. Joan tiene TDAH y dislexia: respuestas cortas y claras, no corregir su ortografía.
- Datos compartidos por dos personas en Firestore: añadir campos es seguro, cambiar su significado NO (migrar).
  Si tocas `points`, revisa `firestore.rules`. Dinero en céntimos.
- Verificar en navegador (modo demo) + `node tests/logic.test.mjs` antes de decir "funciona".
- Documentar en `CHANGELOG.md`, `CONTEXTO.md` y `docs/IDEAS.md`.
- **Al terminar: commit + `git push origin main` + confirmar el build del APK** (Actions). Ver `COMO_TRABAJAR.md §7`.
