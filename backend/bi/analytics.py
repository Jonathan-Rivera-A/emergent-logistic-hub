"""Analytics functions on top of the telemetry points DataFrame."""
from __future__ import annotations

from datetime import date
from typing import Optional

import numpy as np
import pandas as pd

from .data_loader import get_points, get_route_summary


def _apply_filters(
    df: pd.DataFrame,
    dispositivo: Optional[str] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
    date_col: str = "fecha",
) -> pd.DataFrame:
    if dispositivo and dispositivo != "all":
        df = df[df["dispositivo"] == dispositivo]
    if desde is not None:
        df = df[df[date_col] >= desde]
    if hasta is not None:
        df = df[df[date_col] <= hasta]
    return df


# ---------- KPIs ----------
def compute_kpis(
    dispositivo: Optional[str] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
) -> dict:
    pts = _apply_filters(get_points(), dispositivo, desde, hasta)
    routes = _apply_filters(get_route_summary(), dispositivo, desde, hasta)

    if pts.empty:
        return {
            "total_rutas": 0, "total_puntos": 0, "total_dispositivos": 0,
            "distancia_km": 0.0, "duracion_horas": 0.0, "vel_prom": 0.0,
            "vel_max": 0.0, "anomalias": 0, "detenciones": 0,
        }

    detenciones = int((pts["velocidad"] < 1).sum())
    anomalias = _count_anomalies(routes)
    return {
        "total_rutas": int(routes["ruta_id"].nunique()),
        "total_puntos": int(len(pts)),
        "total_dispositivos": int(pts["dispositivo"].nunique()),
        "distancia_km": round(float(routes["distancia_km"].sum()), 2),
        "duracion_horas": round(float(routes["duracion_min"].sum() / 60.0), 2),
        "vel_prom": round(float(pts["velocidad"].mean()), 2),
        "vel_max": round(float(pts["velocidad"].max()), 1),
        "anomalias": anomalias,
        "detenciones": detenciones,
    }


def _count_anomalies(routes: pd.DataFrame) -> int:
    if routes.empty:
        return 0
    q = routes["distancia_km"].quantile([0.05, 0.95])
    lo, hi = q.iloc[0], q.iloc[1]
    speed_hi = routes["vel_max"].quantile(0.95)
    mask = (routes["distancia_km"] > hi) | (routes["distancia_km"] < lo) | (routes["vel_max"] > max(speed_hi, 120))
    return int(mask.sum())


# ---------- Time series ----------
def time_series(
    granularity: str = "day",  # day | week | month
    dispositivo: Optional[str] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
) -> list[dict]:
    routes = _apply_filters(get_route_summary(), dispositivo, desde, hasta)
    if routes.empty:
        return []

    routes = routes.copy()
    routes["fecha"] = pd.to_datetime(routes["fecha"])
    if granularity == "week":
        routes["bucket"] = routes["fecha"].dt.to_period("W").apply(lambda p: p.start_time.date())
    elif granularity == "month":
        routes["bucket"] = routes["fecha"].dt.to_period("M").apply(lambda p: p.start_time.date())
    else:
        routes["bucket"] = routes["fecha"].dt.date

    agg = routes.groupby("bucket").agg(
        rutas=("ruta_id", "nunique"),
        distancia_km=("distancia_km", "sum"),
        duracion_h=("duracion_min", lambda s: s.sum() / 60.0),
        vel_prom=("vel_prom", "mean"),
    ).reset_index().sort_values("bucket")

    return [
        {
            "fecha": r.bucket.isoformat(),
            "rutas": int(r.rutas),
            "distancia_km": round(float(r.distancia_km), 2),
            "duracion_h": round(float(r.duracion_h), 2),
            "vel_prom": round(float(r.vel_prom), 2),
        }
        for r in agg.itertuples()
    ]


