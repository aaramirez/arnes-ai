# harness-ai

## Purpose

`harness-ai` is a **study repository** about building **AI agent harnesses**. It serves as a living reference — an Obsidian vault in `docs/` — for anyone interested in learning how a harness works and how to build one.

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

## Available commands

| Command | Description |
| --- | --- |
| `/getrepo` | Add a GitHub repository to `repos.json` and clone it to `repos/` |
| `/updaterepos` | Pull latest changes for all reference repositories in `repos/` |

Both commands run scripts under `.opencode/scripts/` (zero external dependencies, cross-platform).

## Available scripts

| Script | Description |
| --- | --- |
| `.opencode/scripts/getrepo.js` | Add a repo to `repos.json` and clone it (`--description "text"` optional) |
| `.opencode/scripts/updaterepos.js` | `git pull --ff-only` all cloned repos (or a specific `org/repo`) |

## Development

- Run tests: `npm test` (`node --test`)
- All code, scripts, and tooling must run on macOS, Linux, and Windows — Node.js only, no shell dependencies.
