from __future__ import annotations

from pathlib import Path

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

ROOT = Path(__file__).resolve().parents[2]
REFERENCE = Path(r"C:\Users\Admin\Downloads\BAO CAO DU AN _Hoc may_NHOM 1_2026,09mm,25.docx")
OUTPUT = ROOT / "reports" / "BAO_CAO_TOMATO_LEAF_DETECTOR_NHOM_01.docx"


def set_run_font(run, size: float = 13, bold: bool = False, italic: bool = False) -> None:
    run.font.name = "Times New Roman"
    run._element.rPr.rFonts.set(qn("w:ascii"), "Times New Roman")
    run._element.rPr.rFonts.set(qn("w:hAnsi"), "Times New Roman")
    run._element.rPr.rFonts.set(qn("w:eastAsia"), "Times New Roman")
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = RGBColor(0, 0, 0)


def clear_paragraph(paragraph) -> None:
    p = paragraph._element
    for child in list(p):
        if child.tag != qn("w:pPr"):
            p.remove(child)


def replace_paragraph(paragraph, text: str, *, align=None, size=13, bold=False, italic=False) -> None:
    clear_paragraph(paragraph)
    if align is not None:
        paragraph.alignment = align
    run = paragraph.add_run(text)
    set_run_font(run, size=size, bold=bold, italic=italic)


def set_cell_text(cell, text: str, *, size=13, bold=False, align=WD_ALIGN_PARAGRAPH.LEFT) -> None:
    paragraph = cell.paragraphs[0]
    replace_paragraph(paragraph, text, align=align, size=size, bold=bold)
    for extra in cell.paragraphs[1:]:
        clear_paragraph(extra)


def set_cell_shading(cell, fill: str) -> None:
    cell_properties = cell._tc.get_or_add_tcPr()
    shading = cell_properties.find(qn("w:shd"))
    if shading is None:
        shading = OxmlElement("w:shd")
        cell_properties.append(shading)
    shading.set(qn("w:fill"), fill)


def set_cell_margins(cell, top=90, start=100, bottom=90, end=100) -> None:
    cell_properties = cell._tc.get_or_add_tcPr()
    margins = cell_properties.first_child_found_in("w:tcMar")
    if margins is None:
        margins = OxmlElement("w:tcMar")
        cell_properties.append(margins)
    for side, value in {"top": top, "start": start, "bottom": bottom, "end": end}.items():
        node = margins.find(qn(f"w:{side}"))
        if node is None:
            node = OxmlElement(f"w:{side}")
            margins.append(node)
        node.set(qn("w:w"), str(value))
        node.set(qn("w:type"), "dxa")


def add_page_number(paragraph) -> None:
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = paragraph.add_run("Trang ")
    set_run_font(run, size=10)
    field = OxmlElement("w:fldSimple")
    field.set(qn("w:instr"), "PAGE")
    paragraph._p.append(field)


def add_heading(document, text: str, level: int = 1) -> None:
    style = {
        1: "1_Chapter_c5",
        2: "2_1_Level2_c2",
        3: "3_1_1_Level3_c3",
    }[level]
    paragraph = document.add_paragraph(style=style)
    replace_paragraph(
        paragraph,
        text,
        align=WD_ALIGN_PARAGRAPH.CENTER if level == 1 else WD_ALIGN_PARAGRAPH.LEFT,
        size=14 if level == 1 else 13,
        bold=True,
    )
    paragraph.paragraph_format.space_before = Pt(12 if level == 1 else 8)
    paragraph.paragraph_format.space_after = Pt(6)


def add_body(document, text: str, *, bold_lead: str | None = None) -> None:
    paragraph = document.add_paragraph(style="0_TEXT_c1")
    paragraph.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    paragraph.paragraph_format.first_line_indent = Inches(0.3)
    paragraph.paragraph_format.line_spacing = 1.3
    paragraph.paragraph_format.space_after = Pt(5)
    if bold_lead:
        lead = paragraph.add_run(bold_lead)
        set_run_font(lead, bold=True)
        remainder = paragraph.add_run(text)
        set_run_font(remainder)
    else:
        run = paragraph.add_run(text)
        set_run_font(run)


