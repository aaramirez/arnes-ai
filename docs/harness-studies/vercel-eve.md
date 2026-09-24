---
title: eve (Vercel)
type: estudio
repo: vercel/eve
categoría: harness completo
lenguaje: TypeScript
estado: publicado
fecha: 2026-09-23
---

# eve (Vercel)

[[Criterio-de-Evaluacion]] · [[Matriz-Comparativa]]

Repo: `vercel/eve` · Categoría: harness completo (framework de agentes durables, backend-first) · Lenguaje: TypeScript

| Dimensión | Estado |
| --- | --- |
| 0. Ficha | ✔ |
| 1. Estructura del repo | ✔ |
| 2. Capas y componentes | ✔ |
| 3. Flujo end-to-end | ✔ |
| 4. Contratos internos | ✔ |
| 5. Agent loop | ✔ |
| 6. Mensajes y contexto | ✔ |
| 7. Provider seam | ✔ |
| 8. Tool runtime | ✔ |
| 9. Permisos y seguridad | ✔ |
| 10. Compaction / gestión de contexto | ✔ |
| 11. Subagentes / orquestación | ✔ |
| 12. UI / presentación | ◐ |
| 13. Configuración y extensibilidad | ✔ |
| 14. Decisiones de diseño destacadas | ✔ |
| 15. Valoración y lecciones | ✔ |

> Diagramas: [[Eve-Arquitectura-y-Flujos]] · [[Eve-10-Flujos-Empresariales]] · [[Eve-Implementacion-Self-Hosted]] · [[Eve-Diagramas-Archify]]

> Foco secundario de este estudio: **viabilidad para casos de uso empresariales** (despliegue, interacción, auth, multi-tenancy). Se resume en la sección 15.

## 0. Ficha

**Hallazgo:** eve es un framework "filesystem-first" para **agentes de IA durables** en backend, hecho por Vercel. Un agente se define como un directorio `agent/`: `instructions.md` (obligatorio), `agent.ts`, `tools/`, `skills/`, `channels/`, `schedules/`, `subagents/`. En runtime corre como servidor Nitro (Node) y cada conversación es un workflow durable. La licencia es Apache-2.0 y la versión estudiada del paquete `eve` es 0.66.0. Está en **beta pública**, bajo los términos beta de Vercel. Está pensado para equipos que quieren operar agentes de larga duración detrás de canales como HTTP, Slack, Teams o MCP, no un coding agent de terminal.

**Evidencia:**
- `repos/vercel/eve/README.md:17` — tagline "filesystem-first framework for durable AI agents".
- `repos/vercel/eve/README.md:22-37` — layout de `agent/`.
- `repos/vercel/eve/packages/eve/package.json:5` — descripción "durable backend AI agents that run anywhere".
- `repos/vercel/eve/LICENSE:2` — Apache License 2.0.

## 1. Estructura del repo

**Hallazgo:** Es un monorepo pnpm + turbo con estas partes:
- `packages/`: `eve` (el core y el CLI), `eve-code` (extensión de código), `eve-catalog` (identidad de integraciones), `eve-self-modification` (compatibilidad) y `eve-buzz-acp-adapter`.
- `apps/`: docs, benchmarks/evals, fixtures, templates e integraciones con frameworks (Next, Nuxt, SvelteKit).
- También `docs/` (la documentación que se publica con el paquete), `e2e/`, `research/` (planes de diseño) y `skills/eve/SKILL.md`.

El core vive en `packages/eve/src`: unos 2.600 archivos `.ts`, repartidos en módulos por responsabilidad (`harness`, `execution`, `compiler`, `channel`, `sandbox`, `subagents`, `approval`, `client`, `react|vue|svelte`, `cli`…). `src/index.ts` solo re-exporta `#public`.

**Evidencia:**
- `repos/vercel/eve/AGENTS.md:17` — layout oficial del monorepo.
- `repos/vercel/eve/packages/eve/src/index.ts:1` — `export * from "#public/index.js"`.
- `repos/vercel/eve/packages/eve-catalog/package.json:5` — "Single source of truth for eve integration identity".

## 2. Capas y componentes

