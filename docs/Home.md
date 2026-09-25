---
title: Home
tags:
  - vault
  - index
---

# Home

Bienvenido al vault de estudio de **arnes-ai** — un repositorio de estudio sobre cómo funcionan y cómo se construyen los **AI agent harnesses**.

Aquí consolidamos análisis, arquitecturas, decisiones de diseño, comparaciones y lecciones aprendidas estudiando los repositorios de referencia (clonados en `repos/`).

## Cómo navegar el vault

- [[Criterio-de-Evaluacion]] — las 16 dimensiones con las que estudiamos cada harness, la escala de observación y la clasificación de los repos de referencia
- [[Plantilla-Estudio-Harness]] — la plantilla homogénea que sigue cada estudio de harness
- [[Matriz-Comparativa]] — comparación "peras con peras": una fila por dimensión, una columna por harness

## Estudios

| Estudio | Categoría | Estado |
| --- | --- | --- |
| [[vercel-eve]] | harness completo (agentes durables) | publicado |
| *pendiente — betta-tech/byo-coding-agent* | harness completo | próximamente |

## Comparativas

- [[Eve-vs-BookHarness-vs-Pi]] — qué tiene eve que no tienen book-harness ni pi, y 10 lecciones de eve que les faltan a ambos (`docs/comparativas/`)

## Propuestas

- [[BH-Propuestas]] — diseño para incorporar a book-harness las lecciones de eve ([[BH-Propuesta-Lecciones-eve]]) y los aportes de pi ([[BH-Propuesta-Aportes-pi]]): planos, componentes, contratos, capítulos CH-28..43, Amendment v1.2 y ADRs (`docs/propuestas/book-harness/`)

## Notas del vault

- Diagramas de eve (`docs/diagramas/vercel-eve/`): [[Eve-Arquitectura-y-Flujos]] · [[Eve-10-Flujos-Empresariales]] · [[Eve-Implementacion-Self-Hosted]] · interactivos: [[Eve-Diagramas-Archify]]
- Diagramas de book-harness (`docs/diagramas/book-harness/`): [[BH-Arquitectura-y-Flujos]] · [[BH-10-Flujos-Empresariales]] · [[BH-Implementacion]] · interactivos: [[BH-Diagramas-Archify]]
- [[Arquitectura_Agent_Harness_inspirado_en_Pi]] — diseño conceptual de un agent harness inspirado en Pi

## Repos de referencia

Los cinco repos de `repos.json`, clonados en `repos/` (solo lectura — nunca modificarlos):

| Repo | Categoría |
| --- | --- |
| `betta-tech/byo-coding-agent` | harness completo |
| `anomalyco/opencode` | harness / CLI |
| `openai/codex` | CLI de coding agent |
| `earendil-works/pi` | agent tooling / TUI + harness |
| `codeaashu/claude-code` | recursos / workflows |
