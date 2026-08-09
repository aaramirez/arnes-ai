// Provider defines the LLM-backend interface and is the only seam the
// harness talks to the model through — swap implementations to swap models
// or SDKs. Port of internal/provider/provider.go.
//
// The token/usage contract deliberately lives on a separate interface:
// not every backend has a "tokens" concept, so callers (e.g. /tokens)
// type-assert against UsageReporter instead of widening Provider.

import type { Message, Response, ToolDef, Usage } from '../api/types.ts';

export interface Provider {
  send(messages: Message[], tools: ToolDef[]): Promise<Response>;
  model(): string;
  setModel(name: string): void;
}

// UsageReporter is implemented by providers that can account tokens and
// estimate session cost. Checked via type assertion, not part of Provider.
export interface UsageReporter {
  totalUsage(): Usage;
  estimatedCostUSD(): number;
}
