import { useEffect, useState, type ReactNode } from "react";

import { getClasses, getModels } from "./api/client";
import type { ClassInfo, ModelInfo } from "./api/types";
import type { DetectView } from "./components/DetectSwitch";
import { DatasetPage } from "./pages/DatasetPage";
import { LibraryPage } from "./pages/LibraryPage";
import { LivePage } from "./pages/LivePage";
import { OverviewPage } from "./pages/OverviewPage";
import { UploadPage } from "./pages/UploadPage";

type Tab = "overview" | "detect" | "dataset" | "library";

interface NavItem {
  id: Tab;
  label: string;
  caption: string;
  badge?: string;
  icon: ReactNode;
}

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  width: 18,
  height: 18,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const NAV_ITEMS: NavItem[] = [
  {
    id: "overview",
    label: "Trang tổng quan",
    caption: "Tổng quan",
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3" y="3" width="7" height="9" rx="1.6" />
        <rect x="14" y="3" width="7" height="5" rx="1.6" />
        <rect x="14" y="12" width="7" height="9" rx="1.6" />
        <rect x="3" y="16" width="7" height="5" rx="1.6" />
      </svg>
    ),
  },
  {
    id: "detect",
    label: "Nhận diện AI",
    caption: "Nhận diện",
    badge: "Ảnh & Cam",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 8V5.5A2.5 2.5 0 0 1 5.5 3H8" />
        <path d="M16 3h2.5A2.5 2.5 0 0 1 21 5.5V8" />
        <path d="M21 16v2.5A2.5 2.5 0 0 1 18.5 21H16" />
        <path d="M8 21H5.5A2.5 2.5 0 0 1 3 18.5V16" />
        <circle cx="12" cy="12" r="3.2" />
      </svg>
    ),
  },
  {
    id: "dataset",
    label: "Dataset & Biểu đồ",
    caption: "Dataset",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M3 20h18" />
        <rect x="5" y="12" width="3.4" height="8" rx="1" />
        <rect x="10.3" y="7" width="3.4" height="13" rx="1" />
        <rect x="15.6" y="3.5" width="3.4" height="16.5" rx="1" />
      </svg>
    ),
  },
  {
    id: "library",
    label: "Thư viện bệnh & Giới thiệu",
    caption: "Thư viện",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17.5H6.5A2.5 2.5 0 0 0 4 22V4.5Z" />
        <path d="M8 7h7M8 11h7" />
      </svg>
    ),
  },
];

const PAGE_TITLES: Record<Tab, string> = {
  overview: "Trang tổng quan hệ thống",
  detect: "Nhận diện AI · Ảnh & Camera",
  dataset: "Dataset & Biểu đồ huấn luyện",
  library: "Thư viện bệnh & Giới thiệu đề tài",
};

