// ReadFileTool reads a UTF-8 file, optionally truncating to a byte limit
// so the model doesn't blow past its context window.
// Port of internal/tool/readfile.go.

import { readFile } from 'node:fs/promises';
import { errMsg } from './errors.ts';
import { Default } from './registry.ts';
import type { Tool, ToolResult } from './tool.ts';

export class ReadFileTool implements Tool {
  definition() {
    return {
      name: 'read_file',
      description: 'Read a UTF-8 text file from disk.',
      inputSchema: {
        path: {
          type: 'string',
          description: 'Path of the file to read.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of bytes to return.',
        },
      },
      required: ['path'],
    };
  }

  async execute(input: string): Promise<ToolResult> {
    let parsed: { path?: unknown; limit?: unknown };
    try {
      parsed = JSON.parse(input);
    } catch {
      return { result: `invalid tool input: ${errMsg(input)}`, isError: true };
    }
    if (typeof parsed.path !== 'string' || parsed.path === '') {
      return { result: 'invalid tool input: missing path', isError: true };
    }
    try {
      const data = await readFile(parsed.path, 'utf8');
      const limit = typeof parsed.limit === 'number' ? parsed.limit : 0;
      if (limit > 0 && data.length > limit) {
        return {
          result: `${data.slice(0, limit)}\n[... truncated at ${limit} bytes]`,
          isError: false,
        };
      }
      return { result: data, isError: false };
    } catch (e) {
      return { result: `read_file: ${errMsg(e)}`, isError: true };
    }
  }
}

Default.register(new ReadFileTool());
