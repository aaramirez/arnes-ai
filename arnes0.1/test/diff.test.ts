import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildWriteDiff,
  extractBashCommand,
  extractWritePath,
  synthesizeNewFileDiff,
  unifiedDiff,
} from '../src/agent/diff.ts';

describe('diff helpers', () => {
  test('synthesizeNewFileDiff renders the /dev/null prelude', () => {
    const diff = synthesizeNewFileDiff('a.txt', 'line1\nline2\n');
    assert.match(diff, /^--- \/dev\/null/);
    assert.match(diff, /^\+\+\+ a\.txt \(new file\)/m);
    assert.match(diff, /^@@ -0,0 \+1,2 @@/m);
    assert.match(diff, /^\+line1$/m);
    assert.match(diff, /^\+line2$/m);
  });

  test('unifiedDiff emits headers and +/- lines for a real change', () => {
    const diff = unifiedDiff('foo\nbar\nbaz\n', 'foo\nqux\nbaz\n', 'a', 'b');
    assert.match(diff, /^--- a/m);
    assert.match(diff, /^\+\+\+ b/m);
    assert.match(diff, /^-bar$/m);
    assert.match(diff, /^\+qux$/m);
    assert.match(diff, /^ foo$/m);
  });

  test('unifiedDiff returns empty string for identical inputs', () => {
    assert.equal(unifiedDiff('same\n', 'same\n', 'a', 'b'), '');
  });

  test('extractWritePath and extractBashCommand parse valid JSON', () => {
    assert.equal(extractWritePath('{"path":"x.txt"}'), 'x.txt');
    assert.equal(extractBashCommand('{"command":"ls"}'), 'ls');
  });

  test('extractors return "" for malformed input', () => {
    assert.equal(extractWritePath('not json'), '');
    assert.equal(extractWritePath('{"path":42}'), '');
    assert.equal(extractBashCommand('not json'), '');
    assert.equal(extractBashCommand('{"command":7}'), '');
  });
});

describe('buildWriteDiff', () => {
  test('treats a nonexistent file as brand new', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'arnes0.1-diff-'));
    try {
      const diff = await buildWriteDiff(
        JSON.stringify({ path: join(dir, 'new.txt'), content: 'data' }),
      );
      assert.match(diff, /^--- \/dev\/null/);
      assert.match(diff, /\(new file\)/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('reports no changes when content matches the file on disk', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'arnes0.1-diff-'));
    try {
      const p = join(dir, 'x.txt');
      writeFileSync(p, 'same', 'utf8');
      const diff = await buildWriteDiff(JSON.stringify({ path: p, content: 'same' }));
      assert.match(diff, /identical/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('diffs current vs proposed for an existing file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'arnes0.1-diff-'));
    try {
      const p = join(dir, 'x.txt');
      writeFileSync(p, 'one\ntwo\n', 'utf8');
      const diff = await buildWriteDiff(JSON.stringify({ path: p, content: 'one\nthree\n' }));
      assert.match(diff, /\(current\)/);
      assert.match(diff, /\(proposed\)/);
      assert.match(diff, /^-two$/m);
      assert.match(diff, /^\+three$/m);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test('returns empty string for malformed input', async () => {
    assert.equal(await buildWriteDiff('not json'), '');
    assert.equal(await buildWriteDiff('{"path":42}'), '');
  });
});
