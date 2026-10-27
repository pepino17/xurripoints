# Changelog

Cambios importantes del proyecto. Formato: versión — fecha — cambios.
La versión de la primera línea `[x.y.z]` es la que usa el APK (GitHub Actions).
**La versión tiene que ser la misma aquí, en `package.json` y en `VERSION` de `app/app.js`** (la prueba
`node tests/logic.test.mjs` falla si no, y entonces el APK no se publica).

## [0.13.0] — 2026-10-27 · Lista de la compra, Google Calendar y los puntos de cada uno en Inicio

Lo que pidió Joan el 2026-10-21 (menos enlazar las cuentas, que ya existe y solo falta conectar Firebase):

- 🛒 **Lista de la compra compartida**: Tareas → **📋 Lista · 🗓️ Calendario · 🛒 Compra**. Un campo para apuntar
  («Leche, pilas…»), tocar = comprado (y se ve quién lo trajo, para no comprarlo dos veces), tocar otra vez = vuelve a
  la lista. Lo comprado va plegado con «Borrar lo comprado». También desde el **＋ → Más → «Algo que hace falta»**,
  y en Inicio sale «🛒 N cosas por comprar» si hay algo. **Sin puntos y sin contar quién compra más.**
  - Datos: `couples/{C}/shopping/{id}` = `{ title, by, createdAt, doneAt, doneBy }`. Entra en la escucha, en la
    copia descargable y en el borrado de la pareja. La demo trae 3 de ejemplo.
  - **Reglas nuevas** (`shopping`): solo miembros, a tu nombre al crear, texto de 1 a 80, no nace comprado, y al
    marcarlo solo cambian `doneAt`/`doneBy` (a tu nombre). **Hay que volver a pegar las reglas en Firebase.**
- 📅 **«A mi Google Calendar»** (gratis): en la hoja de una tarea con fecha y en la hoja de cada día del calendario
  (una por tarea + «Apuntar otra cosa ese día»). Abre Google Calendar con el evento de todo el día ya rellenado y
  cada uno lo guarda en **su** calendario. **No hay sincronización automática** (sin cuentas ni permisos de Google);
  la sincronización de verdad queda en `docs/IDEAS.md`. Lógica en `L.gcalUrl` (con prueba: fin de mes, de año, bisiesto
  y fechas raras → nada).
- 🪙 **Los puntos de cada uno, en Inicio**, debajo de la meta juntos: los dos saldos «para pedir favores» lado a lado,
  mismo tamaño, mismo orden en los dos móviles y cada uno con su color. Sin «va ganando». Si los puntos están en
  pausa, no sale. Revisión de la regla 4 en `docs/PSICOLOGIA.md` (cuarta revisión).
- Ayuda de Tareas e Inicio al día · las hojas mantienen abiertos sus desplegables al repintarse · privacidad y
  ficha de Play con la lista de la compra y Google Calendar.
- Pruebas: **99 de lógica** (+1, Google Calendar) · reglas y datos con la compra (corren en GitHub Actions) ·
  la prueba de humo recorre la compra y los puntos de Inicio.

## [0.12.1] — 2026-10-15 · Documentación, capturas de Play y CI

Misma app que la 0.12.0 (sin cambios de código); esta versión sale porque un push que toca el workflow
siempre recompila:

- **Textos legales al día**: la privacidad dice que «tu color» sí se guarda (desde la v0.9), que al **borrar la cuenta
  se limpia también el móvil**, y las condiciones avisan de que el cobro de Plus **todavía no está activado**.
- **Portada y README**: ya no dicen «solo para parejas» (existe el modo «casa»: pareja, a distancia, compis de piso, familia).
- **Ficha de Google Play** actualizada (calendario, color propio, tema neutro, modo casa) y **seguridad de los datos**
  con la limpieza del móvil.
- **6 capturas nuevas para Play** (1080×1920) en `assets/play/`, generadas con el modo demo
  (`node scripts/make-play-screenshots.mjs`).
