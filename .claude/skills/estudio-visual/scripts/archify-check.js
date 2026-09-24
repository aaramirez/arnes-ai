#!/usr/bin/env node
// Revalida todas las fuentes Archify de un set de diagramas y comprueba que exista su HTML.
//
// Uso:
//   node .claude/skills/estudio-visual/scripts/archify-check.js <dir-archify> [--repo-root <path>] [--archify <archify.mjs>] [--json]
//
// <dir-archify> contiene <slug>.json y rendered/<slug>.html. El tipo se lee de `diagram_type`.
// --repo-root se pasa solo a los diagramas `architecture` que declaran `meta.repository`.
// Sale con código 1 si algún diagrama no valida (showcase: 9 checks, 0 errores, 0 warnings) o no tiene HTML.
// Solo Node.js, sin dependencias: corre en macOS, Linux y Windows.

import { existsSync, readdirSync, readFileSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const USAGE = 'Uso: archify-check.js <dir-archify> [--repo-root <path>] [--archify <archify.mjs>] [--json]';

export function parseArgs(argv) {
  const opts = { dir: null, repoRoot: null, archify: join(homedir(), '.agents', 'skills', 'archify', 'bin', 'archify.mjs'), json: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--json') opts.json = true;
    else if (a === '--repo-root') opts.repoRoot = argv[++i];
    else if (a === '--archify') opts.archify = argv[++i];
    else if (!opts.dir) opts.dir = a;
    else throw new Error(`Argumento inesperado: ${a}`);
  }
  return opts;
}

export function summarize(report) {
  const artifactChecks = Array.isArray(report?.checks) ? report.checks.length : 0;
  const errors = report?.composition?.summary?.errors ?? null;
  const warnings = report?.composition?.summary?.warnings ?? null;
  const pass = report?.ok === true && report?.composition?.status === 'pass' && artifactChecks === 9 && errors === 0 && warnings === 0;
  return { pass, artifactChecks, errors, warnings };
}

function checkOne(dir, file, opts) {
  const slug = file.replace(/\.json$/, '');
  const spec = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const type = spec.diagram_type;
  const html = existsSync(join(dir, 'rendered', `${slug}.html`));
  if (!type) return { slug, type: '?', pass: false, html, error: 'sin diagram_type' };
  const args = [opts.archify, 'validate', type, join(dir, file), '--quality', 'showcase', '--json'];
  if (type === 'architecture' && spec.meta?.repository && opts.repoRoot) args.push('--repo-root', resolve(opts.repoRoot));
  const run = spawnSync(process.execPath, args, { encoding: 'utf8' });
  let report;
  try { report = JSON.parse(run.stdout); } catch { return { slug, type, pass: false, html, error: (run.stderr || run.stdout || '').trim().slice(0, 200) }; }
  return { slug, type, html, ...summarize(report) };
}

function main() {
  let opts;
  try { opts = parseArgs(process.argv.slice(2)); } catch (e) { console.error(e.message); console.error(USAGE); process.exit(2); }
  if (opts.help) { console.log(USAGE); return; }
  if (!opts.dir || !existsSync(opts.dir)) { console.error(`No existe el directorio: ${opts.dir}`); console.error(USAGE); process.exit(2); }
  if (!existsSync(opts.archify)) { console.error(`Archify no encontrado en ${opts.archify} (usa --archify)`); process.exit(2); }

  const files = readdirSync(opts.dir).filter(f => f.endsWith('.json')).sort();
  const results = files.map(f => checkOne(opts.dir, f, opts));
  const failed = results.filter(r => !r.pass || !r.html);

  if (opts.json) console.log(JSON.stringify({ total: results.length, failed: failed.length, results }, null, 2));
  else {
    for (const r of results) {
      const status = r.pass && r.html ? 'ok  ' : 'FAIL';
      const detail = r.error ? r.error : `checks=${r.artifactChecks} errores=${r.errors} warnings=${r.warnings}`;
      console.log(`${status} ${r.slug} [${r.type}] ${detail}${r.html ? '' : ' SIN-HTML'}`);
    }
    console.log(`\n${results.length - failed.length}/${results.length} diagramas OK`);
  }
  process.exit(failed.length ? 1 : 0);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
