---
title: eve — 10 flujos empresariales
type: diagramas
repo: vercel/eve
tags:
  - diagramas
  - eve
  - empresa
---

# eve — 10 flujos empresariales

[[vercel-eve]] · [[Eve-Arquitectura-y-Flujos]] · [[Eve-Implementacion-Self-Hosted]]

Los diez patrones de uso empresarial más comunes con eve. Cada uno trae:
- un **diagrama de secuencia numerado**;
- un **paso a paso** cuyos números coinciden con los del diagrama;
- **qué archivos configurar**;
- **puntos de control** (los fallos típicos).

Los flujos se pueden combinar. Por ejemplo, el 2 (Slack) casi siempre incluye el 3 (aprobación) y el 9 (multi-tenant).

| # | Flujo | Canal / mecanismo | Caso típico |
| --- | --- | --- | --- |
| 1 | Chat web interno con SSO | eve HTTP + `useEveAgent` + `oidc()` | Asistente de RR.HH., soporte interno |
| 2 | Asistente en Slack / Teams | Canal de plataforma | Mesa de ayuda IT, consultas de ventas |
| 3 | Aprobación humana de una acción sensible | `approval` + HITL | Reembolsos, altas de usuarios, cambios en producción |
| 4 | OAuth por usuario a un sistema externo | `defineInteractiveAuthorization` | Actuar en CRM o Jira como el usuario |
| 5 | Integración backend a backend | `eve/client` + `operationId` + `outputSchema` | Clasificar tickets o facturas desde un ERP |
| 6 | Reporte programado | `defineSchedule` + subagentes | Resumen diario de ventas o incidentes |
| 7 | Agente como servicio MCP | Canal MCP | Exponer el agente a otros agentes o IDEs |
| 8 | Router multi-agente por dominio | `defineRemoteAgent` | Un agente frontal que delega a Finanzas, Legal e IT |
| 9 | Multi-tenant seguro | `tenantId` en la auth + credenciales por tenant | SaaS B2B, holding con varias empresas |
| 10 | Recuperación ante fallos y redeploys | Workflow durable | Continuidad operacional |

---

## Flujo 1 — Chat web interno con SSO corporativo

**Objetivo:** que los empleados conversen con el agente desde una web interna usando su login corporativo (Entra ID, Okta, Keycloak).

```mermaid
sequenceDiagram
  autonumber
  actor E as Empleado
  participant IDP as IdP corporativo
  participant W as Web app con useEveAgent
  participant CH as eveChannel
  participant AG as Sesión eve
  participant S as Stream NDJSON

  E->>W: Abre la intranet
  W->>IDP: Login OIDC
  IDP-->>W: access token JWT
  E->>W: Escribe una pregunta
  W->>CH: POST /eve/v1/session con Bearer token
  CH->>CH: auth: oidc verifica issuer, audience y firma
  CH->>AG: crea sesión con principal user
  CH-->>W: sessionId
  W->>S: GET /session/:id/stream
  AG-->>S: message.appended en deltas
  S-->>W: el reducer arma el mensaje
  W-->>E: Respuesta en streaming
  E->>W: Pregunta de seguimiento
  W->>CH: POST /eve/v1/session/:id
```

**Paso a paso:**
- **1-3.** La web autentica al empleado con tu IdP y obtiene un JWT. Esto no es parte de eve.
- **4-5.** `useEveAgent` envía el mensaje con `Authorization: Bearer <token>`.
- **6.** `agent/channels/eve.ts` verifica el token: `eveChannel({ auth: [oidc({ issuer, audiences, discoveryUrl }), localDev()] })`.
- **7-8.** Se crea la sesión; `principalId` y los atributos (email, depto) quedan en `ctx.session.auth`.
- **9-12.** La UI consume el stream NDJSON; el reducer de `useEveAgent` convierte los eventos en mensajes.
- **13-14.** El seguimiento va a la misma sesión por su ID, con historial durable.

**Configurar:**
- `agent/channels/eve.ts` (auth + `cors` si la web está en otro origen);
- `useEveAgent({ host })` en el frontend.

**Puntos de control:**
- Quita `placeholderAuth()` antes de producción.
- La route auth **no** verifica que el sesión-ID pertenezca a ese usuario. Guarda el mapeo usuario→sesión en tu app (o en un proxy delante de eve), o compara `ctx.session.auth.initiator` con `auth.current` dentro de las tools sensibles.
- `audience` pasa a `private` para usuarios autenticados, así que las trazas no capturan contenido por defecto.

