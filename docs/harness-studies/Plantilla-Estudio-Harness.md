---
title: Plantilla de Estudio de Harness
type: template
tags:
  - framework
  - plantilla
---

# Plantilla de Estudio de Harness

Plantilla **homogénea** para todo estudio de harness. Cada nota de estudio debe:

- usar exactamente las secciones `##` listadas abajo (en este orden);
- en cada sección responder con **Hallazgo** (qué hace, cómo) + **Evidencia** citando el repositorio de referencia (`repos/<org>/<repo>/<path>:<line>`);
- abrir con **frontmatter YAML** y una **tabla resumen** dimensión → estado (✔ / ◐ / ✖ / n/a) que alimenta la [[Matriz-Comparativa]];
- cerrar con el wikilink `[[Matriz-Comparativa]]`.

Las preguntas guía de cada dimensión están en [[Criterio-de-Evaluacion]] — aquí no se repiten, solo se estructura la respuesta.

## Formato de apertura

```markdown
---
title: <Nombre del harness>
type: estudio
repo: <org/repo>
categoría: <harness completo | CLI | librería | recursos/workflows>
lenguaje: <...>
estado: <en-progreso | publicado>
fecha: <AAAA-MM-DD>
---

# <Nombre del harness>

[[Criterio-de-Evaluacion]] · [[Matriz-Comparativa]]

Repo: `org/repo` · Categoría: <harness completo | CLI | librería | recursos/workflows> · Lenguaje: <...>

| Dimensión | Estado |
| --- | --- |
| 1. Ficha | ✔ |
| ... | ... |
| 16. Valoración y lecciones | ✔ |
```

## 0. Ficha

**Hallazgo:** ...

**Evidencia:** `repos/<org>/<repo>/<path>:<line>` — ...

## 1. Estructura del repo

**Hallazgo:** ...

**Evidencia:** ...

## 2. Capas y componentes

**Hallazgo:** ...

**Evidencia:** ...

## 3. Flujo end-to-end

**Hallazgo:** ...

**Evidencia:** ...

## 4. Contratos internos

**Hallazgo:** ...

**Evidencia:** ...

## 5. Agent loop

**Hallazgo:** ...

**Evidencia:** ...

## 6. Mensajes y contexto

**Hallazgo:** ...

**Evidencia:** ...

## 7. Provider seam

**Hallazgo:** ...

**Evidencia:** ...

## 8. Tool runtime

**Hallazgo:** ...

**Evidencia:** ...

## 9. Permisos y seguridad

**Hallazgo:** ...

**Evidencia:** ...

## 10. Compaction / gestión de contexto

**Hallazgo:** ...

**Evidencia:** ...

## 11. Subagentes / orquestación

**Hallazgo:** ...

**Evidencia:** ...

## 12. UI / presentación

**Hallazgo:** ...

**Evidencia:** ...

## 13. Configuración y extensibilidad

**Hallazgo:** ...

**Evidencia:** ...

## 14. Decisiones de diseño destacadas

**Hallazgo:** ...

**Evidencia:** ...

## 15. Valoración y lecciones

**Hallazgo:** ...

**Evidencia:** ...

---

[[Matriz-Comparativa]]
