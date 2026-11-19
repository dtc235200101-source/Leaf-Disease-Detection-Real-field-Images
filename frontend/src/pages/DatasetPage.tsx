import { useEffect, useMemo, useState } from "react";

import { datasetImage, getDatasetSplits, type SplitSummary } from "../api/client";
import type { ClassInfo } from "../api/types";
import { BarChart, type BarRow } from "../components/BarChart";
import { LineChart } from "../components/LineChart";
import {
  BOXES_BY_SPLIT,
  DATASET_TOTALS,
  IMAGES_BY_SPLIT,
  METRIC_ARTIFACTS,
  MODEL_METRICS,
  PER_CLASS_METRICS,
  SPLIT_ORDER,
  SPLIT_TOTALS,
  TRAINING,
  TRAINING_CURVE,
  formatNumber,
  formatPercent,
  sumAcrossSplits,
  type SplitName,
} from "../lib/plantdocStats";

const GROUP_VI: Record<string, string> = {
  fungal_oomycete: "nấm",
  bacterial: "vi khuẩn",
  viral: "virus",
  pest: "côn trùng",
  healthy: "khỏe",
};

const SPLIT_VI: Record<SplitName, string> = { train: "train", val: "val", test: "test" };

type BoxFilter = SplitName | "all";

const FILTERS: { key: BoxFilter; label: string }[] = [
  { key: "all", label: "Tất cả split" },
  { key: "train", label: "train" },
  { key: "val", label: "val" },
  { key: "test", label: "test" },
];

