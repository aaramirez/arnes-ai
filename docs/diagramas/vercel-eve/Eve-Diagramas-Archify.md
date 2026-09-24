---
title: eve — Diagramas interactivos (Archify)
type: diagramas
repo: vercel/eve
tags:
  - diagramas
  - eve
  - archify
---

# eve — Diagramas interactivos (Archify)

[[vercel-eve]] · [[Eve-Arquitectura-y-Flujos]] · [[Eve-10-Flujos-Empresariales]] · [[Eve-Implementacion-Self-Hosted]]

Versión **navegable** de los diagramas Mermaid de las tres notas de arriba. Las notas Mermaid se mantienen intactas; esta es una capa aparte.

Los diagramas se generaron con [Archify](https://github.com/tt-a1i/archify) (skill local `~/.agents/skills/archify`, v2.17). Cada HTML es autocontenido (SVG inline) e incluye:
- pan/zoom, búsqueda, foco y trazado de relaciones;
- tema claro/oscuro;
- exportación a PNG/SVG.

Ábrelos en un navegador. Obsidian no renderiza HTML inline: el link abre la aplicación del sistema.

- **Fuente editable:** `archify/<slug>.json`.
- **Artefacto entregado:** `archify/rendered/<slug>.html`.
- **Idioma:** el contenido está en español. La UI fija del visor (Legend, Export…) aparece en inglés, porque Archify solo localiza `en` y `zh-CN`.

## Cómo funciona eve

| Diagrama | Tipo | Mermaid equivalente |
| --- | --- | --- |
| [Mapa de componentes](archify/rendered/eve-componentes.html) | architecture | [[Eve-Arquitectura-y-Flujos]] §1 |
| [Ciclo de vida de una solicitud HTTP](archify/rendered/eve-ciclo-solicitud.html) | sequence | §2 |
| [Estados de sesión, turno y paso](archify/rendered/eve-estados-sesion.html) | lifecycle | §3 |
| [Durabilidad ante un crash](archify/rendered/eve-durabilidad-crash.html) | sequence | §4 |
| [Decisión de compactación](archify/rendered/eve-decision-compaction.html) | workflow | §5 |
| [Resolución de auth de entrada](archify/rendered/eve-auth-walk.html) | workflow | §6 |
| [Topologías de despliegue](archify/rendered/eve-topologias-despliegue.html) | architecture | §7 |

## 10 flujos empresariales

| # | Diagrama | Mermaid equivalente |
| --- | --- | --- |
| 1 | [Chat web interno con SSO](archify/rendered/eve-flujo-01-chat-sso.html) | [[Eve-10-Flujos-Empresariales]] Flujo 1 |
| 2 | [Asistente en Slack / Teams](archify/rendered/eve-flujo-02-slack-teams.html) | Flujo 2 |
| 3 | [Aprobación humana de una acción sensible](archify/rendered/eve-flujo-03-aprobacion-humana.html) | Flujo 3 |
| 4 | [OAuth por usuario a un sistema externo](archify/rendered/eve-flujo-04-oauth-usuario.html) | Flujo 4 |
| 5 | [Integración backend a backend](archify/rendered/eve-flujo-05-backend-a-backend.html) | Flujo 5 |
| 6 | [Reporte programado con subagentes](archify/rendered/eve-flujo-06-reporte-programado.html) | Flujo 6 |
| 7 | [Agente como servidor MCP](archify/rendered/eve-flujo-07-servidor-mcp.html) | Flujo 7 |
| 8 | [Router multi-agente por dominio](archify/rendered/eve-flujo-08-router-multiagente.html) | Flujo 8 |
| 9 | [Multi-tenant seguro](archify/rendered/eve-flujo-09-multi-tenant.html) | Flujo 9 |
| 10 | [Recuperación ante fallos y redeploys](archify/rendered/eve-flujo-10-recuperacion-fallos.html) | Flujo 10 |

## Implementación fuera de Vercel

| Diagrama | Tipo | Mermaid equivalente |
| --- | --- | --- |
| [Arquitectura de referencia self-hosted](archify/rendered/eve-arquitectura-self-hosted.html) | architecture | [[Eve-Implementacion-Self-Hosted]] §1 |
| [Plan de implementación por fases](archify/rendered/eve-plan-self-hosted.html) | workflow | §4 |

## Diferencias frente a la versión Mermaid

Archify impone reglas de legibilidad que Mermaid no tiene:
- como máximo unos 12 nodos principales;
- sin mensajes de un participante a sí mismo;
- el diagrama debe caber sin scroll en 1440×900.

Por eso algunos diagramas están **comprimidos**, sin inventar componentes ni llamadas:
- Los **auto-mensajes** de Mermaid (p.ej. "verifica firma", "maybeCompact", "re-ejecuta el paso 3") pasaron a notas del mensaje vecino, a la etiqueta del segmento o a una card.
- **Agrupaciones:** en `eve-componentes` los 6 canales son un solo nodo. En `eve-arquitectura-self-hosted` se agrupan clientes, identidad, bóvedas, modelos y observabilidad, y las dependencias se dibujan desde un solo agente (una card aclara que aplican a ambos).
- **Estados:** en `eve-estados-sesion` los auto-lazos (Paso→Paso, steering) y algunos disparadores quedan descritos en cards, no como flechas.
- **Citas** (`repos/vercel/eve/...:línea`): viven en las cards. Los diagramas de arquitectura, además, fijan el commit de eve `055f1d1` en `meta.repository` y verificaron sus citas contra él.

## Estado de verificación

- **`validate --quality showcase`:** 19/19 pasan, 9/9 checks, 0 errores y 0 warnings. Se re-validaron todos al cierre.
- **`deliver`:** 19/19 con recibo SHA-256 de especificación y artefacto.
- **`visual-check`:** 19/19 pasan la contención sin scroll en 1440×900, 1600×1000, 1920×1080 y 2048×1320, en claro y oscuro. Las evidencias (`*.visual-check.*`) están en `.gitignore`.
- **Revisión perceptual:** pendiente. Solo se miraron algunas capturas a 1440×900.

Defectos visuales menores conocidos:
- flujo 3: una cita larga desborda su card;
- flujos 7 y 9: la leyenda queda pegada al último segmento;
- flujo 9: dos etiquetas de participante rozan su ícono;
- `eve-estados-sesion`: el estado Fallida queda justo encima de la banda terminal.

**Regenerar un diagrama** (tras editar su JSON):

```bash
node ~/.agents/skills/archify/bin/archify.mjs validate <tipo> docs/diagramas/vercel-eve/archify/<slug>.json --quality showcase --json
node ~/.agents/skills/archify/bin/archify.mjs deliver  <tipo> docs/diagramas/vercel-eve/archify/<slug>.json docs/diagramas/vercel-eve/archify/rendered/<slug>.html --quality showcase --json
node ~/.agents/skills/archify/bin/archify.mjs visual-check docs/diagramas/vercel-eve/archify/rendered/<slug>.html --json
```

Los diagramas de arquitectura requieren `--repo-root repos/vercel/eve` porque verifican sus citas.

---

[[vercel-eve]] · [[Matriz-Comparativa]]
