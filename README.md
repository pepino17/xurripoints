<div align="center">

<img src="app/icon.svg" width="96" alt="Xurripoints" />

# Xurripoints

**Vuestra casa, en equipo.** App Android para parejas: tareas, gastos compartidos, planes y gracias — y puntos para pediros favores.

[![Descargar app](https://img.shields.io/badge/⬇%20Descargar%20app-Android-F58BAA?style=for-the-badge&labelColor=3B2335)](https://github.com/pepino17/xurripoints/releases/latest/download/Xurripoints.apk)

Este botón **siempre descarga la última versión**. Enlace para compartir:<br>
`https://github.com/pepino17/xurripoints/releases/latest/download/Xurripoints.apk`

<img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=8&data=https%3A%2F%2Fgithub.com%2Fpepino17%2Fxurripoints%2Freleases%2Flatest%2Fdownload%2FXurripoints.apk" width="160" alt="QR para descargar la app" /><br>
<sub>Escanéalo con el móvil para descargarla.</sub>

</div>

## Qué hace
- **Xurripoints:** las tareas de casa dan puntos; se canjean por **vales** (favores: que te cubran una tarea,
  elegir la peli, una siesta sin ruido…). Todo suma a una **meta juntos**. Los mimos no se cobran: para eso está **Gracias** 💛.
- **Juntos:** ideas de pelis, planes y comida con votos y *match*; **ruleta, dados y cara o cruz** para decidir; y
  **juegos para dos** (tres en raya, conecta 4, piedra-papel-tijera, esto o aquello, ¿quién es más probable?).
- **Tareas:** repartidas, libres o por turnos, con una barra para hablar de si el reparto os parece justo.
- **Dinero:** elegid **vuestro reparto** una vez (a medias, según ingresos, sugar mami/papi o a medida) y cambiadlo en cada gasto si hace falta, como en Splitwise;
  gastos fijos que se apuntan solos cada mes, cuánto hay que cuadrar y **huchas para ahorrar juntos**.
- **Lo común se acuerda:** repartos y precios se cambian con una **propuesta** que el otro acepta; si alguien borra o
  cambia algo, el otro lo ve y puede recuperarlo. Los puntos se pueden **pausar** y cada uno puede **salir de la pareja**.
- **Fácil de empezar:** bienvenida en 5 pasos, **primeros pasos** en Inicio y ayuda en cada pantalla (botón **?**).
- **Gratis y sin anuncios.** **Xurripoints Plus** (opcional, uno para los dos): resumen del mes, gastos a Excel,
  revisión semanal, packs de preguntas, más cartas y colores. **14 días de prueba gratis** desde la app.

Web: **https://pepino17.github.io/xurripoints/** · [Privacidad](https://pepino17.github.io/xurripoints/privacidad.html) ·
[Condiciones](https://pepino17.github.io/xurripoints/condiciones.html) · [Borrar la cuenta](https://pepino17.github.io/xurripoints/borrar-cuenta.html)

## Instalar (Android)
1. Pulsa **Descargar app** desde el móvil (o escanea el QR).
2. Abre el archivo `Xurripoints.apk`. Si pregunta, permite **"instalar apps de origen desconocido"** para el navegador.
3. Las versiones nuevas se instalan **encima** (sin desinstalar). La app avisa cuando hay una.

Sin Firebase configurado arranca en **modo demo** (todo en el móvil, puedes hacer de los dos).
Para sincronizar dos móviles: [`docs/FIREBASE.md`](docs/FIREBASE.md).

## Desarrollo
```bash
npm install
node tests/logic.test.mjs                        # pruebas de la lógica (y de que la versión coincide)
python -m http.server 5173 --directory app       # probar en el navegador
npm run sync                                     # empaqueta Firebase + copia la web a android/
```
Cada push a `main` compila el APK (release firmado) y el `.aab` para Google Play en GitHub Actions y los publica en Releases.
La web pública sale de la carpeta [`docs/`](docs/) (GitHub Pages). Negocio y tienda: [`docs/MONETIZACION.md`](docs/MONETIZACION.md) · [`docs/PLAY_STORE.md`](docs/PLAY_STORE.md).
Las reglas de Firestore y `app/store.js` se prueban con los emuladores de Firebase en Actions (`tests/rules.test.mjs`, `tests/store.test.mjs`).

Diseñada con criterio de psicología de pareja para que **sume y no lleve la cuenta**: [`docs/PSICOLOGIA.md`](docs/PSICOLOGIA.md).

Documentación: [`CONTEXTO.md`](CONTEXTO.md) · [`COMO_TRABAJAR.md`](COMO_TRABAJAR.md) · [`CHANGELOG.md`](CHANGELOG.md) · [`docs/`](docs/)
