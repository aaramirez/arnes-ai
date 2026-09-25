---
title: eve vs book-harness vs pi — capacidades y lecciones
type: comparativa
repos:
  - vercel/eve
  - aaramirez/book-harness
  - earendil-works/pi
tags:
  - comparativa
  - eve
  - book-harness
  - pi
  - lecciones
---

# eve vs book-harness vs pi — capacidades y lecciones

[[vercel-eve]] · [[BH-Implementacion]] · [[Arquitectura_Agent_Harness_inspirado_en_Pi]] · [[Matriz-Comparativa]]

**Pregunta:** ¿qué tiene eve que no tienen book-harness ni pi, y qué lecciones de eve les faltan a ambos?

**Respuesta corta:** eve se distingue porque es un harness **pensado para operar en producción como servicio**. Tiene cinco rasgos que los otros dos no tienen, o solo tienen en papel o en modo experimental:
1. **La durabilidad es la propiedad por defecto:** cada paso es un checkpoint y el replay no repite pasos completados.
2. **Las esperas humanas y de OAuth son durables**, no consumen cómputo, y se responden desde cualquier canal.
3. **Tiene un borde multicanal**, con auth de entrada que falla cerrada y una identidad que viaja hasta las tools.
4. **Hay una frontera física entre el runtime con secretos y el sandbox** que controla el modelo.
5. **Resuelve la operación del ciclo de vida:** handoff de sesiones entre deploys, el agente como servicio (MCP o remoto) y trazas que respetan la privacidad.

A su vez, book-harness tiene **gobierno enterprise** (auditoría, idempotencia, gobierno de datos, admisión, kill switch, handoff) que eve **no** tiene. pi tiene **extensibilidad, amplitud de proveedores y sesiones en árbol** que eve tampoco tiene.

> **Qué clase de pera es cada una.** No son equivalentes:
> - **eve** (`8a5e8b9`, v0.66.1, beta) es un framework de agentes durables para desplegar como servicio.
> - **book-harness** (`d16e2c7`) es un libro con pseudocódigo: especifica, no ejecuta.
> - **pi** (`b455975`) es un coding agent local (CLI/TUI/SDK). Hoy tiene **dos runtimes**: el `AgentSession` del CLI que se distribuye, en memoria y con persistencia JSONL, y un **AgentHarness durable experimental** (`PI_EXPERIMENTAL=1`, `pi server`, `experimental/mini`).
>
> Por eso en pi se distingue **pi CLI** de **pi exp**.

Convención:
- **✔**: presente y resuelto;
- **◐**: parcial, opt-in o solo especificado;
- **✖**: ausente;
- **exp**: solo en el runtime experimental de pi.

La evidencia usa rutas `repos/<org>/<repo>/...:línea`. Abreviaturas: `chNN` = `repos/aaramirez/book-harness/book/chapters/NN-*/chapter.md`, `PI` = `repos/earendil-works/pi/packages`.

---

## 1. Cuadro de capacidades

