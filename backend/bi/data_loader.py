"""
Telemetry CSV loader and data cleaning.

Loads the MASTER_EXTRACTION_REPARADO_v4 CSV file into a flat pandas DataFrame
of GPS points in memory. Executed once at module import (singleton).

Raw CSV schema:
    Dispositivo, IMEI, SIM, Fecha, Historial_Coordenadas (JSON array string)

Flat point schema (after expansion):
    dispositivo, imei, sim, fecha (date), timestamp (datetime),
    lat, lng, direccion, velocidad, ruta_id
"""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd

log = logging.getLogger(__name__)

CSV_PATH = Path(__file__).resolve().parent.parent / "data" / "telemetria.csv"


def _parse_points(row: pd.Series) -> list[dict]:
    """Extract GPS points from the JSON array column."""
    raw = row.get("Historial_Coordenadas")
    if not isinstance(raw, str) or not raw.strip():
        return []
    try:
        items = json.loads(raw)
    except json.JSONDecodeError:
        return []
    out = []
    for p in items:
        try:
            out.append({
                "timestamp": p.get("timestamp"),
                "lat": float(p.get("lat", 0) or 0),
                "lng": float(p.get("lng", 0) or 0),
                "direccion": p.get("direccion") or "",
                "velocidad": float(p.get("velocidad", 0) or 0),
            })
        except (ValueError, TypeError):
            continue
    return out


def _load() -> pd.DataFrame:
    """Load, clean and flatten the telemetry CSV into a points DataFrame."""
    if not CSV_PATH.exists():
        log.warning("Telemetry CSV not found at %s", CSV_PATH)
        return pd.DataFrame(columns=[
            "dispositivo", "imei", "sim", "fecha", "timestamp",
            "lat", "lng", "direccion", "velocidad", "ruta_id",
        ])

    log.info("Loading telemetry CSV from %s", CSV_PATH)
    df = pd.read_csv(CSV_PATH, encoding="utf-8-sig", low_memory=False)
    df.columns = [c.strip() for c in df.columns]

    records: list[dict] = []
    for ruta_id, (_, row) in enumerate(df.iterrows()):
        pts = _parse_points(row)
        if not pts:
            continue
        base = {
            "dispositivo": str(row.get("Dispositivo", "")).strip(),
            "imei": str(row.get("IMEI", "")),
            "sim": str(row.get("SIM", "")),
            "fecha": str(row.get("Fecha", ""))[:10],
            "ruta_id": ruta_id,
        }
        for p in pts:
            records.append({**base, **p})

    points = pd.DataFrame.from_records(records)
    if points.empty:
        return points

    # Cleaning
    points["timestamp"] = pd.to_datetime(points["timestamp"], errors="coerce")
    points["fecha"] = pd.to_datetime(points["fecha"], errors="coerce").dt.date
    points = points.dropna(subset=["timestamp", "lat", "lng"])
    points = points[(points["lat"].between(-90, 90)) & (points["lng"].between(-180, 180))]
    points = points[points["velocidad"].between(0, 250)]
    points = points.sort_values(["ruta_id", "timestamp"]).reset_index(drop=True)

    log.info(
        "Telemetry loaded: %d points / %d routes / %d devices",
        len(points),
        points["ruta_id"].nunique(),
        points["dispositivo"].nunique(),
    )
    return points


@lru_cache(maxsize=1)
def get_points() -> pd.DataFrame:
    """Singleton accessor for the flattened points DataFrame."""
    return _load()


def _haversine_km(lat1, lon1, lat2, lon2) -> np.ndarray:
    """Vectorized haversine distance in km."""
    r = 6371.0
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat / 2) ** 2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon / 2) ** 2
    return 2 * r * np.arcsin(np.sqrt(a))


@lru_cache(maxsize=1)
def get_route_summary() -> pd.DataFrame:
    """One row per ruta with aggregated metrics (distance, duration, avg speed, etc)."""
    pts = get_points()
    if pts.empty:
        return pd.DataFrame(columns=[
            "ruta_id", "dispositivo", "fecha", "puntos",
            "inicio", "fin", "duracion_min", "distancia_km",
            "vel_prom", "vel_max", "origen_lat", "origen_lng",
            "destino_lat", "destino_lng",
        ])

    pts = pts.copy()
    pts["lat_prev"] = pts.groupby("ruta_id")["lat"].shift()
    pts["lng_prev"] = pts.groupby("ruta_id")["lng"].shift()
    pts["seg_km"] = _haversine_km(
        pts["lat_prev"].fillna(pts["lat"]),
        pts["lng_prev"].fillna(pts["lng"]),
        pts["lat"], pts["lng"],
    )

    agg = pts.groupby(["ruta_id", "dispositivo", "fecha"]).agg(
        puntos=("timestamp", "count"),
        inicio=("timestamp", "min"),
        fin=("timestamp", "max"),
        distancia_km=("seg_km", "sum"),
        vel_prom=("velocidad", "mean"),
        vel_max=("velocidad", "max"),
        origen_lat=("lat", "first"),
        origen_lng=("lng", "first"),
        destino_lat=("lat", "last"),
        destino_lng=("lng", "last"),
    ).reset_index()

    agg["duracion_min"] = (agg["fin"] - agg["inicio"]).dt.total_seconds() / 60.0
    agg["vel_prom"] = agg["vel_prom"].round(2)
    agg["vel_max"] = agg["vel_max"].round(1)
    agg["distancia_km"] = agg["distancia_km"].round(2)
    agg["duracion_min"] = agg["duracion_min"].round(1)
    return agg
