"""Stage web/ into docs/, stamping cache-busting build hashes."""

from __future__ import annotations

import hashlib
import shutil
from pathlib import Path

TEXT_SUFFIXES = {".html", ".css", ".js", ".webmanifest", ".svg", ".txt"}
PLACEHOLDERS = ("%%BUILD%%", "%%WASM_HASH%%")


def digest(*chunks: bytes) -> str:
    h = hashlib.sha256()
    for chunk in chunks:
        h.update(len(chunk).to_bytes(8, "little"))
        h.update(chunk)
    return h.hexdigest()[:12]


def stage(web: Path, docs: Path) -> dict[str, str]:
    wasm = docs / "quotes.wasm"
    if not wasm.is_file():
        raise FileNotFoundError(f"{wasm} is missing: run `npm run build:wasm` first")
    wasm_hash = digest(wasm.read_bytes())
    sources = sorted(p for p in web.rglob("*") if p.is_file())
    build = digest(wasm.read_bytes(), *(p.read_bytes() for p in sources))

    for stale in docs.iterdir():
        if stale.name == "quotes.wasm":
            continue
        if stale.is_dir():
            shutil.rmtree(stale)
        else:
            stale.unlink()

    for src in sources:
        dst = docs / src.relative_to(web)
        dst.parent.mkdir(parents=True, exist_ok=True)
        if src.suffix in TEXT_SUFFIXES:
            text = src.read_text(encoding="utf-8")
            text = text.replace("%%BUILD%%", build).replace("%%WASM_HASH%%", wasm_hash)
            with open(dst, "w", encoding="utf-8", newline="\n") as fh:
                fh.write(text)
        else:
            shutil.copyfile(src, dst)

    (docs / ".nojekyll").write_bytes(b"")
    return {"build": build, "wasm": wasm_hash, "files": str(len(sources) + 2)}
