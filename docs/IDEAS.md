# Ideas (backlog)

Todo lo que se le ocurra a Joan, aunque sea para el futuro. Lo hecho se tacha y se mueve al CHANGELOG.

## Próximo (lo más útil)
- **Avisos push** cuando la pareja propone, pide un vale o cambia algo (hoy se ve al abrir la app y en el
  recordatorio diario). Opción real: Firebase Cloud Messaging + una Cloud Function que escuche `points`,
  `proposals` y `log` (requiere Firebase conectado y plan Blaze, de pago por uso; con una pareja ≈ 0 €).
- ~~**Recordatorios locales** de tareas del día~~ → hecho en v0.6.0.
- ~~**Gastos fijos** que se repiten~~ → hecho en v0.2.0.
- **Versión web** en GitHub Pages para testers con iPhone (misma app, en Safari). (La web pública ya existe desde v0.8: `docs/`.)
- ~~Borrar mi cuenta / salir de la pareja~~ → hecho en v0.7.0 (quien se queda conserva lo común).
- ~~Exportar una copia de vuestros datos (JSON/CSV)~~ → hecho en v0.8.0 (JSON gratis; gastos a Excel, Plus).

## Vender (v0.8: `docs/MONETIZACION.md`)
- ~~Plan Plus por pareja con prueba de 14 días~~, ~~web legal~~, ~~.aab~~ → hecho en v0.8.0.
- **Cobro real**: RevenueCat + Cloud Function que escribe `couples/{C}.plus` (falta Play Console).
- **Email de contacto** propio para la web y la ficha de Play.
- **Gráfico destacado** 1024×500 y capturas para la ficha de Play.
- Pedir valoración en Play en un momento feliz (meta conseguida), una vez y sin insistir.
- Código promocional (`source:'promo'`) para regalar Plus a testers.
- Inglés (más mercado) cuando la versión en español funcione.
- Regalar Plus a tu pareja (San Valentín, aniversario).

## Facilidad de uso (queja de Joan 2026-09-29: "muy cargada, pero sin quitar funciones")
- ~~＋ con 4 grandes y "Más"~~, ~~Decidir en tarjetas~~, ~~Pareja en bloques~~, ~~ayuda por pantalla~~,
  ~~primeros pasos~~ → hecho en v0.7.0.
- Modo "simple" opcional: ocultar pestañas que no uséis (p. ej. sin Juntos o sin Ahorro).
- Tema oscuro y tamaño de letra ajustable (accesibilidad, dislexia).

## Juntos (juegos y decidir)
- Juegos **a distancia** (cada uno en su móvil, sincronizado): tres en raya, conecta 4, preguntas.
- Más juegos: memory de parejas, trivial "¿cuánto me conoces?", dibujar y adivinar.
- Ruleta con vuestras listas guardadas (sin tener que escribirlas).

## Ahorro
- Aportación fija cada mes a una hucha (como los gastos fijos).
- Unir una hucha con la **Meta juntos** (p. ej. escapada = puntos + dinero).

## Economía de puntos
- Vales con cantidad limitada ("solo 2 al mes") o con fecha de caducidad.
- Logros de equipo (nunca individuales): "10 planes hechos juntos", "primera meta conseguida"…
- ~~Modo sin puntos~~ → hecho en v0.7.0 (pausar al momento; reactivar = propuesta).

## Conexión (más allá de los puntos)
- ~~**Revisión semanal juntos**~~ → hecho en v0.8.0 (Plus).
- ~~Mapa del amor: preguntas para conoceros~~ → packs de preguntas en v0.8.0 (Plus). Más packs cuando se pidan.
- **Mapa del amor**: preguntas para conoceros mejor (gustos, miedos, sueños).
- Recordatorio de **fechas importantes** (aniversario, cumpleaños de las familias).

## Descartado (por salud de la pareja — ver docs/PSICOLOGIA.md)
- ~~Multas / restar puntos~~: castigar convierte la app en un instrumento de control.
- ~~Pujas por planes~~: fomenta competir por lo que debería decidirse juntos.
- ~~Rachas individuales~~: generan culpa y comparación.
- ~~Vales de "permiso" (salir con amigos, etc.)~~: el tiempo libre de cada uno no se compra.
- ~~Vale "deseo libre"~~ (quitado en v0.7.0): un vale abierto vuelve a los permisos y a presionar.
- ~~Marcador de puntos "tú contra tu pareja" en Inicio~~ (quitado en v0.7.0).
- ~~Comprar xurripoints con dinero / anuncios / vender datos~~ (v0.8, al pensar en monetizar): el cariño no tiene precio.

## Gastos
- Foto del ticket.
- ~~Exportar a CSV / resumen mensual por categoría con gráfico~~ → hecho en v0.8.0 (Plus).
- Varias divisas (viajes).
- Pagar una deuda de dinero con xurripoints (tipo de cambio pactado 😏).

## General
- Widget de Android con la meta juntos y las tareas de hoy.
- Publicar en Google Play (~~APK release firmado~~ v0.7; ~~borrar cuenta~~; ~~AAB, web legal, textos de la ficha~~ v0.8:
  falta que Joan cree la cuenta de Play Console → `docs/PLAY_STORE.md`).
- Iniciar sesión con Google.
