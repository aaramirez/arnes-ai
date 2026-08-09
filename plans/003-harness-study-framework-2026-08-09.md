# Harness Study Framework (estructura homogénea + criterio de evaluación)

## Objective

Define, in the `docs/` vault, the homogeneous study structure and evaluation criteria we will apply to every reference harness — so we can study them one by one and compare "peras con peras".

## Requirements

1. Define the **Criterio de Evaluación**: a fixed set of study dimensions, each with a "qué observar" guide, so every harness is analyzed along the same axes — priority: high
2. Define a **homogeneous per-harness template** (same numbered sections for all studies; a single-format note per harness) — priority: high
3. Create **`docs/Home.md`** (the vault entry point promised by `AGENTS.md` but currently missing) linking to the framework, template, and comparison matrix — priority: high
4. Create the **Matriz Comparativa**: a table (rows = dimensions, columns = harnesses) that gets filled in as each study lands, enabling side-by-side comparison — priority: high
5. Every study note must use **Obsidian wikilinks** (`[[...]]`) and **cite evidence** from the read-only clones (`repos/<org>/<repo>/<path>:<line>`) — priority: high
6. Classify the 5 reference repos up front (harness / CLI / tooling / resources) and propose a **study order** — one at a time — priority: medium
7. Enforce homogeneity mechanically with a structural test (`tests/vault.test.js`) so no study can drift from the template — priority: high
8. Use an **observation scale** (✔ / ◐ / ✖ / n/a) as summary markers per dimension — descriptive, not a 0–10 score — priority: medium
9. Languages: plan documents in English (existing `plans/` convention); vault content in Spanish (existing vault note + user language) — priority: medium
10. Update `AGENTS.md` and `README.md` to document the study framework — priority: medium
11. This plan's execution covers the **framework only**; harness studies are follow-ups done one at a time (first: betta-tech/byo-coding-agent) — priority: high

## Architecture

### Files to create

```
docs/Home.md                                   # vault entry point (missing today) — hub of the vault
docs/harness-studies/Criterio-de-Evaluacion.md # the rubric: dimensions + "qué observar" + scale
docs/harness-studies/Plantilla-Estudio-Harness.md # the homogeneous template (one note per harness)
docs/harness-studies/Matriz-Comparativa.md     # table: dimensiones × harnesses (skeleton now, filled later)
tests/vault.test.js                            # structural test enforcing homogeneity (see TDD Flow)
```

### Files to modify

- `AGENTS.md` — document the study convention (folder, template, matrix, test)
- `README.md` — point to `docs/Home.md` and the study framework

### Decisiones (diseño del marco de estudio)

- **Evaluación descriptiva, no ranking.** Cada dimensión responde *qué hace, cómo, con qué evidencia*; el marcador ✔/◐/✖/n/a resume presencia/calidad sin falsa precisión numérica. Comparar peras con peras = mismo set de preguntas + evidencia citada, no puntajes arbitrarios.
- **16 dimensiones en 5 bloques** (ver Criterio-de-Evaluacion): Identidad (1–2), Arquitectura (3–5), Núcleo del runtime (6–9), Gobernanza (10–12), Extensibilidad/UX y síntesis (13–16).
- **El Criterio es la única fuente de las preguntas.** La plantilla no repite las guías: cada nota de estudio responde las secciones con *Hallazgo + Evidencia* — notas ligeras y homogéneas.
- **Matriz comparativa como acumulador**: filas = 16 dimensiones + valoración, columnas = harness; se actualiza al terminar cada estudio; es el artefacto para comparar "peras con peras".
- **Escala de observación**: ✔ presente y resuelto / ◐ presente pero parcial o simple / ✖ ausente / n/a no aplica a esta categoría.
- **Clasificación de los repos y orden de estudio (uno a uno)**:
  1. `betta-tech/byo-coding-agent` — harness completo (single-agent, Go) — **ancla: ya lo portamos a `harness-ts/`**
  2. `anomalyco/opencode` — harness/CLI (el que estamos usando ahora)
  3. `openai/codex` — CLI de coding agent (production)
  4. `earendil-works/pi` — agent tooling / TUI library + harness
  5. `codeaashu/claude-code` — recursos/workflows, NO codebase → se estudia con una variante "workflows" (dimensiones 6–12 marcadas n/a) o se excluye; decidir en el estudio
