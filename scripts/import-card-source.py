"""Read the supplied workbook without modifying it; export source provenance."""
import json
import pathlib
import xml.etree.ElementTree as ET
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
workbooks = [p for p in (ROOT / "cards").glob("*.xlsx") if not p.name.startswith("~$")]
if len(workbooks) != 1:
    raise SystemExit("Expected exactly one cards/*.xlsx workbook")
with zipfile.ZipFile(workbooks[0]) as archive:
    strings = ["".join(node.itertext()) for node in ET.fromstring(archive.read("xl/sharedStrings.xml")).findall("m:si", NS)] if "xl/sharedStrings.xml" in archive.namelist() else []
    workbook = ET.fromstring(archive.read("xl/workbook.xml"))
    rels = {r.get("Id"): r.get("Target") for r in ET.fromstring(archive.read("xl/_rels/workbook.xml.rels"))}
    sheet = next(s for s in workbook.find("m:sheets", NS) if s.get("name") == "卡牌表")
    target = rels[sheet.get("{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id")]
    target = target.lstrip("/") if target.startswith("/") else "xl/" + target
    rows = []
    for row in ET.fromstring(archive.read(target)).findall(".//m:sheetData/m:row", NS):
        values = {}
        for cell in row:
            value = cell.find("m:v", NS)
            text = strings[int(value.text)] if cell.get("t") == "s" and value is not None else "".join(cell.find("m:is", NS).itertext()) if cell.get("t") == "inlineStr" else value.text if value is not None else ""
            values["".join(c for c in cell.get("r") if c.isalpha())] = text
        if row.get("r") == "1" or not values.get("B"):
            continue
        rows.append({"id": f"clerk_{len(rows)+1:03}", "name": values["B"], "type": {"攻击": "Attack", "技能": "Skill", "能力": "Power"}[values["C"]], "cost": int(values["D"]), "rarity": {"基础": "basic", "白": "common", "蓝": "uncommon", "金": "rare"}[values["A"]], "sourceText": values["E"], "upgradeText": values["F"], "tags": values.get("G", "").split("/"), "sourceRow": int(row.get("r"))})
output = ROOT / "src/data/clerk-source.js"
output.write_text("// Generated read-only source snapshot; run python scripts/import-card-source.py.\nexport const clerkSource = " + json.dumps(rows, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
print(f"Imported {len(rows)} rows into src/data/clerk-source.js")