# ---------- Top routes ----------
def top_routes(
    limit: int = 10,
    dispositivo: Optional[str] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
) -> list[dict]:
    """Frequent origin→destination pairs (rounded to ~1km grid)."""
    routes = _apply_filters(get_route_summary(), dispositivo, desde, hasta)
    if routes.empty:
        return []
    r = routes.copy()
    # Filter out invalid/zero GPS coords (common sensor errors)
    r = r[
        (r["origen_lat"].abs() > 0.1) & (r["origen_lng"].abs() > 0.1) &
        (r["destino_lat"].abs() > 0.1) & (r["destino_lng"].abs() > 0.1)
    ]
    if r.empty:
        return []
    r["o_key"] = r["origen_lat"].round(2).astype(str) + "," + r["origen_lng"].round(2).astype(str)
    r["d_key"] = r["destino_lat"].round(2).astype(str) + "," + r["destino_lng"].round(2).astype(str)
    grp = r.groupby(["o_key", "d_key"]).agg(
        viajes=("ruta_id", "count"),
        distancia_prom=("distancia_km", "mean"),
        duracion_prom=("duracion_min", "mean"),
        origen_lat=("origen_lat", "mean"),
        origen_lng=("origen_lng", "mean"),
        destino_lat=("destino_lat", "mean"),
        destino_lng=("destino_lng", "mean"),
    ).reset_index().sort_values("viajes", ascending=False).head(limit)

    return [
        {
            "origen": {"lat": round(float(row.origen_lat), 4), "lng": round(float(row.origen_lng), 4)},
            "destino": {"lat": round(float(row.destino_lat), 4), "lng": round(float(row.destino_lng), 4)},
            "viajes": int(row.viajes),
            "distancia_prom": round(float(row.distancia_prom), 2),
            "duracion_prom": round(float(row.duracion_prom), 1),
        }
        for row in grp.itertuples()
    ]


# ---------- Histograms ----------
def histogram(
    metric: str,  # distancia_km | duracion_min | vel_prom | velocidad
    bins: int = 20,
    dispositivo: Optional[str] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
) -> list[dict]:
    if metric == "velocidad":
        data = _apply_filters(get_points(), dispositivo, desde, hasta)["velocidad"].to_numpy()
    else:
        routes = _apply_filters(get_route_summary(), dispositivo, desde, hasta)
        if metric not in routes.columns:
            return []
        data = routes[metric].to_numpy()

    if data.size == 0:
        return []

    counts, edges = np.histogram(data, bins=bins)
    return [
        {
            "bin": f"{edges[i]:.1f}-{edges[i+1]:.1f}",
            "min": round(float(edges[i]), 2),
            "max": round(float(edges[i + 1]), 2),
            "count": int(counts[i]),
        }
        for i in range(len(counts))
    ]


# ---------- Heatmap ----------
def heatmap_points(
    sample: int = 4000,
    dispositivo: Optional[str] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
) -> list[list[float]]:
    pts = _apply_filters(get_points(), dispositivo, desde, hasta)
    if pts.empty:
        return []
    # Exclude bad (0,0) sensor readings that distort map bounds
    pts = pts[(pts["lat"].abs() > 0.1) & (pts["lng"].abs() > 0.1)]
    if pts.empty:
        return []
    sample = max(100, min(sample, 20000))
    if len(pts) > sample:
        pts = pts.sample(sample, random_state=42)
    # [lat, lng, intensity]
    return [
        [round(float(r.lat), 5), round(float(r.lng), 5), min(1.0, float(r.velocidad) / 100.0 + 0.2)]
        for r in pts.itertuples()
    ]


# ---------- Route path ----------
def route_path(ruta_id: int) -> dict:
    pts = get_points()
    r = pts[pts["ruta_id"] == ruta_id]
    if r.empty:
        return {"ruta_id": ruta_id, "puntos": []}
    return {
        "ruta_id": int(ruta_id),
        "dispositivo": str(r["dispositivo"].iloc[0]),
        "fecha": str(r["fecha"].iloc[0]),
        "puntos": [
            {
                "timestamp": t.isoformat() if pd.notna(t) else None,
                "lat": round(float(la), 5),
                "lng": round(float(ln), 5),
                "velocidad": float(v),
                "direccion": d,
            }
            for t, la, ln, v, d in zip(
                r["timestamp"], r["lat"], r["lng"], r["velocidad"], r["direccion"]
            )
        ],
    }


