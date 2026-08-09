// CompactionStrategy interface, helpers for safe truncation. The concrete
// strategies live in their own files (noop, slidingwindow, summarize,
// logging) and are called at the top of every agent loop turn.
// Port of internal/compact/strategy.go.

import { hasToolResult } from '../api/types.ts';
import type { Message } from '../api/types.ts';

export interface CompactionStrategy {
  compact(messages: Message[]): Promise<Message[]>;
}

// safeSplitPoint walks backward from `desired` to find an index where the
// conversation is in a "clean" state — no tool_use without its tool_result
// on either side of the split. The split happens just before a user message
// that is plain text (not tool_results). Returns 0 if no safe boundary is
// found, meaning "do nothing."
export function safeSplitPoint(messages: Message[], desired: number): number {
  if (desired <= 0) {
    return 0;
  }
  if (desired >= messages.length) {
    return messages.length;
  }
  for (let i = desired; i > 0; i--) {
    const m = messages[i];
    if (m && m.role === 'user' && !hasToolResult(m)) {
      return i;
    }
  }
  return 0;
}
