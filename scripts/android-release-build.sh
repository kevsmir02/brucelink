#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

pick_jdk() {
  local candidates=(
    "${JAVA_HOME:-}"
    "$HOME/.sdkman/candidates/java/current"
    "$HOME/.sdkman/candidates/java/17.0.10-tem"
    "/opt/android-studio/jbr"
    "/usr/lib/jvm/java-21-openjdk"
    "/usr/lib/jvm/java-17-openjdk"
    "/usr/lib/jvm/java-25-openjdk"
  )

  for candidate in "${candidates[@]}"; do
    if [[ -n "$candidate" && -x "$candidate/bin/javac" ]]; then
      echo "$candidate"
      return 0
    fi
  done

  return 1
}

ensure_local_properties() {
  local local_properties="$ROOT_DIR/android/local.properties"

  if [[ -f "$local_properties" ]]; then
    return 0
  fi

  local sdk_path="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
  if [[ -d "$sdk_path" ]]; then
    printf 'sdk.dir=%s\n' "$sdk_path" > "$local_properties"
  fi
}

JDK_HOME="$(pick_jdk || true)"
if [[ -z "$JDK_HOME" ]]; then
  echo "Error: No JDK with javac found. Install JDK 17+ or Android Studio JBR." >&2
  exit 1
fi

export JAVA_HOME="$JDK_HOME"
export PATH="$JAVA_HOME/bin:$PATH"

ensure_local_properties

cd "$ROOT_DIR/android"
./gradlew assembleRelease