| Capacidad | eve | book-harness | pi CLI | pi exp |
| --- | --- | --- | --- | --- |
| Durabilidad: checkpoint por paso y reanudar a mitad de turno | ✔ por defecto | ◐ exigida (P-23, INV-13), sin mecanismo de replay | ✖ loop en memoria; persiste en `message_end` | ✔ máquina de estados por operación y recuperación |
| Espera humana durable (HITL que sobrevive reinicios) | ✔ `input.requested` + turno aparcado | ◐ la pausa retorna y se persiste; la reanudación no tiene transporte | ✖ gates por extensión, en memoria | ✖ hay hook `before_tool`, sin estado "esperando humano" |
| OAuth por usuario con turno aparcado | ✔ `authorization.required` | ✖ | ✖ | ✖ |
| Borde multicanal (HTTP, Slack, Teams, MCP…) | ✔ 10+ canales | ◐ Ingress Adapter fuera del registro (Preview) | ◐ TUI, print, JSON, RPC y SDK, solo locales | ◐ socket Unix + relay WebSocket |
| Auth de entrada que falla cerrada | ✔ walk ordenado, `placeholderAuth()` | ◐ AdmissionController (reglas, sin modelo de principal) | ✖ no aplica, es local | ✖ "peer authentication… not implemented" |
| Identidad hasta las tools (`current` / `initiator`) | ✔ `ctx.session.auth` | ✖ | ✖ | ✖ |
| Frontera app-runtime / sandbox (secretos fuera) | ✔ el sandbox no tiene `process.env`; brokering | ◐ CredentialBroker con referencia opaca; sin sandbox de ejecución | ◐ opt-in: Docker, sandbox-runtime, micro-VM | ◐ igual |
| Subagentes locales y remotos | ✔ ambos, con callbacks durables | ◐ Gateway con grants (el transporte es Preview) | ◐ extensión de ejemplo, procesos aparte | ◐ conversaciones "owned" |
| Presupuesto de tokens/costo repartido entre hijos | ✔ | ◐ INV-E06 lo exige, sin mecanismo | ✖ | ✖ |
| Schedules / cron | ✔ `defineSchedule` | ✖ | ✖ | ◐ `job` durable con `every` |
| Agente expuesto como servidor MCP | ✔ canal MCP durable | ✖ | ✖ | ✖ |
| Steering (corregir un turno en curso) | ✔ en frontera de commit | ✖ | ✔ colas `steer` / `followUp` | ✔ |
| Compactación | ✔ dos fases (recorte + resumen) | ◐ por candidato, dentro del budget | ✔ resumen estructurado; `/compact`; resumen de ramas | ✔ |
| Sesiones en árbol, fork y clone | ✖ | ◐ `branchSessionFromCheckpoint` | ✔ árbol `id`/`parentId`, `/fork`, `/clone` | ✔ |
| Handoff de sesiones entre deploys | ✔ una sesión inactiva migra; el trabajo vivo se queda | ✖ | ✖ | ✖ |
| Trazas que respetan la privacidad (`audience`) | ✔ `tracePolicy` por audiencia | ✖ | ✖ | ◐ contratos de spans, sin exportador |
| Evals | ◐ `eve eval` | ◐ EvaluationHarness como gate (especificado) | ✔ vitest-evals, lift con y sin docs en Docker | ✔ |
| Salida estructurada | ✔ `outputSchema` | ✖ | ◐ tool terminal `structured_output` | ◐ |
| Idempotencia de side effects | ◐ `operationId` al crear la sesión; las tools son responsables | ✔ IdempotencyGuard PENDING/COMPLETED | ✖ | ✔ `replay: never/safe` + memos por invocación |
| Auditoría inmutable distinta de la telemetría | ✖ | ✔ AuditLedger con `contentHash` | ✖ | ✖ |
| Gobierno de datos (clasificación, retención, legal hold) | ✖ | ✔ DataGovernanceEngine | ✖ | ✖ |
| Kill switch fuera del loop / handoff a humano | ◐ `cancel` / `reset` por sesión | ✔ OperationalController + HandoffCoordinator | ◐ `abort` | ◐ abort sobre el árbol de propiedad |
| Extensibilidad (hooks, providers, comandos, paquetes) | ◐ extensions, hooks y registry | ◐ skills del arnés de producción | ✔ muy amplia: `pi.on`, `registerProvider`, `pi install` | ✔ más hooks durables |
| Amplitud de proveedores | ◐ vía AI SDK / AI Gateway | n/a | ✔ `pi-ai`, 92 archivos de providers | ✔ |

**Evidencia del cuadro** (una o dos citas por celda relevante):
- **eve:**
  - `repos/vercel/eve/docs/concepts/execution-model-and-durability.mdx:6-16`, `:94-116`, `:26-30`, `:155-163`
  - `repos/vercel/eve/docs/guides/auth-and-route-protection.md:22`, `:288-299`
  - `repos/vercel/eve/docs/concepts/security-model.md:8-20`
  - `repos/vercel/eve/docs/channels/overview.mdx:133-150`
  - `repos/vercel/eve/docs/channels/mcp.mdx:165-218`
  - `repos/vercel/eve/docs/guides/remote-agents.md:185-203`
  - `repos/vercel/eve/packages/eve/src/subagents/token-budget.ts:18-38`
  - `repos/vercel/eve/docs/schedules.mdx:10-33`
  - `repos/vercel/eve/docs/channels/eve.mdx:172-209`
  - `repos/vercel/eve/docs/channels/eve.mdx:64-79`
