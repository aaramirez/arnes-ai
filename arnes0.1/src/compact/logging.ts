// LoggingStrategy wraps another strategy and appends each non-trivial
// compaction (before / after) to a file. Use it to inspect strategies and
// compare them side-by-side without touching their implementations.
// Port of internal/compact/logging.go.

import { appendFile } from 'node:fs/promises';
import { renderTranscript } from '../api/types.ts';
import type { Message } from '../api/types.ts';
import { errMsg } from '../tool/errors.ts';
import type { CompactionStrategy } from './strategy.ts';

export class LoggingStrategy implements CompactionStrategy {
  inner: CompactionStrategy;
  filePath: string;

  constructor(inner: CompactionStrategy, filePath: string) {
    this.inner = inner;
    this.filePath = filePath;
  }

  async compact(messages: Message[]): Promise<Message[]> {
    const before = messages;
    const after = await this.inner.compact(messages);
    if (after.length === before.length) {
      return after;
    }
    if (this.filePath === '') {
      return after;
    }
    try {
      await this.writeEvent(before, after);
    } catch (e) {
      console.log(`compaction log write failed: ${errMsg(e)}`);
    }
    return after;
  }

  private async writeEvent(before: Message[], after: Message[]): Promise<void> {
    const stamp = `[${new Date().toISOString()}] compaction event`;
    const body =
      `=========================\n` +
      `${stamp}\n` +
      `BEFORE (${before.length} messages):\n${renderTranscript(before)}\n` +
      `---\n` +
      `AFTER (${after.length} messages):\n${renderTranscript(after)}\n`;
    await appendFile(this.filePath, body, 'utf8');
  }
}