**Evidencia:**
- `repos/vercel/eve/docs/guides/auth-and-route-protection.md:86-99`: verificadores.
- `repos/vercel/eve/docs/channels/eve.mdx:136-157`: CORS.
- `repos/vercel/eve/docs/guides/auth-and-route-protection.md:267`: sin control de propiedad de sesión.
- `repos/vercel/eve/packages/eve/src/react/use-eve-agent.ts:136`: `useEveAgent`.

---

## Flujo 2 — Asistente en Slack o Microsoft Teams

**Objetivo:** que los usuarios mencionen al agente en un canal o DM y reciban la respuesta en el mismo hilo.

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuario en Slack
  participant SL as Slack
  participant CH as slackChannel /eve/v1/slack
  participant AG as Sesión eve del hilo
  participant T as Tools

  U->>SL: @agente ¿estado del pedido 4213?
  SL->>CH: Event API firmado con HMAC
  CH->>CH: verifica la firma en tiempo constante
  CH->>CH: principal user = usuario de Slack
  CH->>AG: resume la sesión de la dirección del hilo o crea una
  AG->>T: consultar_pedido
  T-->>AG: resultado
  AG-->>CH: evento de respuesta
  CH->>SL: chat.postMessage en el hilo
  SL-->>U: Respuesta
  U->>SL: responde en el hilo
  SL->>CH: nuevo evento, misma dirección
  CH->>AG: mismo turno si es steering o turno nuevo
```

**Paso a paso:**
- **1-2.** Slack envía el evento a `https://tu-agente/eve/v1/slack`.
- **3.** El canal verifica `SLACK_SIGNING_SECRET` y rechaza firmas inválidas antes de que lleguen a la sesión.
- **4.** Los canales de plataforma adjuntan un **principal user** del remitente, así que ya sirve para OAuth por usuario (flujo 4).
- **5.** La "dirección" del hilo mapea a una sesión durable: cada hilo es una conversación.
- **6-10.** El agente ejecuta y el canal publica en el hilo. Las aprobaciones HITL aparecen como botones.
- **11-13.** Las respuestas en el hilo continúan la misma sesión.

**Configurar:**
- `eve add channel/slack`;
- fuera de Vercel, usa "portable credentials": `SLACK_BOT_TOKEN` y `SLACK_SIGNING_SECRET`;
- scopes `app_mentions:read`, `chat:write` e `im:history`;
- Request URL `/eve/v1/slack` para eventos, interactividad y slash commands.

Teams funciona igual: Bot Framework Activity y Adaptive Cards para HITL.

**Puntos de control:**
- La URL pública debe ser accesible desde Slack.
- Incluye en las instrucciones el aviso de que el usuario habla con una IA, si la ley lo exige.

**Evidencia:**
- `repos/vercel/eve/docs/channels/slack.mdx:50-63`: credenciales propias.
- `repos/vercel/eve/docs/concepts/security-model.md:60-72`: verificación de firma.
- `repos/vercel/eve/docs/guides/auth-and-route-protection.md:318`: principal user en canales de plataforma.
- `repos/vercel/eve/docs/channels/teams.mdx:82`: HITL en Teams.

---

## Flujo 3 — Aprobación humana de una acción sensible

**Objetivo:** que ninguna acción irreversible (reembolso, alta de usuario, deploy) se ejecute sin que una persona autorizada la apruebe.

```mermaid
sequenceDiagram
  autonumber
  actor U as Solicitante
  actor A as Aprobador
  participant AG as Sesión eve
  participant P as Política de approval
  participant T as Tool refund_charge
  participant S as Stream / canal

  U->>AG: Reembolsa 1.500 USD al cliente X
  AG->>AG: el modelo propone refund_charge
  AG->>P: approval con toolInput y session
  P-->>AG: user-approval porque monto > 1000
  AG->>S: input.requested kind tool-approval
  AG->>AG: session.waiting, turno aparcado sin cómputo
  Note over AG: puede esperar horas o días y sobrevive a reinicios
  S-->>A: Botones Aprobar / Rechazar
  A->>S: Aprobar
  S->>AG: inputResponses requestId + approve
  AG->>P: política response: ¿el aprobador está autorizado?
  P-->>AG: ok
  AG->>T: execute
  T-->>AG: refund ok
  AG->>S: approval.settled, action.result, respuesta
```

