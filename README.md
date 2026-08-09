# arnes-ai

Study repository about building **AI agent harnesses**. `docs/` is an Obsidian vault that serves as a living reference for anyone interested in learning how a harness works and how to build one — covering components, architectures, relationships, implementation details, comparisons, design guidelines, and design decisions.

## The vault

Open `docs/` as an Obsidian vault. Start at [[Home]] (entry point).

The study framework lives in `docs/harness-studies/`:

- **Criterio-de-Evaluacion** — the 16 dimensions (5 blocks) used to study every harness, the ✔/◐/✖/n/a observation scale, repo classification, and study order
- **Plantilla-Estudio-Harness** — the fixed template (sections 0–15) every harness study follows
- **Matriz-Comparativa** — the "apples to apples" comparison table: one row per dimension, one column per reference repo

Harness studies are done one at a time, in the order defined in the Criterio; each must pass the structural test in `tests/vault.test.js`.

## How study material is gathered

Four reference repositories are curated as read-only sources of patterns:

- `codeaashu/claude-code` — Claude Code setup and usage resources
- `openai/codex` — OpenAI Codex CLI
- `anomalyco/opencode` — opencode CLI configuration and workflows
- `earendil-works/pi` — agent tooling reference
- `betta-tech/byo-coding-agent` — building custom coding agents and tooling

They are declared in `repos.json` and cloned under `repos/` (gitignored) — never modify them directly; consult them for inspiration and cite them in notes.

## Repo management

Use the slash commands:

- **`/getrepo <org/repo>`** — adds the repository to `repos.json` and clones it to `repos/`. Supports `https://github.com/org/repo` and `org/repo` formats. Use `--description "text"` for a description.
- **`/updaterepos`** — pulls latest changes for all cloned reference repos. Update a single repo with `/updaterepos org/repo`.

### CLI scripts

```bash
node .opencode/scripts/getrepo.js https://github.com/anthropics/skills
node .opencode/scripts/getrepo.js anthropics/skills --description "Anthropic skills"
node .opencode/scripts/updaterepos.js
node .opencode/scripts/updaterepos.js anthropics/skills
```

## Development

```bash
npm test
```

Tests use the Node built-in test runner (`node --test`) — no external dependencies. All tooling is cross-platform (Node.js only).
