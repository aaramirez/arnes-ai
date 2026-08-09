import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Agent } from '../src/agent/agent.ts';
import { MockProvider } from '../src/provider/mock.ts';
import { Registry } from '../src/tool/registry.ts';
import { BashTool } from '../src/tool/bash.ts';
import { WriteFileTool } from '../src/tool/writefile.ts';
import type { Message } from '../src/api/types.ts';
import { textResponse, toolUseResponse } from './helpers.ts';

const isWin = process.platform === 'win32';

describe('Agent loop', () => {
  test('text-only turn returns the assistant text and records both messages', async () => {
    const p = new MockProvider([textResponse('hello there')]);
    const agent = new Agent(p, 'sys', new Registry());
    const out = await agent.send('hi');
    assert.equal(out, 'hello there');
    const msgs = agent.messages();
    assert.equal(msgs.length, 2);
    assert.equal(msgs[0]?.role, 'user');
    assert.equal(msgs[0]?.content[0]?.type, 'text');
    assert.equal(msgs[1]?.role, 'assistant');
  });

  test('runs a tool-use loop: tool_use → execute → tool_result → next turn', async () => {
    const p = new MockProvider([
      toolUseResponse('bash', JSON.stringify({ command: 'echo hi' })),
      textResponse('done'),
    ]);
    const reg = new Registry();
    reg.register(new BashTool());
    const agent = new Agent(p, 'sys', reg);
    const out = await agent.send('list the dir');
    assert.equal(out, 'done');
    assert.equal(p.callsCount(), 2);

    const secondSent = p.sentAt(1) ?? [];
    const toolResultMsg = secondSent.find(
      (m: Message) => m.role === 'user' && m.content.some((b) => b.type === 'tool_result'),
    );
    assert.ok(toolResultMsg, 'second send should include a tool_result user message');
    const block = toolResultMsg.content.find((b) => b.type === 'tool_result');
    assert.ok(block);
    if (block.type === 'tool_result') {
      assert.match(block.toolResult, /hi/);
      assert.equal(block.isError, false);
      assert.equal(block.toolUseId, 'tu_1');
    }
    assert.equal(agent.messages().length, 4);
  });

  test('returns error result for an unknown tool instead of crashing', async () => {
    const p = new MockProvider([
      toolUseResponse('does_not_exist', '{}'),
      textResponse('recovered'),
    ]);
    const agent = new Agent(p, 'sys', new Registry());
    const out = await agent.send('x');
    assert.equal(out, 'recovered');
    const block = (p.sentAt(1) ?? [])
      .find((m: Message) => m.role === 'user' && m.content.some((b) => b.type === 'tool_result'))
      ?.content.find((b) => b.type === 'tool_result');
    assert.ok(block);
    if (block.type === 'tool_result') {
      assert.equal(block.isError, true);
      assert.match(block.toolResult, /unknown tool/);
    }
  });

  test('max turns: throws when the model loops on tool calls', async () => {
    const p = new MockProvider([toolUseResponse('bash', JSON.stringify({ command: 'echo x' }))]);
    p.repeatLast = true;
    const reg = new Registry();
    reg.register(new BashTool());
    const agent = new Agent(p, 'sys', reg, { maxTurns: 3 });
    await assert.rejects(agent.send('x'), /max turns/);
    assert.equal(p.callsCount(), 3);
  });
});

describe('Permission gate', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'arnes0.1-agent-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function makeAgent(p: MockProvider, confirm?: (prompt: string, detail: string) => boolean): Agent {
    const reg = new Registry();
    reg.register(new WriteFileTool());
    return new Agent(p, 'sys', reg, { confirm });
  }

  function writeResponse(): ReturnType<typeof toolUseResponse> {
    return toolUseResponse('write_file', JSON.stringify({ path: join(dir, 'x.txt'), content: 'data' }));
  }

  test('denied write_file returns isError and never touches the disk', async () => {
    const p = new MockProvider([writeResponse(), textResponse('ok')]);
    let seenPrompt = '';
    const agent = makeAgent(p, (prompt) => {
      seenPrompt = prompt;
      return false;
    });
    const out = await agent.send('write the file');
    assert.equal(out, 'ok');
    assert.match(seenPrompt, /x\.txt/);
    assert.match(seenPrompt, /approve write/);

    const block = (p.sentAt(1) ?? [])
      .find((m: Message) => m.role === 'user' && m.content.some((b) => b.type === 'tool_result'))
      ?.content.find((b) => b.type === 'tool_result');
    assert.ok(block);
    if (block.type === 'tool_result') {
      assert.equal(block.isError, true);
      assert.match(block.toolResult, /denied/);
    }
    assert.equal(existsSync(join(dir, 'x.txt')), false);
  });

  test('approved write_file executes and the diff modal receives a detail', async () => {
    const p = new MockProvider([writeResponse(), textResponse('ok')]);
    let seenDetail = '';
    const agent = makeAgent(p, (_prompt, detail) => {
      seenDetail = detail;
      return true;
    });
    await agent.send('write the file');
    assert.match(seenDetail, /^--- \/dev\/null/);
    assert.equal(readFileSync(join(dir, 'x.txt'), 'utf8'), 'data');
  });

  test('no confirm callback auto-approves', async () => {
    const p = new MockProvider([writeResponse(), textResponse('ok')]);
    const agent = makeAgent(p);
    await agent.send('write the file');
    assert.equal(readFileSync(join(dir, 'x.txt'), 'utf8'), 'data');
  });

  test('bash tool is not gated (no approval prompt built for it)', async () => {
    const p = new MockProvider([
      toolUseResponse('bash', JSON.stringify({ command: 'echo ok' })),
      textResponse('done'),
    ]);
    let confirmCalls = 0;
    const reg = new Registry();
    reg.register(new BashTool());
    reg.register(new WriteFileTool());
    const agent = new Agent(p, 'sys', reg, {
      confirm: (prompt) => {
        confirmCalls++;
        assert.equal(prompt, 'approve?');
        return true;
      },
    });
    await agent.send('x');
    assert.equal(confirmCalls, 1, 'bash still asks a generic approval in this harness');
  });
});
