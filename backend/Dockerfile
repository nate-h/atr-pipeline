FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app/backend

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY backend/pyproject.toml /app/backend/pyproject.toml
COPY backend/alembic.ini /app/backend/alembic.ini
COPY backend/app /app/backend/app
COPY backend/alembic /app/backend/alembic

RUN pip install --upgrade pip && pip install -e ".[dev]"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

