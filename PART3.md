# Part 3 Problem Solving

## Scenario 1: A critical bug in production—Lightning payments occasionally fail with timeout but users are still charged (1% normally, 5% during traffic spikes).

### How I would reproduce it
Simulate latency so the client times out while the backend still completes the Lightning payment.  Run the same flow under concurrency to recreate traffic spike behavior.  Confirm the bad state by comparing client response errors with backend settlement or payment status.

### What testing gap allowed it
We were not covering timeout after commit paths under load.  Happy path and clean failures pass, but network boundary failures plus retries are where duplicate charge risk lives.  Testing likely ran with low latency so the mismatch rarely appeared.

### Prevention going forward
Require Idempotency Key for all payment creation and persist the final outcome per request fingerprint.  
On retry, return the original result. Reject key reuse with different payloads.  
Expose payment status lookup and add reconciliation checks.  
Add load tests that include timeouts and retry behavior. Alert on mismatch between client error rate and settled payments.

## Scenario 2: You're starting as the first QA engineer at ZBD (Bitcoin/Lightning payment platform with mobile apps and APIs).

### First 30 days
Week 1: map money in and money out flows end to end across mobile and APIs. Review incidents and support patterns.  
Week 2: identify the highest risk gaps and define a small set of non negotiable checks for payment changes.  
Week 3: implement smoke tests and idempotency coverage in CI for payment critical paths.  
Week 4: expand a focused regression suite around payments auth balances withdrawals and reconciliation.

### Speed vs coverage
Risk based.  Smoke tests on every PR. Payment critical gates only where money moves.  Deeper suite runs nightly. Manual testing used for UX and complex edge cases, not repeatable API logic.

### Testing with real money
Default to sandbox and test networks.  Use real money only as controlled canaries with tiny capped amounts using QA only accounts.  Every canary is logged and reconciled. Real money tests validate assumptions, not correctness.