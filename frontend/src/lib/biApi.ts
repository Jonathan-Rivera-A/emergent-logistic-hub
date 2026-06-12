/**
 * Axios client for BI API. Base URL is injected by vite.config.ts from
 * REACT_APP_BACKEND_URL / VITE_BACKEND_URL.
 *
 * Reads the current JWT from localStorage on every request (AuthContext writes it there).
 * On 401 it clears the session and redirects to /login so the user re-authenticates
 * instead of seeing a permanent error in the BI dashboard.
 */
import axios from 'axios';

const BASE = (import.meta.env.VITE_BACKEND_URL as string) || '';
const TOKEN_KEY = 'auth:token';
const USER_KEY = 'auth:user';

export const biApi = axios.create({
  baseURL: `${BASE}/api/bi`,
  timeout: 30000,
});

biApi.interceptors.request.use(cfg => {
  const t = localStorage.getItem(TOKEN_KEY);
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

biApi.interceptors.response.use(
  r => r,
  err => {
    if (err?.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.replace(`/login?reason=expired&from=${encodeURIComponent(window.location.pathname)}`);
      }
    }
    return Promise.reject(err);
  }
);

export interface KpiResponse {
  total_rutas: number;
  total_puntos: number;
  total_dispositivos: number;
  distancia_km: number;
  duracion_horas: number;
  vel_prom: number;
  vel_max: number;
  anomalias: number;
  detenciones: number;
}

export interface TimeseriesPoint {
  fecha: string;
  rutas: number;
  distancia_km: number;
  duracion_h: number;
  vel_prom: number;
}

export interface TopRoute {
  origen: { lat: number; lng: number };
  destino: { lat: number; lng: number };
  viajes: number;
  distancia_prom: number;
  duracion_prom: number;
}

export interface HistogramBin {
  bin: string;
  min: number;
  max: number;
  count: number;
}

export interface Anomaly {
  ruta_id: number;
  dispositivo: string;
  fecha: string;
  distancia_km: number;
  duracion_min: number;
  vel_max: number;
  score: number;
  motivo: string;
}

export interface DeviceRank {
  dispositivo: string;
  rutas: number;
  distancia_km: number;
  duracion_h: number;
  vel_prom: number;
  vel_max: number;
}

export interface BiFilters {
  dispositivo?: string;
  desde?: string;
  hasta?: string;
}

function cleanParams(p: Record<string, any>) {
  const out: Record<string, any> = {};
  Object.entries(p).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') out[k] = v;
  });
  return out;
}

export const fetchDevices = () => biApi.get('/devices').then(r => r.data);
export const fetchKpis = (f: BiFilters) =>
  biApi.get<KpiResponse>('/kpis', { params: cleanParams(f) }).then(r => r.data);
export const fetchTimeseries = (granularity: string, f: BiFilters) =>
  biApi
    .get<{ data: TimeseriesPoint[] }>('/timeseries', {
      params: cleanParams({ granularity, ...f }),
    })
    .then(r => r.data.data);
export const fetchTopRoutes = (limit: number, f: BiFilters) =>
  biApi
    .get<{ data: TopRoute[] }>('/top-routes', { params: cleanParams({ limit, ...f }) })
    .then(r => r.data.data);
export const fetchHistogram = (metric: string, bins: number, f: BiFilters) =>
  biApi
    .get<{ data: HistogramBin[] }>('/histogram', {
      params: cleanParams({ metric, bins, ...f }),
    })
    .then(r => r.data.data);
export const fetchHeatmap = (sample: number, f: BiFilters) =>
  biApi
    .get<{ data: [number, number, number][] }>('/heatmap', {
      params: cleanParams({ sample, ...f }),
    })
    .then(r => r.data.data);
export const fetchAnomalies = (limit: number, f: BiFilters) =>
  biApi
    .get<{ data: Anomaly[] }>('/anomalies', { params: cleanParams({ limit, ...f }) })
    .then(r => r.data.data);
export const fetchDeviceRanking = (f: BiFilters) =>
  biApi
    .get<{ data: DeviceRank[] }>('/device-ranking', { params: cleanParams(f) })
    .then(r => r.data.data);
export const fetchRoutePath = (rutaId: number) =>
  biApi.get(`/route/${rutaId}`).then(r => r.data);
