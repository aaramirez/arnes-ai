// WriteFileTool writes content to a path, creating parent directories as
// needed. The agent gates it through the approval modal before it runs;
// this tool never touches the permission logic itself.
// Port of internal/tool/writefile.go.

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { errMsg } from './errors.ts';
import { Default } from './registry.ts';
import type { Tool, ToolResult } from './tool.ts';

export class WriteFileTool implements Tool {
  definition() {
    return {
      name: 'write_file',
      description: 'Write content to a file, creating parent directories as needed.',
      inputSchema: {
        path: {
          type: 'string',
          description: 'Path of the file to write.',
        },
        content: {
          type: 'string',
          description: 'Full content to write to the file.',
        },
      },
      required: ['path', 'content'],
    };
  }

  async execute(input: string): Promise<ToolResult> {
    let parsed: { path?: unknown; content?: unknown };
    try {
      parsed = JSON.parse(input);
    } catch {
      return { result: `invalid tool input: ${errMsg(input)}`, isError: true };
    }
    if (typeof parsed.path !== 'string' || parsed.path === '') {
      return { result: 'invalid tool input: missing path', isError: true };
    }
    const content = typeof parsed.content === 'string' ? parsed.content : '';
    try {
      await mkdir(dirname(parsed.path), { recursive: true });
      await writeFile(parsed.path, content, 'utf8');
      return { result: `wrote ${parsed.path}`, isError: false };
    } catch (e) {
      return { result: `write_file: ${errMsg(e)}`, isError: true };
    }
  }
}

Default.register(new WriteFileTool());
