// Wiring for the interactive CLI. The interesting code lives in src/;
// this file constructs the root Agent, hooks up the permission gate and
// slash commands, and drives the readline REPL. Port of main.go minus the
// Bubble Tea TUI, MCP, subagents, and persistent memory (all out of scope
// for this study port).

import { readFileSync } from 'node:fs';
import { stdin as input, stdout as output } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { Agent } from './agent/agent.ts';
import { errMsg } from './tool/errors.ts';
import { NoCompaction } from './compact/noop.ts';
import { AnthropicProvider } from './provider/anthropic.ts';
import { Default as registry } from './tool/registry.ts';
import { runCommand, type AppContext } from './commands.ts';
import { dim } from './ui/ansi.ts';
import { withSpinner } from './ui/spinner.ts';

// Importing the tool modules triggers their side-effect self-registration
// into tool.Default.
import './tool/bash.ts';
import './tool/readfile.ts';
import './tool/writefile.ts';

const systemPrompt = `You are running inside a small, hackable coding-agent harness written in TypeScript — a study port of the byo-coding-agent Go harness. The repo is a learning project. The user is here to understand how harnesses work and to play with this one: read its code, swap pieces, break things, fix them. Treat that curiosity as the default mode of the session, not an exception.

Tool guidance:
- For acting on the filesystem (creating, editing, running things), use bash, read_file, and write_file directly. Writes are mediated by a diff approval modal, so propose changes naturally — the user reviews each one.
- For READ-ONLY investigation, read files yourself with read_file (this port has no subagents yet).

Be concise. Be honest when you don't know — guessing is worse than saying "I'd need to read X to answer that." Match the user's language: if they write in Spanish, answer in Spanish.`;

// loadAgentsContext reads ./AGENTS.md and wraps it for inclusion in the
// system prompt. Missing file is silent; AGENTS.md is opt-in.
function loadAgentsContext(): string {
  try {
    const data = readFileSync('AGENTS.md', 'utf8');
    return `\n\n# Project context (from AGENTS.md)\n\n${data}`;
  } catch {
    return '';
  }
}

async function main(): Promise<void> {
  const sysPrompt = systemPrompt + loadAgentsContext();

  const provider = new AnthropicProvider({
    model: process.env.LLM_MODEL || undefined,
    system: sysPrompt,
  });

  const agent = new Agent(provider, sysPrompt, registry, { maxTurns: 50 });
  agent.compactor = new NoCompaction();

  const rl = createInterface({ input, output, terminal: true });

  const ctx: AppContext = {
    agent,
    kind: 'anthropic',
    knownModels: [
      'claude-opus-4-5',
      'claude-opus-4-1',
      'claude-sonnet-4-5',
      'claude-haiku-4-5',
    ],
    usage: () => ({ usage: provider.totalUsage(), cost: provider.estimatedCostUSD() }),
    exit: () => {
      rl.close();
      process.exit(0);
    },
  };

  // Permission gate: write_file calls come with a full diff, bash with a
  // plain approve. Return false denies the tool call with an error the
  // model can read and recover from.
  agent.confirm = async (prompt, detail) => {
    if (detail) {
      console.log(dim(detail));
    }
    const answer = await rl.question(`${prompt} [y/N] `);
    return /^(y|yes)$/i.test(answer.trim());
  };

  console.log(dim('arnes — a small, hackable coding-agent harness'));
  console.log(dim('type /help for commands, Ctrl+C or /exit to quit'));
  console.log();

  for (;;) {
    const line = (await rl.question('> ')).trim();
    if (line === '') {
      continue;
    }
    if (await runCommand(line, ctx)) {
      continue;
    }
    try {
      // The agent prints assistant text itself; the return value is only
      // the accumulated text, so we don't print it again.
      await withSpinner('thinking', () => agent.send(line));
    } catch (e) {
      console.error(`error: ${errMsg(e)}`);
    }
  }
}

main().catch((e) => {
  console.error(`fatal: ${errMsg(e)}`);
  process.exit(1);
});
