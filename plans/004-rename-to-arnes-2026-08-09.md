# Rename to arnes (identificadores: raíz -> arnes-ai, código -> arnes0.1)

## Objective

Rename the project identifiers to Spanish: the repo root folder `harness-ai` becomes `arnes-ai`, and the TypeScript code directory `harness-ts` becomes `arnes0.1`. Scope is **identifiers only** (directory names, package names, config, paths, temp prefixes, repo-name references) — the English term "harness" as a concept stays untouched (study framework, template titles, code comments, prose).

## Requirements

1. Rename code directory `harness-ts/` -> `arnes0.1/` — priority: high
2. Rename the repo root folder `harness-ai` -> `arnes-ai` (this is the current working directory; see Execution order) — priority: high
3. Root `package.json`: `"name": "harness-ai"` -> `"arnes-ai"`; test glob `harness-ts/test/*.test.*` -> `arnes0.1/test/*.test.*` — priority: high
4. `arnes0.1/package-lock.json`: `"name": "harness-ts"` -> `"arnes"` (matches the already-renamed `package.json` name) — priority: high
5. `arnes0.1/README.md`: title `# harness-ts` -> `# arnes0.1`; repo-root reference `harness-ai` -> `arnes-ai` — priority: medium
6. Root `README.md` and `AGENTS.md`: title `# harness-ai` -> `# arnes-ai` — priority: medium
7. `docs/Home.md`: `**harness-ai**` -> `**arnes-ai**` — priority: medium
8. Temp-dir prefixes in `arnes0.1/test/*.test.ts`: `harness-ts-` -> `arnes0.1-` (tool, diff, agent, compact tests) — priority: medium
9. `plans/001`, `002`, `003`: leave as historical records — do NOT rewrite the dated plan documents (decision; user may veto) — priority: low
10. Keep concept term "harness" as-is everywhere: `docs/harness-studies/`, `Plantilla-Estudio-Harness.md`, `tests/vault.test.js` (`docs/harness-studies` path), `src/*.ts` comments/prompts, `Arquitectura_Agent_Harness_inspirado_en_Pi.md` — priority: high (non-negotiable per user scope)

## Architecture

### Files/dirs to rename
- `harness-ts/` -> `arnes0.1/` (everything inside moves with it: src/, test/, package.json, tsconfig.json, README.md, package-lock.json, .gitignore, .env, .env.example, node_modules/)
- root folder `harness-ai` -> `arnes-ai`

### Files to edit (identifier occurrences only)
- `package.json` (root) — name + test glob
- `harness-ts/package-lock.json` — name
- `harness-ts/README.md` — title + repo-root reference
- `README.md` (root) — title
- `AGENTS.md` — title
- `docs/Home.md` — repo-name reference
- `harness-ts/test/tool.test.ts`, `diff.test.ts`, `agent.test.ts`, `compact.test.ts` — `mkdtemp` prefixes

### Files intentionally left with "harness"
- `docs/harness-studies/` (folder), `Plantilla-Estudio-Harness.md`, `tests/vault.test.js`
- all `src/*.ts` and `test/*.ts` concept wording (comments, system prompt, help text)
- `docs/Arquitectura_Agent_Harness_inspirado_en_Pi.md` (concept note)
- `plans/*.md` (historical)

### Decisions
- `harness-ts/package.json` already declares `"name": "arnes"` — no change needed there; the lockfile is the one that's stale.
- The npm package name stays `arnes` (not `arnes0.1`); only the directory is `arnes0.1`.
- Renaming the root folder changes the session's working directory. All commands after that rename must run with an explicit `workdir` pointing at the new root `C:\Users\Alexander Ramirez\Documents\P\arnes-ai`.
- No commit is made (user has uncommitted work; user didn't request a commit).

### Execution order (safety: root rename LAST)
1. Edit content files using current absolute paths (root still `harness-ai`).
2. Rename `harness-ts` -> `arnes0.1`.
3. Rename root folder `harness-ai` -> `arnes-ai` via `Rename-Item` from the parent directory.
4. Verify with explicit `workdir` on the new root.

## TDD Flow

This is a rename, so the "test" is the existing suite plus targeted grep checks:

1. **Write checks -> FAIL (red)**: (no new tests needed — the suite is the contract) baseline `npm test` at the root; `grep` confirms `harness-ai`/`harness-ts` identifiers still present.
2. **Implement -> PASS (green)**: apply renames + edits.
3. **Refactor -> re-verify**: `npm test` from the new root (`workdir = arnes-ai`) passes — the glob `"arnes0.1/test/*.test.*"` must resolve; `tests/vault.test.js` still green (study-framework paths unchanged); `grep -r harness-ai|harness-ts` returns no identifier hits (concept "harness" hits expected).

## Verification

- [ ] `C:\Users\Alexander Ramirez\Documents\P\arnes-ai` exists with `arnes0.1/` inside; no `harness-ts` or root `harness-ai` folder remains
- [ ] `npm test` (root, new path) — all suites green (102 tests), including the `.ts` harness tests via the updated glob
- [ ] No occurrence of `harness-ai` or `harness-ts` left anywhere (config, docs, tests, temp prefixes)
- [ ] Concept term "harness" intact in `docs/harness-studies/`, `Plantilla-Estudio-Harness.md`, `src/*.ts`, prose
- [ ] `harness-ts/package.json` name `arnes` already correct; lockfile updated to match
- [ ] Root `package.json` name `arnes-ai`, test glob points at `arnes0.1/`

## Notas

- Plan documents (001–003) are treated as dated records and left untouched; if you want the identifiers inside them updated too, say so in review.
- After the root rename, future commands in this session must target the new root path explicitly.
