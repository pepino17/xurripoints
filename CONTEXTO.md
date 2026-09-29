# CONTEXTO — léeme primero (handoff completo)

> Con este documento + `COMO_TRABAJAR.md` + `docs/` deberías poder continuar el proyecto sin la conversación.
> Última actualización: **2026-09-29** (v0.8.0).

## Qué es
**Xurripoints**: app Android para parejas para **organizarse en equipo sin llevar la cuenta**: tareas, gastos
compartidos (un "Splitwise" de pareja con 50/50, según ingresos, sugar mami/papi o a medida), ahorro, planes,
juegos y **gracias**. Tiene además una moneda propia (los *xurripoints*) que se gana con **tareas de casa** y se
gasta en **vales = favores** (nunca permisos). Los puntos se pueden pausar.

## Decisiones tomadas con Joan
- (2026-09-28) **Dos móviles sincronizados con Firebase**. Cuenta con email + contraseña; se emparejan con un
  **código de 6 caracteres**. Mientras no haya config de Firebase, la app arranca en **modo demo** ("versión de prueba").
- (2026-09-28) Reclamar una tarea cuenta sola en 24 h si la pareja no contesta (confianza por defecto); pedir un
  vale necesita respuesta. Al aceptar un vale, los puntos **pasan a la pareja**.
- (2026-09-28) Estilo **tierno pastel** (crema, rosa, lila, mantequilla). Las 8 reglas de `docs/PSICOLOGIA.md` son obligatorias.
- (2026-09-29) **"No quitar funciones, pero que sea fácil"**: lo secundario va plegado, en "Más" o en hojas.
- (2026-09-29) **Lo común se propone**: reparto de gastos, reparto de tareas, precios del catálogo y volver a
  activar los puntos cambian solo cuando la pareja acepta. Borrar/cambiar cosas de dinero y tareas se avisa y se puede deshacer.
- (2026-09-29) **Monetización = freemium "Xurripoints Plus"**, un plan **por pareja**, con **prueba gratis de 14 días**.
  Lo que ya era gratis sigue gratis; sin anuncios; los xurripoints no se venden. **Solo español** de momento.
  **Web pública en GitHub Pages** (`docs/`). Todo en `docs/MONETIZACION.md` y `docs/PLAY_STORE.md`.

## Estado
- v0.1–v0.6 (2026-09-28): puntos, vales, tareas, gastos, gastos fijos, ahorro, Juntos (ideas, decidir, jugar),
  revisión psicológica, recordatorio diario. Detalle en `CHANGELOG.md`.
- **v0.7.0 (2026-09-29)**: análisis como usuario, desarrollador y psicólogo aplicado entero:
  - Más fácil: ＋ con 4 grandes + "Más"; Inicio sin marcador (manda la meta juntos); Decidir en tarjetas; Pareja en bloques;
    letra mínima ~13 px y gris con contraste 5:1; desplegables que no se cierran solos.
  - Tutorial: bienvenida en 5 pasos con dibujitos (`xp_welcome_v2`), **Primeros pasos** en Inicio (`L.firstSteps`) y
    **ayuda por pantalla** (tarjeta la 1.ª vez + botón ?).
  - Psicología: **propuestas**, **avisos de cambios** con recuperar/deshacer e historial, **modo sin puntos**,
    **salir de la pareja** y **borrar cuenta**, frases arregladas (fuera "Deseo libre", "noche de chicas/chicos"…).
  - Técnica: prueba de versión (CHANGELOG = package.json = app.js), el build falla si la versión ya está publicada,
    **APK release** firmado, reglas con validación de tipos + **pruebas de reglas en CI** (emulador), ids y números seguros.
  - 22 pruebas de lógica + pruebas de reglas (`tests/rules.test.mjs`, en GitHub Actions). Verificado en navegador (demo).
- **v0.8.0 (2026-09-29)**: lista para vender.
  - **Plus**: hoja en Pareja, prueba de 14 días (la escribe la app; el plan de pago, solo el servidor), resumen del mes,
    gastos a Excel, revisión semanal, packs de preguntas, más cartas y colores. El **cobro real aún no está** (falta Play Console).
  - **Google Play**: `.aab` firmado en cada release (canal `'play'`, sin avisos de APK), web con **privacidad, condiciones
    y borrar cuenta**, enlaces legales en la app, **descargar una copia** (JSON, gratis).
  - 26 pruebas de lógica + pruebas de reglas de Plus. Verificado en navegador (demo).
- **Descarga (siempre la última):** https://github.com/pepino17/xurripoints/releases/latest/download/Xurripoints.apk
  (botón + QR en el README). Repo **público** para que los testers puedan descargar.
- **Web:** https://pepino17.github.io/xurripoints/ (GitHub Pages desde `docs/`, sin Jekyll: `.nojekyll`).
- **Pendiente de Joan:** crear el proyecto Firebase (`docs/FIREBASE.md`, región **Madrid**), pegar **las reglas nuevas** y pasar la
  config → se pega en `app/firebase-config.js`, commit + push y sale el APK con sincronización.
  Para vender: **email de contacto** (hoy la web manda a GitHub Issues) y **Play Console** (`docs/PLAY_STORE.md`).
  Hasta entonces, salir de la pareja / borrar cuenta / propuestas en la nube solo están probados con la demo y con
  el emulador de reglas (no con un Firebase real).