**Paso a paso:**
- **1-2.** El modelo decide llamar a la tool.
- **3-4.** Tu política decide: `approved`, `denied`, `user-approval` o `not-applicable`. **El modelo no autoriza.**
- **5-7.** eve emite `input.requested` y el turno queda en pausa de forma durable.
- **8-10.** El canal muestra los botones (Slack, Teams) o tu UI lee `inputResponses`.
- **11-12.** La política `response` valida **quién** respondió. Sin ella, la aprobación falla cerrada.
- **13-15.** Se ejecuta la tool y el turno continúa exactamente donde estaba.

**Configurar:** `approval` en la tool.

```ts
approval: ({ session, toolInput }) =>
  (toolInput?.amount ?? 0) > 1000 ? "user-approval" : "not-applicable"
```

Si no, usa `always()`, `once()` o `auto()` (con modelo evaluador).

**Puntos de control:**
- Si omites `approval`, equivale a `never()`: la tool se ejecuta sin preguntar.
- Un texto no relacionado **no** cuenta como rechazo; la aprobación sigue pendiente.
- `auto()` envía el input de la tool a un proveedor de evaluación externo. Revisa si eso es aceptable con tus datos.

**Evidencia:**
- `repos/vercel/eve/docs/tools/human-in-the-loop.md:14-83`: approvals.
- `repos/vercel/eve/docs/tools/human-in-the-loop.md:170-190`: pausa y reanudación.
- `repos/vercel/eve/packages/eve/src/harness/approval-delivery-coordinator.ts:368-377`: sin política de respuesta falla cerrada.

---

## Flujo 4 — OAuth por usuario a un sistema externo

**Objetivo:** que el agente actúe en el CRM, Jira o Salesforce **como el usuario**, con los permisos de ese usuario, sin compartir una cuenta de servicio.

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuario
  participant AG as Sesión eve
  participant T as Tool / Connection
  participant OA as defineInteractiveAuthorization
  participant IDP as OAuth del sistema externo
  participant API as API externa

  U->>AG: Crea un ticket en Jira con esto
  AG->>T: execute
  T->>OA: ctx.getToken: ¿hay token de este usuario?
  OA-->>T: no hay token
  T-->>AG: autorización requerida
  AG-->>U: authorization.required con URL de consentimiento
  AG->>AG: turno aparcado de forma durable
  U->>IDP: Inicia sesión y consiente
  IDP->>OA: redirect al callback URL generado por eve
  OA->>OA: completeAuthorization intercambia el code por un token
  OA-->>AG: authorization.completed, resume
  AG->>T: reintenta execute
  T->>API: Bearer token del usuario
  API-->>T: ticket creado
  T-->>AG: resultado
  AG-->>U: Listo, JIRA-812
```

**Paso a paso:**
- **1-5.** La tool pide el token del usuario actual; `principalType` debe ser `user`.
- **6-7.** eve emite `authorization.required` y aparca el turno.
- **8-11.** El usuario consiente. El proveedor redirige al callback que generó eve, y tu código intercambia el code por el token.
- **12-16.** La tool se reintenta con el token. El modelo **nunca** ve el token.

**Configurar:**
- En Vercel: `connect("jira/miagente")` con Vercel Connect.
- **Fuera de Vercel:** `defineInteractiveAuthorization` con `startAuthorization` y `completeAuthorization`, más **tu propio almacenamiento cifrado de tokens y refresh**.

**Puntos de control:**
- La sesión debe tener un principal user verificado (flujo 1 o 2). Las sesiones anónimas o de servicio fallan de inmediato.
- Si recibes un 401 aguas abajo, llama a `ctx.requireAuth(provider)` para re-autorizar.

**Evidencia:**
- `repos/vercel/eve/docs/connections/overview.mdx:236-270`: OAuth self-hosted.
- `repos/vercel/eve/docs/guides/auth-and-route-protection.md:273`: requiere principal user.
- `repos/vercel/eve/docs/connections/overview.mdx:206`: `authorization.required` y resume.

---

## Flujo 5 — Integración backend a backend (ERP, CRM, colas)

**Objetivo:** que un sistema interno envíe trabajo al agente y reciba un resultado **estructurado**, con reintentos seguros.

```mermaid
sequenceDiagram
  autonumber
  participant ERP as Job del ERP
  participant C as eve/client
  participant CH as eveChannel
  participant AG as Sesión eve
  participant DB as Sistema del ERP

  ERP->>C: nueva factura 4213
  C->>CH: POST /session con message, operationId factura-4213 y outputSchema
  CH->>CH: auth de servicio con jwtEcdsa o Basic
  CH->>AG: crea la sesión, una sola vez por operationId
  CH-->>C: sessionId
  Note over C,CH: si el POST se reintenta con el mismo operationId<br/>devuelve la misma sesión, no la duplica
  C->>CH: stream o response.result
  AG->>AG: extrae, valida y clasifica
  AG-->>C: resultado JSON validado contra el schema
  C->>DB: guarda categoría, monto y riesgo