- **book-harness:**
  - `repos/aaramirez/book-harness/constitution/ARCHITECTURE_CONSTITUTION.md:951` (P-23)
  - `repos/aaramirez/book-harness/constitution/ARCHITECTURE_CONSTITUTION.md:196-202` (INV-12/13)
  - `repos/aaramirez/book-harness/constitution/ARCHITECTURE_CONSTITUTION.md:975-989` (INV-E)
  - `ch13:867-916` (la pausa retorna)
  - `ch14:816-821` (Ingress Adapter fuera del registro)
  - `ch15:940-958` (transporte Preview)
  - `ch16`, `ch17`, `ch19`, `ch20`, `ch18`, `ch23` (componentes enterprise)
- **pi:**
  - `PI/agent/src/agent-loop.ts:162`
  - `PI/coding-agent/src/core/agent-session.ts:922`
  - `PI/agent/src/harness/runtime/drive/recovery.ts:22-60`
  - `PI/coding-agent/src/experimental/mini/README.md:38`
  - `PI/coding-agent/docs/security.md:3`
  - `PI/coding-agent/examples/extensions/permission-gate.ts:13-29`
  - `PI/server/README.md:77`
  - `PI/coding-agent/docs/containerization.md:9-16`
  - `PI/coding-agent/examples/extensions/subagent/README.md:1-12`
  - `PI/agent/src/harness/pico3/kinds/job.ts:4-13`
  - `PI/agent/src/agent.ts:247-305`
  - `PI/coding-agent/docs/compaction.md:32-41`
  - `PI/coding-agent/docs/session-format.md:3`
  - `PI/telemetry/README.md:11-13`
  - `PI/evals/README.md:1-21`
  - `PI/agent/src/types.ts:458-459`
  - `PI/agent/src/harness/runtime/drive/tools.ts:45`, `:538`

---

## 2. Qué tiene eve que no tienen ni book-harness ni pi

Estas son capacidades **operativas y ejecutables** en eve y **ausentes** en ambos. En book-harness, a lo sumo están enunciadas como principio. En pi, a lo sumo son experimentales o de ejemplo.

1. **Durabilidad por defecto, sin configurar nada.** Cada sesión es un workflow. Cada paso (una llamada al modelo más sus tools) es un checkpoint. Un crash o un redeploy retoma desde el último paso completado, y los pasos completados no se re-ejecutan. book-harness lo **exige** (P-23, INV-13) pero su pseudocódigo corre en un solo proceso. En pi solo existe en el runtime experimental; el CLI persiste al final de cada mensaje.
   - `repos/vercel/eve/docs/concepts/execution-model-and-durability.mdx:94-110`

2. **Esperas durables sin cómputo, respondidas desde el canal.** Una aprobación o un OAuth aparca el turno sin límite de tiempo y sobrevive reinicios. La respuesta llega como botón de Slack, de Teams o `inputResponses`. En book-harness la pausa retorna (buena idea) pero no hay quién despierte el turno. En pi los prompts viven en la UI en memoria.
   - `repos/vercel/eve/docs/tools/human-in-the-loop.md:170-198`
   - `ch13:867-916`
   - `PI/coding-agent/examples/extensions/permission-gate.ts:13-29`

3. **OAuth por usuario integrado en el turno.** El turno se aparca con `authorization.required`, el callback lo generó el framework y el turno se reanuda. Ninguno de los otros dos modela OAuth de usuario.
   - `repos/vercel/eve/docs/connections/overview.mdx:206`, `:236-270`

4. **Un borde multicanal con direcciones de continuación.** El mismo agente atiende HTTP, Slack, Teams, Discord, Telegram, Twilio, GitHub, Linear y MCP. Cada conversación de plataforma mapea a una sesión durable. book-harness deja el Ingress Adapter fuera del registro. pi solo ofrece modos locales, más un servidor experimental por socket Unix.
   - `repos/vercel/eve/docs/channels/overview.mdx:6-14`, `:133-150`
   - `ch14:816-821`
   - `PI/server/README.md:1-5`

