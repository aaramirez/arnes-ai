// SlidingWindow keeps the last KeepLast messages and drops everything older.
// It snaps to a safe boundary so it never separates a tool_use from its
// tool_result. Port of internal/compact/slidingwindow.go.

import type { Message } from '../api/types.ts';
import { safeSplitPoint } from './strategy.ts';
import type { CompactionStrategy } from './strategy.ts';

export class SlidingWindow implements CompactionStrategy {
  keepLast: number;

  constructor(keepLast: number) {
    this.keepLast = keepLast;
  }

  async compact(messages: Message[]): Promise<Message[]> {
    if (messages.length <= this.keepLast) {
      return messages;
    }
    const split = safeSplitPoint(messages, messages.length - this.keepLast);
    return messages.slice(split);
  }
}
