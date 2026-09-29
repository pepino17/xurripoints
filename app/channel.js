/* De dónde viene esta copia de la app:
   - 'github': el APK de GitHub Releases (testers). Avisa de versiones nuevas y enlaza el APK.
   - 'play':   la de Google Play. Google no deja que una app se actualice por su cuenta: se actualiza desde Play.
   GitHub Actions lo cambia a 'play' solo para compilar el .aab (ver .github/workflows/android.yml). */
export const CHANNEL = 'github';
