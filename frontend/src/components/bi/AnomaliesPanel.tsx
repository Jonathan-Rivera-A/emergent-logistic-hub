import { Download } from 'lucide-react';
import type { Anomaly } from '../../lib/biApi';
import { PRIMARY_BTN } from './chartStyles';

interface Props {
  anomalies: Anomaly[];
}

const SCORE_BADGE_STYLE: React.CSSProperties = {
  padding: '2px 8px',
  background: '#fee2e2',
  color: '#991b1b',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 600,
};

function toCsv(rows: Anomaly[]): string {
  const header = 'ruta_id,dispositivo,fecha,distancia_km,duracion_min,vel_max,score,motivo\n';
  const body = rows
    .map(a =>
      `${a.ruta_id},"${a.dispositivo}",${a.fecha},${a.distancia_km},` +
      `${a.duracion_min},${a.vel_max},${a.score},"${a.motivo}"`
    )
    .join('\n');
  return header + body;
}

function downloadCsv(rows: Anomaly[]): void {
  if (!rows.length) return;
  const blob = new Blob([toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bi-anomalias-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function velColor(vel: number): string {
  return vel > 120 ? '#ef4444' : '#374151';
}

export default function AnomaliesPanel({ anomalies }: Props) {
  return (
    <div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 12,
      }}>
        <h2 style={{ margin: 0 }}>Anomalías detectadas · {anomalies.length}</h2>
        <button
          onClick={() => downloadCsv(anomalies)}
          style={PRIMARY_BTN}
          data-testid="bi-export-anomalies"
        >
          <Download size={14} /> Exportar CSV
        </button>
      </div>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
        Rutas con patrones estadísticos fuera del comportamiento normal
        (distancia, duración o velocidad atípica).
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
                <td style={{ color: velColor(a.vel_max), fontWeight: 600 }}>
                  {a.vel_max} km/h
                </td>
                <td><span style={SCORE_BADGE_STYLE}>{a.score}</span></td>
                <td style={{ fontSize: 13, color: '#6b7280' }}>{a.motivo}</td>
              </tr>
            ))}
            {!anomalies.length && (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: 40 }}>
                  Sin anomalías en el rango seleccionado
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
