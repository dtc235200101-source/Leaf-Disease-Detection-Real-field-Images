# Local weights

Place a trained checkpoint at `weights/<experiment-id>/best.pt` only after running or obtaining a
documented experiment. Checkpoints are ignored by Git.

## Current demo checkpoint

`weights/yolo11s_coco/best.pt` is a real but deliberately undertrained smoke checkpoint produced by
`configs/experiments/yolo11s_coco_smoke.yaml` (1 epoch, CPU, `imgsz=320`). It exists so the upload and
webcam UI can be exercised end-to-end. Do **not** cite its validation numbers as project results.

`weights/yolo11s_coco/best.onnx` is the dynamic-shape export of that checkpoint and is the graph the
serving API actually loads (`configs/app.yaml`). Regenerate it after replacing the checkpoint:

```powershell
python -c "from ultralytics import YOLO; YOLO('weights/yolo11s_coco/best.pt').export(format='onnx', imgsz=640, dynamic=True, opset=12, simplify=False)"
```

Replace it with a fully trained run before reporting metrics:

```powershell
tdet train --exp yolo11s_coco --seed 42
Copy-Item runs/yolo11s_coco/weights/best.pt weights/yolo11s_coco/best.pt
```

The app never downloads checkpoints at startup. The COCO initialization weight
`weights/bootstrap/yolo11s.pt` is a setup artifact and is also ignored by Git.
