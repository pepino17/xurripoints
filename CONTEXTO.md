# CONTEXTO — léeme primero (handoff completo)

> Con este documento + `COMO_TRABAJAR.md` + `docs/` deberías poder continuar el proyecto sin la conversación.
> Última actualización: **2026-09-28** (v0.1.0).

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
  repetición, reparto automático), gastos (todos los modos), liquidar, perfiles. 8 pruebas de lógica en verde.
- **Pendiente de Joan:** crear el proyecto Firebase (`docs/FIREBASE.md`) y pasar la config → entonces se
  pega en `app/firebase-config.js`, commit + push y sale el APK con sincronización.
- Repo: `pepino17/xurripoints` (privado). APK en Releases → `Xurripoints-vX.Y.Z.apk`.

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
- `couples/{C}/tasks/{id}` → `{ title, emoji, pts, assignee(uid|null), rotate, repeat:'none'|'daily'|'weekly'|'monthly',
  due, doneAt, doneBy, log:[{by, at}] (últimas 30), createdBy, createdAt }`

**Reglas de datos:** añadir campos es seguro; cambiar el significado de uno existente NO (habría que migrar
los datos de las dos personas). Dinero siempre en **céntimos**.

## Siguientes pasos sugeridos
1. Conectar Firebase (Joan) y probar con los dos móviles.
2. Avisos cuando la pareja pide aprobar algo (ver `docs/IDEAS.md`).
3. Gastos fijos que se repiten.
