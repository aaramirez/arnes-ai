# Plantillas de las notas del set

`<Prefijo>` = nombre legible y corto del objetivo (p.ej. `Eve`, `BH`). `<slug>` = carpeta en `docs/diagramas/<slug>/`. Referencia real: `docs/diagramas/vercel-eve/`.

## Reglas Mermaid seguras (Obsidian + GitHub)

- En `flowchart`, **entrecomilla las etiquetas**: `A["texto (con) / símbolos"]`. Usa `<br/>` para saltos de línea.
- No uses `;` ni `{}` dentro de los mensajes de `sequenceDiagram`, y evita `#`.
- Usa `autonumber` en todos los `sequenceDiagram`, para que el paso a paso comparta la numeración.
- Nombres cortos para los participantes (`participant AG as Sesión eve`). En sequence usa `actor` para las personas.
- En `stateDiagram-v2` las etiquetas de transición van después de `:`. Los estados compuestos con `state X { ... }` están bien en Mermaid; Archify los aplanará después.
- Aristas punteadas: `-. etiqueta .->`. Con etiqueta: `-- "texto" -->`.

## 1. `<Prefijo>-Arquitectura-y-Flujos.md`

````markdown
---
title: <Nombre> — Arquitectura y flujos internos
type: diagramas
repo: <org/repo>
tags:
  - diagramas
  - <slug>
  - arquitectura
---

# <Nombre> — Arquitectura y flujos internos

[[<estudio-si-existe>]] · [[<Prefijo>-10-Flujos-Empresariales]] · [[<Prefijo>-Implementacion]]

Diagramas de **cómo funciona <Nombre> por dentro**. Cada diagrama cita evidencia en `repos/<org>/<repo>/`.

---

## 1. Mapa de componentes
<flowchart con subgraphs; marca la frontera de confianza>

**Evidencia:**
- `repos/<org>/<repo>/<path>:<line>` — ...

## 2. Ciclo de vida de una solicitud / turno
<sequenceDiagram autonumber>

## 3. Estados
<stateDiagram-v2>

## 4..N. Mecanismos clave
<durabilidad, compactación, política, auth, pipeline, topología>

---

[[<estudio>]] · [[Matriz-Comparativa]]
````

## 2. `<Prefijo>-10-Flujos-Empresariales.md`

Abre con una **tabla resumen** (# · Flujo · Canal/mecanismo o componentes · Caso típico). Cada flujo sigue este esqueleto:

````markdown
## Flujo N — <título>

**Objetivo:** <qué problema empresarial resuelve, en una frase>.

```mermaid
sequenceDiagram
  autonumber
  ...
```

**Paso a paso:**
- **1-3.** <qué ocurre en esos pasos>.
- ... (los números coinciden con los del diagrama)

**Configurar / componentes:** <archivos, APIs o componentes que intervienen>.

**Puntos de control:**
- <fallos típicos, límites, advertencias honestas>

**Evidencia:**
- `repos/<org>/<repo>/<path>:<line>` — ...
````

Cómo elegir los 10 flujos: cubre entrada o identidad, interacción humana, integración con sistemas, automatización o programación, multi-agente, seguridad o multi-tenant, auditoría o gobierno, y resiliencia. Deben ser casos que el objetivo **realmente** soporte según la evidencia.

## 3. `<Prefijo>-Implementacion.md`

- **Respuesta corta:** qué hace falta para usarlo o construirlo en una empresa.
- Convención **[doc]** frente a **[inferencia]**.
- §1 Arquitectura de referencia (flowchart).
- §2 Tabla: función · qué aporta el objetivo · qué lo reemplaza o implementa · qué falta aportar.
- §3 Componentes faltantes por prioridad.
- §4 Plan por fases (flowchart LR) + checklist `- [ ]`.
- En un framework ejecutable: despliegue, dependencias gestionadas y self-hosting.
- En un contenido o especificación: orden de construcción según el propio contenido, mapeo de cada componente a tecnología real, y qué partes cubre un framework ya estudiado (p.ej. eve).

## 4. `<Prefijo>-Diagramas-Archify.md` (índice)

````markdown
---
title: <Nombre> — Diagramas interactivos (Archify)
type: diagramas
repo: <org/repo>
tags:
  - diagramas
  - <slug>
  - archify
---

# <Nombre> — Diagramas interactivos (Archify)

<links a las notas Mermaid>

Versión navegable de los diagramas Mermaid; las notas Mermaid siguen intactas. Generado con
[Archify](https://github.com/tt-a1i/archify) (skill local `~/.agents/skills/archify`, v<versión>).
Ábrelos en un navegador: Obsidian no renderiza HTML inline. La UI fija del visor aparece en inglés.

## <grupo>
| Diagrama | Tipo | Mermaid equivalente |
| --- | --- | --- |
| [<título>](archify/rendered/<diagrama>.html) | <tipo> | [[<nota>]] §N |

## Diferencias frente a la versión Mermaid
<compresiones reportadas: auto-mensajes → notas/cards, agrupaciones, estados aplanados, dónde viven las citas>

## Estado de verificación
- validate --quality showcase: N/N · deliver: N/N con SHA-256 · visual-check: N/N · revisión perceptual: pendiente
- Defectos visuales conocidos: ...

**Regenerar un diagrama:** <comandos validate / deliver / visual-check>
````