- Repo: `pepino17/xurripoints` (público). Cada release publica `Xurripoints-vX.Y.Z.apk` y `Xurripoints.apk` (nombre fijo).

## Arquitectura
```
app/                  ← la web que empaqueta Capacitor (sin bundler, ES modules)
  index.html          carcasa + scripts
  app.js              interfaz: pantallas, hojas (bottom sheets), acciones data-act → ACT
  logic.js            lógica pura (saldos, repartos, tareas, propuestas, primeros pasos…). Probada en tests/logic.test.mjs
  store.js            datos: FirebaseBackend y DemoBackend con la MISMA interfaz (incl. leaveCouple/deleteAccount)
  content.js          textos de los juegos (+ cartas y packs de preguntas de Plus)
  channel.js          'github' (APK) o 'play' (lo pone Actions para el .aab; en git siempre 'github', lo comprueba la prueba)
  firebase-config.js  config de la web app de Firebase (no es secreta)
  native.js           Capacitor: barra de estado, botón atrás y notificaciones locales
  vendor/firebase.js  SDK de Firebase empaquetado con esbuild (npm run build ← src/firebase.js)
  vendor/lucide.min.js iconos (lucide 0.544)
  fonts/ fonts.css    Fraunces (títulos y números) + Lexend (texto), locales
android/              proyecto nativo de Capacitor 8 (se versiona)
assets/               imágenes fuente de icono/splash (scripts/make-assets.mjs + npx capacitor-assets generate --android)
docs/                 documentación + WEB PÚBLICA (index, privacidad, condiciones, borrar-cuenta .html; estilos en docs/web/)
firestore.rules       reglas de seguridad (pegar en la consola de Firebase)
tests/logic.test.mjs  pruebas de la lógica + versión igual en los 3 sitios
tests/rules.test.mjs  pruebas de las reglas (emulador; corre en .github/workflows/rules.yml)
.github/workflows/android.yml  compila el APK (release firmado) y lo publica en Releases
```

## Pantallas (v0.7)
- Barra: **Inicio · Tareas · ＋ · Dinero · Juntos**. **Pareja** desde los avatares de arriba. **Puntos y vales** desde Inicio.
- **Inicio**: meta juntos + "tienes X para pedir favores" · Primeros pasos · **Para ti** (propuestas, gracias, cambios,
  peticiones, tareas de hoy) · para cuadrar · pregunta del día.
- **＋**: grandes = ya lo he hecho, gracias, gasto, nueva tarea (sin puntos: gracias, gasto, tarea, idea); "Más" = pedir
  un favor, lo ha hecho [pareja], idea, ahorrar.
- **Pareja**: tarjeta ✨ Plus · Vosotros · Lo que acordáis (propuestas, repartos, catálogo, meta, puntos sí/no, historial) · Ayuda ·
  App (recordatorio, colores, recomendar, privacidad, versión) · Cuenta (descargar una copia, salir, borrar).
- **Plus** (v0.8) se enseña con `needPlus('clave')`: Dinero → Este mes (resumen + Excel) · Juntos → Jugar (preguntas, revisión)
  · «Más preguntas ✨» · revisión de vie a dom en Inicio · colores en Pareja.

## Modelo de datos (Firestore)
- `users/{uid}` → `{ couple: CODIGO | null }`
- `couples/{CODIGO}` → `{ code, members:[uidA, uidB], profiles:{uid:{name, emoji, sugar:'mami'|'papi', income(céntimos/mes), left?}},
  catalog:{ earn:[{id,emoji,title,pts}], spend:[…] }, settings:{ taskPctA, split, noPoints }, goal, goalsDone,
  formerMembers?, closedAt?, createdAt, updatedAt }`
  - "A" = `members[0]` (quien creó la pareja, color rosa); "B" = `members[1]` (lila).
  - **Salir** (v0.7): `members` sin mí, `formerMembers:[…, yo]`, `closedAt`, mi perfil = `{name, emoji, left:true}` (sin ingresos).
    Pareja cerrada → nadie se une; quien se queda ve la pantalla `alone` y puede borrarlo todo.
  - `settings.noPoints: true` = puntos en pausa (se oculta todo lo de puntos; los datos no se borran).
  - **`plus`** (v0.8) = `{ tier:'trial'|'plus', source:'trial'|'play'|'promo', since, until (ms | null = para siempre), by }`.
    La app solo escribe la prueba (`L.trialDoc`, una vez); el plan de pago lo escribe el servidor. Se lee con `L.plusState`.
- `couples/{C}/points/{id}` → `{ type:'claim'|'redeem'|'reward'|'gift', from, to, amount, title, emoji, note,
  status:'pending'|'approved'|'rejected'|'cancelled', createdBy, createdAt, resolvedAt, resolvedBy, reply, taskId }`
  - Saldo = Σ aprobados (`to` suma, `from` resta). `from:null` = puntos nuevos. `reward` = "lo ha hecho [pareja]" (antes "premiar").
