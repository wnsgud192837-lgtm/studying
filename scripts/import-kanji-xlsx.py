import json
import re
import sys
import zipfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree


ROOT = Path(__file__).resolve().parents[1]
DATABASE_DIR = ROOT / "app" / "database"
XML_NAMESPACE = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"


def shared_strings(archive):
    root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
    return ["".join(node.text or "" for node in item.iter(XML_NAMESPACE + "t")) for item in root.findall(XML_NAMESPACE + "si")]


def cell_value(cell, strings):
    value = cell.find(XML_NAMESPACE + "v")
    if value is None:
        return ""
    if cell.get("t") == "s":
        return strings[int(value.text)]
    return value.text or ""


def worksheet_rows(path):
    with zipfile.ZipFile(path) as archive:
        strings = shared_strings(archive)
        sheet = ElementTree.fromstring(archive.read("xl/worksheets/sheet1.xml"))
        sheet_data = sheet.find(XML_NAMESPACE + "sheetData")

        for row in sheet_data.findall(XML_NAMESPACE + "row"):
            values = {}
            for cell in row.findall(XML_NAMESPACE + "c"):
                column = re.match(r"[A-Z]+", cell.get("r")).group()
                values[column] = cell_value(cell, strings).strip()
            yield values


def representative(value):
    word, separator, remainder = value.partition("(")
    if not separator or not remainder.endswith(")"):
        raise ValueError(f"대표단어 형식을 읽을 수 없습니다: {value}")
    return word.strip(), remainder[:-1].strip()


def kanji_items(path):
    rows = list(worksheet_rows(path))
    header_index = next(index for index, row in enumerate(rows) if row.get("C") == "한자")
    items = []

    for row in rows[header_index + 1 :]:
        if not row.get("C"):
            continue

        word, word_meaning = representative(row["G"])
        character = row["C"]
        items.append(
            {
                "id": f"kanji-{ord(character[0]):x}",
                "character": character,
                "level": row["B"],
                "meaningKo": row["D"],
                "onyomi": row.get("E", ""),
                "kunyomi": row.get("F", ""),
                "examples": [{"word": word, "reading": "", "meaningKo": word_meaning}],
            }
        )

    return items


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    if len(sys.argv) > 1:
        workbook = Path(sys.argv[1]).resolve()
    else:
        candidates = sorted((ROOT / "docs").glob("*상용한자*2136*.xlsx"))
        if not candidates:
            raise FileNotFoundError("docs 폴더에서 상용한자 2,136자 엑셀 파일을 찾지 못했습니다.")
        workbook = candidates[0]

    items = kanji_items(workbook)
    if len(items) != 2136:
        raise ValueError(f"한자 2,136자를 예상했지만 {len(items)}자를 읽었습니다.")

    write_json(DATABASE_DIR / "kanji.json", items)
    grouped = {}
    for item in items:
        grouped.setdefault(item["level"], []).append(item)

    level_dir = DATABASE_DIR / "kanji-by-level"
    for old_file in level_dir.glob("*.json"):
        if old_file.stem not in grouped:
            old_file.unlink()
    for level, level_items in sorted(grouped.items()):
        write_json(level_dir / f"{level}.json", level_items)

    index_path = DATABASE_DIR / "index.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))
    index["generatedAt"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    index["kanji"] = {
        "total": len(items),
        "withMeaningOnKun": sum(bool(item["meaningKo"] and item["onyomi"] and item["kunyomi"]) for item in items),
        "byLevel": dict(sorted(Counter(item["level"] for item in items).items())),
    }
    write_json(index_path, index)

    print(f"{workbook.name}: 대표단어를 포함한 상용한자 {len(items):,}자를 가져왔습니다.")


if __name__ == "__main__":
    main()
