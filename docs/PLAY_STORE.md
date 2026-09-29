# Publicar en Google Play — paso a paso

> Preparado el 2026-09-29 (v0.8.0). Lo que ya está hecho está marcado con ✅.

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

**Nombre** (máx. 30): `Xurripoints: casa en pareja`

**Descripción corta** (máx. 80):
`Tareas y gastos en pareja sin dramas, gracias y planes juntos. Sin anuncios.`

**Descripción larga**:

```
Xurripoints es la app para organizaros en pareja SIN llevar la cuenta 💞

🧽 TAREAS JUSTAS
Fijas, libres o por turnos. Un botón las reparte de forma justa, y podéis apuntar también la carga invisible: citas, gestiones, cumpleaños.

💸 GASTOS COMPARTIDOS
A medias, según ingresos, "sugar mami/papi" o a medida. Gastos fijos que se apuntan solos cada mes y "para cuadrar" sin prisas ni reproches.

🐷 AHORRO JUNTOS
Huchas para el viaje, el sofá nuevo o los imprevistos. Lo importante es el total, no quién pone más.

💛 GRACIAS A DIARIO
Pequeñas gracias que se guardan en vuestro tarro. Sin puntos: el cariño no tiene precio.

🍿 PLANES Y JUEGOS
Votad pelis, planes y comida y ved en qué coincidís. Decidid con moneda, dados o ruleta. Y juegos para dos en el mismo móvil.

🪙 PUNTOS Y FAVORES
Las tareas dan xurripoints para pediros favores (nunca permisos). ¿No os van? Se pausan con un toque.

🌿 PENSADA CON LA PSICOLOGÍA DE PAREJA
Sin castigos ni marcadores de "quién hace más". Lo que os afecta a los dos se propone y el otro acepta. Nada cambia a escondidas. Y siempre hay salida: pausar, salir de la pareja o borrar la cuenta.

✨ XURRIPOINTS PLUS (opcional)
Un plan para los dos: resumen del mes, gastos a Excel, revisión semanal, packs de preguntas, más cartas y colores. Probadlo 14 días gratis, sin tarjeta.

🔒 Sin anuncios y sin vender vuestros datos. Nunca.

Cómo empezar: crea tu cuenta, crea vuestra pareja y envía el código de 6 letras a tu pareja. ¿Solo quieres curiosear? Prueba el modo demo.
```

- **Categoría**: Estilo de vida · **Etiquetas**: pareja, tareas del hogar, gastos compartidos, organización.
- **Email de contacto**: el del punto 2 · **Web**: https://pepino17.github.io/xurripoints/
- **Capturas** (mín. 2, recomendadas 4–8, móvil vertical): usar el **modo demo** en tamaño móvil:
  Inicio (meta juntos) · Tareas (reparto) · Dinero (para cuadrar) · Nuevo gasto (reparto) · Juntos (ideas con match) ·
  Hoja de Plus · Resumen del mes · Revisión semanal.
- **Icono** 512×512: `assets/icon-only.png` (revisar tamaño) · **Gráfico destacado** 1024×500: pendiente (pídeselo a Claude).

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
| ¿Se pueden borrar? | **Sí**: en la app y en `borrar-cuenta.html` |
| Info personal → Email | Recogido · Gestión de la cuenta, Funcionalidad · Obligatorio |
| Info personal → Nombre | Recogido (mote) · Funcionalidad · Obligatorio |
| Info financiera → Otra info financiera | Recogido (gastos e ingresos) · Funcionalidad · Ingresos opcionales |
| Info financiera → Historial de compras | Recogido cuando haya Plus · Funcionalidad |
| Actividad en apps → Otro contenido generado por el usuario | Recogido (tareas, gracias, ideas) · Funcionalidad |

Nada de ubicación, contactos, fotos, audio, identificadores de publicidad ni analítica.

## Cuando se active el cobro

Ver `docs/MONETIZACION.md` → "Cobrar de verdad": productos `plus_anual`, `plus_mensual`, `plus_siempre`, RevenueCat y
la Cloud Function que escribe `couples/{código}.plus`.
