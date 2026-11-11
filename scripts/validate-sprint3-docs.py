"""Validate local evidence links and checklist completeness without network access."""

import csv
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote


root = Path(__file__).resolve().parents[1]
paths = [root / name for name in sys.argv[1:]]
if not paths:
    paths = sorted((root / "docs/sprint-3").glob("*.md"))
errors = []
links = cases = 0
for path in paths:
    content = path.read_text()
    for target in re.findall(r"\]\((<[^>\n]+>|[^()\n]*(?:\([^()\n]*\)[^()\n]*)*)\)", content):
        if target.startswith(("https://", "http://", "#")):
            continue
        target = unquote(target.strip("<>").split("#", 1)[0])
        links += 1
        if not (path.parent / target).is_file():
            errors.append(f"{path.name}: missing link {target}")
    seen = set()
    for line in content.splitlines():
        if not re.match(r"\| (?:AUTH-[CMA]-\d+|[CMA]Q-\d+) \|", line):
            continue
        cells = [cell.strip() for cell in line.strip("|").split("|")]
        cases += 1
        if len(cells) != 7 or any(not cell for cell in cells):
            errors.append(f"{path.name}: incomplete case {cells[0]}")
        if cells[0] in seen:
            errors.append(f"{path.name}: duplicate case {cells[0]}")
        seen.add(cells[0])
        if len(cells) == 7 and cells[5] not in {"PASS", "FAIL", "BLOCKED"}:
            errors.append(f"{path.name}: invalid result {cells[0]}")
        if len(cells) == 7 and cells[5] == "BLOCKED" and "No ejecutado" not in cells[4]:
            errors.append(f"{path.name}: blocked case lacks observation {cells[0]}")

matrix = root / "docs/sprint-3/evidencias/SCRUM-156-matriz.csv"
if matrix.exists():
    with matrix.open(newline="") as source:
        rows = list(csv.DictReader(source))
    ids = set()
    for row in rows:
        case_id = row["id"]
        if case_id in ids or not all(row.values()):
            errors.append(f"matrix: duplicate ID or empty field {case_id}")
        ids.add(case_id)
        evidence = root / row["evidencia"]
        if not evidence.is_file():
            errors.append(f"matrix: missing evidence {case_id}")
        elif row["tipo"] == "REAL_BLOCKED":
            source_row = next((line for line in evidence.read_text().splitlines()
                               if line.startswith(f"| {case_id} |")), "")
            if not source_row or f'| {row["resultado"]} |' not in source_row:
                errors.append(f"matrix: result disagrees with checklist {case_id}")
    print(f"Matrix rows: {len(rows)}; unique IDs: {len(ids)}")

for path in sorted((root / "docs/sprint-3/evidencias").glob("*.json")):
    try:
        data = json.loads(path.read_text())
        if data.get("kind") == "AUTOMATED_MOCK":
            for field in ("passed", "failed"):
                if data[field] != sum(s[field] for s in data["suites"]):
                    errors.append(f"{path.name}: inconsistent {field} count")
        if data.get("kind") == "REAL_ANONYMOUS_HTTP":
            for check in data["checks"]:
                expected = "PASS" if check["http"] == check["expected"] else "FAIL"
                if check["result"] != expected:
                    errors.append(f"{path.name}: inconsistent HTTP result")
    except (ValueError, KeyError, TypeError) as error:
        errors.append(f"{path.name}: {error}")

print(f"Markdown files: {len(paths)}; local links: {links}; checklist cases: {cases}")
for error in errors:
    print(f"FAIL: {error}")
print("PASS: links, required case fields and evidence counts" if not errors else "FAIL")
sys.exit(bool(errors))
