# Prompts para los agentes

Reemplaza `<…>`. Pasa siempre rutas absolutas. Los agentes no ven la conversación: el prompt debe ser autosuficiente.

## A. Exploración (agente `Explore`, 2–3 en paralelo)

Divide el objetivo por capas. Por ejemplo:
1. núcleo o runtime (loop, estados, contratos, contexto, proveedor, tools);
2. capa empresarial o de seguridad (auth, aprobaciones, multi-tenant, auditoría, integraciones);
3. estructura, pipeline e inventario (layout, build, CLI o despliegue, diagramas ya existentes, git HEAD).

```text
Read-only research in <ABS_PATH>/repos/<org>/<repo> (<una línea: qué es>). Never modify files.
Thoroughness: very thorough.

I will draw diagrams from your report, so I need precise, faithful facts with evidence citations
`path:line` (relative to repo root; only cite lines you actually read). Do not invent calls.

Extract:
1. <tema>: <qué preguntar: orden de llamadas con nombres exactos, participantes, estados y
   transiciones con quién las causa, rutas de fallo/denegación, eventos emitidos>
2. ...
Also: inventory of any existing diagrams (paths + titles) and `git log -1 --format="%H %cd"`.

Report: organized by item, terse bullets, each fact with citations. Under <1500> words.
```

## B. Archify (agente `general-purpose`, 4–5 en paralelo, 3–4 diagramas cada uno)

```text
You are authoring Archify diagrams. Archify is a local skill/CLI at `C:/Users/Home/.agents/skills/archify`
(run as `node C:/Users/Home/.agents/skills/archify/bin/archify.mjs ...`). FIRST read its SKILL.md completely
and follow its "Fast authoring path" exactly: read only the matching schema in `schemas/`,
`schemas/common.schema.json` and one matching example; write the candidate first; set
`meta.quality_profile: "showcase"`; validate after every edit with
`validate <type> <file> --quality showcase --json` until 0 errors, 0 warnings and all 9 artifact checks;
then `deliver <type> <json> <html> --quality showcase --json`; then `visual-check <html> --json`.
Skip the update-awareness check (the parent handles it). Stop repairing a diagram if two consecutive
rounds don't improve the best error count, and report truthfully.

Known constraints (save time):
- sequence: self-messages are rejected (0px span). Fold them into a neighbouring message note,
  a segment label or a card. To fit 1440x900 without scroll you will likely need: no participant
  sublabels, `meta.column_fit: "spread"`, a wide viewBox (1080–1560) at most ~740 tall, and message
  spacing of 28–36px. Message notes are not visible in the static view, so repeat key facts in cards.
- lifecycle: schema v1 only. Lanes not literally named "main" or "terminal" collapse into one shared
  middle band; phase columns 0..4 sit on the main rail; event/terminal column N (0..2) sits under main
  column N+2. Self-loops cannot be drawn; describe them in a card.
- workflow: schema_version 2; act on the `--layout-json` compiler diagnostic.
- architecture: at most ~12 primary nodes (group and explain the grouping in a card). If you cite
  `sources`, set `meta.repository` (url + commit `<HEAD_SHA>`) and pass
  `--repo-root <ABS_PATH>/repos/<org>/<repo>` to validate and deliver.
- Use your own subfolder of the scratchpad for temp files: other agents share it.

Project: <ABS_PATH> (an Obsidian study vault). Source content is in existing Mermaid notes. Read them
for meaning and DO NOT modify them:
- <ABS_PATH>/docs/diagramas/<slug>/<nota>.md
Facts come from <ABS_PATH>/repos/<org>/<repo> (read-only). Do not invent participants, components or
calls beyond what the notes say. You may compress, and must document what you compressed. Put the
notes' Evidencia citations `repos/<org>/<repo>/<path>:<line>` into cards/sources where the schema allows.

Language: all authored text in Spanish; keep code identifiers, routes, commands and product names as-is.
Omit `meta.locale` (the viewer UI falls back to English; mention it in your report). Omit `meta.subtitle`,
`meta.visual_preset` and `meta.legend`.

Write files ONLY under <ABS_PATH>/docs/diagramas/<slug>/archify/ (JSON) and .../archify/rendered/ (HTML).
Create dirs if missing. Touch only your slugs.

Your diagrams:
1. `<diagrama>` (type `<tipo>`) — <nota> section/flow "<título>". <indicaciones de agrupación si aplica>
2. ...

Final report (under 450 words): per slug — type, JSON path, HTML path, final validate summary
(checks/errors/warnings), deliver SHA-256 receipt (spec + artifact), visual-check status,
compressions/simplifications vs the Mermaid source, and known visual defects. Report failures honestly.
```
