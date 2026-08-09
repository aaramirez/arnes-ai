import type { Message, Response, StopReason, ToolDef } from '../src/api/types.ts';
import { emptyUsage } from '../src/api/types.ts';

// Builders for scripted provider responses, mirroring what a real provider
// would return for each phase of an agent turn.

export function textResponse(
  text: string,
  stopReason: StopReason = 'end_turn',
  usage = { inputTokens: 10, outputTokens: 5, cacheCreationTokens: 0, cacheReadTokens: 0 },
): Response {
  return { content: [{ type: 'text', text }], stopReason, usage };
}

export function toolUseResponse(
  toolName: string,
  toolInput: string,
  toolUseId = 'tu_1',
  stopReason: StopReason = 'tool_use',
): Response {
  return {
    content: [{ type: 'tool_use', toolUseId, toolName, toolInput }],
    stopReason,
    usage: emptyUsage(),
  };
}

export function emptyEndTurn(): Response {
  return { content: [], stopReason: 'end_turn', usage: emptyUsage() };
}

export function noopToolDef(name: string): ToolDef {
  return { name, description: `test tool ${name}`, inputSchema: {} };
}

export function userMessage(text: string): Message {
  return { role: 'user', content: [{ type: 'text', text }] };
}