**Hallazgo:** Hay cinco capas con límites claros:
1. **Compiler**: convierte `agent/` en artefactos dentro de `.eve/`.
2. **Host Nitro**: rutas HTTP y entrypoints de workflow.
3. **Channels**: adaptadores de entrada que normalizan el input, ejecutan la auth y mapean la dirección a una sesión.
4. **Execution/harness**: sesión durable (Workflow SDK), turnos, pasos y loop de herramientas.
5. **Sandbox**: filesystem y procesos aislados por sesión.

El loop y el sandbox tienen ciclos de vida desacoplados. El workflow puede quedar en pausa ("park") sin retener cómputo del sandbox, y los secretos viven solo en el lado app. Nitro no aporta ni el almacenamiento de workflows ni el sandbox: son adaptadores aparte ("world" y "sandbox provider").

**Evidencia:**
- `repos/vercel/eve/packages/eve/src/compiler/compile-agent.ts:79` — `compileAgent` escribe en `.eve`.
- `repos/vercel/eve/packages/eve/src/internal/nitro/host.ts:1` — `buildApplication` / `startProductionServer`.
- `repos/vercel/eve/docs/concepts/execution-model-and-durability.mdx:59` — Nitro no provee el state store ni el sandbox.
- `repos/vercel/eve/docs/concepts/execution-model-and-durability.mdx:84-90` — split loop/sandbox.

## 3. Flujo end-to-end

**Hallazgo:**
1. Llega `POST /eve/v1/session`.
2. El `eveChannel` ejecuta `routeAuth` y llama a `createSession` en modo `conversation`.
3. Arranca el workflow durable `workflowEntry` (`"use workflow"`).
4. `runTurnSteps` itera `turnStep` (`"use step"`, que es el checkpoint).
5. En cada paso, el harness hace **una** llamada al modelo con AI SDK (`ToolLoopAgent` con `stopWhen: isStepCount(1)`) y ejecuta las tool calls.
6. Si el último mensaje es de tipo `tool`, se pasa al siguiente paso; si no, el turno termina.

Los eventos (`turn.started`, `message.appended`, `action.result`, `message.completed`, `turn.completed`…) se emiten en un stream NDJSON que se lee en `GET /eve/v1/session/:id/stream`.

**Evidencia:**
- `repos/vercel/eve/packages/eve/src/eve-channel/index.ts:150-152` — auth y luego creación de sesión.
- `repos/vercel/eve/packages/eve/src/execution/session/entry.ts:48-49` — `workflowEntry` "use workflow".
- `repos/vercel/eve/packages/eve/src/execution/session/turn-step.ts:125-126` — `turnStep` "use step".
- `repos/vercel/eve/packages/eve/src/harness/tool-loop.ts:1617` — `new ToolLoopAgent(...)` por paso.
- `repos/vercel/eve/packages/eve/src/eve-channel/request.ts:344-345` — respuesta `application/x-ndjson`.
- `repos/vercel/eve/packages/eve/src/protocol/message.ts:181` — catálogo de eventos del stream (`session.started` … `session.completed`).

## 4. Contratos internos

**Hallazgo:** La API pública se organiza con funciones `define*` y cada tipo de pieza tiene su propio subpath:
- `defineAgent`, `defineRemoteAgent` y `defineWorkspaceAgent` desde `eve`.
- `defineTool` y `defineWorkflowTool` desde `eve/tools`.
- También hay `defineChannel`, `defineSchedule`, `defineState`, `defineHook`, `defineSkill`, `defineExtension`, `defineSandbox`, `defineMcpClientConnection`, `defineOpenAPIConnection` y `defineMemory`.

No existe `defineSubagent`: un subagente es otro `defineAgent` en `subagents/<id>/`.

- **Formato de mensajes:** internamente es `ModelMessage` del AI SDK, con un `kind` para distinguir los mensajes del framework.
- **Protocolo de cable:** el conjunto de eventos tipados de `protocol/message.ts`. La UI, la TUI y los hooks solo conocen ese protocolo; no ven el harness.

