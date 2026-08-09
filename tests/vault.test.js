import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { REPO_ROOT } from './helpers.js';

const DOCS = join(REPO_ROOT, 'docs');
const STUDIES_DIR = join(DOCS, 'harness-studies');
const HOME = join(DOCS, 'Home.md');
const CRITERIO = join(STUDIES_DIR, 'Criterio-de-Evaluacion.md');
const PLANTILLA = join(STUDIES_DIR, 'Plantilla-Estudio-Harness.md');
const MATRIZ = join(STUDIES_DIR, 'Matriz-Comparativa.md');

const FRAMEWORK_FILES = new Set([
  'Criterio-de-Evaluacion.md',
  'Plantilla-Estudio-Harness.md',
  'Matriz-Comparativa.md',
]);

const REQUIRED_SECTIONS = [
  '0. Ficha',
  '1. Estructura del repo',
  '2. Capas y componentes',
  '3. Flujo end-to-end',
  '4. Contratos internos',
  '5. Agent loop',
  '6. Mensajes y contexto',
  '7. Provider seam',
  '8. Tool runtime',
  '9. Permisos y seguridad',
  '10. Compaction / gestión de contexto',
  '11. Subagentes / orquestación',
  '12. UI / presentación',
  '13. Configuración y extensibilidad',
  '14. Decisiones de diseño destacadas',
  '15. Valoración y lecciones',
];

const DIMENSIONS = REQUIRED_SECTIONS.length;

function read(file) {
  return readFileSync(file, 'utf8');
}

function h2Headers(content) {
  return (content.match(/^##\s+.+$/gm) || []).map(h => h.replace(/^##\s+/, '').trim());
}

function repoNames() {
  const data = JSON.parse(readFileSync(join(REPO_ROOT, 'repos.json'), 'utf8'));
  return data.map(r => r.name);
}

function firstTable(content) {
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex(l => /^\s*\|/.test(l));
  if (start === -1) return [];
  const rows = [];
  for (let i = start; i < lines.length && /^\s*\|/.test(lines[i]); i++) {
    rows.push(lines[i].split('|').slice(1, -1).map(c => c.trim()));
  }
  return rows;
}

function frontmatter(content) {
  if (!/^---\r?\n/.test(content)) return null;
  const end = content.indexOf('\n---');
  if (end === -1) return null;
  return content.slice(4, end);
}

function hasFrontmatterKeys(file, keys) {
  const fm = frontmatter(read(file));
  if (fm === null) return false;
  return keys.every(k => new RegExp(`^${k}:`, 'm').test(fm));
}

function markdownFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.obsidian') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...markdownFiles(full));
    else if (entry.name.endsWith('.md')) out.push(full);
  }
  return out;
}

const FRAMEWORK_KEYS = ['title', 'type', 'tags'];
const STUDY_KEYS = ['title', 'type', 'repo', 'categoría', 'lenguaje', 'estado', 'fecha'];

describe('vault structure', () => {
  it('every vault note opens with YAML frontmatter', () => {
    const files = markdownFiles(DOCS);
    assert.ok(files.length > 0, 'docs/ should contain markdown notes');
    for (const file of files) {
      assert.ok(hasFrontmatterKeys(file, ['title']), `${file} should start with --- frontmatter`);
    }
  });

  it('framework docs declare title, type and tags', () => {
    for (const file of [CRITERIO, PLANTILLA, MATRIZ]) {
      for (const key of FRAMEWORK_KEYS) {
        assert.ok(hasFrontmatterKeys(file, [key]), `${file} frontmatter should have "${key}"`);
      }
    }
  });

  it('docs/Home.md exists and links to the study framework', () => {
    assert.ok(existsSync(HOME), 'docs/Home.md should exist');
    const content = read(HOME);
    for (const link of ['[[Criterio-de-Evaluacion]]', '[[Plantilla-Estudio-Harness]]', '[[Matriz-Comparativa]]']) {
      assert.ok(content.includes(link), `Home.md should link to ${link}`);
    }
  });

  it('Criterio-de-Evaluacion.md defines every dimension and the scale', () => {
    assert.ok(existsSync(CRITERIO), 'Criterio-de-Evaluacion.md should exist');
    const content = read(CRITERIO);
    for (const section of REQUIRED_SECTIONS) {
      const title = section.replace(/^\d+\.\s*/, '');
      assert.ok(content.includes(title), `Criterio should describe dimension "${title}"`);
    }
    for (const marker of ['✔', '◐', '✖', 'n/a']) {
      assert.ok(content.includes(marker), `Criterio should mention scale marker ${marker}`);
    }
  });

  it('Plantilla-Estudio-Harness.md declares all required sections', () => {
    assert.ok(existsSync(PLANTILLA), 'Plantilla-Estudio-Harness.md should exist');
    const headers = h2Headers(read(PLANTILLA));
    for (const section of REQUIRED_SECTIONS) {
      assert.ok(headers.includes(section), `Plantilla should have section "${section}"`);
    }
  });

  it('Matriz-Comparativa.md has a column per reference repo', () => {
    assert.ok(existsSync(MATRIZ), 'Matriz-Comparativa.md should exist');
    const table = firstTable(read(MATRIZ));
    assert.ok(table.length > 0, 'Matriz should contain a markdown table');
    const columns = table[0].slice(1).map(c => c.replace(/`/g, ''));
    for (const name of repoNames()) {
      assert.ok(columns.includes(name), `Matriz should have a column for ${name}`);
    }
  });

  it('Matriz-Comparativa.md has a row per dimension', () => {
    const table = firstTable(read(MATRIZ));
    const dataRows = table.filter(r => {
      const first = r[0];
      return first && first !== '#' && !/^:?-+$/.test(first);
    });
    for (let i = 0; i < DIMENSIONS; i++) {
      assert.ok(dataRows.some(r => r[0] === String(i)), `Matriz should have a row for dimension ${i}`);
    }
  });
});

describe('harness study notes', () => {
  it('every study note follows the template sections', () => {
    if (!existsSync(STUDIES_DIR)) return;
    const notes = readdirSync(STUDIES_DIR)
      .filter(f => f.endsWith('.md') && !FRAMEWORK_FILES.has(f));
    for (const file of notes) {
      const headers = h2Headers(read(join(STUDIES_DIR, file)));
      for (const section of REQUIRED_SECTIONS) {
        assert.ok(headers.includes(section), `${file} should have section "${section}"`);
      }
    }
  });

  it('every study note declares the frontmatter fields', () => {
    if (!existsSync(STUDIES_DIR)) return;
    const notes = readdirSync(STUDIES_DIR)
      .filter(f => f.endsWith('.md') && !FRAMEWORK_FILES.has(f));
    for (const file of notes) {
      for (const key of STUDY_KEYS) {
        assert.ok(hasFrontmatterKeys(join(STUDIES_DIR, file), [key]), `${file} frontmatter should have "${key}"`);
      }
    }
  });

  it('every study note cites evidence from repos/ and links the matrix', () => {
    if (!existsSync(STUDIES_DIR)) return;
    const notes = readdirSync(STUDIES_DIR)
      .filter(f => f.endsWith('.md') && !FRAMEWORK_FILES.has(f));
    for (const file of notes) {
      const content = read(join(STUDIES_DIR, file));
      assert.match(content, /repos\//, `${file} should cite evidence under repos/`);
      assert.ok(content.includes('[[Matriz-Comparativa]]'), `${file} should link [[Matriz-Comparativa]]`);
    }
  });
});
