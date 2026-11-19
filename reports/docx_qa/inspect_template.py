from __future__ import annotations

from pathlib import Path

from docx import Document

path = Path(r"C:\Users\Admin\Downloads\BAO CAO DU AN _Hoc may_NHOM 1_2026,09mm,25.docx")
document = Document(path)
print(f"PARAGRAPHS {len(document.paragraphs)}")
print(f"TABLES {len(document.tables)}")
print(f"SECTIONS {len(document.sections)}")
for index, paragraph in enumerate(document.paragraphs):
    text = paragraph.text.strip()
    if text:
        print(f"P{index}|{paragraph.style.name}|{text}")
for table_index, table in enumerate(document.tables):
    print(f"TABLE {table_index} {len(table.rows)}x{len(table.columns)}")
    for row_index, row in enumerate(table.rows):
        cells = " | ".join(cell.text.replace("\n", " / ") for cell in row.cells)
        print(f"R{row_index}|{cells}")

for section_index, section in enumerate(document.sections, 1):
    print(f"SECTION {section_index} HEADER")
    for paragraph in section.header.paragraphs:
        if paragraph.text.strip():
            print(paragraph.text.strip())
    print(f"SECTION {section_index} FOOTER")
    for paragraph in section.footer.paragraphs:
        if paragraph.text.strip():
            print(paragraph.text.strip())
