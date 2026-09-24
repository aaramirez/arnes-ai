---
title: Arquitectura de un Agent Harness inspirado en Pi
type: note
tags:
  - arquitectura
  - pi
---

# Arquitectura de un Agent Harness inspirado en Pi

> Comparativa con el código real de pi, eve y book-harness: [[Eve-vs-BookHarness-vs-Pi]].

## 1. Propósito

Este documento consolida los principales conceptos discutidos alrededor de cómo diseñar y construir un **Agent Harness** inspirado en Pi, con énfasis en:

- componentes fundamentales;
- responsabilidades de cada componente;
- relaciones entre componentes;
- desacoplamiento entre modelo, runtime, herramientas e interfaces;
- flujo de ejecución de un agente;
- gestión de contexto y sesiones;
- eventos, hooks y side effects;
- TUI y capas de presentación;
- políticas, permisos y gobierno para entornos enterprise;
- evolución progresiva desde un harness mínimo hasta una plataforma de agentes.

La idea central es que un harness no es simplemente un chatbot con herramientas. Es el **runtime que gobierna el ciclo completo de decisión, acción, observación y continuidad de un agente**.

---

# 2. Definición fundamental

Una forma útil de pensar un agente es:

> **Agent = Model + Context + Skills + Tools + Policies + State**

Mientras que:

> **Harness = runtime que ensambla, ejecuta, gobierna y observa esos componentes durante el ciclo del agente.**

El modelo no es el agente completo.

El modelo propone decisiones. El harness:

- prepara el contexto;
- invoca al modelo;
- valida tool calls;
- ejecuta herramientas;
- registra observaciones;
- controla permisos;
- mantiene estado;
- decide cuándo volver a consultar al modelo;
- emite eventos;
- persiste sesiones;
- expone la ejecución a una interfaz.

---

# 3. Principios arquitectónicos

## 3.1 El modelo debe ser reemplazable

El harness no debe depender del formato interno de OpenAI, Anthropic, Gemini u otro proveedor.

Debe existir un contrato interno estable:

```text
Harness
   ↓
AgentMessage
   ↓
Model Adapter
   ↓
OpenAI / Anthropic / Gemini / Local
```

Esto evita acoplar:

- agent loop;
- sessions;
- tools;
- contexto;
- eventos;
- UI;

a un proveedor específico.

### Regla

> El proveedor se adapta al harness; el harness no se adapta al proveedor.

---

## 3.2 El modelo propone; el harness gobierna

Un LLM puede devolver:

```json
{
  "tool": "deploy",
  "environment": "production"
}
```

Eso no significa que deba ejecutarse.

La arquitectura correcta es:

```text
LLM
 ↓
Tool Intent
 ↓
Validation
 ↓
Policy
 ↓
Authorization
 ↓
Approval
 ↓
Execution
```

Por tanto:

> **LLM = propone acciones.**  
> **Harness = autoriza y ejecuta acciones.**

---

## 3.3 Context es un componente de primera clase

No debe limitarse a:

```text
conversationHistory
```

El contexto puede componerse de:

```text
System Instructions
        +
Agent Instructions
        +
Project Context
        +
Relevant Skills
        +
Working Memory
        +
Recent Events
        +
Tool Observations
        +
Current Request
```

El harness decide qué información entra al modelo.

---

## 3.4 Tools son capacidades explícitas

Una herramienta no debe ser un comportamiento implícito del prompt.

Debe tener un contrato concreto:

```ts
interface Tool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  schema: unknown;
  execute(input: TInput): Promise<TOutput>;
}
```

Posteriormente puede enriquecerse con metadata operacional:

```ts
interface Tool {
  name: string;
  description: string;
  schema: unknown;

  execution: {
    mode: "parallel" | "sequential";
    sideEffect: "none" | "local" | "external";
    risk?: "low" | "medium" | "high";
    requiresApproval?: boolean;
  };

  execute(input: unknown): Promise<unknown>;
}
```

---

## 3.5 Eventos y hooks cumplen funciones distintas

### Eventos

Comunican:

