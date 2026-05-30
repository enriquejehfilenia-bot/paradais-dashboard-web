---
target: components/Dashboard.tsx
total_score: 24
p0_count: 0
p1_count: 2
timestamp: 2026-05-30T15-15-58Z
slug: components-dashboard-tsx
---
## Design Health Score

| # | Heurística | Score | Hallazgo clave |
|---|-----------|-------|----------------|
| 1 | Visibility of System Status | 3 | "En vivo" y spinner de login; sin feedback al aplicar filtros |
| 2 | Match System / Real World | 3 | Español, terminología financiera correcta; "Inv. Bruta" opaca para nuevos |
| 3 | User Control and Freedom | 3 | "Limpiar todo" presente; sin undo en navegación entre dashboards |
| 4 | Consistency and Standards | 2 | Dos sistemas de componentes: KPICard/Combobox vs KPI/MultiSelect |
| 5 | Error Prevention | 2 | Rango de fechas acepta hasta < desde sin validación; empty state genérico |
| 6 | Recognition Rather Than Recall | 3 | Chips de filtros activos visibles; sin tooltips en términos financieros |
| 7 | Flexibility and Efficiency | 2 | Sin atajos de teclado; no se pueden guardar combinaciones de filtros |
| 8 | Aesthetic and Minimalist Design | 3 | Limpio en general; row de KPI contadores en medios es redundante |
| 9 | Error Recovery | 2 | Login específico; fallo de carga de datos sin retry |
| 10 | Help and Documentation | 1 | Sin tooltips, sin onboarding, sin explicación de métricas |
| **Total** | | **24/40** | **Aceptable** |

## Anti-Patterns Verdict

LLM assessment: Detector devolvió []. Tres señales de AI: (1) bg #FDFCFA = cream AI default 2026, (2) ALL-CAPS + tracking-[0.1em] en labels KPI = eyebrow anti-pattern, (3) ghost-card border+shadow en KPICard.

## Priority Issues

[P1] Background crema - identidad cero. Fix: colorize hacia neutral tintado en accent o comprometerse con fondo más oscuro.
[P1] ALL-CAPS + tracking en labels KPI - anti-patrón absoluto. Fix: lowercase text-xs font-semibold.
[P2] Dos sistemas de componentes paralelos (KPICard vs KPI inline, Combobox vs MultiSelect).
[P2] Ghost-card en KPICard: border + shadow juntos.
[P2] Sin tooltips en métricas financieras.

## Persona Red Flags

Alex: sin guardar filtros, sin atajos de teclado, sin export CSV de vista filtrada.
Sam: text-[0.65rem] bajo mínimo, TrafficLight color-only, foco insuficiente.
Riley: sin validación desde/hasta, charts partidos con datos escasos.
