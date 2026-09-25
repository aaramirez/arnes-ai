---
title: Propuesta — Enriquecer book-harness con lo que tiene pi
type: propuesta
repo: aaramirez/book-harness
fuente: earendil-works/pi
estado: borrador
fecha: 2026-09-24
tags:
  - propuesta
  - book-harness
  - pi
---

# Propuesta — Enriquecer book-harness con lo que tiene pi

[[BH-Propuestas]] · [[BH-Propuesta-Lecciones-eve]] · [[Eve-vs-BookHarness-vs-Pi]] · [[Arquitectura_Agent_Harness_inspirado_en_Pi]]

**Objetivo:** identificar qué tiene **pi** (coding agent local, `earendil-works/pi` @ `b455975`) que **enriquecería** a book-harness, y decir dónde encaja en el libro: plano, componente, contratos, capítulo y artículos.

A diferencia de eve, casi todo lo de pi **enriquece componentes del núcleo de agente único que ya existen**: AgentLoop, ContextEngine, SessionManager, ModelGateway, ToolRuntime, IdempotencyGuard y EvaluationHarness. Por P-09, esto va **antes** que las lecciones de operación de eve.

> **Estado:** borrador de diseño **[inferencia]**; no modifica `repos/aaramirez/book-harness/`. IDs propuestos; la asignación conjunta está en [[BH-Propuestas]] §3.
>
> Abreviaturas: `PI` = `repos/earendil-works/pi/packages`, `chNN` = `repos/aaramirez/book-harness/book/chapters/NN-*/chapter.md`, `K` = `repos/aaramirez/book-harness/constitution/ARCHITECTURE_CONSTITUTION.md`, `REG` = `repos/aaramirez/book-harness/registry`.

---

## 0. Resumen: qué aporta pi y dónde va

| # | Aporte de pi | Plano | Componente del libro | Capítulo propuesto | Artículos |
| --- | --- | --- | --- | --- | --- |
| P-A1 | Colas de **steer** y **follow-up** con modos | Execution | AgentLoop (se amplía) | CH-28 | P-10, INV-08, INV-10 |
| P-A2 | **Compactación estructurada** con punto de corte seguro | Data & Context | ContextEngine (se amplía) | CH-29 | P-01, P-14, EVO-09 |
| P-A3 | **Sesiones en árbol** con resumen de rama | Data & Context + Reliability | SessionManager + ContextEngine | CH-29 | P-08, INV-12, INV-13 |
| P-A4 | **Catálogo de modelos**, costo, cache y cambio de modelo registrado | Execution | ModelGateway (se amplía) | CH-30 | P-02, P-29, INV-E10 |
| P-A5 | **Política de replay** por tool, **resultado desconocido** y memos por invocación | Reliability | IdempotencyGuard + CapabilityRegistry | CH-31 | P-24, INV-11, INV-E09 |
| P-A6 | **ExtensionHost** con puntos de intervención tipados y **confianza de proyecto** | Capability & Integration | **CMP-023 ExtensionHost** (nuevo) | CH-32 | P-07, P-12, EVO-10 |
| P-A7 | **Spans de telemetría neutros**, distintos del estado de negocio | Observability & Governance | EventBus (consumidor) | CH-41 | P-04, P-25, EVO-06 |
| P-A8 | **Protocolo de UI remota** (RPC + solicitud/respuesta de diálogo) | — (adaptador) | HumanInteractionService (lo consume) | CH-35 (anexo) | P-11, INV-14, INV-16, INV-17 |
| P-A9 | **Evals con lift** (con / sin, en entorno aislado) | Reliability (certificación) | EvaluationHarness (se amplía) | CH-42 | P-28, INV-E13 |
| P-A10 | Máquina de estados por operación y **recuperación sin re-llamar al proveedor** | Reliability | alimenta CMP-024 ExecutionJournal (eve) | CH-34 | P-23, INV-13 |
| P-A11 | **Formato de sesión versionado con migración** automática | Reliability | SessionManager | CH-40 | INV-E10, P-36 (propuesto) |