> “Algo ocurrió.”

Ejemplos:

```text
agent_start
turn_start
message_start
message_update
message_end
tool_execution_start
tool_execution_update
tool_execution_end
turn_end
agent_end
```

Los eventos son útiles para:

- TUI;
- logging;
- telemetry;
- session persistence;
- auditoría;
- analytics;
- observabilidad.

### Hooks

Comunican:

> “Algo está por ocurrir y puede ser interceptado.”

Ejemplos:

```text
beforeToolCall
afterToolCall
```

Los hooks son apropiados para:

- autorización;
- validación;
- políticas;
- approvals;
- sandbox;
- redaction;
- rate limiting;
- transformación.

La diferencia es crítica:

```text
EVENT
algo ocurrió

HOOK
algo está por ocurrir
y puede ser modificado o bloqueado
```

---

# 4. Arquitectura general

```text
                         USER
                           │
                           ▼
                ┌───────────────────┐
                │ Interface Layer   │
                │ CLI / TUI / API   │
                │ Web / IDE / Slack │
                └─────────┬─────────┘
                          │
                          ▼
                ┌───────────────────┐
                │   Agent Runtime   │
                │                   │
                │   Agent Loop      │
                └─────────┬─────────┘
                          │
             ┌────────────┴────────────┐
             │                         │
             ▼                         ▼
    ┌─────────────────┐      ┌─────────────────┐
    │ Context Builder │      │     State       │
    └─────────────────┘      └─────────────────┘
             │                         │
             └────────────┬────────────┘
                          ▼
                ┌───────────────────┐
                │   Model Gateway   │
                └─────────┬─────────┘
                          ▼
                ┌───────────────────┐
                │       LLM         │
                └─────────┬─────────┘
                          │
                    tool calls
                          │
                          ▼
                ┌───────────────────┐
                │   Tool Runtime    │
                ├───────────────────┤
                │ schema validation │
                │ hooks             │
                │ policy            │
                │ execution         │
                └─────────┬─────────┘
                          │
                          ▼
                    tool results
                          │
                          └────────────► Agent Loop
```

En paralelo, el runtime emite eventos:

```text
Agent Runtime
     │
     └── Events
          │
    ┌─────┼─────┬─────────┬──────────┐
    ▼     ▼     ▼         ▼          ▼
   TUI   Logs  Session   Audit    Telemetry
```

---

# 5. Separación de capas inspirada en Pi

Una separación especialmente valiosa es:

```text
AI Layer
   ↓
Agent Core
   ↓
Application Agent
```

Conceptualmente:

```text
┌─────────────────────────────────────────┐
│ Application Agent                       │
│                                         │
│ CLI · TUI · Sessions · Skills           │
│ Extensions · Context · Compaction       │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│ Agent Core                              │
│                                         │
│ Agent Loop · State · Tools · Events     │
│ Steering · Lifecycle                    │
└────────────────────┬────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────┐
│ AI / Model Layer                        │
│                                         │
│ Providers · Messages · Streaming        │
│ Model Adapters                          │
└─────────────────────────────────────────┘
```

La ventaja fundamental es que el **Agent Core no sabe qué tipo de agente está ejecutando**.

Puede usarse para:

- coding agent;
- research agent;
- operations agent;
- sales agent;
- finance agent;
- incident agent;
- enterprise workflow agent.

---

# 6. Model Gateway

## Responsabilidad

Desacoplar el runtime del proveedor de LLM.

Contrato conceptual:

```ts
interface ModelProvider {
  generate(request: ModelRequest): Promise<ModelResponse>;
}
```

Implementaciones:

```text
ModelProvider
 ├── OpenAIProvider
 ├── AnthropicProvider
 ├── GeminiProvider
 └── LocalProvider
```

El `Agent Core` solo conoce:

```text
AgentMessage
ModelRequest
ModelResponse
```

No debería conocer directamente:

```text
OpenAI.ChatCompletionMessage
Anthropic.Message
Gemini.Content
```

---

# 7. AgentMessage como contrato interno

