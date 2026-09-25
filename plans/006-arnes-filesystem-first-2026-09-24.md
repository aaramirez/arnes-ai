# arnes0.1 filesystem-first (agent/ obligatorio como interfaz de autoría)

## Objective

Hacer que `arnes0.1` se configure **exclusivamente** desde un directorio `agent/` obligatorio, con la estructura de la propuesta v2 (`docs/propuestas/arnes0.1/Arnes-Filesystem-First.md`):
- identidad;
- capacidades;
- integraciones de salida (MCP, OpenAPI, A2A, datos);
- entradas y automatización (canales HTTP/WS/MCP/A2A, schedules, triggers);
- gobierno y operación.

El manifiesto **reconoce todas las ranuras desde la fase 1**, y el runtime de cada familia llega por fases. El loop (`Agent`), los providers y el `Registry` no cambian.

## Requirements

1. **`agent/`, `agent.ts` (con `description`, `model` y `limits`) e `instructions.md` son obligatorios.**
   - Sin ellos, arnes sale con el código `discover/required-*-missing`, la ruta esperada y la sugerencia `arnes init`.
   - `arnes init` genera el esqueleto mínimo.
   - priority: high
2. `discover(root, fs, globalRoot)` es **pura** sobre un puerto `FileSystem`. Devuelve un `AgentManifest` (fuentes con `origin` project/global/default + diagnósticos con código) y reconoce **las 20 ranuras** de la v2. — priority: high
3. **Una sola gramática de nombres:** `^[a-z][a-z0-9-]{0,63}$`. Una subcarpeta agrega un prefijo con `-`, y un duplicado (sin distinguir mayúsculas) es un error. — priority: high
4. **Defaults en las mismas ranuras:** `tools/bash|read_file|write_file.ts` y `channels/cli.ts`. `disabled()` quita un default y `defaultTools: false` quita todas las tools por defecto. — priority: high
5. **Confianza del proyecto** (`~/.arnes/trust.json`) antes de importar un `.ts`. Sin confianza, no arranca, salvo `--untrusted` (solo markdown). — priority: high
6. **Frontmatter:** subconjunto de YAML con parser propio. `---js` y la sintaxis desconocida son un error. — priority: high
7. **Validación semántica antes de ensamblar:**
   - secretos referenciados y declarados en `secrets.ts`;
   - ningún literal con forma de secreto;
   - `policies/tools.ts` presente si hay tools con side effects (default `deny`);
   - todo canal distinto de `cli` necesita regla en `policies/admission.ts`, y sin ella no escucha;
   - toda fuente de `data/` declara `classification`, y si no la declara se trata como `restricted`.
   - priority: high
8. **Ámbito global** `~/.arnes/`: solo skills, commands y connections personales. Gana el proyecto, y el origen queda visible. — priority: medium
9. **Inspección:** `arnes info [--json]`, `/info` y `.arnes/manifest.json` + `diagnostics.json` (en `.gitignore`). — priority: high
10. **Fase 1 (runtime):** `agent.ts`, `instructions`, `tools/`, `skills/` (`load_skill`), `commands/` (`$1`, `$ARGUMENTS`), `policies/tools.ts` (reemplaza a la puerta de confirmación actual), `secrets.ts` y `lib/`. — priority: high
11. **Ranuras de fases 2–5 reconocidas pero sin runtime:** se reportan como `discover/slot-not-yet-supported` (warning), nunca se ignoran en silencio. — priority: high
12. Cero dependencias de runtime, Node ≥ 23.6 sin build, y funcionamiento en macOS, Linux y Windows (rutas POSIX en el manifiesto). — priority: high

## Architecture

### Files to create (en `arnes0.1/`)

