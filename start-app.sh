#!/usr/bin/env bash
# ============================================================
# start-app.sh — Single entry point for the Store Management System
#
#   ./start-app.sh               Start backend (if needed) + open browser
#   ./start-app.sh --no-browser  Start backend only (used by login autostart)
#   ./start-app.sh status        Show running state
#   ./start-app.sh stop          Graceful stop (SIGINT, then SIGKILL fallback)
#   ./start-app.sh restart       stop + start
#
# - Idempotent: already running -> skips start (no double instance)
# - Stale PID files reconciled against a live health check
# - Logs: backend/logs/server.out.log + server.err.log (rotated on start)
# - Single-port mode: backend serves frontend/dist on :5000
# ============================================================

set -uo pipefail

# --- Paths (spaces-safe: repo lives under "linux data/Documents/...") ---
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
ROOT="$SCRIPT_DIR"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
LOG_DIR="$BACKEND/logs"
PID_FILE="$LOG_DIR/server.pid"
ERR_LOG="$LOG_DIR/server.err.log"
ERR_OLD="$LOG_DIR/server.err.log.old"
OUT_LOG="$LOG_DIR/server.out.log"

PORT=5000
HEALTH_URL="http://127.0.0.1:${PORT}/api/health"
BOOT_TIMEOUT=30   # cold boot can take 6-20s

mkdir -p "$LOG_DIR"

log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

# Desktop notification (needed because .desktop runs with Terminal=false —
# stdout is invisible on double-click; failures must surface somehow)
notify() { # $1=title  $2=body  $3=urgency(normal|critical)
  local title="$1" body="$2" urgency="${3:-normal}"
  if command -v notify-send >/dev/null 2>&1; then
    notify-send -u "$urgency" -i store-management "$title" "$body" >/dev/null 2>&1 || true
  elif command -v kdialog >/dev/null 2>&1; then
    kdialog --title "$title" --passivepopup "$body" 10 >/dev/null 2>&1 || true
  fi
}

# --- Read PORT from backend/.env if configured ---
if [[ -f "$BACKEND/.env" ]]; then
  env_port=$(grep -E '^[[:space:]]*PORT=' "$BACKEND/.env" | head -1 | tr -d '"' | cut -d= -f2 | tr -d '[:space:]')
  if [[ "$env_port" =~ ^[0-9]+$ ]]; then
    PORT="$env_port"
    HEALTH_URL="http://127.0.0.1:${PORT}/api/health"
  fi
fi

# --- Health: live backend answers within 2s ---
is_up() {
  curl -s -m 2 -o /dev/null -w '%{http_code}' "$HEALTH_URL" 2>/dev/null | grep -q '^200$'
}

# PID file may hold several pids (wrapper + child) — space separated
read_pids() {
  [[ -f "$PID_FILE" ]] || return 1
  local pids pid ok=""
  pids=$(cat "$PID_FILE" 2>/dev/null)
  for pid in $pids; do
    [[ "$pid" =~ ^[0-9]+$ ]] || continue
    kill -0 "$pid" 2>/dev/null && ok="$ok $pid"
  done
  ok=${ok# }
  [[ -n "$ok" ]] || return 1
  printf '%s' "$ok"
}

# All currently known backend pids: pidfile first, then process scan
all_pids() {
  local p=""
  p=$(read_pids 2>/dev/null || true)
  if [[ -z "$p" ]]; then
    p=$(find_pids)
  else
    # merge with scan (child may have been reparented after wrapper death)
    local scanned; scanned=$(find_pids)
    for pid in $scanned; do
      case " $p " in *" $pid "*) ;; *) p="$p $pid" ;; esac
    done
  fi
  printf '%s' "$p"
}

# Fallback when PID file is missing/stale: all pids of our backend
# (npx wrapper + actual node child both match — kill ALL of them)
find_pids() {
  pgrep -f 'ts-node.*src/index\.ts' 2>/dev/null | tr '\n' ' ' | sed 's/ *$//'
}

wait_healthy() {
  local deadline=$((SECONDS + BOOT_TIMEOUT))
  while (( SECONDS < deadline )); do
    is_up && return 0
    sleep 1
  done
  return 1
}

