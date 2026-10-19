"""Pakt foto's en logo uit design.html (Claude Design bundle) naar src/assets en public."""
import base64
import gzip
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
html = (root / "design.html").read_text()


def island(name):
    return re.search(rf'<script type="__bundler/{name}">(.*?)</script>', html, re.S).group(1)


manifest = json.loads(island("manifest"))
ext = {r["id"]: r["uuid"] for r in json.loads(island("ext_resources"))}


def resource(uuid):
    entry = manifest[uuid]
    data = base64.b64decode(entry["data"])
    return gzip.decompress(data) if entry["compressed"] else data


# Image slots: id -> data-URI, ingesteld in de design-tool
slots = json.loads(resource(ext["slotState"]))
assets = root / "src" / "assets"
assets.mkdir(parents=True, exist_ok=True)
for slot_id, slot in slots.items():
    uri = slot.get("u", "")
    if uri.startswith("data:image/webp;base64,"):
        (assets / f"{slot_id}.webp").write_bytes(base64.b64decode(uri.split(",", 1)[1]))
        print(f"src/assets/{slot_id}.webp")

# Logo: enige SVG in de bundle
logo = next(u for u, e in manifest.items() if e["mime"] == "image/svg+xml")
(root / "public").mkdir(exist_ok=True)
(root / "public" / "logo.svg").write_bytes(resource(logo))
print("public/logo.svg")