- `couples/{C}/expenses/{id}` → `{ kind:'expense'|'settle', title, category, amount(céntimos), paidBy, mode,
  sugar, shares:{uid:céntimos}, date:'YYYY-MM-DD', createdBy, createdAt }`
  - Las `shares` se congelan al guardar. Liquidación: `paidBy` = quien paga, `shares = { quien cobra: importe }`.
- `couples/{C}/recurring/{id}` (gastos fijos) → `{ title, category, amount, paidBy, mode, sugar, customPctA, day(1-28),
  startMonth:'YYYY-MM', lastMonth }`. Cada mes se crea `expenses/rec_<id>_<YYYY-MM>` (id fijo → sin duplicados).
- `couples/{C}/ideas/{id}` → `{ list:'pelis'|'planes'|'comida', title, note, votes:{uid: 1|-1|0}, createdBy, createdAt, doneAt }`.
- `couples/{C}/thanks/{id}` → `{ from, to, text, emoji, createdAt, seenAt, reaction }`.
- `couples/{C}/jars/{id}` → `{ title, emoji, target }` · `couples/{C}/saves/{id}` → `{ jar, by, amount(± céntimos), note, date, createdAt }`.
- `couples/{C}/tasks/{id}` → `{ title, emoji, pts, assignee(uid|null), rotate, repeat, due, doneAt, doneBy, log:[{by, at}] (≤30), createdBy, createdAt }`
- **`couples/{C}/proposals/{id}`** (v0.7) → `{ kind:'split'|'taskPct'|'catalog'|'points-on', value, text, by, createdAt,
  status:'pending'|'accepted'|'rejected'|'cancelled', resolvedAt, resolvedBy }`. Lo aplica el móvil de **quien acepta**
  (`applyProposal`). Catálogo: `value = {op:'upsert'|'delete', kind:'earn'|'spend', item}` (`L.applyCatalogOp`).
- **`couples/{C}/log/{id}`** (v0.7, avisos de cambios) → `{ kind, text, data:{col, id, label, doc, extra?}|null, by, createdAt, seenAt, restoredAt }`.
  `kind`: exp-del, exp-edit, rec-edit, rec-del, task-del, jar-del, save-out, income, points-off, goal, restore.
  Con `data`, la pareja puede **Recuperar** (borrados, `…-del`) o **Deshacer** (ediciones): se reescribe `doc` en `col/id`.
- Reclamaciones (`claim`) pendientes con más de 24 h cuentan como aprobadas (`L.effStatus`); en la base siguen `pending`.

**Reglas de datos:** añadir campos es seguro; cambiar el significado de uno existente NO (habría que migrar
los datos de las dos personas). Dinero siempre en **céntimos** (enteros: las reglas lo exigen). Ids de documentos
solo `[A-Za-z0-9_-]` (las reglas y `store.js` lo exigen).

## localStorage (por móvil)
`xp_mode` (demo) · `xp_code_<uid>` · `xp_welcome_v2` · `xp_steps_off` · `xp_saw_vales` · `xp_hint_<pantalla>` ·
`xp_theme` (colores, Plus) · `xp_review_at` (última revisión semanal) ·
`xp_notify` (hora) · `xp_upd_at`/`xp_upd_v` · `xurripoints_demo_v1` (demo) · `xurripoints_demo_stash` (lo que se lleva de la demo).

## Firma del APK (actualizar sin desinstalar)
- Clave PKCS12 fija, **fuera de git** (el repo es público): secretos de GitHub `ANDROID_KEYSTORE_B64` y
  `ANDROID_KEYSTORE_PASS`; el workflow la escribe en `android/app/xurripoints.p12` y `build.gradle` firma con ella.
- Desde v0.7 se publica el **release** (`assembleRelease`) firmado con esa misma clave → se instala encima de las anteriores.
  Sin los secretos, el workflow hace un debug (con aviso).
- Copia local (ignorada): `android/app/xurripoints.p12` + `xurripoints.p12.pass`. **No borrarla** (y guárdala también
  en un gestor de contraseñas): si se pierde la clave, todos tendrán que desinstalar una vez. No hay JDK en el PC.
- versionCode = mayor·10000 + menor·100 + parche, sacado del CHANGELOG. El build **falla** si esa versión ya está publicada.

## Siguientes pasos sugeridos
1. Conectar Firebase (Joan, región Madrid), pegar las reglas nuevas y probar con los dos móviles (salir de la pareja y borrar cuenta incluidos).
2. Email de contacto en la web + Play Console + prueba cerrada (12 testers × 14 días): `docs/PLAY_STORE.md`.
3. Cobro real de Plus (RevenueCat + Cloud Function que escribe `couples/{C}.plus`): `docs/MONETIZACION.md`.
4. Avisos push cuando la pareja propone o pide algo (FCM + Cloud Function, plan Blaze) → función estrella de Plus.
