import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { TopRoute } from '../../lib/biApi';

interface Props {
  routes: TopRoute[];
  height?: number;
}

// Fix default marker icon path issue in bundlers
const icon = L.divIcon({
  html: '<div style="background:#1e40af;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 2px #1e40af"></div>',
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

const destIcon = L.divIcon({
  html: '<div style="background:#ef4444;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 2px #ef4444"></div>',
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

export default function TopRoutesMap({ routes, height = 520 }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      center: [21.5, -100.5],
      zoom: 6,
      preferCanvas: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);
    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (!routes.length) return;

    const maxViajes = Math.max(...routes.map(r => r.viajes));
    const allPts: [number, number][] = [];

    routes.forEach((r, idx) => {
      const weight = 2 + (r.viajes / maxViajes) * 6;
      const polyline = L.polyline(
        [
          [r.origen.lat, r.origen.lng],
          [r.destino.lat, r.destino.lng],
        ],
        {
          color: `hsl(${220 - (idx * 15) % 220}, 75%, 45%)`,
          weight,
          opacity: 0.75,
        }
      );
      polyline.bindPopup(
        `<strong>#${idx + 1}</strong> — ${r.viajes} viajes<br/>
         Distancia prom: ${r.distancia_prom} km<br/>
         Duración prom: ${r.duracion_prom} min`
      );
      polyline.addTo(layer);

      L.marker([r.origen.lat, r.origen.lng], { icon }).addTo(layer);
      L.marker([r.destino.lat, r.destino.lng], { icon: destIcon }).addTo(layer);

      allPts.push([r.origen.lat, r.origen.lng], [r.destino.lat, r.destino.lng]);
    });

    try {
      const bounds = L.latLngBounds(allPts);
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 9 });
    } catch (err) {
      // Non-critical: fitBounds failed for an edge case (e.g. no valid coords).
      console.warn('[TopRoutesMap] fitBounds skipped:', err);
    }
  }, [routes]);

  return (
    <div
      ref={containerRef}
      className="map-container"
      style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }}
      data-testid="bi-top-routes-map"
    />
  );
}