Una de las decisiones más importantes es mantener un modelo de mensaje propio.

Ejemplo:

```ts
type AgentMessage =
  | UserMessage
  | AssistantMessage
  | ToolCallMessage
  | ToolResultMessage
  | SystemMessage;
```

Ventajas:

1. evita vendor lock-in;
2. permite switching de modelos;
3. permite almacenar metadata propia;
4. permite representar eventos internos;
5. facilita persistencia;
6. simplifica testing;
7. habilita nuevos tipos de mensajes que los proveedores no soportan directamente.

La conversión ocurre en el boundary:

```text
AgentMessage[]
       ↓
convertToProviderFormat()
       ↓
Provider API
```

---

# 8. Agent Loop

El agent loop es el corazón del harness.

Una versión conceptual:

```ts
async function runAgent(agent, input, session) {
  session.add({
    type: "user_message",
    content: input
  });

  while (true) {
    const context = await buildContext(agent, session);

    const response = await model.generate({
      messages: context.messages,
      tools: toolRegistry.getSchemas(agent.tools)
    });

    session.add(response);

    if (!response.toolCalls?.length) {
      return response.text;
    }

    for (const call of response.toolCalls) {
      const result = await executeToolCall(call);
      session.addToolResult(call.id, result);
    }
  }
}
```

## Concepto fundamental

Después de ejecutar una herramienta, el harness **no entrega automáticamente el resultado al usuario**.

Lo devuelve al modelo:

```text
Model decides
     ↓
Tool Call
     ↓
Harness executes
     ↓
Tool Result
     ↓
Model re-evaluates
     ↓
Continue?
   /       \
 yes       no
 ↓          ↓
tool       final
```

El resultado del tool call se convierte en una nueva observación.

Eso permite:

```text
read
 ↓
analyze
 ↓
read another file
 ↓
edit
 ↓
test
 ↓
observe failure
 ↓
edit again
 ↓
test
 ↓
finish
```

---

# 9. Turn y Agent Run

Conviene distinguir:

## Agent Run

La ejecución completa de una solicitud.

```text
agent_start
...
agent_end
```

## Turn

Una interacción modelo-observación.

```text
turn_start
model request
model response
tool execution
turn_end
```

Un mismo Agent Run puede tener múltiples turns.

```text
Agent Run
│
├── Turn 1
│    └── tool call
│
├── Turn 2
│    └── tool call
│
├── Turn 3
│    └── tool call
│
└── Turn 4
     └── final answer
```

---

# 10. Tool Runtime

El tool runtime funciona como un gateway entre el modelo y el mundo externo.

Flujo recomendado:

```text
Tool Call
   ↓
Tool Exists?
   ↓
Schema Validation
   ↓
beforeToolCall
   ↓
Policy Evaluation
   ↓
Authorization
   ↓
Approval if required
   ↓
Sandbox / Execution Environment
   ↓
execute()
   ↓
afterToolCall
   ↓
Tool Result
```

El modelo no debe tener acceso directo al sistema operativo o a APIs externas.

---

# 11. Tool Registry

El registro central permite:

```ts
toolRegistry.register(readFile);
toolRegistry.register(writeFile);
toolRegistry.register(shell);
```

Luego:

```ts
toolRegistry.execute(
  toolCall.name,
  toolCall.args
);
```

Beneficios:

- descubrimiento centralizado;
- validación;
- control de permisos;
- introspección;
- generación de schemas para el modelo;
- instrumentación;
- versionado de tools.

---

# 12. Paralelismo y secuencialidad

Las tool calls pueden ejecutarse en paralelo cuando son independientes.

Ejemplo:

```text
read(auth.ts) ──────┐
read(user.ts) ──────┼──► aggregate
read(config.ts) ────┘
```

Pero deben ejecutarse secuencialmente cuando existe:

- dependencia de datos;
- shared mutable state;
- side effects;
- orden obligatorio.

Ejemplo:

```text
write(config.ts)
      ↓
npm test
      ↓
read(output)
```

Por eso una tool puede declarar:

```ts
execution: {
  mode: "parallel"
}
```