- **CI más fino**: un push que solo toque `docs/`, `assets/`, `scripts/`, `tests/` o `.agents/` ya no recompila el APK.

## [0.12.0] — 2026-10-15 · Segunda ronda de agentes: 6 auditorías y todo lo que sacaron

Ronda con 6 agentes en paralelo (revisión completa, seguridad, rendimiento, interfaz, textos y pruebas).
Salieron **34 hallazgos** y **6 bugs de verdad**. Todos los que valían la pena, arreglados.

**Bugs de verdad (encontrados por los agentes)**
- 🐞 **Un `repeat` corrupto en una tarea colgaba el móvil** (bucle infinito en `nextDue`). Ahora devuelve null y la
  tarea se ve como una de una vez, en su fecha (no desaparece).
- 🐞 **Una tarea diaria muy antigua devolvía fechas del PASADO** (el bucle se cortaba a las 500 vueltas): los
  recordatorios llegaban a programar días de 2001. Ahora el salto es por aritmética, exacto y rápido.
- 🐞 **Una fecha corrupta en la base rompía TODOS los repintados** (`dueLabel` petaba dentro de `render()` y la app
  se quedaba congelada). Ahora una fecha inválida se pinta vacía.
- 🐞 **Si fallaba escuchar una colección** (reglas sin pegar, permiso denegado), la app se quedaba para siempre en
  «Contando xurripoints…». Ahora sale la pantalla de reintentar. **Este es el fallo que verías tú al conectar Firebase.**
- 🐞 **La mensual del día 31 se quedaba en el 28 para siempre** en los recordatorios (el calendario sí lo hacía bien).
- 🐞 **Un gasto con fecha basura sumaba a la semana** en la revisión semanal.
- 🐞 **Una tarea de quien ya no está en la pareja no se repartía nunca** con «repartir de forma justa».

**Seguridad (2ª ronda)**
- 🛡️ El **reparto de gastos** (`settings.split`) ahora se valida: el modo que conoce la app, el % entero 0-100 y
  «sugar» solo de uno de los dos miembros (antes un cliente modificado se ponía un 0 % y el otro pagaba todo).
- 🛡️ Tope de puntos por movimiento de 100.000 a **10.000** (la app nunca pasa de 1.000).
- 🛡️ **Borrar la cuenta limpia más cosas del móvil**: los recordatorios programados (podían salir en la pantalla de
  bloqueo con el nombre de la pareja) y las copias exportadas (el JSON/CSV se quedaban en la caché del APK).
- 🛡️ Si el navegador no sabe enumerar las bases de datos, se borran por nombre conocido (antes se quedaba la caché).
- 🛡️ `@capacitor/cli` pasa a devDependencies (es herramienta de compilación, no viaja en el APK).
- 📌 **Documentado y aceptado**: la prueba de Plus se puede reiniciar borrando la pareja y el reloj del móvil la
  alarga; el código de pareja son 30 bits. Se cierran **cuando haya servidor** (App Check + Cloud Function + código
  más largo): ver `docs/IDEAS.md`.

**Rendimiento (2ª ronda, medido)**
- ⚡ **No se repinta si lo que sale es lo mismo**: un cambio del otro móvil que no se ve ya no repinta ~300 elementos.
- ⚡ **Salto de pintado arreglado**: se limpia el freno al empezar `render()` (antes, llamar a mano con un freno
  pendiente pintaba dos veces: 6 sitios).
- ⚡ **El modo demo ya no escribe en disco en cada toque**: se junta la escritura (varias escrituras de una acción =
  una sola) y se vuelca al pasar a segundo plano o al cerrar. Es el camino que usa hoy el APK.
- ⚡ **No se vuelve a montar todo cada hora**: Firebase renueva el token y avisaba; ahora, si sigues en la misma
  pareja, no se desmontan y remontan los 11 oyentes ni sale «cargando».
- ⚡ **Fuera los subconjuntos latin-ext de las fuentes** (−88 KB en el APK; español y catalán caben en el latino) y
  **precarga** de las dos fuentes que sí se usan (antes la cabecera cambiaba de letra al cargar).
