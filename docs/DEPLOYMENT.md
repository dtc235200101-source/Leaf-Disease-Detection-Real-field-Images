# Đưa dịch vụ từ localhost lên online (Render)

## 1. Stack thực tế của dự án

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| Backend | **Python 3.12 + FastAPI + Uvicorn** | `src/tomato_det/serving/`, REST `/api/*` + WebSocket `/ws/detect` |
| Model AI | **YOLO11s export ONNX, chạy bằng onnxruntime** | graph ở `weights/yolo11s_coco/best.onnx` (~36 MB); train/eval vẫn dùng PyTorch nhưng **không nằm trong image** |
| Frontend | **React 19 + Vite 7 + TypeScript** | build tĩnh vào `frontend/dist`, được FastAPI phục vụ tại `/` |
| Dữ liệu | Không có database | chỉ đọc manifest `data/splits/*.txt` |

Vì có **backend Python + model AI (onnxruntime) + WebSocket**, hai hướng sau không dùng được:

- **GitHub Pages**: chỉ phục vụ file tĩnh, không chạy được Python/torch/WebSocket.
- **Vercel (một project một framework)**: serverless function giới hạn dung lượng bundle (không chứa nổi torch) và WebSocket stateful không phù hợp. Từ 2026 Vercel có **Services** (nhiều service trong một project) — xem mục 9 để dùng làm phương án thay thế.

→ Mặc định dùng **Render Web Service (Docker, plan free)**: build một image duy nhất chứa cả React build, FastAPI và checkpoint.

## 2. File cấu hình đã có trong repo

| File | Vai trò |
|---|---|
| `Dockerfile` | multi-stage: build React bằng Node 22 → runtime Python 3.12 + onnxruntime (**không cài torch**) |
| `requirements-serve.txt` | chỉ onnxruntime + FastAPI + Pillow/numpy; không kéo torch/ultralytics/torchmetrics/pycocotools |
| `render.yaml` | Blueprint: Docker, `plan: free`, health check `/api/health`, env `TDET_*` |
| `.dockerignore` | loại `data/`, `runs/`, `reports/`, `.venv`, `*.pt`/`*.onnx`… nhưng **giữ** `deploy/model/best.onnx` |
| `deploy/model/best.onnx` | graph ONNX được đóng vào image (vì `weights/**/*.onnx` bị git-ignore) |

`weights/` vẫn là đường dẫn app đọc lúc chạy; Dockerfile copy `deploy/model/best.onnx` vào `weights/yolo11s_coco/best.onnx`. Suy luận trong service đi qua `src/tomato_det/models/onnx_detector.py` (letterbox + decode + NMS numpy), không import torch.

## 3. Deploy bằng Blueprint (khuyến nghị)

1. Đẩy code lên GitHub (nhánh `main`) — đã có trong bước commit của agent.
2. Vào <https://dashboard.render.com> → **New** → **Blueprint**.
3. Chọn repository `tomato-leaf-detector` → Render đọc `render.yaml` → **Apply**.
4. Chờ build **5–12 phút** (tải wheel torch CPU ~200 MB + `npm ci` + `vite build`).
5. Mở `https://<tên-service>.onrender.com`.

Render tự inject biến `PORT`; container chạy
`uvicorn tomato_det.serving.main:app --host 0.0.0.0 --port $PORT`.

## 4. Thông số khi tạo Web Service thủ công

**Cách A — Docker (giống `render.yaml`):**

| Trường | Giá trị |
|---|---|
| Language / Environment | `Docker` |
| Dockerfile Path | `./Dockerfile` |
| Docker Build Context | `.` |
| Build Command | *(để trống — Docker tự build)* |
| Start Command | *(để trống — dùng `CMD` trong Dockerfile)* |
| Health Check Path | `/api/health` |
| Instance Type | `Free` |

Biến môi trường: `TDET_DEVICE=cpu`, `TDET_MAX_LOADED_MODELS=1`, `TDET_LOG_LEVEL=INFO`.

**Cách B — Python runtime (không dùng Docker):** cần tự build sẵn `frontend/dist` và commit nó, hoặc chấp nhận chỉ có API không có UI.

| Trường | Giá trị |
|---|---|
| Build Command | `pip install -r requirements-serve.txt && pip install --no-deps -e .` |
| Start Command | `uvicorn tomato_det.serving.main:app --host 0.0.0.0 --port $PORT` |
| Health Check Path | `/api/health` |

Start Command trên chính là lệnh chuẩn cần dán vào Render: bind `0.0.0.0` và đọc `$PORT`.

## 5. Giới hạn của plan free (đọc trước khi deploy)

