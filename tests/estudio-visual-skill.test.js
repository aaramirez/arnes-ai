import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { REPO_ROOT } from './helpers.js';
import { parseArgs, summarize } from '../.claude/skills/estudio-visual/scripts/archify-check.js';

const SKILL_DIR = join(REPO_ROOT, '.claude', 'skills', 'estudio-visual');
const SKILL = join(SKILL_DIR, 'SKILL.md');

describe('estudio-visual skill', () => {
  it('SKILL.md declares name and description in frontmatter', () => {
    assert.ok(existsSync(SKILL), 'SKILL.md should exist');
    const content = readFileSync(SKILL, 'utf8');
    assert.match(content, /^---\r?\n/, 'SKILL.md should open with frontmatter');
    assert.match(content, /^name: estudio-visual$/m);
    assert.match(content, /^description: /m);
  });

  it('every file referenced by SKILL.md exists', () => {
    const content = readFileSync(SKILL, 'utf8');
    for (const rel of ['references/plantillas.md', 'references/prompts-agentes.md', 'scripts/archify-check.js']) {
      assert.ok(content.includes(rel), `SKILL.md should reference ${rel}`);
      assert.ok(existsSync(join(SKILL_DIR, rel)), `${rel} should exist`);
    }
  });

  it('archify-check parses its arguments', () => {
    const opts = parseArgs(['docs/x/archify', '--repo-root', 'repos/a/b', '--json']);
    assert.equal(opts.dir, 'docs/x/archify');
    assert.equal(opts.repoRoot, 'repos/a/b');
    assert.equal(opts.json, true);
    assert.match(opts.archify, /archify\.mjs$/);
    assert.throws(() => parseArgs(['a', 'b']), /inesperado/);
  });

  it('archify-check only accepts a full showcase pass', () => {
    const good = { ok: true, checks: new Array(9).fill({}), composition: { status: 'pass', summary: { errors: 0, warnings: 0 } } };
    assert.equal(summarize(good).pass, true);
    assert.equal(summarize({ ...good, checks: new Array(4).fill({}) }).pass, false, 'basic validation is not showcase');
    assert.equal(summarize({ ...good, composition: { status: 'pass', summary: { errors: 0, warnings: 1 } } }).pass, false);
    assert.equal(summarize({ ...good, ok: false }).pass, false);
    assert.equal(summarize(undefined).pass, false);
  });
});
