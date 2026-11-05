#!/usr/bin/env bash
# Test TomTom Matrix API v2 with failing pairs from logs.
# Usage: ./scripts/test-tomtom-matrix-request.sh
# Or:    TOMTOM_API_KEY=your_key ./scripts/test-tomtom-matrix-request.sh
# Output: full JSON response (use jq to format; if jq missing, remove "| jq .")

set -e
cd "$(dirname "$0")/.."
if [ -f .env ]; then set -a; source .env; set +a; fi

API_KEY="${TOMTOM_API_KEY:?Set TOMTOM_API_KEY in .env or pass: TOMTOM_API_KEY=xxx ./scripts/test-tomtom-matrix-request.sh}"

# Next Monday 8:00 AM (ISO) - or use fixed date for reproducibility
DEPART_AT="2026-03-02T14:00:00.000Z"

# Request 2 from logs: several origins, one destination
# Origin 0: (38.38459957808583, -85.8124525543453)
# Origin 1: (38.31809521740334, -85.87391190120454)
# Destination: (38.094178979318286, -85.74252560734749)
# Failing pairs: origin 0 -> dest, origin 1 -> dest

curl -s -X POST "https://api.tomtom.com/routing/matrix/2?key=${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
  \"origins\": [
    { \"point\": { \"latitude\": 38.38459957808583, \"longitude\": -85.8124525543453 } },
    { \"point\": { \"latitude\": 38.31809521740334, \"longitude\": -85.87391190120454 } }
  ],
  \"destinations\": [
    { \"point\": { \"latitude\": 38.094178979318286, \"longitude\": -85.74252560734749 } }
  ],
  \"options\": {
    \"travelMode\": \"car\",
    \"routeType\": \"fastest\",
    \"traffic\": \"historical\",
    \"departAt\": \"${DEPART_AT}\"
  }
}" | jq .
