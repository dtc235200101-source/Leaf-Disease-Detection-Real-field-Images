export type DetectView = "upload" | "live";

interface DetectSwitchProps {
  view: DetectView;
  onChange: (view: DetectView) => void;
}

export function DetectSwitch({ view, onChange }: DetectSwitchProps) {
  return (
    <div className="segmented" role="tablist" aria-label="Chế độ nhận diện">
      <button
        type="button"
        role="tab"
        aria-selected={view === "upload"}
        aria-controls="detect-view-upload"
        className={view === "upload" ? "active" : ""}
        onClick={() => onChange("upload")}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2.5" />
          <circle cx="8.5" cy="8.5" r="1.6" />
          <path d="m21 15-4.5-4.5L7 20" />
        </svg>
        Ảnh
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={view === "live"}
        aria-controls="detect-view-live"
        className={view === "live" ? "active" : ""}
        onClick={() => onChange("live")}
      >
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 10.5V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-3.5l6 4.5V6l-6 4.5Z" />
        </svg>
        Camera
      </button>
    </div>
  );
}
