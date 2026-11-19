import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ClassInfo, DetectResult, ModelInfo } from "../api/types";
import { datasetImage, detectImage, HttpApiError } from "../api/client";
import { ControlsPanel } from "../components/ControlsPanel";
import { DetectSwitch, type DetectView } from "../components/DetectSwitch";
import { OverlayCanvas } from "../components/OverlayCanvas";
import { RecommendationList } from "../components/RecommendationList";
import { UploadDropzone } from "../components/UploadDropzone";
import { colorForClass } from "../lib/colors";
import { DISEASE_GUIDE } from "../lib/diseaseGuide";
import { drawDetections } from "../lib/drawBoxes";

interface UploadPageProps {
  classes: ClassInfo[];
  models: ModelInfo[];
  view: DetectView;
  onViewChange: (view: DetectView) => void;
}

export function UploadPage({ classes, models, view, onViewChange }: UploadPageProps) {
  const available = models.find((item) => item.available) ?? models[0];
  const [model, setModel] = useState(available?.model_id ?? "yolo11s_coco");
  const [conf, setConf] = useState(0.25);
  const [iou, setIou] = useState(0.5);
  const [imgsz, setImgsz] = useState(640);
  const [hideHealthy, setHideHealthy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<DetectResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sampleLoading, setSampleLoading] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const colors = useMemo(
    () => Object.fromEntries(classes.map((item) => [item.slug, item.color])),
    [classes],
  );
  const names = useMemo(
    () => new Map(classes.map((item) => [item.slug, item.name_vi])),
    [classes],
  );
  const colorFor = useCallback((name: string) => colorForClass(name, colors), [colors]);
  const labelFor = useCallback((name: string) => names.get(name) ?? name, [names]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const selectFile = (nextFile: File) => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(nextFile);
    setPreview(URL.createObjectURL(nextFile));
    setResult(null);
    setError(null);
  };
  const changeImage = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const realSamples = useMemo(
    () => classes.filter((item) => DISEASE_GUIDE[item.slug]).slice(0, 3),
    [classes],
  );
  const loadSample = async (slug: string) => {
    const guide = DISEASE_GUIDE[slug];
    if (!guide) return;
    setSampleLoading(slug);
    setError(null);
    try {
      const response = await fetch(datasetImage("train", guide.example));
      if (!response.ok) throw new Error("sample");
      const blob = await response.blob();
      const name = guide.example.split("/").pop() || `${slug}.jpg`;
      selectFile(new File([blob], name, { type: blob.type || "image/jpeg" }));
    } catch {
      setError("Không tải được ảnh mẫu từ backend.");
    } finally {
      setSampleLoading(null);
    }
  };

  const submit = async (confidence = conf) => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      setResult(await detectImage(file, { model, conf: confidence, iou, imgsz, maxDet: 50 }));
    } catch (reason) {
      setError(reason instanceof HttpApiError ? `${reason.code}: ${reason.message}` : "Không thể nhận diện ảnh.");
    } finally {
      setLoading(false);
    }
  };
  const retryAtRecommendedConfidence = () => {
    setConf(0.25);
    void submit(0.25);
  };
  const saveSnapshot = () => {
    const image = imageRef.current;
    if (!image || !result) return;
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawDetections(context, canvas, result.image, detections, colorFor, labelFor);
    const link = document.createElement("a");
    link.download = "tomato_ket_qua_phan_tich.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const allDetections = result?.detections ?? [];
  const detections = hideHealthy
    ? allDetections.filter((item) => item.class_name !== "healthy")
    : allDetections;

  return (
    <div className="detect-grid">
      {/* Cột trái (7/12): khu vực làm việc chính, gộp Ảnh + Camera bằng Segmented Control */}
      <section className="card work-card">
        <div className="work-head">
          <div className="work-head-title">
            <span className="work-head-icon" aria-hidden="true">🌿</span>
            <div>
              <h2 className="card-title">Nhận diện qua ảnh</h2>
              <p className="card-sub">
                {result
                  ? `${detections.length} vùng phát hiện ở ngưỡng ${conf.toFixed(2)}`
                  : "Tải ảnh lá cà chua từ máy để bắt đầu"}
              </p>
            </div>
          </div>
          <DetectSwitch view={view} onChange={onViewChange} />
        </div>

        {preview ? (
          <>
            <div ref={stageRef} className="media-stage">
              <img ref={imageRef} src={preview} alt="Ảnh lá đã chọn" />
              <OverlayCanvas
                containerRef={stageRef}
                image={result?.image ?? null}
                detections={detections}
                colorForClass={colorFor}
                labelForClass={labelFor}
              />
            </div>
            <div className="upload-actions">
              <button
                type="button"
                className="btn-analyze"
                onClick={() => void submit()}
                disabled={!file || loading || !available?.available}
              >
                {loading ? "⏳ Đang phân tích…" : "🔍 Phân tích bệnh"}
              </button>
              <button type="button" className="btn-soft" onClick={saveSnapshot} disabled={!result}>
                💾 Lưu ảnh kết quả
              </button>
              <button type="button" className="btn-soft" onClick={changeImage}>
                🖼️ Đổi ảnh khác
              </button>
            </div>
          </>
        ) : (
          <>
            <UploadDropzone onFile={selectFile} />
            <div className="sample-chips">
              {realSamples.map((item, index) => (
                <button
                  key={item.slug}
                  type="button"
                  className="sample-chip"
                  onClick={() => void loadSample(item.slug)}
                  disabled={sampleLoading !== null}
                >
                  <span
                    className="sample-chip-no"
                    style={{ backgroundColor: `${item.color}1f`, color: item.color }}
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>
                    <b>{sampleLoading === item.slug ? "Đang tải…" : item.name_vi}</b>
                    <small>ảnh train thật · {item.slug}</small>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        <p className="note">
          Ảnh được gửi tới <code>/api/detect</code> của backend FastAPI, suy luận YOLO11s ONNX
          Runtime ngay trên CPU của máy này; ảnh không rời khỏi thiết bị.
        </p>
      </section>

      {/* Cột phải (5/12): KẾT QUẢ ở trên cùng, ĐIỀU KHIỂN MÔ HÌNH ở phía dưới */}
      <div className="right-col">
        <aside className="card results-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Kết quả &amp; hướng xử lý</h2>
              <p className="card-sub">Nhãn, độ tin cậy và khuyến nghị từ backend</p>
            </div>
            {result && <span className="card-tag">{Math.round(result.inference_ms)} ms</span>}
          </div>

          {!result && !error && (
            <div className="result-empty">
              <span className="result-empty-icon" aria-hidden="true">🔍</span>
              <p>
                Chọn ảnh lá cà chua ở khung bên trái, bấm “Phân tích bệnh” để nhận kết quả cùng
                hướng phòng và hướng điều trị.
              </p>
            </div>
          )}

          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}

          {result && (
            <>
              {result.input_assessment.status === "rejected" && (
                <div className="gate-warning" role="alert">
                  🚫 <b>{result.input_assessment.message}</b>
                </div>
              )}
              {result.input_assessment.status === "unverified" && (
                <p className="hint">⚠️ {result.input_assessment.message}</p>
              )}
              <div className="result-head">
                <b>Kết quả ({detections.length})</b>
                <span className="pill">
                  {result.model} · {Math.round(result.inference_ms)} ms
                </span>
              </div>
              {result.input_assessment.status === "rejected" ? (
                <p className="hint">Không chạy nhận diện bệnh vì ảnh chưa được xác minh là lá cà chua.</p>
              ) : detections.length === 0 ? (
                <>
                  <p className="hint">Chưa có vùng bệnh nào được phát hiện ở ngưỡng {conf.toFixed(2)}.</p>
                  {conf > 0.25 && (
                    <button
                      type="button"
                      className="btn-soft retry-button"
                      onClick={retryAtRecommendedConfidence}
                      disabled={loading}
                    >
                      Thử lại với độ tin cậy 0.25
                    </button>
                  )}
                </>
              ) : (
                <ul className="result-rows">
                  {detections.map((item, index) => (
                    <li key={`${item.class_name}-${index}`} className="result-row">
                      <i className="dot" style={{ backgroundColor: colorFor(item.class_name) }} />
                      <strong>{labelFor(item.class_name)}</strong>
                      <small>{item.class_name}</small>
                      <span className="conf">{(item.score * 100).toFixed(1)}%</span>
                    </li>
                  ))}
                </ul>
              )}
              {result.input_assessment.status !== "rejected" && (
                <RecommendationList recommendations={result.recommendations} />
              )}
            </>
          )}
        </aside>

        <section className="card controls-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Điều khiển mô hình</h2>
              <p className="card-sub">Tham số gửi kèm mỗi lượt suy luận</p>
            </div>
            <span className="card-tag">THAM SỐ</span>
          </div>
          <ControlsPanel
            models={models}
            model={model}
            conf={conf}
            iou={iou}
            imgsz={imgsz}
            onModel={setModel}
            onConf={setConf}
            onIou={setIou}
            onSize={setImgsz}
            hideHealthy={hideHealthy}
            onHideHealthy={setHideHealthy}
          />
        </section>
      </div>
    </div>
  );
}
