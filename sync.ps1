#!/usr/bin/env pwsh
# Thin wrapper around the cross-platform Node sync engine (`npm run sync`).
$ErrorActionPreference = 'Stop'
node "$PSScriptRoot/scripts/sync.mjs" @args
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

