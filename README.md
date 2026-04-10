# ATR Ship Workbench

A small, dockerized ATR workbench for managing ship-detection workflows against the local `ships-aerial-images` dataset. The system is intentionally thin: it focuses on a believable end-to-end developer workflow around YOLO-format labels, a native in-app box annotator, reproducible YOLOv8 training, tracked runs, and simple evaluation.

## What it does

- Inspects the local dataset and validates split integrity.
- Imports new image batches from a zip or browser folder upload into deterministic train/valid/test splits.
- Surfaces an in-app bounding-box annotation workflow that saves YOLO labels directly.
- Starts YOLOv8 training runs in the background from the FastAPI backend.
- Stores run metadata in PostgreSQL and logs metrics into MLflow.
- Evaluates trained checkpoints on the test split and exposes saved outputs in the UI.

## Architecture

- `frontend/`: React + TypeScript + Vite + TanStack Query UI.
- `backend/`: FastAPI + Pydantic settings + SQLAlchemy + Alembic.
- `db`: PostgreSQL for datasets, training runs, and evaluation runs.
- `mlflow`: experiment tracking and artifact browsing, using its own local backend store to avoid Alembic collisions with the app database.
- `data/ships-aerial-images`: mounted local dataset and source of truth.
- `artifacts/`: predictable output root for training and evaluation outputs.

## Why YOLOv8

YOLOv8 is a practical fit for this challenge because it is easy to fine-tune on an existing YOLO-format dataset, exposes a straightforward Python API, and already emits the training and validation metrics needed for a lightweight workbench. The emphasis here is workflow reliability, not custom model research.

## Annotation workflow

The app now includes a lightweight in-browser box annotator for the local dataset.

1. Open the Annotation page.
2. Pick a split and image.
3. Draw ship bounding boxes directly on the image.
4. Save to write YOLO `.txt` labels into the matching split label folder.
5. Optionally import an existing YOLO label archive if labels were created elsewhere.

## Image import workflow

The Import page accepts a `.zip` archive or a browser folder upload of image files. Uploaded images are automatically placed into one of the dataset split folders:

- `train/images`: first 70% of the deterministic hash bucket.
- `valid/images`: next 15% of the deterministic hash bucket.
- `test/images`: final 15% of the deterministic hash bucket.

The bucket is computed from a SHA-256 hash of the image file bytes, so the same image lands in the same split every time. The importer also creates an empty YOLO `.txt` label file in the matching `labels` folder so the image shows up in the annotation workflow. It does not auto-generate ship boxes; boxes still need to be drawn in the annotator or imported from an existing YOLO label export.

### How YOLO-format labels are preserved

- The dataset under `data/ships-aerial-images` remains the source of truth.
- The backend never converts labels into a proprietary internal format for training.
- The native annotator writes YOLO label files directly into the dataset folders used by the trainer.
- During training and evaluation, the backend rewrites `data.yaml` paths for the local container environment, but it preserves YOLO label files in place.

## Start the stack

1. Copy `.env.example` to `.env` if you want to override defaults.
2. Start the app:

```bash
docker compose up --build
```

3. Open:

- Frontend: `http://localhost:5173`
- Backend API docs: `http://localhost:8000/docs`
- MLflow: `http://localhost:5001`

MLflow is configured to allow both local browser access and Docker-internal access from the backend service via the `mlflow:5000` hostname.

## Happy-path workflow

1. Open the Dashboard or Dataset page to inspect split counts and validation warnings.
2. Open the Import page to add new images from a zip or folder upload.
3. Open the Annotation page to create or edit YOLO labels directly in the browser.
4. Start a training run from the Training page.
5. Review run history and artifact locations on the Runs page.
6. Launch evaluation on a completed training run and inspect metrics and prediction images on the Evaluation page.

## Linting and type checking

Using the provided containers:

```bash
make backend-lint
make backend-typecheck
make frontend-lint
make frontend-typecheck
```

## API surface

- `GET /api/health`
- `GET /api/dataset/summary`
- `GET /api/dataset/validate`
- `POST /api/dataset/import-images`
- `GET /api/annotation/info`
- `POST /api/annotation/sync`
- `POST /api/training/runs`
- `GET /api/training/runs`
- `GET /api/training/runs/{id}`
- `POST /api/evaluation/runs/{training_run_id}`
- `GET /api/evaluation/runs`
- `GET /api/evaluation/runs/{id}`

## Notes for local training

- The provided `data.yaml` currently points at Kaggle-style absolute paths. The backend normalizes those paths into the mounted local dataset paths before calling Ultralytics.
- Default training settings are intentionally small: `yolov8n.pt`, `epochs=5`, `imgsz=640`, `batch=8`.
- Training and evaluation execute in background threads inside the backend container so request threads stay responsive.

## Known limitations

- The built-in annotator is intentionally lightweight: it supports straightforward box drawing and save-to-YOLO, not the full review/task-management feature set of a dedicated labeling platform.
- Background workers are in-process, so they are fine for local development but not meant for distributed production execution.
- Evaluation prioritizes core metrics and sample predictions over a richer error-analysis workflow like FiftyOne.
- The app assumes the local dataset shape already matches the expected YOLO split layout.
