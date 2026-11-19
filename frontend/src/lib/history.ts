import type { DetectResult } from "../api/types";

export interface HistoryDetection {
  className: string;
  score: number;
}

export interface HistoryEntry {
  id: string;
  at: string;
  model: string;
  inferenceMs: number;
  detections: HistoryDetection[];
}

const STORAGE_KEY = "tdet.history.v1";
const HISTORY_EVENT = "tdet:history";
const MAX_ENTRIES = 12;

function isEntry(value: unknown): value is HistoryEntry {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.at === "string" &&
    typeof item.model === "string" &&
    typeof item.inferenceMs === "number" &&
    Array.isArray(item.detections)
  );
}

export function readHistory(): HistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry);
  } catch {
    return [];
  }
}

/** Ghi lại một lượt nhận diện thật (chỉ gọi khi backend đã trả kết quả thành công). */
export function appendHistory(result: DetectResult): void {
  const entry: HistoryEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    at: new Date().toISOString(),
    model: result.model,
    inferenceMs: result.inference_ms,
    detections: result.detections.map((item) => ({
      className: item.class_name,
      score: item.score,
    })),
  };
  const next = [entry, ...readHistory()].slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    return;
  }
  window.dispatchEvent(new CustomEvent(HISTORY_EVENT));
}

export function clearHistory(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
  window.dispatchEvent(new CustomEvent(HISTORY_EVENT));
}

export function subscribeHistory(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(HISTORY_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(HISTORY_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