**Evidencia:**
- `repos/vercel/eve/packages/eve/src/public/index.ts:20-33` — `defineAgent`, `defineWorkspaceAgent`, `defineRemoteAgent`.
- `repos/vercel/eve/packages/eve/src/tools/definition.ts:254` — `defineTool`.
- `repos/vercel/eve/packages/eve/package.json:58` — mapa de `exports` (`./tools`, `./channels`, `./sandbox`, `./client`, `./react`…).
- `repos/vercel/eve/packages/eve/src/harness/messages.ts:15-34` — mensajes con `kind`.

## 5. Agent loop

**Hallazgo:** eve controla el loop y no delega en el loop multi-step del SDK: cada paso hace exactamente una llamada al modelo. Hay dos niveles:
- **Turno:** `while(true)` sobre `turnStep`. Termina en `done`, park o cancel, y mete el steering pendiente como siguiente input.
- **Paso:** sigue si hubo tool calls. `final_output` siempre cierra el turno.

**No hay `maxSteps` ni `maxTurns`**. Los límites son:
- tokens y costo por sesión, revisados antes de cada llamada (por defecto 40M tokens de input en la raíz);
- `sessionTimeoutMs` (por defecto 30 días) como timer durable.

**Reintentos:** 3 intentos con backoff exponencial y jitter para errores transitorios, según `classifyModelCallError`. En modo conversación, un fallo final deja la sesión en pausa con `MODEL_CALL_FAILED`. Streaming vía `fullStream`.

**Steering:** un mensaje nuevo puede interrumpir la generación antes de que empiece el output o los efectos de las tools, y se aplica en el mismo turno. `turnPolicy: "queue"` hace que espere a que termine el turno en curso.

**Evidencia:**
- `repos/vercel/eve/packages/eve/src/execution/session/turn.ts:82-85` — loop de turno.
- `repos/vercel/eve/packages/eve/src/harness/tool-loop.ts:2883-2894` — continuar/terminar.
- `repos/vercel/eve/packages/eve/src/execution/session.ts:15` — `DEFAULT_ROOT_MAX_INPUT_TOKENS_PER_SESSION`.
- `repos/vercel/eve/packages/eve/src/execution/session/timeout.ts:2` — timeout de 30 días.
- `repos/vercel/eve/packages/eve/src/harness/tool-loop.ts:292` — política de reintentos.
- `repos/vercel/eve/packages/eve/src/harness/generation-steering.ts:77-85` — steering.

## 6. Mensajes y contexto

**Hallazgo:** El system prompt se compone con:
- los bloques de `instructions.md`;
- secciones de workspace, acciones paralelas, mensajería entre agentes y connections;
- el listado de skills.

En cada llamada se agregan las instrucciones dinámicas, primero las de sesión y luego las de turno, con breakpoints de cache. Los anuncios de skills y el estado se inyectan como mensajes `user` con `kind` `context.state`, que no rompen el cache.

- **Persistencia:** el `DurableSession` (historial, estado, límites, system) viaja dentro del resultado de cada paso del workflow. No hay una base de datos de sesiones aparte.
- **Estado:** `defineState` crea un estado durable por sesión.
- **Memoria:** hay memoria entre sesiones por "slots", con proveedores intercambiables (file, Supermemory, Upstash, custom) que se consultan en `turn.started`.

**Evidencia:**
- `repos/vercel/eve/packages/eve/src/runtime/prompt/compose.ts:34` — composición del prompt.
- `repos/vercel/eve/packages/eve/src/harness/tool-loop.ts:1316-1334` — merge del system prompt por llamada, con cache.
- `repos/vercel/eve/packages/eve/src/execution/durable-session-store.ts:47-57` — `DurableSession` en el resultado del step.
- `repos/vercel/eve/packages/eve/src/public/definitions/state.ts:43` — `defineState`.
- `repos/vercel/eve/packages/eve/src/context/memory-lifecycle.ts:49` — recall de memoria por slot.

## 7. Provider seam

**Hallazgo:** El seam de proveedor es el **Vercel AI SDK** (`ai`). Un ID de texto (`"anthropic/claude-opus-5.5"`) se resuelve contra el **AI Gateway** de Vercel. Un objeto `LanguageModel` de cualquier provider del AI SDK se usa directo, sin gateway. También hay selección dinámica de modelo.

