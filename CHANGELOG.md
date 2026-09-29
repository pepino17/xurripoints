# Changelog

Cambios importantes del proyecto. Formato: versión — fecha — cambios.
La versión de la primera línea `[x.y.z]` es la que usa el APK (GitHub Actions).
**La versión tiene que ser la misma aquí, en `package.json` y en `VERSION` de `app/app.js`** (la prueba
`node tests/logic.test.mjs` falla si no, y entonces el APK no se publica).

## [0.8.0] — 2026-09-29 · Lista para vender: Xurripoints Plus, web legal y Google Play

Joan: "¿cómo monetizarías la app?" → "okey, optimiza la app para poder comercializarla de la forma más óptima".
Decidido con Joan: **solo español** de momento y **web pública en GitHub Pages** (privacidad, condiciones, borrar cuenta).
Plan completo en `docs/MONETIZACION.md`; pasos para publicar en `docs/PLAY_STORE.md`.

**Xurripoints Plus (freemium, un plan para los dos)**
- Hoja **Plus** (Pareja → ✨ Xurripoints Plus, o al tocar algo de Plus): qué trae, precios y **prueba gratis de 14 días
  para los dos**, sin tarjeta; al acabar vuelve sola a gratis. Tu pareja ve un aviso cuando la activas.
- **Todo lo que ya había sigue gratis.** Plus solo trae cosas nuevas:
  - 📊 **Resumen del mes** (Dinero → Este mes): total, comparado con el mes anterior, gastos fijos y barras por categoría.
  - 📤 **Gastos a Excel** (CSV con «;» y coma decimal, se abre bien en Excel/Sheets; protegido contra fórmulas coladas).
  - 🗓️ **Revisión semanal**: 5 pasos para hacer juntos (la semana entre los dos, unas gracias, ¿os parece justo?,
    qué necesitáis, un plan). Se sugiere de viernes a domingo en Inicio y está en Juntos → Jugar.
  - 💬 **Preguntas para conoceros**: 4 packs (Conoceros más, Sueños y futuro, Recuerdos, Para reír). Desde Juntos → Jugar
    o «Más preguntas ✨» en la pregunta del día.
  - 🎴 **Más cartas** en «Esto o aquello» y «¿Quién es más probable…?».
  - 🎨 **Colores de la app**: Menta, Cielo, Lavanda y Melocotón (solo fondo y tarjetas; rosa y lila siguen siendo cada uno).
- El pago de verdad aún **no está conectado** (hace falta la cuenta de Google Play Console): cuando acaba la prueba sale
  "Hacerse Plus · muy pronto". Las **reglas** ya lo dejan preparado: la app solo puede empezar la prueba (una vez, máx. 15 días);
  el plan de pago solo lo puede poner el servidor.
- Nada de presionar: Plus solo aparece en Pareja o cuando tocas algo de Plus; nunca ventanas que saltan solas ni anuncios.

**Para publicar en Google Play**
- El build genera también el **`.aab`** firmado (`Xurripoints-vX.Y.Z-GooglePlay.aab` en la release) para subirlo a Play Console.
  Sale con el canal **`'play'`** (`app/channel.js`): esa copia **no avisa de APKs nuevos** (Google no deja que una app se
  actualice fuera de Play). El APK de GitHub sigue avisando como siempre.
- **Web pública** (`docs/` en GitHub Pages): portada, **política de privacidad**, **condiciones** y **cómo borrar la cuenta**
  (Google lo exige). Al crear la cuenta se enlazan las condiciones y la privacidad; en Pareja → App, «Privacidad y condiciones».
- **Descargar una copia** de todos vuestros datos (JSON), **gratis siempre** (Pareja → Cuenta): derecho a la portabilidad.
- «Recomendar a otra pareja» y el código de invitación comparten la **web** en vez del APK (cuando salga en Play, solo cambia la web).
- Nuevo plugin `@capacitor/filesystem` para guardar/compartir archivos (Excel y copia) en Android.
- Pruebas: 26 de lógica (Plus, resumen del mes, CSV, revisión semanal, canal) y 3 nuevas de reglas (Plus).

## [0.7.0] — 2026-09-29 · Más fácil, más justa y más segura (análisis como usuario, desarrollador y psicólogo)

Joan: "hazlo todo" (el análisis de 2026-09-29) + "es como complicado de usar, está muy cargado, pero no quiero que
quites funciones" + "mejora el tutorial".

