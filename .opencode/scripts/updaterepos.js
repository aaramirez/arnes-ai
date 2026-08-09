#!/usr/bin/env node
/**
 * updaterepos.js — Pull latest changes for all repos in repos/
 *
 * Usage:
 *   node shared/scripts/updaterepos.js              # update all repos
 *   node shared/scripts/updaterepos.js org/repo     # update specific repo
 *   node shared/scripts/updaterepos.js --help       # show help
 *
 * Scans repos/ for directories containing .git, runs git pull --ff-only
 * on each one. Reports success/failure per repo.
 *
 * Cross-platform: macOS, Linux, Windows — zero external dependencies.
 */

import { execSync } from 'child_process';
import { existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');
const REPOS_DIR = join(ROOT, 'repos');

function run(cmd, cwd) {
  try {
    return execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

function findRepos(baseDir) {
  if (!existsSync(baseDir)) return [];
  const repos = [];
  for (const entry of readdirSync(baseDir)) {
    const full = join(baseDir, entry);
    if (!statSync(full).isDirectory()) continue;
    // Check for org/repo structure (e.g. repos/anthropics/skills/)
    const sub = join(full, '.git');
    if (existsSync(sub)) {
      repos.push({ name: entry, path: full });
      continue;
    }
    // Check one level deeper for org/repo
    for (const subEntry of readdirSync(full)) {
      const subPath = join(full, subEntry);
      if (statSync(subPath).isDirectory() && existsSync(join(subPath, '.git'))) {
        repos.push({ name: `${entry}/${subEntry}`, path: subPath });
      }
    }
  }
  return repos;
}

function showHelp() {
  console.log(`
Usage:
  node shared/scripts/updaterepos.js              update all repos in repos/
  node shared/scripts/updaterepos.js org/repo     update specific repo
  node shared/scripts/updaterepos.js --help       show this help

Runs git pull --ff-only on each cloned repository.
Reports success/failure per repo.
  `);
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  if (!existsSync(REPOS_DIR)) {
    console.log('No repos/ directory found. Nothing to update.');
    process.exit(0);
  }

  const repos = findRepos(REPOS_DIR);
  const specific = args.filter(a => !a.startsWith('--'));

  const toUpdate = specific.length > 0
    ? repos.filter(r => specific.includes(r.name))
    : repos;

  if (toUpdate.length === 0) {
    if (specific.length > 0) {
      console.error(`No cloned repo matches: ${specific.join(', ')}`);
      console.error(`Found repos: ${repos.map(r => r.name).join(', ') || '(none)'}`);
      process.exit(1);
    }
    console.log('No cloned repositories found in repos/.');
    process.exit(0);
  }

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const repo of toUpdate) {
    console.log(`\n${repo.name}`);
    const result = run('git pull --ff-only', repo.path);
    if (result === null) {
      console.log('  ⚠ pull failed (local changes or network issue)');
      failed++;
    } else if (result.includes('Already up to date') || result.includes('Already up-to-date')) {
      console.log('  ✓ already up to date');
      skipped++;
    } else {
      console.log(`  ✓ ${result.split('\n')[0]}`);
      updated++;
    }
  }

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Updated: ${updated}  Up to date: ${skipped}  Failed: ${failed}`);
}

main();
