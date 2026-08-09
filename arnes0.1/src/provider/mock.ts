// MockProvider is a Provider implementation that returns canned responses.
// It is the recommended way to test the agent loop, compaction strategies,
// and any code that talks through the Provider interface — no API key, no
// network, no spend.
//
// Beyond returning Responses in order, the mock records every Send call so
// tests can assert on the messages and tools the agent built up.
// Port of internal/provider/mock.go.

import { addUsage, emptyUsage } from '../api/types.ts';
import type { Message, Response, ToolDef, Usage } from '../api/types.ts';
import type { Provider, UsageReporter } from './provider.ts';

export class MockProvider implements Provider, UsageReporter {
  responses: Response[];
  repeatLast = false;
  err: Error | null = null;
  modelName = '';

  private sent: Message[][] = [];
  private sentTools: ToolDef[][] = [];
  private calls = 0;
  private total: Usage = emptyUsage();

  constructor(responses: Response[] = []) {
    this.responses = responses;
  }

  async send(messages: Message[], tools: ToolDef[]): Promise<Response> {
    if (this.err) {
      this.calls++;
      throw this.err;
    }

    this.sent.push(cloneMessages(messages));
    this.sentTools.push(tools.map((t) => ({ ...t })));

    let r: Response;
    if (this.calls < this.responses.length) {
      r = this.responses[this.calls]!;
    } else if (this.repeatLast && this.responses.length > 0) {
      r = this.responses[this.responses.length - 1]!;
    } else {
      r = { content: [], stopReason: 'end_turn', usage: emptyUsage() };
    }
    this.calls++;
    this.total = addUsage(this.total, r.usage);
    return r;
  }

  model(): string {
    return this.modelName || 'mock';
  }

  setModel(name: string): void {
    this.modelName = name;
  }

  totalUsage(): Usage {
    return this.total;
  }

  estimatedCostUSD(): number {
    return -1;
  }

  callsCount(): number {
    return this.calls;
  }

  sentAt(i: number): Message[] | undefined {
    return this.sent[i];
  }

  sentToolsAt(i: number): ToolDef[] | undefined {
    return this.sentTools[i];
  }

  lastSent(): Message[] | undefined {
    return this.sent[this.sent.length - 1];
  }
}

// cloneMessages makes a defensive copy so a test can't accidentally mutate
// shared state that the agent owns.
function cloneMessages(messages: Message[]): Message[] {
  return messages.map((m) => ({ role: m.role, content: m.content.map((b) => ({ ...b })) }));
}
