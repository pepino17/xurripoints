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

  /** Color de la barra de estado según los colores de la app (Plus). */
  window.__xpBar = function (color) {
    const SB = P('StatusBar'); if (!SB) return;
    try { SB.setBackgroundColor({ color: color }); } catch (e) { /* silencioso */ }
  };

  function setupBackButton() {
    const App = P('App'); if (!App) return;
    App.addListener('backButton', () => {
      try {
        if (typeof window.__xpBack === 'function' && window.__xpBack()) return;
        App.exitApp();
      } catch (e) { try { App.exitApp(); } catch (_) { } }
    });
  }

  /* ---- Recordatorio diario (notificaciones locales, sin servidor). app.js calcula qué avisar. ---- */
  const NOTIFY_IDS = [2100, 2101, 2102, 2103, 2104, 2105, 2106];
  window.__xpNotify = {
    async enable() {
      const LN = P('LocalNotifications'); if (!LN) return false;
      try {
        const perm = await LN.requestPermissions();
        if (perm && perm.display && perm.display !== 'granted') return false;
        try { await LN.createChannel({ id: 'xurripoints', name: 'Xurripoints', description: 'Recordatorio diario', importance: 4, visibility: 1 }); } catch (e) { /* Android antiguo */ }
        return true;
      } catch (e) { return false; }
    },
    async sync(list) {
      const LN = P('LocalNotifications'); if (!LN) return;
      try {
        await LN.cancel({ notifications: NOTIFY_IDS.map(id => ({ id })) });
        const want = (Array.isArray(list) ? list : []).filter(n => n && NOTIFY_IDS.indexOf(n.id) >= 0 && n.at > Date.now());
        if (want.length) await LN.schedule({ notifications: want.map(n => ({
          id: n.id, title: n.title, body: n.body, channelId: 'xurripoints',
          // No exacto: si no, en Android 12+ sin permiso de "alarmas exactas" el plugin abre Ajustes en cada
          // reprogramación. Para un recordatorio diario, unos minutos de margen dan igual.
          isExactNotification: false,
          schedule: { at: new Date(n.at), allowWhileIdle: true },
        })) });
      } catch (e) { /* silencioso */ }
    },
    async clear() {
      const LN = P('LocalNotifications'); if (!LN) return;
      try { await LN.cancel({ notifications: NOTIFY_IDS.map(id => ({ id })) }); } catch (e) { /* silencioso */ }
    },
  };

  setupStatusBar();
  setupBackButton();
})();
