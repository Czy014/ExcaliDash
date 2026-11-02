#!/bin/sh
set -eu

fail() {
    echo "ERROR: Prisma schema engine verification failed; the build needs access to Prisma's binary downloads." >&2
    exit 1
}

if ! version_output=$(npx prisma version 2>&1); then
    printf '%s\n' "$version_output" >&2
    fail
fi
printf '%s\n' "$version_output"

platform=$(printf '%s\n' "$version_output" |
    sed -n 's/^Computed binaryTarget[[:space:]]*:[[:space:]]*//p')
schema_engine="node_modules/@prisma/engines/schema-engine-$platform"
if [ -z "$platform" ] || [ ! -x "$schema_engine" ]; then
    fail
fi

echo "Prisma schema engine verified: $schema_engine"