- **Uso y costo:** se contabilizan tokens de input, output, cache-read y cache-write, más el costo que reporta el gateway, por turno y por sesión.
- **Prompt caching:** es `auto` vía gateway. Con Anthropic directo y Bedrock-Anthropic se usan breakpoints `cacheControl: ephemeral`. Con otros providers no hay cache.

**Evidencia:**
- `repos/vercel/eve/packages/eve/src/runtime/agent/resolve-model.ts:54-74` — orden de resolución del modelo.
- `repos/vercel/eve/packages/eve/src/internal/gateway.ts:32-33` — un string se trata como modelo del gateway.
- `repos/vercel/eve/packages/eve/src/harness/tool-loop.ts:2046-2075` — extracción de uso y costo.
- `repos/vercel/eve/packages/eve/src/harness/prompt-cache.ts:54-74` — detección de la ruta de cache.

## 8. Tool runtime

**Hallazgo:** `defineTool({ description, inputSchema, execute(input, ctx) })` acepta zod o cualquier StandardSchema/JSON Schema. Opcionalmente lleva `outputSchema`, `approval` y `toModelOutput`. El `ctx` trae `abortSignal`, `getToken` y `requireAuth`.

- **Tools durables:** `defineWorkflowTool` hace tools con waits durables (timers, webhooks, `ctx.ask()`) y un modo **background** que devuelve un `TaskReceipt`.
- **Descubrimiento:** por convención de archivos en `agent/tools/` (nombre del archivo = nombre de la tool).
- **Tools incluidas:** `bash`, `read_file`, `write_file`, `web_fetch`, `web_search`, `load_skill`, `connection_search`, `task_cancel`, y `agent` solo en la raíz. `glob` y `grep` son opt-in.
- **Errores como datos:** un `throw` en `execute` se devuelve al modelo como `tool-result` con `error-text`.

**Evidencia:**
- `repos/vercel/eve/packages/eve/src/tools/definition.ts:166-212` — `ToolContext` y la firma de `execute`.
- `repos/vercel/eve/packages/eve/src/tools/workflow-definition.ts:107-125` — `defineWorkflowTool` / background.
- `repos/vercel/eve/packages/eve/src/discover/discover-agent.ts:215-224` — descubrimiento de `tools/`.
- `repos/vercel/eve/packages/eve/src/framework/sources/registry.ts:24-55` — registro de tools incluidas.
- `repos/vercel/eve/packages/eve/src/harness/action-result-helpers.ts:108-116` — error como `tool-result`.

## 9. Permisos y seguridad

**Hallazgo:** eve separa la seguridad en tres capas.

**(a) Route auth de entrada.** Es una cadena ordenada de `AuthFn`: `localDev`, `vercelOidc`, `httpBasic`, `jwtHmac`, `jwtEcdsa`, `oidc` o una propia. **Falla cerrada**: si ninguna acepta, devuelve 401; `none()` hay que declararlo explícitamente, y `placeholderAuth()` bloquea producción hasta que lo reemplaces. La identidad verificada llega a las tools como `ctx.session.auth.current/initiator`.

**(b) Aprobaciones HITL por tool.** Hay políticas `always`, `never` y `once`, y `auto()`, que consulta a un modelo evaluador y, si duda, pregunta al humano. **Autoriza el harness o un humano autenticado, nunca el modelo.** Si falta la política de respuesta, la aprobación falla cerrada.

**(c) Sandbox aislado.** Soporta Vercel microVM, Docker, microsandbox o just-bash. El sandbox no tiene `process.env`. La red se controla con `allow-all`, `deny-all` o una allow-list con inyección de headers ("credential brokering").

**Límite:** la route auth **no controla quién es dueño de cada sesión**. El aislamiento entre usuarios o tenants lo implementa quien despliega el agente.