start_backend() {
  if is_up; then
    log "Backend already running on port $PORT — skipping start."
    return 0
  fi

  if [[ ! -d "$BACKEND" ]]; then
    log "ERROR: backend directory not found: $BACKEND"
    notify "Store Management — startup failed" "Backend directory not found: $BACKEND" critical
    return 1
  fi
  if ! command -v node >/dev/null 2>&1; then
    log "ERROR: 'node' not found in PATH (install Node.js 18+)."
    notify "Store Management — startup failed" "'node' not found — install Node.js 18+" critical
    return 1
  fi
  if [[ ! -d "$BACKEND/node_modules" ]]; then
    log "ERROR: backend/node_modules missing — run: cd backend && npm install"
    notify "Store Management — startup failed" "Dependencies missing — run: cd backend && npm install" critical
    return 1
  fi

  if [[ ! -f "$FRONTEND/dist/index.html" ]]; then
    log "WARN: frontend/dist missing — API-only mode."
    log "      Build the UI with: cd frontend && npm install && npm run build"
  fi

  # Rotate previous logs (keep one generation)
  [[ -f "$ERR_LOG" ]] && { rm -f "$ERR_OLD"; mv -f "$ERR_LOG" "$ERR_OLD"; }
  : > "$ERR_LOG"
  : > "$OUT_LOG"

  # Clear stale PID file
  rm -f "$PID_FILE"

  log "Starting backend (port $PORT)..."
  (
    cd "$BACKEND" || exit 1
    # setsid: detach from this shell so the backend survives the launcher exiting
    nohup setsid npx ts-node src/index.ts >>"$OUT_LOG" 2>>"$ERR_LOG" < /dev/null &
    echo $! > "$PID_FILE"
  )
  sleep 1

  if wait_healthy; then
    # Record ALL pids (npx wrapper + node child) — stop must kill both
    sleep 1
    local spawned fallback
    spawned=$(find_pids)
    if [[ -n "$spawned" ]]; then
      printf '%s' "$spawned" > "$PID_FILE"
    fi
    fallback=$(cat "$PID_FILE" 2>/dev/null || echo '?')
    log "Backend up on port $PORT (pid ${spawned:-$fallback})."
    return 0
  fi

  log "Backend failed to become healthy within ${BOOT_TIMEOUT}s. Last errors:"
  tail -n 20 "$ERR_LOG" 2>/dev/null | sed 's/^/    /'
  notify "Store Management — startup failed" \
    "Backend did not start within ${BOOT_TIMEOUT}s. Open: backend/logs/server.err.log" critical
  return 1
}

stop_backend() {
  local pids
  pids=$(all_pids)

  if [[ -z "$pids" ]]; then
    if is_up; then
      log "Something else is serving port $PORT (pid unknown) — not killing it."
      return 1
    fi
    log "Backend is not running."
    rm -f "$PID_FILE"
    return 0
  fi

  log "Stopping backend (pids: $pids)..."

  # Graceful first — SIGINT lets index.ts run its shutdown hook
  for pid in $pids; do kill -INT "$pid" 2>/dev/null; done
  for _ in $(seq 1 10); do
    local alive=""
    for pid in $pids; do kill -0 "$pid" 2>/dev/null && alive="$alive $pid"; done
    [[ -z "${alive// /}" ]] && break
    sleep 1
  done

  # Force anything left (also catch freshly-reparented children)
  local remaining; remaining=$(all_pids)
  if [[ -n "$remaining" ]]; then
    log "Still alive — sending SIGKILL (pids: $remaining)."
    for pid in $remaining; do kill -KILL "$pid" 2>/dev/null; done
    sleep 2
  fi

  rm -f "$PID_FILE"

  # Final check: port must be free (allow 3s for TIME_WAIT-style lag)
  for _ in $(seq 1 3); do
    is_up || break
    sleep 1
  done
  if is_up; then
    log "ERROR: port $PORT still answering after stop (pids now: $(find_pids))."
    notify "Store Management — stop failed" \
      "Port $PORT still in use. Run: ./start-app.sh status" critical
    return 1
  fi
  log "Backend stopped."
  return 0
}

open_browser() {
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "http://localhost:$PORT" >/dev/null 2>&1 &
    disown
    log "Browser -> http://localhost:$PORT"
  else
    log "xdg-open not found — open manually: http://localhost:$PORT"
  fi
}

print_status() {
  if is_up; then
    local pids; pids=$(all_pids)
    echo "running  port=$PORT  pid=${pids:-?}  http://localhost:$PORT"
  else
    echo "stopped  port=$PORT"
  fi
}

# --- Arg parsing ---
OPEN_BROWSER=1
ACTION="start"
for arg in "$@"; do
  case "$arg" in
    --no-browser) OPEN_BROWSER=0 ;;
    stop|start|restart|status) ACTION="$arg" ;;
    -h|--help)
      sed -n '2,14p' "$0" | sed 's/^# \{0,1\}//'
      exit 0 ;;
    *) log "Unknown argument: $arg (try --help)"; exit 2 ;;
  esac
done

case "$ACTION" in
  status)
    print_status
    ;;
  stop)
    stop_backend
    ;;
  restart)
    stop_backend || true
    start_backend || exit 1
    [[ $OPEN_BROWSER -eq 1 ]] && open_browser
    ;;
  start)
    start_backend || exit 1
    [[ $OPEN_BROWSER -eq 1 ]] && open_browser
    ;;
esac
exit 0
