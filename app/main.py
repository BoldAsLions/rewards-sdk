from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
import uuid
import time
import hashlib
import json

app = FastAPI(title="Rewards SDK Demo")

IDEMPOTENCY: Dict[str, Dict[str, Any]] = {}
PAYMENTS: Dict[str, Dict[str, Any]] = {}

class PaymentRequest(BaseModel):
    amount_sats: int = Field(..., gt=0, le=10_000_000)
    destination: str = Field(..., min_length=3)
    simulate_timeout_after_commit: bool = False
    simulate_latency_ms: int = Field(0, ge=0, le=30_000)

def fingerprint(payload: dict) -> str:
    raw = json.dumps(payload, sort_keys=True).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/payments")
def create_payment(
    req: PaymentRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"), 
):
    if not idempotency_key:
        raise HTTPException(status_code=400, detail="Idempotency-Key required")

    req_dict = req.model_dump()
    req_hash = fingerprint(req_dict)

    existing = IDEMPOTENCY.get(idempotency_key)
    if existing:
        if existing["req_hash"] == req_hash:
            return existing["response"]
        raise HTTPException(status_code=409, detail="Idempotency key reused with different payload")

    if req.simulate_latency_ms:
        time.sleep(req.simulate_latency_ms / 1000.0)

    payment_id = str(uuid.uuid4())
    payment = {
        "payment_id": payment_id,
        "status": "SUCCEEDED",
        "amount_sats": req.amount_sats,
        "destination": req.destination,
    }
    PAYMENTS[payment_id] = payment

    response = {"payment_id": payment_id, "status": payment["status"]}
    IDEMPOTENCY[idempotency_key] = {"req_hash": req_hash, "response": response}

    if req.simulate_timeout_after_commit:
        time.sleep(2)
        raise HTTPException(status_code=504, detail="Gateway timeout simulated after commit")

    return response

@app.get("/payments/{payment_id}")
def get_payment(payment_id: str):
    p = PAYMENTS.get(payment_id)
    if not p:
        raise HTTPException(status_code=404, detail="Not found")
    return p
