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

[[BH-Arquitectura-y-Flujos]] · [[BH-10-Flujos-Empresariales]] · [[BH-Implementacion]] · [[BH-Estado-Implementacion]]

Versión **navegable** de los diagramas Mermaid de las tres notas de arriba, para book-harness **v0.3** (commit `59288a1`). Las notas Mermaid siguen siendo la fuente legible. Se generaron con [Archify](https://github.com/tt-a1i/archify) (skill local `~/.agents/skills/archify`, v2.17.0-dev.1) siguiendo el skill `estudio-visual` (`.claude/skills/estudio-visual/`).

- Cada HTML es autocontenido (~800 KB). Ábrelo en un navegador: Obsidian no renderiza HTML inline.
- La UI fija del visor (Legend, Export…) aparece en inglés; el contenido está en español.
- **Fuente editable:** `archify/<slug>.json`.
- **Artefacto entregado:** `archify/rendered/<slug>.html`.
- **Regeneración:** el 2026-10-12 se rehicieron los 21 diagramas para la v0.3. El set anterior (v0.1, `d16e2c7`) queda en el historial de git.

## Arquitectura y flujos internos

| Diagrama | Tipo | Mermaid equivalente |
| --- | --- | --- |
| [Mapa de componentes v0.3](archify/rendered/bh-componentes.html) | architecture | [[BH-Arquitectura-y-Flujos]] §1 |
| [Frontera determinista / agéntica + v1.2](archify/rendered/bh-frontera-determinista.html) | architecture | §2 |
| [Turno conectado (CH-49)](archify/rendered/bh-turno-conectado.html) | sequence | §3 |
| [Gobierno de una tool call v0.3](archify/rendered/bh-gobierno-tool-call.html) | workflow | §4 |
| [Estados de un AgentRun v0.3](archify/rendered/bh-estados-run.html) | lifecycle | §5 |
| [Recuperación tras una caída](archify/rendered/bh-recuperacion.html) | workflow | §6 |
| [Ensamblado de contexto v0.3](archify/rendered/bh-ensamblado-contexto.html) | workflow | §7 |
| [Cómo se produce el libro v0.3](archify/rendered/bh-produccion-libro.html) | workflow | §8 |

Los diagramas del libro complementan estos. Los links funcionan en local, con el repo clonado en `repos/`:
- [capitulo-49-integracion-conectada](../../../repos/aaramirez/book-harness/diagrams/archify/rendered/capitulo-49-integracion-conectada.html), la vista del capítulo del §3.
- [capitulo-36-integracion-turno-durable](../../../repos/aaramirez/book-harness/diagrams/archify/rendered/capitulo-36-integracion-turno-durable.html), el turno durable.
- [capa-enterprise](../../../repos/aaramirez/book-harness/diagrams/archify/rendered/capa-enterprise.html), la capa enterprise en la v0.3: 18 componentes y 7 aristas reales (actualizado en `45b3da6`).
- [estados-de-un-run](../../../repos/aaramirez/book-harness/diagrams/archify/rendered/estados-de-un-run.html), los estados con PAUSED producido (actualizado en `45b3da6`).

## 10 flujos empresariales

| # | Diagrama | Mermaid equivalente |
| --- | --- | --- |
| 1 | [Admisión por principal y continuación](archify/rendered/bh-flujo-01-admision.html) | [[BH-10-Flujos-Empresariales]] Flujo 1 |
| 2 | [Aprobación durable con aviso al aprobador](archify/rendered/bh-flujo-02-aprobacion-durable.html) | Flujo 2 |
| 3 | [Credencial del usuario: autorización y egress](archify/rendered/bh-flujo-03-credencial.html) | Flujo 3 |
| 4 | [Efecto con resultado desconocido tras una caída](archify/rendered/bh-flujo-04-efecto-incierto.html) | Flujo 4 |
| 5 | [Kill switch y apagado de una extensión](archify/rendered/bh-flujo-05-kill-switch.html) | Flujo 5 |
| 6 | [Mensajes que llegan durante el turno](archify/rendered/bh-flujo-06-entradas-durante-turno.html) | Flujo 6 |
| 7 | [Invocación durable entre agentes](archify/rendered/bh-flujo-07-invocacion-agentes.html) | Flujo 7 |
| 8 | [Datos gobernados y trazas por audiencia](archify/rendered/bh-flujo-08-gobierno-datos.html) | Flujo 8 |
| 9 | [Certificación con lift](archify/rendered/bh-flujo-09-certificacion.html) | Flujo 9 |
| 10 | [Conectar un servidor MCP](archify/rendered/bh-flujo-10-conexion-mcp.html) | Flujo 10 |

El libro trae además un diagrama **por capítulo**, enfocado en el componente (`capitulo-28`…`capitulo-49` para la v0.2 y la v0.3). Los de aquí están planteados como **caso de uso** y se complementan con aquellos.

## Implementación en una empresa

| Diagrama | Tipo | Mermaid equivalente |
| --- | --- | --- |
| [Arquitectura de referencia v0.3](archify/rendered/bh-arquitectura-referencia.html) | architecture | [[BH-Implementacion]] §1 |
| [Orden de construcción (CH-25, tramos 0–5)](archify/rendered/bh-orden-construccion.html) | workflow | §2 |
| [Plan de implementación por fases](archify/rendered/bh-plan-implementacion.html) | workflow | §5 |

## Diferencias frente a la versión Mermaid

**Agrupaciones:**
- **`bh-componentes`:** los 29 componentes caben en 8 nodos, más integración, LLM y sistemas externos. Las cuatro funciones de integración son un solo nodo. EventBus recibe las aristas de 3 nodos y no de los 5 componentes nombrados.
- **`bh-arquitectura-referencia`:** 21 nodos quedan en 12:
  - las fuentes con Ingress Adapters, y AdmissionController con ContinuationRegistry;
  - SessionManager con AuditLedger;
  - CredentialBroker, IdempotencyGuard, DataGovernanceEngine y RetrievalEngine en uno;
  - ConnectionManager, AgentCommunicationGateway y LLM en uno;
  - OperationalController, HandoffCoordinator y EvaluationHarness en uno.

  La certificación va en una card.
- **`bh-frontera-determinista`:** 13 nodos. Las aristas entre grupos salen del nodo central de cada grupo.
- **`bh-gobierno-tool-call`:** 18 nodos quedan en 10:
  - el default de aprobación de una conexión va dentro de la arista REQUIRE_APPROVAL;
  - la credencial faltante es una etiqueta de arista;
  - las tres formas de ejecución (aislada, conexión, agente) son un nodo, detallado en una card.
- **`bh-recuperacion`:** los 6 resultados de `decideStepRecovery` quedan en 4 nodos: REPLAY_RECORDED va con COMMIT_RECORDED, y REEXECUTE_MODEL_CALL con CLOSE_WITH_PARTIAL.
- **`bh-ensamblado-contexto`:** 13 nodos quedan en 12 (fuentes con `scopeFor`). El hueco de los bloques gobernados es una arista punteada con su propia card.
- **`bh-produccion-libro`:** "rojo" y registros son un nodo. El fallo y la aprobación humana comparten una banda de "desvíos", así que la aprobación se ve como excepción.
- **`bh-plan-implementacion`:** las fases ocupan dos bandas, y la checklist de 19 puntos queda en 2 cards con IDs agrupados.

**Secuencias:**
- **Auto-mensajes:** los de Mermaid pasan a la etiqueta del mensaje vecino, a notas, segmentos o cards (flujos 2, 6, 7, 9 y 10). En el flujo 9 los cuatro pasos internos de EvaluationHarness quedan en un segmento y dos cards, sin inventar llamadas.
- **Ramas `alt/else`:** pasan a segmentos o a mensajes de retorno con la condición en la etiqueta (flujos 1 y 4).
- **`bh-turno-conectado`:** conserva los 11 participantes y los 13 mensajes. Se acortan dos nombres: `AdmissionCtrl` y `ContinuationReg`.
- **Ramas no dibujadas y hallazgos:** van en cards (§3, §5 y flujos 3 y 8).

**Estados:** `bh-estados-run` dibuja los 11 estados. Algunas transiciones van sin etiqueta porque el sublabel del estado destino nombra el disparador, y una card lo explica.

**Citas:**
- Viven en cards "Evidencia", con `chNN:líneas` relativas a `repos/aaramirez/book-harness/`.
- Los tres diagramas `architecture` fijan el commit `59288a1` en `meta.repository` y verificaron sus `sources` contra él. `bh-componentes` verificó 15.

## Estado de verificación

- **`validate --quality showcase`:** 21/21, cada uno con 9/9 checks, 0 errores y 0 warnings. Se revalidaron todos al cierre con `archify-check.js`.
- **`deliver`:** 21/21 con recibo SHA-256.
- **`visual-check`:** 21/21 sin scroll en 1440×900, 1600×1000, 1920×1080 y 2048×1320.
- **Revisión perceptual:** pendiente. Se miraron capturas de `bh-componentes` (claro) y de `bh-turno-conectado` (oscuro), y se ven bien. Los agentes revisaron las capturas claras de 1440 de los suyos.

**Defectos visuales conocidos:**
- **Secuencias:**
  - el texto de los mensajes se ve pequeño a 1440, sobre todo en `bh-turno-conectado`, con viewBox de 1560;
  - algunos nombres largos rozan su ícono: AgentCommunicationGateway, HumanInteractionService, ResumptionCoordinator, `runConnectedGovernedStep` y `openConnectedGovernedTurn`;
  - en los flujos 3 y 4 el título ocupa dos líneas;
  - en el flujo 1 y el 3 la leyenda queda pegada al último segmento;
  - en el flujo 9 el segmento central es una banda vacía con solo su etiqueta;
  - los flujos 2, 5 y 7 usan el estilo rojo "security" para los pasos que hacen cumplir una regla. Es una elección de estilo, no una afirmación del libro.
- **`bh-estados-run`:**
  - el renderer dibuja una línea de riel entre WAITING_FOR_TOOL y COMPLETED que **no** es una transición;
  - PAUSED→RUNNING comparte corredor y color con RUNNING→COMPLETED.
- **Workflows:** algunas aristas dan rodeos. En `bh-gobierno-tool-call`, resolución→política pasa por debajo. En `bh-recuperacion`, "toolCall sin toolResult" pasa por arriba. En `bh-ensamblado-contexto`, la arista "sí" también pasa por arriba.
- **Arquitectura:**
  - en `bh-componentes` no se ven los `tag` de los nodos y el sublabel más chico mide ~6 px;
  - en `bh-arquitectura-referencia` el sublabel del núcleo se corta con "…", y la lista completa está en una card.
- **Espacio vacío:** queda una franja vacía bajo la leyenda en `bh-orden-construccion`, que es una tira baja de 1232×282, y en los flujos 5 y 6.

**Hallazgos del libro que los diagramas señalan** (no son defectos del diagrama):
- **Corregidos en `b687f2c`:**
  - en CH-49, `contextBlocks` no llegaba a `invokeModelForTurn`;
  - en CH-37, `parkForMissingCredential` no ponía el run en PAUSED.

  Los cinco diagramas afectados (`bh-turno-conectado`, `bh-ensamblado-contexto`, `bh-estados-run` y los flujos 3 y 8) se volvieron a entregar con cards "Corregido".
- **Corregido en `45b3da6`:** el plano de CredentialBroker en CH-25 (`ch25:334`) ahora coincide con CH-16 y con el registro. Los cards de `bh-componentes` y `bh-orden-construccion` se volvieron a entregar.

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
