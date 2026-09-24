---
title: eve — Arquitectura y flujos internos
type: diagramas
repo: vercel/eve
tags:
  - diagramas
  - eve
  - arquitectura
---

# eve — Arquitectura y flujos internos

[[vercel-eve]] · [[Eve-10-Flujos-Empresariales]] · [[Eve-Implementacion-Self-Hosted]]

Diagramas de **cómo funciona eve por dentro**. Cada diagrama cita la evidencia en `repos/vercel/eve/`. Los detalles de cada dimensión están en el estudio [[vercel-eve]].

---

## 1. Mapa de componentes

Qué piezas hay y cómo se conectan. La línea punteada marca la frontera de confianza: todo lo que está a la izquierda del sandbox tiene acceso a los secretos.

```mermaid
flowchart LR
  subgraph Entrada["Canales (borde)"]
    HTTP["eve HTTP<br/>/eve/v1/session"]
    SL["Slack / Teams / Discord<br/>Telegram / Twilio"]
    GH["GitHub / Linear"]
    MCP["MCP channel<br/>/eve/v1/mcp"]
    CUS["Custom channel<br/>defineChannel"]
    CRON["Schedules<br/>cron"]
  end

  subgraph App["App runtime (confiable, con secretos)"]
    AUTH["Route auth<br/>walk ordenado, fail-closed"]
    WF["Sesión durable<br/>workflowEntry: use workflow"]
    TURN["Turno<br/>runTurnSteps"]
    STEP["Paso = checkpoint<br/>turnStep: use step"]
    LOOP["Harness<br/>1 llamada al modelo por paso"]
    TOOLS["Tools + Connections<br/>MCP / OpenAPI"]
    APPR["Aprobaciones HITL"]
    COMP["Compaction"]
  end

  subgraph Ext["Servicios externos"]
    LLM["Modelo<br/>AI Gateway o provider AI SDK"]
    SVC["APIs internas / SaaS"]
    OTEL["OpenTelemetry"]
  end

  subgraph SBX["Sandbox (aislado, sin process.env)"]
    FS["/workspace + procesos"]
  end

  WORLD[("Workflow world<br/>Vercel Workflow / disco local / Postgres")]
  STREAM[["Stream NDJSON<br/>/session/:id/stream"]]

  HTTP & SL & GH & MCP & CUS & CRON --> AUTH --> WF --> TURN --> STEP --> LOOP
  LOOP --> LLM
  LOOP --> COMP
  LOOP --> APPR --> TOOLS
  TOOLS --> SVC
  TOOLS -. bash / read_file / write_file .-> FS
  STEP <--> WORLD
  LOOP --> STREAM
  LOOP --> OTEL
```

**Evidencia:**
- `repos/vercel/eve/docs/concepts/security-model.md:8-20`: fronteras de confianza.
- `repos/vercel/eve/packages/eve/src/execution/session/entry.ts:48-49`: `workflowEntry`.
- `repos/vercel/eve/packages/eve/src/execution/session/turn-step.ts:125-126`: `turnStep`.
- `repos/vercel/eve/docs/channels/overview.mdx:133-150`: catálogo de canales.

---

## 2. Ciclo de vida de una solicitud HTTP

Camino completo desde `POST /eve/v1/session` hasta la respuesta en el stream.

```mermaid
sequenceDiagram
  autonumber
  actor U as Cliente
  participant CH as eveChannel
  participant AU as Route auth
  participant WF as Sesión durable
  participant ST as turnStep
  participant H as Harness
  participant M as Modelo
  participant T as Tool
  participant S as Stream NDJSON

  U->>CH: POST /eve/v1/session con message
  CH->>AU: routeAuth(request, auth)
  AU-->>CH: SessionAuthContext o 401
  CH->>WF: createSession modo conversation
  CH-->>U: 200 sessionId, status accepted
  U->>S: GET /session/:id/stream
  WF->>S: session.started, turn.started
  loop Mientras haya tool calls
    WF->>ST: turnStep = checkpoint
    ST->>H: ejecutar paso
    H->>H: maybeCompact
    H->>M: 1 llamada streamText
    M-->>H: texto y/o tool calls
    H->>S: message.appended, actions.requested
    H->>T: execute(input, ctx)
    T-->>H: resultado o error como dato
    H->>S: action.result
    ST-->>WF: DurableSession persistido
  end
  H->>S: message.completed
  WF->>S: turn.completed, session.waiting
```

**Evidencia:**
- `repos/vercel/eve/packages/eve/src/eve-channel/index.ts:150-152`: la auth corre antes de `createSession`.
- `repos/vercel/eve/packages/eve/src/harness/tool-loop.ts:1617`: `ToolLoopAgent`, una llamada por paso.
- `repos/vercel/eve/packages/eve/src/harness/tool-loop.ts:2883-2894`: decide si continuar o terminar.
- `repos/vercel/eve/packages/eve/src/protocol/message.ts:181`: catálogo de eventos.

---

## 3. Sesión → turno → paso

La jerarquía de trabajo y los estados por los que pasa una sesión.

```mermaid
stateDiagram-v2
  [*] --> Creada: POST /session
  Creada --> EnTurno: llega un mensaje
  state EnTurno {
    [*] --> Paso
    Paso --> Paso: hubo tool calls
    Paso --> Aparcado: aprobación / pregunta / OAuth / límite
    Aparcado --> Paso: inputResponses o callback
    Paso --> [*]: sin tool calls o final_output
  }
  EnTurno --> Esperando: turn.completed
  Esperando --> EnTurno: follow-up por ID o canal
  EnTurno --> EnTurno: steering antes del output
  Esperando --> Terminada: reset o sessionTimeoutMs de 30 días
  EnTurno --> Fallida: error terminal
  Terminada --> [*]
  Fallida --> [*]
```

