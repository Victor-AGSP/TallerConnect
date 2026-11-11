"""Validate local evidence links and checklist completeness without network access."""

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
