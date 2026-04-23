/**
 * Shared module-level style constants for BI charts.
 * Extracted to module scope to avoid allocating new objects on each render
 * (Recharts memoizes children by reference).
 */
import type { CSSProperties } from 'react';

export const AXIS_TICK = { fontSize: 11 } as const;
export const AXIS_TICK_SMALL = { fontSize: 10 } as const;
export const GRID_STROKE = '#e5e7eb';
export const DOT_NONE = false as const;

export const TOOLTIP_STYLE: CSSProperties = {
  backgroundColor: 'white',
  border: '1px solid #e5e7eb',
  borderRadius: 8,
  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  fontSize: 13,
};

export const LABEL_STYLE: CSSProperties = {
  display: 'block',
  marginBottom: 6,
  fontSize: 12,
  fontWeight: 600,
  color: '#374151',
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

export const INPUT_STYLE: CSSProperties = {
  padding: '8px 10px',
  borderRadius: 6,
  border: '1px solid #d1d5db',
  fontSize: 14,
  background: 'white',
  minWidth: 150,
};

export const PRIMARY_BTN: CSSProperties = {
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

export const RESET_BTN: CSSProperties = {
  ...PRIMARY_BTN,
  background: '#f3f4f6',
  color: '#374151',
};

export function granularityLabel(g: 'day' | 'week' | 'month'): string {
  if (g === 'day') return 'día';
  if (g === 'week') return 'semana';
  return 'mes';
}

export function histogramTitle(
  metric: 'distancia_km' | 'duracion_min' | 'velocidad'
): string {
  if (metric === 'distancia_km') return 'Distribución de distancia (km) por ruta';
  if (metric === 'duracion_min') return 'Distribución de duración (min) por ruta';
  return 'Distribución de velocidad (km/h) por punto';
}

export function vehicleStatusLabel(status: string): string {
  if (status === 'active') return 'Activo';
  if (status === 'inactive') return 'Inactivo';
  return 'Mantenimiento';
}
