import HeatmapMap from './HeatmapMap';

interface Props {
  points: [number, number, number][];
}

export default function HeatmapPanel({ points }: Props) {
  return (
    <div>
      <h2 style={{ marginBottom: 12 }}>
        Mapa de calor geoespacial · {points.length.toLocaleString('es-MX')} puntos
      </h2>
      <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 16 }}>
        Densidad de eventos GPS. El color rojo indica zonas con mayor actividad y velocidad.
      </p>
      <HeatmapMap points={points} height={560} />
    </div>
  );
}
