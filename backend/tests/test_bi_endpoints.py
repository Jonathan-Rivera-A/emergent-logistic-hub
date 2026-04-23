"""Backend BI endpoints integration tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://bi-dashboard-28.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api/bi"

EXPECTED_DEVICES = {
    "ARMANDO", "Cepillo", "DON SERGIO", "HUEVO CAMIÓN ROJO",
    "Kw gallinero Wetrack Lite-61815", "PETERBILT VL03-85509",
    "ROJO KWetrack Lite-60684", "TEODORO",
}


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Accept": "application/json"})
    return s


# -------- Health --------
class TestHealth:
    def test_health_ok(self, session):
        r = session.get(f"{API}/health", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "ok"
        assert d["points_loaded"] > 0
        assert d["routes_loaded"] > 0
        assert d["points_loaded"] >= 100000
        assert d["routes_loaded"] >= 700


# -------- Devices --------
class TestDevices:
    def test_devices_list(self, session):
        r = session.get(f"{API}/devices", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["devices"], list)
        assert len(d["devices"]) == 8
        assert set(d["devices"]) == EXPECTED_DEVICES
        dr = d["date_range"]
        assert "min" in dr and "max" in dr
        assert dr["min"] is not None and dr["max"] is not None


# -------- KPIs --------
class TestKpis:
    REQUIRED_FIELDS = {
        "total_rutas", "total_puntos", "total_dispositivos",
        "distancia_km", "duracion_horas", "vel_prom", "vel_max",
        "anomalias", "detenciones",
    }

    def test_kpis_default(self, session):
        r = session.get(f"{API}/kpis", timeout=30)
        assert r.status_code == 200
        d = r.json()
        missing = self.REQUIRED_FIELDS - set(d.keys())
        assert not missing, f"Missing KPI fields: {missing}"
        for f in self.REQUIRED_FIELDS:
            assert isinstance(d[f], (int, float)), f"{f} not numeric"
        assert d["total_rutas"] > 0
        assert d["total_puntos"] > 0
        assert d["total_dispositivos"] == 8

    def test_kpis_filter_device(self, session):
        r = session.get(f"{API}/kpis", params={"dispositivo": "ARMANDO"}, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["total_dispositivos"] == 1
        assert d["total_rutas"] > 0

        # Verify filtering reduces totals
        r_all = session.get(f"{API}/kpis", timeout=30).json()
        assert d["total_puntos"] < r_all["total_puntos"]

    def test_kpis_filter_date(self, session):
        r = session.get(
            f"{API}/kpis",
            params={"desde": "2025-11-01", "hasta": "2025-11-30"},
            timeout=30,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["total_rutas"] >= 0
        assert d["total_puntos"] >= 0


# -------- Timeseries --------
class TestTimeseries:
    @pytest.mark.parametrize("granularity", ["day", "week", "month"])
    def test_timeseries_granularity(self, session, granularity):
        r = session.get(f"{API}/timeseries", params={"granularity": granularity}, timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert body["granularity"] == granularity
        data = body["data"]
        assert isinstance(data, list)
        assert len(data) > 0
        sample = data[0]
        assert "fecha" in sample

    def test_timeseries_invalid(self, session):
        r = session.get(f"{API}/timeseries", params={"granularity": "year"}, timeout=30)
        assert r.status_code == 422


# -------- Top routes --------
class TestTopRoutes:
    def test_top_routes_valid_coords(self, session):
        r = session.get(f"{API}/top-routes", params={"limit": 10}, timeout=30)
        assert r.status_code == 200
        data = r.json()["data"]
        assert isinstance(data, list)
        assert len(data) > 0
        for route in data:
            assert "viajes" in route
            assert route["viajes"] > 0
            # Make sure no zero-zero coords
            for key in ("origen_lat", "origen_lng", "destino_lat", "destino_lng"):
                if key in route:
                    assert route[key] != 0, f"Route has 0 in {key}: {route}"


# -------- Histogram --------
class TestHistogram:
    @pytest.mark.parametrize("metric", ["distancia_km", "duracion_min", "velocidad"])
    def test_histogram_valid_metrics(self, session, metric):
        r = session.get(f"{API}/histogram", params={"metric": metric}, timeout=30)
        assert r.status_code == 200
        body = r.json()
        assert body["metric"] == metric
        assert isinstance(body["data"], list)
        assert len(body["data"]) > 0
        bin0 = body["data"][0]
        assert "bin" in bin0 or "count" in bin0

    def test_histogram_invalid_metric(self, session):
        r = session.get(f"{API}/histogram", params={"metric": "foo"}, timeout=30)
        assert r.status_code == 422


# -------- Heatmap --------
class TestHeatmap:
    def test_heatmap_default(self, session):
        r = session.get(f"{API}/heatmap", params={"sample": 500}, timeout=30)
        assert r.status_code == 200
        data = r.json()["data"]
        assert isinstance(data, list)
        assert len(data) > 0
        sample = data[0]
        assert isinstance(sample, list)
        assert len(sample) == 3
        lat, lng, intensity = sample
        assert -90 <= lat <= 90
        assert -180 <= lng <= 180

    def test_heatmap_sample_too_low(self, session):
        r = session.get(f"{API}/heatmap", params={"sample": 50}, timeout=30)
        assert r.status_code == 422


# -------- Anomalies --------
class TestAnomalies:
    def test_anomalies_default(self, session):
        r = session.get(f"{API}/anomalies", params={"limit": 10}, timeout=30)
        assert r.status_code == 200
        data = r.json()["data"]
        assert isinstance(data, list)
        if data:
            a = data[0]
            for key in ("score", "motivo", "vel_max"):
                assert key in a, f"Missing {key} in anomaly"


# -------- Device ranking --------
class TestDeviceRanking:
    def test_ranking(self, session):
        r = session.get(f"{API}/device-ranking", timeout=30)
        assert r.status_code == 200
        data = r.json()["data"]
        assert isinstance(data, list)
        assert len(data) == 8
        # Should be sorted by km desc
        kms = [d["distancia_km"] for d in data]
        assert kms == sorted(kms, reverse=True), "Ranking not sorted by km desc"


# -------- Single route --------
class TestRoute:
    def test_route_existing(self, session):
        r = session.get(f"{API}/route/0", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "puntos" in d
        assert isinstance(d["puntos"], list)
        assert len(d["puntos"]) > 0

    def test_route_not_found(self, session):
        r = session.get(f"{API}/route/9999999", timeout=30)
        assert r.status_code == 404
