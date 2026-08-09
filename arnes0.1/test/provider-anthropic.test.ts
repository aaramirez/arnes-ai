import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { userMessage } from './helpers.ts';
import { AnthropicProvider } from '../src/provider/anthropic.ts';
import { emptyUsage, type Message, type ToolDef } from '../src/api/types.ts';

// stubFetch returns a fake Response from a handler that captures the
// request so tests can assert on the wire payload.
function stubFetch(
  handler: (url: string, init: RequestInit) => object,
): { fetchFn: typeof fetch; requests: Array<{ url: string; init: RequestInit }> } {
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const fetchFn = async (url: string | URL | Request, init?: RequestInit) => {
    requests.push({ url: String(url), init: init ?? {} });
    const body = handler(String(url), init ?? {});
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    }) as Response;
  };
  return { fetchFn: fetchFn as unknown as typeof fetch, requests };
}

function toolResultsMsg(): Message {
  return {
    role: 'user',
    content: [{ type: 'tool_result', toolUseId: 'toolu_1', toolResult: 'hi', isError: false }],
  };
}

describe('AnthropicProvider', () => {
  test('posts the Messages API payload: model, max_tokens, system, messages, tools', async () => {
    const { fetchFn, requests } = stubFetch(() => ({ content: [], stop_reason: 'end_turn' }));
    const p = new AnthropicProvider({
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-4-5',
      system: 'be terse',
      fetchFn,
    });

    const tool: ToolDef = { name: 'bash', description: 'run a command', inputSchema: { command: { type: 'string' } }, required: ['command'] };
    const msgs: Message[] = [userMessage('hello'), { role: 'assistant', content: [{ type: 'text', text: 'hi' }] }];
    await p.send(msgs, [tool]);

    assert.equal(requests.length, 1);
    assert.equal(requests[0]!.url, 'https://api.anthropic.com/v1/messages');
    assert.equal(requests[0]!.init.method, 'POST');
    const headers = requests[0]!.init.headers as Record<string, string>;
    assert.equal(headers['x-api-key'], 'sk-ant-test');
    assert.equal(headers['anthropic-version'], '2023-06-01');

    const body = JSON.parse(String(requests[0]!.init.body)) as Record<string, unknown>;
    assert.equal(body.model, 'claude-sonnet-4-5');
    assert.equal(body.system, 'be terse');
    assert.deepEqual(body.messages, [
      { role: 'user', content: [{ type: 'text', text: 'hello' }] },
      { role: 'assistant', content: [{ type: 'text', text: 'hi' }] },
    ]);
    assert.deepEqual(body.tools, [
      {
        name: 'bash',
        description: 'run a command',
        input_schema: { type: 'object', properties: { command: { type: 'string' } }, required: ['command'] },
      },
    ]);
  });

  test('maps tool_use and tool_result blocks to Anthropic content blocks', async () => {
    const { fetchFn, requests } = stubFetch(() => ({ content: [], stop_reason: 'end_turn' }));
    const p = new AnthropicProvider({ apiKey: 'sk-ant-test', fetchFn });
    const msgs: Message[] = [
      {
        role: 'assistant',
        content: [{ type: 'tool_use', toolUseId: 'toolu_1', toolName: 'bash', toolInput: '{"command":"ls"}' }],
      },
      toolResultsMsg(),
    ];
    await p.send(msgs, []);
    const body = JSON.parse(String(requests[0]!.init.body)) as { messages: unknown[] };
    assert.deepEqual(body.messages, [
      {
        role: 'assistant',
        content: [{ type: 'tool_use', id: 'toolu_1', name: 'bash', input: { command: 'ls' } }],
      },
      {
        role: 'user',
        content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'hi', is_error: false }],
      },
    ]);
  });

  test('parses text and tool_use output into Response blocks', async () => {
    const { fetchFn } = stubFetch(() => ({
      content: [
        { type: 'text', text: 'running' },
        { type: 'tool_use', id: 'toolu_9', name: 'bash', input: { command: 'echo ok' } },
      ],
      stop_reason: 'tool_use',
      usage: {
        input_tokens: 100,
        output_tokens: 20,
        cache_creation_input_tokens: 30,
        cache_read_input_tokens: 40,
      },
    }));
    const p = new AnthropicProvider({ apiKey: 'sk-ant-test', fetchFn });
    const out = await p.send([], []);
    assert.equal(out.stopReason, 'tool_use');
    assert.equal(out.content.length, 2);
    assert.equal(out.content[0]!.type, 'text');
    if (out.content[0]!.type === 'text') {
      assert.equal(out.content[0]!.text, 'running');
    }
    assert.equal(out.content[1]!.type, 'tool_use');
    if (out.content[1]!.type === 'tool_use') {
      assert.equal(out.content[1]!.toolName, 'bash');
      assert.equal(out.content[1]!.toolUseId, 'toolu_9');
      assert.equal(out.content[1]!.toolInput, '{"command":"echo ok"}');
    }
    assert.deepEqual(out.usage, {
      inputTokens: 100,
      outputTokens: 20,
      cacheCreationTokens: 30,
      cacheReadTokens: 40,
    });
  });

  test('throws on non-OK responses', async () => {
    const fetchFn = async () => new Response('rate limited', { status: 429 });
    const p = new AnthropicProvider({ apiKey: 'sk-ant-test', fetchFn: fetchFn as unknown as typeof fetch });
    await assert.rejects(p.send([], []), /HTTP 429/);
  });

  test('throws when the API key is missing', async () => {
    const { fetchFn } = stubFetch(() => ({}));
    const p = new AnthropicProvider({ apiKey: '', fetchFn });
    await assert.rejects(p.send([], []), /ANTHROPIC_API_KEY/);
  });

  test('estimatedCostUSD uses per-model rates and returns -1 for unknown models', () => {
    const { fetchFn } = stubFetch(() => ({}));
    const p = new AnthropicProvider({ apiKey: 'sk-ant-test', model: 'claude-sonnet-4-5', fetchFn });
    p['total'] = { inputTokens: 1_000_000, outputTokens: 1_000_000, cacheCreationTokens: 1_000_000, cacheReadTokens: 1_000_000 };
    assert.equal(p.estimatedCostUSD(), 3 + 15 + 3.75 + 0.3);
    p.setModel('made-up-model');
    assert.equal(p.estimatedCostUSD(), -1);
  });

  test('accumulates usage across sends', async () => {
    const { fetchFn } = stubFetch(() => ({
      content: [{ type: 'text', text: 'ok' }],
      stop_reason: 'end_turn',
      usage: { input_tokens: 10, output_tokens: 5 },
    }));
    const p = new AnthropicProvider({ apiKey: 'sk-ant-test', fetchFn });
    await p.send([], []);
    await p.send([], []);
    assert.deepEqual(p.totalUsage(), {
      inputTokens: 20,
      outputTokens: 10,
      cacheCreationTokens: 0,
      cacheReadTokens: 0,
    });
    assert.deepEqual(emptyUsage(), { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0 });
  });
});
