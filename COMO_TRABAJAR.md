# CÓMO TRABAJAR en Xurripoints

Guía para cualquier asistente (o persona) que retome el proyecto. Léela junto a `CONTEXTO.md`.

## 1. Con quién trabajas (Joan)
- Tiene **TDAH y dislexia**. Escribe rápido y con faltas: **no corrijas su ortografía**, entiende la intención.
- Responde **claro y con poco texto**. Negritas para lo importante.
- Lanza ideas en ráfagas: **recógelas todas** en `docs/IDEAS.md` aunque sean para el futuro.
- Valora la **honestidad técnica**: si algo no se puede (p. ej. avisos push sin servidor), dilo y da la alternativa real.
- Si dudas del concepto, **pregunta** antes de construir a ciegas.

## 2. Idioma y tono
- **Todo en español** (interfaz, código, comentarios, documentación).
- Tono de la app: cariñoso y con humor de pareja, **sin ser empalagoso** ni infantil.

## 3. Datos (cuidado: son de DOS personas)
- Los datos viven en Firestore y los comparten los dos móviles. **No cambies el significado de un campo**
  sin migración; añadir campos sí es seguro. Modelo en `CONTEXTO.md`.
- Si cambias qué se escribe en `points`, revisa `firestore.rules` (las reglas validan esos campos).
- Dinero en **céntimos** (enteros). Nunca floats.

## 4. Guardar y documentar SIEMPRE
- Tras cambios importantes: `CHANGELOG.md` (nueva versión arriba), estado en `CONTEXTO.md`, ideas en `docs/IDEAS.md`.
- Fechas **absolutas** (2026-09-28), no "hoy".
- Sube la versión también en `package.json` y en `VERSION` de `app/app.js`.

## 5. Cómo probar antes de decir "funciona"
- `node tests/logic.test.mjs` (lógica pura).
- Servir la web: `python -m http.server 5173 --directory app` y abrir `http://localhost:5173`
  en tamaño móvil. **Modo demo** → probar el flujo tocado (con "cambiar de persona" para aprobar).
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
4. Con el run en verde, el APK queda en `releases/latest` como `Xurripoints-vX.Y.Z.apk`.
   Un push que solo toque `**.md`/`docs/**` **no** recompila.

_Si cambias cómo se trabaja, actualiza este documento._