```

**Paso a paso:**
- **1-2.** Usa `client.sessions.create({ message, ... })`. `operationId` da semántica create-once para el principal autenticado.
- **3.** La auth de servicio devuelve un principal `service` (`httpBasic`, `jwtHmac` o `jwtEcdsa`).
- **4-7.** Los reintentos no duplican el trabajo.
- **8-9.** `outputSchema` fuerza una salida estructurada que tu backend consume sin parsear texto.
- **10.** Tu sistema persiste el resultado.

**Configurar:**
- Un `Client` con `auth: { bearer: async () => token }` y `redirect: "manual"`.
- Un authenticator de servicio en `channels/eve.ts`.

**Puntos de control:**
- `operationId` no funciona con llamantes anónimos.
- Varios requests simultáneos pueden devolver candidatos distintos; reintenta para obtener el ID canónico.

**Evidencia:**
- `repos/vercel/eve/docs/channels/eve.mdx:64-79`: `operationId`.
- `repos/vercel/eve/docs/guides/client/overview.mdx:48-102`: auth del cliente.
- `repos/vercel/eve/docs/guides/client/output-schema.mdx`: salida estructurada.

---

## Flujo 6 — Reporte programado con subagentes

**Objetivo:** que cada mañana el agente recolecte datos de varias fuentes en paralelo y publique un resumen.

```mermaid
sequenceDiagram
  autonumber
  participant CR as Runner de schedules Nitro
  participant SC as schedules/daily.ts
  participant AG as Sesión en modo task
  participant SA1 as Subagente ventas
  participant SA2 as Subagente soporte
  participant SL as Canal Slack

  CR->>SC: cron 0 12 * * 1-5 en UTC
  SC->>AG: to canal, send Prepara el reporte, con appAuth
  AG->>SA1: delegar en background
  AG->>SA2: delegar en background
  Note over AG: taskDeliveryPolicy cohort por defecto en schedules
  SA1-->>AG: resultado ventas
  SA2-->>AG: resultado soporte
  AG->>AG: el cohort completo despierta al padre una vez
  AG->>SL: publica el resumen consolidado
```

**Paso a paso:**
- **1.** El cron es de 5 campos, en UTC. En self-hosting lo dispara el runner de Nitro que arranca `eve start`.
- **2.** La forma `markdown` es un prompt que se dispara y se olvida. La forma `run` es un handler con `to(...)` y `appAuth`.
- **3-6.** Los subagentes corren en paralelo, cada uno con su propio contexto. El presupuesto de tokens se reparte entre ellos.
- **7-8.** Con `cohort`, el padre recibe todos los resultados juntos y publica una sola vez.

**Configurar:**
- `agent/schedules/daily.ts`;
- `agent/subagents/ventas/agent.ts` y `agent/subagents/soporte/agent.ts`.

**Puntos de control:**
- Un host propio que solo sirve HTTP no dispara los crons: hay que llamarlos desde un scheduler externo.
- Con varias réplicas, verifica que el cron no se dispare más de una vez. **La doc no lo aclara; es inferencia.**
- Considera `approval` para los turnos que dispara un schedule.

**Evidencia:**
- `repos/vercel/eve/docs/schedules.mdx:10-33`: `defineSchedule`.
- `repos/vercel/eve/docs/schedules.mdx:150-156`: hosts propios.
- `repos/vercel/eve/packages/eve/src/tasks/delivery-policy.ts:35-58`: `auto` / `cohort`.
- `repos/vercel/eve/packages/eve/src/subagents/token-budget.ts:18-38`: reparto del presupuesto.

---

## Flujo 7 — Agente expuesto como servidor MCP

**Objetivo:** que otras herramientas (Claude, IDEs, otros agentes) deleguen trabajo durable a tu agente vía MCP.

```mermaid
sequenceDiagram
  autonumber
  participant CL as Cliente MCP
  participant MCP as mcpChannel /eve/v1/mcp
  participant AG as Sesión en modo task

  CL->>MCP: initialize, recibe instructions y 4 tools
  CL->>MCP: agent_start con message y outputSchema
  MCP->>MCP: auth en cada operación
  MCP->>AG: crea la invocación durable
  MCP-->>CL: invocationId
  loop Polling respetando pollAfterMs
    CL->>MCP: agent_get invocationId
    MCP-->>CL: status working
  end
  MCP-->>CL: status input_required con inputRequests
  CL->>MCP: agent_update con responses
  CL->>MCP: agent_get
  MCP-->>CL: status completed con result