5. **Auth de entrada que falla cerrada, e identidad que llega a las tools.** Hay un walk ordenado de verificadores (OIDC, JWT, Basic, custom), y el scaffold trae `placeholderAuth()`, que bloquea producción. `ctx.session.auth.current` e `initiator` llegan a cada tool y permiten elegir credenciales por usuario o tenant. book-harness decide la admisión pero no modela el principal. pi no autentica a los peers.
   - `repos/vercel/eve/docs/guides/auth-and-route-protection.md:22`, `:37-45`, `:205-222`, `:288-299`
   - `PI/server/README.md:77`

6. **Una frontera física entre el runtime con secretos y el sandbox del modelo.** Incluso `read_file` y `write_file` corren del lado app y hacen proxy al sandbox. El sandbox no tiene `process.env`, y el credential brokering inyecta headers en el egress. book-harness tiene la idea de la referencia opaca (CredentialBroker), pero no un sandbox de ejecución. En pi el aislamiento es opt-in y por defecto corre con los permisos del usuario.
   - `repos/vercel/eve/docs/concepts/security-model.md:8-20`, `:52-54`
   - `PI/coding-agent/docs/security.md:3`

7. **Handoff de sesiones entre versiones desplegadas.** Una sesión inactiva pasa al deploy nuevo y usa su modelo, sus tools y sus instrucciones. El trabajo vivo se queda en su deploy, y hay importación desde el modelo de ejecución anterior. Nadie más resuelve la evolución del runtime con sesiones abiertas.
   - `repos/vercel/eve/docs/concepts/execution-model-and-durability.mdx:26-57`

8. **El agente como servicio para otros agentes.** El canal MCP es durable y tiene propiedad por principal. Los agentes remotos usan callbacks durables, y `forwardPrincipal` funciona con `trustedForwarders`. En book-harness el transporte del Gateway es Preview, y pi no expone MCP.
   - `repos/vercel/eve/docs/channels/mcp.mdx:165-218`
   - `repos/vercel/eve/docs/guides/remote-agents.md:185-203`

9. **Presupuesto repartido entre subagentes.** Los hijos de un mismo batch se reparten el cupo restante de tokens y costo del padre. book-harness lo exige (INV-E06) sin mecanismo, y pi no lo tiene.
   - `repos/vercel/eve/packages/eve/src/subagents/token-budget.ts:18-38`

10. **Trazas que respetan la audiencia.** Una sesión `private` no captura contenido por defecto, y `tracePolicy` fija un techo que ningún exportador puede superar. pi define contratos de spans sin exportador, y book-harness separa la auditoría pero no trata la privacidad de las trazas.
    - `repos/vercel/eve/docs/channels/eve.mdx:172-209`
    - `repos/vercel/eve/docs/guides/instrumentation/otel.mdx:10-40`
    - `PI/telemetry/README.md:11-13`

11. **Schedules y salida estructurada como primitivas.** `defineSchedule` con cron (y cohortes de resultados) y `outputSchema` en la API de sesión. En pi el `job` es experimental y la salida estructurada es un patrón de extensión. book-harness no tiene ninguna de las dos.
    - `repos/vercel/eve/docs/schedules.mdx:10-33`
    - `PI/coding-agent/examples/extensions/structured-output.ts:1-44`

---

## 3. Lo que eve **no** tiene y los otros sí

Para no leer la comparación en una sola dirección:

| De book-harness | De pi |
| --- | --- |
| **AuditLedger**: evidencia inmutable con `contentHash` y versiones exactas, distinta de la telemetría (P-25). En eve, OTel y Agent Runs son telemetría. | **Sesiones en árbol**: `/fork`, `/clone` y resumen de ramas al navegar el árbol. |
| **IdempotencyGuard** con PENDING/COMPLETED por clave (INV-11). eve deja la idempotencia a cada tool. | **Política de replay por tool** (`replay: "never"` o `"safe"`) y memos por invocación. Es la respuesta directa al "un paso interrumpido se re-ejecuta" de eve. |
| **DataGovernanceEngine**: clasificación fail-closed, residencia, retención y legal hold. | **Extensibilidad profunda**: `pi.on(...)` con más de 20 eventos, `registerProvider`, comandos, atajos, renderers y `pi install npm:/git:`. |
| **AdmissionController** con capacidad, rate y budget antes de crear el run. | **Amplitud de proveedores** en `pi-ai`, con costo, cache y cambio de modelo a mitad de sesión. |
| **OperationalController** (kill switch fuera del loop, aislar tenant, rollback) + **HandoffCoordinator**. | **Evals con lift**: comparaciones con y sin docs en contenedores Docker. |
| **Constitución e invariantes** verificables, y un orden de construcción justificado (P-09). | **Recuperación honesta del resultado desconocido**: "external outcome is unknown" en lugar de re-ejecutar. |

