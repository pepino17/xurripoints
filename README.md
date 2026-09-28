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
- **Xurripoints:** ganad puntos haciendo cosas por el otro (fregar, cena, masaje…) y gastadlos en **vales**
  (salir con los amigos, siesta sin interrupciones…). Todo se aprueba entre los dos.
- **Tareas:** repartidas, libres o por turnos, con una barra que dice quién lleva más carga.
- **Gastos:** quién pagó y cómo se reparte — **50/50, proporcional, sugar mami, sugar papi o a medida** —,
  gastos fijos que se apuntan solos cada mes y cuánto se debe cada uno.

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

Documentación: [`CONTEXTO.md`](CONTEXTO.md) · [`COMO_TRABAJAR.md`](COMO_TRABAJAR.md) · [`CHANGELOG.md`](CHANGELOG.md) · [`docs/`](docs/)
