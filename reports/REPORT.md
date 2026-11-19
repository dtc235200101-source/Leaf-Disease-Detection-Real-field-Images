# Evaluation report — Tomato Leaf Detector

Sinh tự động từ artifact: `runs\yolo11s_coco_smoke\metrics_test.json`  
Split được chấm: `test`  
Thời điểm tạo artifact: `2026-11-01T14:49:48.602989+00:00`

> Mọi số liệu dưới đây được đọc trực tiếp từ JSON của lần chạy thật. Không có giá trị nào được nhập tay hoặc ước lượng.

### Validation

Nguồn: `data\processed\tomato_coco\annotations\val.json` + `runs\yolo11s_coco_smoke\predictions_val.json`

| mAP@0.5 | mAP@0.5:0.95 | Precision | Recall |
| ---: | ---: | ---: | ---: |
| 0.2285 | 0.1251 | 0.3275 | 0.2961 |

### Test (chỉ chạy sau evaluation lock)

Nguồn: `data\processed\tomato_coco\annotations\test.json` + `runs\yolo11s_coco_smoke\predictions_test.json`

| mAP@0.5 | mAP@0.5:0.95 | Precision | Recall |
| ---: | ---: | ---: | ---: |
| 0.2668 | 0.1661 | 0.2320 | 0.3854 |

### Per-class metrics (test)

| id | lớp | tên tiếng Việt | support | AP@0.5 | AP@0.5:0.95 |
| ---: | --- | --- | ---: | ---: | ---: |
| 0 | `early_blight` | Úa sớm (đốm vòng) | 19 | 0.1980 | 0.1540 |
| 1 | `septoria_leaf_spot` | Đốm lá Septoria | 24 | 0.5494 | 0.3761 |
| 2 | `bacterial_spot` | Đốm vi khuẩn | 14 | 0.0292 | 0.0233 |
| 3 | `late_blight` | Mốc sương (úa muộn) | 14 | 0.5429 | 0.3695 |
| 4 | `mosaic_virus` | Virus khảm | 36 | 0.1030 | 0.0537 |
| 5 | `yellow_virus` | Virus vàng/xoăn lá | 42 | 0.4875 | 0.2409 |
| 6 | `leaf_mold` | Mốc lá | 16 | 0.0221 | 0.0099 |
| 7 | `spider_mites` | Nhện hai chấm | 0 | — | — |
| 8 | `healthy` | Lá khỏe | 27 | 0.2019 | 0.1014 |

**Cảnh báo:** các lớp sau không có ground-truth box trong tập test, nên AP không có ý nghĩa: 7 (spider_mites).

### Operating point (chọn trên validation)

| threshold | precision | recall | F1 |
| ---: | ---: | ---: | ---: |
| 0.15 | 0.3275 | 0.2961 | 0.3110 |

Ngưỡng này được chọn bằng F1 trên `val` và không dùng test để điều chỉnh.

### Inference latency

| thiết bị | imgsz | warm-up | số lượt đo | P50 (ms) | P95 (ms) |
| --- | ---: | ---: | ---: | ---: | ---: |
| cpu | 320 | 5 | 30 | 49.09 | 54.99 |

Input: `0.jpg: 480x360 RGB`. Đây là latency inference-only trên local, không gồm encode JPEG, WebSocket hay vẽ overlay.

### Dataset splits

| split | ảnh | box | ảnh nhiều box |
| --- | ---: | ---: | ---: |
| train | 620 | 2206 | 367 |
| val | 30 | 439 | 29 |
| test | 69 | 192 | 35 |

Near-duplicate groups: 697; nhóm cắt qua train/test: 5; ảnh train bị loại vì trùng test: 5.

## Phạm vi và hạn chế

PlantDoc gồm ảnh thực địa lấy từ Internet với độ phủ lớp không đều; nhãn đánh dấu một lá hoặc cụm lá, không phân đoạn từng vết bệnh. Ảnh webcam khác về ánh sáng, ống kính, khoảng cách, độ mờ, giống cây, nền và giai đoạn bệnh, nên các số liệu này không chứng minh hiệu năng ngoài split đã đánh giá.

MVP chạy một seed trên CPU với cấu hình ngắn (`imgsz=320`, 10 epoch); chưa có bootstrap confidence interval và chưa chạy ma trận 6 cấu hình × 3 seed. Không nên dùng kết quả này để kết luận kiến trúc nào tốt hơn.
