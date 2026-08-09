import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { REPO_ROOT } from './helpers.js';

const REPOS_PATH = join(REPO_ROOT, 'repos.json');
const OPENCODE_COMMANDS = join(REPO_ROOT, '.opencode', 'commands');
const OPENCODE_SCRIPTS = join(REPO_ROOT, '.opencode', 'scripts');
const CONFIG_PATH = join(REPO_ROOT, 'opencode.json');

const REPO_COMMANDS = ['getrepo', 'updaterepos'];

const DANGEROUS_PATTERNS = [
  { pattern: /rm\s+-rf\s+\/\s*$/, label: 'rm -rf /' },
  { pattern: /\bsudo\b/, label: 'sudo' },
  { pattern: />\s*\/dev\/sda/, label: '> /dev/sda' },
  { pattern: /\bdd\s+if=/, label: 'dd if=' },
  { pattern: /:\(\)\{\s*:\|:&\s*\};:/, label: 'fork bomb' },
  { pattern: /\beval\b/, label: 'eval' },
  { pattern: /\bexec\b/, label: 'exec' },
  { pattern: /`[^`]+`/, label: 'backtick injection' },
];

function loadConfig() {
  return JSON.parse(readFileSync(CONFIG_PATH, 'utf8'));
}

function runScript(name, ...args) {
  try {
    const out = execSync(`node .opencode/scripts/${name}.js ${args.join(' ')}`, {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, output: out };
  } catch (err) {
    return { code: err.status, output: err.stdout || '' };
  }
}

describe('repos.json', () => {
  it('exists and is valid JSON array', () => {
    assert.ok(existsSync(REPOS_PATH), 'repos.json should exist');
    const data = JSON.parse(readFileSync(REPOS_PATH, 'utf8'));
    assert.ok(Array.isArray(data), 'repos.json should be an array');
  });

  it('contains 13 reference repos', () => {
    const data = JSON.parse(readFileSync(REPOS_PATH, 'utf8'));
    assert.equal(data.length, 13, 'repos.json should contain 13 entries');
  });

  it('every entry has name and url', () => {
    const data = JSON.parse(readFileSync(REPOS_PATH, 'utf8'));
    for (const entry of data) {
      assert.ok(entry.name && typeof entry.name === 'string', 'entry should have name');
      assert.ok(entry.url && entry.url.startsWith('https://'), 'entry should have https url');
    }
  });
});

describe('.opencode commands', () => {
  for (const name of REPO_COMMANDS) {
    it(`${name}.md exists with description frontmatter`, () => {
      const file = join(OPENCODE_COMMANDS, `${name}.md`);
      assert.ok(existsSync(file), `${name}.md should exist`);
      const content = readFileSync(file, 'utf8');
      const fm = content.match(/^---\r?\n([\s\S]+?)\r?\n---/);
      assert.ok(fm, `${name}.md should have frontmatter`);
      assert.ok(fm[1].includes('description:'), `${name}.md should have description`);
    });

    it(`${name}.md references .opencode/scripts/ and not shared/scripts/`, () => {
      const content = readFileSync(join(OPENCODE_COMMANDS, `${name}.md`), 'utf8');
      assert.ok(content.includes('.opencode/scripts/'), `${name}.md should reference .opencode/scripts/`);
      assert.ok(!content.includes('shared/scripts/'), `${name}.md should NOT reference shared/scripts/`);
    });
  }
});

describe('.opencode scripts', () => {
  for (const name of REPO_COMMANDS) {
    it(`${name}.js exists`, () => {
      assert.ok(existsSync(join(OPENCODE_SCRIPTS, `${name}.js`)), `${name}.js should exist`);
    });

    it(`${name}.js --help exits 0 with usage`, () => {
      const { code, output } = runScript(name, '--help');
      assert.equal(code, 0, `${name}.js --help should exit 0`);
      assert.ok(output.includes('Usage'), `${name}.js --help should print usage`);
    });
  }
});

describe('opencode.json command registration', () => {
  let config;
  it('loads successfully with command section', () => {
    config = loadConfig();
    assert.ok(config.command, 'opencode.json should have command section');
  });

  for (const name of REPO_COMMANDS) {
    it(`registers ${name} command`, () => {
      config = config || loadConfig();
      const cmd = config.command[name];
      assert.ok(cmd, `${name} command should be registered`);
      assert.ok(cmd.description?.length >= 10, `${name} description should be >= 10 chars`);
      assert.ok(cmd.template?.length >= 20, `${name} template should be >= 20 chars`);
      assert.ok(/repo/i.test(cmd.template), `${name} template should mention repo`);
    });
  }

  it('no dangerous patterns in command templates and descriptions', () => {
    config = config || loadConfig();
    for (const [name, cmd] of Object.entries(config.command)) {
      const texts = [cmd.template || '', cmd.description || ''];
      for (const text of texts) {
        for (const { pattern, label } of DANGEROUS_PATTERNS) {
          assert.ok(!pattern.test(text), `Command "${name}" should not contain "${label}"`);
        }
      }
    }
  });

  it('no unmatched {{...}} placeholders in templates', () => {
    config = config || loadConfig();
    for (const [name, cmd] of Object.entries(config.command)) {
      const tpl = cmd.template || '';
      const matches = tpl.match(/\{\{\s*\w+\s*\}\}/g) || [];
      assert.equal(matches.length, 0, `Command "${name}" has unmatched placeholders: ${matches.join(', ')}`);
    }
  });
});

describe('.gitignore', () => {
  it('ignores repos/', () => {
    const content = readFileSync(join(REPO_ROOT, '.gitignore'), 'utf8');
    assert.ok(content.split('\n').map(l => l.trim()).includes('repos/'), '.gitignore should ignore repos/');
  });
});
