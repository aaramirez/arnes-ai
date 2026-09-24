---
name: estudio-visual
description: >-
  Produce un set completo de diagramas de estudio para un harness, framework o contenido técnico
  (libro, especificación, repo de referencia) del vault arnes-ai. El set incluye tres notas Mermaid
  con evidencia `repos/<org>/<repo>/<path>:<line>`: arquitectura y flujos internos, 10 flujos de uso
  empresarial paso a paso, e implementación en una empresa. Además genera su versión interactiva con
  Archify (JSON + HTML validado) y una nota índice. Úsalo cuando el usuario pida "diagramas de cómo
  funciona X", "flujos empresariales de X", "cómo implemento X en mi empresa", "haz lo mismo que con
  eve para X", "diagramas con archify de X", o un estudio visual de cualquier repo en repos.json.
---

# Estudio visual de un harness o contenido

Replica el proceso usado con `vercel/eve` (ver `docs/diagramas/vercel-eve/`): comprender el objetivo con evidencia, dibujarlo en Mermaid, convertirlo a Archify interactivo y dejar todo enlazado y testeado.

Referencias de este skill:
- `references/plantillas.md` — esqueletos de las 4 notas y reglas Mermaid seguras.
- `references/prompts-agentes.md` — prompts probados para los agentes de exploración y de Archify.
- `scripts/archify-check.js` — revalida todas las fuentes Archify de un set y comprueba que exista su HTML.

## Entradas

- **Objetivo**: `org/repo` (o URL). Si no está en `repos.json`, se agrega con `node .opencode/scripts/getrepo.js <org/repo> --description "..."`. Eso obliga a actualizar la columna de `docs/harness-studies/Matriz-Comparativa.md` y el conteo y la lista esperada de `tests/repos-commands.test.js`.
- **Slug**: `<org>-<repo>` o el nombre corto del proyecto (p.ej. `vercel-eve`, `book-harness`). Todo el set vive en `docs/diagramas/<slug>/`.
- **Alcance**: por defecto se hace el set completo. Si el usuario pide solo una parte (p.ej. "solo los flujos"), haz solo esa, y confirma cuando el pedido sea ambiguo.

## Fase 1 — Comprender con evidencia

1. **Clasifica el objetivo.** Puede ser (a) un harness o framework ejecutable, (b) un contenido o especificación (p.ej. un libro con pseudocódigo) o (c) una lista de recursos. La clasificación decide el tono de las notas:
   - en (a), la nota de implementación trata de **desplegar** el software;
   - en (b), trata de **construir** la arquitectura descrita, con un orden de construcción y un mapeo a tecnología real;
   - en (c), probablemente no aplica el set completo; díselo al usuario.
2. **Mide el tamaño.** Revisa `ls`, el README, el índice de docs y `wc -l`. Busca también **diagramas que ya existan** en el objetivo (`diagrams/`, `docs/`, `*.archify`, `*.json` de Archify). No los dupliques: tus diagramas deben ser vistas transversales que enlacen a los existentes.
3. **Lanza 2–3 agentes `Explore` en paralelo** usando los prompts de `references/prompts-agentes.md` (núcleo/runtime, capa empresarial/seguridad, pipeline/estructura/inventario). Exige citas `path:line` verificadas y hechos fieles; no se inventan llamadas.
4. **Verifica una muestra de citas** (~15–20) con `sed -n` antes de escribir. Si alguna no coincide, corrígela o descártala.
5. **Opcional:** si el objetivo es un harness y aún no tiene estudio, ofrece el estudio formal en `docs/harness-studies/<slug>.md` según [[Plantilla-Estudio-Harness]] y [[Criterio-de-Evaluacion]]. Debe pasar `tests/vault.test.js` y llenar su columna en la Matriz.

## Fase 2 — Set Mermaid (fuente de verdad legible)

Crea en `docs/diagramas/<slug>/` las notas de `references/plantillas.md`:

| Nota | Contenido |
| --- | --- |
| `<Prefijo>-Arquitectura-y-Flujos.md` | 6–8 diagramas: mapa de componentes con frontera de confianza, ciclo de una solicitud o turno, máquina de estados, durabilidad/fallos, decisiones internas clave (p.ej. compactación, política), auth o gobierno, topología o pipeline |
| `<Prefijo>-10-Flujos-Empresariales.md` | Tabla resumen + 10 flujos. Cada uno con objetivo, `sequenceDiagram` con `autonumber`, **paso a paso con la misma numeración**, qué configurar o qué componentes intervienen, puntos de control y evidencia |
| `<Prefijo>-Implementacion.md` | Arquitectura de referencia, tabla de lo que da el objetivo frente a lo que falta, componentes faltantes por prioridad, plan por fases y checklist. Marca **[doc]** frente a **[inferencia]** |

Reglas:
- Toda nota del vault abre con frontmatter YAML con al menos `title`; los tests lo exigen para todo `docs/**/*.md`.
- **No pongas notas de diagramas en `docs/harness-studies/`**: ahí cada `.md` se valida como estudio de 16 secciones.
- Cada diagrama lleva debajo sus líneas de **Evidencia** `repos/<org>/<repo>/<path>:<line>`.
- Separa lo documentado de tus recomendaciones. Una inferencia nunca se presenta como hecho.
- Sigue las reglas de sintaxis Mermaid de `references/plantillas.md`.
- Enlaza las notas entre sí, desde el estudio del objetivo (si existe) y desde `docs/Home.md` (sección "Notas del vault").

