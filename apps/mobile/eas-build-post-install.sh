#!/bin/bash
set -e

echo "=== Patching Gradle wrapper templates to 8.8 ==="

# Find all gradle-wrapper.properties in node_modules templates and patch them
find node_modules -name "gradle-wrapper.properties" 2>/dev/null | while read f; do
  if grep -q "distributionUrl" "$f"; then
    echo "Patching: $f"
    perl -pi -e 's|distributionUrl=.*|distributionUrl=https\\://services.gradle.org/distributions/gradle-8.8-bin.zip|' "$f"
    echo "  -> $(grep distributionUrl "$f")"
  fi
done

echo "=== Done ==="
