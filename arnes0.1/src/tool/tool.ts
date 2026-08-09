// Tool is the extension point for anything the model can call. Tools
// return a result string plus an isError flag — errors are data the model
// can read and recover from, never exceptions thrown into the loop.
// Port of internal/tool/tool.go + internal/tool/registry.go.

import type { ToolDef } from '../api/types.ts';

export interface ToolResult {
  result: string;
  isError: boolean;
}

export interface Tool {
  definition(): ToolDef;
  execute(input: string, opts?: { signal?: AbortSignal }): Promise<ToolResult>;
}
