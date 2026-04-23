"""FastAPI router exposing BI telemetry endpoints under /api/bi/*."""
from __future__ import annotations

from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from . import analytics
from .data_loader import get_points, get_route_summary

router = APIRouter(prefix="/api/bi", tags=["business-intelligence"])


@router.get("/health")
def health():
    pts = get_points()
    return {
        "status": "ok",
        "points_loaded": int(len(pts)),
        "routes_loaded": int(get_route_summary().shape[0]),
    }


@router.get("/devices")
def devices():
    return {
        "devices": analytics.device_list(),
        "date_range": analytics.date_range(),
    }


@router.get("/kpis")
def kpis(
    dispositivo: Optional[str] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
):
    return analytics.compute_kpis(dispositivo, desde, hasta)


@router.get("/timeseries")
def timeseries(
    granularity: str = Query("day", pattern="^(day|week|month)$"),
    dispositivo: Optional[str] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
):
    return {
        "granularity": granularity,
        "data": analytics.time_series(granularity, dispositivo, desde, hasta),
    }


@router.get("/top-routes")
def top_routes(
    limit: int = Query(10, ge=1, le=50),
    dispositivo: Optional[str] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
):
    return {"data": analytics.top_routes(limit, dispositivo, desde, hasta)}


@router.get("/histogram")
def histogram(
    metric: str = Query("distancia_km", pattern="^(distancia_km|duracion_min|vel_prom|velocidad)$"),
    bins: int = Query(20, ge=5, le=60),
    dispositivo: Optional[str] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
):
    return {
        "metric": metric,
        "bins": bins,
        "data": analytics.histogram(metric, bins, dispositivo, desde, hasta),
    }


@router.get("/heatmap")
def heatmap(
    sample: int = Query(4000, ge=100, le=20000),
    dispositivo: Optional[str] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
):
    return {"data": analytics.heatmap_points(sample, dispositivo, desde, hasta)}


@router.get("/route/{ruta_id}")
def route(ruta_id: int):
    result = analytics.route_path(ruta_id)
    if not result["puntos"]:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    return result


@router.get("/anomalies")
def anomalies(
    limit: int = Query(30, ge=1, le=200),
    dispositivo: Optional[str] = None,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
):
    return {"data": analytics.anomalies(limit, dispositivo, desde, hasta)}


@router.get("/device-ranking")
def device_ranking(
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
):
    return {"data": analytics.device_ranking(desde, hasta)}