**Evidencia:**
- `ch19:991-1147`, `ch17:927-1085`, `ch20:1028-1254`, `ch14:827-884`, `ch18:1083-1197`, `ch25:268-343`.
- `PI/coding-agent/docs/session-format.md:3`, `:72-75`, `PI/agent/src/types.ts:458-459`, `PI/agent/src/harness/runtime/drive/tools.ts:45`, `PI/evals/README.md:71-107`.

---

## 4. Lecciones aprendidas de eve que les faltan a ambos

Cada lección tiene la misma estructura: **qué aprendió eve**, **por qué importa**, **qué le falta a book-harness**, **qué le falta a pi** y **cómo aplicarla**. Las recomendaciones de "cómo aplicarla" son **[inferencia]** de este estudio.

### L1. El paso es la unidad de durabilidad y de replay
- **eve:** una llamada al modelo más sus tools inline forman un paso, y el paso es un checkpoint. Los pasos completados se reproducen desde su resultado. El interrumpido se re-ejecuta completo, y por eso eve exige que los side effects sean idempotentes o vayan con aprobación.
- **Por qué:** así se separan "qué ya ocurrió" y "qué hay que rehacer". Sin esa frontera, un crash duplica efectos o pierde trabajo.
- **book-harness:** tiene `createOrUpdateSessionCheckpoint` e INV-13 (reconstruir desde el estado), pero no define **qué** se re-ejecuta tras un fallo a mitad de turno.
- **pi:** el CLI no tiene reanudación a mitad de turno. El runtime experimental sí la tiene, y con más detalle que eve (resultado desconocido y política de replay).
- **Aplicar:** definir el contrato "paso = checkpoint + replay de completados", y combinarlo con la política de replay de pi (`never`/`safe`) y el IdempotencyGuard de book-harness. Ninguno de los tres tiene las tres piezas juntas.
- `repos/vercel/eve/docs/concepts/execution-model-and-durability.mdx:94-102`
- `repos/aaramirez/book-harness/constitution/ARCHITECTURE_CONSTITUTION.md:196-202`

### L2. Esperar no debe costar cómputo, y cualquier canal debe poder despertar el turno
- **eve:** aprobaciones, preguntas, OAuth y límites de sesión comparten un protocolo (`input.requested` → `session.waiting` → `inputResponses`). La espera es durable y sin cómputo. La respuesta puede llegar por un canal distinto del que la pidió, y se enruta al hijo que la pidió.
- **book-harness:** `beginToolApprovalPause` retorna y persiste, y esa es la mitad correcta. Falta la otra mitad: el mecanismo que entrega la resolución y reanuda.
- **pi:** los gates son extensiones con UI en memoria. En modo RPC hay un intercambio `extension_ui_request` con timeout, pero nada sobrevive a un reinicio.
- **Aplicar:** un "inbox" durable por sesión, con requests tipadas por `kind` y un `requestId` estable, que cualquier adaptador (UI, chat, API) pueda resolver.
- `repos/vercel/eve/docs/tools/human-in-the-loop.md:170-198`
- `ch13:867-997`
- `PI/coding-agent/docs/rpc-extension-ui.md:7-10`

