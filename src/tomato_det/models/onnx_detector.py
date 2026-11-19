"""ONNX Runtime YOLO adapter: the served API never imports torch or ultralytics.

The checkpoint is exported once with ``yolo export format=onnx dynamic=True`` and
then executed through onnxruntime, which keeps the deployed process small enough
for a 512 MB instance. Pre/post-processing mirrors the Ultralytics pipeline:
letterbox to a stride-aligned square, RGB/255 NCHW input, then decode the raw
``(4 + num_classes, anchors)`` output back to normalized xyxy boxes.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

from tomato_det.common.classes import ClassSpec, class_lookup, load_classes
from tomato_det.common.paths import config_path
from tomato_det.models.base import Detection
from tomato_det.models.registry import ModelUnavailableError

PAD_VALUE = 114
_MIN_BOX_PIXELS = 1e-6


def letterbox(
    image_rgb: np.ndarray, size: int, stride: int = 32
) -> tuple[np.ndarray, float, int, int]:
    """Resize to the smallest stride-aligned rectangle, matching Ultralytics `rect` inference.

    Ultralytics predicts on a minimum rectangle padded to a multiple of the network
    stride rather than a padded square; reproducing it here keeps ONNX output aligned
    with the PyTorch reference instead of merely similar.
    """
    height, width = image_rgb.shape[:2]
    if height <= 0 or width <= 0:
        raise ValueError("ONNX input must be a non-empty HxWx3 RGB array")
    ratio = min(size / height, size / width)
    resized_width = max(1, int(round(width * ratio)))
    resized_height = max(1, int(round(height * ratio)))
    if (resized_width, resized_height) != (width, height):
        resized = np.asarray(
            Image.fromarray(image_rgb).resize(
                (resized_width, resized_height), Image.BILINEAR
            )
        )
    else:
        resized = image_rgb
    pad_width = (-resized_width) % stride
    pad_height = (-resized_height) % stride
    half_width, half_height = pad_width / 2, pad_height / 2
    top = int(round(half_height - 0.1))
    left = int(round(half_width - 0.1))
    bottom = int(round(half_height + 0.1))
    right = int(round(half_width + 0.1))
    canvas = np.full(
        (resized_height + top + bottom, resized_width + left + right, 3),
        PAD_VALUE,
        dtype=np.uint8,
    )
    canvas[top : top + resized_height, left : left + resized_width] = resized
    return canvas, ratio, left, top


def nms(boxes: np.ndarray, scores: np.ndarray, iou_threshold: float) -> list[int]:
    """Greedy non-maximum suppression on pixel-space xyxy boxes."""
    x1, y1, x2, y2 = boxes[:, 0], boxes[:, 1], boxes[:, 2], boxes[:, 3]
    areas = np.clip(x2 - x1, 0, None) * np.clip(y2 - y1, 0, None)
    order = scores.argsort()[::-1]
    keep: list[int] = []
    while order.size > 0:
        current = int(order[0])
        keep.append(current)
        if order.size == 1:
            break
        rest = order[1:]
        inter_x1 = np.maximum(x1[current], x1[rest])
        inter_y1 = np.maximum(y1[current], y1[rest])
        inter_x2 = np.minimum(x2[current], x2[rest])
        inter_y2 = np.minimum(y2[current], y2[rest])
        intersection = np.clip(inter_x2 - inter_x1, 0, None) * np.clip(
            inter_y2 - inter_y1, 0, None
        )
        union = areas[current] + areas[rest] - intersection
        overlap = np.divide(
            intersection, union, out=np.zeros_like(intersection), where=union > 0
        )
        order = rest[overlap <= iou_threshold]
    return keep


def decode_predictions(
    predictions: np.ndarray,
    *,
    conf: float,
    iou: float,
    max_det: int,
    agnostic_nms: bool,
    ratio: float,
    pad: tuple[int, int],
    original_size: tuple[int, int],
    classes_by_id: dict[int, ClassSpec],
) -> list[Detection]:
    """Turn one raw YOLO output tensor into normalized project detections."""
    if predictions.ndim != 2 or predictions.shape[0] < 5:
        raise RuntimeError(
            "ONNX output must be a (4 + num_classes, anchors) tensor; re-export the model"
        )
    boxes_xywh = predictions[:4].T.astype(np.float32)
    class_scores = predictions[4:].T.astype(np.float32)
    if class_scores.shape[1] == 0:
        return []
    class_ids = class_scores.argmax(axis=1)
    scores = class_scores[np.arange(class_scores.shape[0]), class_ids]

    above = scores >= conf
    if not np.any(above):
        return []
    boxes_xywh, scores, class_ids = boxes_xywh[above], scores[above], class_ids[above]

    center_x, center_y, box_w, box_h = (
        boxes_xywh[:, 0],
        boxes_xywh[:, 1],
        boxes_xywh[:, 2],
        boxes_xywh[:, 3],
    )
    left, top = pad
    width, height = original_size
    # Undo letterbox padding/resize, then normalize against the submitted image.
    x1 = (center_x - box_w / 2 - left) / ratio / width
    y1 = (center_y - box_h / 2 - top) / ratio / height
    x2 = (center_x + box_w / 2 - left) / ratio / width
    y2 = (center_y + box_h / 2 - top) / ratio / height
    boxes = np.stack(
        [np.clip(x1, 0, 1), np.clip(y1, 0, 1), np.clip(x2, 0, 1), np.clip(y2, 0, 1)],
        axis=1,
    )

    valid = (boxes[:, 2] - boxes[:, 0] > _MIN_BOX_PIXELS) & (
        boxes[:, 3] - boxes[:, 1] > _MIN_BOX_PIXELS
    )
    if not np.any(valid):
        return []
    boxes, scores, class_ids = boxes[valid], scores[valid], class_ids[valid]

    if agnostic_nms:
        kept = nms(boxes, scores, iou)
    else:
        kept = []
        for class_id in np.unique(class_ids):
            in_class = np.flatnonzero(class_ids == class_id)
            for index in nms(boxes[in_class], scores[in_class], iou):
                kept.append(int(in_class[index]))
        kept.sort(key=lambda index: float(scores[index]), reverse=True)
    kept = kept[:max_det]

    detections: list[Detection] = []
    for index in kept:
        category = classes_by_id.get(int(class_ids[index]))
        if category is None:
            raise RuntimeError(
                f"Checkpoint emitted class outside the configured mapping: {class_ids[index]}"
            )
        bx1, by1, bx2, by2 = (float(value) for value in boxes[index])
        detections.append(
            Detection(
                class_id=category.id,
                class_name=category.slug,
                score=float(scores[index]),
                box=(bx1, by1, bx2, by2),
            )
        )
    return detections


def configured_threads() -> int:
    """ORT intra-op threads from `TDET_ORT_THREADS`; defaults to 1 for tiny instances."""
    try:
        requested = int(os.environ.get("TDET_ORT_THREADS", "1"))
    except ValueError:
        requested = 1
    return max(1, min(requested, os.cpu_count() or 1))


class OnnxDetector:
    """Execute a dynamic-shape YOLO ONNX graph through onnxruntime."""

    def __init__(self, *, model_id: str, checkpoint: Path) -> None:
        if not checkpoint.is_file():
            raise ModelUnavailableError(f"Local ONNX model does not exist: {checkpoint}")
        try:
            import onnxruntime as ort
        except ImportError as error:
            raise ModelUnavailableError("onnxruntime is not installed") from error
        options = ort.SessionOptions()
        # Free instances have a 0.1 CPU share, so one thread is the default; a paid
        # instance can raise this with TDET_ORT_THREADS without a rebuild.
        threads = configured_threads()
        options.intra_op_num_threads = threads
        options.inter_op_num_threads = threads
        options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
        self.model_id = model_id
        self._checkpoint = checkpoint
        self._session = ort.InferenceSession(
            str(checkpoint), sess_options=options, providers=["CPUExecutionProvider"]
        )
        self._input_name = self._session.get_inputs()[0].name
        self._classes_by_id = {
            spec.id: spec
            for spec in class_lookup(load_classes(config_path("classes.yaml"))).values()
        }

    def predict(
        self,
        image_rgb: Any,
        *,
        conf: float,
        iou: float,
        imgsz: int,
        max_det: int,
        agnostic_nms: bool = False,
    ) -> list[Detection]:
        if not isinstance(image_rgb, np.ndarray):
            raise ValueError("ONNX input must be an HxWx3 RGB array")
        if image_rgb.ndim != 3 or image_rgb.shape[2] != 3:
            raise ValueError("ONNX input must be an HxWx3 RGB array")
        height, width = image_rgb.shape[:2]
        canvas, ratio, left, top = letterbox(image_rgb, imgsz)
        blob = np.ascontiguousarray(canvas.transpose(2, 0, 1)[np.newaxis], dtype=np.float32)
        blob /= 255.0
        outputs = self._session.run(None, {self._input_name: blob})
        predictions = np.asarray(outputs[0])
        if predictions.ndim == 3:
            predictions = predictions[0]
        return decode_predictions(
            predictions,
            conf=conf,
            iou=iou,
            max_det=max_det,
            agnostic_nms=agnostic_nms,
            ratio=ratio,
            pad=(left, top),
            original_size=(width, height),
            classes_by_id=self._classes_by_id,
        )
