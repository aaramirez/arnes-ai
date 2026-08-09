#!/usr/bin/env node
/**
 * getrepo.js — Add a GitHub repository to repos.json and clone it to repos/
 *
 * Usage:
 *   node shared/scripts/getrepo.js https://github.com/org/repo
 *   node shared/scripts/getrepo.js org/repo
 *   node shared/scripts/getrepo.js org/repo --description "My description"
 *   node shared/scripts/getrepo.js --help
 *
 * Parses the URL or org/repo format, adds an entry to repos.json
 * (if not already present), and clones the repo to repos/<org>/<repo>/.
 *
 * Cross-platform: macOS, Linux, Windows — zero external dependencies.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');
const REPOS_DIR = join(ROOT, 'repos');
const CONFIG_PATH = join(ROOT, 'repos.json');

function loadConfig() {
  if (!existsSync(CONFIG_PATH)) return [];
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function saveConfig(config) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n');
}

function run(cmd, cwd) {
  try {
    execSync(cmd, { cwd, stdio: 'pipe', encoding: 'utf-8' });
    return true;
  } catch {
    return false;
  }
}

function parseRepoUrl(input) {
  let url, name;

  // Full GitHub URL: https://github.com/org/repo or git@github.com:org/repo
  const httpsMatch = input.match(/github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/);
  if (httpsMatch) {
    name = `${httpsMatch[1]}/${httpsMatch[2]}`;
    url = `https://github.com/${name}.git`;
    return { name, url };
  }

  // Short form: org/repo
  const shortMatch = input.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (shortMatch) {
    name = `${shortMatch[1]}/${shortMatch[2]}`;
    url = `https://github.com/${name}.git`;
    return { name, url };
  }

  return null;
}

function showHelp() {
  console.log(`
Usage:
  node shared/scripts/getrepo.js <url-or-org/repo>           add and clone a repo
  node shared/scripts/getrepo.js <url> --description "text"  add with description
  node shared/scripts/getrepo.js --help                      show this help

Examples:
  node shared/scripts/getrepo.js https://github.com/anthropics/skills
  node shared/scripts/getrepo.js anthropics/skills
  node shared/scripts/getrepo.js vercel/next.js --description "Next.js framework"

What it does:
  1. Parses the GitHub URL or org/repo format
  2. Adds an entry to repos.json (skips if already present)
  3. Clones the repo to repos/<org>/<repo>/
  `);
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h') || args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const input = args.find(a => !a.startsWith('--'));
  if (!input) {
    console.error('Error: provide a repository URL or org/repo.');
    process.exit(1);
  }

  const parsed = parseRepoUrl(input);
  if (!parsed) {
    console.error(`Error: cannot parse repository: ${input}`);
    console.error('Expected format: https://github.com/org/repo or org/repo');
    process.exit(1);
  }

  const { name, url } = parsed;
  const descIdx = args.indexOf('--description');
  const description = descIdx >= 0 ? args[descIdx + 1] || '' : '';

  // Load config
  const config = loadConfig();
  const exists = config.find(r => r.name === name);

  if (exists) {
    console.log(`Repository '${name}' already in repos.json.`);
  } else {
    const entry = { name, url };
    if (description) entry.description = description;
    config.push(entry);
    saveConfig(config);
    console.log(`Added '${name}' to repos.json.`);
  }

  // Clone
  const dest = join(REPOS_DIR, name);
  if (existsSync(join(dest, '.git'))) {
    console.log(`Repository already cloned at repos/${name}/`);
  } else {
    console.log(`Cloning ${url}...`);
    mkdirSync(dirname(dest), { recursive: true });
    const ok = run(`git clone --depth 1 ${url} "${dest}"`, ROOT);
    if (ok) {
      console.log(`Cloned to repos/${name}/`);
    } else {
      console.error('Clone failed.');
      process.exit(1);
    }
  }
}

main();
