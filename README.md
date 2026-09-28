<div align="center">

<img src="app/icon.svg" width="96" alt="Xurripoints" />

# Xurripoints

**La moneda de vuestra relación.** App Android para parejas: puntos, vales, tareas y gastos compartidos.

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
- **Tareas:** repartidas, libres o por turnos, con una barra que dice quién lleva más carga.
- **Dinero:** elegid **vuestro reparto** una vez (a medias, según ingresos, sugar mami/papi o a medida) y cambiadlo en cada gasto si hace falta, como en Splitwise;
  gastos fijos que se apuntan solos cada mes, cuánto hay que cuadrar y **huchas para ahorrar juntos**.

## Instalar (Android)
1. Pulsa **Descargar app** desde el móvil (o escanea el QR).
2. Abre el archivo `Xurripoints.apk`. Si pregunta, permite **"instalar apps de origen desconocido"** para el navegador.
3. Las versiones nuevas se instalan **encima** (sin desinstalar). La app avisa cuando hay una.

Sin Firebase configurado arranca en **modo demo** (todo en el móvil, puedes hacer de los dos).
Para sincronizar dos móviles: [`docs/FIREBASE.md`](docs/FIREBASE.md).

## Desarrollo
```bash
npm install
node tests/logic.test.mjs                        # pruebas de la lógica
python -m http.server 5173 --directory app       # probar en el navegador
npm run sync                                     # empaqueta Firebase + copia la web a android/
```
Cada push a `main` compila el APK en GitHub Actions y lo publica en Releases.

Diseñada con criterio de psicología de pareja para que **sume y no lleve la cuenta**: [`docs/PSICOLOGIA.md`](docs/PSICOLOGIA.md).

Documentación: [`CONTEXTO.md`](CONTEXTO.md) · [`COMO_TRABAJAR.md`](COMO_TRABAJAR.md) · [`CHANGELOG.md`](CHANGELOG.md) · [`docs/`](docs/)
