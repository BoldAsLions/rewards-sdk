from httpx import Client

BASE_URL = "http://127.0.0.1:8000"

def test_health():
    with Client(base_url=BASE_URL) as c:
        r = c.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

def test_happy_path_payment():
    with Client(base_url=BASE_URL) as c:
        r = c.post(
            "/payments",
            headers={"Idempotency-Key": "t1"},
            json={"amount_sats": 1000, "destination": "ln_demo"},
            timeout=2.0,
        )
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "SUCCEEDED"
        assert "payment_id" in body

def test_missing_idempotency_key_rejected():
    with Client(base_url=BASE_URL) as c:
        r = c.post("/payments", json={"amount_sats": 1000, "destination": "ln_demo"})
        assert r.status_code == 400

def test_idempotent_retry_same_payload_returns_same_payment_id():
    with Client(base_url=BASE_URL) as c:
        payload = {"amount_sats": 2000, "destination": "ln_demo"}
        r1 = c.post("/payments", headers={"Idempotency-Key": "t2"}, json=payload)
        r2 = c.post("/payments", headers={"Idempotency-Key": "t2"}, json=payload)
        assert r1.status_code == 200
        assert r2.status_code == 200
        assert r1.json()["payment_id"] == r2.json()["payment_id"]

def test_idempotency_key_reuse_with_different_payload_conflicts():
    with Client(base_url=BASE_URL) as c:
        r1 = c.post(
            "/payments",
            headers={"Idempotency-Key": "t3"},
            json={"amount_sats": 3000, "destination": "ln_demo"},
        )
        r2 = c.post(
            "/payments",
            headers={"Idempotency-Key": "t3"},
            json={"amount_sats": 9999, "destination": "ln_demo"},
        )
        assert r1.status_code == 200
        assert r2.status_code == 409

def test_timeout_after_commit_retry_is_safe():
    with Client(base_url=BASE_URL) as c:
        payload = {"amount_sats": 4000, "destination": "ln_demo", "simulate_timeout_after_commit": True}

        r1 = c.post("/payments", headers={"Idempotency-Key": "t4"}, json=payload, timeout=5.0)
        assert r1.status_code == 504

        r2 = c.post("/payments", headers={"Idempotency-Key": "t4"}, json=payload, timeout=2.0)
        assert r2.status_code == 200
        assert "payment_id" in r2.json()
