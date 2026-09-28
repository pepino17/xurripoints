# Xurripoints 🪙💗

**La moneda de vuestra relación.** App Android para parejas:

- **Xurripoints:** ganad puntos haciendo cosas por el otro (fregar, cena, masaje…) y gastadlos en **vales**
  (salir con los amigos, siesta sin interrupciones…). Todo se aprueba entre los dos.
- **Tareas:** repartidas, libres o por turnos, con una barra que dice quién lleva más carga.
- **Gastos:** quién pagó y cómo se reparte — **50/50, proporcional, sugar mami, sugar papi o a medida** —
  y cuánto se debe cada uno.

## Instalar
1. Descarga el último `Xurripoints-vX.Y.Z.apk` de **[Releases](../../releases/latest)**.
2. Ábrelo en el móvil y permite "instalar apps de origen desconocido".
3. Sin Firebase configurado arranca en **modo demo**. Para sincronizar dos móviles: [`docs/FIREBASE.md`](docs/FIREBASE.md).

## Desarrollo
```bash
npm install
node tests/logic.test.mjs                        # pruebas de la lógica
python -m http.server 5173 --directory app       # probar en el navegador
npm run sync                                     # empaqueta Firebase + copia la web a android/
```
Cada push a `main` compila el APK en GitHub Actions y lo publica en Releases.

Documentación: [`CONTEXTO.md`](CONTEXTO.md) · [`COMO_TRABAJAR.md`](COMO_TRABAJAR.md) · [`CHANGELOG.md`](CHANGELOG.md) · [`docs/`](docs/)
