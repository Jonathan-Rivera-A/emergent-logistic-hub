import { useState } from 'react';
import {
  Activity, Route as RouteIcon, Gauge, Clock, MapPin, AlertTriangle,
  TrendingUp, Truck, Flame,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import KpiCard from '../components/bi/KpiCard';
import FiltersBar from '../components/bi/FiltersBar';
import DashboardPanel from '../components/bi/DashboardPanel';
import HeatmapPanel from '../components/bi/HeatmapPanel';
import RoutesPanel from '../components/bi/RoutesPanel';
import AnomaliesPanel from '../components/bi/AnomaliesPanel';
import { useBiData, type Granularity, type HistMetric } from '../hooks/useBiData';
import type { BiFilters } from '../lib/biApi';

type Tab = 'dashboard' | 'map' | 'routes' | 'anomalies';

const TABS: { key: Tab; label: string; icon: JSX.Element }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: <TrendingUp size={16} /> },
  { key: 'map', label: 'Mapa de calor', icon: <Flame size={16} /> },
  { key: 'routes', label: 'Rutas frecuentes', icon: <RouteIcon size={16} /> },
  { key: 'anomalies', label: 'Anomalías', icon: <AlertTriangle size={16} /> },
];

function formatNumber(n: number | undefined): string {
  return (n ?? 0).toLocaleString('es-MX');
}

function tabButtonStyle(active: boolean): React.CSSProperties {
  return {
    padding: '14px 20px',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: active ? 600 : 500,
    color: active ? '#1e40af' : '#6b7280',
    borderBottom: active ? '2px solid #1e40af' : '2px solid transparent',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: -1,
  };
}

export default function BI() {
  const [filters, setFilters] = useState<BiFilters>({ dispositivo: 'all' });
  const [granularity, setGranularity] = useState<Granularity>('day');
  const [histMetric, setHistMetric] = useState<HistMetric>('distancia_km');
  const [tab, setTab] = useState<Tab>('dashboard');

  const {
    devices, dateRange, kpis, timeseries, topRoutes,
    histogram, heatmap, anomalies, ranking, loading, error,
  } = useBiData(filters, granularity, histMetric);

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

      <FiltersBar
        devices={devices}
        dateMin={dateRange.min}
        dateMax={dateRange.max}
        filters={filters}
        granularity={granularity}
        onFilters={setFilters}
        onGranularity={setGranularity}
      />

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #ef4444', color: '#991b1b' }}>
          {error}
        </div>
      )}

      {loading && !kpis ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="stats-grid">
            <KpiCard
              icon={<RouteIcon size={18} />} label="Rutas Totales"
              value={formatNumber(kpis?.total_rutas)}
              sub={`${kpis?.total_dispositivos ?? 0} dispositivos`}
              color="#1e40af" testId="kpi-rutas"
            />
            <KpiCard
              icon={<Activity size={18} />} label="Eventos GPS"
              value={formatNumber(kpis?.total_puntos)}
              sub={`${formatNumber(kpis?.detenciones)} detenciones`}
              color="#0891b2" testId="kpi-puntos"
            />
            <KpiCard
              icon={<MapPin size={18} />} label="Distancia Recorrida"
              value={`${formatNumber(kpis?.distancia_km)} km`}
              sub={`${kpis?.duracion_horas ?? 0} horas de operación`}
              color="#16a34a" testId="kpi-distancia"
            />
            <KpiCard
              icon={<Gauge size={18} />} label="Velocidad Promedio"
              value={`${kpis?.vel_prom ?? 0} km/h`}
              sub={`Máxima: ${kpis?.vel_max ?? 0} km/h`}
              color="#f59e0b" testId="kpi-velocidad"
            />
            <KpiCard
              icon={<Clock size={18} />} label="Horas Operación"
              value={`${formatNumber(kpis?.duracion_horas)} h`}
              sub="Tiempo total en rutas"
              color="#7c3aed" testId="kpi-horas"
            />
            <KpiCard
              icon={<AlertTriangle size={18} />} label="Anomalías"
              value={formatNumber(kpis?.anomalias)}
              sub="Rutas con patrones atípicos"
              color="#ef4444" testId="kpi-anomalias"
            />
          </div>

          <div className="card" style={{ padding: 0 }}>
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb' }}>
              {TABS.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  data-testid={`bi-tab-${t.key}`}
                  style={tabButtonStyle(tab === t.key)}
                >
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            <div style={{ padding: 24 }}>
              {tab === 'dashboard' && (
                <DashboardPanel
                  timeseries={timeseries}
                  histogram={histogram}
                  ranking={ranking}
                  granularity={granularity}
                  histMetric={histMetric}
                  onHistMetric={setHistMetric}
                />
              )}
              {tab === 'map' && <HeatmapPanel points={heatmap} />}
              {tab === 'routes' && <RoutesPanel routes={topRoutes} />}
              {tab === 'anomalies' && <AnomaliesPanel anomalies={anomalies} />}
            </div>
          </div>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            color: '#9ca3af', fontSize: 12, marginTop: 16,
          }}>
            <Truck size={14} />
            <span>
              Datos procesados desde telemetría GPS · {formatNumber(kpis?.total_puntos)} eventos
            </span>
          </div>
        </>
      )}
    </div>
  );
}
