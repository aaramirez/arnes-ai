# TypeScript Agent Harness (harness-ts/)

## Objective

Port the coding-agent harness taught by [byoharness.dev](https://www.byoharness.dev/es/index.html#why) (and implemented in Go at `repos/betta-tech/byo-coding-agent/`) into a self-contained, zero-runtime-dependency TypeScript project under `harness-ts/`, built phase by phase with failing-tests-first (TDD).

## Requirements

1. Keep the harness fully self-contained in `harness-ts/` (own `package.json`, `tsconfig.json`, `src/`, `test/`) — priority: high
2. Zero runtime dependencies: run `.ts` directly via Node native type stripping (engines >= 23.6); `typescript` allowed as a devDependency only for `tsc --noEmit` typecheck — priority: high
3. Follow the Go architecture faithfully: `api` message types, `Provider` interface, `Tool`/`Registry`, agent loop with permission gate, compaction strategies, memory store, subagents, MCP client, slash commands, REPL — priority: high
4. Mirror the Go conventions: errors returned as tool results (not exceptions), tools one-file-per-tool, provider abstraction sealed at the adapter boundary, comments explain *why* — priority: medium
5. Cross-platform (macOS, Linux, Windows): shell tool picks `cmd /c` on win32 else `sh -c`; no POSIX-only CLI usage — priority: high
6. Tests runnable from the repo root (`npm test`) covering both the existing repo tooling (`tests/`) and the harness (`harness-ts/test/`) — priority: high
7. Fix the broken root `npm test`: `node --test` (no args) currently recurses into `repos/` clones and times out; scope discovery explicitly — priority: high
8. Each phase ends with green tests + `npm run typecheck` clean, then a commit checkpoint (with user approval) — priority: medium
9. Update `AGENTS.md` and `README.md` to document `harness-ts/` and its commands — priority: medium
10. Document the implementation in the `docs/` vault with a note linking to the harness source (study-repo goal) — priority: low

## Architecture

### Where the code lives

```
harness-ts/
  package.json        # name "harness-ts", type module, scripts: test / typecheck / start
  tsconfig.json       # strict, noEmit, module NodeNext, erasableSyntaxOnly, verbatimModuleSyntax, allowImportingTsExtensions
  .gitignore          # node_modules/
  src/
    api/types.ts            # Role, Block, Message, ToolDef, StopReason, Response, Usage, renderTranscript, hasToolResult
    provider/provider.ts    # Provider interface (+ usage accounting methods)
    provider/mock.ts        # MockProvider — scripted responses, no network (tests)
    provider/anthropic.ts   # Anthropic Messages API adapter over global fetch + prompt caching (cache_control)
    provider/openai.ts      # OpenAI Chat Completions adapter over global fetch
    tool/tool.ts            # Tool interface, ToolResult type
    tool/registry.ts        # Registry (register/get/subset/definitions/execute) + Default registry
    tool/bash.ts            # shell tool — cross-platform command execution
    tool/readfile.ts        # read_file tool
    tool/writefile.ts       # write_file tool (goes through permission gate)
    tool/remember.ts        # remember tool → memory.Default.save
    tool/recall.ts          # recall tool → memory.Default.recall
    compact/strategy.ts     # CompactionStrategy interface + safeSplitPoint helper
    compact/noop.ts         # NoCompaction (identity)
    compact/slidingwindow.ts# SlidingWindow (keep last N at a safe boundary)
    compact/summarize.ts    # Summarize (provider call replaces old turns with a summary)
    compact/logging.ts      # LoggingDecorator (wrap any strategy, log before/after)
    memory/store.ts         # Entry, kinds, Store interface, NoMemory, Default
    memory/sessionfiles.ts  # SessionFiles store — .harness dir, index.json, recent-sessions preamble
    subagent/subagent.ts    # Subagent interface, Registry, Default, active tracker
    subagent/research.ts    # Research subagent (own Agent, read-only tools subset)
    subagent/delegate.ts    # DelegateTool — exposes a subagent to the model as a tool
    mcp/config.ts           # load mcp.json (server definitions)
    mcp/client.ts           # MCP client — JSON-RPC over stdio (initialize / tools/list / tools/call)
    mcp/register.ts         # connect configured servers, register their tools into a Registry
    agent/agent.ts          # Agent: messages slice, send(), tool-use loop, executeTool + permission gate
    agent/diff.ts           # buildWriteDiff / extractWritePath for write_file approval
    commands.ts             # slash-command registry (help, exit, compact, clear, verbose, model, provider, tokens, agents, memory)
    ui/banner.ts            # ASCII banner
    ui/repl.ts              # REPL: prompt, streaming, approval prompt + diff modal, command dispatch
    main.ts                 # wiring: AGENTS.md → system prompt, memory preamble, provider from env, tools, subagents, REPL, shutdown summary
  test/                     # node --test discovers *.test.ts here
    api.test.ts
    provider.test.ts
    tool.test.ts
    agent.test.ts
    compact.test.ts
    memory.test.ts
    subagent.test.ts
    mcp.test.ts
    commands.test.ts
    repl.test.ts
    smoke.test.ts
```

### Files to modify (outside `harness-ts/`)

- `package.json` (root) — `"test": "node --test \"tests/*.test.js\" \"harness-ts/test/*.test.js\""`; `"engines": { "node": ">=23.6" }` (type stripping requirement). Note: bare directory args (`node --test tests/`) are treated as a module by this Node version and fail; explicit glob patterns are required.
- `AGENTS.md` — document `harness-ts/`, the `npm test` command (both suites), and the typecheck command
- `README.md` — mention `harness-ts/` as the hands-on implementation, pointing at `plans/002-...` and `docs/`
- (Phase 3, low) `docs/` — new vault note on the TypeScript harness, wikilinked from `docs/Home.md`

### Decisions

- **Location `harness-ts/`**: user decision — keeps the harness fully self-contained, separate from `repos.json`/`.opencode/` tooling.
- **Node native type stripping** (user decision): no build step, no runtime deps. Node >= 23.6 required; installed runtime is v24.14.1. Enforced by tsconfig `erasableSyntaxOnly: true` — no `enum`, no `namespace`, no constructor parameter properties, no legacy decorators.
- **Explicit `.ts` import extensions**: Node type stripping does not resolve extensionless imports; all relative imports use `./x.ts`. `allowImportingTsExtensions` + `noEmit` make `tsc` accept this.
- **`import type` for type-only imports**: `verbatimModuleSyntax: true` requires it; stripping keeps it safe.
- **Provider seam**: adapters translate `api.Message[]` ↔ HTTP JSON. Anthropic SDK types must never leak outside `provider/anthropic.ts` (same rule as Go).
- **Tools are async** (`Promise<ToolResult>`), unlike the sync Go version — bash/file I/O is async in Node. Optional `AbortSignal` on `execute` for cancellation.
- **Errors as tool results**: unknown tool / denied call / tool failure → `{ result: message, isError: true }` so the model can recover; never throw into the loop.
- **Permission gate** in `Agent.executeTool`: `confirm(prompt, detail)` callback; `nil` = auto-approve. `write_file` computes a unified diff via `agent/diff.ts` and names the target path in the prompt. Denied → `"user denied this tool call"` with `isError: true`.
- **Compaction runs at the top of every loop turn**; strategies return the input unchanged below threshold (matches `compact` package semantics, incl. `safeSplitPoint`).
- **Memory** defaults to `NoMemory` so the harness boots without it; `SessionFiles` persists under `.harness/` (path injectable for tests).
- **Subagents** register explicitly in `main` (need a Provider at construction), unlike tools which self-register via module import side effects.
- **MCP** is opt-in via `mcp.json`; connection failures are logged, never fatal. stdio transport only (chapter 14 scope).
- **MockProvider** is the test seam for the agent loop, compaction summarize, and subagents — never touches the network.
- **API keys** come from env vars read inline near the thing that uses them (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `LLM_PROVIDER`, `LLM_MODEL`), matching the Go harness style.
- **Prerequisite**: commit the currently uncommitted changes (repos.json 5 entries, AGENTS.md/README.md, tests) before Phase 0, so harness work lands on a clean base — ask user first.

## TDD Flow

Phase order mirrors the Go book arcs. Every phase: write tests → run (red) → implement → run (green) → `tsc --noEmit` clean.

1. **Phase 0 — Toolchain & repo hygiene**
   - Test (root): update `package.json` test script; add `harness-ts/test/smoke.test.ts` asserting a trivial module loads.
   - Fix: create `harness-ts/package.json` + `tsconfig.json`; change root script to glob-scoped `node --test "tests/*.test.js" "harness-ts/test/*.test.js"`; bump engines.
   - Verify: `npm test` runs BOTH suites quickly (repos/ clones no longer scanned), root's 18 tooling tests still pass, typecheck clean.

2. **Phase 1 — Core (chapters 01–02: the bare minimum)**
   - Tests first: `api.test.ts` (renderTranscript, hasToolResult, usage add); `provider.test.ts` (MockProvider returns scripted responses); `tool.test.ts` (registry register/get/subset/sorted definitions/unknown-tool; bash echo on win32 via `cmd /c`; readfile/writefile round-trip in temp dir); `agent.test.ts` (MockProvider scripted `tool_use` → result cycle; permission gate asks for `write_file` and denial returns isError; maxTurns cap; text concatenation).
   - Implement: `api/types.ts`, `provider/provider.ts` + `mock.ts`, `tool/*` (tool, registry, bash, readfile, writefile), `agent/agent.ts` + `diff.ts`, `ui/banner.ts` + minimal `ui/repl.ts`, `main.ts`.
   - Manual verification: `node src/main.ts` with a mock provider drives a scripted tool-use turn.

3. **Phase 2 — Abstractions (chapters 03–08)**
   - Tests first: `provider.test.ts` additions (anthropic/openai payload serialization against a stubbed `fetch`; cache_control on system + tools; usage accumulation + estimated cost); `compact.test.ts` (safeSplitPoint boundaries, sliding window, summarize via MockProvider, logging decorator, threshold no-op); `commands.test.ts` (registry dispatch, /compact triggers strategy, /clear, /verbose, /model & /provider swap); `memory.test.ts` (SessionFiles in temp dir: save/recall/preamble; NoMemory no-op).
   - Implement: `provider/anthropic.ts`, `provider/openai.ts`, `compact/*`, `memory/*` + `tool/remember.ts` + `tool/recall.ts`, `commands.ts`.
   - Refactor: keep conversation-state mutation behind `messages()`/`setMessages()`/`clearMessages()` on Agent.

4. **Phase 3 — The architecture pays off (chapters 09–12, 14–19)**
   - Tests first: `subagent.test.ts` (registry/active tracker; research subagent run against MockProvider, delegate tool definition + execute); `mcp.test.ts` (client speaks JSON-RPC to a fake stdio server script; register maps tools into registry; bad config not fatal); `commands.test.ts` additions (/agents, /memory).
   - Implement: `subagent/*`, `mcp/*`, REPL upgrades (streaming assistant text, spinner, diff-approval modal, usage status line), shutdown auto-summary → memory.
   - Docs: `harness-ts/README.md`; vault note in `docs/`; update root `AGENTS.md`/`README.md`.

## Verification

- [ ] `npm test` from repo root — both `tests/` (18 tooling tests) and `harness-ts/test/` green, completes in seconds (repos/ clones not scanned)
- [ ] `npm run typecheck` in `harness-ts/` passes with `erasableSyntaxOnly` + `verbatimModuleSyntax` strict settings
- [ ] Zero runtime dependencies — `harness-ts/package.json` lists only `typescript` under devDependencies
- [ ] Cross-platform: bash tool verified with `cmd /c` on Windows (and designed for `sh -c` on POSIX)
- [ ] Agent loop: permission gate asked for `write_file`, denial feeds `isError: true` back to the model; maxTurns honored
- [ ] Compaction: strategies no-op below threshold; sliding window snaps to safe split; summarize replaces old turns (MockProvider)
- [ ] Memory: SessionFiles save/recall/preamble round-trip in a temp directory
- [ ] Subagents: research subagent runs with its own context; delegate tool registers into the tool registry
- [ ] MCP: client completes initialize/list/call handshake against a fake stdio server; missing `mcp.json` is not fatal
- [ ] Real providers: anthropic/openai payloads serialized correctly (stubbed fetch); manual e2e optional with a real key
- [ ] REPL: streaming output, slash commands, diff-approval modal, /exit and Ctrl+C clean exit
- [ ] `AGENTS.md` / `README.md` updated; `docs/` vault note created and linked from `docs/Home.md`
- [ ] Each phase committed as a checkpoint after user approval; final commit + push per user request
