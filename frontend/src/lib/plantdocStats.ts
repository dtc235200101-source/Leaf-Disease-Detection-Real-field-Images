/**
 * Số liệu THẬT của bộ PlantDoc (tomato) và của lần chạy yolo11s_coco_smoke.
 *
 * Nguồn từng con số (không có giá trị nào được nhập tay/ước lượng):
 * - Số ảnh / số box mỗi lớp: đếm trực tiếp từ `data/processed/tomato_yolo/labels/{train,val,test}/*.txt`
 *   (định dạng YOLO `<class_id> <cx> <cy> <w> <h>`), khớp `data/splits/{train,val,test}.txt`.
 * - Split tổng: `reports/REPORT.md` mục "Dataset splits" (train 620 / val 30 / test 69 ảnh;
 *   box 2206 / 439 / 192; 697 nhóm gần trùng; 5 nhóm cắt qua train/test; 5 ảnh train bị loại).
 * - Chỉ số mô hình: `reports/metrics_summary.csv`, `reports/per_class_metrics.csv`, `reports/REPORT.md`.
 * - Latency: `reports/latency.json` (CPU, imgsz 320, warm-up 5, 30 lượt đo, P50 49.09 ms, P95 54.99 ms).
 * - Cấu hình huấn luyện: `runs/yolo11s_coco_smoke/args.yaml` + `configs/experiments/yolo11s_coco_smoke.yaml`.
 * - Tên/màu lớp: `configs/classes.yaml` (đi qua backend `/api/classes`, không chép lại ở đây).
 */

export type SplitName = "train" | "val" | "test";

export const SPLIT_ORDER: SplitName[] = ["train", "val", "test"];

/** Số box gán nhãn theo từng split, chỉ số mảng = class_id (0..8). */
export const BOXES_BY_SPLIT: Record<SplitName, number[]> = {
  train: [152, 332, 206, 172, 188, 630, 225, 1, 300],
  val: [35, 59, 37, 32, 37, 132, 42, 1, 64],
  test: [19, 24, 14, 14, 36, 42, 16, 0, 27],
};

/** Số ảnh có chứa ít nhất một box của lớp, chỉ số mảng = class_id (0..8). */
export const IMAGES_BY_SPLIT: Record<SplitName, number[]> = {
  train: [73, 127, 95, 96, 42, 63, 76, 1, 60],
  val: [4, 9, 3, 3, 3, 4, 3, 1, 3],
  test: [9, 11, 9, 10, 10, 6, 6, 0, 8],
};

export const SPLIT_TOTALS: Record<SplitName, { images: number; boxes: number }> = {
  train: { images: 620, boxes: 2206 },
  val: { images: 30, boxes: 439 },
  test: { images: 69, boxes: 192 },
};

export const DATASET_TOTALS = {
  images: 719,
  boxes: 2837,
  classes: 9,
  nearDuplicateGroups: 697,
  crossSplitGroups: 5,
  droppedTrainImages: 5,
  valFraction: 0.15,
  seed: 42,
  phashDistance: 6,
  source: "PlantDoc Object Detection Dataset (CC BY 4.0)",
} as const;

export const TRAINING = {
  experimentId: "yolo11s_coco_smoke",
  pretrained: "yolo11s.pt",
  checkpoint: "weights/yolo11s_coco/best.onnx",
  imageSize: 320,
  epochs: 10,
  batch: 4,
  workers: 0,
  device: "cpu",
  optimizer: "auto",
  seed: 42,
  artifactTimestamp: "2026-11-01T14:49:48Z",
} as const;

export const MODEL_METRICS = {
  val: { map50: 0.2285, map50_95: 0.1251, precision: 0.3275, recall: 0.2961 },
  test: { map50: 0.2668, map50_95: 0.1661, precision: 0.232, recall: 0.3854 },
  operatingPoint: { threshold: 0.15, precision: 0.3275, recall: 0.2961, f1: 0.311 },
  latency: { device: "cpu", imageSize: 320, warmup: 5, runs: 30, p50: 49.09, p95: 54.99 },
} as const;

export interface PerClassMetric {
  classId: number;
  support: number;
  ap50: number | null;
  ap50_95: number | null;
}

