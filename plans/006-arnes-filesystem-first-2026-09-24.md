# arnes0.1 filesystem-first (agent/ como interfaz de autoría)

## Objective

Hacer que `arnes0.1` arme su agente a partir de un directorio `agent/` con ranuras convencionales, como eve: la ruta es la identidad, los defaults ocupan las mismas ranuras, todo es inspeccionable y el markdown es dato.

El loop (`Agent`), los providers y el `Registry` **no cambian**. Solo se agrega una capa de descubrimiento, validación y ensamblado entre el disco y `main.ts`.

Diseño: `docs/propuestas/arnes0.1/Arnes-Filesystem-First.md`.

## Requirements

1. **Sin `agent/`, el comportamiento es idéntico al actual** (prompt, `bash` / `read_file` / `write_file`, `maxTurns: 50`, `NoCompaction`). Los tests existentes pasan sin tocarlos. — priority: high
2. `discover(root, fs)` es **pura** sobre un puerto `FileSystem` y devuelve un `AgentManifest` (fuentes ordenadas + diagnósticos). No importa código. — priority: high
3. Ranuras de la **fase 1**: `agent.ts` (`defineAgent`), `instructions.md` o `instructions/*.md`, `tools/<nombre>.ts` (`defineTool` o `disabled()`). — priority: high
4. Ranuras de la **fase 2**: `skills/<nombre>.md` (frontmatter `description`, tool `load_skill`) y `commands/<nombre>.md` (plantilla con `$ARGUMENTS`). — priority: medium
5. **La ruta es la identidad:** el nombre es el nombre del archivo, con `^[a-z][a-z0-9_]*$`. Un nombre inválido o duplicado (sin distinguir mayúsculas) es un diagnóstico de error con la ruta. — priority: high
6. **Defaults en las mismas ranuras:** un archivo propio reemplaza al default del mismo nombre, `disabled()` lo quita y `defaultTools: false` quita todos. — priority: high
7. **Confianza del proyecto antes de importar `.ts`:**
   - La decisión se guarda en `~/.arnes/trust.json`, por ruta canónica.
   - En modo no interactivo y sin decisión guardada, se falla cerrado: se cargan markdown y defaults, y se emite una advertencia.
   - priority: high
8. **Frontmatter:** subconjunto de YAML (`clave: valor`, listas `- x`), con parser propio. Todo lo demás (`---js`, anclas, bloques) es un error. — priority: high
9. **Inspección:**
   - `/info` en el REPL.
   - `node src/main.ts --info [--json]`, que imprime el manifiesto y sale con código 1 si hay errores.
   - priority: high
10. Cero dependencias de runtime, Node ≥ 23.6 sin build, y funcionamiento en macOS, Linux y Windows (rutas normalizadas a POSIX en el manifiesto). — priority: high

## Architecture

### Files to create (en `arnes0.1/`)

| Archivo | Qué contiene |
| --- | --- |
| `src/fs/types.ts` | `AgentManifest`, `ToolSource`, `SkillSource`, `CommandSource`, `Diagnostic`, `AgentConfigSource` y el puerto `FileSystem` |
| `src/fs/node-fs.ts` | Adaptador del puerto sobre `node:fs/promises` |
| `src/fs/frontmatter.ts` | `parseFrontmatter(text)`: `{ data, body }` o un error tipado |
| `src/fs/discover.ts` | `discover(root, fs, defaults)`: el `AgentManifest` |
| `src/fs/defaults.ts` | Las fuentes por defecto (tools built-in, prompt actual, `maxTurns: 50`, `NoCompaction`), movidas desde `main.ts` |
| `src/fs/trust.ts` | `isTrusted(path)` / `recordTrust(path, decision)` sobre `~/.arnes/trust.json` (ruta inyectable para los tests) |
| `src/fs/load.ts` | `load(manifest, { trusted })`: import dinámico de los `.ts`, validación de las exportaciones por defecto, y armado de `Registry`, system prompt, `AgentOptions` y comandos |
| `src/define.ts` | `defineAgent(config)`, `defineTool(spec)` y `disabled()`. Son helpers puros; `defineTool` devuelve un `Tool` que implementa la interfaz actual |
| `src/tool/loadskill.ts` | La tool `load_skill`, que devuelve el cuerpo de una skill por nombre (fase 2) |
| `test/fs-discover.test.ts` | Tests de descubrimiento con un disco en memoria |
| `test/fs-frontmatter.test.ts` | Tests del parser, incluidos los casos que debe rechazar |
| `test/fs-load.test.ts` | Tests de carga sobre `test/fixtures/agent-basic/`, `agent-override/` y `agent-invalid/` |
| `test/fixtures/agent-*/**` | Agentes de ejemplo para los tests |

### Files to modify

