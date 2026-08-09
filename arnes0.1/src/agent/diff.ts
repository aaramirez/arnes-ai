// Unified-diff helpers for the write_file approval modal.
// Port of internal/agent/diff.go (which used go-difflib).

import { readFile } from 'node:fs/promises';

// extractWritePath pulls the target path out of a write_file tool input
// (or '' when malformed) — used to build the "approve write to <path>?"
// prompt.
export function extractWritePath(rawInput: string): string {
  try {
    const parsed = JSON.parse(rawInput) as { path?: unknown };
    return typeof parsed.path === 'string' ? parsed.path : '';
  } catch {
    return '';
  }
}

// extractBashCommand pulls the command out of a bash tool input (or ''
// when malformed) — used for the "approve bash?" detail line.
export function extractBashCommand(rawInput: string): string {
  try {
    const parsed = JSON.parse(rawInput) as { command?: unknown };
    return typeof parsed.command === 'string' ? parsed.command : '';
  } catch {
    return '';
  }
}

// buildWriteDiff returns a unified diff describing what a write_file call
// would change on disk, for the approval modal's detail pane. Returns ''
// when the input is malformed (caller falls back to the plain "approve?"
// prompt). When the target file doesn't exist yet, the diff shows the
// file as brand-new (--- /dev/null).
export async function buildWriteDiff(rawInput: string): Promise<string> {
  let parsed: { path?: unknown; content?: unknown };
  try {
    parsed = JSON.parse(rawInput);
  } catch {
    return '';
  }
  if (typeof parsed.path !== 'string') {
    return '';
  }
  const content = typeof parsed.content === 'string' ? parsed.content : '';

  let existing: string;
  try {
    existing = await readFile(parsed.path, 'utf8');
  } catch {
    return synthesizeNewFileDiff(parsed.path, content);
  }

  if (existing === content) {
    return '(no changes: proposed content is identical to current file)\n';
  }
  return unifiedDiff(existing, content, `${parsed.path} (current)`, `${parsed.path} (proposed)`);
}

// splitLines splits on newlines, dropping the single trailing empty string
// produced when the input ends with \n — so "a\nb\n" counts as 2 lines, not 3.
function splitLines(s: string): string[] {
  if (s === '') {
    return [];
  }
  const lines = s.split('\n');
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

// synthesizeNewFileDiff renders the "new file" prelude when the write
// target doesn't exist on disk yet.
export function synthesizeNewFileDiff(path: string, content: string): string {
  const lines = splitLines(content);
  return `--- /dev/null\n+++ ${path} (new file)\n@@ -0,0 +1,${lines.length} @@\n${lines.map((l) => `+${l}`).join('\n')}\n`;
}

// unifiedDiff produces an LCS-based unified diff with 3 lines of context.
// Good enough for approval modals and small study examples; a production
// harness would reach for a Myers/patience implementation.
export function unifiedDiff(from: string, to: string, fromFile: string, toFile: string): string {
  const a = splitLines(from);
  const b = splitLines(to);

  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i]![j] = a[i] === b[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
    }
  }

  type Op = { kind: 'eq' | 'del' | 'add'; line: string };
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ kind: 'eq', line: a[i]! });
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      ops.push({ kind: 'del', line: a[i]! });
      i++;
    } else {
      ops.push({ kind: 'add', line: b[j]! });
      j++;
    }
  }
  while (i < n) {
    ops.push({ kind: 'del', line: a[i]! });
    i++;
  }
  while (j < m) {
    ops.push({ kind: 'add', line: b[j]! });
    j++;
  }

  const changed = ops.map((op, idx) => (op.kind === 'eq' ? -1 : idx)).filter((x) => x >= 0);
  if (changed.length === 0) {
    return '';
  }

  const CONTEXT = 3;
  const hunks: Array<[number, number]> = [];
  let start = -1;
  let end = -1;
  for (const c of changed) {
    const hs = Math.max(0, c - CONTEXT);
    const he = Math.min(ops.length - 1, c + CONTEXT);
    if (start === -1) {
      start = hs;
      end = he;
    } else if (hs <= end + 1) {
      end = Math.max(end, he);
    } else {
      hunks.push([start, end]);
      start = hs;
      end = he;
    }
  }
  hunks.push([start, end]);

  const lines: string[] = [`--- ${fromFile}`, `+++ ${toFile}`];
  let aLine = 1;
  let bLine = 1;
  let hunkOpIndex = 0;

  for (const [hs, he] of hunks) {
    // advance counters past the ops before this hunk
    while (hunkOpIndex < hs) {
      const op = ops[hunkOpIndex]!;
      if (op.kind !== 'add') aLine++;
      if (op.kind !== 'del') bLine++;
      hunkOpIndex++;
    }
    const slice = ops.slice(hs, he + 1);
    const aCount = slice.filter((op) => op.kind !== 'add').length;
    const bCount = slice.filter((op) => op.kind !== 'del').length;
    const aRange = aCount === 1 ? `${aLine}` : `${aLine},${aCount}`;
    const bRange = bCount === 1 ? `${bLine}` : `${bLine},${bCount}`;
    lines.push(`@@ -${aRange} +${bRange} @@`);
    for (const op of slice) {
      lines.push(`${op.kind === 'del' ? '-' : op.kind === 'add' ? '+' : ' '}${op.line}`);
      if (op.kind !== 'add') aLine++;
      if (op.kind !== 'del') bLine++;
    }
    hunkOpIndex = he + 1;
  }

  return `${lines.join('\n')}\n`;
}
