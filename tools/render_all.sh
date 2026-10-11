#!/bin/sh
# one round: render both frames, compare sheet, metrics
set -e
cd "$(dirname "$0")/.."
node tools/still.mjs --frame ref --out out/mum_rest_ref.png >/dev/null
node tools/still.mjs --out out/mum_rest.png >/dev/null
node tools/spec_parts.mjs >/dev/null
python3 tools/sheet.py >/dev/null
python3 tools/metrics.py 2>/dev/null | head -1
