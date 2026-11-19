# Build the React client first; FastAPI serves this static output in production.
FROM node:22-alpine AS frontend-build

WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend ./
RUN npm run build

# Render production image: FastAPI + React + ONNX Runtime.
# Inference runs on onnxruntime, so no torch/ultralytics wheel is installed here;
# the exported graph ships from deploy/model/best.onnx because weights/*.onnx is
# git-ignored. It is copied to the path app.yaml expects at runtime.
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONPATH=/app/src \
    TDET_MAX_LOADED_MODELS=1

WORKDIR /app

# libgomp1 is the only shared library onnxruntime needs on a slim base image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml requirements.txt requirements-serve.txt ./
COPY src ./src
COPY configs ./configs
RUN pip install -r requirements-serve.txt \
    && pip install --no-deps -e .

COPY data/splits ./data/splits
COPY --from=frontend-build /frontend/dist ./frontend/dist
COPY deploy/model/best.onnx ./weights/yolo11s_coco/best.onnx

# Render injects PORT; fall back to 8000 when running the image locally.
EXPOSE 8000
CMD ["sh", "-c", "uvicorn tomato_det.serving.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