---

## P-A1. Colas de steer y follow-up

- **En pi:** `steer()` y `followUp()` son colas separadas, cada una con modo `one-at-a-time` o `all`.
  - El steering se consulta después de cada batch de tools y antes de la siguiente llamada al modelo.
  - El follow-up solo corre cuando el agente iba a detenerse.
  - Las tool calls del mensaje actual no se saltan.
  - RPC expone `prompt { streamingBehavior: "steer" | "followUp" }`.
  - Citas: `PI/agent/src/agent.ts:247-305`, `PI/agent/src/agent-loop.ts:174-205`, `PI/agent/src/types.ts:283`, `PI/coding-agent/src/modes/rpc/rpc-types.ts:22`.
  - eve tiene la misma idea (`turnPolicy: steer | queue`) aplicada en la frontera de commit: `repos/vercel/eve/docs/concepts/execution-model-and-durability.mdx:155-163`.
- **Hueco en el libro:** `runTurn` procesa **una** respuesta del modelo por llamada. No existe el concepto de "entrada del usuario que llega mientras el turno corre", y la única forma de intervenir es cancelar (INV-10).
  - `ch01:567-589`
- **Dónde:**
  - Plano **Execution**.
  - **AgentLoop** gana la decisión "cuándo se aplica una entrada pendiente". Encaja con su responsabilidad literal (continuación del turno, Article III).
  - Capítulo **CH-28 "Entradas que Llegan Durante el Turno: Steering y Follow-up"**.
- **Contratos:** nuevo **C-036 `PendingInput`**.

```pseudocode
ENUM PendingInputKind
    STEER
    FOLLOW_UP
END

ENUM PendingInputMode
    ONE_AT_A_TIME
    ALL
END

STRUCT PendingInput
    id: PendingInputId
    kind: PendingInputKind
    mode: PendingInputMode
    message: AgentMessage
    receivedAt: Timestamp
END
```

- **Regla que se aporta:**
  - Un STEER se aplica **solo** en la frontera "después de las tools, antes del modelo". Nunca cancela una tool en ejecución.
  - Un FOLLOW_UP solo se aplica cuando `runTurn` produciría COMPLETED.
- **Por qué primero:** CH-35 (esperas durables, de eve) necesita distinguir entre "respuesta a una espera" y "mensaje nuevo". Ese vocabulario se define aquí.

---

## P-A2. Compactación estructurada con punto de corte seguro

- **En pi:**
  - **Disparo:** `contextTokens > contextWindow - reserveTokens`, con `reserveTokens` 16384 y `keepRecentTokens` 20000 por defecto.
  - **Resumen:** estructurado (Goal / Constraints / Progress / Decisions / Next Steps / Critical Context) y con seguimiento acumulado de archivos.
  - **Corte:** nunca separa un tool result de su tool call. Los tool results se truncan a 2000 caracteres al serializar.
  - **Hook:** `session_before_compact` puede cancelar o aportar un resumen propio.
  - Citas: `PI/coding-agent/docs/compaction.md:32-41`, `:136`, `:202`, `:290`, `:298`.
- **Hueco en el libro:** `assembleContextSnapshot` compacta **candidato por candidato** para caber en el budget (o lo descarta). No hay resumen de la región antigua, ni punto de corte, ni garantía de mantener juntos una tool call y su resultado. Article III ya le asigna a ContextEngine "compaction, context budgets, provenance".
  - `ch04:686-765`
  - `K:286-295`
- **Dónde:**
  - Plano **Data & Context**.
  - **ContextEngine** (se amplía).
  - Capítulo **CH-29 "Compactar sin Perder el Hilo: Resúmenes Estructurados y Sesiones en Árbol"**, junto con P-A3.
- **Contratos:** nuevo **C-037 `CompactionSummary`**.

```pseudocode
STRUCT CompactionSummary
    goal: Text
    constraints: List<Text>
    progress: List<Text>
    decisions: List<Text>
    nextSteps: List<Text>
    criticalContext: List<Text>
    touchedFiles: List<Text>
    firstKeptMessageId: MessageId
    provenance: Text
END
```

