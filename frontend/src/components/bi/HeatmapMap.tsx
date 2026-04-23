import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet.heat';
import 'leaflet/dist/leaflet.css';

interface Props {
  points: [number, number, number][]; // [lat, lng, intensity]
  height?: number;
}

export default function HeatmapMap({ points, height = 520 }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const heatRef = useRef<any>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [21.5, -100.5],
      zoom: 6,
      preferCanvas: true,
    });
    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }
    ).addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (heatRef.current) {
      map.removeLayer(heatRef.current);
      heatRef.current = null;
    }
    if (!points || points.length === 0) return;

    // @ts-ignore — leaflet.heat augments L
    heatRef.current = L.heatLayer(points, {
      radius: 18,
      blur: 22,
      maxZoom: 15,
      minOpacity: 0.35,
      gradient: {
        0.2: '#22c55e',
        0.45: '#eab308',
        0.7: '#f97316',
        1.0: '#ef4444',
      },
    }).addTo(map);

    try {
      const bounds = L.latLngBounds(points.map(p => [p[0], p[1]]));
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 10 });
    } catch (err) {
      // Non-critical: fitBounds failed for an edge case (e.g. empty/NaN coords).
      // Map keeps its default center, which is acceptable UX.
      console.warn('[HeatmapMap] fitBounds skipped:', err);
    }
  }, [points]);

  return (
    <div
      ref={containerRef}
      className="map-container"
      style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }}
      data-testid="bi-heatmap"
    />
  );
}
