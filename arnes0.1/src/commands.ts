// Slash-command registry. Port of commands.go, minus the subagents/MCP/
// debug features that this port doesn't have yet. Commands receive an
// AppContext instead of reaching for globals, so they're testable.

import type { Usage } from './api/types.ts';
import type { Agent } from './agent/agent.ts';
import { NoCompaction } from './compact/noop.ts';
import { SlidingWindow } from './compact/slidingwindow.ts';
import { Summarize } from './compact/summarize.ts';
import { cyan, dim } from './ui/ansi.ts';

export interface AppContext {
  agent: Agent;
  kind: string;
  knownModels: string[];
  usage(): { usage: Usage; cost: number };
  exit(): void;
}

interface Command {
  description: string;
  usage: string;
  run: (args: string, ctx: AppContext) => void | Promise<void>;
}

const commands = new Map<string, Command>();

function reg(name: string, description: string, usage: string, run: Command['run']): void {
  commands.set(name, { description, usage, run });
}

reg('help', 'show available commands', '/help', (_, _ctx) => {
  console.log(dim('available commands:'));
  for (const name of [...commands.keys()].sort()) {
    const c = commands.get(name)!;
    const display = c.usage || `/${name}`;
    console.log(`  ${display.padEnd(26)} ${dim(c.description)}`);
  }
});

reg('model', 'show or change the model', '/model [name]', (args, ctx) => {
  if (args === '') {
    console.log(`current: ${cyan(ctx.agent.provider.model())}  ${dim(`(${ctx.kind})`)}`);
    console.log(dim('suggestions:'));
    for (const m of ctx.knownModels) {
      console.log(`  ${m}`);
    }
    console.log(dim('(or pass any model id — validated on next call)'));
    return;
  }
  ctx.agent.provider.setModel(args);
  console.log(`model: ${cyan(args)}`);
});

reg('clear', 'clear conversation history', '/clear', (_args, ctx) => {
  ctx.agent.clearMessages();
  console.log(dim('conversation cleared'));
});

reg('tools', 'list available tools', '/tools', (_args, ctx) => {
  console.log(dim('tools available:'));
  for (const def of ctx.agent.tools.definitions()) {
    console.log(`  ${cyan(def.name)}  ${dim(def.description)}`);
  }
});

reg('compact', 'run compaction now (optionally with a strategy)', '/compact [sliding|summarize|none]', async (args, ctx) => {
  const agent = ctx.agent;
  let strategy = agent.compactor;
  switch (args.toLowerCase()) {
    case '':
      break;
    case 'sliding':
      strategy = new SlidingWindow(6);
      break;
    case 'summarize':
      strategy = new Summarize(agent.provider, 0, 4);
      break;
    case 'none':
      strategy = new NoCompaction();
      break;
    default:
      console.log(`unknown strategy: ${args} (try sliding, summarize, or none)`);
      return;
  }

  const before = agent.messages();
  try {
    const compacted = await strategy.compact(before);
    agent.setMessages(compacted);
    console.log(dim(`compacted: ${before.length} -> ${compacted.length} messages`));
  } catch (e) {
    console.log(`compaction error: ${e instanceof Error ? e.message : String(e)}`);
  }
});

reg('verbose', 'toggle printing of compaction before/after', '/verbose [on|off]', (args, ctx) => {
  switch (args.toLowerCase()) {
    case '':
      ctx.agent.verbose = !ctx.agent.verbose;
      break;
    case 'on':
    case 'true':
    case 'yes':
      ctx.agent.verbose = true;
      break;
    case 'off':
    case 'false':
    case 'no':
      ctx.agent.verbose = false;
      break;
    default:
      console.log(`unknown value: ${args} (try on/off)`);
      return;
  }
  console.log(`verbose: ${ctx.agent.verbose ? 'on' : 'off'}`);
});

reg('tokens', 'show cumulative token usage and estimated cost', '/tokens', (_args, ctx) => {
  const { usage, cost } = ctx.usage();
  console.log(dim('session usage:'));
  console.log(`  input          ${cyan(formatThousands(usage.inputTokens))}`);
  console.log(`  output         ${cyan(formatThousands(usage.outputTokens))}`);
  if (usage.cacheCreationTokens > 0 || usage.cacheReadTokens > 0) {
    console.log(`  cache write    ${cyan(formatThousands(usage.cacheCreationTokens))}`);
    console.log(`  cache read     ${cyan(formatThousands(usage.cacheReadTokens))}`);
  }
  if (cost >= 0) {
    console.log(`  est. cost      ${cyan(`$${cost.toFixed(4)}`)}`);
  } else {
    console.log(`  est. cost      ${dim('(unknown model — no rate)')}`);
  }
});

reg('exit', 'exit the harness', '/exit', (_args, ctx) => {
  ctx.exit();
});

// formatThousands inserts thousands separators into a non-negative int.
export function formatThousands(n: number): string {
  if (n < 0) {
    return `-${formatThousands(-n)}`;
  }
  if (n < 1000) {
    return `${n}`;
  }
  return `${formatThousands(Math.floor(n / 1000))},${String(n % 1000).padStart(3, '0')}`;
}

// runCommand handles a line that starts with "/". Returns true if handled,
// false if the line should fall through to the model as a normal message.
export async function runCommand(line: string, ctx: AppContext): Promise<boolean> {
  if (!line.startsWith('/')) {
    return false;
  }
  const parts = line.slice(1).split(/ +/).filter((p) => p !== '');
  const name = (parts[0] ?? '').toLowerCase();
  const args = parts.slice(1).join(' ');
  const c = commands.get(name);
  if (!c) {
    console.log(`unknown command: /${name} (try /help)`);
    return true;
  }
  await c.run(args, ctx);
  return true;
}
