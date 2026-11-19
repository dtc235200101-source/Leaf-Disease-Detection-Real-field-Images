# Template contract

## Reference

- Source: `C:\Users\Admin\Downloads\BAO CAO DU AN _Hoc may_NHOM 1_2026,09mm,25.docx`
- SHA-256: `7ADF5868E870A375B9BF939394DFF62C856987B17C1EF7513BA43A3CA98F389`
- Sections: four portrait A4 sections.
- Page count: unresolved from the packaged renderer because this runtime has no bundled LibreOffice executable on PATH. The final document requires a separate render audit before delivery.
- Evidence: `template-style-evidence.json`, `template-content-controls.json`, `inspect_template.py`, and `template-media/`.

## Page and typography system

- A4 portrait. Section 1 and 2 margins: left 1.38 in, right 0.79 in, top 1.18 in, bottom 1.38 in. Section 3 uses 1.18 in for all margins. Section 4 matches section 1.
- Main body styles are `0_TEXT_c1`, `1_Chapter_c5`, `2_1_Level2_c2`, `3_1_1_Level3_c3`, `4_Figures_c6`, and `5_Tables_c7`.
- Times New Roman is the predominant font. Chapter headings use centered uppercase styling; subsections use the template's numbered headings.
- The cover is the first 13-row, 2-column table. It contains university branding, report type, project title, group, contributors, and supervisor. The existing logo drawing must be retained.

## Content flow and slot map

1. Cover table: rewrite only the project title; retain the university identity, group, contributors, supervisor, and logo treatment from the reference.
2. Acknowledgement: rewrite for the Tomato Leaf Detector project.
3. Contents, task allocation, lists of tables/figures: replace with project-specific summaries.
4. Introduction and chapters: replace source material with a formal Vietnamese report about PlantDoc, YOLO11s, the local FastAPI service, and the React client.
5. Evaluation chapter: must state that metrics are absent until a real frozen checkpoint and split exist; no numeric performance values may be inserted.
6. Conclusion and references: replace with project-specific text and citations.

## Preservation and fidelity gates

- Preserve the reference file unchanged.
- Preserve the cover table's logo drawing and the template's named styles.
- Remove irrelevant source content, source images, old tables, and old table of contents entries because they describe construction safety and lung cancer rather than this project.
- Reuse the template font, cover treatment, chapter hierarchy, and report sequence. The report's page count and pagination may change because the project content replaces the reference content.
- Before delivery, inspect every final rendered page and check text, tables, cover logo, page breaks, and Vietnamese glyphs.