| Archivo | Qué contiene |
| --- | --- |
| `src/fs/types.ts` | `SlotKind` (las 20 ranuras), `Source`, `Origin`, `AgentManifest`, `Diagnostic` y el puerto `FileSystem` |
| `src/fs/slots.ts` | La **tabla de ranuras**, fuente única de la estructura: forma, recursión, raíz o subagente, obligatoria, fase de soporte |
| `src/fs/grammar.ts` | La regex de nombres, los prefijos por subcarpeta y los códigos `discover/*` |
| `src/fs/node-fs.ts` | Adaptador del puerto sobre `node:fs/promises` |
| `src/fs/frontmatter.ts` | Parser del subconjunto de YAML |
| `src/fs/discover.ts` | Recorre `agent/` y `~/.arnes/` y fusiona con los defaults |
| `src/fs/defaults.ts` | Tools built-in, `channels/cli`, y el prompt y los límites de referencia para `arnes init` |
| `src/fs/trust.ts` | Decisiones de confianza (ruta inyectable para los tests) |
| `src/fs/load.ts` | Import dinámico de los `.ts` y validación de `export default` por ranura |
| `src/fs/validate.ts` | Secretos, políticas, admisión y clasificación (Requirement 7) |
| `src/fs/assemble.ts` | Arma `Registry`, system prompt, `AgentOptions` y comandos a partir del manifiesto |
| `src/fs/init.ts` | `arnes init`: `agent/agent.ts`, `agent/instructions.md`, `agent/policies/tools.ts` y `.gitignore` con `.arnes/` |
| `src/define.ts` | `defineAgent`, `defineTool`, `disabled`, `defineToolPolicy`, `defineSecrets` (fase 1). También las firmas de `defineMcpConnection`, `defineOpenApiConnection`, `defineA2aAgent`, `defineDataSource`, `defineChannel`, `defineSchedule`, `defineTrigger` (validadas, sin runtime) |
| `src/policy/engine.ts` | Evalúa `policies/tools.ts` (allow / deny / require_approval, default deny) y se conecta al `confirm` actual |
| `src/tool/loadskill.ts` | La tool `load_skill` |
| `test/fs-*.test.ts` | frontmatter, grammar, discover, load, validate, assemble, init, policy |
| `test/fixtures/agent-*/` | Agentes de ejemplo: `minimal`, `full` (las 20 ranuras), `invalid-names`, `missing-config`, `secret-literal`, `channel-without-admission`, `global-override` |

### Files to modify

- **`src/tool/bash.ts`, `readfile.ts`, `writefile.ts`:** quitar el autorregistro en `Default`; las clases siguen exportadas.
- **`src/main.ts`:**
  - arranque: `discover` → confianza → `load` → `validate` → `assemble` → `new Agent(...)`;
  - subcomandos `init` e `info`, y flags `--json` y `--untrusted`;
  - el prompt fijo se mueve a la plantilla de `arnes init`;
  - `AGENTS.md` sigue como contexto del proyecto.
- **`src/commands.ts`:**
  - `registerCommand` exportado;
  - los comandos `/info`, `/skills` y `/policy`;
  - los comandos de `commands/*.md`.
- **`arnes0.1/README.md`:** sección "Authoring an agent" con el árbol, la tabla de ranuras y las fases.
- **Raíz `arnes-ai`:** un `agent/` de ejemplo en `arnes0.1/examples/` (no en la raíz del repo de estudio), usado por el smoke test.

### Decisions

- **Obligatorio en lugar de retrocompatible:** una sola forma de configurar, explícita e inspeccionable. Los límites se declaran siempre (INV-09 del libro). Los tests actuales que construyen `Agent` directamente siguen valiendo; solo cambia el arranque de `main.ts`.
- **La tabla de ranuras (`slots.ts`) es la fuente única:** discover, info, init y la documentación se derivan de ella. Esto evita el drift entre documentación y código, que en eve sí ocurre (p.ej. `repos/vercel/eve/packages/eve/src/discover/named-source-directory.ts:101` dice "flat" para tools, pero `discover-agent.ts:222` las descubre con `recursive: true`).
- **Estructura completa desde el día 1, runtime por fases:** los autores pueden escribir `connections/mcp/github.ts` hoy; arnes la valida y avisa que su runtime llega en la fase 2. Nada queda ignorado en silencio.
- **`hooks/` interviene y `observers/` observa:** es la separación P-12 del libro, más clara que los `hooks/` de eve, que solo observan.
- **Políticas como archivo, no como puerta hardcodeada:** la confirmación actual de `main.ts` pasa a ser el resultado `require_approval` del policy engine.

