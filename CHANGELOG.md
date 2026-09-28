# Changelog

Cambios importantes del proyecto. Formato: versión — fecha — cambios.
La versión de la primera línea `[x.y.z]` es la que usa el APK (GitHub Actions).

## [0.5.0] — 2026-09-28 · Interfaz más limpia, "vuestro reparto" y azar justo

Joan: "que se pueda fijar el reparto de los gastos de una vez (50/50, según ingresos, a medida o sugar mami/papi) y
luego al apuntar cada gasto poder elegir, como en Splitwise. La interfaz es muy cargada: dejarla más limpia sin quitar
funciones." + "revisa los juegos y la cara o cruz, que no haya bugs y que la aleatoriedad esté bien".

**Dinero**
- **⭐ Vuestro reparto**: se elige una vez (Dinero → "Vuestro reparto" o Pareja). Los gastos nuevos salen con él y
  en cada gasto se puede cambiar. Los **gastos fijos** pueden seguirlo: si lo cambiáis, los próximos meses cambian solos.
- **Gasto al estilo Splitwise**: importe grande, "Pagó **tú** y se reparte **⭐ como siempre**" (se toca para cambiar),
  categoría en un botón, y fecha y gasto fijo en **Más opciones**.
- Resumen de Dinero en una sola tarjeta (para cuadrar · vuestro reparto · este mes); gastos fijos plegados.

**Más limpio sin quitar nada**
- Barra de abajo: **Inicio · Tareas · ＋ · Dinero · Juntos**. El **＋** central apunta cualquier cosa (lo he hecho,
  gracias, gasto, favor, tarea, idea, premiar, ahorrar). Fuera los botones flotantes de cada pantalla.
- **Inicio** solo con: vuestros puntos + meta juntos, **Para ti** (gracias, peticiones y tareas de hoy), las cuentas y
  la pregunta del día. **Puntos y vales** se abre desde Inicio y **Pareja** desde arriba (con botón de volver).
- Tareas con la barra de reparto compacta; en los formularios lo secundario va en **Más opciones**.

**Juegos y azar (revisión)**
- **Azar justo**: moneda, dados, ruleta, barajas y "elegir al azar" usan el generador criptográfico del sistema y
  enteros sin sesgo. Prueba estadística (chi-cuadrado) en `tests/logic.test.mjs`.
- 🐞 La moneda siempre enseñaba la misma cara: ahora tiene **dos caras (💗 cara / ✚ cruz)** y la leyenda dice de quién
  es cada una en "¿A quién le toca?".
- 🐞 Tocar varias veces la moneda o los dados lanzaba varias tiradas a la vez → ahora una cada vez.
- 🐞 La ruleta se podía volver a girar o editar mientras giraba (y el resultado podía no cuadrar con la flecha) → bloqueada
  hasta que para. La ruleta de ideas ya no se pisa si se abre dos veces.
- Quién empieza la primera partida se sortea (antes siempre la misma persona); luego se alterna. "1 empate" en singular.

## [0.4.0] — 2026-09-28 · Ahorro juntos, decidir con la suerte y juegos para dos

Joan: "pon parte de ahorro; decidir cosas con ruleta, dados, cara o cruz; y juegos para dos simples para cuando
estés aburrido con ella".

- **🐷 Ahorro** (Gastos → Ahorro): **huchas** con objetivo opcional (viaje, sofá, imprevistos…). Añadir o sacar
  dinero indicando quién pone (**yo, mi pareja o los dos a medias**), con nota. Total ahorrado entre los dos,
  barra de progreso y celebración al llenarla. Sin comparar quién pone más.
- La pestaña **Planes** pasa a llamarse **Juntos**, con tres apartados:
  - **💡 Ideas**: lo de antes (pelis, planes, comida con votos y match).
  - **🎲 Decidir**: **cara o cruz** (o "¿a quién le toca?"), **dados** (1 o 2) y **ruleta** que gira de verdad, con
    atajos: ¿quién?, ¿qué cenamos?, ¿qué vemos?, ¿qué hacemos? (usa vuestras ideas) o sí/no.
  - **🎮 Jugar** (en el mismo móvil): **tres en raya**, **conecta 4**, **piedra, papel o tijera** (elección secreta
    pasándose el móvil), **esto o aquello** (¿coincidís?) y **¿quién es más probable…?**. Marcador de la partida.
- En Gastos, "Le debes…" pasa a "Para cuadrar: tú → Churri · sin prisa" (como en Inicio).

## [0.3.0] — 2026-09-28 · Revisión psicológica: que sume, no que lleve la cuenta

Joan: "estudia la app como profesional de psicología de pareja: debe ayudar a convivir y hacer las cosas fáciles,
no volverse una herramienta tóxica de cuantificación. Y que aporte más: elegir planes, pelis…".
Informe completo con fuentes en **`docs/PSICOLOGIA.md`**.

**Ajustes para que no sea tóxica**
- **Vales = favores, no permisos.** Fuera "salir con amigos", "videojuegos", "partido", "compras". Nuevos:
  "Me libras de una tarea", "Tarde libre de tareas (tú te encargas)", "Me cocinas mi plato favorito"…
- **Los mimos no se cobran.** El catálogo que da puntos es solo tareas y carga mental (gestiones, citas, planes
  familiares). Masajes y detalles pasan a **Gracias**.
- **Confianza por defecto:** lo que apuntas cuenta solo en 24 h si tu pareja no contesta. "Aprobar" → **"¡Gracias! 💛"**.
- **Sin competición:** fuera el "+X esta semana" de cada uno; ahora **Meta juntos** (una escapada, una cena…)
  que se llena con los puntos de los dos, con celebración y metas conseguidas guardadas.
- **Rechazos con cariño:** "No cuela" → "Lo hablamos"; mensajes rápidos amables.
- **Dinero sin reproche:** "Le debes…" → "Para cuadrar: tú → Churri 24 € · sin prisa".
- Nueva hoja **"Para que la app sume"** (7 consejos) y nueva bienvenida (6 tarjetas).

**Más allá de los puntos**
- **💛 Gracias** (sin puntos) + **tarro de gracias**; aviso cuando te llegan.
- **🍿 Planes** (nueva pestaña): pelis, planes y comida; votáis 👍/👎, la app enseña las **coincidencias** (match),
  **vota de una en una** o **elige al azar**. El voto de la pareja se ve después de votar tú. **Recuerdos** 📸 de lo hecho.
- **💬 Pregunta del día** para hablar en persona (la misma en los dos móviles).
- Pareja se abre desde los avatares de arriba (⚙️).

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
