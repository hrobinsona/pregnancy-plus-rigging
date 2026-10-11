#!/bin/sh
# copy exactly the critic's inputs into review/roundN/
set -e
cd "$(dirname "$0")/.."
d=review/round$1; mkdir -p $d
cp out/mum_compare.png out/metrics.txt characters/mum/spec.md $d/
echo $d