export function DatasetPage({ classes }: { classes: ClassInfo[] }) {
  const [splits, setSplits] = useState<SplitSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<string>("val");
  const [boxFilter, setBoxFilter] = useState<BoxFilter>("all");
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    getDatasetSplits()
      .then(setSplits)
      .catch(() => setError("Không đọc được dữ liệu dataset — backend chưa chạy."));
  }, []);

  const current = useMemo(() => splits.find((item) => item.name === active) ?? null, [splits, active]);

  const boxRows: BarRow[] = useMemo(() => {
    const values =
      boxFilter === "all" ? sumAcrossSplits(BOXES_BY_SPLIT) : BOXES_BY_SPLIT[boxFilter];
    return classes.map((item) => ({
      key: item.slug,
      label: item.name_vi,
      value: values[item.id] ?? 0,
      color: item.color,
      hint:
        boxFilter === "all"
          ? `${formatNumber(values[item.id] ?? 0)} box / 3 split`
          : `${formatNumber(values[item.id] ?? 0)} box`,
    }));
  }, [boxFilter, classes]);

  const imageRows: BarRow[] = useMemo(
    () =>
      classes.map((item) => ({
        key: item.slug,
        label: item.name_vi,
        value: (IMAGES_BY_SPLIT.train[item.id] ?? 0) + (IMAGES_BY_SPLIT.val[item.id] ?? 0) + (IMAGES_BY_SPLIT.test[item.id] ?? 0),
        color: item.color,
        hint: `${IMAGES_BY_SPLIT.train[item.id] ?? 0} / ${IMAGES_BY_SPLIT.val[item.id] ?? 0} / ${IMAGES_BY_SPLIT.test[item.id] ?? 0}`,
      })),
    [classes],
  );

  const apRows: BarRow[] = useMemo(
    () =>
      PER_CLASS_METRICS.map((metric) => {
        const meta = classes.find((item) => item.id === metric.classId);
        return {
          key: String(metric.classId),
          label: `${metric.classId} · ${meta?.name_vi ?? meta?.slug ?? "?"}`,
          value: metric.ap50 ?? 0,
          color: meta?.color,
          display: metric.ap50 === null ? "—" : metric.ap50.toFixed(4),
          hint: metric.support === 0 ? "0 box GT" : `support ${metric.support}`,
        };
      }),
    [classes],
  );

  const closeZoom = () => setZoom(null);

  return (
    <main className="dataset-page">
      <section className="dataset-banner">
        <div>
          <span className="dataset-eyebrow">DATASET · PLANTDOC TOMATO</span>
          <h1>Dataset &amp; Biểu đồ huấn luyện</h1>
          <p className="card-sub">
            Nguồn {DATASET_TOTALS.source.split(" (")[0]} · lọc đúng 9 lớp cà chua · khử gần trùng
            pHash {DATASET_TOTALS.phashDistance} · seed {DATASET_TOTALS.seed}
          </p>
        </div>
        <div className="dataset-pops">
          <div className="dataset-pop accent">
            <span>ảnh</span>
            <b>{formatNumber(DATASET_TOTALS.images)}</b>
          </div>
          <div className="dataset-pop">
            <span>box nhãn</span>
            <b>{formatNumber(DATASET_TOTALS.boxes)}</b>
          </div>
          <div className="dataset-pop">
            <span>lớp</span>
            <b>{DATASET_TOTALS.classes}</b>
          </div>
          <div className="dataset-pop">
            <span>nhóm gần trùng</span>
            <b>{DATASET_TOTALS.nearDuplicateGroups}</b>
          </div>
        </div>
        <p className="dataset-note">
          Pipeline lọc theo đúng 9 lớp cà chua trong <code>configs/classes.yaml</code>, khử gần trùng
          pHash (distance {DATASET_TOTALS.phashDistance}), chia val{" "}
          {formatPercent(DATASET_TOTALS.valFraction, 0)} với seed {DATASET_TOTALS.seed}. Train{" "}
          {SPLIT_TOTALS.train.images} ảnh / {SPLIT_TOTALS.train.boxes} box · val{" "}
          {SPLIT_TOTALS.val.images} / {SPLIT_TOTALS.val.boxes} · test {SPLIT_TOTALS.test.images} /{" "}
          {SPLIT_TOTALS.test.boxes}. Có {DATASET_TOTALS.crossSplitGroups} nhóm cắt qua train/test và{" "}
          {DATASET_TOTALS.droppedTrainImages} ảnh train bị loại vì trùng với test.
        </p>
      </section>

      <div className="chart-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Số box theo 9 lớp</h2>
              <p className="card-sub">Đếm trực tiếp từ labels ground-truth của từng split</p>
            </div>
            <div className="split-tabs split-tabs-small" role="tablist">
              {FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  role="tab"
                  aria-selected={boxFilter === filter.key}
                  className={boxFilter === filter.key ? "active" : ""}
                  onClick={() => setBoxFilter(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>
          <BarChart rows={boxRows} unit=" box" />
        </section>

        <section className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Đường huấn luyện theo epoch</h2>
              <p className="card-sub">
                {TRAINING.experimentId} · imgsz {TRAINING.imageSize} · device {TRAINING.device}
              </p>
            </div>
            <span className="card-tag">{TRAINING.epochs} epoch</span>
          </div>
          <LineChart
            labels={TRAINING_CURVE.map((point) => String(point.epoch))}
            series={[
              {
                key: "map50",
                label: "mAP@0.5",
                color: "#16a34a",
                values: TRAINING_CURVE.map((point) => point.map50),
              },
              {
                key: "map5095",
                label: "mAP@0.5:0.95",
                color: "#10b981",
                values: TRAINING_CURVE.map((point) => point.map50_95),
              },
              {
                key: "precision",
                label: "Precision",
                color: "#0ea5e9",
                values: TRAINING_CURVE.map((point) => point.precision),
              },
              {
                key: "recall",
                label: "Recall",
                color: "#f59e0b",
                values: TRAINING_CURVE.map((point) => point.recall),
              },
            ]}
          />
          <p className="note">
            Đọc từ <code>runs/{TRAINING.experimentId}/results.csv</code>: mAP@0.5 từ{" "}
            {TRAINING_CURVE[0].map50.toFixed(4)} lên {TRAINING_CURVE[TRAINING_CURVE.length - 1].map50.toFixed(4)},
            recall từ {TRAINING_CURVE[0].recall.toFixed(4)} lên{" "}
            {TRAINING_CURVE[TRAINING_CURVE.length - 1].recall.toFixed(4)}. Đây là cấu hình smoke
            test {TRAINING.epochs} epoch trên CPU nên chưa hội tụ.
          </p>
        </section>
      </div>

      <section className="panel">
        <div className="section-head">
          <h2>Số ảnh có chứa lớp (train / val / test)</h2>
          <span className="chip">{formatNumber(DATASET_TOTALS.images)} ảnh</span>
        </div>
        <BarChart rows={imageRows} unit=" ảnh" />
        <p className="note">
          Một ảnh có thể chứa nhiều lớp, nên tổng theo lớp lớn hơn tổng số ảnh. Số nhỏ trong ngoặc
          là thứ tự train / val / test.
        </p>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Đánh giá mô hình gốc</h2>
          <span className="chip">
            {TRAINING.experimentId} · imgsz {TRAINING.imageSize} · {TRAINING.epochs} epoch
          </span>
        </div>

        <div className="metric-table-wrap">
          <table className="metric-table">
            <thead>
              <tr>
                <th>Split</th>
                <th>mAP@0.5</th>
                <th>mAP@0.5:0.95</th>
                <th>Precision</th>
                <th>Recall</th>
              </tr>
            </thead>
            <tbody>
              {SPLIT_ORDER.filter((split) => split !== "train").map((split) => (
                <tr key={split}>
                  <td>{SPLIT_VI[split]}</td>
                  <td>{MODEL_METRICS[split].map50.toFixed(4)}</td>
                  <td>{MODEL_METRICS[split].map50_95.toFixed(4)}</td>
                  <td>{formatPercent(MODEL_METRICS[split].precision, 2)}</td>
                  <td>{formatPercent(MODEL_METRICS[split].recall, 2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="note">
          Ngưỡng vận hành {MODEL_METRICS.operatingPoint.threshold} được chọn bằng F1 trên val
          (P {formatPercent(MODEL_METRICS.operatingPoint.precision, 2)} · R{" "}
          {formatPercent(MODEL_METRICS.operatingPoint.recall, 2)} · F1{" "}
          {MODEL_METRICS.operatingPoint.f1.toFixed(4)}), không dùng test để điều chỉnh. Latency
          inference-only trên CPU: P50 {MODEL_METRICS.latency.p50} ms, P95 {MODEL_METRICS.latency.p95} ms
          (warm-up {MODEL_METRICS.latency.warmup}, {MODEL_METRICS.latency.runs} lượt đo).
        </p>

        <h3 className="sub-heading">AP@0.5 theo lớp (test)</h3>
        <BarChart rows={apRows} />
        <p className="note">
          Dựng trực tiếp từ <code>reports/per_class_metrics.csv</code>. Lớp{" "}
          <code>spider_mites</code> không có box ground-truth trong test nên không có AP.
        </p>

        <h3 className="sub-heading">Biểu đồ gốc của lần chạy</h3>
        <div className="artifact-grid">
          {METRIC_ARTIFACTS.map((artifact) => (
            <figure key={artifact.file} className="artifact-card">
              <button type="button" onClick={() => setZoom(artifact.file)} aria-label={`Xem lớn: ${artifact.title}`}>
                <img src={artifact.file} alt={artifact.title} loading="lazy" />
              </button>
              <figcaption>
                <b>{artifact.title}</b>
                <small>{artifact.note}</small>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Ảnh thật trong dataset</h2>
          <div className="split-tabs" role="tablist">
            {splits.map((item) => (
              <button
                key={item.name}
                type="button"
                role="tab"
                aria-selected={active === item.name}
                className={active === item.name ? "active" : ""}
                onClick={() => setActive(item.name)}
              >
                {item.name} ({item.count})
              </button>
            ))}
          </div>
        </div>
        {splits.length === 0 && !error && <p className="note">Đang tải ảnh từ backend…</p>}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <p className="note">Ảnh đọc trực tiếp qua API backend; nhấp để xem lớn.</p>

        <div className="gallery">
          {current?.samples.map((imageId) => {
            const src = datasetImage(current.name, imageId);
            return (
              <figure key={imageId} title={imageId}>
                <img
                  src={src}
                  alt={imageId}
                  loading="lazy"
                  onClick={() => setZoom(src)}
                  onError={(event) => {
                    const target = event.currentTarget;
                    target.parentElement!.classList.add("broken");
                    target.remove();
                  }}
                />
                <figcaption>{(imageId.split("/").pop() ?? "").slice(0, 26)}</figcaption>
              </figure>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>9 lớp bệnh (configs/classes.yaml)</h2>
          <span className="chip">{classes.length} lớp</span>
        </div>
        <table className="class-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Lớp</th>
              <th>Tên tiếng Việt</th>
              <th>Nhóm</th>
              <th>Box (train/val/test)</th>
            </tr>
          </thead>
          <tbody>
            {classes.map((item) => (
              <tr key={item.slug}>
                <td>{item.id}</td>
                <td>{item.slug}</td>
                <td>
                  <i className="dot" style={{ backgroundColor: item.color }} aria-hidden="true" />
                  {item.name_vi}
                </td>
                <td>
                  <span className="tag">{GROUP_VI[item.group] ?? item.group}</span>
                </td>
                <td>
                  {BOXES_BY_SPLIT.train[item.id] ?? 0} / {BOXES_BY_SPLIT.val[item.id] ?? 0} /{" "}
                  {BOXES_BY_SPLIT.test[item.id] ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {zoom && (
        <div className="lightbox" role="dialog" onClick={closeZoom}>
          <button type="button" aria-label="Đóng">
            ✕
          </button>
          <img src={zoom} alt="phóng to" onClick={(event) => event.stopPropagation()} />
        </div>
      )}
    </main>
  );
}