- **Idioma del vault**: español (consistente con `docs/Arquitectura_Agent_Harness_inspirado_en_Pi.md`); términos técnicos en inglés.

### Secciones de la plantilla (mismas en todos los estudios)

```
0. Ficha (categoría, propósito, lenguaje, licencia/madurez, por qué nos interesa)
1. Estructura del repo
2. Capas y componentes
3. Flujo end-to-end
4. Contratos internos (Provider / Tool / Message / Compactor / ...)
5. Agent loop
6. Mensajes y contexto
7. Provider seam
8. Tool runtime
9. Permisos y seguridad
10. Compaction / gestión de contexto
11. Subagentes / orquestación
12. UI / presentación
13. Configuración y extensibilidad
14. Decisiones de diseño destacadas (con citas a archivos)
15. Valoración y lecciones
```
Cada sección: **Hallazgo** + **Evidencia** (`repos/<org>/<repo>/<path>:<line>`). Encabezado: tabla resumen dimensión → estado (✔/◐/✖/n/a) que alimenta la Matriz.

## TDD Flow

Para un repositorio de documentación, los "tests" son estructurales: garantizan que el marco existe y que ningún estudio se desvía de la plantilla.

1. **Write tests → FAIL (red)**: `tests/vault.test.js` (Node `node:test`, ya cubierto por el glob del `npm test` raíz) que verifica:
   - `docs/Home.md` existe y enlaza (wikilinks) al Criterio, la Plantilla y la Matriz
   - `Criterio-de-Evaluacion.md` define las 16 dimensiones y la escala de observación
   - `Plantilla-Estudio-Harness.md` declara exactamente las secciones requeridas (parsable por encabezados `##`)
   - `Matriz-Comparativa.md` tiene una fila por dimensión y una columna por repos de `repos.json`
   - **Por cada nota de estudio existente** (`docs/harness-studies/*.md`, excluyendo plantilla/criterio/matriz): contiene TODAS las secciones requeridas, al menos una evidencia que cite `repos/`, y un wikilink a `[[Matriz-Comparativa]]`
2. **Implement → PASS (green)**: crear el marco (Home.md + Criterio + Plantilla + Matriz + AGENTS.md/README.md) → `npm test` verde
3. **Refactor → pilot**: (follow-up, tras revisión) redactar el primer estudio — `betta-tech/byo-coding-agent` — con la plantilla y citas reales a `repos/betta-tech/...`; re-correr `npm test` → sigue verde. El test estructural ya pasa porque se autocomprueba el contrato.

## Verification

- [ ] `npm test` desde la raíz pasa (incluye `tests/vault.test.js`)
- [ ] `docs/Home.md` existe y es la entrada del vault (enlaza Criterio, Plantilla, Matriz)
- [ ] `Criterio-de-Evaluacion.md` lista las 16 dimensiones con "qué observar" y la escala ✔/◐/✖/n/a
- [ ] `Plantilla-Estudio-Harness.md` tiene exactamente las secciones 0–15 del marco
- [ ] `Matriz-Comparativa.md` skeleton: 16 filas + valoración, una columna por harness de `repos.json`
- [ ] Clasificación y orden de estudio de los 5 repos documentados (en el Criterio o en Home)
- [ ] `AGENTS.md` / `README.md` actualizados con la convención de estudio
- [ ] Primer estudio (betta-tech/byo-coding-agent) redactado con la plantilla y evidencia citada (follow-up)

## Notas

- Este plan NO crea estudios de harness todavía; solo el marco. El usuario revisa y aprueba antes de ejecutar.
- Los estudios se hacen uno a uno; cada uno es su propio ciclo pequeño (redactar → verificar test estructural → revisar).