- **RAM 512 MB.** Đo thực tế trên máy dev (RSS, một tiến trình): đường PyTorch cũ cần **275 MB sau khi nạp model và 436 MB sau một lần suy luận `imgsz=640`**; đường ONNX chỉ **107 MB / 145 MB**, và cả app FastAPI (model nạp lười) là **66 MB khi rảnh, 178 MB sau request đầu, 205 MB sau 4 request**. Vậy bản ONNX còn thừa ~300 MB cho uvicorn và request đồng thời. Nếu vẫn bị OOM, gói có 2 GB RAM là **Standard (25 USD/tháng)** — *Starter (7 USD) vẫn chỉ 512 MB* nên không giải quyết RAM.
- **Spin down sau ~15 phút không có request** → request đầu tiên chậm khoảng 30–60 giây (cold start, phải nạp lại model).
- **Không có persistent disk** trên free plan → checkpoint phải nằm trong image (đó là lý do dùng `deploy/model/best.pt`).
- **Tốc độ suy luận.** Đo trên máy 6 core (1 thread ORT): **240 ms/frame @`imgsz=640`**, **57 ms @320** sau warm-up; request đầu tiên chậm hơn (~2,3 s) vì phiên onnxruntime khởi tạo và tối ưu graph lần đầu. Trên 0.1 CPU của free plan, con số này sẽ cao hơn nhiều (ước tính bậc 1–2 s/frame) nên upload ảnh vẫn ổn, còn live preview sẽ giật. Muốn nhanh hơn: nâng plan có nhiều CPU hơn và đặt biến `TDET_ORT_THREADS` (mặc định `1`).
- **Image nhỏ hơn trước** (không còn wheel torch ~200 MB) nên build nhanh hơn, nhưng vẫn vài phút.
- Một số tài khoản Render yêu cầu xác minh thẻ trước khi tạo service free.
- Ảnh upload và frame webcam **rời khỏi máy bạn** và được xử lý trên server Render — khác với thiết kế local ban đầu.

## 6. Kiểm tra sau khi deploy

1. `GET https://<service>/api/health` → `status: "ok"`.
2. `GET https://<service>/api/models` → `available: true` (nếu `false`, checkpoint chưa vào image).
3. Mở `https://<service>/` → tải ảnh lá cà chua → có bbox + nhãn + `inference_ms`.
4. Webcam: HTTPS bắt buộc cho `getUserMedia`; socket phải là `wss://<service>/ws/detect`.
5. Trang "Dữ liệu dataset" chỉ hiện số lượng split; ảnh mẫu không được đóng vào image nên sẽ trả 404 (hành vi có chủ đích).

## 7. Cập nhật model sau này

```powershell
# sau khi train xong: export graph ONNX động (cho phép imgsz 320/416/640)
.venv\Scripts\python.exe -c "from ultralytics import YOLO; YOLO('runs/<exp_id>/weights/best.pt').export(format='onnx', imgsz=640, dynamic=True, opset=12, simplify=False)"
Copy-Item runs/<exp_id>/weights/best.onnx weights/yolo11s_coco/best.onnx -Force
Copy-Item weights/yolo11s_coco/best.onnx deploy/model/best.onnx -Force
git add deploy/model/best.onnx
git commit -m "Update deployed ONNX graph"
git push
```

Sau đó bấm **Manual Deploy** trên Render (Blueprint mặc định không auto-deploy khi chưa bật).

## 8. Ghi chú license

Checkpoint được phân phối kèm image kế thừa **AGPL-3.0** từ Ultralytics. Không đưa dataset PlantDoc lên repo/image công khai (CC BY 4.0, ảnh gốc thu thập từ internet).

## 9. Phương án thay thế: Vercel Services

Repo có sẵn `vercel.json` mô tả **một project, hai service**:

| Service | Root | Framework | Public tại |
|---|---|---|---|
| `app` | `.` | `fastapi` (entrypoint `main:app`) | `/api/*`, `/ws/*` |
| `frontend` | `frontend` | `vite` | mọi path còn lại (`/`) |

Không có binding giữa hai service: frontend là SPA tĩnh, gọi API bằng URL tương đối
(`frontend/src/api/endpoints.ts`), nên trình duyệt đi qua cùng domain và rewrite
`/api/*` mới là thứ nối hai service. Binding chỉ inject biến môi trường vào function
lúc chạy, Vite build không đọc được.

Thiết lập trên Vercel (Project → Settings → Environment Variables):

| Biến | Giá trị | Lý do |
|---|---|---|
| `TDET_CHECKPOINT_YOLO11S_COCO` | `deploy/model/best.onnx` | `app.yaml` trỏ `weights/yolo11s_coco/best.onnx` (bị git-ignore); Vercel chỉ có bản trong `deploy/model` |
| `TDET_DEVICE` | `cpu` | serverless không có GPU |
| `TDET_MAX_LOADED_MODELS` | `1` | giới hạn RAM của function |

`main.py` ở root chỉ thêm `src/` vào `sys.path` rồi export `app`, vì Vercel tìm
`main.py`/`app.py` ở root còn package nằm trong `src/`. Không đặt `installCommand`
cho service `app`: lệnh cài tùy biến làm Vercel **không tối ưu bundle** và vượt giới hạn
225 MB (scipy/PyWavelets kéo theo `ImageHash`, uvicorn…). Để Vercel tự cài và tự prune
theo import graph; `functions.excludeFiles` loại thêm tài liệu/artefact khỏi bundle.

Hạn chế cần biết trước khi chọn Vercel:

- Function có giới hạn thời lượng; WebSocket `/ws/detect` sẽ bị ngắt khi hết thời gian, client phải tự nối lại.
- Bundle Python (onnxruntime + numpy + Pillow + graph 36 MB) phải nằm dưới hạn mức 500 MB; `.vercelignore` đã loại `reports/`, `runs/`, `data/raw`, `weights/`, `tests/`.
- Cold start tương tự Render free; model nạp lười ở request đầu.

