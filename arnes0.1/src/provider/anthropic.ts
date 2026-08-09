// AnthropicProvider is a Provider implementation talking to the Anthropic
// Messages API over plain fetch (no SDK dependency). It is the only file
// that knows Anthropic's wire format — the rest of the harness only sees
// the api.Message / api.Response types.
//
// The agent's system prompt is sent as the top-level "system" field; tool
// calls and their results map to tool_use / tool_result content blocks.
// Port of internal/provider/anthropic.go.

import type { Message, Response, StopReason, ToolDef, Usage } from '../api/types.ts';
import { addUsage, emptyUsage } from '../api/types.ts';
import type { Provider, UsageReporter } from './provider.ts';

export interface AnthropicProviderOptions {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  system?: string;
  baseURL?: string;
  thinking?: boolean;
  fetchFn?: typeof fetch;
}

const DEFAULT_BASE_URL = 'https://api.anthropic.com/v1';
const DEFAULT_MODEL = 'claude-sonnet-4-5';
const DEFAULT_MAX_TOKENS = 8192;
const API_VERSION = '2023-06-01';

export class AnthropicProvider implements Provider, UsageReporter {
  private apiKey: string;
  private modelName: string;
  private maxTokens: number;
  private system: string;
  private baseURL: string;
  private thinking: boolean;
  private fetchFn: typeof fetch;

  private total: Usage = emptyUsage();

  constructor(opts: AnthropicProviderOptions = {}) {
    this.apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY ?? '';
    this.modelName = opts.model ?? DEFAULT_MODEL;
    this.maxTokens = opts.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.system = opts.system ?? '';
    this.baseURL = opts.baseURL ?? DEFAULT_BASE_URL;
    this.thinking = opts.thinking ?? false;
    this.fetchFn = opts.fetchFn ?? globalThis.fetch;
  }

  model(): string {
    return this.modelName;
  }

  setModel(name: string): void {
    this.modelName = name;
  }

  // totalUsage returns the cumulative tokens consumed since construction.
  // Subagents that share the provider contribute to the same total.
  totalUsage(): Usage {
    return this.total;
  }

  // estimatedCostUSD multiplies the cumulative usage by the current model's
  // per-million-token rates, including cache writes and reads. Returns -1
  // for an unknown model.
  estimatedCostUSD(): number {
    const rates = modelPricing[this.modelName];
    if (!rates) {
      return -1;
    }
    return (
      (this.total.inputTokens * rates.inputPerMillion) / 1_000_000 +
      (this.total.outputTokens * rates.outputPerMillion) / 1_000_000 +
      (this.total.cacheCreationTokens * rates.cacheCreationPerMillion) / 1_000_000 +
      (this.total.cacheReadTokens * rates.cacheReadPerMillion) / 1_000_000
    );
  }

  async send(messages: Message[], tools: ToolDef[]): Promise<Response> {
    if (!this.apiKey) {
      throw new Error('anthropic: ANTHROPIC_API_KEY is not set');
    }

    const url = `${this.baseURL}/messages`;
    const body: Record<string, unknown> = {
      model: this.modelName,
      max_tokens: this.maxTokens,
      system: this.system,
      messages: this.toMessages(messages),
    };
    const apiTools = this.toTools(tools);
    if (apiTools.length > 0) {
      body.tools = apiTools;
    }
    if (this.thinking) {
      body.thinking = { type: 'adaptive' };
    }

    let res: Awaited<ReturnType<typeof fetch>>;
    try {
      res = await this.fetchFn(url, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': API_VERSION,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new Error(`anthropic: request failed: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`anthropic: HTTP ${res.status}: ${detail || res.statusText}`);
    }

    const data = (await res.json()) as AnthropicResponse;

    const out: Response = {
      content: [],
      stopReason: fromStopReason(data.stop_reason),
      usage: emptyUsage(),
    };
    for (const block of data.content ?? []) {
      switch (block.type) {
        case 'text':
          out.content.push({ type: 'text', text: block.text });
          break;
        case 'tool_use':
          out.content.push({
            type: 'tool_use',
            toolUseId: block.id,
            toolName: block.name,
            toolInput: JSON.stringify(block.input),
          });
          break;
      }
    }

    const u = data.usage;
    out.usage = {
      inputTokens: u?.input_tokens ?? 0,
      outputTokens: u?.output_tokens ?? 0,
      cacheCreationTokens: u?.cache_creation_input_tokens ?? 0,
      cacheReadTokens: u?.cache_read_input_tokens ?? 0,
    };
    this.total = addUsage(this.total, out.usage);
    return out;
  }

  // toMessages translates harness messages into Anthropic message params.
  // tool_use blocks carry their input as a parsed JSON object (the API
  // requires an object, not a string); tool_result blocks carry a string.
  private toMessages(messages: Message[]): unknown[] {
    return messages.map((m) => ({
      role: m.role,
      content: m.content.map((b) => {
        switch (b.type) {
          case 'text':
            return { type: 'text', text: b.text };
          case 'tool_use': {
            let input: unknown = {};
            try {
              input = JSON.parse(b.toolInput);
            } catch {
              input = {};
            }
            return { type: 'tool_use', id: b.toolUseId, name: b.toolName, input };
          }
          case 'tool_result':
            return { type: 'tool_result', tool_use_id: b.toolUseId, content: b.toolResult, is_error: b.isError };
        }
      }),
    }));
  }

  private toTools(tools: ToolDef[]): unknown[] {
    return tools.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: {
        type: 'object',
        properties: t.inputSchema,
        required: t.required ?? [],
      },
    }));
  }
}

// pricing is per-million-token rates in USD. Update from
// https://www.anthropic.com/pricing when rates change.
interface Pricing {
  inputPerMillion: number;
  outputPerMillion: number;
  cacheCreationPerMillion: number;
  cacheReadPerMillion: number;
}

export const modelPricing: Record<string, Pricing> = {
  'claude-opus-4-5': { inputPerMillion: 15.0, outputPerMillion: 75.0, cacheCreationPerMillion: 18.75, cacheReadPerMillion: 1.5 },
  'claude-opus-4-1': { inputPerMillion: 15.0, outputPerMillion: 75.0, cacheCreationPerMillion: 18.75, cacheReadPerMillion: 1.5 },
  'claude-sonnet-4-5': { inputPerMillion: 3.0, outputPerMillion: 15.0, cacheCreationPerMillion: 3.75, cacheReadPerMillion: 0.3 },
  'claude-haiku-4-5': { inputPerMillion: 1.0, outputPerMillion: 5.0, cacheCreationPerMillion: 1.25, cacheReadPerMillion: 0.1 },
};

// Minimal shapes of the Anthropic Messages API that this adapter touches.
// Other block types (thinking, redacted_thinking, ...) fall through the
// switch and are ignored.
type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown };

interface AnthropicResponse {
  stop_reason?: string;
  content?: AnthropicContentBlock[];
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

function fromStopReason(s: string | undefined): StopReason {
  switch (s) {
    case 'end_turn':
      return 'end_turn';
    case 'tool_use':
      return 'tool_use';
    default:
      return 'other';
  }
}