- **`src/tool/bash.ts`, `readfile.ts`, `writefile.ts`:** quitar `Default.register(...)`, que es un efecto secundario al importar. Las clases siguen exportadas. `Default` se mantiene y lo llena el loader, por compatibilidad.
- **`src/main.ts`:**
  - reemplazar el prompt fijo y los imports de efecto por `discover` → `trust` → `load` → `new Agent(...)`;
  - agregar `--info` y `--json`;
  - mantener `loadAgentsContext()` como contexto de proyecto (R8).
- **`src/commands.ts`:**
  - `registerCommand` exportado para los comandos de `agent/commands/`;
  - el comando `/info`;
  - `/skills` (fase 2).
- **`arnes0.1/README.md`:** sección "Authoring an agent" con el árbol de ejemplo, y la tabla de ranuras y reglas.

### Decisions

- **Descubrimiento en el arranque, sin build:** Node ≥ 23.6 importa `.ts` directo. `--info --json` reemplaza a los artefactos `.eve/` como forma de inspección.
- **`discover()` pura y `load()` impura:** es la única forma de testear las reglas R1–R8 sin tocar el disco ni ejecutar código. Es el mismo patrón que `MockProvider`.
- **Confianza tomada de pi, no de eve:** eve compila código del autor en su propio deploy. arnes, en cambio, abre repos ajenos en la máquina del usuario, así que importar `agent/tools/*.ts` sin preguntar sería ejecución de código arbitrario.
- **`agent.ts` en lugar de `agent.json`:** tipado, autodescriptivo, y consistente con que las tools son `.ts`. El descubrimiento lo lee con `import()` solo si hay confianza. Si no la hay, se usan los defaults y se emite una advertencia.
- **Solo tres ranuras en la fase 1:** evita ranuras vacías sin runtime (`channels`, `schedules`, `sandbox`). Se agregan cuando exista la capacidad (EVO-01 del libro: mantener el núcleo pequeño).

## TDD Flow

1. **`fs-frontmatter.test.ts` (rojo → verde):**
   - Acepta `description: x`, listas y ausencia de frontmatter.
   - Rechaza `---js`, líneas mal formadas y frontmatter sin cerrar.
2. **`fs-discover.test.ts` (rojo → verde):**
   - Sin `agent/`, el manifiesto con `root: null` es igual a los defaults actuales. **Este test de compatibilidad va primero.**
   - `tools/grep.ts` produce la tool `grep` con origen `authored`.
   - `tools/bash.ts` reemplaza al default, y `disabled()` lo quita (el diagnóstico queda en `/info`).
   - `defaultTools: false` quita todos los defaults.
   - `Bad-Name.ts` y el duplicado `grep.ts` / `GREP.ts` dan un error con código y ruta.
   - `instructions/` concatena en orden alfabético, e `instructions.md` más `instructions/` a la vez es un error.
   - Las salidas están ordenadas por nombre.
3. **`fs-load.test.ts` (rojo → verde):**
   - Sobre `fixtures/agent-basic/`, el `Registry` tiene `bash`, `read_file`, `write_file` y `grep`, el prompt usa `instructions.md` y `maxTurns` sale de `agent.ts`.
   - Sin confianza, no se importa ningún `.ts` (se verifica con un fixture que lanza al importarse) y se usan markdown y defaults.
   - Una exportación por defecto inválida da un diagnóstico, no un crash.
4. **`commands.test.ts` (ampliar):** `/info` imprime las fuentes y los diagnósticos.
5. **`agent.test.ts` / `smoke.test.ts`:** sin cambios. Deben seguir en verde, porque son la prueba de R3.
6. **Fase 2**, con el mismo ciclo: `skills/` + `load_skill`, y `commands/*.md` con `$ARGUMENTS`.

## Verification

- `npm test` en la raíz de arnes-ai (incluye `arnes0.1/test`) y `npm run typecheck` en `arnes0.1/` pasan.
- **Manual:**
  1. En un directorio sin `agent/`, `npm start` se comporta igual que antes.
  2. Con `test/fixtures/agent-basic/` como raíz, `node src/main.ts --info` lista las fuentes, y `--info --json` produce JSON válido.
  3. En un directorio no confiado, aparece la pregunta de confianza. Si se rechaza, se carga solo markdown.
  4. Poner un `agent/tools/bash.ts` con `export default disabled()`, y comprobar que `/tools` ya no muestra `bash`.
- En Windows: nombres con mayúsculas y rutas con `\` dan el mismo manifiesto normalizado.

## Notas

- **Fase 3 (fuera de este plan):**
  - `hooks/` (`before_tool` / `after_tool`, alineado con P-12 del libro y los hooks de pi);
  - `subagents/<nombre>/` (reusa `discover()` de forma recursiva y `Registry.subset`, que ya existe);
  - compactación elegida por nombre en `agent.ts`.
- **Relación con el libro:** esta capa es un **adaptador de autoría** de `AgentConfig` (C-002) y de `CapabilityDescriptor` (C-018). Ver §7 del diseño y el capítulo de ExtensionHost (CH-38 en el plan 005).
- **Riesgo:** el parser de frontmatter propio. Se mitiga limitándolo a un subconjunto mínimo con tests de rechazo.