**Más fácil sin quitar nada**
- **＋ más simple:** 4 opciones grandes (ya lo he hecho, gracias, gasto, nueva tarea) y el resto en **Más**, en filas pequeñas.
- **Inicio sin marcador:** arriba manda la **meta juntos**; de puntos solo sale "tienes X para pedir favores".
- **Decidir** ya no es una pantalla kilométrica: moneda, dados y ruleta son tarjetas que se abren en su hoja.
- **Pareja ordenada** en bloques: Vosotros · Lo que acordáis · Ayuda · App · Cuenta.
- Palabras que no se pisan: "Premiar" → **"Lo ha hecho [pareja]"**; "hucha" ya solo es dinero (los puntos "pasan a" la otra persona).
- **Letra más grande** (nada por debajo de ~13 px), sin textos en MAYÚSCULAS espaciadas y **gris con más contraste** (5:1).
- 🐞 Los desplegables (p. ej. "Gastos fijos") ya **no se cierran solos** cada minuto o al llegar datos.
- 🐞 Lo que escribes en la pantalla de espera (código) ya no se borra si llega un cambio.
- Primera pantalla sin jerga ("falta la configuración de Firebase" → "versión de prueba").

**Tutorial nuevo**
- **Bienvenida en 5 pasos con dibujitos** de la app (se vuelve a ver una vez al actualizar).
- **Primeros pasos** en Inicio: 5-6 tareas cortas (tareas, reparto, un gasto, unas gracias, vales, recordatorio) que
  **se marcan solas** al hacerlas. Se ocultan y se recuperan en Pareja → Ayuda.
- **Ayuda en cada pantalla:** la primera vez sale una tarjeta que explica la pestaña; luego, con el botón **?** del título.

**Psicología (docs/PSICOLOGIA.md)**
- **Propuestas:** lo que afecta a los dos (reparto de gastos, reparto de tareas, precios de acciones y vales, volver a
  activar los puntos) ya no se cambia a solas: **uno propone y el otro dice "Vale" o "Lo hablamos"**.
- **Nada cambia a escondidas:** si tu pareja borra o cambia un gasto, un gasto fijo, una tarea o una hucha, saca
  dinero, cambia sus ingresos o pausa los puntos, te sale en **Para ti** con **Recuperar/Deshacer**, y queda en el
  **historial de cambios** (Pareja).
- **Modo sin puntos:** los puntos, vales y meta se pueden **pausar** (cualquiera, al momento); volver a activarlos es una propuesta.
- **Salir de la pareja** (y **borrar la cuenta**): quien se queda conserva lo común (sin tus ingresos) y nadie más puede
  unirse. Si sale el último, se borra todo.
- Frases arregladas: fuera "ganad puntos **cuidándoos**", "tarea **o favor** suma puntos", "me ha hecho reír" como
  ejemplo de premio, "noche de chicas/chicos" como ejemplo de vale y el vale **"Deseo libre"**. Emojis del catálogo sin
  masajes, flores, cañas, fútbol ni compras. Al crear un vale se explica: favor concreto, nunca permisos.
- La barra de tareas ahora es una pregunta: **"¿Os parece justo el reparto?"**.

**Técnica y seguridad**
- 🐞 **v0.6.0 se publicó como v0.5.0** (el CHANGELOG no tenía la entrada): nueva prueba que exige la misma versión en
  CHANGELOG, `package.json` y `app.js`.
- **APK firmado de release** (antes de depuración) con la misma clave → se instala encima.
- Reglas de Firestore: validan tipos en gastos, tareas, huchas…; nuevas colecciones `proposals` y `log`; salir de la
  pareja; borrar todo siendo el último; nadie se une a una pareja cerrada. ⚠️ Hay que **volver a pegar `firestore.rules`** en Firebase.
- **Pruebas con los emuladores de Firebase** en GitHub Actions (`rules.yml`): 26 de reglas (`tests/rules.test.mjs`) y
  una de `app/store.js` de punta a punta (`tests/store.test.mjs`: cuentas, crear pareja, unirse, salir, borrar cuenta).
- 🐞 Unirse a una pareja completa decía "Sin permiso. ¿Están publicadas las reglas?" → ahora "Esa pareja ya está
  completa o ya no está activa."
- Números de la base de datos siempre como número al pintarlos, ids raros filtrados: la pareja no puede colar HTML.
- **De la demo a la cuenta real:** al salir de la demo puedes llevarte tareas, ideas, vales y huchas.
- La demo trae una **propuesta de ejemplo** de Churri para ver cómo funciona.

## [0.6.0] — 2026-09-28 · Revisión a fondo: 7 fallos del uso real y recordatorio diario

(Entrada añadida en 0.7.0: se publicó sin ella y el APK salió como 0.5.0.)
- Pantalla de espera: unirse a la pareja del otro si los dos creasteis una.
- Sin conexión al arrancar: pantalla de reintentar en vez de mandar a crear pareja.
- Firebase ya no se inicia dos veces al entrar y salir de la demo.
- Reabrir una tarea anula su petición de puntos pendiente; huchas sin saldo negativo; nombre obligatorio al
  emparejar; las hojas ya no se cierran solas al abrir otra rápido.
- **Recordatorio diario** opcional con notificaciones locales (tareas del día y lo que espera respuesta).
- "¿Empezáis con las típicas?" para crear 7 tareas de golpe.

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