**Evidencia:**
- `repos/vercel/eve/packages/eve/src/public/channels/auth.ts:702-735` — `routeAuth` (el walk).
- `repos/vercel/eve/packages/eve/src/public/channels/auth.ts:779-790` — `placeholderAuth`.
- `repos/vercel/eve/packages/eve/src/approval/definition.ts:25-35` — `ApprovalStatus`.
- `repos/vercel/eve/packages/eve/src/tools/approval/policies.ts:86-131` — `auto()`.
- `repos/vercel/eve/packages/eve/src/shared/sandbox-network-policy.ts:6-27` — network policy.
- `repos/vercel/eve/docs/concepts/security-model.md:8-20` — fronteras de confianza.
- `repos/vercel/eve/docs/guides/auth-and-route-protection.md:267` — "Route auth does not enforce session ownership".

## 10. Compaction / gestión de contexto

**Hallazgo:**
- **Umbral:** 90 % de `contextWindowTokens`, o 100k tokens si la ventana es desconocida.
- **Ventana reciente:** los últimos 10 mensajes se conservan literales.

`maybeCompact` corre antes de cada llamada al modelo y es el único camino que reescribe el historial. Hace dos cosas:
1. Primero recorta, sin usar el modelo, los tool results demasiado grandes de la región antigua.
2. Si no basta, resume esa región con `generateText` (el modelo es configurable). El resultado es un marcador de checkpoint, un resumen `assistant` y la cola reciente literal. Si aún hay presión, la cola se degrada a solo texto y la ventana se reduce.

**Rutas de control:**
- `POST /session/:id/compact` fuerza la compactación sin hacer un turno de modelo.
- `/clear` vacía el historial pero conserva la sesión y el estado.
- `/reset` retira la sesión.

**Evidencia:**
- `repos/vercel/eve/packages/eve/src/execution/session.ts:12-14` — constantes de umbral y ventana.
- `repos/vercel/eve/packages/eve/src/harness/compaction.ts:198-293` — algoritmo.
- `repos/vercel/eve/packages/eve/src/harness/tool-loop.ts:615-630` — `compactOnly`.
- `repos/vercel/eve/packages/eve/src/harness/tool-loop.ts:598-612` — `clearOnly`.

## 11. Subagentes / orquestación

**Hallazgo:** Hay tres formas de delegar:
- **Subagentes declarados** (`agent/subagents/<id>/agent.ts`): tienen sesión durable, contexto, sandbox, skills y estado propios. Solo reciben el `message`, nunca el historial del padre.
- **Tool `agent`** (copia del propio agente): reutiliza sandbox y tools del padre.
- **Agentes remotos** (`defineRemoteAgent`): llaman a otro deploy de eve por HTTP, con callbacks durables. Pueden reenviar la identidad del usuario (`forwardPrincipal`) solo si el receptor confía en quien la reenvía (`trustedForwarders`).

**Límites:**
- No hay constante de profundidad; la recursión se limita estructuralmente (`agent` solo existe en la raíz).
- El presupuesto de tokens y costo restante del padre se reparte entre los hijos del mismo batch.

**Entrega de resultados:** `taskDeliveryPolicy` controla cómo llegan los resultados de background. Con `auto` llegan temprano; con `cohort` se entregan todos juntos cuando el grupo termina.

**Evidencia:**
- `repos/vercel/eve/docs/subagents/index.mdx:60` — el hijo recibe solo el `message`.
- `repos/vercel/eve/packages/eve/src/discover/discover-agent.ts:257` — el subagente se descubre como su propia raíz.
- `repos/vercel/eve/packages/eve/src/execution/tools/subagent/invoke-preparation.ts:166-173` — recursión rechazada fuera de la raíz.
- `repos/vercel/eve/packages/eve/src/subagents/token-budget.ts:18-38` — reparto del presupuesto.
- `repos/vercel/eve/packages/eve/src/public/definitions/remote-agent.ts:88-94` — `defineRemoteAgent`.
- `repos/vercel/eve/packages/eve/src/tasks/delivery-policy.ts:35-58` — `auto` / `cohort`.

## 12. UI / presentación

**Hallazgo:** eve es backend-first y **no incluye una UI para usuarios finales**, así que esta dimensión queda en ◐.

Lo que sí ofrece:
- **TUI de desarrollo** (`eve dev`): renderer ANSI propio, sin Ink. Consume los eventos del stream y puede conectarse a un deploy remoto (`eve dev https://host`).
- **Hooks para chat en navegador:** `useEveAgent` en React (`useSyncExternalStore`), Vue y Svelte, que comparten un reducer que convierte eventos NDJSON en mensajes.

