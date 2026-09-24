---
title: Matriz Comparativa
type: framework
tags:
  - framework
  - matriz
---

# Matriz Comparativa

Comparación "peras con peras" de los harnesses de referencia. **Una fila por dimensión** ([[Criterio-de-Evaluacion]]) y **una columna por harness** de `repos.json`. Cada celda resume el hallazgo del estudio correspondiente (o el marcador ✔ / ◐ / ✖ / n/a); las celdas `—` se completan al publicarse cada estudio.

| # | Dimensión | `codeaashu/claude-code` | `openai/codex` | `anomalyco/opencode` | `earendil-works/pi` | `betta-tech/byo-coding-agent` | `OpenHands/OpenHands` | `ai-boost/awesome-harness-engineering` | `continuedev/continue` | `Ancienttwo/repo-harness` | `RyanAlberts/best-of-Agent-Harnesses` | `block/buzz` | `Aider-AI/aider` | `aaramirez/book-harness` | `vercel/eve` | `yibie/awesome-jev` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | Ficha | — | — | — | — | — | — | — | — | — | — | — | — | — | ✔ framework de agentes durables, TS, Apache-2.0, beta | — |
| 1 | Estructura del repo | — | — | — | — | — | — | — | — | — | — | — | — | — | ✔ monorepo pnpm; core en packages/eve/src | — |
| 2 | Capas y componentes | — | — | — | — | — | — | — | — | — | — | — | — | — | ✔ compiler / Nitro / channels / workflow / sandbox | — |
| 3 | Flujo end-to-end | — | — | — | — | — | — | — | — | — | — | — | — | — | ✔ channel→auth→workflow→step→NDJSON | — |
| 4 | Contratos internos | — | — | — | — | — | — | — | — | — | — | — | — | — | ✔ define* por subpath + protocolo de eventos | — |
| 5 | Agent loop | — | — | — | — | — | — | — | — | — | — | — | — | — | ✔ 1 llamada/step, durable; sin maxSteps, caps de tokens | — |
| 6 | Mensajes y contexto | — | — | — | — | — | — | — | — | — | — | — | — | — | ✔ prompt compuesto + DurableSession + memoria por slots | — |
| 7 | Provider seam | — | — | — | — | — | — | — | — | — | — | — | — | — | ✔ AI SDK; AI Gateway o provider directo | — |
| 8 | Tool runtime | — | — | — | — | — | — | — | — | — | — | — | — | — | ✔ defineTool/defineWorkflowTool, background, errores como datos | — |
| 9 | Permisos y seguridad | — | — | — | — | — | — | — | — | — | — | — | — | — | ✔ auth fail-closed, HITL, sandbox aislado; sin ACL de sesión | — |
| 10 | Compaction / gestión de contexto | — | — | — | — | — | — | — | — | — | — | — | — | — | ✔ umbral 90%, recorte + resumen, ventana 10 | — |
| 11 | Subagentes / orquestación | — | — | — | — | — | — | — | — | — | — | — | — | — | ✔ subagentes locales/remotos, presupuesto repartido | — |
| 12 | UI / presentación | — | — | — | — | — | — | — | — | — | — | — | — | — | ◐ TUI dev + hooks React/Vue/Svelte; sin UI final | — |
| 13 | Configuración y extensibilidad | — | — | — | — | — | — | — | — | — | — | — | — | — | ✔ convención de archivos, registry, extensions, hooks, MCP/OpenAPI | — |
| 14 | Decisiones de diseño destacadas | — | — | — | — | — | — | — | — | — | — | — | — | — | ✔ durabilidad, split app/sandbox, channels como borde | — |
| 15 | Valoración y lecciones | — | — | — | — | — | — | — | — | — | — | — | — | — | ✔ apto empresa con reservas (beta, self-host HA) | — |
| V | Global | — | — | — | — | — | — | — | — | — | — | — | — | — | ✔ harness de producción multicanal | — |

## Leyenda

- **✔** presente y bien resuelto · **◐** parcial/simple · **✖** ausente · **n/a** no aplica (ej. `codeaashu/claude-code` en dimensiones del runtime)
- Detalle y evidencia en cada estudio: la fila remite al hallazgo; la evidencia vive en la nota de estudio correspondiente.

## Estudios

- betta-tech/byo-coding-agent — pendiente
- anomalyco/opencode — pendiente
- openai/codex — pendiente
- earendil-works/pi — pendiente
- codeaashu/claude-code — pendiente
- OpenHands/OpenHands — pendiente
- ai-boost/awesome-harness-engineering — pendiente
- continuedev/continue — pendiente
- Ancienttwo/repo-harness — pendiente
- RyanAlberts/best-of-Agent-Harnesses — pendiente
- block/buzz — pendiente
- Aider-AI/aider — pendiente
- aaramirez/book-harness — pendiente
- [[vercel-eve]] — publicado (2026-09-23)
- yibie/awesome-jev — pendiente

[[Home]] · [[Criterio-de-Evaluacion]] · [[Plantilla-Estudio-Harness]]
