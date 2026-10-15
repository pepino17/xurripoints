# Publicar en Google Play — paso a paso

> Preparado el 2026-09-29 (v0.8.0) y **actualizado el 2026-10-15 (v0.12.0)**: calendario, color de cada uno, tema
> neutro, modo «casa» (pareja / a distancia / compis de piso / familia) y limpieza al borrar la cuenta.
> Lo que ya está hecho está marcado con ✅.

## Lo que ya está listo en la app

- ✅ **AAB firmado**: cada release trae `Xurripoints-vX.Y.Z-GooglePlay.aab` (en GitHub → Releases → Assets).
  Es la versión del canal `'play'` (sin avisos de APK nuevos, que Google no permite).
- ✅ Firmado con la clave estable (`xurripoints.p12`): en Play Console úsala como **clave de subida** y deja que
  Google gestione la firma de la app (Play App Signing).
- ✅ `targetSdk 36`, `versionCode` que siempre sube (mayor·10000 + menor·100 + parche).
- ✅ **Borrar la cuenta** dentro de la app + web: https://pepino17.github.io/xurripoints/borrar-cuenta.html
- ✅ **Privacidad**: https://pepino17.github.io/xurripoints/privacidad.html
- ✅ **Condiciones**: https://pepino17.github.io/xurripoints/condiciones.html
- ✅ Sin anuncios, sin analítica de terceros, modo demo para los revisores.

## Lo que tiene que hacer Joan

1. [ ] **Conectar Firebase** (`docs/FIREBASE.md`) eligiendo la región **europe-southwest1 (Madrid)**: la privacidad dice "servidores en la UE".
2. [ ] Crear un **email de contacto** (p. ej. `xurripoints.app@gmail.com`) y pasárselo a Claude para ponerlo en la web.
3. [ ] Cuenta de **Google Play Console** (25 $, una vez). Si es cuenta **personal nueva**, Google pide una
   **prueba cerrada con al menos 12 testers durante 14 días** antes de publicar.
4. [ ] Crear la app: nombre, idioma **español (España)**, app, **gratis** (con compras dentro de la app más adelante).
5. [ ] Rellenar la ficha (textos de abajo), las encuestas y subir el `.aab` a **Prueba cerrada**.
6. [ ] Invitar a los testers (lista de emails de Google) y esperar los 14 días. Luego, **Producción**.

## Ficha de la tienda

**Nombre** (máx. 30): `Xurripoints: casa en equipo`

**Descripción corta** (máx. 80):
`Tareas, gastos, calendario y gracias para quien comparte casa. Sin anuncios.`

**Descripción larga**:

```
Xurripoints es la app para organizar vuestra casa SIN llevar la cuenta 💞

🧽 TAREAS JUSTAS, CON CALENDARIO
Fijas, libres o por turnos, con una vista de LISTA y otra de CALENDARIO para ver lo que toca cada día. Un botón las reparte de forma justa, y podéis apuntar también la carga invisible: citas, gestiones, cumpleaños.

💸 GASTOS COMPARTIDOS
A medias, según ingresos, "sugar mami/papi" o a medida. Gastos fijos que se apuntan solos cada mes y "para cuadrar" sin prisas ni reproches.

🐷 AHORRO JUNTOS
Huchas para el viaje, el sofá nuevo o los imprevistos. Lo importante es el total, no quién pone más.

💛 GRACIAS A DIARIO
Pequeñas gracias que se guardan en vuestro tarro. Sin puntos: el cariño no tiene precio.

🍿 PLANES Y JUEGOS
Votad pelis, planes y comida y ved en qué coincidís. Decidid con moneda, dados o ruleta. Y juegos para dos en el mismo móvil.

🪙 PUNTOS Y FAVORES
Las tareas dan xurripoints para pediros favores (nunca permisos). En el historial veis lo que aporta cada uno y lo que tiene para pedir. ¿No os van? Se pausan con un toque.

🏠 CADA CASA ES DISTINTA
Al empezar os pregunta con quién compartís: en pareja, a distancia, COMPAÑEROS DE PISO o familia. La app cambia las palabras y algún detalle para que hable de lo vuestro.

🎨 A VUESTRO AIRE
Cada uno elige su color (y se ve en vuestras tareas y en el calendario). El fondo puede ser pastel o neutro.

🌿 PENSADA CON LA PSICOLOGÍA DE PAREJA
Sin castigos ni marcadores de "quién hace más". Lo que os afecta a los dos se propone y el otro acepta. Nada cambia a escondidas. Y siempre hay salida: pausar, salir o borrar la cuenta.

✨ XURRIPOINTS PLUS (opcional)
Un plan para los dos: resumen del mes, gastos a Excel, revisión semanal, packs de preguntas, más cartas y temas. Probadlo 14 días gratis, sin tarjeta.

🔒 Sin anuncios y sin vender vuestros datos. Nunca. Al borrar la cuenta se borra también lo que quedaba en el móvil.

Cómo empezar: crea tu cuenta, crea vuestra casa y envía el código de 6 letras a la otra persona. ¿Solo quieres curiosear? Prueba el modo demo.
```

