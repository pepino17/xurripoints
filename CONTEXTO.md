# CONTEXTO — léeme primero (handoff completo)

> Con este documento + `COMO_TRABAJAR.md` + `docs/` deberías poder continuar el proyecto sin la conversación.
> Última actualización: **2026-09-28** (v0.5.0).

## Qué es
**Xurripoints**: app Android para parejas. Tiene una moneda propia (los *xurripoints*) que se gana cuidando
de la pareja/casa y se gasta en **vales** (salir con amigos, siesta…). Además incluye un "Splitwise" de pareja
para **tareas** y **gastos** con varios modos de reparto (50/50, proporcional, sugar mami, sugar papi, a medida).

## Decisiones tomadas con Joan (2026-09-28)
- **Dos móviles sincronizados con Firebase** (no un solo móvil). Cuenta con email + contraseña; se emparejan con
  un **código de 6 caracteres**. Mientras no haya config de Firebase, la app arranca en **modo demo**.
- **Catálogo + aprobación:** reclamar una acción o pedir un vale necesita que la pareja lo apruebe.
  Premiar y regalar son al momento.
- Al canjear un vale, los puntos **pasan a la pareja** (economía cerrada: "le cedo mis puntos para que me diga vale").
- Nombre visible: **Xurripoints**. Estilo **tierno pastel** (crema, rosa, lila, mantequilla).

## Estado
- v0.1.0 hecha y verificada en navegador (modo demo): puntos, vales, aprobar/rechazar, tareas (turnos,
  repetición, reparto automático), gastos (todos los modos), liquidar, perfiles.
- v0.2.0 (revisión): gastos fijos, bienvenida, avisos de respuesta, aviso de versión nueva, compartir la app,
  confirmaciones propias, firma estable. 11 pruebas de lógica en verde. Verificado en navegador.
- v0.3.0 (revisión psicológica, `docs/PSICOLOGIA.md`): vales = favores (no permisos), mimos sin precio (→ Gracias),
  confianza por defecto (cuenta sola en 24 h), Meta juntos, Planes (ideas + votos + match + azar), pregunta del día,
  lenguaje sin reproche. **Las 8 reglas de diseño de `docs/PSICOLOGIA.md` son obligatorias.**
- v0.4.0: **Ahorro** (huchas en Gastos) y pestaña **Juntos** = Ideas · Decidir (moneda, dados, ruleta) · Jugar
  (tres en raya, conecta 4, piedra-papel-tijera, esto o aquello, ¿quién es más probable?). Juegos en el mismo móvil,
  sin guardar nada en la nube. Textos de los juegos en `app/content.js`. 16 pruebas de lógica.
- v0.5.0: interfaz limpia (barra Inicio · Tareas · ＋ · Dinero · Juntos; Puntos y vales desde Inicio; Pareja arriba),
  **vuestro reparto** por defecto (`couple.settings.split`), gasto estilo Splitwise, azar criptográfico (`L.rand`,
  `L.randInt`) y arreglos en moneda/dados/ruleta/juegos. 17 pruebas.
- **Descarga (siempre la última):** https://github.com/pepino17/xurripoints/releases/latest/download/Xurripoints.apk
  (botón + QR en el README). Repo **público** desde 2026-09-28 para que los testers puedan descargar.
- **Pendiente de Joan:** crear el proyecto Firebase (`docs/FIREBASE.md`) y pasar la config → entonces se
  pega en `app/firebase-config.js`, commit + push y sale el APK con sincronización.
- Repo: `pepino17/xurripoints` (público). Cada release publica `Xurripoints-vX.Y.Z.apk` y `Xurripoints.apk` (nombre fijo).

## Arquitectura
```
app/                  ← la web que empaqueta Capacitor (sin bundler, ES modules)
  index.html          carcasa + scripts
  app.js              interfaz: pantallas, hojas (bottom sheets), acciones data-act → ACT
  logic.js            lógica pura (saldos, repartos, tareas). Probada en tests/logic.test.mjs
  store.js            datos: FirebaseBackend y DemoBackend con la MISMA interfaz
  firebase-config.js  config de la web app de Firebase (no es secreta)
  native.js           Capacitor: barra de estado + botón atrás
  vendor/firebase.js  SDK de Firebase empaquetado con esbuild (npm run build ← src/firebase.js)
  vendor/lucide.min.js iconos
  fonts/ fonts.css    Fraunces (títulos y números) + Lexend (texto), locales
android/              proyecto nativo de Capacitor 8 (se versiona)
assets/               imágenes fuente de icono/splash (scripts/make-assets.mjs + npx capacitor-assets generate --android)
firestore.rules       reglas de seguridad (pegar en la consola de Firebase)
.github/workflows/android.yml  compila el APK y lo publica en Releases
```

