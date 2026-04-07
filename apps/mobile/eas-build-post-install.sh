#!/bin/bash
set -e

echo "=== Fixing Gradle wrapper to 8.8 ==="
echo "CWD: $(pwd)"

GRADLE_VERSION="8.8"
DIST_URL="distributionUrl=https\\://services.gradle.org/distributions/gradle-${GRADLE_VERSION}-bin.zip"

patch_file() {
  local f="$1"
  if grep -q "distributionUrl" "$f"; then
    echo "Patching: $f"
    perl -pi -e "s|distributionUrl=.*|${DIST_URL}|" "$f"
    grep "distributionUrl" "$f"
  fi
}

# Search in all likely locations
for search_root in "." ".." "../.." "/home/expo/workingdir/build"; do
  while IFS= read -r -d '' f; do
    patch_file "$f"
  done < <(find "$search_root" -maxdepth 8 -name "gradle-wrapper.properties" -print0 2>/dev/null)
done

echo "=== Done ==="
