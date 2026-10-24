envv(){ grep "^$1=" .env.local | head -1 | cut -d= -f2- | tr -d '\r"'; }
alive(){ curl -sf --max-time 3 "$1" >/dev/null 2>&1; }
wait_for(){ for _ in $(seq 1 90); do alive "$1" && return 0; sleep 2; done; echo "TIMEOUT: $2 start nahi hua (.logs dekho)"; return 1; }
kill_port(){ for pid in $(netstat -ano 2>/dev/null | grep -E ":$1[[:space:]].*LISTENING" | awk '{print $5}' | sort -u); do taskkill //F //T //PID "$pid" >/dev/null 2>&1; done; }
# HTTP status of a public URL, resolved via Cloudflare DoH (ignores this PC's DNS cache)
pubcode(){
  local u="$1" h ip
  h="${u#https://}"; h="${h%%/*}"
  ip=$(curl -s --max-time 8 -H 'accept: application/dns-json' "https://cloudflare-dns.com/dns-query?name=$h&type=A" | grep -o '"data":"[0-9.]*"' | head -1 | grep -o '[0-9][0-9.]*')
  if [ -n "$ip" ]; then curl -s -o /dev/null -w '%{http_code}' --max-time 10 --resolve "$h:443:$ip" "$u"
  else curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$u"; fi
}
wait_public(){ for _ in $(seq 1 20); do [ "$(pubcode "$1/api/health")" = 200 ] && return 0; sleep 3; done; return 1; }
