#!/usr/bin/env bash
# Apply browser upload CORS rules to the R2 bucket.
set -euo pipefail

: "${R2_ACCOUNT_ID:?Set R2_ACCOUNT_ID}"
: "${R2_ACCESS_KEY_ID:?Set R2_ACCESS_KEY_ID}"
: "${R2_SECRET_ACCESS_KEY:?Set R2_SECRET_ACCESS_KEY}"
: "${R2_BUCKET:?Set R2_BUCKET}"

node "$(cd "$(dirname "$0")" && pwd)/apply-r2-cors.mjs"