- **Categoría**: Estilo de vida · **Etiquetas**: pareja, tareas del hogar, gastos compartidos, compañeros de piso, organización.
- **Email de contacto**: el del punto 2 · **Web**: https://pepino17.github.io/xurripoints/
- **Capturas** (1080×1920): en `assets/play/` (`node scripts/make-play-screenshots.mjs` las regenera con el modo demo):
  Inicio (meta juntos) · Tareas (calendario) · Dinero (para cuadrar) · Puntos (lo que aportáis) · Juntos (ideas) ·
  Pareja (tu color y con quién compartes).
- **Icono** 512×512: `assets/icon-only.png` (revisar tamaño) · **Gráfico destacado** 1024×500: **hecho** en
  `assets/feature-graphic-1024x500.png` (se regenera con `node scripts/make-feature-graphic.mjs`, que usa el icono
  y las tipografías de la app).

## Encuestas de Play Console (respuestas)

**Acceso a la app**: "Toda la funcionalidad está disponible sin restricciones" no aplica (hay cuenta) → indicar:
*"En la pantalla inicial, toca «Probar en modo demo»: se puede probar todo sin cuenta (haces de los dos miembros)."*

**Anuncios**: No contiene anuncios.

**Clasificación de contenido** (IARC): categoría "Todas las demás apps". Sin violencia, sexo, lenguaje soez, drogas ni
apuestas. **Interacción entre usuarios: Sí** (solo entre los dos miembros de la pareja). No comparte ubicación.
**Compras digitales**: sí cuando se active Plus.

**Público objetivo**: **18 años o más** (evita la política de familias; las condiciones piden 16+).

**Seguridad de los datos**:

| Pregunta | Respuesta |
|---|---|
| ¿Recoge o comparte datos? | Recoge: **Sí** · Comparte con terceros: **No** |
| Cifrado en tránsito | **Sí** |
| ¿Se pueden borrar? | **Sí**: en la app (Pareja → Cuenta → Borrar mi cuenta) y en `borrar-cuenta.html`. Al borrarla se limpian también los datos que quedaban **en el móvil** (caché, preferencias y recordatorios). |
| Info personal → Email | Recogido · Gestión de la cuenta, Funcionalidad · Obligatorio |
| Info personal → Nombre | Recogido (mote) · Funcionalidad · Obligatorio |
| Info financiera → Otra info financiera | Recogido (gastos e ingresos) · Funcionalidad · Ingresos opcionales |
| Info financiera → Historial de compras | Recogido cuando haya Plus · Funcionalidad |
| Actividad en apps → Otro contenido generado por el usuario | Recogido (tareas, gracias, ideas) · Funcionalidad |

Nada de ubicación, contactos, fotos, audio, identificadores de publicidad ni analítica.

**Info local (no se sube)**: preferencias (fondo, recordatorio, ayudas vistas) y la copia en caché para que la app
funcione sin conexión. Se borra al borrar la cuenta.

## Cuando se active el cobro

Ver `docs/MONETIZACION.md` → "Cobrar de verdad": productos `plus_anual`, `plus_mensual`, `plus_siempre`, RevenueCat y
la Cloud Function que escribe `couples/{código}.plus`.