## TDD Flow

1. **`fs-grammar.test.ts`:** nombres válidos e inválidos, prefijos por subcarpeta y duplicados sin distinguir mayúsculas.
2. **`fs-frontmatter.test.ts`:** acepta el subconjunto; rechaza `---js`, sintaxis desconocida y frontmatter sin cerrar.
3. **`fs-discover.test.ts`:**
   - Sin `agent/`: `discover/required-agent-dir-missing`. Sin `agent.ts` o sin `instructions.md`: su código.
   - `fixtures/agent-full`: las 20 ranuras reconocidas, con las de fases 2–5 como `slot-not-yet-supported`.
   - Reemplazo y desactivación de defaults.
   - Ámbito global: gana el proyecto y el `origin` es correcto.
   - Evals dentro de `agent/`: error.
   - Salida ordenada.
4. **`fs-validate.test.ts`:**
   - un secreto referenciado y no declarado da error; un literal `sk-…` da error;
   - un canal `http.ts` sin regla de admisión queda en "no escucha", con diagnóstico;
   - una fuente de datos sin `classification` queda `restricted`;
   - tools con side effects sin `policies/tools.ts` dan error.
5. **`fs-load.test.ts`:**
   - sin confianza, no se importa ningún `.ts` (se verifica con un fixture que lanza al importarse);
   - con `--untrusted`, solo markdown;
   - un export inválido da un diagnóstico, no un crash.
6. **`policy-engine.test.ts`:** default deny, allow, y `require_approval` llamando a `confirm`.
7. **`fs-assemble.test.ts` y `fs-init.test.ts`:**
   - `agent-minimal` arma un `Agent` con los límites de `agent.ts`;
   - `init` produce un árbol que pasa `discover` sin errores.
8. **`agent.test.ts`, `tool.test.ts` y `provider*.test.ts`:** sin cambios, siguen en verde. **`smoke.test.ts`:** arranca con `examples/agent-minimal`.

## Verification

- `npm test` en la raíz (incluye `arnes0.1/test`) y `npm run typecheck` en `arnes0.1/` pasan.
- **Manual:**
  1. En un directorio vacío, `npm start` falla con un diagnóstico claro. `node src/main.ts init` y `npm start` → REPL.
  2. `node src/main.ts info --json` sobre `examples/agent-full` → JSON con las 20 ranuras, los orígenes y los warnings de fase.
  3. En un proyecto no confiado, aparece la pregunta de confianza; `--untrusted` carga solo markdown.
  4. `agent/tools/bash.ts` con `disabled()` → `/tools` no muestra `bash`.
  5. `policies/tools.ts` con `bash: deny` → el modelo recibe el error de política como dato.
- **Windows:** mayúsculas y separadores `\` dan el mismo manifiesto.

## Notas

- **Fases siguientes** (un plan propio cada una, derivado de la tabla de fases de la propuesta):
  - **2:** MCP stdio/http, OpenAPI y `data/`.
  - **3:** canales HTTP/WS/webhooks, admisión, schedules y triggers.
  - **4:** subagentes, A2A cliente y servidor, y MCP servidor.
  - **5:** memoria, sandbox, hooks, observers, instrumentation y evals.
- **Relación con el libro:** cada ranura se mapea a un componente o contrato (tabla §3.1 de la propuesta). La fase 1 materializa `AgentConfig` (C-002) y `ExecutionBudget` (C-012) en `agent.ts`, y `PolicyEngine` en `policies/`.
- **Riesgo:** implementar MCP y A2A sin dependencias (fases 2 y 4). Se acota a subconjuntos, con tests contra servidores de ejemplo.
