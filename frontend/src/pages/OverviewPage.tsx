import { useEffect, useMemo, useState } from "react";

import type { ClassInfo } from "../api/types";
import { BarChart, type BarRow } from "../components/BarChart";
import { clearHistory, readHistory, subscribeHistory, type HistoryEntry } from "../lib/history";
import {
  BOXES_BY_SPLIT,
  DATASET_TOTALS,
  MODEL_METRICS,
  SPLIT_TOTALS,
  TRAINING,
  formatNumber,
  formatPercent,
  sumAcrossSplits,
} from "../lib/plantdocStats";

interface OverviewPageProps {
  classes: ClassInfo[];
  onGoDetect: () => void;
  ready: boolean;
  modelId: string;
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", { hour12: false });
}

export function OverviewPage({ classes, onGoDetect, ready, modelId }: OverviewPageProps) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(readHistory());
    return subscribeHistory(() => setHistory(readHistory()));
  }, []);

  const totalBoxesByClass = useMemo(() => sumAcrossSplits(BOXES_BY_SPLIT), []);
  const classById = useMemo(() => new Map(classes.map((item) => [item.slug, item])), [classes]);

  const boxRows: BarRow[] = useMemo(
    () =>
      classes.map((item) => ({
        key: item.slug,
        label: item.name_vi,
        value: totalBoxesByClass[item.id] ?? 0,
        color: item.color,
        hint: `train ${BOXES_BY_SPLIT.train[item.id] ?? 0} · val ${BOXES_BY_SPLIT.val[item.id] ?? 0} · test ${BOXES_BY_SPLIT.test[item.id] ?? 0}`,
      })),
    [classes, totalBoxesByClass],
  );

  return (
    <main className="overview">
      <section className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <span className="hero-eyebrow">ĐỒ ÁN · PLANTDOC TOMATO · YOLO11s</span>
            <h1>Phát hiện bệnh lá cà chua trong ảnh thực địa</h1>
            <p>
              Hệ thống khoanh vùng lá hoặc cụm lá cà chua bị bệnh trên 9 lớp của bộ PlantDoc
              (tomato), chạy suy luận YOLO11s qua ONNX Runtime trên CPU và trả kèm hướng phòng trừ.
              Bounding box mô tả lá/cụm lá, không khoanh từng vết bệnh.
            </p>
            <div className="hero-chips">
              <span className="chip chip-strong">YOLO11s fine-tune</span>
              <span className="chip">ONNX Runtime</span>
              <span className="chip">PlantDoc · 9 classes</span>
              <span className="chip">{DATASET_TOTALS.source.split(" (")[0]}</span>
            </div>
            <div className="hero-actions">
              <button type="button" className="btn-cta" onClick={onGoDetect}>
                Nhận diện ảnh ngay
              </button>
              <span className="hero-note">
                Checkpoint: <code>{TRAINING.checkpoint}</code>
              </span>
            </div>
          </div>

          <aside className="hero-summary" aria-label="Tóm tắt kỹ thuật mô hình">
            <div className="hero-summary-head">
              <span className={`hero-status ${ready ? "on" : "off"}`}>
                <i aria-hidden="true" />
                {ready ? "Ready" : "Offline"}
              </span>
              <span className="card-tag">ONNX</span>
            </div>
            <dl className="hero-summary-list">
              <div>
                <dt>Model</dt>
                <dd>YOLOv11 · ONNX Runtime</dd>
              </div>
              <div>
                <dt>Input</dt>
                <dd>640 × 640</dd>
              </div>
              <div>
                <dt>Device</dt>
                <dd>CPU · imgsz {MODEL_METRICS.latency.imageSize}</dd>
              </div>
              <div>
                <dt className="is-mono">Checkpoint</dt>
                <dd className="is-mono">{modelId}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>

      <section className="kpi-grid" aria-label="Chỉ số tổng quan">
        <article className="kpi-card">
          <span className="kpi-icon" aria-hidden="true">🖼️</span>
          <b>{formatNumber(DATASET_TOTALS.images)}</b>
          <span className="kpi-label">ảnh đã xử lý</span>
          <small>
            train {SPLIT_TOTALS.train.images} · val {SPLIT_TOTALS.val.images} · test{" "}
            {SPLIT_TOTALS.test.images}
          </small>
        </article>
        <article className="kpi-card">
          <span className="kpi-icon" aria-hidden="true">📐</span>
          <b>{formatNumber(DATASET_TOTALS.boxes)}</b>
          <span className="kpi-label">bounding box thật</span>
          <small>
            {SPLIT_TOTALS.train.boxes} train · {SPLIT_TOTALS.val.boxes} val · {SPLIT_TOTALS.test.boxes}{" "}
            test
          </small>
        </article>
        <article className="kpi-card">
          <span className="kpi-icon" aria-hidden="true">🎯</span>
          <b>{MODEL_METRICS.test.map50.toFixed(4)}</b>
          <span className="kpi-label">mAP@0.5 trên test</span>
          <small>mAP@0.5:0.95 {MODEL_METRICS.test.map50_95.toFixed(4)}</small>
        </article>
        <article className="kpi-card">
          <span className="kpi-icon" aria-hidden="true">⚡</span>
          <b>{MODEL_METRICS.latency.p50.toFixed(1)} ms</b>
          <span className="kpi-label">latency P50 trên CPU</span>
          <small>
            P95 {MODEL_METRICS.latency.p95.toFixed(1)} ms · imgsz {MODEL_METRICS.latency.imageSize}
          </small>
        </article>
      </section>

      <div className="overview-split">
        <section className="card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Phân bố 9 lớp trong PlantDoc (tomato)</h2>
              <p className="card-sub">Số box ground-truth theo lớp, cộng cả train / val / test</p>
            </div>
            <span className="card-tag">{formatNumber(DATASET_TOTALS.boxes)} box</span>
          </div>
          <BarChart rows={boxRows} unit=" box" />
          <p className="note">
            Precision {formatPercent(MODEL_METRICS.test.precision)} · recall{" "}
            {formatPercent(MODEL_METRICS.test.recall)} · ngưỡng vận hành{" "}
            {MODEL_METRICS.operatingPoint.threshold} cho F1{" "}
            {MODEL_METRICS.operatingPoint.f1.toFixed(4)} (chọn trên val). Số box đếm trực tiếp từ{" "}
            <code>data/processed/tomato_yolo/labels</code>; lớp <code>spider_mites</code> chỉ có 1 box
            train và 1 box val nên AP không có ý nghĩa.
          </p>
        </section>

        <section className="card history-panel">
          <div className="card-head">
            <div>
              <h2 className="card-title">Lịch sử nhận diện</h2>
              <p className="card-sub">Các lượt thật đã chạy trong phiên trình duyệt này</p>
            </div>
            {history.length > 0 && (
              <button type="button" className="link-button" onClick={() => clearHistory()}>
                Xoá lịch sử
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div className="history-empty">
              <span aria-hidden="true">🕘</span>
              <p>
                Chưa có lượt nhận diện nào. Mở tab <b>Nhận diện AI</b> và phân tích một ảnh lá — kết
                quả thật sẽ được ghi lại ở đây (tối đa 12 lượt gần nhất).
              </p>
              <button type="button" className="btn-cta btn-cta-small" onClick={onGoDetect}>
                Đi tới nhận diện
              </button>
            </div>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Nguồn</th>
                  <th>Chẩn đoán</th>
                  <th>Độ tin cậy</th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => {
                  const top = [...entry.detections].sort((a, b) => b.score - a.score)[0];
                  const meta = top ? classById.get(top.className) : undefined;
                  return (
                    <tr key={entry.id}>
                      <td>
                        <span className="history-source">{entry.model}</span>
                        <br />
                        <small>
                          {formatTime(entry.at)} · {Math.round(entry.inferenceMs)} ms
                        </small>
                      </td>
                      <td>
                        {top ? (
                          <span className="history-disease">
                            <i style={{ backgroundColor: meta?.color ?? "#94a3b8" }} aria-hidden="true" />
                            {meta?.name_vi ?? top.className}
                            {entry.detections.length > 1 && (
                              <small>+{entry.detections.length - 1}</small>
                            )}
                          </span>
                        ) : (
                          <span className="history-source">Không phát hiện vùng bệnh</span>
                        )}
                      </td>
                      <td>
                        <span className="history-conf">
                          {top ? formatPercent(top.score) : "—"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="card note-panel">
        <h2>Phạm vi số liệu</h2>
        <p className="note">
          Các chỉ số trên lấy từ lần chạy <code>{TRAINING.experimentId}</code> (imgsz{" "}
          {TRAINING.imageSize}, {TRAINING.epochs} epoch, batch {TRAINING.batch}, device{" "}
          {TRAINING.device}, seed {TRAINING.seed}), artifact tạo lúc {TRAINING.artifactTimestamp} và
          được ghi tự động vào <code>reports/REPORT.md</code>. Đây là cấu hình ngắn chạy trên CPU nên
          không dùng để kết luận kiến trúc nào tốt hơn; ảnh webcam thực tế khác về ánh sáng, ống kính
          và nền so với split đã đánh giá.
        </p>
      </section>
    </main>
  );
}
