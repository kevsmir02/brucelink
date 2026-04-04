#!/usr/bin/env bash
set -euo pipefail

if [[ "${BRUCELINK_CHANGELOG_HOOK_RUNNING:-}" == "1" ]]; then
  exit 0
fi

REPO_ROOT="$(git rev-parse --show-toplevel)"
CHANGELOG_FILE="$REPO_ROOT/CHANGELOG.md"
MARKER="<!-- AUTO-CHANGELOG-ENTRIES -->"

if [[ ! -f "$CHANGELOG_FILE" ]]; then
  exit 0
fi

is_mobile_related_commit() {
  local changed_files=()
  mapfile -t changed_files < <(git show --name-only --pretty=format: HEAD)

  for file in "${changed_files[@]}"; do
    [[ -z "$file" ]] && continue
    case "$file" in
      App.tsx|index.js|app.json|babel.config.js|metro.config.js|react-native.config.js|tsconfig.json|jest.config.js|jest.setup.js)
        return 0
        ;;
      android/*|src/*|__tests__/*|patches/*)
        return 0
        ;;
      package.json|package-lock.json)
        return 0
        ;;
      scripts/android-release-build.sh|scripts/mock-access-point.js)
        return 0
        ;;
    esac
  done

  return 1
}

if ! is_mobile_related_commit; then
  exit 0
fi

COMMIT_SHA="$(git rev-parse --short HEAD)"
COMMIT_SUBJECT="$(git log -1 --pretty=%s)"
COMMIT_DATE="$(git log -1 --date=short --pretty=%ad)"
ENTRY="- ${COMMIT_DATE} ${COMMIT_SHA} ${COMMIT_SUBJECT}"

python3 - "$CHANGELOG_FILE" "$MARKER" "$ENTRY" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
marker = sys.argv[2]
entry = sys.argv[3]
text = path.read_text(encoding="utf-8")

if entry in text:
    sys.exit(0)

if marker not in text:
    raise SystemExit("auto changelog marker not found")

updated = text.replace(marker, f"{entry}\n{marker}", 1)
path.write_text(updated, encoding="utf-8")
PY

if git diff --quiet -- "$CHANGELOG_FILE"; then
  exit 0
fi

export BRUCELINK_CHANGELOG_HOOK_RUNNING=1

git add "$CHANGELOG_FILE"
git commit --amend --no-edit --no-verify >/dev/null