- ⚡ `preconnect` a Firestore e Identity (una ida y vuelta menos cuando se conecte Firebase).

**Interfaz y accesibilidad**
- 🎨 **El rojo de aviso no llegaba a 4,5:1** en 6 sitios (badges, «Borrar mi cuenta», «Te faltan X puntos», fechas
  atrasadas, errores). Ahora sí.
- 🎨 **Todo lo que se toca mide ≥44 px**: los botones de decidir («¡Gracias!», «Vale», «Lo hablamos») medían 36, el
  lápiz de editar 32, y también se han subido el avatar de Pareja, los filtros, la ayuda, los votos y los colores.
- 🎨 **Los avisos duran 7 s y, si los tocas, se quedan** (antes 3,2 s y se iban: con TDAH se escapaban).
- 🎨 **Los días del calendario ya no se quedan en 43 px**: con menos hueco, un móvil de 360 px los ve a ≥45.
- 🎨 **En «Puntos y vales» ya se marca Inicio** en la barra de abajo (antes no se marcaba nada).
- 🎨 **El tema Neutro apaga el pastel de verdad** (la tarjeta de Inicio, Gracias, Plus, el mes…) y **tu color llega a
  Inicio** (el degradado de arriba usa los colores de cada uno, no rosa y lila fijos).
- 🎨 Iconos con `aria-hidden` (no se leen en voz alta dentro de frases) y `role="tab"` en las pestañas de dentro.

**Textos**
- ✍️ Fuera los restos de «pareja» donde ya no toca (pregunta del día, «antes que tu churri», el aviso de privacidad,
  «Pareja → Tu perfil»…): ahora usan las palabras del modo «casa».
- ✍️ **Mensajes de error en llano**: ya no dicen «Falta activar Email/Contraseña en Firebase» ni «¿Están publicadas
  las reglas?». Ahora: «Todavía no está lista la conexión de la app. Avisa a quien te la pasó.»
- ✍️ El tutorial (5 → **7 pasos**) y las ayudas explican lo nuevo: calendario, color propio, tema neutro y cómo os
  llama la app. Y **Inicio ya tiene su tarjeta de ayuda y su botón ?**.

**Pruebas**
- **98 de lógica** (antes 72): los 5 fallos que encontró el agente están ahora cubiertos con pruebas que antes
  estaban comentadas.
- **37 de reglas + 10 de datos** (CI) y **29 comprobaciones de interfaz** nuevas en `tests/ui.smoke.mjs`, que ahora
  corre solo en GitHub Actions: entra en la app con un Chrome de verdad y falla si hay un error de consola.

## [0.11.0] — 2026-10-15 · Ronda de agentes: seguridad, rendimiento y un cuelgue

Sesión de auditoría con varios agentes en paralelo (revisión, seguridad, rendimiento, versiones y pruebas).
Lo que salió, arreglado. Lo que no, apuntado en `docs/IDEAS.md` con el porqué.

**Seguridad (auditoría)**
- 🔒 **Cada uno solo toca SU perfil.** Antes, un miembro podía escribir el perfil del otro (nombre e **ingresos**,
  y con los ingresos cambiar el reparto de gastos) sin que el otro se enterase. Las reglas ahora exigen que lo que
  cambie de `profiles` sea solo lo mío, y que las claves que se escriban sean las que usa la app.
- 🔒 **No se puede nacer "caducado".** Una reclamación de puntos con una fecha del pasado contaba sola al momento
  (la confianza de 24 h), o sea puntos gratis. Ahora la fecha tiene que ser la del servidor (±2 h de margen por el reloj del móvil).
- 🔒 **Borrar la cuenta deja el móvil limpio**: se borran también los datos en caché (IndexedDB) y las claves de la app,
  no solo la nube. Salir de la pareja limpia lo de la pareja y conserva tu sesión.