### L3. La identidad es un dato de primera clase del turno, no una preocupación del borde
- **eve:** la route auth produce un `SessionAuthContext`. La sesión guarda `initiator`, `current` se renueva en cada turno, y las tools, connections, políticas y memoria lo leen. El tenant sale de la auth verificada, nunca del prompt.
- **book-harness:** AdmissionController decide ADMIT o REJECT, pero ningún contrato lleva el principal hasta ToolRuntime o CredentialBroker. `resolveCredentialReference` recibe `agentId`, no un usuario.
- **pi:** es un harness de un solo usuario local, así que el concepto no existe.
- **Aplicar:** agregar un `Principal` (con `current` e `initiator`) al contexto de ejecución, y hacer que CredentialBroker, PolicyEngine y la memoria lo exijan.
- `repos/vercel/eve/docs/guides/auth-and-route-protection.md:288-299`
- `repos/vercel/eve/docs/patterns/multi-tenant-auth.md:14-37`
- `ch16:878-982`

### L4. Seguro por defecto también en el scaffold
- **eve:** `placeholderAuth()` hace que un proyecto recién creado **no** acepte tráfico de producción. `localDev()` depende del proceso, no del request. `none()` hay que declararlo. El frontmatter de markdown se trata como dato, sin evaluar JS.
- **book-harness:** fail-closed está en las decisiones (política, admisión, clasificación), pero no en la configuración inicial ni en el despliegue.
- **pi:** tiene "project trust" para los recursos del proyecto, que es una buena práctica. Pero los modos servidor no autentican.
- **Aplicar:** que la plantilla inicial de un harness sea incapaz de exponerse sin auth explícita.
- `repos/vercel/eve/docs/guides/auth-and-route-protection.md:205-222`
- `repos/vercel/eve/docs/concepts/security-model.md:76-82`
- `PI/coding-agent/docs/security.md:37-51`

### L5. La frontera de confianza es física: secretos de un lado, cómputo del modelo del otro
- **eve:** el runtime con secretos y el sandbox tienen ciclos de vida separados. Todas las tools, incluso las de archivos, cruzan por el lado app. El egress autenticado se hace con brokering y el secreto nunca entra al sandbox.
- **book-harness:** la referencia opaca de CredentialBroker es la versión lógica. Falta la frontera de ejecución (dónde corre `bash`, sin qué variables).
- **pi:** el aislamiento es opt-in, y el default es "los permisos de tu cuenta".
- **Aplicar:** el sandbox por sesión como componente del runtime, no como extensión, con política de red y brokering.
- `repos/vercel/eve/docs/concepts/security-model.md:8-20`, `:52-54`
- `PI/coding-agent/docs/containerization.md:9-16`

### L6. El borde son canales, y cada conversación externa tiene una dirección de continuación
- **eve:** un canal normaliza el input, es dueño de la dirección (hilo de Slack, issue de GitHub) que mapea a la sesión, y decide cómo se entrega la respuesta. Solo una sesión activa puede tener una dirección, con marcadores durante el handoff.
- **book-harness:** el Ingress Adapter normaliza a `ActivationRequest`, pero no modela la continuación: qué run retoma el siguiente mensaje del mismo hilo.
- **pi:** sus modos son de proceso local, sin concepto de conversación externa.
- **Aplicar:** separar "activación" (P-16) de "continuación", con una tabla de direcciones → sesión con propiedad exclusiva.
- `repos/vercel/eve/docs/concepts/execution-model-and-durability.mdx:128-163`
- `ch14:816-845`

### L7. El runtime evoluciona con sesiones abiertas
- **eve:** una sesión inactiva migra al deploy nuevo tras validar su checkpoint. El trabajo vivo nunca se mueve. Hay importación única desde el modelo de ejecución anterior, y se declara que no hay rollback transparente.
- **book-harness:** INV-E10 exige registrar versiones exactas por run, pero no dice qué pasa con una sesión larga cuando cambia la versión.
- **pi:** las sesiones JSONL tienen versión de formato (v3), pero no hay migración de sesiones activas entre versiones del runtime.
- **Aplicar:** una política explícita de "migrar en frontera inactiva, nunca con trabajo pendiente", más la versión de runtime en el checkpoint.
- `repos/vercel/eve/docs/concepts/execution-model-and-durability.mdx:26-57`
- `repos/aaramirez/book-harness/constitution/ARCHITECTURE_CONSTITUTION.md:975-989`

