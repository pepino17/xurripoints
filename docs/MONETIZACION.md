# Monetización de Xurripoints

> Decidido con Joan el **2026-09-29** (v0.8.0). Solo español de momento. Web pública en GitHub Pages.

## El modelo: freemium, un plan para los dos

- **Gratis de verdad**: todo lo que había hasta la v0.7 sigue gratis. Sin anuncios, nunca.
- **Xurripoints Plus**: un plan **por pareja** (paga uno y lo tienen los dos). Solo trae cosas **nuevas**.
- **Prueba gratis de 14 días**, una vez por pareja, sin tarjeta. Al acabar vuelve sola a gratis.

¿Por qué así? Una app de pareja solo sirve si **los dos** la instalan: lo básico tiene que ser gratis. Y pagar
"por pareja" es más justo y más fácil de vender que dos suscripciones.

| Gratis (siempre) | Plus |
|---|---|
| Tareas, gastos, gastos fijos, ahorro | 📊 Resumen del mes por categorías |
| Gracias, planes, decidir y 5 juegos | 📤 Gastos a Excel (CSV) |
| Puntos, vales, meta juntos | 🗓️ Revisión semanal (5 pasos juntos) |
| Propuestas, historial, salir, borrar cuenta | 💬 4 packs de preguntas para conoceros |
| Recordatorio diario | 🎴 Más cartas en los juegos |
| **Descargar una copia de los datos** (RGPD) | 🎨 Colores de la app |
| | 🔔 Avisos al momento *(pronto, necesita Blaze)* · 📷 Fotos *(pronto)* |

## Precios (orientativos, se ponen en Play Console)

| Producto | Precio | ID en Google Play |
|---|---|---|
| Anual (el destacado) | **19,99 €/año** (1,67 €/mes) | `plus_anual` (suscripción) |
| Mensual | 2,99 €/mes | `plus_mensual` (suscripción) |
| Para siempre | 39,99 € | `plus_siempre` (producto único) |

Referencias: Splitwise Pro ~3–5 €/mes (solo gastos); apps de pareja tipo Paired o Lasting ~10 €/mes.
Si cambian los precios, cambiar también `PLUS_PRICES` en `app/app.js` y la portada (`docs/index.html`).

## Lo que NO se hace (reglas de `docs/PSICOLOGIA.md`)

- ❌ **Vender xurripoints** con dinero: pone precio al cariño y vuelve el "lo he pagado".
- ❌ **Anuncios**: app íntima + datos de dinero = desconfianza.
- ❌ **Usar o vender datos** (hay ingresos de la gente).
- ❌ **Presionar**: nada de ventanas que saltan solas, rachas con culpa ni cuentas atrás. Plus solo aparece en
  Pareja o cuando tocas algo de Plus.
- ❌ **Poner de pago lo que ya era gratis**, ni la seguridad (salir, borrar cuenta, pausar puntos, descargar la copia).

## Cómo está hecho

- **Datos**: `couples/{C}.plus = { tier:'trial'|'plus', source:'trial'|'play'|'promo', since, until (ms o null = para siempre), by }`.
- **Lógica**: `L.plusState(couple)` → `{ active, trialUsed, tier, daysLeft, forever }` · `L.trialDoc(uid)` (prueba).
- **Reglas** (`firestore.rules`): la app solo puede **empezar la prueba** (si no hay `plus`, `tier:'trial'`,
  `by` = yo, máx. 15 días). Nadie puede alargarla ni ponerse el plan de pago: eso lo escribe el **servidor**
  (Admin SDK, que no pasa por las reglas). Probado en `tests/rules.test.mjs`.
- **Interfaz** (`app/app.js`): `needPlus('clave')` enseña la hoja de Plus con lo que has tocado arriba.
  Entradas: tarjeta en Pareja, "Resumen" en Dinero, juegos con etiqueta Plus, "Más preguntas ✨", revisión (vie–dom en Inicio).
- **Canal** (`app/channel.js`): `'github'` (APK) o `'play'` (lo pone GitHub Actions al compilar el .aab). La versión
  de Play **no** avisa de APKs nuevos: Google no deja que una app se actualice por su cuenta.

## Cobrar de verdad (cuando Joan tenga Play Console)

1. **Play Console** (25 $ una vez) → crear la app → subir el `.aab` → prueba cerrada (ver `docs/PLAY_STORE.md`).
2. **Productos**: suscripciones `plus_anual` y `plus_mensual` (sin prueba de Google: la prueba ya la da la app) y
   producto único `plus_siempre`.
3. **RevenueCat** (gratis al empezar): conectar con Play, crear el *entitlement* `plus` con los 3 productos.
   - App: `npm i @revenuecat/purchases-capacitor` + `npx cap sync android`. Comprar con el `appUserID` = **código de la pareja**
     (así lo que compra uno vale para los dos) y botón **Restaurar compras**.
   - Solo en el canal `'play'` (el APK de GitHub sigue con la prueba y "muy pronto").
4. **Servidor**: webhook de RevenueCat → **Cloud Function** (plan Blaze; con pocas parejas ≈ 0 €) que escribe
   `couples/{código}.plus = { tier:'plus', source:'play', since, until: fin del periodo (o null si es para siempre), by }`.
   Al cancelar/caducar, pone `until` en la fecha de fin. La app ya lo lee todo con `plusState`.
5. Cambiar el botón "Hacerse Plus · muy pronto" por los 3 productos y probar con **cuentas de prueba** de Play.

Si quien pagó sale de la pareja: Plus se queda en la pareja donde se compró hasta que acabe el periodo
(está así en las condiciones). La suscripción la cancela esa persona desde Google Play.

## Qué medir (sin espiar)

Sin analítica de terceros (lo prometemos en la privacidad). Cuando haya Cloud Functions, contadores agregados:
- **Activación**: parejas con 2 miembros en 48 h.
- **Retención**: parejas que apuntan algo en la semana 4.
- **Prueba → pago**: % de pruebas que acaban en Plus (objetivo inicial 3–5 %).

Cuenta rápida: 1.000 parejas × 4 % × 20 €/año ≈ **800 €/año** (menos el 15 % de Google). El dinero llega con muchas
parejas: primero que la usen y se queden.

## Orden recomendado

1. Conectar Firebase (región **Madrid**, la privacidad dice UE) y probar con dos móviles.
2. Poner un **email de contacto** en la web (privacidad, condiciones, borrar cuenta) y en Play Console.
3. Play Console + prueba cerrada con 12 testers × 14 días (`docs/PLAY_STORE.md`).
4. Publicar gratis. Medir activación y retención con 50–100 parejas.
5. Conectar el cobro (arriba) y lanzar Plus.
6. Avisos push (la función de Plus más pedida) y fotos.
