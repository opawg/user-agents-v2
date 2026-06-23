#!/bin/sh

# abort on any non-zero exit code
set -e

# install deno (if we don't already have it)
DENO_VERSION="v1.39.0"
[ ! -d ./deno-$DENO_VERSION ] && curl -fsSL https://deno.land/x/install/install.sh | DENO_INSTALL=./deno-$DENO_VERSION sh -s $DENO_VERSION

# check json files for consistent formatting
NO_COLOR=1 DENO_VERSION=$DENO_VERSION ./deno-$DENO_VERSION/bin/deno run --allow-sys --allow-env --allow-read npm:prettier@3.8.4 --check src/*.json

# run all unit tests
NO_COLOR=1 DENO_VERSION=$DENO_VERSION ./deno-$DENO_VERSION/bin/deno test --allow-read
