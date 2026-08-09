// Provider-agnostic message types used everywhere else in the harness.
// Providers translate to/from their API's native JSON shape; tools,
// compaction strategies, and the agent loop all speak in these types.
// Port of internal/api/types.go.

export type Role = 'user' | 'assistant';

export type Block =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; toolUseId: string; toolName: string; toolInput: string }
  | {
      type: 'tool_result';
      toolUseId: string;
      toolResult: string;
      isError?: boolean;
    };

export interface Message {
  role: Role;
  content: Block[];
}

// hasToolResult reports whether the message contains any tool_result blocks.
// Used by compaction to find safe split points (a clean conversation
// boundary is just before a user message that is NOT tool results).
export function hasToolResult(m: Message): boolean {
  return m.content.some((b) => b.type === 'tool_result');
}

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  required?: string[];
}

export type StopReason = 'end_turn' | 'tool_use' | 'other';

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number; // tokens written to the prompt cache this call
  cacheReadTokens: number; // tokens served from the prompt cache this call
}

export function emptyUsage(): Usage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheCreationTokens: 0,
    cacheReadTokens: 0,
  };
}

// addUsage returns the per-field sum. Provider accumulators use this to fold
// a per-call Usage into the running total.
export function addUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheCreationTokens: a.cacheCreationTokens + b.cacheCreationTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
  };
}

export interface Response {
  content: Block[];
  stopReason: StopReason;
  usage: Usage;
}

// renderTranscript serializes messages to a human-readable transcript.
// Used by summarization prompts and compaction logs.
export function renderTranscript(msgs: Message[]): string {
  const parts: string[] = [];
  for (const m of msgs) {
    for (const b of m.content) {
      switch (b.type) {
        case 'text':
          parts.push(`${m.role}: ${b.text}`);
          break;
        case 'tool_use':
          parts.push(`${m.role}: [called ${b.toolName} with ${b.toolInput}]`);
          break;
        case 'tool_result':
          parts.push(`${m.role}: [tool result: ${b.toolResult}]`);
          break;
      }
    }
  }
  return parts.join('\n');
}
