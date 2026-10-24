#!/usr/bin/env bash
cd "$(dirname "$0")/.." || exit 1
mkdir -p .logs
for pid in $(netstat -ano 2>/dev/null | grep -E ":3000[[:space:]].*LISTENING" | awk '{print $5}' | sort -u); do taskkill //F //T //PID "$pid" >/dev/null 2>&1; done
npx next build > .logs/build.log 2>&1 || { echo "BUILD FAIL"; tail -25 .logs/build.log; exit 1; }
nohup npx next start -p 3000 > .logs/app.log 2>&1 &
for _ in $(seq 1 60); do curl -sf --max-time 3 http://127.0.0.1:3000/api/health >/dev/null && break; sleep 2; done
curl -sf --max-time 3 http://127.0.0.1:3000/api/health >/dev/null && echo "app reloaded" || { echo "app start fail"; tail -15 .logs/app.log; exit 1; }
echo "public (same link): $(cat .logs/public-url.txt 2>/dev/null)"
