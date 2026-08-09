import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { MockProvider } from '../src/provider/mock.ts';
import type { Message } from '../src/api/types.ts';
import { noopToolDef, textResponse, toolUseResponse } from './helpers.ts';

describe('MockProvider', () => {
  test('returns responses front-to-back and records calls', async () => {
    const p = new MockProvider([textResponse('one'), textResponse('two')]);
    const r1 = await p.send([], []);
    const r2 = await p.send([], []);
    assert.equal(r1.content[0]!.type, 'text');
    assert.equal((r1.content[0] as { text: string }).text, 'one');
    assert.equal((r2.content[0] as { text: string }).text, 'two');
    assert.equal(p.callsCount(), 2);
  });

  test('snapshots the messages and tools passed to each send', async () => {
    const p = new MockProvider([textResponse('ok')]);
    const tools = [noopToolDef('bash')];
    const msgs: Message[] = [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }];
    await p.send(msgs, tools);
    assert.equal(p.sentAt(0)?.[0]?.content[0]?.type, 'text');
    assert.equal(p.sentToolsAt(0)?.[0]?.name, 'bash');
  });

  test('falls through to an empty end_turn when exhausted (repeatLast=false)', async () => {
    const p = new MockProvider([textResponse('one')]);
    await p.send([], []);
    const r = await p.send([], []);
    assert.equal(r.stopReason, 'end_turn');
    assert.equal(r.content.length, 0);
  });

  test('repeatLast repeats the final response forever', async () => {
    const p = new MockProvider([toolUseResponse('bash', '{}')]);
    p.repeatLast = true;
    await p.send([], []);
    const r = await p.send([], []);
    assert.equal(r.stopReason, 'tool_use');
  });

  test('err short-circuits every send', async () => {
    const p = new MockProvider([textResponse('ignored')]);
    p.err = new Error('boom');
    await assert.rejects(p.send([], []), /boom/);
  });

  test('model() defaults to "mock" and setModel changes it', () => {
    const p = new MockProvider([]);
    assert.equal(p.model(), 'mock');
    p.setModel('gpt-5');
    assert.equal(p.model(), 'gpt-5');
  });

  test('accumulates usage across sends', async () => {
    const p = new MockProvider([textResponse('a'), textResponse('b')]);
    await p.send([], []);
    await p.send([], []);
    assert.deepEqual(p.totalUsage(), {
      inputTokens: 20,
      outputTokens: 10,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    });
  });
});