o:

```ts
execution: {
  mode: "sequential"
}
```

La decisión no debe dejarse completamente al LLM.

---

# 13. Estado del agente

El estado operativo puede contener:

```text
AgentState
├── messages
├── model
├── thinking level
├── system prompt
├── tools
├── streaming message
└── error state
```

Este estado corresponde a la ejecución actual.

Debe distinguirse de la persistencia histórica.

---

# 14. Agent State vs Session State

Una separación esencial:

> **Agent State ≠ Session State**

### Agent State

Representa:

- ejecución actual;
- configuración activa;
- modelo;
- herramientas;
- mensajes disponibles;
- estado temporal.

### Session State

Representa:

- historia persistente;
- branching;
- checkpoints;
- recuperación;
- metadatos;
- eventos previos.

La sesión puede sobrevivir al proceso del agente.

---

# 15. Session Manager

Un `SessionManager` debe encargarse de:

- crear sesiones;
- cargar sesiones;
- persistir eventos;
- recuperar contexto;
- manejar branching;
- checkpoints;
- resumir historial;
- identificar parent/child sessions.

Una sesión no tiene que ser estrictamente lineal.

```text
Session
 │
 ├── Message
 ├── Tool Call
 ├── Tool Result
 │
 ├──── Branch A
 │      └── ...
 │
 └──── Branch B
        └── ...
```

---

# 16. Context Builder

El Context Builder decide qué información recibe el modelo en cada turno.

Arquitectura:

```text
System Constitution
        ↓
Organization Policy
        ↓
Agent Role
        ↓
Current Task
        ↓
Relevant Skills
        ↓
Project Context
        ↓
Working Memory
        ↓
Recent History
        ↓
Tool Observations
```

## Primera versión recomendada

No construir inicialmente un RAG complejo.

Primero:

```text
System Prompt
+
Project Instructions
+
Relevant Skills
+
Recent Conversation
+
Tool Results
```

Luego agregar:

- retrieval;
- compression;
- summarization;
- context budgets;
- ranking;
- memory.

---

# 17. Context Providers

La evolución natural es definir:

```ts
interface ContextProvider {
  getContext(
    request: ContextRequest
  ): Promise<ContextBlock[]>;
}
```

Implementaciones posibles:

```text
GitContextProvider
DocumentationProvider
CompanyPolicyProvider
DatabaseContextProvider
UserMemoryProvider
ProjectContextProvider
RAGProvider
IncidentContextProvider
```

Esto permite construir contexto dinámicamente sin alterar el agent loop.

---

# 18. Context Engineering vs RAG

No deben confundirse.

RAG es una posible fuente.

Context Engineering es el proceso completo de decidir:

- qué información necesita el modelo;
- qué se recupera;
- qué se resume;
- qué se elimina;
- qué se prioriza;
- qué se fija permanentemente;
- cuánto contexto recibe;
- cuándo se actualiza.

Por tanto:

```text
RAG
  ↓
Context Provider
  ↓
Context Engine
  ↓
Final Context
  ↓
Model
```

---

# 19. Skills

Un skill contiene conocimiento procedural.

Ejemplo:

```text
skills/
  debugging/
    SKILL.md
```

Contenido:

```markdown
# Debugging

## Goal

Find the root cause before modifying code.

## Procedure

1. Reproduce the issue.
2. Inspect relevant logs.
3. Identify the failing boundary.
4. Form a hypothesis.
5. Test the hypothesis.
6. Apply the smallest change.
7. Run regression tests.

## Avoid

- Blind rewrites.
- Modifying unrelated code.
- Suppressing errors.
```

La idea es separar:

```text
WHAT YOU ARE
Agent

WHAT YOU CAN DO
Tools

HOW YOU SHOULD DO IT
Skills

WHAT YOU KNOW
Context

WHAT YOU MAY DO
Policies
```

---

# 20. Extensions

Un extension no es un skill.

## Skill

```text
knowledge / instructions
```

## Extension

```text
executable runtime behavior
```

Una extensión puede registrar:

- tools;
- commands;
- hooks;
- context providers;
- policies;
- UI components;
- lifecycle listeners.

Contrato conceptual:

```ts
export interface HarnessExtension {
  name: string;
  setup(api: HarnessAPI): Promise<void>;
}

export interface HarnessAPI {
  tools: ToolRegistry;
  hooks: HookRegistry;
  context: ContextRegistry;
  policies: PolicyRegistry;
  commands: CommandRegistry;
}
```

La separación permite mantener el core pequeño.

---

# 21. Event-Driven Architecture

El core debe correr independientemente.

En lugar de:

```text
Agent Loop
  ├── update UI
  ├── write DB
  ├── send metrics
  ├── log
  └── audit
```

debe emitir eventos:

```text
Agent Loop
     │
     └── Event Bus
           │
      ┌────┼────┬─────┬────────┐
      ▼    ▼    ▼     ▼        ▼
     TUI  Log  DB  Telemetry  Audit
```

Esto permite que el core sea:

- portable;
- testeable;
- independiente de interfaz;
- independiente de almacenamiento;
- reutilizable.

---

# 22. TUI

La interfaz de terminal no debe formar parte del core.

Arquitectura recomendada:

```text
Agent Core
    │
    │ events
    ▼
TUI Adapter
    │
    ▼
TUI Library
    │
    ▼
Terminal
```

La TUI puede escuchar:

```text
message_update
tool_execution_start
tool_execution_end
agent_end
```

sin que el core conozca detalles de rendering.

---

# 23. Uso de la TUI de Pi

Una estrategia pragmática para una primera versión es reutilizar una librería TUI existente inspirada en Pi, en vez de construir un renderer desde cero.

Arquitectura:

```text
Our Harness
    │
    │ events
    ▼
Our TUI Adapter
    │
    ▼
pi-tui compatible library
```

Lo importante es mantener una interfaz propia:

```ts
interface HarnessUI {
  start(): Promise<void>;

  onAgentStart(): void;

  onMessageStart(id: string): void;

  onMessageUpdate(
    id: string,
    content: string
  ): void;

  onToolStart(
    id: string,
    tool: string,
    args: unknown
  ): void;

  onToolEnd(
    id: string,
    result: unknown
  ): void;

  onAgentEnd(): void;
}
```

Después podrían existir:

```text
PiTUIAdapter
InkAdapter
WebAdapter
VSCodeAdapter
SlackAdapter
```

sin alterar el core.

---

# 24. Steering y Follow-Up

Un harness interactivo debe permitir que el usuario intervenga mientras el agente trabaja.

## Steering

Modifica el rumbo de la ejecución en curso.

Ejemplo:

```text
USER:
Refactor authentication.

AGENT:
reading...
editing...

USER:
Do not change the public API.
```

La nueva instrucción se incorpora antes de continuar.

## Follow-Up

Espera hasta completar el trabajo actual.

Esto permite distinguir:

```text
change current execution
```

de:

```text
new task after completion
```

---

# 25. Policy Engine

Para un harness enterprise, esta capa es fundamental.

Ejemplo:

```yaml
permissions:

  read_file:
    policy: allow

  write_file:
    policy: allow

  shell:
    policy: sandbox

  git_push:
    policy: approval

  deploy_staging:
    policy: role_based

  deploy_production:
    policy: approval

  delete_customer_records:
    policy: deny
```

El modelo jamás debe convertirse en la fuente de autorización.

---

# 26. Clasificación de acciones

Una taxonomía inicial:

```text
READ ONLY
   ↓
LOW-RISK WRITE
   ↓
EXTERNAL SIDE EFFECT
   ↓
CRITICAL ACTION
```

Ejemplos:

```text
read_file
    → automatic

search_database
    → automatic

write_source_code
    → sandbox

git_commit
    → allow

git_push
    → approval

send_email
    → confirmation

deploy_staging
    → policy-dependent

deploy_production
    → explicit approval

delete_customer_records
    → deny
```

---

# 27. Sandbox

Una tool con acceso a shell puede ser extremadamente poderosa.

