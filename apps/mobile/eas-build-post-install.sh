#!/bin/bash
set -e

echo "=== Fixing Gradle version ==="
pwd
ls -la

WRAPPER_PROPS="android/gradle/wrapper/gradle-wrapper.properties"

if [ -f "$WRAPPER_PROPS" ]; then
  echo "Found: $WRAPPER_PROPS"
  cat "$WRAPPER_PROPS"
  # Use perl instead of sed for cross-platform compatibility
  perl -pi -e 's|distributionUrl=.*|distributionUrl=https\\://services.gradle.org/distributions/gradle-8.8-bin.zip|' "$WRAPPER_PROPS"
  echo "--- After fix ---"
  cat "$WRAPPER_PROPS"
else
  echo "NOT FOUND: $WRAPPER_PROPS"
  find . -name "gradle-wrapper.properties" 2>/dev/null
fi