- 🔒 **Los errores ya no cuentan de más**: fuera los mensajes internos de Firebase por pantalla.
- 🔒 **Android**: `allowBackup="false"` (antes el backup de Google/`adb` se llevaba la sesión y los datos) y el
  FileProvider deja de exponer todo el almacenamiento externo (solo `cache` y `files`, que es lo que la app comparte).
- 📌 **Aceptado y documentado**: quien acierte el código de 6 caracteres puede leer el documento de una pareja que
  aún espera (con los ingresos del que ya está). Cerrarlo del todo pide mover los ingresos fuera del documento.

**Rendimiento (auditoría)**
- ⚡ **Fuera lucide**: eran **365 KB para 36 iconos**. Ahora los 36 van en línea en `app/icons.js` (**7,3 KB, −98 %**),
  verificados uno a uno contra los de antes, y ya no hay que "crear" iconos en cada repintado.
- ⚡ **Repintado con freno**: si llegan varios documentos de golpe (o una acción toca dos colecciones), se pinta **una vez**.
- ⚡ **Al volver del segundo plano** la pantalla se refresca (antes podía quedarse vieja hasta el siguiente cambio).
- ⚡ **Se conserva el deslizamiento lateral** de las filas de filtros (antes volvían al principio al llegar un dato).
- ⚡ **Las animaciones de entrada ya no se repiten** en cada repintado (solo al entrar en una pantalla).
- ⚡ **`applyColors` solo toca el CSS si el color cambia** (antes invalidaba el estilo de toda la app en cada render).
- ⚡ El aviso del minuto no repinta con la app en segundo plano, y el **historial de cambios** se trae solo los últimos 60.
- ⚡ Fuera los **2 subconjuntos de fuente vietnamita** (31 KB menos dentro del APK; en español no se usaban).

**Un cuelgue de verdad (lo encontró el agente de pruebas)**
- 🐞 **`nextDue` con un `repeat` desconocido entraba en bucle infinito**: una tarea con el periodo corrupto en la base
  dejaba el móvil pillado al abrirla o al programar los recordatorios. Ahora devuelve null (y el calendario la ignora).

**Modo «casa» (arreglos de la revisión)**
- 🐞 **La pantalla de emparejar no se pintaba sin pareja** (`W()` leía datos que aún no existen): rompía la primera
  pantalla de una cuenta real. Se ve solo al configurar Firebase, así que se arregla antes de conectar nada.
- 🐞 La pregunta «¿Con quién compartes?» **ya no se vuelve a abrir sola** si la cierras con la X.
- 🐞 En un piso, si el reparto estaba en «sugar», el selector **ya no lo cambiaba a «a medias»** sin que lo eligieras.
- 🐞 «Listo» y el aviso del historial van **después de guardar** (si falla la escritura, no se miente).
- Textos que decían «pareja» donde ya no toca («lo verá tu pareja», «Sales de la pareja…», el aviso de privacidad, etc.).

**Dependencias**
- Capacitor **8.5.3** y los plugins a su último parche (cierra el CVE de `@capacitor/android` < 8.5.1).
- Firebase **se queda en 12.19.0**: la 13.0.0 tiene 8 días y obliga a subir también `@firebase/rules-unit-testing`.
- `npm audit` sigue con avisos **solo de herramientas de desarrollo** (`tar`, `sharp`, `xcode`): no entran en el APK.

**Pruebas**
- **72 de lógica** (38 nuevas) · **35 de reglas + 10 de datos** (3 y 5 nuevas). El agente de pruebas encontró el cuelgue;
  la revisión encontró los 2 altos del modo «casa»; la seguridad, los 2 altos de las reglas.

## [0.10.0] — 2026-10-15 · Modo «casa»: ¿con quién compartes?

Joan (audio 2026-10-09): *"quan comences una relació o quan entres a l'aplicació, no totes les parelles estan
convivint juntes… inclús es podria fer per a companys de pis"* + *"s'hauria de fer com unes preguntes inicials"*.

**Las preguntas iniciales**
- La primera vez que entráis, una hoja pregunta **¿Con quién compartes?** con 4 opciones, cada una explicada:
  **🏠 Vivimos juntos · ✈️ A distancia · 🧑‍🤝‍🧑 Compañeros de piso · 👨‍👩‍👧 Familia**.