Por eso el harness enterprise debe considerar:

```text
Tool Call
   ↓
Policy
   ↓
Sandbox
   ↓
Resource Limits
   ↓
Execution
```

El sandbox puede limitar:

- filesystem;
- network;
- CPU;
- memory;
- process creation;
- credentials;
- environment variables;
- outbound domains.

---

# 28. Observabilidad

Cada ejecución debería producir suficiente información para reconstruir lo ocurrido.

Un trace puede contener:

```text
Agent Run
├── request
├── context assembled
├── model used
├── tokens
├── latency
├── tool calls
├── tool results
├── policy decisions
├── approvals
├── retries
├── errors
└── final response
```

Esto es esencial para:

- debugging;
- governance;
- evals;
- seguridad;
- costos;
- reliability engineering.

---

# 29. Evals

Un harness no debe evaluarse solamente por “la respuesta parece buena”.

Debe medirse:

```text
Task success
Tool selection accuracy
Tool argument accuracy
Policy compliance
Number of iterations
Latency
Cost
Recovery after failure
Hallucinated tool calls
Context relevance
User intervention rate
```

---

# 30. Monorepo recomendado

Una estructura inicial:

```text
agent-harness/
│
├── apps/
│   ├── cli/
│   └── api/
│
├── packages/
│   ├── ai/
│   │   ├── provider.ts
│   │   ├── messages.ts
│   │   └── adapters/
│   │
│   ├── agent-core/
│   │   ├── agent.ts
│   │   ├── agent-loop.ts
│   │   ├── state.ts
│   │   └── events.ts
│   │
│   ├── tools/
│   │   ├── registry.ts
│   │   ├── executor.ts
│   │   └── schemas.ts
│   │
│   ├── context/
│   │   ├── builder.ts
│   │   └── providers.ts
│   │
│   ├── sessions/
│   │   ├── session.ts
│   │   └── storage.ts
│   │
│   ├── policies/
│   │   ├── engine.ts
│   │   ├── approvals.ts
│   │   └── sandbox.ts
│   │
│   ├── extensions/
│   ├── skills/
│   ├── telemetry/
│   └── tui/
│
├── agents/
├── skills/
├── policies/
├── evals/
└── README.md
```

---

# 31. Qué debe contener v0.1

El primer release debe ser pequeño.

```text
v0.1

✓ Agent Loop
✓ Internal AgentMessage
✓ One Model Provider
✓ Tool Registry
✓ read_file
✓ write_file
✓ shell
✓ Session persistence
✓ Basic Context Builder
✓ Events
✓ CLI / TUI adapter
```

Criterio de éxito:

```text
$ harness run developer

> Create a health endpoint.

Agent
 ↓
Inspect repository
 ↓
Understand framework
 ↓
Read files
 ↓
Modify code
 ↓
Run tests
 ↓
Observe failures
 ↓
Fix
 ↓
Run tests
 ↓
Return result
```

Si el harness completa este loop de forma confiable, ya existe una base válida.

---

# 32. Qué NO construir en v0.1

Evitar:

- multi-agent;
- RAG complejo;
- vector databases;
- decenas de integrations;
- workflow visual;
- large policy framework;
- custom TUI engine;
- long-term memory sofisticada;
- planner/reviewer/supervisor agents;
- distributed execution.

El objetivo inicial es validar el runtime.

---

# 33. Roadmap sugerido

## v0.1 — Core Harness

```text
Agent loop
Model interface
Tool registry
Basic tools
Sessions
Events
CLI/TUI
```

## v0.2 — Governance

```text
Permissions
Policies
Approval gates
Sandboxing
Audit events
```

## v0.3 — Knowledge

```text
Skills
Context providers
Context budgets
Summarization
Compaction
```

## v0.4 — Enterprise Integrations

```text
MCP
GitHub
Slack
Jira
Databases
APIs
Business systems
```

## v0.5 — Reliability

```text
Telemetry
Tracing
Evals
Retries
Failure recovery
Cost tracking
```

## v0.6 — Automation