- **Reglas que se aportan:**
  - **(a)** El punto de corte nunca separa una tool call de su ToolResult. Esto preserva INV-07: el resultado vuelve como observación explícita.
  - **(b)** El resumen lleva `provenance`, por EVO-09 ("context has provenance").
  - **(c)** Primero se recortan los tool results grandes sin modelo, y solo después se resume con el modelo. Esta fase la aporta eve (`repos/vercel/eve/packages/eve/src/harness/compaction.ts:198-293`).

---

## P-A3. Sesiones en árbol y resumen de rama

- **En pi:** las entradas de sesión forman un **árbol** (`id` / `parentId`), con ramificación en el mismo archivo más `/fork` y `/clone`. Al navegar a otra rama con `/tree`, se **resume la rama abandonada** para no perder contexto.
  - `PI/coding-agent/docs/session-format.md:3`, `:72-75`
  - `PI/coding-agent/docs/compaction.md:21`
- **Hueco en el libro:** SessionManager ya tiene `branchSessionFromCheckpoint`, y `SessionState` tiene `parentCheckpointId`, así que el árbol **ya está insinuado**. Pero no hay navegación entre ramas, ni noción de rama activa, ni resumen de lo abandonado.
  - `ch10:923`
  - `REG/contracts.yaml:394-407`
- **Dónde:**
  - Planos **Reliability** (SessionManager) y **Data & Context** (ContextEngine produce el resumen de rama).
  - Capítulo **CH-29**.
- **Contratos:**
  - Nuevo: **C-038 `BranchSummary`**.
  - Modificado: **C-020 `SessionState` v2**, que suma `activeCheckpointId`. No rompe nada; igual se registra en **ADR-003** junto con la v3 de eve (CH-40).
- **Aporte a P-08:** deja visible que **AgentState** (un run) y **SessionState** (historia ramificable de runs) son cosas distintas. Es el mejor ejemplo pedagógico de P-08 que el libro podría tener.

---

## P-A4. Catálogo de modelos, costo, cache y cambio de modelo registrado

- **En pi:**
  - `pi-ai` unifica muchos proveedores, con `calculateCost(model, usage)` y `cacheRetention: none | short | long` (junto con `sessionId`).
  - Cada cambio de modelo queda como entrada `model_change` en la sesión, el uso como entradas `usage`, y el modelo puede cambiar por turno (`prepareNextTurn`).
  - Citas: `PI/ai/src/models.ts:1187`, `PI/ai/src/types.ts:218`, `PI/coding-agent/docs/session-format.md:100`, `:116`, `PI/agent/src/agent-loop.ts:185`.
- **Hueco en el libro:** ModelGateway normaliza la invocación (P-02), pero no hay un contrato para el **modelo** (ventana de contexto, precio, capacidades), ni para el **uso y costo** por llamada, ni para la **política de cache**. INV-E10 exige registrar la "model config" exacta, pero no dice qué es.
  - `ch03`
  - `K:276-284`
  - `K:975-989`
- **Dónde:**
  - Plano **Execution**.
  - **ModelGateway** (se amplía).
  - Capítulo **CH-30 "El Modelo como Dato: Catálogo, Costo y Cache"**.
- **Contratos:**
  - Nuevos:
    - **C-039 `ModelDescriptor`**: `modelId`, `provider`, `contextWindow`, `maxOutputTokens`, `pricing`, `capabilities`.
    - **C-040 `UsageRecord`**: tokens de input, output, cache-read y cache-write, más `cost`.
  - Modificados:
    - **C-006 `ModelRequest` v2**, que suma `cacheRetention`.
    - **C-007 `ModelResponse` v2**, que suma `usage: UsageRecord`.
- **Aporte a P-29 (business outcomes):** sin `UsageRecord`, la correlación de negocio de CH-22 no puede hablar de costo. Con él, `BusinessOutcomeCorrelation` puede medir el **costo por resultado**.

