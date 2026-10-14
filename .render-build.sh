#!/usr/bin/env bash
# Build de Render: dependencias de Node y Python + compilación de frontend y servidor.
set -o errexit

# --include=dev: el build necesita esbuild/typescript aunque NODE_ENV sea production
npm install --include=dev

# Mismo intérprete que usa server.ts para lanzar python/finance_engine.py
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

npm run build
