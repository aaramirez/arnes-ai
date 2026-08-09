import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { Agent } from '../src/agent/agent.ts';
import { BashTool } from '../src/tool/bash.ts';
import { Registry } from '../src/tool/registry.ts';
import { MockProvider } from '../src/provider/mock.ts';
import { emptyUsage, type Usage } from '../src/api/types.ts';
import { formatThousands, runCommand, type AppContext } from '../src/commands.ts';

// captureLog swaps console.log for a collector (with ANSI codes stripped)
// and returns a restore fn.
function captureLog(): { lines: string[]; restore: () => void } {
  const lines: string[] = [];
  const orig = console.log;
  console.log = (...args: unknown[]) => {
    lines.push(args.map(String).join(' ').replace(/\x1b\[[0-9;]*m/g, ''));
  };
  return {
    lines,
    restore: () => {
      console.log = orig;
    },
  };
}

function makeCtx(overrides: Partial<AppContext> = {}): AppContext {
  const p = new MockProvider([]);
  const reg = new Registry();
  reg.register(new BashTool());
  const agent = new Agent(p, 'sys', reg, { maxTurns: 3 });
  return {
    agent,
    kind: 'anthropic',
    knownModels: ['claude-sonnet-4-5', 'claude-haiku-4-5'],
    usage: (): { usage: Usage; cost: number } => ({ usage: emptyUsage(), cost: -1 }),
    exit: () => {},
    ...overrides,
  };
}

describe('runCommand', () => {
  test('returns false for lines that are not slash commands', async () => {
    const handled = await runCommand('hello there', makeCtx());
    assert.equal(handled, false);
  });

  test('reports unknown commands', async () => {
    const { lines, restore } = captureLog();
    try {
      await runCommand('/bogus', makeCtx());
    } finally {
      restore();
    }
    assert.match(lines[0] ?? '', /unknown command: \/bogus/);
  });

  test('/help lists the registered commands', async () => {
    const { lines, restore } = captureLog();
    try {
      await runCommand('/help', makeCtx());
    } finally {
      restore();
    }
    assert.ok(lines.some((l) => l.includes('help') && l.includes('available commands')), 'help self-describes');
    assert.ok(lines.some((l) => l.includes('/model')), 'model listed');
    assert.ok(lines.some((l) => l.includes('/tokens')), 'tokens listed');
  });

  test('/model shows current model and suggestions without args', async () => {
    const { lines, restore } = captureLog();
    try {
      await runCommand('/model', makeCtx());
    } finally {
      restore();
    }
    assert.ok(lines.some((l) => /current: mock/.test(l)));
    assert.ok(lines.some((l) => l.includes('claude-sonnet-4-5')));
  });

  test('/model with args sets the model', async () => {
    const ctx = makeCtx();
    await runCommand('/model claude-haiku-4-5', ctx);
    assert.equal(ctx.agent.provider.model(), 'claude-haiku-4-5');
  });

  test('/clear empties the conversation history', async () => {
    const ctx = makeCtx();
    await ctx.agent.send('hi');
    assert.equal(ctx.agent.messages().length, 2);
    await runCommand('/clear', ctx);
    assert.equal(ctx.agent.messages().length, 0);
  });

  test('/tools lists the registered tools', async () => {
    const { lines, restore } = captureLog();
    try {
      await runCommand('/tools', makeCtx());
    } finally {
      restore();
    }
    assert.ok(lines.some((l) => l.includes('bash')), 'bash listed');
  });

  test('/tokens prints usage when the provider reports it', async () => {
    const ctx = makeCtx({
      usage: () => ({
        usage: { inputTokens: 1000, outputTokens: 200, cacheCreationTokens: 0, cacheReadTokens: 0 },
        cost: 0.0123,
      }),
    });
    const { lines, restore } = captureLog();
    try {
      await runCommand('/tokens', ctx);
    } finally {
      restore();
    }
    assert.ok(lines.some((l) => l.includes('1,000')));
    assert.ok(lines.some((l) => l.includes('0.0123')));
  });

  test('/exit invokes ctx.exit', async () => {
    let exited = false;
    const ctx = makeCtx({ exit: () => (exited = true) });
    await runCommand('/exit', ctx);
    assert.equal(exited, true);
  });
});

describe('formatThousands', () => {
  test('inserts thousands separators', () => {
    assert.equal(formatThousands(0), '0');
    assert.equal(formatThousands(999), '999');
    assert.equal(formatThousands(1000), '1,000');
    assert.equal(formatThousands(1234567), '1,234,567');
  });
});
