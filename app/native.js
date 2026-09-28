/* ================================================================
   Xurripoints — capa nativa (Capacitor). SOLO actúa dentro de la app Android;
   en el navegador no hace nada.
   - Barra de estado del color de la app, con iconos oscuros.
   - Botón ATRÁS físico: cierra la hoja abierta / vuelve a Inicio; solo desde Inicio sale.
   ================================================================ */
(function () {
  'use strict';
  function isNative() { return !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform()); }
  function P(name) { return (window.Capacitor && Capacitor.Plugins && Capacitor.Plugins[name]) || null; }
  if (!isNative()) return;
  document.documentElement.classList.add('native');

  async function setupStatusBar() {
    const SB = P('StatusBar'); if (!SB) return;
    try {
      await SB.setOverlaysWebView({ overlay: false });
      await SB.setBackgroundColor({ color: '#FFF3EC' });
      await SB.setStyle({ style: 'LIGHT' }); // iconos oscuros sobre fondo claro
    } catch (e) { /* silencioso */ }
  }

  function setupBackButton() {
    const App = P('App'); if (!App) return;
    App.addListener('backButton', () => {
      try {
        if (typeof window.__xpBack === 'function' && window.__xpBack()) return;
        App.exitApp();
      } catch (e) { try { App.exitApp(); } catch (_) { } }
    });
  }

  setupStatusBar();
  setupBackButton();
})();
