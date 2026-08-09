import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Registry } from '../src/tool/registry.ts';
import { BashTool } from '../src/tool/bash.ts';
import { ReadFileTool } from '../src/tool/readfile.ts';
import { WriteFileTool } from '../src/tool/writefile.ts';
import type { Tool } from '../src/tool/tool.ts';
import { noopToolDef } from './helpers.ts';

const isWin = process.platform === 'win32';

describe('Registry', () => {
  test('register/get/subset and sorted definitions', () => {
    const r = new Registry();
    const a: Tool = {
      definition: () => noopToolDef('zeta'),
      execute: async () => ({ result: 'a', isError: false }),
    };
    const b: Tool = {
      definition: () => noopToolDef('alpha'),
      execute: async () => ({ result: 'b', isError: false }),
    };
    r.register(a);
    r.register(b);
    assert.ok(r.get('zeta'));
    assert.equal(r.get('nope'), undefined);
    assert.deepEqual(r.definitions().map((d) => d.name), ['alpha', 'zeta']);
    const sub = r.subset('zeta');
    assert.deepEqual(sub.definitions().map((d) => d.name), ['zeta']);
  });

  test('execute dispatches by name and returns error result for unknown tools', async () => {
    const r = new Registry();
    const out = await r.execute('missing', '{}');
    assert.equal(out.isError, true);
    assert.match(out.result, /unknown tool/);
  });
});

describe('BashTool', () => {
  let tool: BashTool;
  beforeEach(() => {
    tool = new BashTool();
  });

  test('runs a command and returns combined output', async () => {
    const { result, isError } = await tool.execute(JSON.stringify({ command: 'echo hello' }));
    assert.equal(isError, false);
    assert.match(result, /hello/);
  });

  test('reports non-zero exit as an error result', async () => {
    const cmd = isWin ? 'exit /b 3' : 'exit 3';
    const { result, isError } = await tool.execute(JSON.stringify({ command: cmd }));
    assert.equal(isError, true);
    assert.match(result, /3/);
  });

  test('rejects malformed JSON input as an error result', async () => {
    const { result, isError } = await tool.execute('not json');
    assert.equal(isError, true);
    assert.match(result, /invalid tool input/);
  });

  test('exposes a definition with a command property', () => {
    const def = tool.definition();
    assert.equal(def.name, 'bash');
    assert.deepEqual(def.required, ['command']);
  });
});

describe('ReadFileTool / WriteFileTool', () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'arnes0.1-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  test('read_file reads a UTF-8 file', async () => {
    const p = join(dir, 'a.txt');
    writeFileSync(p, 'line one\nline two\n', 'utf8');
    const { result, isError } = await new ReadFileTool().execute(JSON.stringify({ path: p }));
    assert.equal(isError, false);
    assert.match(result, /line one/);
  });

  test('read_file honors a byte limit', async () => {
    const p = join(dir, 'big.txt');
    writeFileSync(p, 'abcdefghij', 'utf8');
    const { result, isError } = await new ReadFileTool().execute(
      JSON.stringify({ path: p, limit: 4 }),
    );
    assert.equal(isError, false);
    assert.match(result, /^abcd/);
    assert.match(result, /truncated/);
  });

  test('read_file returns an error result for a missing path', async () => {
    const { result, isError } = await new ReadFileTool().execute(
      JSON.stringify({ path: join(dir, 'missing.txt') }),
    );
    assert.equal(isError, true);
  });

  test('write_file creates parent directories and persists content', async () => {
    const p = join(dir, 'nested', 'deep', 'file.txt');
    const { result, isError } = await new WriteFileTool().execute(
      JSON.stringify({ path: p, content: 'written' }),
    );
    assert.equal(isError, false);
    assert.match(result, /wrote/);
    assert.equal(existsSync(p), true);
    assert.equal(readFileSync(p, 'utf8'), 'written');
    assert.equal(existsSync(dir), true);
  });

  test('write_file with no content arg still writes an empty file', async () => {
    const p = join(dir, 'empty.txt');
    const { isError } = await new WriteFileTool().execute(JSON.stringify({ path: p }));
    assert.equal(isError, false);
    assert.equal(readFileSync(p, 'utf8'), '');
  });

  test('write_file rejects malformed JSON', async () => {
    const { result, isError } = await new WriteFileTool().execute('nope');
    assert.equal(isError, true);
    assert.match(result, /invalid tool input/);
  });

  test('mkdir helper in write_file does not fail on existing dirs', async () => {
    const existing = join(dir, 'existing');
    mkdirSync(existing);
    const p = join(existing, 'x.txt');
    const { isError } = await new WriteFileTool().execute(JSON.stringify({ path: p, content: 'x' }));
    assert.equal(isError, false);
  });
});
