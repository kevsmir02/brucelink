#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK_DIR="$(git rev-parse --git-path hooks)"
HOOK_FILE="$HOOK_DIR/post-commit"
BACKUP_FILE="$HOOK_DIR/post-commit.user-backup"
MARKER="# BruceLink changelog hook"

mkdir -p "$HOOK_DIR"

if [[ -f "$HOOK_FILE" ]] && ! grep -q "$MARKER" "$HOOK_FILE"; then
  mv "$HOOK_FILE" "$BACKUP_FILE"
fi

cat > "$HOOK_FILE" <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
# BruceLink changelog hook

REPO_ROOT="$(git rev-parse --show-toplevel)"
HOOK_DIR="$(git rev-parse --git-path hooks)"
BACKUP_FILE="$HOOK_DIR/post-commit.user-backup"

if [[ -x "$BACKUP_FILE" ]]; then
  "$BACKUP_FILE" || true
fi

"$REPO_ROOT/scripts/changelog-post-commit.sh" || true
HOOK

chmod +x "$HOOK_FILE"

echo "Installed post-commit changelog hook at: $HOOK_FILE"
