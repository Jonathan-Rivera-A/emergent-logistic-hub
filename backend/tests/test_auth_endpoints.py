"""Integration tests for the auth module (local login, rate limiting, BI protection)."""
import os
import time

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8001").rstrip("/")
AUTH = f"{BASE_URL}/api/auth"
BI = f"{BASE_URL}/api/bi"

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@forjatec.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "fojatec11553")


@pytest.fixture(scope="function")
def fresh_session():
    """Fresh session so rate-limit counters don't bleed across tests."""
    s = requests.Session()
    s.headers.update({"Accept": "application/json"})
    yield s


@pytest.fixture(scope="module")
def admin_token():
    """Single login per module to stay well under the 5/min rate limit.
    Retries after 65s if the rate-limit test already consumed the budget."""
    for attempt in range(2):
        r = requests.post(
            f"{AUTH}/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=5,
        )
        if r.status_code == 200:
            return r.json()["access_token"]
        if r.status_code == 429 and attempt == 0:
            time.sleep(65)
            continue
        raise AssertionError(f"admin login failed: {r.status_code} {r.text}")
    raise AssertionError("admin login failed after retry")


class TestHealth:
    def test_auth_health(self, fresh_session):
        r = fresh_session.get(f"{AUTH}/health", timeout=5)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "ok"
        assert "supabase_configured" in d


class TestLogin:
    def test_login_success(self, fresh_session):
        r = fresh_session.post(
            f"{AUTH}/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=5,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["token_type"] == "bearer"
        assert d["access_token"].count(".") == 2  # JWT 3-part
        assert d["user"]["email"] == ADMIN_EMAIL.lower()
        assert d["user"]["is_admin"] is True

    def test_login_wrong_password(self, fresh_session):
        r = fresh_session.post(
            f"{AUTH}/login",
            json={"email": ADMIN_EMAIL, "password": "not-the-password"},
            timeout=5,
        )
        assert r.status_code == 401

    def test_login_unknown_email(self, fresh_session):
        r = fresh_session.post(
            f"{AUTH}/login",
            json={"email": "nobody@example.com", "password": "whatever"},
            timeout=5,
        )
        assert r.status_code == 401

    def test_login_bad_payload_rejected(self, fresh_session):
        """Pydantic whitelist: extra fields must be rejected (NoSQL-injection defence)."""
        r = fresh_session.post(
            f"{AUTH}/login",
            json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD,
                "$ne": "admin",
            },
            timeout=5,
        )
        assert r.status_code == 422

    def test_login_invalid_email(self, fresh_session):
        r = fresh_session.post(
            f"{AUTH}/login",
            json={"email": "not-an-email", "password": "123456"},
            timeout=5,
        )
        assert r.status_code == 422


class TestRateLimit:
    def test_login_rate_limit(self):
        """5 requests/min limit on /api/auth/login. Use a throwaway session."""
        s = requests.Session()
        results = []
        for _ in range(8):
            r = s.post(
                f"{AUTH}/login",
                json={"email": "burn@example.com", "password": "burnburn"},
                timeout=5,
            )
            results.append(r.status_code)
            time.sleep(0.05)
        # Some 401 for invalid creds, then at least one 429 after 5 attempts
        assert 429 in results, f"Expected 429 in results, got {results}"


class TestMeAndProtected:
    def test_me_requires_token(self, fresh_session):
        r = fresh_session.get(f"{AUTH}/me", timeout=5)
        assert r.status_code == 401

    def test_me_with_token(self, fresh_session, admin_token):
        r = fresh_session.get(
            f"{AUTH}/me",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert r.status_code == 200
        u = r.json()
        assert u["email"] == ADMIN_EMAIL.lower()
        assert u["provider"] == "local"
        assert u["is_admin"] is True

    def test_bi_requires_auth(self, fresh_session):
        r = fresh_session.get(f"{BI}/health", timeout=5)
        assert r.status_code == 401

    def test_bi_accessible_with_token(self, fresh_session, admin_token):
        r = fresh_session.get(
            f"{BI}/health",
            headers={"Authorization": f"Bearer {admin_token}"},
            timeout=5,
        )
        assert r.status_code == 200

    def test_bi_rejects_tampered_token(self, fresh_session, admin_token):
        """A JWT with a flipped byte must be rejected (signature mismatch)."""
        bad = admin_token[:-2] + ("AA" if admin_token[-2:] != "AA" else "BB")
        r = fresh_session.get(
            f"{BI}/health",
            headers={"Authorization": f"Bearer {bad}"},
            timeout=5,
        )
        assert r.status_code == 401


class TestGoogleExchange:
    def test_without_supabase_config_or_bad_token(self, fresh_session):
        """With a fake token: should respond 401 or 503 (never 200)."""
        r = fresh_session.post(
            f"{AUTH}/google-exchange",
            json={"access_token": "fake-token-1234567890"},
            timeout=5,
        )
        assert r.status_code in (401, 503)
