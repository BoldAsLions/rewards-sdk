# Rewards SDK Demo

## Approach
This project demonstrates how I test and validate a rewards or payment SDK where correctness, retries, and failure handling are critical. The focus is on protecting against duplicate charges, handling partial failures such as timeouts, and verifying behavior under concurrent load.

I prioritized payment safety and observability over feature completeness to reflect real-world financial system risks.


## Tools Used
FastAPI for the mock payment API  
Pytest and httpx for functional API testing  
k6 for basic concurrent load testing  
GitHub Actions for CI to run tests on pull requests and block bad merges  


## Trade-offs
The API is intentionally minimal so the repository highlights payment correctness rather than application features.  
In-memory storage is used to keep the project easy to run and review while modeling the same idempotency guarantees enforced by database constraints in production.  
Load testing is lightweight and focused on behavior under concurrency rather than performance benchmarking.


## How to Run

### Start the API
uvicorn app.main:app --reload --port 8000

### Run tests
pytest

### Run load test
k6 run load/k6_payments.js

## What to Look At
Payment creation requires an `Idempotency-Key` header. Retried requests with the same payload return the original result, while reusing a key with different input is rejected.

The test suite includes a timeout-after-commit scenario to demonstrate how retries remain safe even when the client does not receive an initial response.

## Brief Report (Load Test Findings)

### Setup
The payment endpoint was exercised using k6 with 75 concurrent virtual users for 30 seconds. Each request used a unique Idempotency-Key to simulate real payment submissions under load.

### Findings
Under concurrent load, the API handled requests correctly when responsive. When latency or timeouts occurred, clients retried requests, which highlights a critical payment risk: retries can happen even after a transaction has been committed server side.

### Recommendations
Require an Idempotency-Key for all payment creation requests and persist the request fingerprint with the response.  
Reject key reuse with different payloads to prevent duplicate charges.  
Instrument payment lifecycle metrics and alert on retry spikes or timeout after commit scenarios.  
Use bounded retries with backoff in clients and prefer async status checks for long-running operations.