## Modelo de datos (Firestore)
- `users/{uid}` → `{ couple: CODIGO }`
- `couples/{CODIGO}` → `{ code, members:[uidA, uidB], profiles:{uid:{name, emoji, sugar:'mami'|'papi', income(céntimos/mes)}},
  catalog:{ earn:[{id,emoji,title,pts}], spend:[…] }, settings:{ taskPctA }, createdAt, updatedAt }`
  - "A" = `members[0]` (quien creó la pareja, color rosa); "B" = `members[1]` (lila).
- `couples/{C}/points/{id}` → `{ type:'claim'|'redeem'|'reward'|'gift', from, to, amount, title, emoji, note,
  status:'pending'|'approved'|'rejected'|'cancelled', createdBy, createdAt, resolvedAt, resolvedBy, reply, taskId }`
  - Saldo = Σ aprobados (`to` suma, `from` resta). `from:null` = puntos nuevos (reclamar/premiar).
- `couples/{C}/expenses/{id}` → `{ kind:'expense'|'settle', title, category, amount(céntimos), paidBy, mode,
  sugar, shares:{uid:céntimos}, date:'YYYY-MM-DD', createdBy, createdAt }`
  - Las `shares` se congelan al guardar (si cambian los ingresos, los gastos viejos no cambian).
  - Liquidación: `paidBy` = quien paga, `shares = { quien cobra: importe }`.
- `couples/{C}/recurring/{id}` (gastos fijos) → `{ title, category, amount, paidBy, mode, sugar, customPctA, day(1-28),
  startMonth:'YYYY-MM', lastMonth }`. Cada mes se crea `expenses/rec_<id>_<YYYY-MM>` (id fijo → sin duplicados)
  con `recurringId`. Lo hace `runRecurring()` al recibir datos.
- `couples/{C}/ideas/{id}` (Planes) → `{ list:'pelis'|'planes'|'comida', title, note, votes:{uid: 1|-1|0}, createdBy, createdAt, doneAt }`.
- `couples/{C}/thanks/{id}` (Gracias, sin puntos) → `{ from, to, text, emoji, createdAt, seenAt, reaction }`.
- En `couples/{C}`: `goal: { title, emoji, target, since }` (Meta juntos: suma los puntos NUEVOS aprobados de los dos desde `since`)
  y `goalsDone: [ {title, emoji, target, doneAt} ]`.
- Reclamaciones (`claim`) pendientes con más de 24 h cuentan como aprobadas (`L.effStatus`); en la base siguen `pending`.
- En `couples/{C}.settings.split` → `{ mode:'equal'|'proportional'|'sugar'|'custom', sugar, customPctA }` = "⭐ vuestro reparto".
  Un gasto fijo con `mode:'default'` usa ese reparto al apuntarse cada mes. Los gastos normales guardan el reparto ya resuelto.
- `couples/{C}/jars/{id}` (huchas) → `{ title, emoji, target(céntimos, 0 = sin objetivo), createdBy, createdAt }`.
- `couples/{C}/saves/{id}` (movimientos de hucha) → `{ jar, by, amount(céntimos, negativo = sacar), note, date, createdAt }`.
- `couples/{C}/tasks/{id}` → `{ title, emoji, pts, assignee(uid|null), rotate, repeat:'none'|'daily'|'weekly'|'monthly',
  due, doneAt, doneBy, log:[{by, at}] (últimas 30), createdBy, createdAt }`

**Reglas de datos:** añadir campos es seguro; cambiar el significado de uno existente NO (habría que migrar
los datos de las dos personas). Dinero siempre en **céntimos**.

## Firma del APK (actualizar sin desinstalar)
- Clave PKCS12 fija, **fuera de git** (el repo es público): secretos de GitHub `ANDROID_KEYSTORE_B64` y
  `ANDROID_KEYSTORE_PASS`; el workflow la escribe en `android/app/xurripoints.p12` y `build.gradle` firma con ella.
- Copia local (ignorada): `android/app/xurripoints.p12` + `xurripoints.p12.pass`. **No borrarla**: si se pierde
  la clave, todos tendrán que desinstalar una vez. Generada con Python `cryptography` (no hay JDK en el PC).
- versionCode = mayor·10000 + menor·100 + parche, sacado del CHANGELOG (como DopaQuest).

## Siguientes pasos sugeridos
1. Conectar Firebase (Joan) y probar con los dos móviles.
2. Avisos push cuando la pareja pide aprobar algo (ver `docs/IDEAS.md`).
3. Recordatorios locales de las tareas del día.