def add_bullet(document, text: str) -> None:
    paragraph = document.add_paragraph(style="0_TEXT_c1")
    paragraph.paragraph_format.left_indent = Inches(0.3)
    paragraph.paragraph_format.first_line_indent = Inches(-0.18)
    paragraph.paragraph_format.line_spacing = 1.25
    run = paragraph.add_run(f"- {text}")
    set_run_font(run)


def add_caption(document, text: str, kind: str) -> None:
    paragraph = document.add_paragraph(style="5_Tables_c7" if kind == "table" else "4_Figures_c6")
    replace_paragraph(paragraph, text, align=WD_ALIGN_PARAGRAPH.CENTER, size=12, italic=True)
    paragraph.paragraph_format.space_before = Pt(6)
    paragraph.paragraph_format.space_after = Pt(4)


def add_table(document, headers: list[str], rows: list[list[str]], widths: list[float] | None = None) -> None:
    table = document.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    table.autofit = False
    for index, header in enumerate(headers):
        cell = table.rows[0].cells[index]
        set_cell_text(cell, header, size=11, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_shading(cell, "D9EAD3")
        set_cell_margins(cell)
        if widths:
            cell.width = Inches(widths[index])
    for row in rows:
        cells = table.add_row().cells
        for index, value in enumerate(row):
            set_cell_text(
                cells[index],
                value,
                size=10.5,
                align=WD_ALIGN_PARAGRAPH.CENTER if index == 0 and len(headers) <= 4 else WD_ALIGN_PARAGRAPH.LEFT,
            )
            set_cell_margins(cells[index])
            if widths:
                cells[index].width = Inches(widths[index])
    document.add_paragraph().paragraph_format.space_after = Pt(3)


def add_diagram(document) -> None:
    table = document.add_table(rows=1, cols=5)
    table.autofit = False
    labels = ["Ảnh webcam\nhoặc upload", "JPEG\nvà metadata", "FastAPI\nREST WebSocket", "YOLO11s\nlocal", "Box và\nđiểm tin cậy"]
    for index, label in enumerate(labels):
        cell = table.rows[0].cells[index]
        set_cell_text(cell, label, size=10.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
        set_cell_shading(cell, "EAF4E5" if index % 2 == 0 else "F3F3F3")
        set_cell_margins(cell, 140, 100, 140, 100)
        cell.width = Inches(1.2)
        if index < len(labels) - 1:
            paragraph = cell.add_paragraph()
            paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
            run = paragraph.add_run("→")
            set_run_font(run, size=13, bold=True)
    add_caption(document, "Hình 2.1. Luồng xử lý ảnh và trả kết quả của hệ thống", "figure")


def add_page_break(document) -> None:
    document.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


def delete_noncover_content(document) -> None:
    body = document.element.body
    cover = document.tables[0]._element
    section_properties = body.sectPr
    for child in list(body):
        if child is not cover and child is not section_properties:
            body.remove(child)


def configure_cover(document) -> None:
    cover = document.tables[0]
    set_cell_text(cover.cell(8, 0), "XÂY DỰNG HỆ THỐNG PHÁT HIỆN LÁ CÀ CHUA BỆNH TRÊN ẢNH THỰC ĐỊA SỬ DỤNG YOLO11S", size=15, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    set_cell_text(cover.cell(9, 1), "NHÓM 01", size=13, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    set_cell_text(cover.cell(10, 1), "Nguyễn Đức Thắng\nBùi Thế Vinh\nNgô Quang Mạnh", size=13)
    set_cell_text(cover.cell(11, 1), "TS. Ngô Hữu Huy", size=13)


def content(document) -> None:
    # Front matter
    add_heading(document, "LỜI CẢM ƠN")
    add_body(document, "Nhóm thực hiện xin trân trọng cảm ơn TS. Ngô Hữu Huy đã hướng dẫn và góp ý cho đề tài. Nhóm cũng cảm ơn các thầy cô Trường Đại học Công nghệ Thông tin và Truyền thông - Đại học Thái Nguyên đã trang bị kiến thức nền tảng về học máy, xử lý ảnh và phát triển phần mềm.")
    add_body(document, "Báo cáo trình bày định hướng, kiến trúc và hiện trạng triển khai của hệ thống phát hiện lá cà chua khỏe hoặc bệnh trên ảnh thực địa. Các kết quả định lượng chỉ được bổ sung sau khi dữ liệu PlantDoc, checkpoint và quy trình đánh giá được chạy thực tế.")

    add_page_break(document)
    add_heading(document, "MỤC LỤC")
    for item in [
        "LỜI CẢM ƠN",
        "PHÂN CÔNG NHIỆM VỤ",
        "DANH SÁCH CÁC BẢNG",
        "DANH SÁCH CÁC HÌNH",
        "MỞ ĐẦU",
        "CHƯƠNG 1. CƠ SỞ LÝ THUYẾT",
        "CHƯƠNG 2. MÔ HÌNH VÀ PHƯƠNG PHÁP XÂY DỰNG HỆ THỐNG",
        "CHƯƠNG 3. HIỆN TRẠNG THỰC NGHIỆM VÀ KẾ HOẠCH ĐÁNH GIÁ",
        "KẾT LUẬN",
        "TÀI LIỆU THAM KHẢO",
    ]:
        paragraph = document.add_paragraph(style="toc 1")
        replace_paragraph(paragraph, item, size=12)

    add_page_break(document)
    add_heading(document, "PHÂN CÔNG NHIỆM VỤ")
    add_body(document, "Bảng dưới đây là phương án phân công theo các hạng mục của đề tài. Thành viên cần xác nhận lại phần việc và chữ ký trước khi nộp bản chính thức.")
    add_table(document, ["STT", "Tên nhiệm vụ", "Người phụ trách"], [
        ["1", "Khảo sát PlantDoc, chuẩn hóa nhãn và kiểm tra dữ liệu", "Nguyễn Đức Thắng"],
        ["2", "Xây dựng pipeline dữ liệu, train và đánh giá mô hình", "Bùi Thế Vinh"],
        ["3", "Phát triển FastAPI, WebSocket, React và tổng hợp báo cáo", "Ngô Quang Mạnh"],
        ["4", "Rà soát tái lập, kiểm thử và chuẩn bị trình bày", "Cả nhóm"],
    ], [0.5, 4.1, 1.7])
    add_caption(document, "Bảng 0.1. Phân công dự kiến theo hạng mục", "table")

    add_page_break(document)
    add_heading(document, "DANH SÁCH CÁC BẢNG")
    for item in [
        "Bảng 0.1. Phân công dự kiến theo hạng mục",
        "Bảng 1.1. Phân biệt phân loại ảnh và phát hiện đối tượng",
        "Bảng 2.1. Chín lớp cà chua được cấu hình cho hệ thống",
        "Bảng 2.2. Các thành phần kỹ thuật của hệ thống",
        "Bảng 3.1. Quy tắc đánh giá và trạng thái dữ liệu thực nghiệm",
    ]:
        paragraph = document.add_paragraph(style="toc 5")
        replace_paragraph(paragraph, item, size=12)
    add_heading(document, "DANH SÁCH CÁC HÌNH")
    paragraph = document.add_paragraph(style="toc 4")
    replace_paragraph(paragraph, "Hình 2.1. Luồng xử lý ảnh và trả kết quả của hệ thống", size=12)

    add_page_break(document)
    add_heading(document, "MỞ ĐẦU")
    add_body(document, "Bệnh trên lá cà chua có thể làm giảm năng suất và chất lượng nông sản. Trong thực tế, người trồng thường quan sát bằng mắt; cách làm này phụ thuộc vào kinh nghiệm và dễ bị ảnh hưởng bởi điều kiện chiếu sáng, góc chụp hoặc nền ảnh. Đề tài xây dựng một ứng dụng AI chạy cục bộ để hỗ trợ khoanh vùng lá khỏe và lá bệnh trên ảnh thực địa, đồng thời hiển thị kết quả trên ảnh tải lên hoặc webcam.")
    add_body(document, "Bài toán được đặt dưới dạng phát hiện đối tượng. Mỗi dự đoán gồm nhãn lớp, độ tin cậy và hộp bao quanh lá hoặc cụm lá. Mô hình chính là YOLO11s khởi tạo từ trọng số COCO; dữ liệu hướng tới là PlantDoc Object Detection Dataset với chín lớp liên quan đến cà chua.")
    add_body(document, "Mục tiêu của hệ thống gồm: xây dựng pipeline chuẩn hóa dữ liệu có thể tái lập; huấn luyện và đánh giá trên validation trước khi dùng test; xây dựng API FastAPI có REST và WebSocket; cung cấp giao diện React hiển thị box theo đúng tỷ lệ video; và ghi nhận rõ các giới hạn của dữ liệu và kết quả.")

    add_page_break(document)
    add_heading(document, "CHƯƠNG 1. CƠ SỞ LÝ THUYẾT")
    add_heading(document, "1.1. Học máy và học sâu", 2)
    add_body(document, "Học máy là phương pháp xây dựng mô hình từ dữ liệu để dự đoán hoặc ra quyết định. Học sâu sử dụng mạng nơ-ron nhiều tầng để học đặc trưng trực tiếp từ dữ liệu. Với ảnh lá cây ngoài thực địa, học sâu phù hợp vì hình dạng lá, mức độ bệnh, ánh sáng và nền ảnh thay đổi đáng kể giữa các ảnh.")
    add_heading(document, "1.2. Phát hiện đối tượng", 2)
    add_body(document, "Phát hiện đối tượng khác với phân loại ảnh ở chỗ hệ thống phải xác định đồng thời loại đối tượng và vị trí của đối tượng. Vị trí thường được biểu diễn bằng bounding box theo tọa độ x1, y1, x2, y2. Trong đề tài này, box được chuẩn hóa về khoảng từ 0 đến 1 để backend và frontend dùng cùng một hợp đồng tọa độ.")
    add_caption(document, "Bảng 1.1. Phân biệt phân loại ảnh và phát hiện đối tượng", "table")
    add_table(document, ["Tiêu chí", "Phân loại ảnh", "Phát hiện đối tượng"], [
        ["Đầu ra", "Một hoặc nhiều nhãn cho toàn ảnh", "Nhãn, điểm tin cậy và box cho từng đối tượng"],
        ["Thông tin vị trí", "Không có", "Có tọa độ box"],
        ["Phù hợp với đề tài", "Không đủ để khoanh vùng lá", "Phù hợp với yêu cầu hiển thị vùng lá"],
    ], [1.5, 2.4, 2.4])
    add_heading(document, "1.3. YOLO11s", 2)
    add_body(document, "YOLO là họ mô hình phát hiện một giai đoạn, dự đoán đối tượng trực tiếp từ ảnh đầu vào. Cấu hình YOLO11s được chọn làm mô hình chính vì cân bằng giữa khả năng suy luận gần thời gian thực và dung lượng phù hợp cho ứng dụng local. Trọng số COCO chỉ là điểm khởi tạo; chất lượng trên chín lớp cà chua chỉ được xác nhận sau quá trình fine-tune và đánh giá thực tế.")
    add_heading(document, "1.4. Chỉ số đánh giá", 2)
    add_body(document, "Precision phản ánh tỷ lệ dự đoán dương tính đúng, recall phản ánh tỷ lệ đối tượng thật được tìm thấy. Average Precision (AP) tổng hợp đường precision-recall cho từng lớp. mAP@0.5 dùng ngưỡng IoU bằng 0,5; mAP@0.5:0.95 lấy trung bình AP trên nhiều ngưỡng IoU từ 0,5 đến 0,95. Các chỉ số này phải được tính từ dự đoán và annotation thật, không được điền bằng ước lượng.")

    add_heading(document, "CHƯƠNG 2. MÔ HÌNH VÀ PHƯƠNG PHÁP XÂY DỰNG HỆ THỐNG")
    add_heading(document, "2.1. Phân tích bài toán", 2)
    add_body(document, "Đầu vào là ảnh tĩnh hoặc frame webcam. Đầu ra là danh sách các phát hiện gồm class_id, class_name, score và box xyxy chuẩn hóa. Hệ thống phục vụ mục đích học thuật và hỗ trợ quan sát; kết quả không thay thế chẩn đoán của chuyên gia bảo vệ thực vật.")
    add_heading(document, "2.2. Dữ liệu PlantDoc và quy trình chuẩn hóa", 2)
    add_body(document, "PlantDoc Object Detection Dataset cung cấp ảnh thực địa và annotation bounding box. Pipeline đọc CSV, kiểm tra ảnh và box không hợp lệ, chuẩn hóa tên lớp, giữ chín lớp cà chua, phát hiện ảnh trùng hoặc gần trùng bằng perceptual hash, rồi tách validation từ TRAIN theo nhóm ảnh. TEST nguồn được giữ nguyên và không dùng để chọn cấu hình.")
    add_caption(document, "Bảng 2.1. Chín lớp cà chua được cấu hình cho hệ thống", "table")
    add_table(document, ["ID", "Slug", "Nhãn PlantDoc"], [
        ["0", "early_blight", "Tomato Early blight leaf"],
        ["1", "septoria_leaf_spot", "Tomato Septoria leaf spot"],
        ["2", "bacterial_spot", "Tomato leaf bacterial spot"],
        ["3", "late_blight", "Tomato leaf late blight"],
        ["4", "mosaic_virus", "Tomato leaf mosaic virus"],
        ["5", "yellow_virus", "Tomato leaf yellow virus"],
        ["6", "leaf_mold", "Tomato mold leaf"],
        ["7", "spider_mites", "Tomato two spotted spider mites leaf"],
        ["8", "healthy", "Tomato leaf"],
    ], [0.5, 1.8, 4.0])
    add_heading(document, "2.3. Kiến trúc phần mềm", 2)
    add_body(document, "Backend FastAPI cung cấp REST API cho health, classes, models và detect; WebSocket nhận JPEG frame cho chế độ live. ModelManager chỉ nạp checkpoint từ allowlist cục bộ và trả lỗi rõ ràng khi thiếu trọng số. Frontend React với Vite và TypeScript cho phép chọn model, thay đổi confidence, IoU và kích thước ảnh; canvas overlay dùng box chuẩn hóa và vùng hiển thị thực tế của object-fit contain để tránh lệch box khi letterbox.")
    add_diagram(document)
    add_caption(document, "Bảng 2.2. Các thành phần kỹ thuật của hệ thống", "table")
    add_table(document, ["Thành phần", "Công nghệ", "Vai trò"], [
        ["Dữ liệu", "PlantDoc Object Detection", "Nguồn annotation; lọc và chuẩn hóa 9 lớp cà chua"],
        ["Mô hình", "YOLO11s / Ultralytics", "Mô hình chính cho fine-tune và suy luận"],
        ["Backend", "FastAPI và Uvicorn", "REST, WebSocket, quản lý checkpoint local"],
        ["Frontend", "React, Vite, TypeScript", "Webcam, upload ảnh, canvas overlay và trạng thái suy luận"],
        ["Kiểm thử", "pytest, Vitest", "Kiểm tra pipeline, API, WebSocket và phép chiếu box"],
    ], [1.2, 1.7, 3.4])
    add_heading(document, "2.4. Giao thức suy luận live", 2)
    add_body(document, "Khi người dùng bấm Start, trình duyệt mới xin quyền webcam. Mỗi frame được thu nhỏ theo cạnh dài tối đa và mã hóa JPEG. Gói nhị phân gồm bốn byte frame_id unsigned big-endian và bytes JPEG. Client chỉ giữ tối đa một frame đang chờ phản hồi; server cũng giữ tối đa một frame pending theo chính sách latest-frame-wins. Kết quả cũ hơn frame đã vẽ sẽ bị bỏ qua.")

    add_page_break(document)
    add_heading(document, "CHƯƠNG 3. HIỆN TRẠNG THỰC NGHIỆM VÀ KẾ HOẠCH ĐÁNH GIÁ")
    add_heading(document, "3.1. Nguyên tắc đánh giá", 2)
    add_body(document, "Cấu hình model, ngưỡng vận hành và checkpoint phải được chốt bằng validation. Chỉ sau khi chốt mới chạy test một lần để báo cáo kết quả cuối. Báo cáo cần lưu metadata của run, seed, thiết bị, phiên bản thư viện, split, checkpoint, prediction và metric để tái lập.")
    add_caption(document, "Bảng 3.1. Quy tắc đánh giá và trạng thái dữ liệu thực nghiệm", "table")
    add_table(document, ["Hạng mục", "Quy tắc", "Trạng thái tại thời điểm biên soạn"], [
        ["Validation", "Dùng để chọn checkpoint, confidence và IoU", "Chưa có prediction thực tế để tổng hợp metric"],
        ["Test", "Chỉ dùng một lần sau khi khóa cấu hình", "Chưa chạy"],
        ["mAP, AP theo lớp, precision, recall", "Tính từ annotation và prediction thật", "Không có số liệu để báo cáo"],
        ["Confusion matrix", "Sinh từ ghép box theo quy tắc IoU đã ghi nhận", "Chưa sinh"],
        ["Latency", "Warm-up, đo nhiều lượt trên cùng thiết bị", "Chưa đo"],
    ], [1.65, 2.5, 2.2])
    add_heading(document, "3.2. Hiện trạng kết quả", 2)
    add_body(document, "Tại thời điểm lập báo cáo, workspace chưa chứa bản PlantDoc raw hoặc dữ liệu đã xử lý, checkpoint best.pt, prediction export hay artifact huấn luyện. Vì vậy không thể tính mAP@0.5, mAP@0.5:0.95, precision, recall, AP theo lớp, confusion matrix hoặc benchmark latency một cách hợp lệ. Báo cáo chủ động không chèn bảng số liệu minh họa để tránh nhầm lẫn với kết quả thực nghiệm.")
    add_heading(document, "3.3. Quy trình tạo kết quả hợp lệ", 2)
    add_bullet(document, "Tải PlantDoc theo giấy phép, đặt dữ liệu ngoài Git, chạy kiểm tra và chuẩn bị split tái lập.")
    add_bullet(document, "Fine-tune YOLO11s từ checkpoint COCO trên TRAIN, dùng validation để chọn checkpoint và ngưỡng vận hành.")
    add_bullet(document, "Xuất prediction validation, chạy evaluator thống nhất để sinh metrics, AP theo lớp, confusion matrix và biểu đồ từ artifact thật.")
    add_bullet(document, "Đo latency sau warm-up trên thiết bị ghi trong metadata; tách inference latency với end-to-end latency của webcam.")
    add_bullet(document, "Khóa cấu hình và checkpoint; chỉ khi đó mới chạy test cuối một lần và ghi rõ đây là kết quả test.")
    add_heading(document, "3.4. Hạn chế dữ liệu và domain gap", 2)
    add_body(document, "PlantDoc được thu thập từ ảnh trên Internet nên có thể khác ảnh webcam tại vườn về thiết bị chụp, độ phân giải, thời tiết, ánh sáng, nền, góc nhìn và mức độ che khuất. Annotation gắn cho lá hoặc cụm lá, không khoanh từng đốm bệnh. Vì vậy một mAP tốt trên split PlantDoc không đủ để kết luận hệ thống tổng quát tốt cho ruộng cà chua ở Việt Nam.")
    add_body(document, "Để kiểm tra domain gap, cần xây dựng một tập ảnh thực địa độc lập, có quyền sử dụng và annotation tách biệt. Tập này không được trộn vào test PlantDoc chính thức; kết quả phải được báo cáo riêng với điều kiện thu thập, số mẫu, cách gán nhãn và giới hạn thống kê.")

    add_page_break(document)
    add_heading(document, "KẾT LUẬN")
    add_body(document, "Đề tài xác định kiến trúc cho ứng dụng phát hiện lá cà chua chạy local: pipeline dữ liệu PlantDoc, YOLO11s là mô hình chính, FastAPI xử lý REST và WebSocket, React hiển thị upload và webcam với canvas overlay. Hợp đồng tọa độ chuẩn hóa, điều khiển backpressure frame và cơ chế thông báo thiếu checkpoint giúp hệ thống có hướng triển khai rõ ràng và tránh báo lỗi mơ hồ.")
    add_body(document, "Phần thực nghiệm chưa có số liệu vì dữ liệu, checkpoint và artifact đánh giá chưa hiện diện trong workspace. Bước tiếp theo là chuẩn bị dữ liệu hợp lệ, chạy training và validation, sinh tự động toàn bộ bảng/biểu đồ từ artifact thực, sau đó khóa cấu hình trước khi đánh giá test. Báo cáo chỉ nên được cập nhật bằng các file do pipeline tạo ra.")

    add_page_break(document)
    add_heading(document, "TÀI LIỆU THAM KHẢO")
    references = [
        "[1] D. Singh, N. Jain, P. Jain, P. Kayal, S. Kumawat và N. Batra, PlantDoc A Dataset for Visual Plant Disease Detection, CoDS COMAD, 2020. DOI: 10.1145/3371158.3371196.",
        "[2] PlantDoc Object Detection Dataset, repository của Pratik Kayal. https://github.com/pratikkayal/PlantDoc-Object-Detection-Dataset.",
        "[3] Ultralytics, YOLO11 Documentation. https://docs.ultralytics.com/models/yolo11/.",
        "[4] FastAPI Documentation. https://fastapi.tiangolo.com/.",
        "[5] React Documentation. https://react.dev/.",
    ]
    for reference in references:
        paragraph = document.add_paragraph(style="0_TEXT_c1")
        paragraph.paragraph_format.first_line_indent = Inches(-0.2)
        paragraph.paragraph_format.left_indent = Inches(0.2)
        paragraph.paragraph_format.space_after = Pt(4)
        run = paragraph.add_run(reference)
        set_run_font(run, size=12)


def main() -> None:
    if not REFERENCE.exists():
        raise FileNotFoundError(REFERENCE)
    document = Document(REFERENCE)
    delete_noncover_content(document)
    configure_cover(document)
    first_section = document.sections[0]
    first_section.footer.is_linked_to_previous = False
    for paragraph in first_section.footer.paragraphs:
        clear_paragraph(paragraph)

    section = document.add_section(WD_SECTION.NEW_PAGE)
    section.header.is_linked_to_previous = True
    section.footer.is_linked_to_previous = False
    footer = section.footer.paragraphs[0]
    clear_paragraph(footer)
    add_page_number(footer)
    content(document)

    settings = document.settings.element
    update_fields = OxmlElement("w:updateFields")
    update_fields.set(qn("w:val"), "true")
    settings.append(update_fields)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document.save(OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
