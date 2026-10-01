#!/usr/bin/env bash
# ============================================================
# install-shortcut.sh — Install/refresh the Linux shortcuts (idempotent)
#
#   ./install-shortcut.sh              Install everything
#   ./install-shortcut.sh --uninstall  Remove everything
#
# Installs:
#   1. Menu entry   ~/.local/share/applications/store-management.desktop
#   2. Desktop icon ~/Desktop/store-management.desktop  (browser opens)
#   3. Login autostart ~/.config/autostart/store-management.desktop (backend only)
#   4. App icon     ~/.local/share/icons/hicolor/128x128/apps/store-management.png
#
# Safe to re-run any time (paths rewritten fresh each run).
# ============================================================

set -uo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
ROOT="$SCRIPT_DIR"
TEMPLATE="$ROOT/store-management.desktop"
LAUNCHER="$ROOT/start-app.sh"
ICON_SRC="$ROOT/src-tauri/icons/128x128.png"

APP_DIR="$HOME/.local/share/applications"
AUTO_DIR="$HOME/.config/autostart"
ICON_DIR="$HOME/.local/share/icons/hicolor/128x128/apps"
ICON_NAME="store-management.png"

DESKTOP_DIR="$(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Desktop")"

log() { printf '%s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

# --- Uninstall ---
if [[ "${1:-}" == "--uninstall" ]]; then
  rm -f "$APP_DIR/store-management.desktop"
  rm -f "$AUTO_DIR/store-management.desktop"
  rm -f "$DESKTOP_DIR/store-management.desktop"
  rm -f "$ICON_DIR/$ICON_NAME"
  command -v update-desktop-database >/dev/null && update-desktop-database "$APP_DIR" 2>/dev/null
  log "Removed menu entry, desktop icon, autostart entry, and icon."
  exit 0
fi

# --- Preconditions ---
[[ -f "$TEMPLATE" ]] || { log "ERROR: template not found: $TEMPLATE"; exit 1; }
[[ -f "$LAUNCHER" ]] || { log "ERROR: launcher not found: $LAUNCHER"; exit 1; }
[[ -f "$ICON_SRC" ]] || { log "ERROR: icon not found: $ICON_SRC"; exit 1; }

chmod +x "$LAUNCHER" || { log "ERROR: could not make start-app.sh executable"; exit 1; }

# Absolute launcher path (spaces included — must be quoted in Exec=)
LAUNCHER_ABS="$ROOT/start-app.sh"
if [[ ! -x "$LAUNCHER_ABS" ]]; then
  log "ERROR: $LAUNCHER_ABS is not executable"
  exit 1
fi

# --- 1. Icon ---
mkdir -p "$ICON_DIR"
cp -f "$ICON_SRC" "$ICON_DIR/$ICON_NAME"
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -f -t "$HOME/.local/share/icons/hicolor" 2>/dev/null
fi
log "Icon installed -> $ICON_DIR/$ICON_NAME"

# --- Helper: render template with Exec= ---
render() { # $1 = Exec value
  sed "s|^Exec=.*|Exec=$1|" "$TEMPLATE"
}

validate() { # $1 = file
  if command -v desktop-file-validate >/dev/null 2>&1; then
    if desktop-file-validate "$1" 2>/dev/null; then
      log "  validated: $1"
    else
      log "  WARN: desktop-file-validate reported issues for $1:"
      desktop-file-validate "$1" 2>&1 | sed 's/^/    /'
    fi
  fi
}

# --- 2. Menu entry (runs with browser) ---
mkdir -p "$APP_DIR"
render "\"$LAUNCHER_ABS\"" > "$APP_DIR/store-management.desktop"
chmod 644 "$APP_DIR/store-management.desktop"
validate "$APP_DIR/store-management.desktop"

# --- 3. Desktop icon (runs with browser) ---
if [[ -d "$DESKTOP_DIR" ]]; then
  render "\"$LAUNCHER_ABS\"" > "$DESKTOP_DIR/store-management.desktop"
  chmod +x "$DESKTOP_DIR/store-management.desktop"   # KDE: executable = launchable
  validate "$DESKTOP_DIR/store-management.desktop"
  log "Desktop icon -> $DESKTOP_DIR/store-management.desktop"
  log "  (KDE may ask once: 'Trust and launch' — tick 'Allow launch' / Run)"
else
  log "Desktop dir not found ($DESKTOP_DIR) — skipping desktop icon."
fi

# --- 4. Login autostart (backend only, no browser) ---
mkdir -p "$AUTO_DIR"
render "\"$LAUNCHER_ABS\" --no-browser" > "$AUTO_DIR/store-management.desktop"
chmod 644 "$AUTO_DIR/store-management.desktop"
validate "$AUTO_DIR/store-management.desktop"
log "Autostart -> $AUTO_DIR/store-management.desktop (backend only, no browser)"

# --- Refresh menu database ---
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database "$APP_DIR" 2>/dev/null
fi

echo
log "Done. Summary:"
log "  Double-click desktop icon  -> backend start (if needed) + browser"
log "  KDE Application Menu       -> 'Store Management System'"
log "  Login                      -> backend starts automatically (hidden)"
log ""
log "Quick test:  $LAUNCHER_ABS status"
log "Stop:        $LAUNCHER_ABS stop"
