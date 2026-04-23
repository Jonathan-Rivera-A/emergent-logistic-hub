import TopRoutesMap from './TopRoutesMap';
import type { TopRoute } from '../../lib/biApi';

interface Props {
  routes: TopRoute[];
}

function routeKey(r: TopRoute): string {
  return `${r.origen.lat},${r.origen.lng}->${r.destino.lat},${r.destino.lng}`;
}

export default function RoutesPanel({ routes }: Props) {
  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>Top 10 rutas más frecuentes (origen → destino)</h2>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
        Se agrupan por celdas geográficas de ~1km. El grosor de la línea indica frecuencia.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        <TopRoutesMap routes={routes} height={540} />
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
              {routes.map((r, i) => (
                <tr key={routeKey(r)}>
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
  );
}
