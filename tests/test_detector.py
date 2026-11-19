from pathlib import Path

import pytest

from tomato_det.common.classes import ClassSpec
from tomato_det.models.base import Detection
from tomato_det.models.onnx_detector import decode_predictions, letterbox
from tomato_det.models.registry import (
    ModelUnavailableError,
    build_detector,
    load_model_specs,
    model_availability,
)
from tomato_det.models.yolo_detector import YoloDetector

ROOT = Path(__file__).resolve().parents[1]


def test_detection_requires_normalized_finite_geometry() -> None:
    detection = Detection(0, "healthy", 0.8, (0.1, 0.2, 0.9, 0.8))

    assert detection.class_name == "healthy"
    with pytest.raises(ValueError, match="normalized"):
        Detection(0, "healthy", 0.8, (0.2, 0.2, 0.1, 0.8))
    with pytest.raises(ValueError, match="score"):
        Detection(0, "healthy", 1.1, (0.1, 0.2, 0.9, 0.8))


def test_missing_allowlisted_checkpoint_is_unavailable(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    from tomato_det.models import registry

    monkeypatch.setattr(registry, "project_root", lambda: tmp_path)
    specs = load_model_specs(ROOT / "configs" / "app.yaml")
    available, reason = model_availability(specs["yolo11s_coco"])

    assert not available
    assert reason is not None and reason.startswith("Local checkpoint is missing")
    with pytest.raises(ModelUnavailableError, match="unavailable"):
        build_detector("yolo11s_coco", app_config_path=ROOT / "configs" / "app.yaml")


def test_checkpoint_env_override_replaces_app_yaml_path(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    from tomato_det.models import registry

    monkeypatch.setattr(registry, "project_root", lambda: tmp_path)
    monkeypatch.setenv("TDET_CHECKPOINT_YOLO11S_COCO", "deploy/model/best.onnx")
    specs = load_model_specs(ROOT / "configs" / "app.yaml")

    assert specs["yolo11s_coco"].checkpoint == tmp_path / "deploy" / "model" / "best.onnx"


def test_registry_rejects_model_id_outside_allowlist() -> None:
    with pytest.raises(ModelUnavailableError, match="not allowlisted"):
        build_detector("arbitrary-path")


class _FakeTensor:
    def __init__(self, values: list[object]) -> None:
        self._values = values

    def tolist(self) -> list[object]:
        return self._values


class _FakeBoxes:
    xyxy = _FakeTensor([[10.0, 20.0, 50.0, 80.0]])
    cls = _FakeTensor([0.0])
    conf = _FakeTensor([0.75])


class _FakeResult:
    orig_shape = (100, 200)
    boxes = _FakeBoxes()


class _FakeModel:
    def predict(self, **_: object) -> list[_FakeResult]:
        return [_FakeResult()]


def test_yolo_adapter_feeds_bgr_numpy_arrays_to_ultralytics() -> None:
    import numpy as np

    captured: dict[str, object] = {}

    class _CapturingModel:
        def predict(self, **kwargs: object) -> list[_FakeResult]:
            captured["source"] = kwargs["source"]
            return [_FakeResult()]

    detector = object.__new__(YoloDetector)
    detector.model_id = "yolo11s_coco"
    detector._model = _CapturingModel()
    detector._classes_by_id = {
        0: ClassSpec(0, "Tomato Early blight leaf", "early_blight", "Úa sớm", "fungal", "#000000")
    }
    rgb = np.zeros((100, 200, 3), dtype=np.uint8)
    rgb[..., 0] = 255

    detections = detector.predict(image_rgb=rgb, conf=0.25, iou=0.5, imgsz=640, max_det=50)

    source = captured["source"]
    assert isinstance(source, np.ndarray)
    assert source.flags["C_CONTIGUOUS"]
    # RGB red must land in the last (blue in BGR naming) channel of the Ultralytics input.
    assert int(source[0, 0, 2]) == 255
    assert int(source[0, 0, 0]) == 0
    assert detections == [Detection(0, "early_blight", 0.75, (0.05, 0.2, 0.25, 0.8))]


def _classes_by_id() -> dict[int, ClassSpec]:
    return {
        0: ClassSpec(
            0, "Tomato Early blight leaf", "early_blight", "Úa sớm", "fungal", "#000000"
        ),
        1: ClassSpec(1, "Tomato leaf", "healthy", "Lá khỏe", "healthy", "#111111"),
    }


def test_onnx_letterbox_pads_to_stride_aligned_rectangle() -> None:
    import numpy as np

    # 100x200 keeps 1:2 aspect, so the long side fits imgsz and nothing is padded.
    canvas, ratio, left, top = letterbox(np.zeros((100, 200, 3), dtype=np.uint8), 640)
    assert canvas.shape == (320, 640, 3)
    assert ratio == pytest.approx(3.2)
    assert (left, top) == (0, 0)

    # 100x150 scales to 427x640 and is padded up to a multiple of 32 (448).
    padded, padded_ratio, padded_left, padded_top = letterbox(
        np.zeros((100, 150, 3), dtype=np.uint8), 640
    )
    assert padded_ratio == pytest.approx(640 / 150)
    assert padded.shape == (448, 640, 3)
    assert padded_left == 0
    assert padded_top == 10
    assert int(padded[0, 0, 0]) == 114
    assert int(padded[100, 320, 0]) == 0


def test_onnx_decode_undoes_letterbox_padding_and_normalizes_boxes() -> None:
    import numpy as np

    predictions = np.array([[320.0], [320.0], [320.0], [320.0], [0.9]], dtype=np.float32)

    detections = decode_predictions(
        predictions,
        conf=0.25,
        iou=0.5,
        max_det=50,
        agnostic_nms=False,
        ratio=3.2,
        pad=(0, 160),
        original_size=(200, 100),
        classes_by_id=_classes_by_id(),
    )

    assert len(detections) == 1
    detection = detections[0]
    assert (detection.class_id, detection.class_name) == (0, "early_blight")
    assert detection.score == pytest.approx(0.9)
    assert detection.box == pytest.approx((0.25, 0.0, 0.75, 1.0))


def test_onnx_decode_suppresses_overlapping_same_class_boxes_only() -> None:
    import numpy as np

    predictions = np.array(
        [
            [200.0, 205.0, 550.0],
            [200.0, 205.0, 550.0],
            [200.0, 200.0, 100.0],
            [200.0, 200.0, 100.0],
            [0.9, 0.8, 0.05],
            [0.05, 0.05, 0.7],
        ],
        dtype=np.float32,
    )

    detections = decode_predictions(
        predictions,
        conf=0.25,
        iou=0.5,
        max_det=50,
        agnostic_nms=False,
        ratio=6.4,
        pad=(0, 0),
        original_size=(100, 100),
        classes_by_id=_classes_by_id(),
    )

    assert [(item.class_id, round(item.score, 2)) for item in detections] == [(0, 0.9), (1, 0.7)]
    assert detections[0].box == pytest.approx((0.15625, 0.15625, 0.46875, 0.46875))


def test_yolo_adapter_normalizes_pixel_boxes_without_loading_ultralytics() -> None:
    detector = object.__new__(YoloDetector)
    detector.model_id = "yolo11s_coco"
    detector._model = _FakeModel()
    detector._classes_by_id = {
        0: ClassSpec(0, "Tomato Early blight leaf", "early_blight", "Úa sớm", "fungal", "#000000")
    }

    detections = detector.predict(image_rgb=object(), conf=0.25, iou=0.5, imgsz=640, max_det=50)

    assert detections == [Detection(0, "early_blight", 0.75, (0.05, 0.2, 0.25, 0.8))]
