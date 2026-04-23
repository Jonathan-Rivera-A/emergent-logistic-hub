# PRD — Business Intelligence Module (Telemetría)

## Problem statement
Integrar en el repositorio emergent-logistic-hub una pestaña de Business Intelligence que
trabaje sobre los datos reales de telemetría GPS (CSV MASTER_EXTRACTION_REPARADO_v4 con
170k puntos / 718 rutas / 8 dispositivos) y que entregue:
- procesamiento (limpieza + estructuración),
- análisis (KPIs, agregaciones temporales, anomalías),
- visualización (series, histogramas, mapas).

## Users
- Operador de flota: revisa desempeño diario/semanal de los vehículos
- Gerente de logística: detecta anomalías y rutas más usadas
- Analista: explora distribución de velocidad, distancia, duración

## Architecture
**Rama git**: `feature/bi-telemetry-analytics`

**Backend (FastAPI)** — `/app/backend/bi/`
- `data_loader.py` — carga el CSV al `startup`, aplana el JSON `Historial_Coordenadas`, limpia coords fuera de rango, calcula distancias haversine vectorizadas, genera `route_summary` en caché (lru_cache).
- `analytics.py` — KPIs, `time_series(granularity)`, `top_routes`, `histogram`, `heatmap_points`, `anomalies` (z-score sobre distancia + duración + flag velocidad > 120 km/h), `device_ranking`, filtrado por dispositivo y rango de fechas.
- `router.py` — endpoints `/api/bi/{health,devices,kpis,timeseries,top-routes,histogram,heatmap,anomalies,device-ranking,route/{id}}`.
- `server.py` — incluye `bi_router` y preload del CSV en `@startup`.

**Frontend (Vite + React + TS)**
- `/pages/BI.tsx` — dashboard con 4 tabs (Dashboard / Mapa de calor / Rutas frecuentes / Anomalías).
- `/components/bi/KpiCard.tsx`, `HeatmapMap.tsx` (Leaflet + leaflet.heat), `TopRoutesMap.tsx`.
- `/lib/biApi.ts` — cliente axios tipado.
- Filtros: dispositivo, rango de fechas, granularidad día/semana/mes. Export CSV de anomalías.

**Datos en memoria**: el CSV se procesa una sola vez al iniciar el backend (≈1 s) y queda
cacheado como DataFrame; cada endpoint filtra sobre esa estructura.

## Implementado (2026-02)
- [x] Procesamiento y limpieza del CSV (170k puntos válidos de 170.8k)
- [x] 8 endpoints BI + health check
- [x] 6 KPIs principales (rutas, eventos GPS, distancia, velocidades, horas, anomalías)
- [x] Serie de tiempo área/línea (Recharts) por día/semana/mes
- [x] Histogramas (distancia, duración, velocidad)
- [x] Ranking de dispositivos (barras horizontales + tabla)
- [x] Mapa de calor con Leaflet + leaflet.heat sobre OpenStreetMap
- [x] Mapa de rutas top (polylines con grosor por frecuencia)
- [x] Detección de anomalías con z-score, tabla + export CSV
- [x] Filtros interactivos (dispositivo, fecha, granularidad)

## Backlog
- [ ] P1: Endpoint `/api/bi/route/{id}` conectado a visualización de traza individual
- [ ] P1: Comparar dispositivos lado a lado
- [ ] P2: Persistir en Mongo reportes generados / alertas suscritas
- [ ] P2: Websocket para telemetría en vivo
- [ ] P2: ML para predicción de ETA y consumo

## Next tasks
Ver feedback del testing subagent → priorizar fixes de alta/media prioridad.