```

**Paso a paso:**
- **1.** El servidor anuncia `agent_start`, `agent_get`, `agent_update` y `agent_cancel`, junto con instrucciones del protocolo.
- **2-5.** Una vez que `agent_start` responde, el trabajo es durable: aunque se corte la conexión, **no se cancela**.
- **6-8.** El cliente consulta el estado con polling.
- **9-12.** Si hace falta input humano, se envía el batch completo de respuestas.

**Configurar:** `agent/channels/mcp.ts` con `mcpChannel({ auth: ... })`. La auth es obligatoria incluso en desarrollo.

**Puntos de control:**
- `agent_start` **no es idempotente**: si se pierde la respuesta, reintentar crea una segunda tarea.
- Con auth, cada invocación pertenece al principal que la creó.
- Con `none()`, el `invocationId` funciona como capability: no lo pongas en logs.

**Evidencia:**
- `repos/vercel/eve/docs/channels/mcp.mdx:165-218`: invocación, durabilidad y propiedad.

---

## Flujo 8 — Router multi-agente por dominio

**Objetivo:** que un agente frontal atienda al usuario y delegue a agentes especialistas (Finanzas, Legal, IT), cada uno desplegado y gobernado por su propio equipo.

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuario
  participant R as Agente router
  participant F as Agente Finanzas remoto
  participant L as Agente Legal remoto

  U->>R: ¿Podemos pagar la factura X y el contrato lo permite?
  R->>F: POST /eve/v1/session con callback URL y auth de servicio
  F-->>R: working, taskId
  R->>L: POST /eve/v1/session con callback URL
  L-->>R: working, taskId
  Note over R: forwardPrincipal opcional, validado por trustedForwarders del receptor
  F->>R: callback de resultado
  L->>R: callback de resultado
  R->>R: subagent.completed x2
  R-->>U: Respuesta combinada
  Note over R,L: cuando termina la sesión padre se envía reset a cada hijo remoto
```

**Paso a paso:**
- **1-5.** Para el modelo, cada agente remoto es una tool más. eve inicia una sesión en el remoto y le pasa una URL de callback.
- **6.** Si `forwardPrincipal: true`, el remoto ve al usuario original, pero **solo** si su `trustedForwarders` acepta al router.
- **7-9.** Los resultados llegan por callbacks durables.
- **10-11.** Al cerrar la sesión padre, eve limpia las sesiones hijas.

**Configurar:**
- En el router: `agent/subagents/finanzas/agent.ts` con `defineRemoteAgent({ url, auth, headers })`.
- En cada especialista: `channels/eve.ts` con auth que acepte al router y `trustedForwarders`.

**Puntos de control:**
- Fuera de Vercel no hay OIDC entre deploys. Usa JWT de servicio o headers.
- El transporte por defecto entre agentes del mismo workspace requiere Vercel; hay que configurar un `transport` explícito.

**Evidencia:**
- `repos/vercel/eve/docs/guides/remote-agents.md:185-201`: dispatch y callbacks.
- `repos/vercel/eve/docs/guides/auth-and-route-protection.md:224-246`: `trustedForwarders`.
- `repos/vercel/eve/docs/subagents/index.mdx:126-141`: transporte explícito.

---

## Flujo 9 — Multi-tenant seguro

