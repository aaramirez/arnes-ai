// BashTool runs a shell command and returns combined stdout+stderr.
// Cross-platform: cmd /c on Windows, sh -c elsewhere.
// Port of internal/tool/bash.go.

import { spawn } from 'node:child_process';
import { errMsg } from './errors.ts';
import { Default } from './registry.ts';
import type { Tool, ToolResult } from './tool.ts';

export class BashTool implements Tool {
  definition() {
    return {
      name: 'bash',
      description: 'Run a shell command. Returns combined stdout and stderr.',
      inputSchema: {
        command: {
          type: 'string',
          description: 'The shell command to run.',
        },
      },
      required: ['command'],
    };
  }

  async execute(input: string): Promise<ToolResult> {
    let parsed: { command?: unknown };
    try {
      parsed = JSON.parse(input);
    } catch {
      return { result: `invalid tool input: ${errMsg(input)}`, isError: true };
    }
    if (typeof parsed.command !== 'string' || parsed.command === '') {
      return { result: 'invalid tool input: missing command', isError: true };
    }

    const [shell, flag] = process.platform === 'win32'
      ? [process.env.ComSpec ?? 'cmd.exe', '/d /s /c']
      : ['/bin/sh', '-c'];

    const output = await run(shell, [...(flag.split(' ')), parsed.command]);
    if (output.code === 0) {
      return { result: output.text, isError: false };
    }
    return {
      result: `${output.text}\n[exit code: ${output.code}]`,
      isError: true,
    };
  }
}

// run spawns a subprocess and buffers stdout+stderr together so ordering is
// preserved even when a command writes to both.
function run(cmd: string, args: string[]): Promise<{ code: number; text: string }> {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { windowsHide: true });
    let out = '';
    child.stdout?.on('data', (d: Buffer) => {
      out += d.toString();
    });
    child.stderr?.on('data', (d: Buffer) => {
      out += d.toString();
    });
    child.on('error', (e) => {
      resolve({ code: -1, text: `[spawn error: ${e.message}]` });
    });
    child.on('close', (code) => {
      resolve({ code: code ?? -1, text: out });
    });
  });
}

Default.register(new BashTool());