En la práctica, la presentación queda en manos de la app anfitriona o del canal (Slack Block Kit, Teams Adaptive Cards, etc.).

**Evidencia:**
- `repos/vercel/eve/packages/eve/src/cli/dev/tui/terminal-renderer.ts:1` — renderer propio.
- `repos/vercel/eve/packages/eve/src/cli/dev/tui/runner.ts:2244` — `case "message.completed"`.
- `repos/vercel/eve/packages/eve/src/react/use-eve-agent.ts:136` — `useEveAgent`.
- `repos/vercel/eve/packages/eve/src/client/message-reducer.ts:63` — `defaultMessageReducer`.

## 13. Configuración y extensibilidad

**Hallazgo:** La configuración es por convención de archivos más `agent.ts` (`defineAgent`: `model`, `compaction`, `defaultTools`, `limits`, `reasoning`, `outputSchema`, `experimental.workflow`…).

**CLI:** `eve init`, `dev`, `build`, `start`, `link`, `deploy`, `add`, `registry`, `logs`, `traces`, `eval`, `acp`.

**Puntos de extensión:**
- **Registry e integraciones:** `eve add channel/slack` instala integraciones desde un registro oficial, con su catálogo en `eve-catalog`.
- **Extensions:** empaquetan tools, channels, skills, schedules, subagentes y hooks, y se montan desde npm.
- **Hooks:** `defineHook` se suscribe a eventos del stream.
- **Connections:** MCP y OpenAPI; OpenAPI genera una tool por operación y el descubrimiento pasa por `connection_search`.
- **Skills:** markdown cargado bajo demanda con `load_skill`.
- **Custom channels:** `defineChannel`, con rutas HTTP y WebSocket.
- **Proveedores intercambiables:** sandbox (`defineSandboxProvider`) y "workflow world" (p.ej. Postgres) para self-hosting.

**Evidencia:**
- `repos/vercel/eve/packages/eve/src/shared/agent-definition.ts:336-390` — opciones de `defineAgent`.
- `repos/vercel/eve/packages/eve/src/cli/commands/register-registry-commands.ts:37-38` — `eve add`.
- `repos/vercel/eve/packages/eve-catalog/src/index.ts:22` — catálogo `INTEGRATIONS`.
- `repos/vercel/eve/docs/extensions.md:6` — extensions.
- `repos/vercel/eve/docs/guides/hooks.md:11-18` — hooks.
- `repos/vercel/eve/docs/guides/deployment/self-hosting.md:31-45` — workflow world custom.

## 14. Decisiones de diseño destacadas

**Hallazgo:**
1. **La durabilidad como base.** Cada sesión es un workflow del Workflow SDK y cada paso es un checkpoint. Sobrevive a caídas y redeploys, y las esperas (aprobaciones, OAuth) quedan en pausa sin consumir cómputo. El costo es que un paso interrumpido se re-ejecuta, así que los efectos no idempotentes deben ser idempotentes o pasar por aprobación.
2. **Una llamada al modelo por paso**, en lugar del loop multi-step del SDK. Da granularidad fina de replay y permite steering entre pasos. `modelCallsPerStep` sacrifica esa granularidad a cambio de menos overhead.
3. **Split app-runtime / sandbox.** Los secretos y el código confiable quedan fuera del cómputo que controla el modelo; incluso `read_file` y `write_file` corren en el lado app y hacen proxy al sandbox.
4. **Channels como único borde.** El runtime no sabe de dónde viene el mensaje. HTTP, Slack, Teams, MCP y los custom comparten la misma normalización, la misma auth y el mismo mapeo dirección→sesión.
5. **Handoff entre deploys.** Una sesión inactiva migra al deploy nuevo y usa su modelo, tools e instrucciones actuales. Una sesión con trabajo vivo se queda en su deploy.
6. **Todo falla cerrado por defecto:** auth, aprobaciones y frontmatter de markdown sin evaluación de JS.