## Fase 3 — Set Archify (interactivo)

Archify es un skill/CLI local en `~/.agents/skills/archify`. Genera HTML autocontenido desde un JSON tipado.

1. Ejecuta `node ~/.agents/skills/archify/bin/archify.mjs doctor`. Si falla o no existe, informa al usuario y detente en esta fase; no instales nada sin preguntar.
2. **Un diagrama Archify por cada diagrama Mermaid**, salvo los que el objetivo **ya tenga como Archify** con el mismo contenido. Esos se enlazan en la nota índice en lugar de rehacerlos (p.ej. `book-harness` ya traía estados, camino feliz y turno gobernado). El tipo se mapea así:
   - `flowchart` de componentes → `architecture`;
   - `flowchart` de proceso o decisión → `workflow` (schema v2);
   - `sequenceDiagram` → `sequence`;
   - `stateDiagram` → `lifecycle` (solo schema v1).

   Slugs: `<prefijo>-<tema>`. Los flujos van como `<prefijo>-flujo-NN-<tema>`.
3. **Reparte el trabajo entre 4–5 agentes `general-purpose` en paralelo**, con 3–4 diagramas cada uno, usando el prompt Archify de `references/prompts-agentes.md`. Rutas:
   - fuentes en `docs/diagramas/<slug>/archify/<diagrama>.json`;
   - HTML en `docs/diagramas/<slug>/archify/rendered/<diagrama>.html`.

   Cada agente toca **solo sus slugs**. Ejecuta tú el chequeo de actualización (`node ~/.agents/skills/archify/scripts/check-update.mjs`) una vez, no los agentes. Si reporta `update_available`, avisa al usuario siguiendo el SKILL.md de Archify y no actualices nada.
4. Asegura que `.gitignore` tenga `docs/diagramas/**/archify/rendered/*.visual-check.*`.
5. **Verifica tú mismo** (no te quedes con los reportes de los agentes):
   - `node .claude/skills/estudio-visual/scripts/archify-check.js docs/diagramas/<slug>/archify --repo-root repos/<org>/<repo>`: todos deben quedar `ok` y con HTML.
   - Mira al menos 2 capturas `rendered/*.visual-check.1440x900.*.png` con Read, una clara y una oscura.
6. Crea `<Prefijo>-Diagramas-Archify.md` (plantilla en `references/plantillas.md`). Debe incluir:
   - tablas con links relativos a cada HTML y su equivalente Mermaid;
   - las diferencias frente a Mermaid (compresiones);
   - el estado de verificación (validate / deliver / visual-check / revisión perceptual pendiente);
   - los defectos conocidos que reporten los agentes;
   - cómo regenerar.

## Fase 4 — Cierre

1. `npm test` debe pasar.
2. Reporta al usuario:
   - qué notas y cuántos diagramas se crearon, y dónde están;
   - el estado honesto de la verificación, incluidos los defectos visuales conocidos y que la revisión perceptual está pendiente;
   - que la UI del visor Archify queda en inglés (solo localiza `en` y `zh-CN`);
   - el peso aproximado de los HTML (~800 KB cada uno);
   - que no se ha hecho commit.
3. **No hagas commit ni push sin que el usuario lo pida.** Si lo pide y estás en `main`, crea antes una rama `feat/<slug>-diagramas`, haz push de esa rama y ofrece el merge.

## Lecciones aprendidas (Archify)

Estas restricciones de Archify obligan a comprimir respecto de Mermaid. Documenta cada compresión en la nota índice.

- **Sin auto-mensajes** en `sequence` (el renderer rechaza un span de 0px). Los `A->>A` de Mermaid pasan a la nota del mensaje vecino, a la etiqueta de un segmento o a una card.
- **Límite de ~12 nodos primarios.** Agrupa (p.ej. los canales en un nodo) y aclara en una card lo que agrupaste.
- **Debe caber sin scroll en 1440×900** (`visual-check`). En sequence esto suele exigir:
  - quitar los sublabels de los participantes;
  - usar `column_fit: "spread"`;
  - un viewBox ancho (1080–1560) de ≤ ~740 de alto;
  - separar los mensajes 28–36px.
  Las `note` de los mensajes no se ven en la vista estática, así que lo importante va también en cards.
- **lifecycle**: solo schema v1. Las lanes que no se llaman literalmente `main` o `terminal` colapsan en una sola banda intermedia, y los auto-lazos no se dibujan.
- **workflow**: usa schema v2 y actúa según el diagnóstico de `--layout-json`.
- **Citas**: los diagramas `architecture` con `sources` requieren `meta.repository` (URL + commit del objetivo) y `--repo-root repos/<org>/<repo>` en validate/deliver. Obtén el commit con `git -C repos/<org>/<repo> rev-parse HEAD`.
- **Idioma**: contenido en español, sin `meta.locale`. La UI del visor cae a inglés; decláralo.
- **Scratchpad compartido**: pide a cada agente trabajar en su propia subcarpeta del scratchpad.
- **Citas largas** pueden desbordar su card. No las cortes; anótalo como defecto conocido.
