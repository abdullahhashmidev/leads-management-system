#!/usr/bin/env bash
echo "WARNING: up.sh exposes this app on a public tunnel. Demo or dev only, never with real client data." >&2
cd "$(dirname "$0")/.." || exit 1
mkdir -p .logs .tools
. scripts/lib.sh

echo "[1/5] scoring + alerts run inside the app (no n8n)"

echo "[2/5] app (production build)"
kill_port 3000
if [ ! -f .next/BUILD_ID ] || [ -n "$(find src package.json next.config.ts .env.local -newer .next/BUILD_ID -type f 2>/dev/null | head -1)" ]; then
  npx next build > .logs/build.log 2>&1 || { echo "BUILD FAIL"; tail -25 .logs/build.log; exit 1; }
fi
nohup npx next start -p 3000 > .logs/app.log 2>&1 &
wait_for http://127.0.0.1:3000/api/health app || exit 1

echo "[3/5] public link (verified)"
URL=""
TS=""
for c in tailscale "/c/Program Files/Tailscale/tailscale.exe"; do
  if [ -x "$c" ] || command -v "$c" >/dev/null 2>&1; then TS="$c"; break; fi
done
if [ -n "$TS" ]; then
  ( "$TS" funnel --bg 3000 > .logs/funnel.log 2>&1 & )
  sleep 8
  U=$("$TS" funnel status 2>/dev/null | grep -o 'https://[A-Za-z0-9.-]*\.ts\.net' | head -1)
  if [ -n "$U" ] && wait_public "$U"; then URL="$U"; echo "stable link: Tailscale Funnel"; else echo "Tailscale Funnel ready nahi:"; tail -4 .logs/funnel.log; fi
fi
if [ -z "$URL" ]; then
  echo "quick tunnel (temporary link)"
  CF=".tools/cloudflared.exe"
  [ -s "$CF" ] || { echo "cloudflared download..."; curl -fL --retry 3 -o "$CF" https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe || echo "download fail"; }
  for attempt in 1 2 3; do
    taskkill //F //IM cloudflared.exe >/dev/null 2>&1
    : > .logs/tunnel.log
    nohup "$CF" tunnel --no-autoupdate --protocol http2 --url http://127.0.0.1:3000 > .logs/tunnel.log 2>&1 &
    U=""
    for _ in $(seq 1 25); do
      U=$(grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' .logs/tunnel.log | grep -v '^https://api\.' | head -1)
      [ -n "$U" ] && break
      grep -q "failed to request quick Tunnel" .logs/tunnel.log && break
      sleep 2
    done
    if [ -n "$U" ] && wait_public "$U"; then URL="$U"; break; fi
    echo "attempt $attempt fail: $(grep -m1 -E 'failed|ERR' .logs/tunnel.log | cut -c1-160)"
  done
fi
if [ -n "$URL" ]; then
  echo "$URL" > .logs/public-url.txt
else
  rm -f .logs/public-url.txt
  echo "PUBLIC LINK FAIL - diagnostics:"
  nslookup api.trycloudflare.com 2>&1 | tail -4
  curl -s -o /dev/null -w "api.trycloudflare.com HTTPS: %{http_code}
" --max-time 8 https://api.trycloudflare.com/
fi

echo "[4/5] checks"
npm run -s doctor 2>&1 | grep -E "❌|PASS|FAIL"
npm run -s e2e:chat 2>&1 | tail -2
npm run -s e2e:form 2>&1 | tail -6
npm run -s e2e:card 2>&1 | tail -6
if [ -n "$URL" ]; then
  for p in / /summer-camp /admin/login; do printf 'public %-14s HTTP %s
' "$p" "$(pubcode "$URL$p")"; done
fi

echo "[5/5] phone"
if [ -n "$URL" ]; then
  T=$(envv NTFY_TOPIC); case "$T" in http*) ;; *) T="https://ntfy.sh/$T";; esac
  curl -s -o /dev/null -H "Title: Leads system live (verified)" -H "Click: $URL/admin" -d "Online: $URL/  |  Camp: $URL/summer-camp  |  Owner: $URL/admin" "$T" && echo "ntfy bhej diya"
fi
[ "$(envv ADMIN_PASSWORD | wc -c)" -ge 13 ] || echo "WARN: ADMIN_PASSWORD chhota hai, 12+ chars rakho"
echo
if [ -n "$URL" ]; then
  echo "============ PUBLIC LINKS (verified live) ============"
  echo " Online page  : $URL/"
  echo " Summer camp  : $URL/summer-camp"
  echo " Owner panel  : $URL/admin"
  echo "======================================================"
else
  echo "======= NO PUBLIC LINK. Client demo laptop pe localhost se karo ======="
  echo " Online page  : http://localhost:3000/"
  echo " Summer camp  : http://localhost:3000/summer-camp"
  echo " Owner panel  : http://localhost:3000/admin"
  echo "======================================================================="
fi