**Evidencia:**
- `repos/vercel/eve/docs/concepts/execution-model-and-durability.mdx:94-116` — resume after crash y parked work.
- `repos/vercel/eve/packages/eve/src/execution/model-call-batching.ts:19` — `modelCallsPerStep`.
- `repos/vercel/eve/docs/concepts/execution-model-and-durability.mdx:26-30` — handoff entre deploys.
- `repos/vercel/eve/docs/concepts/security-model.md:76-82` — markdown como dato y auth que falla cerrada.

## 15. Valoración y lecciones

**Hallazgo — qué hace bien:** Es el harness más orientado a **operación en producción** de los estudiados hasta ahora. Resuelve de forma nativa:
- durabilidad;
- human-in-the-loop durable;
- multicanal;
- auth de entrada que falla cerrada;
- identidad propagada hasta las tools (OAuth por usuario, credenciales por tenant);
- sandbox con aislamiento de secretos;
- observabilidad OTel y evals.

**Viabilidad empresarial:** alta, con reservas.

*Despliegue:*
- **(a) Vercel:** `eve link` + `eve deploy`, con Workflow, Sandbox y Cron gestionados.
- **(b) Self-hosting:** `eve build` + `eve start` como servicio Node o contenedor. Requiere un proxy que reenvíe **dos** prefijos, `/eve/` y `/.well-known/workflow/`, más estado persistente: `.eve/.workflow-data` en un volumen, o un world compartido como Postgres para tener varias réplicas.
- El modelo puede ser cualquier provider del AI SDK sin pasar por el gateway de Vercel.

*Interacción:*
- API HTTP de sesiones (`/eve/v1/session`, follow-ups, stream NDJSON, cancel/compact/clear/reset, `operationId` idempotente, `outputSchema`).
- SDK `eve/client` y hooks `useEveAgent`.
- Canales Slack, Teams, Discord, Telegram, Twilio, GitHub y Linear.
- **Canal MCP** (`agent_start`/`get`/`update`/`cancel`, asíncrono y durable), ACP para editores, agentes remotos y schedules cron.

*Reservas:*
1. Está en beta y las APIs cambian rápido.
2. No controla la propiedad de las sesiones: la autorización por sesión o tenant es responsabilidad de la app.
3. El world por defecto guarda en disco local, lo que no sirve para alta disponibilidad, y el protocolo del world es `5.0.0-beta`.
4. Varias comodidades son exclusivas o mejores en Vercel: Vercel Connect para OAuth de conectores, credential brokering, Agent Runs y el transporte peer por defecto.

**Qué haría distinto:** Añadiría un ACL opcional de propiedad de sesión integrado en el framework, un world de alta disponibilidad de primera clase para self-hosting, y límites explícitos de pasos por turno (hoy solo hay caps de tokens y costo, y un timeout).

**Lecciones para [[Arquitectura_Agent_Harness_inspirado_en_Pi]] y `arnes0.1/`:**
- Separar **turno / paso / checkpoint** y hacer del paso la unidad de replay.
- Tratar los canales como un borde intercambiable, con un protocolo de eventos tipado como único contrato hacia la UI.
- Que la autorización de tools la dé el harness o un humano, nunca el modelo.
- Mantener los secretos fuera del cómputo que controla el modelo.
- Compactar en dos fases: primero recortar tool results sin modelo, después resumir con el modelo.

**Evidencia:**
- `repos/vercel/eve/docs/guides/deployment/overview.md:12-15` — estrategias de despliegue.
- `repos/vercel/eve/docs/guides/deployment/self-hosting.md:27-29` — persistir `.eve/.workflow-data`.
- `repos/vercel/eve/docs/guides/deployment/self-hosting.md:57-62` — prefijos del proxy.
- `repos/vercel/eve/docs/channels/eve.mdx:21-33` — rutas HTTP de sesión.
- `repos/vercel/eve/docs/channels/mcp.mdx:165-212` — canal MCP.
- `repos/vercel/eve/docs/patterns/multi-tenant-auth.md:14-37` — tenant desde la auth verificada.
- `repos/vercel/eve/README.md:129-132` — beta terms.

---

[[Matriz-Comparativa]]