---

## P-A5. Política de replay, resultado desconocido y memos por invocación

- **En pi (runtime durable):**
  - Cada tool declara `replay?: "never" | "safe"`.
  - Al recuperar, solo se re-ejecutan las `safe`. Las demás reciben un resultado "interrupted… **the external outcome is unknown**".
  - Cada llamada tiene un `invocationId` estable y memos durables por invocación.
  - bash es `unsafe` por defecto.
  - Citas: `PI/agent/src/types.ts:458-459`, `PI/agent/src/harness/runtime/drive/tools.ts:45`, `:538`, `PI/agent/src/harness/types.ts:95-105`.
- **Hueco en el libro:** IdempotencyGuard resuelve "¿ya se hizo este efecto con esta clave?" (PENDING/COMPLETED). Pero no dice qué hacer cuando **no se sabe** si el efecto ocurrió (crash entre la ejecución y el registro), ni lo declara la capability.
  - `ch17:927-1085`
  - `REG/contracts.yaml:343-356`
- **Dónde:**
  - Plano **Reliability**.
  - **CapabilityRegistry** declara la política, porque es un atributo de la capability.
  - **IdempotencyGuard** decide ante un resultado desconocido.
  - Capítulo **CH-31 "Cuando No se Sabe si Ocurrió: Política de Replay"**. Va **antes** de CH-34 (pasos durables de eve), que la consume.
- **Contratos:**
  - Nuevo: **C-041 `ReplayPolicy`** (ENUM NEVER / SAFE).
  - Modificados:
    - **C-018 `CapabilityDescriptor` v2**, que suma `replayPolicy: ReplayPolicy` con default **NEVER**, es decir fail-closed. Requiere **ADR-002**.
    - **C-009 `ToolResult` v2**, que suma el resultado **OUTCOME_UNKNOWN**.
- **Constitución:** propone **INV-E17** (compartido con la propuesta de eve): "an effect whose outcome is unknown is re-executed only if its capability declares `replayPolicy = SAFE`".
- **Por qué es importante:** llena el hueco que el propio eve admite: "a step interrupted mid-execution re-runs, so make non-idempotent side effects idempotent" (`repos/vercel/eve/docs/concepts/execution-model-and-durability.mdx:96`). pi lo resuelve con una declaración, no con buena voluntad.

---

## P-A6. ExtensionHost: puntos de intervención tipados y confianza de proyecto

- **En pi:**
  - **Eventos:** las extensiones registran handlers con `pi.on(...)` sobre más de 20 eventos (`project_trust`, `session_before_fork` / `_compact` / `_tree`, `context`, `before_provider_headers`, `turn_*`, `message_*`, `tool_call`, `tool_result`, `input`, …).
  - **Registro de piezas:** con `registerTool`, `registerCommand`, `registerShortcut`, `registerFlag`, `registerMessageRenderer` y `registerProvider`.
  - **Paquetes:** se instalan con `pi install npm: | git: | path`.
  - **Confianza:** los recursos del proyecto solo se cargan con una decisión de confianza persistida en `trust.json`.
  - **Hooks del runtime durable:** `before_run`, `transform_context`, `before_request`, `before_payload`, `after_response`, `before_tool`, `after_tool`, `before_compaction` y `before_navigation`.
  - Citas: `PI/coding-agent/src/core/extensions/types.ts:1370-1436`, `:1443-1621`, `PI/coding-agent/docs/packages.md:3`, `PI/coding-agent/docs/security.md:37-51`, `:65-71`, `PI/agent/src/harness/hooks.ts:102-124`.
- **Hueco en el libro:**
  - P-12 dice "events observe; hooks intervene", pero el libro solo tiene **dos** puntos de intervención: `beforeToolCall` y `afterToolCall`, dentro de ToolRuntime.
  - EVO-10 ("extensions cannot bypass constitutional boundaries") existe **sin** un componente que lo haga cumplir.
  - Citas: `K:135-137`, `K:771-773`, `ch02:717-772`.
