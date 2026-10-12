---
title: Propuestas para book-harness — estado de implementación
type: propuesta
repo: aaramirez/book-harness
estado: implementado
fecha: 2026-10-12
tags:
  - propuesta
  - book-harness
  - estado
---

# Propuestas para book-harness — estado de implementación

[[BH-Propuestas]] · [[BH-Propuesta-Lecciones-eve]] · [[BH-Propuesta-Aportes-pi]] · [[Eve-vs-BookHarness-vs-Pi]]

Las propuestas de [[BH-Propuestas]] se aplicaron en el repositorio del libro (`aaramirez/book-harness`) con el plan maestro `planes/2026-09-24-extension-v0-2-v0-3-eve-pi-conexiones.md`. Ese plan reemplazó al plan 005 de este repo (`plans/005-…`, marcado como *superseded*). Esta nota contrasta lo **propuesto** (@ `d16e2c7`, 2026-09-24) con lo **construido** (tag `v0.3`, 2026-10-10).

## 1. Resumen

| | Propuesto | Construido |
| --- | --- | --- |
| Releases | v0.2 (CH-28..36) y v0.3 (CH-37..44) | v0.2 (CH-28..36), **v0.2.1** (cierre de deuda: revisión de CH-13, CH-37, CH-38) y v0.3 (CH-39..49) |
| Capítulos | 28 → 44 | 28 → **50** (CH-00..CH-49) |
| Componentes | 22 → 27 (5 nuevos) | 22 → **29** (7 nuevos) |
| Contratos | — | 35 → **66** (C-036..C-066) |
| Glosario | 134 términos | **201** términos |
| Constitución | borrador de Amendment v1.2 | **Amendment v1.2** aprobado |
| ADRs | 4 | **5** aceptados (ADR-001..ADR-005) |
| Deuda | — | `registry/debt.yaml`: 48 deudas, **0 abiertas** (42 resueltas, 6 fuera de alcance) |

## 2. Componentes nuevos

| Componente | ID propuesto | ID real | Capítulo |
| --- | --- | --- | --- |
| ExecutionJournal | CMP-024 | CMP-023 | CH-32 |
| ResumptionCoordinator | CMP-025 | CMP-024 | CH-33 |
| ContinuationRegistry | CMP-026 | CMP-025 | CH-34 |
| IsolatedExecutionEnvironment | CMP-027 | CMP-026 | CH-35 |
| ExtensionHost | CMP-023 | CMP-027 | CH-40 |
| ConnectionManager | — (nuevo) | CMP-028 | CH-41 |
| RetrievalEngine | — (nuevo) | CMP-029 | CH-42 |

**Diferencias con la propuesta:**
- **ExtensionHost** pasó de v0.2 a v0.3: primero se construyó la operación durable (pi y eve), y después la conectividad.
- **ConnectionManager** (MCP y OpenAPI como fuentes de capabilities, ADR-005) y **RetrievalEngine** (fuentes de datos gobernadas) entraron con el tramo de conexiones. No estaban en la propuesta original.

## 3. Capítulos construidos

| Release | Capítulos |
| --- | --- |
| v0.2 — operación durable | CH-28 steering y follow-up · CH-29 compactación y sesiones en árbol · CH-30 política de replay · CH-31 identidad del llamante · CH-32 pasos durables · CH-33 esperas durables · CH-34 canales y direcciones de continuación · CH-35 entorno aislado y credenciales en el egress · CH-36 integración: el turno durable gobernado |
| v0.2.1 — cierre de deuda | revisión de CH-13 (aprobación expuesta) · CH-37 esperas, credenciales y canales completos · CH-38 identidad, auditoría y retención en todo el turno |
| v0.3 — conectividad | CH-39 el modelo como dato · CH-40 extensiones · CH-41 conexiones MCP/OpenAPI · CH-42 fuentes de datos gobernadas · CH-43 presupuestos que se heredan · CH-44 invocación durable entre agentes y A2A · CH-45 evolución del runtime con sesiones abiertas · CH-46 observabilidad por audiencia · CH-47 evaluación con lift · CH-48 el agente como directorio · CH-49 integración: el arnés conectado |

**Se mantuvo el orden que pedía P-09:** la invocación entre agentes (CH-44) llega después de los presupuestos que se heredan (CH-43), casi al final.

## 4. ADRs

| ADR | Tema | Estado |
| --- | --- | --- |
| ADR-001 | principal en `ExecutionContext` | aceptado (v0.2) |
| ADR-002 | política de replay en la capability | aceptado (v0.2) |
| ADR-003 | sesión en árbol y versión del runtime | aceptado en dos partes; la v3 (v0.3) trata una sesión sin `runtimeVersion` como de versión desconocida |
| ADR-004 | presupuesto jerárquico | aceptado (v0.3), con `consumed` opcional y `sandboxLimits` |
| ADR-005 | capability desde una conexión | aceptado (v0.3), con `executionKind` |

## 5. Qué quedó desactualizado en este vault

- [[BH-Propuestas]] y sus dos propuestas son el **diseño** del 24 de septiembre. Se conservan como registro de la decisión, y sus IDs son los propuestos, no los reales (ver §2).
- Los diagramas de `docs/diagramas/book-harness/` ([[BH-Arquitectura-y-Flujos]], [[BH-10-Flujos-Empresariales]], [[BH-Implementacion]], [[BH-Diagramas-Archify]]) muestran el libro **v0.1**: 28 capítulos, 22 componentes, 35 contratos. Para ver el arnés v0.3, regenerarlos con el skill `estudio-visual`, o usar los diagramas del propio libro (`diagrams/archify/`, 55 diagramas).

**Fuentes (en `book-harness`):** `book/book.yaml` (versión 0.3), `registry/components.yaml`, `registry/contracts.yaml`, `registry/debt.yaml`, `docs/adr/`, `planes/2026-10-10-cierre-release-v0-3.md`.