# ---------- Anomalies ----------
def _score_routes(routes: pd.DataFrame) -> pd.DataFrame:
    """Add a `score` column combining z-scores on distance/duration and a speed flag."""
    r = routes.copy()

    def _zscore(x: pd.Series) -> pd.Series:
        s = x.std() or 1.0
        return (x - x.mean()) / s

    r["score"] = (
        np.abs(_zscore(r["distancia_km"]))
        + np.abs(_zscore(r["duracion_min"]))
        + (r["vel_max"] > 120).astype(float) * 2
    )
    return r


def _anomaly_reason(
    vel_max: float,
    distancia: float,
    duracion: float,
    dist_mean: float,
    dist_std: float,
    dur_mean: float,
    dur_std: float,
) -> str:
    reasons: list[str] = []
    if vel_max > 120:
        reasons.append(f"velocidad máxima {vel_max:.0f} km/h")
    if distancia > dist_mean + 2 * dist_std:
        reasons.append("distancia atípica alta")
    if duracion > dur_mean + 2 * dur_std:
        reasons.append("duración atípica alta")
    if not reasons:
        reasons.append("patrón combinado atípico")
    return ", ".join(reasons)


def anomalies(
    limit: int = 30,
    dispositivo: Optional[str] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
) -> list[dict]:
    routes = _apply_filters(get_route_summary(), dispositivo, desde, hasta)
    if routes.empty:
        return []

    scored = _score_routes(routes).sort_values("score", ascending=False).head(limit)

    dist = routes["distancia_km"].to_numpy()
    dur = routes["duracion_min"].to_numpy()
    dist_mean, dist_std = float(dist.mean()), float(dist.std() or 1)
    dur_mean, dur_std = float(dur.mean()), float(dur.std() or 1)

    return [
        {
            "ruta_id": int(row.ruta_id),
            "dispositivo": str(row.dispositivo),
            "fecha": str(row.fecha),
            "distancia_km": float(row.distancia_km),
            "duracion_min": float(row.duracion_min),
            "vel_max": float(row.vel_max),
            "score": round(float(row.score), 2),
            "motivo": _anomaly_reason(
                float(row.vel_max), float(row.distancia_km), float(row.duracion_min),
                dist_mean, dist_std, dur_mean, dur_std,
            ),
        }
        for row in scored.itertuples()
    ]


# ---------- Devices ----------
def device_list() -> list[str]:
    pts = get_points()
    if pts.empty:
        return []
    return sorted(pts["dispositivo"].dropna().unique().tolist())


def date_range() -> dict:
    pts = get_points()
    if pts.empty:
        return {"min": None, "max": None}
    return {"min": str(pts["fecha"].min()), "max": str(pts["fecha"].max())}


# ---------- Per-device ranking ----------
def device_ranking(
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
) -> list[dict]:
    routes = _apply_filters(get_route_summary(), None, desde, hasta)
    if routes.empty:
        return []
    grp = routes.groupby("dispositivo").agg(
        rutas=("ruta_id", "nunique"),
        distancia_km=("distancia_km", "sum"),
        duracion_h=("duracion_min", lambda s: s.sum() / 60.0),
        vel_prom=("vel_prom", "mean"),
        vel_max=("vel_max", "max"),
    ).reset_index().sort_values("distancia_km", ascending=False)
    return [
        {
            "dispositivo": str(r.dispositivo),
            "rutas": int(r.rutas),
            "distancia_km": round(float(r.distancia_km), 2),
            "duracion_h": round(float(r.duracion_h), 2),
            "vel_prom": round(float(r.vel_prom), 2),
            "vel_max": round(float(r.vel_max), 1),
        }
        for r in grp.itertuples()
    ]
