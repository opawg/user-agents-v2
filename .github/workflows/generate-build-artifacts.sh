#!/bin/sh

# abort on any non-zero exit code
set -e

# install deno (if we don't already have it)
DENO_VERSION="v1.27.2"
[ ! -d ./deno-$DENO_VERSION ] && curl -fsSL https://deno.land/x/install/install.sh | DENO_INSTALL=./deno-$DENO_VERSION sh -s $DENO_VERSION

# run the generate script
NO_COLOR=1 DENO_VERSION=$DENO_VERSION ./deno-$DENO_VERSION/bin/deno run -A .github/workflows/generate_build_artifacts.ts
