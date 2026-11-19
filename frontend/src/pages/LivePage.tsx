import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { ClassInfo, ModelInfo, StreamConfig } from "../api/types";
import { ControlsPanel } from "../components/ControlsPanel";
import { DetectSwitch, type DetectView } from "../components/DetectSwitch";
import { Disclaimer } from "../components/Disclaimer";
import { Legend } from "../components/Legend";
import { RecommendationList } from "../components/RecommendationList";
import { ResultList } from "../components/ResultList";
import { StatsBar } from "../components/StatsBar";
import { VideoStage } from "../components/VideoStage";
import { useDetectionStream } from "../hooks/useDetectionStream";
import { useFps } from "../hooks/useFps";
import { useWebcam } from "../hooks/useWebcam";
import { colorForClass } from "../lib/colors";
import { encodeVideoFrame } from "../lib/frameEncoder";

interface LivePageProps {
  classes: ClassInfo[];
  models: ModelInfo[];
  view: DetectView;
  onViewChange: (view: DetectView) => void;
}

export function LivePage({ classes, models, view, onViewChange }: LivePageProps) {
  const available = models.find((item) => item.available) ?? models[0];
  const [model, setModel] = useState(available?.model_id ?? "yolo11s_coco");
  const [conf, setConf] = useState(0.25);
  const [iou, setIou] = useState(0.5);
  const [imgsz, setImgsz] = useState(640);
  const [hideHealthy, setHideHealthy] = useState(false);
  const { videoRef, state: webcamState, error: webcamError, start: startWebcam, stop: stopWebcam } = useWebcam();
  const { fps, markFrame } = useFps();
  const stageRef = useRef<HTMLDivElement>(null);
  const config: StreamConfig = useMemo(
    () => ({ type: "config", model, conf, iou, imgsz, max_det: 50, agnostic_nms: false }),
    [model, conf, iou, imgsz],
  );
  const {
    state: streamState,
    error: streamError,
    result,
    connect,
    disconnect,
    sendJpeg,
    hasInFlight,
  } = useDetectionStream(config, markFrame);
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
  const start = useCallback(async () => {
    if (available?.available && await startWebcam()) connect();
  }, [available?.available, connect, startWebcam]);
  const stop = useCallback(() => {
    disconnect();
    stopWebcam();
  }, [disconnect, stopWebcam]);

  useEffect(() => {
    if (webcamState !== "active" || streamState !== "connected") return;
    let animation = 0;
    let encoding = false;
    let active = true;
    const tick = async () => {
      const video = videoRef.current;
      if (active && !encoding && !hasInFlight() && video?.readyState === HTMLMediaElement.HAVE_CURRENT_DATA) {
        encoding = true;
        try {
          const blob = await encodeVideoFrame(video, imgsz);
          sendJpeg(await blob.arrayBuffer());
        } catch {
          // Camera or socket state may change while JPEG encoding is pending.
        }
        encoding = false;
      }
      if (active) animation = requestAnimationFrame(() => { void tick(); });
    };
    void tick();
    return () => {
      active = false;
      cancelAnimationFrame(animation);
    };
  }, [hasInFlight, imgsz, sendJpeg, streamState, videoRef, webcamState]);

  const detections = hideHealthy
    ? (result?.detections ?? []).filter((item) => item.class_name !== "healthy")
    : (result?.detections ?? []);

  return (
    <div className="detect-grid">
      {/* Cột trái (7/12): camera thật + overlay canvas, gộp bằng Segmented Control */}
      <section className="card work-card">
        <div className="work-head">
          <div className="work-head-title">
            <span className="work-head-icon" aria-hidden="true">📷</span>
            <div>
              <h2 className="card-title">Camera trực tiếp</h2>
              <p className="card-sub">
                {webcamState === "active"
                  ? `Đang nhận khung hình thật · ${detections.length} vùng phát hiện`
                  : "Bật camera để gửi khung hình qua /ws/detect"}
              </p>
            </div>
          </div>
          <DetectSwitch view={view} onChange={onViewChange} />
        </div>

        <VideoStage
          videoRef={videoRef}
          stageRef={stageRef}
          active={webcamState === "active"}
          image={result?.image ?? null}
          detections={detections}
          colorForClass={colorFor}
          labelForClass={labelFor}
        />

        <div className="upload-actions">
          <button
            type="button"
            className="btn-analyze"
            onClick={() => void start()}
            disabled={webcamState === "starting" || !available?.available}
          >
            {webcamState === "starting" ? "⏳ Đang mở camera…" : "▶ Bật camera"}
          </button>
          <button type="button" className="btn-soft" onClick={stop} disabled={webcamState === "idle"}>
            ⏹ Dừng camera
          </button>
        </div>

        <StatsBar fps={fps} latency={result?.inference_ms ?? null} status={streamState} />

        {(webcamError || streamError) && (
          <p className="error" role="alert">
            {webcamError ?? streamError}
          </p>
        )}

        <p className="note">
          Khung hình JPEG được gửi liên tục qua <code>/ws/detect</code>; backend chỉ xử lý khung mới
          nhất nên hình không bị trễ dây chuyền khi CPU chậm.
        </p>
      </section>

      {/* Cột phải (5/12): KẾT QUẢ ở trên cùng, ĐIỀU KHIỂN MÔ HÌNH ở phía dưới */}
      <div className="right-col">
        <aside className="card results-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Kết quả &amp; hướng xử lý</h2>
              <p className="card-sub">Cập nhật theo từng khung hình mới nhất</p>
            </div>
            {result && <span className="card-tag">{Math.round(result.inference_ms)} ms</span>}
          </div>

          <ResultList detections={detections} classes={classes} />

          {result?.input_assessment.status === "rejected" && (
            <p className="gate-warning">🚫 {result.input_assessment.message}</p>
          )}
          {result?.input_assessment.status === "unverified" && (
            <p className="hint">⚠️ {result.input_assessment.message}</p>
          )}
          {result?.input_assessment.status !== "rejected" && result && (
            <RecommendationList recommendations={result.recommendations} />
          )}

          <Legend classes={classes} />
          <Disclaimer />
        </aside>

        <section className="card controls-card">
          <div className="card-head">
            <div>
              <h2 className="card-title">Điều khiển mô hình</h2>
              <p className="card-sub">Áp dụng ngay cho luồng WebSocket đang mở</p>
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
