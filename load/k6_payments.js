import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 75,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<1000"],
  },
};

const BASE = __ENV.BASE_URL || "http://127.0.0.1:8000";

export default function () {
  const idem = `k6-${__VU}-${__ITER}`;
  const payload = JSON.stringify({
    amount_sats: 1000,
    destination: "ln_demo",
    simulate_latency_ms: 50
  });

  const res = http.post(`${BASE}/payments`, payload, {
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idem
    },
    timeout: "2s",
  });

  check(res, { "status is 200": (r) => r.status === 200 });
  sleep(0.1);
}
