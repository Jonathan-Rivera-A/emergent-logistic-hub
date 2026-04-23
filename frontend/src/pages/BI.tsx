import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import {
  Activity, Route as RouteIcon, Gauge, Clock, MapPin, AlertTriangle,
  TrendingUp, Truck, Flame, Download,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import KpiCard from '../components/bi/KpiCard';
import HeatmapMap from '../components/bi/HeatmapMap';
import TopRoutesMap from '../components/bi/TopRoutesMap';
import {
  fetchDevices, fetchKpis, fetchTimeseries, fetchTopRoutes,
  fetchHistogram, fetchHeatmap, fetchAnomalies, fetchDeviceRanking,
  type KpiResponse, type TimeseriesPoint, type TopRoute,
  type HistogramBin, type Anomaly, type DeviceRank, type BiFilters,
} from '../lib/biApi';

type Tab = 'dashboard' | 'map' | 'routes' | 'anomalies';

export default function BI() {
  const [devices, setDevices] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ min: string | null; max: string | null }>({
    min: null, max: null,
  });
  const [filters, setFilters] = useState<BiFilters>({ dispositivo: 'all' });
  const [granularity, setGranularity] = useState<'day' | 'week' | 'month'>('day');
  const [histMetric, setHistMetric] = useState<'distancia_km' | 'duracion_min' | 'velocidad'>(
    'distancia_km'
  );
  const [tab, setTab] = useState<Tab>('dashboard');

  const [kpis, setKpis] = useState<KpiResponse | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [topRoutes, setTopRoutes] = useState<TopRoute[]>([]);
  const [histogram, setHistogram] = useState<HistogramBin[]>([]);
  const [heatmap, setHeatmap] = useState<[number, number, number][]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [ranking, setRanking] = useState<DeviceRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load of devices & date range
  useEffect(() => {
    fetchDevices()
      .then(d => {
        setDevices(d.devices || []);
        setDateRange(d.date_range || { min: null, max: null });
      })
      .catch(e => setError(`No se pudo conectar con la API de BI: ${e?.message || e}`));
  }, []);

  // Reload analytics when filters change
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    Promise.all([
      fetchKpis(filters),
      fetchTimeseries(granularity, filters),
      fetchTopRoutes(10, filters),
      fetchHistogram(histMetric, 20, filters),
      fetchHeatmap(4000, filters),
      fetchAnomalies(20, filters),
      fetchDeviceRanking(filters),
    ])
      .then(([k, ts, tr, hg, hm, an, rk]) => {
        if (!active) return;
        setKpis(k);
        setTimeseries(ts);
        setTopRoutes(tr);
        setHistogram(hg);
        setHeatmap(hm);
        setAnomalies(an);
        setRanking(rk);
      })
      .catch(e => active && setError(`Error cargando BI: ${e?.message || e}`))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [filters, granularity, histMetric]);

  const histTitle = useMemo(() => {
    if (histMetric === 'distancia_km') return 'Distribución de distancia (km) por ruta';
    if (histMetric === 'duracion_min') return 'Distribución de duración (min) por ruta';
    return 'Distribución de velocidad (km/h) por punto';
  }, [histMetric]);

  const onExportAnomalies = () => {
    if (!anomalies.length) return;
    const header = 'ruta_id,dispositivo,fecha,distancia_km,duracion_min,vel_max,score,motivo\n';
    const rows = anomalies
      .map(a => `${a.ruta_id},"${a.dispositivo}",${a.fecha},${a.distancia_km},${a.duracion_min},${a.vel_max},${a.score},"${a.motivo}"`)
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bi-anomalias-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page-container" data-testid="bi-page">
      <div className="page-header">
        <h1>Business Intelligence — Telemetría</h1>
        <p>
          Análisis de eventos GPS, rutas y rendimiento de la flota en tiempo real.
          {dateRange.min && dateRange.max && (
            <> · Rango: <strong>{dateRange.min}</strong> → <strong>{dateRange.max}</strong></>
          )}
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-end' }}>
        <div style={{ minWidth: 200 }}>
          <label style={labelStyle}>Dispositivo</label>
          <select
            value={filters.dispositivo || 'all'}
            onChange={e => setFilters(f => ({ ...f, dispositivo: e.target.value }))}
            style={inputStyle}
            data-testid="bi-filter-device"
          >
            <option value="all">Todos</option>
            {devices.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Desde</label>
          <input
            type="date"
            value={filters.desde || ''}
            min={dateRange.min || undefined}
            max={dateRange.max || undefined}
            onChange={e => setFilters(f => ({ ...f, desde: e.target.value || undefined }))}
            style={inputStyle}
            data-testid="bi-filter-from"
          />
        </div>
        <div>
          <label style={labelStyle}>Hasta</label>
          <input
            type="date"
            value={filters.hasta || ''}
            min={dateRange.min || undefined}
            max={dateRange.max || undefined}
            onChange={e => setFilters(f => ({ ...f, hasta: e.target.value || undefined }))}
            style={inputStyle}
            data-testid="bi-filter-to"
          />
        </div>
        <div>
          <label style={labelStyle}>Agrupar serie</label>
          <select
            value={granularity}
            onChange={e => setGranularity(e.target.value as any)}
            style={inputStyle}
            data-testid="bi-filter-granularity"
          >
            <option value="day">Por día</option>
            <option value="week">Por semana</option>
            <option value="month">Por mes</option>
          </select>
        </div>
        <button
          onClick={() => setFilters({ dispositivo: 'all' })}
          style={{ ...btnStyle, background: '#f3f4f6', color: '#374151' }}
          data-testid="bi-filter-reset"
        >
          Limpiar filtros
        </button>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {loading && !kpis ? (
        <LoadingSpinner />
      ) : (
        <>
          {/* KPI Row */}
          <div className="stats-grid">
            <KpiCard
              icon={<RouteIcon size={18} />}
              label="Rutas Totales"
              value={(kpis?.total_rutas ?? 0).toLocaleString('es-MX')}
              sub={`${kpis?.total_dispositivos ?? 0} dispositivos`}
              color="#1e40af"
              testId="kpi-rutas"
            />
            <KpiCard
              icon={<Activity size={18} />}
              label="Eventos GPS"
              value={(kpis?.total_puntos ?? 0).toLocaleString('es-MX')}
              sub={`${(kpis?.detenciones ?? 0).toLocaleString('es-MX')} detenciones`}
              color="#0891b2"
              testId="kpi-puntos"
            />
            <KpiCard
              icon={<MapPin size={18} />}
              label="Distancia Recorrida"
              value={`${(kpis?.distancia_km ?? 0).toLocaleString('es-MX')} km`}
              sub={`${kpis?.duracion_horas ?? 0} horas de operación`}
              color="#16a34a"
              testId="kpi-distancia"
            />
            <KpiCard
              icon={<Gauge size={18} />}
              label="Velocidad Promedio"
              value={`${kpis?.vel_prom ?? 0} km/h`}
              sub={`Máxima: ${kpis?.vel_max ?? 0} km/h`}
              color="#f59e0b"
              testId="kpi-velocidad"
            />
            <KpiCard
              icon={<Clock size={18} />}
              label="Horas Operación"
              value={`${(kpis?.duracion_horas ?? 0).toLocaleString('es-MX')} h`}
              sub="Tiempo total en rutas"
              color="#7c3aed"
              testId="kpi-horas"
            />
            <KpiCard
              icon={<AlertTriangle size={18} />}
              label="Anomalías"
              value={(kpis?.anomalias ?? 0).toLocaleString('es-MX')}
              sub="Rutas con patrones atípicos"
              color="#ef4444"
              testId="kpi-anomalias"
            />
          </div>

          {/* Tabs */}
          <div className="card" style={{ padding: 0 }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
              {([
                ['dashboard', 'Dashboard', <TrendingUp size={16} />],
                ['map', 'Mapa de calor', <Flame size={16} />],
                ['routes', 'Rutas frecuentes', <RouteIcon size={16} />],
                ['anomalies', 'Anomalías', <AlertTriangle size={16} />],
              ] as const).map(([key, label, icon]) => (
                <button
                  key={key}
                  onClick={() => setTab(key as Tab)}
                  data-testid={`bi-tab-${key}`}
                  style={{
                    padding: '14px 20px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: tab === key ? 600 : 500,
                    color: tab === key ? '#1e40af' : '#6b7280',
                    borderBottom: tab === key ? '2px solid #1e40af' : '2px solid transparent',
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: -1,
                  }}
                >
                  {icon}{label}
                </button>
              ))}
            </div>

            <div style={{ padding: 24 }}>
              {tab === 'dashboard' && (
                <div style={{ display: 'grid', gap: 24 }}>
                  {/* Timeseries */}
                  <div>
                    <h2 style={{ marginBottom: 16 }}>
                      Eventos y distancia por {granularity === 'day' ? 'día' : granularity === 'week' ? 'semana' : 'mes'}
                    </h2>
                    <div style={{ width: '100%', height: 320 }}>
                      <ResponsiveContainer>
                        <AreaChart data={timeseries}>
                          <defs>
                            <linearGradient id="distGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#1e40af" stopOpacity={0.5} />
                              <stop offset="100%" stopColor="#1e40af" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={tooltipStyle} />
                          <Legend />
                          <Area
                            yAxisId="left"
                            type="monotone"
                            dataKey="distancia_km"
                            name="Distancia (km)"
                            stroke="#1e40af"
                            fill="url(#distGrad)"
                            strokeWidth={2}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="rutas"
                            name="Rutas"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Histogram + Device ranking */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
                    gap: 24,
                  }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <h2 style={{ margin: 0 }}>{histTitle}</h2>
                        <select
                          value={histMetric}
                          onChange={e => setHistMetric(e.target.value as any)}
                          style={{ ...inputStyle, width: 180 }}
                          data-testid="bi-hist-metric"
                        >
                          <option value="distancia_km">Distancia (km)</option>
                          <option value="duracion_min">Duración (min)</option>
                          <option value="velocidad">Velocidad (km/h)</option>
                        </select>
                      </div>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <BarChart data={histogram}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="bin" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Bar dataKey="count" fill="#0891b2" radius={[6, 6, 0, 0]} name="Frecuencia" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div>
                      <h2 style={{ marginBottom: 12 }}>Ranking por dispositivo (km)</h2>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <BarChart data={ranking.slice(0, 10)} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis
                              type="category"
                              dataKey="dispositivo"
                              tick={{ fontSize: 11 }}
                              width={110}
                            />
                            <Tooltip contentStyle={tooltipStyle} />
                            <Bar
                              dataKey="distancia_km"
                              fill="#16a34a"
                              radius={[0, 6, 6, 0]}
                              name="Distancia (km)"
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Ranking table */}
                  <div>
                    <h2 style={{ marginBottom: 12 }}>Detalle por dispositivo</h2>
                    <div style={{ overflow: 'auto', maxHeight: 320 }}>
                      <table className="data-table" data-testid="bi-ranking-table">
                        <thead>
                          <tr>
                            <th>Dispositivo</th>
                            <th>Rutas</th>
                            <th>Distancia (km)</th>
                            <th>Horas</th>
                            <th>Vel. prom</th>
                            <th>Vel. máx</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ranking.map(r => (
                            <tr key={r.dispositivo}>
                              <td style={{ fontWeight: 600, color: '#1f2937' }}>{r.dispositivo}</td>
                              <td>{r.rutas}</td>
                              <td>{r.distancia_km.toLocaleString('es-MX')}</td>
                              <td>{r.duracion_h}</td>
                              <td>{r.vel_prom} km/h</td>
                              <td style={{ color: r.vel_max > 120 ? '#ef4444' : '#374151', fontWeight: r.vel_max > 120 ? 600 : 400 }}>
                                {r.vel_max} km/h
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'map' && (
                <div>
                  <h2 style={{ marginBottom: 12 }}>
                    Mapa de calor geoespacial · {heatmap.length.toLocaleString('es-MX')} puntos
                  </h2>
                  <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
                    Densidad de eventos GPS. El color rojo indica zonas con mayor actividad y velocidad.
                  </p>
                  <HeatmapMap points={heatmap} height={560} />
                </div>
              )}

              {tab === 'routes' && (
                <div>
                  <h2 style={{ marginBottom: 12 }}>
                    Top 10 rutas más frecuentes (origen → destino)
                  </h2>
                  <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
                    Se agrupan por celdas geográficas de ~1km. El grosor de la línea indica frecuencia.
                  </p>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 380px',
                    gap: 20,
                  }}>
                    <TopRoutesMap routes={topRoutes} height={540} />
                    <div style={{ overflow: 'auto', maxHeight: 540 }}>
                      <table className="data-table" data-testid="bi-top-routes-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Viajes</th>
                            <th>Dist prom</th>
                            <th>Dur prom</th>
                          </tr>
                        </thead>
                        <tbody>
                          {topRoutes.map((r, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 600, color: '#1e40af' }}>{i + 1}</td>
                              <td>{r.viajes}</td>
                              <td>{r.distancia_prom} km</td>
                              <td>{r.duracion_prom} min</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'anomalies' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h2 style={{ margin: 0 }}>
                      Anomalías detectadas · {anomalies.length}
                    </h2>
                    <button
                      onClick={onExportAnomalies}
                      style={btnStyle}
                      data-testid="bi-export-anomalies"
                    >
                      <Download size={14} /> Exportar CSV
                    </button>
                  </div>
                  <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
                    Rutas con patrones estadísticos fuera del comportamiento normal (distancia, duración o velocidad atípica).
                  </p>
                  <div style={{ overflow: 'auto' }}>
                    <table className="data-table" data-testid="bi-anomalies-table">
                      <thead>
                        <tr>
                          <th>Ruta</th>
                          <th>Dispositivo</th>
                          <th>Fecha</th>
                          <th>Distancia</th>
                          <th>Duración</th>
                          <th>Vel. máx</th>
                          <th>Score</th>
                          <th>Motivo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {anomalies.map(a => (
                          <tr key={a.ruta_id}>
                            <td style={{ fontWeight: 600, color: '#1f2937' }}>#{a.ruta_id}</td>
                            <td>{a.dispositivo}</td>
                            <td>{a.fecha}</td>
                            <td>{a.distancia_km.toFixed(1)} km</td>
                            <td>{a.duracion_min.toFixed(0)} min</td>
                            <td style={{ color: a.vel_max > 120 ? '#ef4444' : '#374151', fontWeight: 600 }}>
                              {a.vel_max} km/h
                            </td>
                            <td>
                              <span style={{
                                padding: '2px 8px',
                                background: '#fee2e2',
                                color: '#991b1b',
                                borderRadius: 6,
                                fontSize: 12,
                                fontWeight: 600,
                              }}>
                                {a.score}
                              </span>
                            </td>
                            <td style={{ fontSize: 13, color: '#6b7280' }}>{a.motivo}</td>
                          </tr>
                        ))}
                        {!anomalies.length && (
                          <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>
                            Sin anomalías en el rango seleccionado
                          </td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9ca3af', fontSize: 12, marginTop: 16 }}>
            <Truck size={14} />
            <span>Datos procesados desde telemetría GPS · {kpis?.total_puntos.toLocaleString('es-MX') || 0} eventos</span>
          </div>
        </>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 12,
  fontWeight: 600,
  color: '#374151',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

const inputStyle: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #d1d5db',
  fontSize: 14,
  background: 'white',
  minWidth: 150,
};

const btnStyle: React.CSSProperties = {
  padding: '10px 16px',
  backgroundColor: '#1e40af',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  fontSize: 13,
};
