# harness-ai

Repo management tooling for opencode: add and sync GitHub reference repositories.

## Usage

Use the slash commands in opencode:

- **`/getrepo <org/repo>`** — adds the repository to `repos.json` and clones it to `repos/`.
  Supports `https://github.com/org/repo` and `org/repo` formats. Use `--description "text"` for a description.

- **`/updaterepos`** — pulls latest changes for all cloned reference repos. Update a single repo with `/updaterepos org/repo`.

## Configuration

Repos are declared in `repos.json` at the project root:

```json
[
  {
    "name": "anthropics/skills",
    "url": "https://github.com/anthropics/skills.git",
    "description": "Anthropic official example skills"
  }
]
```

Clones live under `repos/<org>/<repo>/` and are gitignored — never modify them directly.

## CLI scripts

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
