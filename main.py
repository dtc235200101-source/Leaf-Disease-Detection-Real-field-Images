"""Vercel entrypoint for the FastAPI service.

Vercel looks for a module-level ``app`` object in ``main.py``. The project keeps
its package under ``src/``, so add that directory to ``sys.path`` before
importing the application factory. Local development keeps using
``uvicorn tomato_det.serving.main:app`` with ``PYTHONPATH=src`` (or the editable
install from ``pyproject.toml``), so this shim exists only for serverless builds.
"""

from __future__ import annotations

import sys
from pathlib import Path

_SRC = Path(__file__).resolve().parent / "src"
if str(_SRC) not in sys.path:
    sys.path.insert(0, str(_SRC))

# Import the ONNX adapter eagerly so Vercel's bundle tracing keeps onnxruntime;
# the runtime otherwise loads it lazily from the registry.
import tomato_det.models.onnx_detector  # noqa: E402,F401
from tomato_det.serving.main import app  # noqa: E402  (import after sys.path setup)

__all__ = ["app"]