export default function App() {
  const [tab, setTab] = useState<Tab>("overview");
  const [detectView, setDetectView] = useState<DetectView>("upload");
  const [menuOpen, setMenuOpen] = useState(false);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([getClasses(), getModels()])
      .then(([nextClasses, nextModels]) => {
        setClasses(nextClasses);
        setModels(nextModels);
      })
      .catch(() => setError("Không kết nối được backend local. Kiểm tra server đã chạy chưa."));
  }, []);

  const ready = models.some((item) => item.available);
  const activeModel = models.find((item) => item.available)?.model_id ?? "chưa nạp model";
  const goDetect = () => {
    setTab("detect");
    setMenuOpen(false);
  };

  return (
    <div className="app-shell">
      <button
        type="button"
        className={`sidebar-backdrop${menuOpen ? " show" : ""}`}
        aria-label="Đóng menu điều hướng"
        onClick={() => setMenuOpen(false)}
      />

      <aside className={`sidebar${menuOpen ? " open" : ""}`}>
        <div>
          <div className="sidebar-brand">
            <a className="brand-logo" href="#overview" onClick={(event) => { event.preventDefault(); setTab("overview"); }}>
              <span className="mark">
                <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden="true">
                  <defs>
                    <linearGradient id="lgLeafSide" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor="#34d399" />
                      <stop offset="1" stopColor="#15803d" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M32 20c-11 0-18 6.6-18 16.4C14 48 22.4 55 33.6 55 44 55 51 47.8 51 37.4 51 27 44.4 20 32 20Z"
                    fill="url(#lgLeafSide)"
                  />
                  <path d="M33 21c-1.6-6 1.2-11 5.4-13.6-.4 5.6-1.8 9.4-5.4 13.6Z" fill="#22c55e" />
                  <path d="M31 21c-4.6-3-9.8-3-13.2-.6 4 3.4 8.6 3.4 13.2.6Z" fill="#22c55e" />
                  <path d="M34 21c4.6-3 9.8-3 13.2-.6-4 3.4-8.6 3.4-13.2.6Z" fill="#4ade80" />
                  <path d="M25 36c2.6-2.6 7.8-2.6 10.4 0" stroke="#ffffff" strokeWidth="2.6" fill="none" strokeLinecap="round" opacity=".85" />
                </svg>
              </span>
              <strong>
                Phát hiện bệnh
                <br />
                <span>lá cà chua</span>
              </strong>
            </a>
            <button type="button" className="sidebar-close" aria-label="Đóng menu" onClick={() => setMenuOpen(false)}>
              ✕
            </button>
          </div>

          <div className="sidebar-menu">
            <p className="sidebar-label">Phân hệ</p>
            <nav className="main-nav" aria-label="Điều hướng chính">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`nav-btn${tab === item.id ? " active" : ""}`}
                  aria-current={tab === item.id ? "page" : undefined}
                  onClick={() => {
                    setTab(item.id);
                    setMenuOpen(false);
                  }}
                >
                  <span>
                    {item.icon}
                    {item.label}
                    {item.badge && <span className="nav-badge">{item.badge}</span>}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        <div className="sidebar-runtime">
          <div className="runtime-card">
            <div className="runtime-top">
              <span className={`runtime-status ${ready ? "on" : "off"}`}>
                <i aria-hidden="true" />
                {ready ? "MODEL ONLINE" : "MODEL OFFLINE"}
              </span>
              <span className="runtime-version">v11.0</span>
            </div>
            <b>YOLO11s · ONNX Runtime</b>
            <small>
              PlantDoc · 9 lớp cà chua. {ready ? `Checkpoint đang phục vụ: ${activeModel}.` : "Backend chưa nạp được checkpoint."}
            </small>
          </div>
        </div>
      </aside>

      <div className="workspace">
        <header className="app-header">
          <div className="header-inner">
            <div className="header-left">
              <button
                type="button"
                className="mobile-menu"
                aria-label="Mở menu điều hướng"
                onClick={() => setMenuOpen(true)}
              >
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M4 7h16M4 12h16M4 17h16" />
                </svg>
              </button>
              <div>
                <div>
                  <span className="header-eyebrow">FIELD SCAN</span>
                  <span className="header-sub">Ảnh thực địa · PlantDoc tomato</span>
                </div>
                <h1 className="header-title">{PAGE_TITLES[tab]}</h1>
              </div>
            </div>

            <div className="header-right">
              <span className={`model-pill${ready ? "" : " off"}`} role="status">
                <i aria-hidden="true" />
                {ready ? "MODEL ONLINE" : "MODEL OFFLINE"}
              </span>
              <button type="button" className="btn-primary" onClick={goDetect}>
                Quét lá ngay
              </button>
            </div>
          </div>
        </header>

        {error && (
          <p className="error app-error" role="alert">
            {error}
          </p>
        )}

        <main className="app-main">
          <div className="app-container">
            {tab === "overview" && (
              <OverviewPage classes={classes} onGoDetect={goDetect} ready={ready} modelId={activeModel} />
            )}

            {tab === "detect" && (
              <>
                {/* Giữ cả hai chế độ trong DOM để webcam, canvas overlay và WebSocket
                    không bị tháo khi chuyển chế độ; chỉ ẩn/hiện bằng CSS. */}
                <div id="detect-view-upload" className="detect-view" role="tabpanel" hidden={detectView !== "upload"}>
                  <UploadPage classes={classes} models={models} view={detectView} onViewChange={setDetectView} />
                </div>
                <div id="detect-view-live" className="detect-view" role="tabpanel" hidden={detectView !== "live"}>
                  <LivePage classes={classes} models={models} view={detectView} onViewChange={setDetectView} />
                </div>
              </>
            )}

            {tab === "dataset" && <DatasetPage classes={classes} />}

            {tab === "library" && <LibraryPage classes={classes} />}
          </div>
        </main>
      </div>
    </div>
  );
}
