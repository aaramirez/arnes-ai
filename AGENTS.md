# harness-ai

This repository manages reference repositories for AI agent workflows using the `getrepo` and `updaterepos` commands.

Reference repositories are declared in `repos.json` (project root) and cloned under `repos/` (gitignored). They are read-only sources of patterns, scripts, and examples.

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