- Se puede **saltar** («Ahora no») y se cambia cuando queráis: **Pareja → ¿Con quién compartes?**.
- Cambiarlo **deja aviso en el historial**, como todo lo que veis los dos.

**Cambian las palabras (y algún detalle), no el motor**
- «tu pareja» → **«tu compi de piso»** / **«tu familiar»**; «Crear nuestra pareja» → **«Crear nuestro piso»**;
  «Salir de la pareja» → **«Salir del piso»**; y la pantalla **Pareja se llama Piso o Familia**.
- En la ayuda de Puntos y en Pareja también (nada de «churri» para un compi de piso).
- **En un piso compartido** desaparece **«sugar mami/papi»** del reparto de gastos (a medias, según ingresos o
  a medida ya estaban y siguen). Todo lo demás —tareas, gastos, vales, gracias, planes y juegos— funciona igual.
- **El motor sigue siendo de DOS personas**: esto no lo convierte en una app de piso con cinco. Los repartos,
  las propuestas y las reglas están pensados para dos; más gente sería otro proyecto (queda en `docs/IDEAS.md`).

**Técnica**
- `couples/{C}.settings.home` = `pareja | distancia | piso | familia`. Las reglas solo aceptan esas 4 (o nada).
- Las palabras viven en `L.HOMES` / `L.wordsOf` (lógica pura, con prueba): si llegara un valor raro de la base,
  vuelven las de siempre («pareja»). El aviso por pantalla se rellena con `{P}` en `HINTS`.
- 33 pruebas de lógica (1 nueva) + 5 nuevas de reglas.

## [0.9.0] — 2026-10-14 · Calendario, cada uno su color y arreglos de la revisión externa

Joan (audio 2026-10-09): *"ara no es veuen tant els punts, de quant portes tu i quant porta l'altre, que això
a mi molava bastant"* · *"no totes les parelles estan convivint juntes… es podria fer per a companys de pis"* ·
*"el format és una mica [pastel]… que es pugui configurar també els colors"*.
Todo lo que dijo está en `docs/IDEAS.md`; en esta versión va lo de ver y personalizar.

**Calendario de tareas**
- Tareas → **📋 Lista · 🗓️ Calendario**. El mes con ← →, «volver a hoy» y una rejilla de lunes a domingo.
- Cada día lleva **un punto por tarea, con el color de su persona** (o gris si es libre); si no caben, «+N».
- Toca un día y se abre lo que toca ese día (con quién es y cada cuánto), y puedes **apuntar una tarea para ese día**.
- **No se arrastran las atrasadas**: en el calendario cada cosa va en su fecha (en la lista, las atrasadas salen en «Hoy»).
- **La lista sigue igual**: no se quita nada. El calendario solo sirve para ver y hablar del reparto.

**Cada uno su color** (Pareja → **Tu color**, o en el perfil)
- 6 colores (rosa, lila, menta, cielo, melocotón, mostaza). El color es el de **tu avatar, tus tareas y tus días
  del calendario**; el reparto de gastos y de tareas también lo usa.
- Se guarda **solo la clave de la paleta** en `profiles.{uid}.color`, nunca un valor de color: así nada que llegue
  de la base puede acabar dentro del CSS. Las reglas lo comprueban (`firestore.rules`).

**Tema Neutro (gratis)**
- Pareja → Colores: **Fresa · Neutro · Menta · Cielo · Lavanda · Melocotón**. **Neutro es gratis** (fondo gris
  suave, para quien no le gusta el pastel); los 4 de color siguen siendo de Plus. Nada de lo que ya era gratis pasa a Plus.

**Lo que aportáis** (Puntos y vales → 🕘 Historial)
- Lo que ha **sumado cada uno** y lo que **tiene para pedir favores**, y el total de los dos.
- Está en Historial (no en Inicio) y **no compara a nadie**: sirve para saber quién puede pedir un favor.
  Se explica en la propia tarjeta y queda apuntado en `docs/PSICOLOGIA.md` (regla 4 revisada, sin volver al marcador).