**Evidencia:**
- `repos/vercel/eve/docs/concepts/execution-model-and-durability.mdx:10-16`: niveles sesión / turno / paso.
- `repos/vercel/eve/packages/eve/src/execution/session/turn.ts:82-85`: loop del turno.
- `repos/vercel/eve/packages/eve/src/execution/session/timeout.ts:2`: timeout de 30 días.

---

## 4. Durabilidad: qué pasa si el proceso muere

Solo se re-ejecuta el paso que se interrumpió. Los pasos completados se reproducen desde su resultado grabado.

```mermaid
sequenceDiagram
  autonumber
  participant WF as Workflow world
  participant P1 as Proceso A
  participant P2 as Proceso B
  participant S as Stream

  P1->>WF: paso 1 completado y grabado
  P1->>WF: paso 2 completado y grabado
  P1-xP1: crash o redeploy durante el paso 3
  P2->>WF: reanuda la sesión
  WF-->>P2: replay pasos 1 y 2 sin re-ejecutar
  P2->>P2: re-ejecuta el paso 3 completo
  P2->>S: eventos del paso 3 con ids nuevos
  Note over P2,S: el consumidor ve ambos intentos del paso 3.<br/>Los efectos no idempotentes deben ser idempotentes o pasar por aprobación
```

**Evidencia:**
- `repos/vercel/eve/docs/concepts/execution-model-and-durability.mdx:94-96`: resume after crash.

---

## 5. Decisión de compactación

Qué ocurre antes de cada llamada al modelo.

```mermaid
flowchart TD
  A["Antes de cada llamada al modelo"] --> B{"tokens estimados ><br/>90% de la ventana<br/>o 100k si es desconocida"}
  B -- No --> Z["Llamar al modelo"]
  B -- Sí --> C["Fase 1 sin modelo:<br/>recortar tool results grandes<br/>de la región antigua"]
  C --> D{"¿Suficiente?"}
  D -- Sí --> Z
  D -- No --> E["Fase 2: resumir la región antigua<br/>con generateText"]
  E --> F["Historial = checkpoint + resumen<br/>+ últimos 10 mensajes literales"]
  F --> G{"¿Sigue excedido?"}
  G -- No --> Z
  G -- Sí --> H["Cola a solo texto,<br/>luego achicar la ventana"] --> Z
```

**Evidencia:**
- `repos/vercel/eve/packages/eve/src/execution/session.ts:12-14`: umbral y ventana.
- `repos/vercel/eve/packages/eve/src/harness/compaction.ts:198-293`: algoritmo.

---

## 6. Resolución de auth de entrada

Cómo se decide quién es el llamante.

```mermaid
flowchart TD
  R["Request entrante"] --> IP{"¿IP permitida?<br/>createIpAllowList opcional"}
  IP -- No --> X["Descartado"]
  IP -- Sí --> A1["AuthFn 1, p.ej. tu OIDC"]
  A1 -- "SessionAuthContext" --> OK["Aceptado:<br/>ctx.session.auth.current"]
  A1 -- "null: no reconoce" --> A2["AuthFn 2, p.ej. jwtEcdsa"]
  A1 -- "throw" --> E["401 / 403 específico"]
  A2 -- "SessionAuthContext" --> OK
  A2 -- "null" --> A3["localDev: solo en eve dev"]
  A3 -- "null en producción" --> D["401 + WWW-Authenticate"]
  OK --> TOOLS["Tools usan principalId / tenantId<br/>para credenciales y permisos"]
```

**Evidencia:**
- `repos/vercel/eve/packages/eve/src/public/channels/auth.ts:702-735`: `routeAuth`.
- `repos/vercel/eve/docs/guides/auth-and-route-protection.md:37-45`: el walk.
- `repos/vercel/eve/docs/guides/auth-and-route-protection.md:201-203`: allow-list de IPs.

---

## 7. Topologías de despliegue

```mermaid
flowchart TB
  subgraph V["Vercel"]
    V1["eve link + eve deploy"] --> V2["Vercel Functions<br/>rutas /eve/v1"]
    V2 --> V3[("Vercel Workflow")]
    V2 --> V4["Vercel Sandbox<br/>microVM"]
    V5["Vercel Cron"] --> V2
    V2 --> V6["Agent Runs / observabilidad"]
  end
  subgraph SH["Self-hosted"]
    S1["eve build + eve start"] --> S2["Servidor Nitro Node<br/>contenedor"]
    PX["Reverse proxy / ingress<br/>/eve/ y /.well-known/workflow/"] --> S2
    S2 --> S3[("World: disco .eve/.workflow-data<br/>o @workflow/world-postgres")]
    S2 --> S4["Sandbox: Docker / microsandbox<br/>/ provider propio"]
    S2 --> S5["Runner de schedules Nitro"]
    S2 --> S6["OTel a tu backend"]
  end
```

**Evidencia:**
- `repos/vercel/eve/docs/guides/deployment/overview.md:12-15`: estrategias.
- `repos/vercel/eve/docs/guides/deployment/self-hosting.md:57-62`: prefijos del proxy.
- `repos/vercel/eve/docs/guides/deployment/vercel.mdx:131-136`: servicios de Vercel.

---

[[vercel-eve]] · [[Matriz-Comparativa]]
