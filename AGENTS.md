# arnes-ai

## Purpose

`arnes-ai` is a **study repository** about building **AI agent harnesses**. It serves as a living reference — an Obsidian vault in `docs/` — for anyone interested in learning how a harness works and how to build one.

Study topics covered include: components, architectures, relationships between components, implementation details, comparisons, design guidelines, and design decisions.

## How study material is gathered

Five reference repositories are curated as read-only sources of patterns and implementation detail:

| Repo | Purpose |
| --- | --- |
| `codeaashu/claude-code` | Claude Code setup and usage resources |
| `openai/codex` | OpenAI Codex CLI |
| `anomalyco/opencode` | opencode CLI — configuration and workflows |
| `earendil-works/pi` | Agent tooling reference |
| `betta-tech/byo-coding-agent` | Reference for building custom coding agents and tooling |

- `repos.json` is the manifest of these reference repos (name, url, optional description).
- Clones live under `repos/` (gitignored). They are **reference material only — never modify files inside `repos/` directly**; consult them for inspiration and patterns.

## The vault

- `docs/` is an Obsidian vault holding study notes and analysis (architecture, components, guidelines, decisions, comparisons).
- Notes should link to each other with Obsidian wikilinks (`[[...]]`) and cite the reference repos when they describe patterns drawn from them.
- The vault entry point is `docs/Home.md`.

## Harness Study Framework

When studying a reference harness, follow the homogeneous framework in `docs/harness-studies/`:

- [[Criterio-de-Evaluacion]] — the 16 study dimensions (5 blocks), the observation scale (✔/◐/✖/n/a), repo classification, and study order. Single source of criteria — do not duplicate the dimension guides.
- [[Plantilla-Estudio-Harness]] — the fixed section layout every study note must follow verbatim (sections 0–15, `##` headers, same order). Each section = **Hallazgo** + **Evidencia** citing `repos/<org>/<repo>/<path>:<line>`.
- [[Matriz-Comparativa]] — one row per dimension, one column per repo in `repos.json`; update the relevant cell when a study lands.

Rules:
- Study notes live in `docs/harness-studies/<slug>.md` and must pass the structural test `tests/vault.test.js`.
- The rubric is descriptive (markers, not scores). Never modify files inside `repos/` — cite them only.

## Available commands

| Command | Description |
| --- | --- |
| `/getrepo` | Add a GitHub repository to `repos.json` and clone it to `repos/` |
| `/updaterepos` | Pull latest changes for all reference repositories in `repos/` |

Both commands run scripts under `.opencode/scripts/` (zero external dependencies, cross-platform).

## Available skills

| Skill | Description |
| --- | --- |
| `estudio-visual` (`.claude/skills/estudio-visual/`) | Build a visual study set for a harness or technical content: 3 evidence-cited Mermaid notes (architecture & internal flows, 10 enterprise flows, implementation) in `docs/diagramas/<slug>/`, plus their interactive Archify version (JSON + validated HTML) and an index note. Reference output: `docs/diagramas/vercel-eve/`. |

`.claude/skills/estudio-visual/scripts/archify-check.js <dir-archify> [--repo-root repos/<org>/<repo>]` revalidates every Archify source in a set and checks its rendered HTML exists.

## Available scripts

| Script | Description |
| --- | --- |
| `.opencode/scripts/getrepo.js` | Add a repo to `repos.json` and clone it (`--description "text"` optional) |
| `.opencode/scripts/updaterepos.js` | `git pull --ff-only` all cloned repos (or a specific `org/repo`) |

## Development

- Run tests: `npm test` (`node --test`)
- All code, scripts, and tooling must run on macOS, Linux, and Windows — Node.js only, no shell dependencies.
