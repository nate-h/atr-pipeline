#!/usr/bin/env sh
set -eu

mkdir -p /mlflow-artifacts

mlflow server \
  --host 0.0.0.0 \
  --port 5000 \
  --backend-store-uri "${MLFLOW_BACKEND_STORE_URI}" \
  --default-artifact-root /mlflow-artifacts

