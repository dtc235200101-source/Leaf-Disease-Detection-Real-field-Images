import { useState } from "react";

import { datasetImage } from "../api/client";
import type { ClassInfo } from "../api/types";
import { DISEASE_GUIDE } from "../lib/diseaseGuide";
import { AboutPage } from "./AboutPage";

const GROUP_VI: Record<string, string> = {
  fungal_oomycete: "nấm / oomycete",
  bacterial: "vi khuẩn",
  viral: "virus",
  pest: "côn trùng",
  healthy: "khỏe",
};

export function LibraryPage({ classes }: { classes: ClassInfo[] }) {
  const [zoom, setZoom] = useState<{ src: string; title: string } | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const closeZoom = () => setZoom(null);

  const keyword = query.trim().toLowerCase();
  const filtered = classes.filter((item) => {
    if (group !== "all" && item.group !== group) return false;
    if (!keyword) return true;
    return (
      item.name_vi.toLowerCase().includes(keyword) ||
      item.slug.toLowerCase().includes(keyword) ||
      (DISEASE_GUIDE[item.slug]?.symptom ?? "").toLowerCase().includes(keyword)
    );
  });

  return (
    <main className="library-page">
      <section className="panel">
        <div className="section-head">
          <div>
            <h1>Thư viện bệnh &amp; Giới thiệu</h1>
            <p className="card-sub">
              Triệu chứng thật của 9 lớp PlantDoc; “Cách xử lý” và “Lưu ý” lấy nguyên văn từ{" "}
              <code>recommendations.py</code> mà tab Nhận diện AI cũng trả về.
            </p>
          </div>
          <span className="chip chip-strong">{filtered.length} / {classes.length} lớp</span>
        </div>

        <div className="filter-controls">
          <input
            type="search"
            className="text-input"
            placeholder="Tìm theo tên bệnh, lớp hoặc triệu chứng…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Tìm bệnh trong thư viện"
          />
          <select
            className="select-input"
            value={group}
            onChange={(event) => setGroup(event.target.value)}
            aria-label="Lọc theo nhóm tác nhân"
          >
            <option value="all">Tất cả nhóm tác nhân</option>
            {Object.entries(GROUP_VI).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 && (
          <div className="history-empty">
            <span aria-hidden="true">🔎</span>
            <p>Không có lớp nào khớp từ khoá “{query}”. Xoá bộ lọc để xem lại 9 lớp cà chua.</p>
            <button
              type="button"
              className="btn-cta btn-cta-small"
              onClick={() => {
                setQuery("");
                setGroup("all");
              }}
            >
              Xoá bộ lọc
            </button>
          </div>
        )}

        <div className="disease-grid">
          {filtered.map((item) => {
            const guide = DISEASE_GUIDE[item.slug];
            const src = guide ? datasetImage("train", guide.example) : null;
            return (
              <article key={item.slug} className="disease-card">
                <div className="disease-card-head">
                  <i className="dot" style={{ backgroundColor: item.color }} aria-hidden="true" />
                  <div>
                    <h3>{item.name_vi}</h3>
                    <small>
                      {item.slug} · {GROUP_VI[item.group] ?? item.group}
                    </small>
                  </div>
                </div>

                {src && (
                  <button
                    type="button"
                    className="disease-thumb"
                    onClick={() => setZoom({ src, title: item.name_vi })}
                    aria-label={`Xem ảnh minh hoạ: ${item.name_vi}`}
                  >
                    <img src={src} alt={item.name_vi} loading="lazy" />
                    <span>Xem ảnh thật</span>
                  </button>
                )}

                <div className="disease-block">
                  <h4>Triệu chứng &amp; tác nhân</h4>
                  <p>{guide?.symptom ?? "Chưa có mô tả cho lớp này."}</p>
                </div>

                <div className="disease-block">
                  <h4>Cách xử lý</h4>
                  {guide ? (
                    <ul>
                      {guide.actions.map((action) => (
                        <li key={action}>{action}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>Chưa có hướng dẫn cho lớp này.</p>
                  )}
                </div>

                <div className="disease-caution">
                  <b>Lưu ý</b>
                  <span>{guide?.caution ?? "—"}</span>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <div className="section-head">
          <h2>Kiến trúc xử lý của hệ thống</h2>
          <span className="chip">YOLO11s · ONNX Runtime · CPU</span>
        </div>
        <div className="arch-grid">
          <article className="arch-step">
            <span className="arch-num">01</span>
            <h4>Thu nhận ảnh thực địa</h4>
            <p>719 ảnh PlantDoc (tomato) đã lọc còn 9 lớp, bounding box khoanh lá hoặc cụm lá.</p>
          </article>
          <article className="arch-step">
            <span className="arch-num">02</span>
            <h4>Tiền xử lý</h4>
            <p>Letterbox về imgsz 320/416/640, chuẩn hoá RGB và chuyển sang tensor NCHW.</p>
          </article>
          <article className="arch-step">
            <span className="arch-num">03</span>
            <h4>Suy luận YOLO11s ONNX</h4>
            <p>
              FastAPI nhận ảnh hoặc khung JPEG qua <code>/ws/detect</code>, chạy onnxruntime trên
              CPU rồi áp NMS theo ngưỡng IoU.
            </p>
          </article>
          <article className="arch-step">
            <span className="arch-num">04</span>
            <h4>Kết quả &amp; khuyến nghị</h4>
            <p>Trả box, nhãn, độ tin cậy và hướng xử lý lấy từ bảng khuyến nghị của backend.</p>
          </article>
        </div>
      </section>

      <AboutPage />

      {zoom && (
        <div className="lightbox" role="dialog" onClick={closeZoom}>
          <button type="button" aria-label="Đóng">
            ✕
          </button>
          <img src={zoom.src} alt={zoom.title} onClick={(event) => event.stopPropagation()} />
          <p>{zoom.title}</p>
        </div>
      )}
    </main>
  );
}