**Objetivo:** que un solo agente sirva a varias empresas o unidades de negocio sin mezclar datos, credenciales ni memoria.

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuario del tenant ACME
  participant CH as Route auth
  participant AG as Sesión eve
  participant TL as Tool
  participant VA as Vault de credenciales
  participant API as API del tenant
  participant MEM as Memoria

  U->>CH: request con JWT que incluye tenantId acme
  CH->>AG: principal user con attributes.tenantId acme
  AG->>MEM: recall con scope del tenant y usuario
  AG->>TL: execute
  TL->>TL: requireTenantCaller lee el tenant de ctx, NO del prompt
  TL->>VA: credencial de acme
  VA-->>TL: token de acme
  TL->>API: llamada con el token de acme
  API-->>TL: datos de acme
  TL-->>AG: resultado sin credenciales
```

**Paso a paso:**
- **1-2.** El `tenantId` sale **solo** de la auth verificada, nunca del prompt, de argumentos de tools ni de respuestas de APIs.
- **3.** La memoria se asocia al scope del tenant y del usuario.
- **4-8.** La tool elige la credencial del tenant a partir de `ctx`. Las connections MCP y OpenAPI aceptan `auth` como función asíncrona de `ctx`.
- **9.** El modelo nunca ve las credenciales.

**Configurar:**
- Un `AuthFn` que devuelva `attributes.tenantId`;
- un helper `requireTenantCaller(ctx)`;
- `auth: async (ctx) => ...` en las connections;
- políticas de approval por tenant.

**Puntos de control:**
- Esta es **la brecha principal**: eve no aplica propiedad de sesión. Si un usuario de otro tenant conoce un `sessionId`, la route auth lo deja pasar. Controla el mapeo sesión→usuario/tenant en tu app o en un proxy delante de eve, y en las tools sensibles compara `ctx.session.auth.initiator` con `auth.current`.

**Evidencia:**
- `repos/vercel/eve/docs/patterns/multi-tenant-auth.md:14-37`: el tenant sale de la auth.
- `repos/vercel/eve/docs/patterns/multi-tenant-memory.md:14`: memoria con scope del tenant.
- `repos/vercel/eve/docs/patterns/multi-tenant-approvals.md:19`: aprobaciones por tenant.
- `repos/vercel/eve/docs/guides/auth-and-route-protection.md:256-267`: `initiator` / `current` y sin ACL.

---

## Flujo 10 — Recuperación ante fallos y redeploys

**Objetivo:** que un corte o un deploy no pierda las conversaciones ni duplique acciones.

```mermaid
sequenceDiagram
  autonumber
  participant OPS as Operaciones
  participant P1 as Versión 1
  participant W as Workflow world
  participant P2 as Versión 2
  actor U as Usuario

  P1->>W: paso 1 y paso 2 grabados
  OPS->>P1: deploy o crash durante el paso 3
  P2->>W: reanuda la sesión
  W-->>P2: replay de los pasos 1 y 2
  P2->>P2: re-ejecuta el paso 3
  P2-->>U: el turno termina normalmente
  Note over P2: aprobaciones y OAuth aparcados siguen esperando sin cómputo
  U->>P2: nuevo mensaje en la sesión inactiva
  Note over P1,P2: en Vercel, una sesión inactiva pasa al deploy nuevo<br/>con su modelo, tools e instrucciones actuales.<br/>El trabajo en curso no se mueve de deploy
```

**Paso a paso:**
- **1-5.** Los pasos completados no se re-ejecutan. El paso interrumpido sí, **completo**.
- **6-7.** Las esperas largas (aprobaciones, OAuth) sobreviven porque no retienen cómputo.
- **8.** El handoff de sesiones inactivas al deploy nuevo está documentado **para Vercel producción**. En self-hosting, la reanudación depende de que el world persistido sea compartido o sobreviva al reemplazo del contenedor.

**Configurar:**
- En self-hosting, un volumen persistente para `.eve/.workflow-data` o `@workflow/world-postgres`;
- tools con efectos idempotentes (clave de idempotencia hacia la API) o con `approval: always()`.

**Puntos de control:**
- Un consumidor del stream ve ambos intentos del paso re-ejecutado, con ids distintos.
- No hay rollback transparente al modelo de ejecución anterior.

**Evidencia:**
- `repos/vercel/eve/docs/concepts/execution-model-and-durability.mdx:26-30`: handoff.
- `repos/vercel/eve/docs/concepts/execution-model-and-durability.mdx:94-116`: resume y parked work.
- `repos/vercel/eve/docs/guides/deployment/self-hosting.md:27-29`: persistir el world.

---

[[vercel-eve]] · [[Eve-Implementacion-Self-Hosted]] · [[Matriz-Comparativa]]