/** `reports/per_class_metrics.csv` — support là số box ground-truth trong tập test. */
export const PER_CLASS_METRICS: PerClassMetric[] = [
  { classId: 0, support: 19, ap50: 0.19801980198019803, ap50_95: 0.15396039603960396 },
  { classId: 1, support: 24, ap50: 0.5494424178325257, ap50_95: 0.3761387497432057 },
  { classId: 2, support: 14, ap50: 0.029219707685054216, ap50_95: 0.023259075907590757 },
  { classId: 3, support: 14, ap50: 0.5428584525119179, ap50_95: 0.369465529886322 },
  { classId: 4, support: 36, ap50: 0.10304931592060304, ap50_95: 0.053663223465203656 },
  { classId: 5, support: 42, ap50: 0.48752385606886917, ap50_95: 0.24090166643645583 },
  { classId: 6, support: 16, ap50: 0.022105109061630802, ap50_95: 0.009879866523574372 },
  { classId: 7, support: 0, ap50: null, ap50_95: null },
  { classId: 8, support: 27, ap50: 0.20193262606491275, ap50_95: 0.10142072760637447 },
];

/** Ảnh/biểu đồ gốc của lần chạy thật, copy nguyên bản vào `frontend/public/metrics/`. */
export const METRIC_ARTIFACTS: { file: string; title: string; note: string }[] = [
  {
    file: "/metrics/per_class_ap.png",
    title: "AP@0.5 theo lớp (test)",
    note: "reports/figures/per_class_ap.png — matplotlib từ tdet eval-artifacts",
  },
  {
    file: "/metrics/confusion_matrix.png",
    title: "Confusion matrix (test)",
    note: "runs/yolo11s_coco_smoke/confusion_matrix.png",
  },
  {
    file: "/metrics/confusion_matrix_normalized.png",
    title: "Confusion matrix chuẩn hoá",
    note: "runs/yolo11s_coco_smoke/confusion_matrix_normalized.png",
  },
  {
    file: "/metrics/BoxPR_curve.png",
    title: "Đường Precision–Recall",
    note: "runs/yolo11s_coco_smoke/BoxPR_curve.png",
  },
  {
    file: "/metrics/results.png",
    title: "Đường loss/metric theo epoch",
    note: "runs/yolo11s_coco_smoke/results.png",
  },
];

export function sumAcrossSplits(bySplit: Record<SplitName, number[]>): number[] {
  return bySplit.train.map((_, index) =>
    SPLIT_ORDER.reduce((total, split) => total + bySplit[split][index], 0),
  );
}

export function formatNumber(value: number): string {
  return value.toLocaleString("vi-VN");
}

export function formatPercent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export interface EpochPoint {
  epoch: number;
  precision: number;
  recall: number;
  map50: number;
  map50_95: number;
}

/** `runs/yolo11s_coco_smoke/results.csv` — đúng 10 epoch của lần chạy thật (Ultralytics ghi mỗi epoch). */
export const TRAINING_CURVE: EpochPoint[] = [
  { epoch: 1, precision: 0.18577, recall: 0.20233, map50: 0.06952, map50_95: 0.03884 },
  { epoch: 2, precision: 0.23715, recall: 0.20084, map50: 0.13753, map50_95: 0.07879 },
  { epoch: 3, precision: 0.13531, recall: 0.22705, map50: 0.12954, map50_95: 0.06813 },
  { epoch: 4, precision: 0.13886, recall: 0.20789, map50: 0.11865, map50_95: 0.0587 },
  { epoch: 5, precision: 0.17576, recall: 0.22382, map50: 0.16363, map50_95: 0.08317 },
  { epoch: 6, precision: 0.23643, recall: 0.31005, map50: 0.22939, map50_95: 0.11785 },
  { epoch: 7, precision: 0.19432, recall: 0.28428, map50: 0.20789, map50_95: 0.11239 },
  { epoch: 8, precision: 0.20355, recall: 0.30182, map50: 0.21857, map50_95: 0.11616 },
  { epoch: 9, precision: 0.25556, recall: 0.33036, map50: 0.28114, map50_95: 0.15626 },
  { epoch: 10, precision: 0.23899, recall: 0.34974, map50: 0.27648, map50_95: 0.15381 },
];
