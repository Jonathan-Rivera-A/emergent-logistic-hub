"""FastAPI router exposing BI telemetry endpoints under /api/bi/*. Rate-limited 60/min."""
from datetime import date
from typing import Optional

from fastapi import APIRouter, HTTPException, Path, Query, Request

from rate_limit import limiter
from . import analytics
from .data_loader import get_points, get_route_summary

router = APIRouter(prefix="/api/bi", tags=["business-intelligence"])
BI_LIMIT = "60/minute"


@router.get("/health")
@limiter.limit(BI_LIMIT)
def health(request: Request):
    pts = get_points()
    return {
        "status": "ok",
        "points_loaded": int(len(pts)),
        "routes_loaded": int(get_route_summary().shape[0]),
    }


@router.get("/devices")
@limiter.limit(BI_LIMIT)
def devices(request: Request):
    return {
        "devices": analytics.device_list(),
        "date_range": analytics.date_range(),
    }


@router.get("/kpis")
@limiter.limit(BI_LIMIT)
def kpis(
    request: Request,
    dispositivo: Optional[str] = Query(None, max_length=100, pattern=r"^[\w\s.\-\u00c0-\u017f]+$"),
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
):
    return analytics.compute_kpis(dispositivo, desde, hasta)


@router.get("/timeseries")
@limiter.limit(BI_LIMIT)
def timeseries(
    request: Request,
    granularity: str = Query("day", pattern="^(day|week|month)$"),
    dispositivo: Optional[str] = Query(None, max_length=100, pattern=r"^[\w\s.\-\u00c0-\u017f]+$"),
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
):
    return {
        "granularity": granularity,
        "data": analytics.time_series(granularity, dispositivo, desde, hasta),
    }


@router.get("/top-routes")
@limiter.limit(BI_LIMIT)
def top_routes(
    request: Request,
    limit: int = Query(10, ge=1, le=50),
    dispositivo: Optional[str] = Query(None, max_length=100, pattern=r"^[\w\s.\-\u00c0-\u017f]+$"),
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
):
    return {"data": analytics.top_routes(limit, dispositivo, desde, hasta)}


@router.get("/histogram")
@limiter.limit(BI_LIMIT)
def histogram(
    request: Request,
    metric: str = Query("distancia_km", pattern="^(distancia_km|duracion_min|vel_prom|velocidad)$"),
    bins: int = Query(20, ge=5, le=60),
    dispositivo: Optional[str] = Query(None, max_length=100, pattern=r"^[\w\s.\-\u00c0-\u017f]+$"),
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
):
    return {
        "metric": metric,
        "bins": bins,
        "data": analytics.histogram(metric, bins, dispositivo, desde, hasta),
    }


@router.get("/heatmap")
@limiter.limit(BI_LIMIT)
def heatmap(
    request: Request,
    sample: int = Query(4000, ge=100, le=20000),
    dispositivo: Optional[str] = Query(None, max_length=100, pattern=r"^[\w\s.\-\u00c0-\u017f]+$"),
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
):
    return {"data": analytics.heatmap_points(sample, dispositivo, desde, hasta)}


@router.get("/route/{ruta_id}")
@limiter.limit(BI_LIMIT)
def route(request: Request, ruta_id: int = Path(..., ge=0, le=10_000_000)):
    result = analytics.route_path(ruta_id)
    if not result["puntos"]:
        raise HTTPException(status_code=404, detail="Ruta no encontrada")
    return result


@router.get("/anomalies")
@limiter.limit(BI_LIMIT)
def anomalies(
    request: Request,
    limit: int = Query(30, ge=1, le=200),
    dispositivo: Optional[str] = Query(None, max_length=100, pattern=r"^[\w\s.\-\u00c0-\u017f]+$"),
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
):
    return {"data": analytics.anomalies(limit, dispositivo, desde, hasta)}


@router.get("/device-ranking")
@limiter.limit(BI_LIMIT)
def device_ranking(
    request: Request,
    desde: Optional[date] = None,
    hasta: Optional[date] = None,
):
    return {"data": analytics.device_ranking(desde, hasta)}
