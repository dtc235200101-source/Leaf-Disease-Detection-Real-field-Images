from __future__ import annotations

import csv
import json
from pathlib import Path

from docx import Document
from docx.enum.table import WD_ALIGN_VERTICAL
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.shared import Inches, Pt, RGBColor
from docx.text.paragraph import Paragraph
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "reports" / "Nhom_06_Phat_hien_benh_la_ca_chua_cap_nhat.docx"
OUTPUT = ROOT / "reports" / "Nhom_06_Phat_hien_benh_la_ca_chua_bo_sung_chuong_2_3.docx"
ASSETS = ROOT / "reports" / "docx_qa" / "group06_assets_v2"
RUN = ROOT / "runs" / "yolo11s_coco_smoke"


def font(size: int, bold: bool = False):
    candidates = [
        r"C:\Windows\Fonts\arialbd.ttf" if bold else r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\calibrib.ttf" if bold else r"C:\Windows\Fonts\calibri.ttf",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    return ImageFont.load_default()


def text_center(draw, box, text, fnt, fill="#111827"):
    left, top, right, bottom = box
    bounds = draw.multiline_textbbox((0, 0), text, font=fnt, align="center", spacing=5)
    w, h = bounds[2] - bounds[0], bounds[3] - bounds[1]
    draw.multiline_text(((left + right - w) / 2, (top + bottom - h) / 2), text, font=fnt, fill=fill, align="center", spacing=5)


def box(draw, rect, text, color):
    draw.rounded_rectangle(rect, radius=18, fill=color, outline="#2d5a3c", width=3)
    text_center(draw, rect, text, font(29, True), "#10291a")


def arrow(draw, start, end):
    draw.line([start, end], fill="#357a4b", width=6)
    x, y = end
    draw.polygon([(x, y), (x - 18, y - 10), (x - 18, y + 10)], fill="#357a4b")


def make_pipeline():
    image = Image.new("RGB", (1800, 720), "white")
    draw = ImageDraw.Draw(image)
    text_center(draw, (0, 25, 1800, 90), "Pipeline dữ liệu PlantDoc và chuẩn bị huấn luyện", font(38, True))
    labels = [
        "PlantDoc\nảnh + annotation",
        "Kiểm tra ảnh\nCSV và bbox",
        "Chuẩn hóa 9 lớp\ncà chua",
        "pHash phát hiện\ntrùng gần trùng",
        "Split không rò rỉ\ntrain / val / test",
        "YOLO txt và\nCOCO JSON",
    ]
    colors = ["#e7f4e8", "#e6f0ff", "#fff3d7", "#f6e9ff", "#e3f7f7", "#eaf0ff"]
    x0, width, gap = 35, 250, 45
    for i, (label, color) in enumerate(zip(labels, colors, strict=False)):
        x = x0 + i * (width + gap)
        box(draw, (x, 240, x + width, 470), label, color)
        if i < len(labels) - 1:
            arrow(draw, (x + width + 8, 355), (x + width + gap - 8, 355))
    text_center(draw, (100, 550, 1700, 650), "Mỗi bước lưu log để có thể kiểm tra nguồn ảnh, nhãn, split và định dạng xuất.", font(28), "#374151")
    image.save(ASSETS / "plantdoc_pipeline.png")


def make_training_chart(rows):
    image = Image.new("RGB", (1800, 900), "white")
    draw = ImageDraw.Draw(image)
    title = font(38, True)
    small = font(20)
    text_center(draw, (0, 20, 1800, 80), "Kết quả huấn luyện YOLO11s smoke run 10 epoch trên CPU", title)

    # Left: losses
    panels = [(110, 150, 845, 760), (955, 150, 1690, 760)]
    for panel in panels:
        draw.rounded_rectangle(panel, radius=14, outline="#b6c2ba", width=2, fill="#fcfdfc")
    for x0, y0, x1, y1, heading, series, colors, y_max in [
        (110, 150, 845, 760, "Training loss", ["train/box_loss", "train/cls_loss", "train/dfl_loss"], ["#c23b22", "#235789", "#6b8e23"], 3.6),
        (955, 150, 1690, 760, "Validation mAP", ["metrics/mAP50(B)", "metrics/mAP50-95(B)"], ["#136f3b", "#8d5a00"], 0.32),
    ]:
        draw.text((x0 + 24, y0 + 18), heading, font=font(28, True), fill="#1f2937")
        plot = (x0 + 65, y0 + 85, x1 - 35, y1 - 80)
        draw.line((plot[0], plot[3], plot[2], plot[3]), fill="#566", width=2)
        draw.line((plot[0], plot[1], plot[0], plot[3]), fill="#566", width=2)
        for tick in range(5):
            value = y_max * tick / 4
            yy = plot[3] - (plot[3] - plot[1]) * tick / 4
            draw.line((plot[0], yy, plot[2], yy), fill="#e5e7eb", width=1)
            draw.text((x0 + 8, yy - 11), f"{value:.1f}" if y_max > 1 else f"{value:.2f}", font=small, fill="#59636b")
        for index, row in enumerate(rows):
            xx = plot[0] + (plot[2] - plot[0]) * index / (len(rows) - 1)
            draw.text((xx - 8, plot[3] + 14), str(int(row["epoch"])), font=small, fill="#59636b")
        for key, color in zip(series, colors, strict=False):
            points = []
            for index, row in enumerate(rows):
                xx = plot[0] + (plot[2] - plot[0]) * index / (len(rows) - 1)
                yy = plot[3] - (float(row[key]) / y_max) * (plot[3] - plot[1])
                points.append((xx, yy))
            draw.line(points, fill=color, width=4)
            draw.text((x0 + 30 + series.index(key) * 220, y1 - 42), key.replace("metrics/", "").replace("(B)", ""), font=small, fill=color)
    image.save(ASSETS / "training_curves_smoke.png")


def make_metrics_chart(val, test, per_class):
    image = Image.new("RGB", (1800, 900), "white")
    draw = ImageDraw.Draw(image)
    text_center(draw, (0, 20, 1800, 80), "Đánh giá checkpoint YOLO11s sau 10 epoch", font(38, True))
    # Overview bars
    panel = (90, 150, 840, 770)
    draw.rounded_rectangle(panel, radius=14, outline="#b6c2ba", width=2, fill="#fcfdfc")
    draw.text((120, 178), "Validation và test", font=font(28, True), fill="#1f2937")
    labels = [("mAP@0.5", "map50"), ("mAP@0.5:0.95", "map50_95"), ("Precision", "precision"), ("Recall", "recall")]
    colors = ["#2962a3", "#6e4e9e"]
    for idx, (label, key) in enumerate(labels):
        y = 290 + idx * 110
        draw.text((125, y + 15), label, font=font(22), fill="#374151")
        for j, (metric, color) in enumerate([(val[key], colors[0]), (test[key], colors[1])]):
            x = 370 + j * 205
            w = int(float(metric) * 235)
            draw.rounded_rectangle((x, y, x + w, y + 35), radius=8, fill=color)
            draw.text((x, y + 44), f"{float(metric) * 100:.1f}%", font=font(20, True), fill=color)
    draw.rectangle((370, 700, 392, 722), fill=colors[0])
    draw.text((402, 699), "Validation", font=font(20), fill="#374151")
    draw.rectangle((550, 700, 572, 722), fill=colors[1])
    draw.text((582, 699), "Test", font=font(20), fill="#374151")
    # per-class AP50
    panel = (930, 150, 1710, 770)
    draw.rounded_rectangle(panel, radius=14, outline="#b6c2ba", width=2, fill="#fcfdfc")
    draw.text((960, 178), "AP@0.5 theo lớp trên test", font=font(28, True), fill="#1f2937")
    usable = [x for x in per_class if x["ap50"] is not None]
    max_w = 330
    for idx, item in enumerate(usable):
        y = 250 + idx * 58
        draw.text((960, y), item["short"], font=font(19), fill="#374151")
        x = 1205
        width = int(item["ap50"] * max_w)
        draw.rounded_rectangle((x, y, x + width, y + 26), radius=6, fill="#177245")
        draw.text((x + max(width + 8, 54), y + 1), f"{item['ap50']:.3f}", font=font(18), fill="#174b2c")
    draw.text((960, 710), "Nhện hai chấm không có ground-truth ở test; không tính AP.", font=font(18), fill="#7c2d12")
    image.save(ASSETS / "metrics_summary_smoke.png")


def make_confusion(path):
    with path.open(encoding="utf-8-sig") as stream:
        rows = list(csv.reader(stream))
    headers = rows[0][1:]
    labels = [row[0] for row in rows[1:]]
    values = [[int(v) for v in row[1:]] for row in rows[1:]]
    width, height, left, top, cell = 1500, 1320, 260, 210, 94
    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    text_center(draw, (0, 25, width, 90), "Ma trận nhầm lẫn trên tập test", font(38, True))
    max_value = max(max(row) for row in values)
    for j, name in enumerate(headers):
        text_center(draw, (left + j * cell, 120, left + (j + 1) * cell, top - 6), name.replace("background", "bg"), font(15), "#374151")
    for i, name in enumerate(labels):
        text_center(draw, (15, top + i * cell, left - 8, top + (i + 1) * cell), name.replace("background", "bg"), font(15), "#374151")
        for j, value in enumerate(values[i]):
            level = value / max_value if max_value else 0
            color = (int(240 - 160 * level), int(249 - 85 * level), int(242 - 140 * level))
            x, y = left + j * cell, top + i * cell
            draw.rectangle((x, y, x + cell, y + cell), fill=color, outline="#d1d5db")
            text_center(draw, (x, y, x + cell, y + cell), str(value), font(21, True), "#0f172a")
    draw.text((left, 1190), "Hàng: nhãn thật; cột: nhãn dự đoán; bg: background.", font=font(22), fill="#374151")
    image.save(ASSETS / "confusion_matrix_test.png")


def set_run_font(run, size=12, bold=False):
    run.font.name = "Times New Roman"
    run.font.size = Pt(size)
    run.bold = bold
    run.font.color.rgb = RGBColor(0, 0, 0)


def clear_set(paragraph, text):
    paragraph.clear()
    run = paragraph.add_run(text)
    set_run_font(run)
    return paragraph


def after(anchor, text="", style=None):
    node = OxmlElement("w:p")
    anchor._p.addnext(node)
    paragraph = Paragraph(node, anchor._parent)
    if style:
        paragraph.style = style
    if text:
        set_run_font(paragraph.add_run(text))
    return paragraph


def add_picture_after(anchor, picture, caption, width=6.1):
    para = after(anchor)
    para.alignment = WD_ALIGN_PARAGRAPH.CENTER
    para.add_run().add_picture(str(picture), width=Inches(width))
    cap = after(para, caption, "4_Figures_c6")
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    return cap


def add_table_after(doc, anchor, headers, rows, widths=None):
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    table.autofit = True
    for index, value in enumerate(headers):
        cell = table.rows[0].cells[index]
        cell.text = str(value)
        cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
        for run in cell.paragraphs[0].runs:
            set_run_font(run, 10, True)
    for source_row in rows:
        cells = table.add_row().cells
        for index, value in enumerate(source_row):
            cells[index].text = str(value)
            cells[index].vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            for run in cells[index].paragraphs[0].runs:
                set_run_font(run, 10)
    anchor._p.addnext(table._tbl)
    return table


def after_table(table, text="", style=None):
    node = OxmlElement("w:p")
    table._tbl.addnext(node)
    paragraph = Paragraph(node, table._parent)
    if style:
        paragraph.style = style
    if text:
        set_run_font(paragraph.add_run(text))
    return paragraph


def find_paragraph(doc, starts):
    for paragraph in doc.paragraphs:
        if paragraph.text.strip().startswith(starts):
            return paragraph
    raise ValueError(f"Không tìm thấy đoạn: {starts}")


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    with (RUN / "metrics_val.json").open(encoding="utf-8") as stream:
        val = json.load(stream)["metrics"]
    with (RUN / "metrics_test.json").open(encoding="utf-8") as stream:
        test = json.load(stream)["metrics"]
    with (RUN / "results.csv").open(encoding="utf-8") as stream:
        training_rows = list(csv.DictReader(stream))
    names = ["early blight", "septoria", "bacterial", "late blight", "mosaic", "yellow virus", "leaf mold", "spider mites", "healthy"]
    short = ["Early blight", "Septoria", "Bacterial", "Late blight", "Mosaic", "Yellow virus", "Leaf mold", "Spider mites", "Healthy"]
    per_class = [dict(item, name=names[item["class_id"]], short=short[item["class_id"]]) for item in test["per_class"]]
    make_pipeline()
    make_training_chart(training_rows)
    make_metrics_chart(val, test, per_class)
    make_confusion(ROOT / "reports" / "confusion_matrix.csv")

    doc = Document(SOURCE)
    # Align the central architecture name with the implemented project.
    clear_set(find_paragraph(doc, "CHƯƠNG 2. MÔ HÌNH"), "CHƯƠNG 2. MÔ HÌNH VÀ PHƯƠNG PHÁP XÂY DỰNG HỆ THỐNG YOLO11S")
    # Add a real implementation-oriented data-pipeline visual to Chapter 2.
    ch2_anchor = find_paragraph(doc, "2.2.5. Phân chia")
    ch2_caption = add_picture_after(ch2_anchor, ASSETS / "plantdoc_pipeline.png", "Hình 2.8: Pipeline kiểm tra, chuẩn hóa và xuất dữ liệu PlantDoc của hệ thống")
    after(ch2_caption, "Pipeline được triển khai theo hướng có thể tái lập: mỗi ảnh, annotation và bounding box được kiểm tra trước khi đưa vào split. Cơ chế pHash được dùng để phát hiện ảnh trùng/gần trùng và tách các nhóm tương tự nhằm hạn chế rò rỉ dữ liệu giữa train, validation và test.")

    # Replace the stale placeholder training section with proven, recorded results.
    p359 = find_paragraph(doc, "Tại thời điểm cập nhật báo cáo")
    clear_set(p359, "Thực nghiệm đã tạo checkpoint YOLO11s fine-tune từ COCO tại runs/yolo11s_coco_smoke. Đây là smoke run dùng CPU, 10 epoch, batch 4 và kích thước ảnh 320; do đó kết quả dưới đây có giá trị kiểm chứng cho pipeline nhưng chưa phải cấu hình cuối cùng để triển khai thực tế.")
    p360 = find_paragraph(doc, "Evaluator đã được cài đặt")
    clear_set(p360, "Tập validation được dùng để theo dõi quá trình huấn luyện và lựa chọn ngưỡng vận hành 0.15 theo F1; sau khi khóa checkpoint và cấu hình, evaluator đã chạy trên tập test độc lập. Báo cáo giữ riêng validation và test để tránh dùng test điều chỉnh mô hình.")
    p361 = find_paragraph(doc, "Khi có dữ liệu và checkpoint")
    clear_set(p361, "Dữ liệu dùng trong lần chạy gồm 620 ảnh train, 30 ảnh validation và 69 ảnh test. Kết quả được xuất thành JSON prediction, CSV metric, confusion matrix và log latency để có thể truy vết lại.")
    table_anchor = add_picture_after(p361, ASSETS / "training_curves_smoke.png", "Hình 3.2: Diễn biến loss và mAP validation trong 10 epoch huấn luyện")
    table_cap = after(table_anchor, "Bảng 3.2: Kết quả đánh giá tổng thể của checkpoint YOLO11s smoke run", "5_Tables_c7")
    table = add_table_after(doc, table_cap, ["Tập", "mAP@0.5", "mAP@0.5:0.95", "Precision", "Recall"], [
        ["Validation", "22.85%", "12.51%", "32.75%", "29.61%"],
        ["Test", "26.68%", "16.61%", "23.20%", "38.54%"],
    ])
    table_anchor = after_table(table)
    metrics_caption = add_picture_after(table_anchor, ASSETS / "metrics_summary_smoke.png", "Hình 3.3: Tổng hợp metric validation/test và AP@0.5 theo lớp trên test")
    cm_caption = add_picture_after(metrics_caption, ASSETS / "confusion_matrix_test.png", "Hình 3.4: Ma trận nhầm lẫn của checkpoint trên tập test")
    analysis = after(cm_caption, "Kết quả test cho thấy Septoria (AP@0.5 = 54.94%), late blight (54.29%) và yellow virus (48.75%) là các lớp nhận diện tốt hơn trong lần chạy này. Bacterial spot (2.92%) và leaf mold (2.21%) có AP thấp; lớp spider mites không có ground-truth trong test nên không thể tính AP. Vì số epoch còn ít, các chênh lệch này cần được kiểm chứng lại sau khi huấn luyện đầy đủ.")
    after(analysis, "Benchmark inference-only trên CPU, ảnh 320 px, sau 5 lượt warm-up và 30 lượt đo cho P50 = 49.09 ms, P95 = 54.99 ms. Chỉ số này không bao gồm thời gian upload, mã hóa JPEG, WebSocket hay vẽ overlay trên trình duyệt.")

    # Update the formerly hypothetical error-analysis paragraph with data-backed wording.
    error_para = find_paragraph(doc, "Các nguy cơ lỗi cần được kiểm chứng")
    clear_set(error_para, "Ma trận nhầm lẫn cho thấy nhiều mẫu bacterial spot bị dự đoán thành septoria hoặc healthy; một phần late blight bị nhầm sang leaf mold. Đây là dấu hiệu mô hình còn yếu ở các biểu hiện có đốm nhỏ hoặc điều kiện ảnh khó. Việc tăng số epoch, cân bằng lớp và bổ sung ảnh thực địa có nhãn là hướng cải thiện cần ưu tiên.")

    # Replace old status-table narrative so it is not contradictory.
    stale = find_paragraph(doc, "Bảng dưới đây thay thế các số liệu")
    clear_set(stale, "Bảng trạng thái dưới đây tóm tắt các artifact đã được tạo trong lần chạy smoke. Các giá trị được lấy từ metrics_val.json, metrics_test.json, results.csv và latency.json; không nhập tay hoặc nội suy.")
    doc.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
