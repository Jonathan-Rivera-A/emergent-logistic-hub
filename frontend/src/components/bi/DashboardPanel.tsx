import {
  AreaChart, Area, BarChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { TimeseriesPoint, HistogramBin, DeviceRank } from '../../lib/biApi';
import {
  AXIS_TICK, AXIS_TICK_SMALL, GRID_STROKE, TOOLTIP_STYLE, INPUT_STYLE,
  granularityLabel, histogramTitle,
} from './chartStyles';

const AREA_GRADIENT_ID = 'bi-dist-gradient';
const BAR_RADIUS: [number, number, number, number] = [6, 6, 0, 0];
const BAR_RADIUS_H: [number, number, number, number] = [0, 6, 6, 0];

interface Props {
  timeseries: TimeseriesPoint[];
  histogram: HistogramBin[];
  ranking: DeviceRank[];
  granularity: 'day' | 'week' | 'month';
  histMetric: 'distancia_km' | 'duracion_min' | 'velocidad';
  onHistMetric: (m: 'distancia_km' | 'duracion_min' | 'velocidad') => void;
}

export default function DashboardPanel({
  timeseries, histogram, ranking, granularity, histMetric, onHistMetric,
}: Props) {
  return (
    <div style={{ display: 'grid', gap: 24 }}>
      <div>
        <h2 style={{ marginBottom: 16 }}>
          Eventos y distancia por {granularityLabel(granularity)}
        </h2>
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <AreaChart data={timeseries}>
              <defs>
                <linearGradient id={AREA_GRADIENT_ID} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1e40af" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#1e40af" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
              <XAxis dataKey="fecha" tick={AXIS_TICK} />
              <YAxis yAxisId="left" tick={AXIS_TICK} />
              <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="distancia_km"
                name="Distancia (km)"
                stroke="#1e40af"
                fill={`url(#${AREA_GRADIENT_ID})`}
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

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
        gap: 24,
      }}>
        <div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginBottom: 12,
          }}>
            <h2 style={{ margin: 0 }}>{histogramTitle(histMetric)}</h2>
            <select
              value={histMetric}
              onChange={e => onHistMetric(
                e.target.value as 'distancia_km' | 'duracion_min' | 'velocidad'
              )}
              style={{ ...INPUT_STYLE, width: 180 }}
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
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="bin" tick={AXIS_TICK_SMALL} />
                <YAxis tick={AXIS_TICK} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="count" fill="#0891b2" radius={BAR_RADIUS} name="Frecuencia" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h2 style={{ marginBottom: 12 }}>Ranking por dispositivo (km)</h2>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={ranking.slice(0, 10)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis type="number" tick={AXIS_TICK} />
                <YAxis type="category" dataKey="dispositivo" tick={AXIS_TICK} width={110} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar
                  dataKey="distancia_km"
                  fill="#16a34a"
                  radius={BAR_RADIUS_H}
                  name="Distancia (km)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

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
                  <td
                    style={{
                      color: r.vel_max > 120 ? '#ef4444' : '#374151',
                      fontWeight: r.vel_max > 120 ? 600 : 400,
                    }}
                  >
                    {r.vel_max} km/h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
