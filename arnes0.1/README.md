# arnes0.1

A small, hackable coding-agent harness in TypeScript — a study port of
[betta-tech/byo-coding-agent](https://github.com/betta-tech/byo-coding-agent).
The Go original is ~1,000 lines with chapter-length notes on *why* each piece
exists; this port mirrors its structure and behavior so the same ideas can be
studied in a language that strips away the ceremony.

Zero runtime dependencies. The Anthropic provider is a plain `fetch` adapter
(`src/provider/anthropic.ts`) — there is no SDK in the loop.

## Layout

| Path | What it is |
| --- | --- |
| `src/api/types.ts` | Shared message/block/usage types. No internal deps. |
| `src/provider/` | `Provider` interface + the Anthropic adapter. The only file that knows the wire format. |
| `src/tool/` | `Tool` interface, `Registry`, one file per tool (bash, read_file, write_file). Tools self-register via module side effects. |
| `src/compact/` | Compaction strategies: noop, sliding window, summarize, plus a logging decorator. |
| `src/agent/` | The agent loop + the unified-diff helpers that feed the write_file approval modal. |
| `src/commands.ts` | Slash-command registry (`/help`, `/model`, `/tools`, `/tokens`, `/compact`, ...). |
| `src/main.ts` | Wiring: root Agent, permission gate, REPL, AGENTS.md into the system prompt. |
| `test/` | Node's built-in test runner — one file per area, driven by a `MockProvider`. |

## Run

```sh
export ANTHROPIC_API_KEY=sk-ant-...
npm start              # or: npm run start -- --env-file=.env
```

- Type `> /help` for slash commands, `Ctrl+C` or `/exit` to quit.
- Every tool call goes through a permission gate. `write_file` calls show a
  unified diff before you approve.
- `AGENTS.md` (if present) is appended to the system prompt at startup.

## Develop

```sh
npm test               # node --test (type-stripped .ts, no build step)
npm run typecheck      # tsc --noEmit
```

Tests never touch the network: `MockProvider` returns canned responses, and
the Anthropic adapter tests inject a stubbed `fetchFn`.

## Study notes

The `..\docs\` Obsidian vault at the repo root (`arnes-ai`) is the living
reference for the harness concepts this port exercises: the provider seam,
tool registration, safe compaction boundaries, the permission gate, and the
agent loop itself.
