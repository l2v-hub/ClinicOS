#!/usr/bin/env bash
set -e

powershell.exe -NoProfile -ExecutionPolicy Bypass \
  -File "C:\Users\llavia\railway-env.ps1" "$@"