- **Dónde:**
  - Plano **Capability & Integration**.
  - **Componente nuevo CMP-023 `ExtensionHost`.** Justificación EVO-07: ni CapabilityRegistry (resolver capabilities) ni ToolRuntime (ejecutarlas) deciden qué código de terceros puede intervenir y en qué punto.
  - Capítulo **CH-32 "Extensiones que No Pueden Saltarse la Constitución"**.
- **Ficha propuesta:**
  - `responsibility`: registrar extensiones y sus contribuciones (capabilities, hooks, proveedores, adaptadores de UI) y garantizar que cada hook se invoque solo en un **HookPoint** declarado, con un resultado limitado a lo que ese punto permite.
  - `owns`:
    - "el catálogo de HookPoints y qué puede devolver cada uno";
    - "rechazar una extensión de un recurso sin decisión de confianza".
  - `does_not_own`:
    - autorizar acciones (PolicyEngine);
    - ejecutar tools (ToolRuntime);
    - resolver capabilities (CapabilityRegistry).
  - `consumes: [C-042, C-044]`, `produces: [C-018, C-010, C-011]`.
  - `constitutional_articles: [P-07, P-12, EVO-10, INV-05, INV-06]`.
- **Contratos:** nuevos **C-042 `ExtensionRegistration`**, **C-043 `HookPoint`** (ENUM) y **C-044 `ResourceTrustDecision`**.
- **Regla clave que se aporta (INV-E24 propuesto):** **ningún HookPoint puede devolver "autorizado"**. Un hook puede *bloquear* o *transformar* dentro de su punto, pero la autorización sigue siendo de PolicyEngine (P-13, INV-06). Así EVO-10 pasa a ser verificable.

---

## P-A7. Spans de telemetría neutros

- **En pi:** `pi-telemetry` define contratos de spans **sin exportador** y sin dependencia de un backend. Cada aplicación aporta el adaptador (OpenTelemetry, Sentry, logs). Además, *"a span is diagnostic data, not business state"*: registrarlo no puede cambiar el resultado.
  - `PI/telemetry/README.md:5-13`, `:62`
- **Hueco en el libro:** hay **dos** flujos:
  - `AgentEvent` (EventBus) para consumidores desacoplados;
  - `AuditRecord` para evidencia (P-25).

  Falta el **tercero**, el diagnóstico (latencias, reintentos, spans por llamada), y hoy nada impide mezclarlo con los otros dos.
  - `ch09:859-886`
  - `ch19:430-441`
- **Dónde:**
  - Plano **Observability & Governance**.
  - Capítulo **CH-41**, junto con la audiencia de eve (E9).
- **Contratos:** nuevo **C-059 `TelemetrySpan`**.
- **Aporte pedagógico:** una tabla de tres columnas, **evento** (observa), **auditoría** (prueba) y **span** (diagnostica), con qué se puede y no se puede hacer con cada uno.

---

## P-A8. Protocolo de UI remota para HumanInteractionService

- **En pi:**
  - El mismo agente corre en TUI, `--print`, `--mode json` (eventos JSONL) y `--mode rpc` (JSONL por stdin/stdout).
  - En RPC, los diálogos de las extensiones (`select`, `confirm`, `input`, `editor`) se vuelven `extension_ui_request` / `extension_ui_response`, con timeout opcional.
  - Citas: `PI/coding-agent/docs/cli.md:24-26`, `PI/coding-agent/docs/rpc-extension-ui.md:7-10`.
- **Hueco en el libro:** INV-14 exige que la interacción humana sea independiente de la interfaz, e INV-16/INV-17 que la UI sea un adaptador. Pero el libro no muestra **ningún** protocolo concreto de adaptador.
  - `K:204-218`
  - `ch06:847-956`
- **Dónde:**
  - **Sin entidad en el registro**: es un adaptador, como el Ingress Adapter o el protocolo A2A.
  - Se propone como **anexo de CH-35** (esperas durables, de eve): el "wire protocol" de referencia por el que un adaptador remoto recibe un `HumanInteractionRequest` y devuelve una `HumanInteractionResolution`.
