#!/usr/bin/env bash

rm -rf dist &&
bun build --target node --minify lib/index.ts --outdir dist
tsc -p .
