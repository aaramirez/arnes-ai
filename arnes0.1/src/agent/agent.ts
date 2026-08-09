// The agent loop. The root REPL holds one Agent; subagents (spawned by the
// delegate tool) are additional Agents with their own state, system prompt,
// and tool subset. Port of internal/agent/agent.go.

import { renderTranscript } from '../api/types.ts';
import type { Block, Message } from '../api/types.ts';
import { NoCompaction } from '../compact/noop.ts';
import type { CompactionStrategy } from '../compact/strategy.ts';
import type { Provider } from '../provider/provider.ts';
import { errMsg } from '../tool/errors.ts';
import type { Registry } from '../tool/registry.ts';
import { buildWriteDiff, extractWritePath } from './diff.ts';
import type { ToolResult } from '../tool/tool.ts';

// Confirm is the permission gate. It receives a prompt ("approve?") and an
// optional detail pane (a diff, a command line, ...) and decides whether the
// tool call may proceed. Returning false denies the call with an error the
// model can read and recover from. nil means auto-approve everything.
export type ConfirmFn = (prompt: string, detail: string) => boolean | Promise<boolean>;

export interface AgentOptions {
  name?: string;
  maxTurns?: number;
  verbose?: boolean;
  logPrefix?: string;
  quiet?: boolean;
  confirm?: ConfirmFn;
}

export class Agent {
  provider: Provider;
  tools: Registry;
  compactor: CompactionStrategy = new NoCompaction();
  system: string;
  name: string;
  maxTurns: number;
  verbose: boolean;
  logPrefix: string;
  quiet: boolean;
  confirm?: ConfirmFn;

  private msgs: Message[] = [];

  constructor(provider: Provider, system: string, tools: Registry, opts: AgentOptions = {}) {
    this.provider = provider;
    this.system = system;
    this.tools = tools;
    this.name = opts.name ?? '';
    this.maxTurns = opts.maxTurns ?? 20;
    this.verbose = opts.verbose ?? false;
    this.logPrefix = opts.logPrefix ?? '';
    this.quiet = opts.quiet ?? false;
    this.confirm = opts.confirm;
  }

  messages(): Message[] {
    return this.msgs;
  }

  setMessages(m: Message[]): void {
    this.msgs = m;
  }

  clearMessages(): void {
    this.msgs = [];
  }

  // send appends the user's prompt and runs the loop. The return value is
  // the accumulated assistant text (tool calls excluded).
  async send(prompt: string): Promise<string> {
    this.msgs.push({ role: 'user', content: [{ type: 'text', text: prompt }] });
    return this.loop();
  }

  private async loop(): Promise<string> {
    const finalParts: string[] = [];

    for (let turn = 0; turn < this.maxTurns; turn++) {
      // Take the compactor for a spin before every turn; if it fails,
      // ignore the error and continue with the full history (robustness
      // over purity).
      const before = this.msgs;
      let compacted: Message[];
      try {
        compacted = await this.compactor.compact(before);
      } catch (e) {
        console.error(`compaction error: ${errMsg(e)} (continuing without)`);
        compacted = before;
      }
      if (compacted !== before) {
        if (this.verbose) {
          console.log(`--- compaction: ${before.length} -> ${compacted.length} messages ---`);
          console.log(renderTranscript(before));
          console.log('---');
          console.log(renderTranscript(compacted));
          console.log('---');
        }
        this.msgs = compacted;
      }

      const resp = await this.provider.send(this.msgs, this.tools.definitions());

      this.msgs.push({ role: 'assistant', content: resp.content });

      const toolResults: Block[] = [];
      let toolUsed = false;

      for (const block of resp.content) {
        switch (block.type) {
          case 'text': {
            if (block.text.trim() === '') {
              continue;
            }
            if (!this.quiet) {
              console.log(block.text);
            }
            finalParts.push(block.text);
            break;
          }
          case 'tool_use': {
            toolUsed = true;
            const r = await this.executeTool(block.toolName, block.toolInput);
            toolResults.push({
              type: 'tool_result',
              toolUseId: block.toolUseId,
              toolResult: r.result,
              isError: r.isError,
            });
            break;
          }
          case 'tool_result':
            break;
        }
      }

      if (resp.stopReason !== 'tool_use' || !toolUsed) {
        return finalParts.join('\n').trim();
      }

      this.msgs.push({ role: 'user', content: toolResults });
    }

    throw new Error(`max turns (${this.maxTurns}) reached`);
  }

  // executeTool runs one tool call and builds the approval prompt.
  // write_file calls get a full diff; everything else a plain "approve?".
  private async executeTool(name: string, rawInput: string): Promise<ToolResult> {
    console.log(`${this.logPrefix}[tool] ${name} ${rawInput}`);

    let prompt = 'approve?';
    let detail = '';
    if (name === 'write_file') {
      const diff = await buildWriteDiff(rawInput);
      if (diff !== '') {
        detail = diff;
        const path = extractWritePath(rawInput);
        prompt = path ? `approve write to ${path}?` : 'approve write?';
      }
    }

    if (this.confirm && !(await this.confirm(prompt, detail))) {
      return { result: 'user denied this tool call', isError: true };
    }

    return this.tools.execute(name, rawInput);
  }
}