- **Aporte:** demuestra INV-16 ("AgentCore runs without a UI") con un caso real. El mismo runtime, con cuatro adaptadores.

---

## P-A9. Evals con lift

- **En pi:** `packages/evals` usa vitest-evals. Además de los evals de host, ejecuta **pares** `without_docs` / `with_docs` en contenedores Docker nuevos, y produce un reporte de **lift** con `observations.jsonl`.
  - `PI/evals/README.md:1-21`, `:71-107`
- **Hueco en el libro:** EvaluationHarness certifica un candidato como CERTIFIED / REJECTED / NEEDS_REVIEW a partir de `certificationSatisfied`. Pero no define **cómo** se obtiene esa evidencia; el propio libro deja la "certificación real" abierta.
  - `ch22:1148-1323`
  - `ch25:778-796`
- **Dónde:**
  - Plano **Reliability** (certificación).
  - **EvaluationHarness** (se amplía).
  - Capítulo **CH-42 "Medir el Aporte de un Cambio: Evaluación con Lift"**.
- **Contratos:**
  - Nuevo: **C-060 `LiftReport`**: `baselineRef`, `treatmentRef`, `metric`, `baselineScore`, `treatmentScore`, `lift`, `isolationRef`.
  - Modificado: **C-032 `EvaluationReport` v2**, que suma `evidence: List<LiftReport>`.
- **Aporte a P-28:** "production and evaluation are separate execution concerns". El entorno aislado de cada corrida (E5 de eve) garantiza esa separación.

---

## P-A10 y P-A11. Aportes que alimentan capítulos de la propuesta de eve

**P-A10, recuperación sin re-llamar al proveedor (entra en CH-34):** el runtime durable de pi mantiene una máquina de estados **por operación** (`starting`, `checkpoint`, `assistant.effect_pending`, `tools`, `summary.*`, …). Una llamada al modelo que quedó huérfana se **cierra con sus frames parciales ya comprometidos, sin volver a llamar al proveedor**. Esto mejora a eve, que re-ejecuta el paso interrumpido completo.
- **Propuesta:** que `StepRecord` (C-047) registre la respuesta parcial ya comprometida y que `RecoveryAction` admita cerrarla.
- Citas: `PI/agent/src/harness/session/types.ts:250-316`, `PI/agent/src/harness/runtime/drive/recovery.ts:22-60`.

**P-A11, formato de sesión versionado (entra en CH-40):** las sesiones JSONL de pi declaran su versión (v1 → v3) y se migran automáticamente al cargarlas.
- **Propuesta:** que `RuntimeVersionSnapshot` (C-056) incluya la versión del **formato** de sesión, y que SessionManager migre al reconstruir (INV-13).
- Cita: `PI/coding-agent/docs/session-format.md:26-30`.

---

## Qué **no** se propone traer de pi (y por qué)

- **La TUI y los temas:** P-11 ("UI is an adapter, not part of the core"). Se menciona solo como uno de los adaptadores de P-A8.
- **La ejecución sin aislamiento por defecto** ("Pi can read, change, and execute files with the permissions of the account that started it"): contradice Article XII, que pone el sandboxing entre las decisiones deterministas. El libro debe adoptar el default de eve (E5), no el de pi.
  - `PI/coding-agent/docs/security.md:3`
- **Los gates de aprobación como extensiones en memoria:** contradicen INV-15 más la durabilidad (P-23). El libro ya lo resuelve mejor con HumanInteractionService + ResumptionCoordinator.
- **La amplitud de proveedores como contenido del libro:** el libro enseña el **seam** (ModelGateway, P-02), no la lista de adaptadores. De pi se toma el **contrato** (`ModelDescriptor`, `UsageRecord`), no los 92 adaptadores.

---

[[BH-Propuestas]] · [[BH-Propuesta-Lecciones-eve]] · [[Eve-vs-BookHarness-vs-Pi]]
