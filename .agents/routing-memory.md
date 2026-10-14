# Memoria de routing (patrón → ruta → acierto/fallo)

> Una línea por tarea, según el Model Routing Playbook (`~\.config\opencode\AGENTS.md`).
> Sirve para que `triage` rutee mejor la próxima vez en **este** proyecto.

- v0.9.0: calendario + color por persona + tema neutro + 8 arreglos de una revisión externa (app.js, logic.js, styles.css, firestore.rules, pruebas) → `worker` por volumen + `code-reviewer` como revisor externo, **sin `triage`** (el trabajo ya venía especificado por Joan) → acierto: 31 pruebas OK, navegador sin errores, y la revisión externa pilló un fallo real antes de publicar (clase CSS de los puntos `cd-dots` vs `cal-dots`) y 12 hallazgos en la revisión previa del estado de partida (2026-10-14).
- Revisión de un proyecto ya hecho (leer docs, correr pruebas, mirar CI y release) → `general` + `code-reviewer` en segundo plano, **sin `triage`** (no hay cambio que rutear) → acierto: encontró el modo demo bloqueado (`firebase-config.js` en `PEGA_AQUI`) y 3 fallos medios de datos (2026-10-14).
