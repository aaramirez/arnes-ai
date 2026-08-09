import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  addUsage,
  emptyUsage,
  hasToolResult,
  renderTranscript,
} from '../src/api/types.ts';
import type { Message } from '../src/api/types.ts';

describe('renderTranscript', () => {
  test('formats text blocks as "role: text"', () => {
    const msgs: Message[] = [
      { role: 'user', content: [{ type: 'text', text: 'hello' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'hi' }] },
    ];
    assert.equal(renderTranscript(msgs), 'user: hello\nassistant: hi');
  });

  test('renders tool_use and tool_result blocks', () => {
    const msgs: Message[] = [
      {
        role: 'assistant',
        content: [{ type: 'tool_use', toolUseId: 'tu_1', toolName: 'bash', toolInput: '{"command":"ls"}' }],
      },
      {
        role: 'user',
        content: [{ type: 'tool_result', toolUseId: 'tu_1', toolResult: 'src' }],
      },
    ];
    const out = renderTranscript(msgs);
    assert.match(out, /\[called bash with \{"command":"ls"\}\]/);
    assert.match(out, /\[tool result: src\]/);
  });
});

describe('hasToolResult', () => {
  test('true when a message contains a tool_result block', () => {
    const m: Message = {
      role: 'user',
      content: [{ type: 'tool_result', toolUseId: 'tu_1', toolResult: 'ok' }],
    };
    assert.equal(hasToolResult(m), true);
  });

  test('false for text-only messages', () => {
    const m: Message = { role: 'user', content: [{ type: 'text', text: 'hello' }] };
    assert.equal(hasToolResult(m), false);
  });
});

describe('addUsage', () => {
  test('sums each field', () => {
    const a = { inputTokens: 10, outputTokens: 2, cacheCreationTokens: 5, cacheReadTokens: 1 };
    const b = { inputTokens: 3, outputTokens: 4, cacheCreationTokens: 0, cacheReadTokens: 2 };
    assert.deepEqual(addUsage(a, b), {
      inputTokens: 13,
      outputTokens: 6,
      cacheCreationTokens: 5,
      cacheReadTokens: 3,
    });
  });
});

describe('emptyUsage', () => {
  test('returns all-zero usage', () => {
    assert.deepEqual(emptyUsage(), {
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    });
  });
});
