# CÓMO TRABAJAR en Xurripoints

Guía para cualquier asistente (o persona) que retome el proyecto. Léela junto a `CONTEXTO.md`.

## 1. Con quién trabajas (Joan)
- Tiene **TDAH y dislexia**. Escribe rápido y con faltas: **no corrijas su ortografía**, entiende la intención.
- Responde **claro y con poco texto**. Negritas para lo importante.
- Lanza ideas en ráfagas: **recógelas todas** en `docs/IDEAS.md` aunque sean para el futuro.
- Valora la **honestidad técnica**: si algo no se puede (p. ej. avisos push sin servidor), dilo y da la alternativa real.
- Si dudas del concepto, **pregunta** antes de construir a ciegas.

## 1b. Regla de oro: que la app SUME a la pareja
- Lee **`docs/PSICOLOGIA.md`** antes de añadir funciones. Sus **8 reglas de diseño son obligatorias**:
  nada de castigos, nada de permisos, el cariño no tiene precio, cooperar > competir, confianza por defecto,
  lenguaje amable, empujar a hablar en persona, y nada que sirva para controlar.
- En la práctica (v0.7): lo que afecta a los dos se cambia con **`propose(kind, value, text)`** (no con `updateCouple`
  directo); borrar o cambiar cosas de dinero/tareas deja un aviso con **`logChange(kind, text, data)`** para que la
  pareja lo vea y pueda recuperarlo. Revisa también los **textos de ejemplo** (placeholders): también educan.

## 2. Idioma y tono
- **Todo en español** (interfaz, código, comentarios, documentación).
- Tono de la app: cariñoso y con humor de pareja, **sin ser empalagoso** ni infantil.

## 2b. Interfaz: que sea fácil
- Joan (2026-09-29): **"no quites funciones, pero que no esté cargada"**. Cada pantalla, **lo mínimo a la vista**;
  lo secundario en "Más opciones" (`details.more`), plegado, en la fila "Más" o en una hoja.
- Todo lo que se apunta entra por el **＋ central** (`addMenu`): 4 grandes + "Más". Nada de botones flotantes por pantalla.
- Tutorial: si añades una pantalla, añade su ayuda en `HINTS` (tarjeta la 1.ª vez + botón ? con `pageHead(…, { help })`).
  Si añades algo que todo el mundo debería probar al empezar, va en `L.firstSteps` + `STEP_INFO`.
- Legibilidad (dislexia): nada de letra por debajo de `.78rem`, nada de MAYÚSCULAS espaciadas, y contraste ≥ 4,5:1.
- Azar siempre con `L.randInt` / `L.rand` (nunca `Math.random` para decidir nada).

## 3. Datos (cuidado: son de DOS personas)
- Los datos viven en Firestore y los comparten los dos móviles. **No cambies el significado de un campo**
  sin migración; añadir campos sí es seguro. Modelo en `CONTEXTO.md`.
- **Si cambias qué se escribe en cualquier colección, revisa `firestore.rules`**: validan tipos (enteros, textos,
  ids `[A-Za-z0-9_-]`) en todas. Y añade el caso a `tests/rules.test.mjs`.
- Dinero en **céntimos** (enteros). Nunca floats. Números que vienen de la base se pintan con `num()`; textos con `esc()`.

## 4. Guardar y documentar SIEMPRE
- Tras cambios importantes: `CHANGELOG.md` (nueva versión arriba), estado en `CONTEXTO.md`, ideas en `docs/IDEAS.md`.
- Fechas **absolutas** (2026-09-28), no "hoy".
- Sube la versión en **los tres sitios**: `CHANGELOG.md`, `package.json` y `VERSION` de `app/app.js`.
  La prueba `node tests/logic.test.mjs` falla si no coinciden, y el build falla si esa versión ya está publicada
  (así no se pisa una release, como pasó con la v0.6.0).

## 5. Cómo probar antes de decir "funciona"
- `node tests/logic.test.mjs` (lógica pura + versión).
- Reglas y datos de Firebase: `tests/rules.test.mjs` y `tests/store.test.mjs` necesitan Java (emuladores), que no
  hay en el PC → corren en GitHub Actions (`rules.yml`) al subir cambios en reglas/`store.js`. Para probarlos sin
  publicar APK, sube una **rama** (no `main`) y mira `gh run list`. **No llames a la rama como la versión** (`v0.7.0`),
  que choca con la etiqueta de la release.
- Servir la web: `python -m http.server 5173 --directory app` y abrir `http://localhost:5173`
  en tamaño móvil (si el navegador enseña la versión vieja, es la caché: recarga forzada).
  **Modo demo** → probar el flujo tocado (con "cambiar de persona" para aceptar propuestas o recuperar cosas).
- Consola **sin errores**.
- Si tocas `src/firebase.js`: `npm run build` (regenera `app/vendor/firebase.js`).

## 6. Estilo visual
- **Tierno pastel**: crema `#FFF3EC`, rosa (miembro A), lila (miembro B), mantequilla (monedas), menta (aprobar).
- Títulos y números en **Fraunces** (SOFT 100), texto en **Lexend**. Botones "de juguete" con sombra inferior.
- Tokens en `:root` de `app/styles.css`. No sobre-diseñar.

## 7. Al terminar: commit + push + verificar el build (regla de Joan)
1. `git add` de lo tocado y commit con el estilo `vX.Y.Z: resumen`.
2. `git push origin main`.
3. Confirmar que el APK compila: `gh run list --repo pepino17/xurripoints --limit 1` (y `gh run watch <id>`).
4. Con el run en verde, el APK queda en `releases/latest` como `Xurripoints-vX.Y.Z.apk` y `Xurripoints.apk`.
   Enlace permanente para testers: `https://github.com/pepino17/xurripoints/releases/latest/download/Xurripoints.apk`.
   Un push que solo toque `**.md`/`docs/**` **no** recompila.
5. **Nunca** subas la clave de firma (`*.p12`): el repo es público. Ver `CONTEXTO.md` → Firma del APK.

_Si cambias cómo se trabaja, actualiza este documento._