```text
Scheduled runs
Event triggers
Durable workflows
Human-in-the-loop
```

## v0.7 — Multi-Agent

```text
Delegation
Specialized agents
Supervisor
Agent-to-agent communication
Shared workflows
```

---

# 34. Evolución conceptual

La progresión correcta puede verse como:

```text
LLM
 ↓
LLM + Prompt
 ↓
LLM + Tools
 ↓
Context-Aware Agent
 ↓
Persistent Agent Harness
 ↓
Policies + Observability
 ↓
Smart Automation
 ↓
Specialized Agents
 ↓
Multi-Agent Orchestration
 ↓
Enterprise Agent Operating Layer
```

La recomendación fundamental es:

> No introducir multi-agent antes de lograr single-agent reliability.

Multiplicar agentes antes de resolver contexto, tools, permisos, observabilidad y evals solo multiplica la incertidumbre.

---

# 35. Arquitectura enterprise objetivo

```text
                         USERS / SYSTEMS
                               │
              ┌────────────────┼─────────────────┐
              ▼                ▼                 ▼
             TUI              API               Web
              │                │                 │
              └────────────────┼─────────────────┘
                               ▼
                      ┌────────────────┐
                      │ Agent Gateway  │
                      └───────┬────────┘
                              ▼
                    ┌────────────────────┐
                    │ Agent Runtime      │
                    │                    │
                    │ Agent Loop         │
                    │ State              │
                    │ Events             │
                    └────────┬───────────┘
                             │
         ┌───────────────────┼───────────────────┐
         ▼                   ▼                   ▼
   Context Engine       Model Gateway        Tool Runtime
         │                   │                   │
         ▼                   ▼                   ▼
 Context Providers        Providers         Policies/Hooks
         │                   │                   │
         ▼                   ▼                   ▼
 Docs/DB/Git/Memory       LLM APIs        Tools / Systems
                                                   │
                                                   ▼
                                        Git / Shell / APIs
                                        DB / SaaS / MCP
```

Cross-cutting:

```text
Sessions
Telemetry
Audit
Evals
Security
Approvals
Cost Control
```

---

# 36. Manifiesto arquitectónico

Un conjunto de principios que puede guiar el proyecto:

1. **Context is a first-class architectural component.**
2. **The model is replaceable.**
3. **Tools are explicit capabilities, not prompt tricks.**
4. **Every action produces observable events.**
5. **Side effects pass through policy.**
6. **Agents are configuration over a shared runtime.**
7. **Skills encode reusable procedural knowledge.**
8. **Agent state and session state are different concerns.**
9. **Single-agent reliability precedes multi-agent complexity.**
10. **The harness owns execution state—not the model.**
11. **UI is an adapter, not part of the core.**
12. **Events observe; hooks intervene.**
13. **Authorization is deterministic and external to the LLM.**
14. **Context should be selected, not dumped.**
15. **Automation and agents should share the same execution substrate.**

---

# 37. Conclusión

La arquitectura de un harness robusto no consiste en construir un LLM wrapper más grande.

Consiste en crear una plataforma donde:

```text
Model
    proposes

Harness
    governs

Tools
    act

Context
    informs

State
    remembers

Policies
    constrain

Events
    expose

Sessions
    persist

UI
    presents
```

La mejor estrategia es comenzar con un runtime pequeño y general:

```text
Model Gateway
      +
Agent Loop
      +
Tool Runtime
      +
Context Builder
      +
Session Store
      +
Event System
```

y permitir que capacidades más sofisticadas aparezcan como capas alrededor del core.

El resultado final no es solamente un coding agent.

Es una **infraestructura reusable para agentes empresariales**, donde distintos agentes pueden compartir:

- runtime;
- model gateway;
- tools;
- security;
- policies;
- sessions;
- observability;
- context infrastructure;

y diferenciarse principalmente por:

```text
Agent configuration
+
Skills
+
Context
+
Allowed tools
+
Policies
```

Ese es el punto en el que el harness deja de ser una aplicación y se convierte en una verdadera **Agent Operating Layer**.
