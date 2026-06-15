#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
exec .venv/bin/python -m uvicorn app.main:app --reload --host 0.0.0.0 --port "${PORT:-8000}"
