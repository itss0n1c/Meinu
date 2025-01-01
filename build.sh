#!/usr/bin/env bash

rm -rf dist &&
bun build --minify --target bun lib/index.ts --outdir dist --external discord.js --external chalk --sourcemap=linked
tsc -p .