### L8. Un agente también es un servicio: protocolos durables para agentes y herramientas externas
- **eve:** el canal MCP (`agent_start`, `get`, `update`, `cancel`, con estados `working`, `input_required` y `authorization_required`) y los agentes remotos con callbacks durables. Una invocación pertenece al principal que la creó.
- **book-harness:** el Gateway autoriza los mensajes con grants, pero el transporte es Preview y no hay semántica de invocación asíncrona.
- **pi:** el servidor experimental es local y sin auth.
- **Aplicar:** definir el contrato de "invocación durable", con su estado consultable y propietario, por encima del transporte (P-18).
- `repos/vercel/eve/docs/channels/mcp.mdx:165-218`
- `ch15:940-1031`

### L9. Los límites se heredan y se reparten
- **eve:** existen caps de tokens y costo por sesión, y los hijos de un batch se reparten el cupo restante del padre. Un batch posterior ve el cupo menos lo que ya consumieron sus hermanos.
- **book-harness:** INV-E06 lo exige ("delegation depth, child runs and delegated cost are bounded by ExecutionBudget") sin mecanismo.
- **pi:** no tiene presupuestos jerárquicos.
- **Aplicar:** que ExecutionBudget sea un árbol, donde el presupuesto de un hijo sale del saldo del padre.
- `repos/vercel/eve/packages/eve/src/subagents/token-budget.ts:11-38`

### L10. La observabilidad debe saber quién es la audiencia
- **eve:** cada sesión nace `public`, `private` o `unknown`, y el techo de captura (`tracePolicy`) se aplica antes de cualquier exportador.
- **book-harness:** separa la auditoría de la telemetría (P-25), que es correcto, pero no trata qué contenido puede capturar una traza.
- **pi:** tiene el contrato de spans, pero no un exportador ni una política de contenido.
- **Aplicar:** clasificar la sesión al crearla y hacer que la política de captura sea un techo, no una opción por exportador. Se combina bien con el DataGovernanceEngine de book-harness.
- `repos/vercel/eve/docs/channels/eve.mdx:172-209`
- `repos/vercel/eve/docs/guides/instrumentation/otel.mdx:10-40`

### Lecciones de eve que **uno** de los dos ya tiene

- **Steering en frontera de commit:** pi ya lo tiene (`steer` / `followUp`); le falta a book-harness.
- **Compactar primero sin modelo:** eve recorta los tool results grandes antes de resumir, y pi los trunca al serializar para el resumen. A book-harness le falta: compacta por candidato, sin fase previa.
- **Salida estructurada en la API:** pi la resuelve con un patrón de tool terminal. Falta como primitiva en ambos.

**Evidencia:**
- `repos/vercel/eve/docs/concepts/execution-model-and-durability.mdx:155-163`
- `PI/agent/src/agent.ts:247-305`
- `repos/vercel/eve/packages/eve/src/harness/compaction.ts:198-293`
- `PI/coding-agent/docs/compaction.md:290`
- `ch04:686-765`

---

## 5. Qué hacer con esto

> Diseño detallado para book-harness: [[BH-Propuestas]] ([[BH-Propuesta-Lecciones-eve]] · [[BH-Propuesta-Aportes-pi]]).

- **Para un diseño propio** (p.ej. `arnes0.1/`) **[inferencia]**, conviene mezclar lo mejor de los tres:
  - el **gobierno** de book-harness: constitución, auditoría, idempotencia, gobierno de datos;
  - la **operación** de eve: durabilidad por defecto, esperas durables, canales, identidad, frontera física, handoff de deploys;
  - la **ergonomía** de pi: extensiones, sesiones en árbol, amplitud de proveedores, política de replay y evals con lift.
- **Para book-harness:** L3 (principal), L6 (continuación) y L7 (evolución con sesiones abiertas) son **capítulos que faltan**. Encajan en sus planos Ingress & Activation, Execution y Reliability.
- **Para pi:** L2 (espera durable), L3/L4 (identidad y auth antes de exponer `pi server`) y L5 (sandbox por defecto) son la distancia entre un coding agent local y un servicio.

---

[[vercel-eve]] · [[BH-Implementacion]] · [[Arquitectura_Agent_Harness_inspirado_en_Pi]] · [[Matriz-Comparativa]]
