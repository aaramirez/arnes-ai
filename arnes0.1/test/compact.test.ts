import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emptyUsage, type Message } from '../src/api/types.ts';
import { safeSplitPoint } from '../src/compact/strategy.ts';
import { NoCompaction } from '../src/compact/noop.ts';
import { SlidingWindow } from '../src/compact/slidingwindow.ts';
import { LoggingStrategy } from '../src/compact/logging.ts';
import { Summarize } from '../src/compact/summarize.ts';
import { MockProvider } from '../src/provider/mock.ts';
import { textResponse, userMessage } from './helpers.ts';

function toolResultsMsg(content = 'ls'): Message {
  return {
    role: 'user',
    content: [{ type: 'tool_result', toolUseId: 'tu_1', toolResult: content, isError: false }],
  };
}

function assistantToolUse(): Message {
  return {
    role: 'assistant',
    content: [{ type: 'tool_use', toolUseId: 'tu_1', toolName: 'bash', toolInput: '{}' }],
  };
}

describe('safeSplitPoint', () => {
  test('returns 0 for desired <= 0', () => {
    const msgs = [userMessage('a'), userMessage('b')];
    assert.equal(safeSplitPoint(msgs, 0), 0);
    assert.equal(safeSplitPoint(msgs, -3), 0);
  });

  test('returns full length when desired >= length', () => {
    const msgs = [userMessage('a'), userMessage('b')];
    assert.equal(safeSplitPoint(msgs, 2), 2);
    assert.equal(safeSplitPoint(msgs, 10), 2);
  });

  test('snaps back past tool_results to a plain user message', () => {
    const msgs: Message[] = [userMessage('p0'), assistantToolUse(), toolResultsMsg(), userMessage('p1')];
    assert.equal(safeSplitPoint(msgs, 3), 3);
  });

  test('walks backward to the last plain user message', () => {
    const msgs: Message[] = [
      userMessage('p0'),
      assistantToolUse(),
      toolResultsMsg(),
      userMessage('p1'),
      assistantToolUse(),
      toolResultsMsg(),
      userMessage('p2'),
    ];
    assert.equal(safeSplitPoint(msgs, 5), 3);
  });

  test('returns 0 when no plain user boundary exists before desired', () => {
    const msgs: Message[] = [assistantToolUse(), toolResultsMsg(), assistantToolUse()];
    assert.equal(safeSplitPoint(msgs, 2), 0);
  });
});

describe('NoCompaction', () => {
  test('returns the same array reference', async () => {
    const msgs = [userMessage('a')];
    assert.equal(await new NoCompaction().compact(msgs), msgs);
  });
});

describe('SlidingWindow', () => {
  test('returns messages unchanged when under the limit', async () => {
    const msgs = [userMessage('a'), userMessage('b')];
    const out = await new SlidingWindow(5).compact(msgs);
    assert.equal(out, msgs);
  });

  test('keeps only the last KeepLast messages', async () => {
    const msgs = [userMessage('a'), userMessage('b'), userMessage('c'), userMessage('d')];
    const out = await new SlidingWindow(2).compact(msgs);
    assert.deepEqual(out, msgs.slice(2));
  });

  test('never splits a tool_use from its tool_result', async () => {
    const msgs: Message[] = [
      userMessage('p0'),
      assistantToolUse(),
      toolResultsMsg(),
      userMessage('p1'),
      assistantToolUse(),
      toolResultsMsg(),
      userMessage('p2'),
    ];
    const out = await new SlidingWindow(3).compact(msgs);
    assert.equal(out.length, 4);
    assert.deepEqual(out[0], userMessage('p1'));
  });
});

describe('LoggingStrategy', () => {
  test('appends before/after when compaction changes the history', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'arnes0.1-compact-'));
    try {
      const logPath = join(dir, 'compaction.log');
      const logging = new LoggingStrategy(new SlidingWindow(1), logPath);
      await logging.compact([userMessage('a'), userMessage('b'), userMessage('c')]);
      const text = readFileSync(logPath, 'utf8');
      assert.match(text, /compaction event/);
      assert.match(text, /BEFORE \(3 messages\)/);
      assert.match(text, /AFTER \(1 messages\)/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('does not log when nothing was compacted', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'arnes0.1-compact-'));
    try {
      const logPath = join(dir, 'compaction.log');
      const logging = new LoggingStrategy(new SlidingWindow(10), logPath);
      await logging.compact([userMessage('a'), userMessage('b')]);
      assert.throws(() => readFileSync(logPath, 'utf8'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('skips writing when filePath is empty', async () => {
    const logging = new LoggingStrategy(new SlidingWindow(1), '');
    const out = await logging.compact([userMessage('a'), userMessage('b'), userMessage('c')]);
    assert.equal(out.length, 1);
  });
});

describe('Summarize', () => {
  test('replaces old turns with a synthetic summary message', async () => {
    const p = new MockProvider([textResponse('key facts retained')]);
    const s = new Summarize(p, 3, 1);
    const msgs: Message[] = [userMessage('q1'), assistantToolUse(), toolResultsMsg(), userMessage('q2')];
    const out = await s.compact(msgs);
    assert.equal(out.length, 2);
    const summaryBlock = out[0]!.content[0]!;
    assert.equal(summaryBlock.type, 'text');
    assert.match(summaryBlock.text, /\[earlier conversation summary\]/);
    assert.match(summaryBlock.text, /key facts retained/);
    assert.deepEqual(out[1], userMessage('q2'));
  });

  test('returns unchanged when under threshold', async () => {
    const p = new MockProvider();
    const s = new Summarize(p, 10, 1);
    const msgs = [userMessage('a')];
    assert.deepEqual(await s.compact(msgs), msgs);
  });

  test('throws when the provider returns an empty summary', async () => {
    const p = new MockProvider([{ content: [], stopReason: 'end_turn', usage: emptyUsage() }]);
    const s = new Summarize(p, 1, 1);
    await assert.rejects(s.compact([userMessage('a'), userMessage('b')]), /empty response/);
  });

  test('propagates provider errors so the agent can fall back to full history', async () => {
    const p = new MockProvider();
    p.err = new Error('api down');
    const s = new Summarize(p, 1, 1);
    await assert.rejects(s.compact([userMessage('a'), userMessage('b')]), /api down/);
  });
});
