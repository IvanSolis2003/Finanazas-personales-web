#!/bin/bash
set -e

echo "Fixing Gradle version to 8.8..."

WRAPPER_PROPS="android/gradle/wrapper/gradle-wrapper.properties"

if [ -f "$WRAPPER_PROPS" ]; then
  sed -i 's|distributionUrl=.*gradle-.*\.zip|distributionUrl=https\\://services.gradle.org/distributions/gradle-8.8-bin.zip|g' "$WRAPPER_PROPS"
  echo "Done. Current content:"
  cat "$WRAPPER_PROPS"
else
  echo "WARNING: $WRAPPER_PROPS not found"
fi
