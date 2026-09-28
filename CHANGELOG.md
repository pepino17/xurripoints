# Changelog

Cambios importantes del proyecto. Formato: versión — fecha — cambios.
La versión de la primera línea `[x.y.z]` es la que usa el APK (GitHub Actions).

## [0.2.0] — 2026-09-28 · Revisión general, gastos fijos y lista para testers

Joan: "revisa la app en general, mejórala" y "un link en GitHub para descargar que siempre baje la última versión".

**Descarga y actualizaciones**
- **Enlace permanente** que siempre baja la última: `…/releases/latest/download/Xurripoints.apk` (cada release
  publica también `Xurripoints.apk` con nombre fijo). Botón **Descargar app** + QR en el README. Repo **público**.
- **Firma estable**: todas las versiones se firman con la misma clave (secreto de GitHub, no está en el código)
  → **se actualiza encima sin desinstalar**. La versión del APK sale del CHANGELOG (versionCode sube siempre).
  ⚠️ Quien tenga la v0.1.0 tiene que desinstalarla **una última vez** (estaba firmada con una clave aleatoria).
- **Aviso de versión nueva** dentro de la app (mira GitHub como mucho cada 6 h) y fila **Versión** en Pareja.
- **Pasar la app a alguien** (Pareja): menú nativo de compartir con el enlace. La invitación de pareja
  incluye ahora el enlace de descarga + el código.

**Mejoras**
- **Gastos fijos** 🔁 (alquiler, luz, Netflix…): interruptor al crear un gasto; se apuntan **solos cada mes**
  el mismo día. Se editan o se dejan de repetir desde Gastos. Nunca se duplican aunque los dos móviles los
  creen a la vez (id fijo por mes).
- **Bienvenida** de 4 tarjetas (5 en demo) la primera vez; reabrible en Pareja → ¿Cómo funciona?
- **Avisos cuando la pareja contesta** a lo que pediste ("ha dicho que sí/no" + su respuesta). Los rechazos
  aparecen también en "Últimos movimientos".
- **"+X esta semana"** en la hucha de cada uno.
- **Confirmaciones con el estilo de la app** (antes salía el aviso gris del sistema).
- Aviso de **sin conexión** (modo Firebase).
- Bordes de pantalla más seguros en Android 15+ (Capacitor 8 SystemBars).
- Al fallar el inicio de sesión ya no se borra la contraseña escrita.

## [0.1.0] — 2026-09-28 · Primera versión

Joan: "una app para parejas donde se contabilizan las cosas: ganas churri points y los cedes a tu pareja
para que te diga *vale, puedes ir*; y dentro, un Splitwise para dividir tareas y gastos (50/50,
proporcional, sugar mami, sugar papi o personalizado)".

- **Xurripoints (la moneda):** saldo de cada uno en Inicio.
  - **Reclamar** una acción del catálogo (fregar +10, cena +15…) → la pareja **aprueba** o dice "no cuela".
  - **Pedir un vale** (salir con amigos −50, siesta −15…) → si la pareja acepta, **los puntos pasan a su hucha**.
    Mientras está pendiente, los puntos quedan apartados.
  - **Premiar** (dar puntos a la pareja al momento) y **regalar** (de tu saldo).
  - Catálogo de acciones y vales **editable** (lápiz en cada tarjeta). Historial con respuestas al rechazar.
- **Tareas:** asignadas a uno, al otro, **libres** o **por turnos** (se alterna al completarla). Se repiten
  (día/semana/mes). Barra de **reparto de la semana** frente a un objetivo (50/50, 60/40…) y botón
  **Repartir las libres de forma justa**. Completar una tarea con puntos crea la reclamación (con Deshacer).
- **Gastos:** quién pagó y cómo se reparte: **50/50, proporcional** (según ingresos del perfil),
  **sugar mami / sugar papi** (paga todo uno) o **a medida** (deslizador). Deuda neta, **Liquidar** y resumen del mes.
- **Pareja:** perfiles (avatar, nombre, sugar mami/papi, ingresos), código de pareja, objetivo de tareas.
- **Sincronización** con Firebase (cuenta con email; se emparejan con un código de 6 letras; funciona sin
  conexión y sube al volver la red). Reglas de seguridad en `firestore.rules`.
- **Modo demo** (sin Firebase): todo en el móvil, con datos de ejemplo y botón para **cambiar de persona**.
- APK compilado en GitHub Actions y publicado en Releases (igual que DopaQuest).
