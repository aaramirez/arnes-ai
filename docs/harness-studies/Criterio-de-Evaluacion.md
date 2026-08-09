# Criterio de Evaluación de Harnesses

Marco de estudio **homogéneo** para analizar los harnesses de referencia uno por uno y compararlos "peras con peras". Este documento es la **única fuente de las dimensiones y preguntas** — la [[Plantilla-Estudio-Harness]] no repite las guías, solo estructura las respuestas.

## Escala de observación

Por cada dimensión, el estudio responde *qué hace, cómo, con qué evidencia* y lo resume con un marcador:

| Marcador | Significado |
| --- | --- |
| ✔ | presente y bien resuelto |
| ◐ | presente pero parcial, simple o limitado |
| ✖ | ausente |
| n/a | no aplica a esta categoría (ej. un repo de recursos/workflows) |

Evaluación **descriptiva, no un ranking**: el marcador resume presencia/calidad sin puntuación numérica arbitraria.

## Las 16 dimensiones

### Bloque A — Identidad

#### 1. Ficha
Qué observar: categoría (harness completo / CLI / librería / recursos-workflows), propósito declarado, para quién, lenguaje principal, madurez, licencia, por qué lo construyeron. Datos objetivos, sin análisis.

#### 2. Estructura del repo
Qué observar: layout de directorios, tamaño, dónde vive el "core", convención de módulos/paquetes.

### Bloque B — Arquitectura

#### 3. Capas y componentes
Qué observar: separación en capas (modelo / runtime / app / UI), componentes identificables y sus boundaries, cómo se relacionan.

#### 4. Flujo end-to-end
Qué observar: camino de una solicitud — input → ensamblado de contexto → llamada al modelo → tool calls → ejecución → observación → respuesta final.

#### 5. Contratos internos
Qué observar: interfaces clave (Provider / Tool / Message / Compactor / ...), quién conoce a quién, grado de desacoplamiento, formato de mensajes interno.

### Bloque C — Núcleo del runtime

#### 6. Agent loop
Qué observar: ciclo de turnos, condiciones de parada (no tool calls, max turns, max steps), manejo de errores, streaming, respuestas finales.

#### 7. Mensajes y contexto
Qué observar: tipos de bloques/mensajes, roles, ensamblaje del system prompt, contexto por proyecto/agente, memoria y persistencia de sesiones.

#### 8. Provider seam
Qué observar: interfaz de proveedor de modelo, adaptadores soportados, contabilidad de uso/costo, cache, streaming.

#### 9. Tool runtime
Qué observar: interfaz de herramienta, registro/descubrimiento, schemas, tools incluidas, errores como datos, ejecución paralela/secuencial.

### Bloque D — Gobernanza

#### 10. Permisos y seguridad
Qué observar: approval gates, diffs, sandbox, políticas, clasificación de riesgo, quién autoriza (¿el modelo o el harness?).

#### 11. Compaction / gestión de contexto
Qué observar: estrategias de compactación/summarization, umbrales, safe split, gestión del presupuesto de contexto.

#### 12. Subagentes / orquestación
Qué observar: delegación a subagentes, contexto propio, seguimiento, comunicación entre agentes, límites.

### Bloque E — Extensibilidad, UX y síntesis

#### 13. UI / presentación
Qué observar: REPL/TUI/CLI, eventos que alimentan la UI, modales, spinners, presentación de resultados.

#### 14. Configuración y extensibilidad
Qué observar: config files, slash commands, cómo se añade un provider/tool/skill/MCP, plugins/hooks.

#### 15. Decisiones de diseño destacadas
Qué observar: decisiones y trade-offs relevantes, con cita a archivos concretos.

#### 16. Valoración y lecciones
Qué observar: qué hace bien, qué harías distinto, qué lecciones aporta a [[Arquitectura_Agent_Harness_inspirado_en_Pi]] y a `arnes0.1/`.

## Clasificación de los repos de referencia

Los cinco repos de `repos.json` no son iguales: para comparar "peras con peras" hay que saber qué clase de pera es cada uno.

| Repo | Categoría | Relevancia de dimensiones 6–12 |
| --- | --- | --- |
| `betta-tech/byo-coding-agent` | harness completo (single-agent, Go) | alta — es un harness real |
| `anomalyco/opencode` | harness / CLI | alta — es un harness real |
| `openai/codex` | CLI de coding agent (production) | alta |
| `earendil-works/pi` | agent tooling / TUI + harness | alta |
| `codeaashu/claude-code` | recursos / workflows (no codebase) | n/a → marcador n/a donde aplique |

## Orden de estudio (uno a uno)

1. `betta-tech/byo-coding-agent` — ancla: ya lo portamos a `arnes0.1/`
2. `anomalyco/opencode` — el harness que estamos usando
3. `openai/codex` — coding agent de producción
4. `earendil-works/pi` — agent tooling / TUI
5. `codeaashu/claude-code` — variante "workflows" (dimensiones del runtime marcadas n/a)

Cada estudio se redacta con la [[Plantilla-Estudio-Harness]] y su resumen alimenta la [[Matriz-Comparativa]].
