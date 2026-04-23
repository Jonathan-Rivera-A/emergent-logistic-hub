import { useCallback, useEffect, useState } from 'react';
import {
  fetchAnomalies, fetchDeviceRanking, fetchDevices, fetchHeatmap,
  fetchHistogram, fetchKpis, fetchTimeseries, fetchTopRoutes,
  type Anomaly, type BiFilters, type DeviceRank, type HistogramBin,
  type KpiResponse, type TimeseriesPoint, type TopRoute,
} from '../lib/biApi';

export type Granularity = 'day' | 'week' | 'month';
export type HistMetric = 'distancia_km' | 'duracion_min' | 'velocidad';

export interface UseBiDataResult {
  devices: string[];
  dateRange: { min: string | null; max: string | null };
  kpis: KpiResponse | null;
  timeseries: TimeseriesPoint[];
  topRoutes: TopRoute[];
  histogram: HistogramBin[];
  heatmap: [number, number, number][];
  anomalies: Anomaly[];
  ranking: DeviceRank[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches all BI datasets whenever filters/granularity/histMetric change.
 * Cancels stale responses via an `active` flag.
 */
export function useBiData(
  filters: BiFilters,
  granularity: Granularity,
  histMetric: HistMetric
): UseBiDataResult {
  const [devices, setDevices] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ min: string | null; max: string | null }>({
    min: null, max: null,
  });
  const [kpis, setKpis] = useState<KpiResponse | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [topRoutes, setTopRoutes] = useState<TopRoute[]>([]);
  const [histogram, setHistogram] = useState<HistogramBin[]>([]);
  const [heatmap, setHeatmap] = useState<[number, number, number][]>([]);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [ranking, setRanking] = useState<DeviceRank[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = useCallback(() => {
    fetchDevices()
      .then(d => {
        setDevices(d.devices || []);
        setDateRange(d.date_range || { min: null, max: null });
      })
      .catch(e =>
        setError(`No se pudo conectar con la API de BI: ${e?.message || String(e)}`)
      );
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

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
      .catch(e => {
        if (active) setError(`Error cargando BI: ${e?.message || String(e)}`);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters, granularity, histMetric]);

  return {
    devices, dateRange, kpis, timeseries, topRoutes, histogram,
    heatmap, anomalies, ranking, loading, error,
  };
}
