---
title: book-harness — Diagramas interactivos (Archify)
type: diagramas
repo: aaramirez/book-harness
tags:
  - diagramas
  - book-harness
  - archify
---

# book-harness — Diagramas interactivos (Archify)

[[BH-Arquitectura-y-Flujos]] · [[BH-10-Flujos-Empresariales]] · [[BH-Implementacion]]

Versión **navegable** de los diagramas Mermaid de las tres notas de arriba; las notas Mermaid siguen intactas. Se generaron con [Archify](https://github.com/tt-a1i/archify) (skill local `~/.agents/skills/archify`, v2.17) siguiendo el skill `estudio-visual` (`.claude/skills/estudio-visual/`).

- Cada HTML es autocontenido. Ábrelo en un navegador: Obsidian no renderiza HTML inline.
- La UI fija del visor (Legend, Export…) aparece en inglés; el contenido está en español.
- **Fuente editable:** `archify/<slug>.json`.
- **Artefacto entregado:** `archify/rendered/<slug>.html`.

## Arquitectura y flujos internos

| Diagrama | Tipo | Mermaid equivalente |
| --- | --- | --- |
| [Mapa de componentes: núcleo + enterprise](archify/rendered/bh-componentes.html) | architecture | [[BH-Arquitectura-y-Flujos]] §1 |
| [Frontera determinista / agéntica](archify/rendered/bh-frontera-determinista.html) | architecture | §2 |
| [Gobierno de una tool call](archify/rendered/bh-gobierno-tool-call.html) | workflow | §4 |
| [Ensamblado de contexto](archify/rendered/bh-ensamblado-contexto.html) | workflow | §6 |
| [Cómo se produce el libro](archify/rendered/bh-produccion-libro.html) | workflow | §8 |

**No se rehicieron**, porque el libro ya los trae como Archify con el mismo contenido. Los links funcionan en local, con el repo clonado en `repos/`:
- §3 camino feliz: [capitulo-12-integracion-camino-feliz](../../../repos/aaramirez/book-harness/diagrams/archify/rendered/capitulo-12-integracion-camino-feliz.html) y [un-agentrun-real](../../../repos/aaramirez/book-harness/diagrams/archify/rendered/un-agentrun-real.html).
- §5 estados: [estados-de-un-run](../../../repos/aaramirez/book-harness/diagrams/archify/rendered/estados-de-un-run.html).
- §7 turno gobernado: [turno-gobernado](../../../repos/aaramirez/book-harness/diagrams/archify/rendered/turno-gobernado.html) y [capitulo-26](../../../repos/aaramirez/book-harness/diagrams/archify/rendered/capitulo-26-integracion-enterprise-camino-feliz.html).

## 10 flujos empresariales

| # | Diagrama | Mermaid equivalente |
| --- | --- | --- |
| 1 | [Admisión de una activación externa](archify/rendered/bh-flujo-01-admision.html) | [[BH-10-Flujos-Empresariales]] Flujo 1 |
| 2 | [Aprobación humana dentro del turno](archify/rendered/bh-flujo-02-aprobacion-humana.html) | Flujo 2 |
| 3 | [Credencial que nunca ve el modelo](archify/rendered/bh-flujo-03-credencial.html) | Flujo 3 |
| 4 | [Side effect crítico sin duplicados](archify/rendered/bh-flujo-04-idempotencia.html) | Flujo 4 |
| 5 | [Kill switch con traspaso a humano](archify/rendered/bh-flujo-05-kill-switch.html) | Flujo 5 |
| 6 | [Escalamiento tras una denegación grave](archify/rendered/bh-flujo-06-escalamiento.html) | Flujo 6 |
| 7 | [Delegación acotada entre agentes](archify/rendered/bh-flujo-07-delegacion-agentes.html) | Flujo 7 |
| 8 | [Clasificación y retención de datos](archify/rendered/bh-flujo-08-gobierno-datos.html) | Flujo 8 |
| 9 | [Certificación antes de promover](archify/rendered/bh-flujo-09-certificacion.html) | Flujo 9 |
| 10 | [Evidencia de auditoría inmutable](archify/rendered/bh-flujo-10-auditoria.html) | Flujo 10 |

El libro trae además un diagrama **por capítulo**, enfocado en el componente (`capitulo-14`…`capitulo-24`). Los de aquí están planteados como **caso de uso** y se complementan con aquellos.

## Implementación en una empresa

| Diagrama | Tipo | Mermaid equivalente |
| --- | --- | --- |
| [Arquitectura de referencia](archify/rendered/bh-arquitectura-referencia.html) | architecture | [[BH-Implementacion]] §1 |
| [Orden de construcción (CH-25)](archify/rendered/bh-orden-construccion.html) | workflow | §2 |
| [Plan de implementación por fases](archify/rendered/bh-plan-implementacion.html) | workflow | §5 |

## Diferencias frente a la versión Mermaid

**Agrupaciones:**
- `bh-componentes`: los 22 componentes caben en 12 nodos. El núcleo queda en 3 nodos más EventBus, la capa enterprise en 5 nodos por plano, y los nombres reales van en las etiquetas.
- `bh-arquitectura-referencia`: 18 nodos quedan en 12. Control agrupa OperationalController, HandoffCoordinator y EvaluationHarness; SessionManager va con AuditLedger, e IdempotencyGuard con DataGovernanceEngine.
- `bh-frontera-determinista`: las capacidades agénticas y los controles deterministas van de a dos por nodo.

**Secuencias:**
- Los **auto-mensajes** de Mermaid pasan a notas, segmentos o cards.
- Las ramas `alt/else` pasan a segmentos o a mensajes de retorno con su condición en la etiqueta. En el flujo 9 las dos ramas CERTIFIED se fusionan.
- Los nombres de función largos (`interruptGovernedEnterpriseRunWithKillSwitch`…) quedan como un participante corto, con el identificador en una card.
- Las marcas **Preview** del libro se mantienen visibles.

**Workflows:**
- En `bh-gobierno-tool-call` las decisiones ALLOW / DENY / REQUIRE_APPROVAL son etiquetas de arista.
- En `bh-produccion-libro` el mainPath termina en los validadores y el build va en una fila aparte.
- En `bh-orden-construccion` las aristas laterales van sin etiqueta; su significado está en una card.

**Citas:** viven en cards "Evidencia", con `chNN:líneas` relativas a `repos/aaramirez/book-harness/`. Los tres diagramas `architecture` fijan el commit `d16e2c7` en `meta.repository` y verificaron sus citas contra él.

## Estado de verificación

- **`validate --quality showcase`:** 18/18, cada uno con 9/9 checks, 0 errores y 0 warnings. Se revalidaron todos al cierre con `archify-check.js`.
- **`deliver`:** 18/18 con recibo SHA-256.
- **`visual-check`:** 18/18 sin scroll en 1440×900, 1600×1000, 1920×1080 y 2048×1320.
- **Revisión perceptual:** pendiente. Se miraron capturas de `bh-componentes` (claro) y del flujo 5 (oscuro), y se ven bien.

**Defectos visuales conocidos:**
- En las secuencias, el texto de los mensajes se ve pequeño (~8–9 px a 1440).
- Algunas etiquetas de participante rozan su ícono: OperationalController, AgentCommunicationGateway y Transport Adapter.
- En `bh-gobierno-tool-call` algunas etiquetas de nodo quedan truncadas (`resumeTurn…`), con el nombre completo en las cards.
- En `bh-componentes`, EventBus queda fuera del recuadro del núcleo; la etiqueta lo aclara.
- En el flujo 9 la leyenda queda pegada al último segmento, y en los planes queda una franja vacía bajo la leyenda en pantallas grandes.

**Regenerar un diagrama:**

```bash
node ~/.agents/skills/archify/bin/archify.mjs validate <tipo> docs/diagramas/book-harness/archify/<slug>.json --quality showcase --json
node ~/.agents/skills/archify/bin/archify.mjs deliver  <tipo> docs/diagramas/book-harness/archify/<slug>.json docs/diagramas/book-harness/archify/rendered/<slug>.html --quality showcase --json
node ~/.agents/skills/archify/bin/archify.mjs visual-check docs/diagramas/book-harness/archify/rendered/<slug>.html --json
node .claude/skills/estudio-visual/scripts/archify-check.js docs/diagramas/book-harness/archify --repo-root repos/aaramirez/book-harness
```

Los `architecture` requieren `--repo-root repos/aaramirez/book-harness`.

---

[[BH-Arquitectura-y-Flujos]] · [[Matriz-Comparativa]]
