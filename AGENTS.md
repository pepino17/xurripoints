# Xurripoints

App Android para parejas (Capacitor + Firebase): moneda propia, vales, tareas y gastos compartidos.
Lee SIEMPRE `COMO_TRABAJAR.md` y `CONTEXTO.md`.

## Reglas clave
- Todo en español. Joan tiene TDAH y dislexia: respuestas cortas y claras, no corregir su ortografía.
- Datos compartidos por dos personas en Firestore: añadir campos es seguro, cambiar su significado NO (migrar).
  Si tocas lo que se escribe en cualquier colección, revisa `firestore.rules` (validan tipos) y `tests/rules.test.mjs`. Dinero en céntimos.
- **Versión en 3 sitios** (CHANGELOG, package.json, `VERSION` de app.js): la prueba falla si no coinciden.
- Joan: **no quitar funciones, pero que no esté cargada** (lo secundario plegado / en "Más" / en hojas).
- **Psicología:** la app debe ayudar a convivir, no llevar la cuenta. Reglas obligatorias en `docs/PSICOLOGIA.md`
  (sin castigos, sin permisos, el cariño no tiene precio, cooperar > competir; lo común se propone, nada cambia a escondidas).
- Verificar en navegador (modo demo) + `node tests/logic.test.mjs` antes de decir "funciona".
- Documentar en `CHANGELOG.md`, `CONTEXTO.md` y `docs/IDEAS.md`.
- **Al terminar: commit + `git push origin main` + confirmar el build del APK** (Actions). Ver `COMO_TRABAJAR.md §7`.
