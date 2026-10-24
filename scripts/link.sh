#!/usr/bin/env bash
cd "$(dirname "$0")/.." || exit 1
. scripts/lib.sh
U=$(cat .logs/public-url.txt 2>/dev/null)
[ -n "$U" ] || { echo "koi verified public link nahi, pehle: npm run up"; exit 1; }
c=$(pubcode "$U/api/health")
if [ "$c" = 200 ]; then echo "LIVE  $U/   (owner: $U/admin)"; else echo "DEAD (HTTP $c)  $U   -> npm run up chalao"; exit 1; fi
