// Registry holds tools by name. Tools live as one file per tool in this
// directory and self-register on import, so adding a tool means dropping a
// file in and importing it from the wiring. Port of internal/tool/registry.go.

import type { ToolDef } from '../api/types.ts';
import type { Tool, ToolResult } from './tool.ts';

export class Registry {
  private tools = new Map<string, Tool>();

  register(t: Tool): void {
    this.tools.set(t.definition().name, t);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  // subset returns a new Registry containing only the named tools. Used to
  // build curated tool sets for subagents.
  subset(...names: string[]): Registry {
    const out = new Registry();
    for (const n of names) {
      const t = this.tools.get(n);
      if (t) {
        out.register(t);
      }
    }
    return out;
  }

  // definitions returns all registered tool schemas, sorted by name so the
  // output is deterministic (important for prompt caching when you turn it on).
  definitions(): ToolDef[] {
    return [...this.tools.keys()]
      .sort()
      .map((n) => this.tools.get(n)!.definition());
  }

  // execute dispatches a tool call by name. Unknown tools return an error
  // result rather than panicking — the model can read it and recover.
  async execute(name: string, input: string, opts?: { signal?: AbortSignal }): Promise<ToolResult> {
    const t = this.tools.get(name);
    if (!t) {
      return { result: `unknown tool: ${name}`, isError: true };
    }
    return t.execute(input, opts);
  }
}

// Default is the package-level registry tools self-register to on import.
export const Default = new Registry();
