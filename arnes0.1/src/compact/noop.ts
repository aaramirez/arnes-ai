// NoCompaction is the identity strategy: never touch the conversation.
// It is the default compactor on every new Agent.
// Port of internal/compact/nocompaction.go.

import type { Message } from '../api/types.ts';
import type { CompactionStrategy } from './strategy.ts';

export class NoCompaction implements CompactionStrategy {
  async compact(messages: Message[]): Promise<Message[]> {
    return messages;
  }
}
