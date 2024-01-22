#!/usr/bin/env bash

rm -rf dist &&
bun build --target node lib/index.ts --outdir dist --external discord.js
tsc -p .
