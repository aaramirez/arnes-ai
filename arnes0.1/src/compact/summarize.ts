// Summarize calls the provider to summarize old turns once the history
// exceeds a threshold, replacing them with a single synthetic user message.
// If the provider call or summary fails, the error propagates so the agent
// loop can fall back to the full history (robustness over purity).
// Port of internal/compact/summarize.go.

import { renderTranscript } from '../api/types.ts';
import type { Message } from '../api/types.ts';
import type { Provider } from '../provider/provider.ts';
import { safeSplitPoint } from './strategy.ts';
import type { CompactionStrategy } from './strategy.ts';

export const defaultSummarizeInstructions =
  'Summarize the following conversation concisely. ' +
  'Preserve facts, decisions, file paths, code identifiers, and anything else ' +
  'needed to continue the conversation. Output the summary directly with no preamble.';

export class Summarize implements CompactionStrategy {
  provider: Provider;
  threshold: number;
  keepRecent: number;
  instructions: string;

  constructor(provider: Provider, threshold: number, keepRecent: number, instructions = '') {
    this.provider = provider;
    this.threshold = threshold;
    this.keepRecent = keepRecent;
    this.instructions = instructions;
  }

  async compact(messages: Message[]): Promise<Message[]> {
    if (messages.length < this.threshold) {
      return messages;
    }
    const split = safeSplitPoint(messages, messages.length - this.keepRecent);
    if (split === 0) {
      return messages;
    }
    const old = messages.slice(0, split);
    const recent = messages.slice(split);

    const instructions = this.instructions || defaultSummarizeInstructions;
    const prompt = `${instructions}\n\n${renderTranscript(old)}`;

    const resp = await this.provider.send(
      [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
      [],
    );

    const summaryBlock = resp.content.find((b) => b.type === 'text');
    if (!summaryBlock || summaryBlock.text.trim() === '') {
      throw new Error('summarize: empty response');
    }

    console.log(`[compacted ${old.length} messages -> summary]`);
    return [
      {
        role: 'user',
        content: [{ type: 'text', text: `[earlier conversation summary]\n${summaryBlock.text}` }],
      },
      ...recent,
    ];
  }
}
