# Repo Commands and Repos Tooling (getrepo / updaterepos)

## Objective

Port the repo-management tooling from `../aramirez-ai` — the `getrepo` and `updaterepos` commands, their scripts, and the `repos.json` manifest — into the new `harness-ai` repository using a minimal `.opencode/` layout.

## Requirements

1. Copy `repos.json` (13 entries) verbatim from `../aramirez-ai/repos.json` — priority: high
2. Copy `.opencode/commands/getrepo.md` and `.opencode/commands/updaterepos.md` — priority: high
3. Copy `.opencode/scripts/getrepo.js` and `.opencode/scripts/updaterepos.js` — priority: high
4. Register `getrepo` and `updaterepos` commands in a minimal `opencode.json` — priority: high
5. Add `repos/` (and standard ignores) to `.gitignore` — priority: high
6. Add minimal `package.json` with a cross-platform `test` script (`node --test`) — priority: medium
7. Write failing tests first covering files, config registration, and script behavior — priority: high
8. Add `AGENTS.md` and `README.md` documenting the repo commands — priority: medium
9. Do NOT clone any repos during setup (user decision: clones happen later via `/getrepo` or `repos-sync`) — priority: high
10. Keep everything cross-platform (Node only, zero external dependencies, no shell syntax) — priority: high

## Architecture

### Files to create (in `harness-ai/`)
- `repos.json` — verbatim copy of `../aramirez-ai/repos.json`
- `.opencode/commands/getrepo.md` — verbatim copy
- `.opencode/commands/updaterepos.md` — verbatim copy
- `.opencode/scripts/getrepo.js` — verbatim copy (ROOT `join(__dirname,'..','..')` resolves to repo root from `.opencode/scripts/`)
- `.opencode/scripts/updaterepos.js` — verbatim copy
- `opencode.json` — minimal: `$schema`, `command` section with `getrepo` and `updaterepos` (description + template referencing `.opencode/scripts/`), `default_agent`, `instructions`
- `.gitignore` — `node_modules/`, `repos/`, `.env`, `*.log`, `.DS_Store`, `dist/`
- `package.json` — `{ "name": "harness-ai", "type": "module", "scripts": { "test": "node --test" }, "engines": { "node": ">=18" } }`
- `tests/helpers.js` — exports `REPO_ROOT` (resolved from `import.meta.url`)
- `tests/repos-commands.test.js` — the test suite (see TDD Flow)
- `AGENTS.md` — documents the two commands and script paths
- `README.md` — usage: `/getrepo <org/repo>`, `/updaterepos`, config via `repos.json`

### Files to modify
- None (new, empty repository)

### Decisions
- **Minimal layout**: only `.opencode/` is ported, no `shared/` hierarchy — per user decision.
- **`repos-sync.js` NOT ported**: it lives only in `shared/scripts/` upstream, is not a registered command, and was deemed out of scope ("only tooling and scripts, commands or related scripts").
- **Scripts copied byte-for-byte**: verified the ROOT path computation works identically from `.opencode/scripts/`.
- **No cloning during setup**: `repos/` stays empty and gitignored; repos are cloned on demand.
- **Tests use Node built-in `node:test` + `node:assert/strict`** — no framework dependency, cross-platform.
- **Security**: command templates verified to contain no dangerous patterns (no `eval`, no backtick injection, no `rm -rf /`, etc.).

## TDD Flow

1. **Write tests first** — `tests/repos-commands.test.js` asserting:
   - `repos.json` exists, is valid JSON array, has 13 entries, each with `name` + `url`
   - `.opencode/commands/getrepo.md` and `updaterepos.md` exist with frontmatter `description`
   - `.opencode/scripts/getrepo.js` and `updaterepos.js` exist
   - Command files reference `.opencode/scripts/` and do NOT reference `shared/scripts/`
   - `opencode.json` registers `getrepo` and `updaterepos` (description >= 10 chars, template >= 20 chars, template mentions the command topic)
   - Command templates contain no dangerous patterns
   - `opencode.json` has no unmatched `{{...}}` placeholders
   - `.gitignore` contains `repos/`
   - Scripts execute: run `node .opencode/scripts/getrepo.js --help` and `node .opencode/scripts/updaterepos.js --help`, assert exit code 0 and usage output
2. **Run `node --test`** → all tests FAIL (files do not exist yet) — red
3. **Implement** — copy the 5 source files, create `opencode.json`, `.gitignore`, `package.json`, `tests/helpers.js`, docs → run `node --test` → PASS — green
4. **Refactor** — verify scripts behave (help output), no refactor needed for verbatim copies — still PASS

## Verification

- [ ] `node --test` passes (all tests green)
- [ ] `node .opencode/scripts/getrepo.js --help` exits 0 and prints usage
- [ ] `node .opencode/scripts/updaterepos.js --help` exits 0 and prints usage
- [ ] `repos.json` is valid JSON with 13 entries (name + url)
- [ ] `opencode.json` registers `getrepo` and `updaterepos`
- [ ] `.gitignore` ignores `repos/`
- [ ] `AGENTS.md` / `README.md` updated
- [ ] Optional (no clones by default): `node .opencode/scripts/getrepo.js anthropics/skills` adds entry and clones to `repos/`
