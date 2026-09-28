# Changelog

Cambios importantes del proyecto. Formato: versión — fecha — cambios.
La versión de la primera línea `[x.y.z]` es la que usa el APK (GitHub Actions).

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
