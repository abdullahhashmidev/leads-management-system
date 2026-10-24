#!/usr/bin/env bash
for port in 3000 5678; do for pid in $(netstat -ano 2>/dev/null | grep -E ":$port[[:space:]].*LISTENING" | awk '{print $5}' | sort -u); do taskkill //F //T //PID "$pid" >/dev/null 2>&1; done; done
taskkill //F //IM cloudflared.exe >/dev/null 2>&1
echo "all stopped"