**Arreglos de la revisión externa (12 hallazgos, ninguno bloqueante)**
- 🐞 **«Aceptarlas todas» ya no pierde cambios del catálogo**: cada propuesta partía del catálogo viejo, así que
  solo sobrevivía la última y quedaban marcadas como aceptadas. Ahora se aplican en orden y se guarda **una vez**.
- 🐞 **Doble toque en una tarea que se repite**: apuntaba dos reclamaciones y adelantaba la fecha dos veces.
  Ahora hay una guarda de 2,5 s (y aviso «ya la has dado por hecha»).
- 🐞 **Reabrir una tarea ya anula su reclamación** aunque hayan pasado las 24 h y haya contado sola (antes se quedaba).
- 🐞 **Contestar una propuesta ya resuelta** ya no dice «¡Hecho!»: si no estaba pendiente, lo avisa y no cambia nada.
- 🐞 **Contraste**: `--a-deep`, `--b-deep` y `--mint-deep` estaban por debajo de 4,5:1 en enlaces, «+10» y «Contó solo».
  Ahora cumplen la regla de `COMO_TRABAJAR.md` (y los 6 colores nuevos vienen ya con su tono oscuro correcto).
- 🐞 **Legibilidad (dislexia)**: fuera las MAYÚSCULAS con letra espaciada en los vales y en el ahorro, y el voto de
  las ideas sube del mínimo permitido.
- 🐞 **`esc()`/`num()`** en el importe del historial, la fecha de las tareas y el atributo de fecha.
- 🐞 **Mientras escribes al entrar en la app ya no se borra lo escrito** (el guardián de repintado también cubre `auth`).
- 🛡️ **Reglas más estrictas**: el catálogo tiene que ser un mapa con listas, los ingresos un entero de céntimos,
  el nombre y el emoji de texto, y el color solo de la paleta. **Hay que volver a pegar `firestore.rules` en Firebase.**
- 🛡️ **La app se defiende sola**: si llegara un catálogo roto, se pinta vacío en vez de dejar la pantalla en blanco;
  los ingresos se usan siempre como número (nunca `NaN`).

**Segunda revisión externa (sobre esta misma versión): 10 hallazgos, todos arreglados**
- 🐞 **La hoja de un día del calendario se repinta con los datos**: antes, marcar una tarea hecho dejaba el círculo
  igual y el segundo toque reabría la tarea (o duplicaba la reclamación).
- 🐞 **`prop-all` guarda solo la lista del catálogo que cambia** (escribir siempre las dos pisaba un cambio recién
  hecho en la otra lista).
- 🐞 **Tarea mensual del día 31**: se quedaba en el 28 para siempre. Ahora se guarda el día original (`dueDay`) y
  vuelve al 31 cuando el mes lo tiene (febrero sigue recortando, como debe).
- 🐞 **Calendario más rápido con muchas tareas**: el salto a la fecha de hoy se calcula con aritmética en vez de
  ir día a día (una tarea diaria de hace años ya no cuesta nada).
- 🐞 **Tope de 100 por lista del catálogo en la app**, con un aviso claro en vez de «Sin permiso».
- 🐞 **La guarda del doble toque se limpia** si la escritura falla y al «Deshacer» (antes bloqueaba un reintento).
- 🛡️ **Al unirse a una pareja, el perfil que se escribe también pasa por `okProfile`** (nombre, emoji, ingresos y
  color) — era el único camino sin la barrera.
- 🛡️ **`optInt` admite `null`** (antes un `income: null` dejaba el documento entero sin poder guardarse).

**Pruebas:** 31 de lógica (5 nuevas: rejilla, ocurrencias, mapa del día, puntos aportados y colores) + 4 nuevas de reglas.
Verificado en navegador con datos reales de la demo (calendario, hoja del día, tarea desde el día, color por persona,
tema neutro, «Lo que aportáis»): **sin errores de consola**.

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
