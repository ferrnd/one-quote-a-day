"""Render the link-preview image (docs/og.png) with no image library.

A pure-Python rasteriser draws the same pair of quotation marks as the
favicon, large and centred on a 1200x630 card, anti-aliased by 4x4
supersampling, and a minimal PNG encoder (zlib + CRC chunks) writes it out.
The output is byte-for-byte deterministic, so CI can check it.
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

WIDTH, HEIGHT = 1200, 630
SCALE = 7.0      # favicon units -> pixels
SUPERSAMPLE = 4
INK, PAPER = 0x00, 0xFF

Point = tuple[float, float]


def cubic(p0: Point, p1: Point, p2: Point, p3: Point, steps: int = 32) -> list[Point]:
    out = []
    for i in range(1, steps + 1):
        t = i / steps
        u = 1 - t
        out.append((
            u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
            u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1],
        ))
    return out


def mark(dx: float) -> tuple[Point, float, list[Point]]:
    """One quotation mark from web/favicon.svg: a dot and a curved tail."""
    start = (16 + dx, 37)
    tail = [start]
    tail += cubic(start, (16 + dx, 27), (20 + dx, 20), (28 + dx, 17))
    tail.append((29.5 + dx, 19.6))
    tail += cubic((29.5 + dx, 19.6), (24 + dx, 22.5), (21.5 + dx, 27), (21.5 + dx, 33))
    return (23 + dx, 37), 7.0, tail


def inside_polygon(x: float, y: float, poly: list[Point]) -> bool:
    hit = False
    j = len(poly) - 1
    for i, (xi, yi) in enumerate(poly):
        xj, yj = poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            hit = not hit
        j = i
    return hit


def render() -> bytes:
    shapes = [mark(0), mark(18)]
    # favicon units of the pair: x 16..48, y 17..44 -> centre it on the card
    ox = WIDTH / 2 - 32 * SCALE
    oy = HEIGHT / 2 - 30.5 * SCALE

    def covered(px: float, py: float) -> bool:
        ux, uy = (px - ox) / SCALE, (py - oy) / SCALE
        for (cx, cy), r, tail in shapes:
            if (ux - cx) ** 2 + (uy - cy) ** 2 <= r * r or inside_polygon(ux, uy, tail):
                return True
        return False

    rows = bytearray()
    x0, x1 = int(ox + 14 * SCALE), int(ox + 50 * SCALE)
    y0, y1 = int(oy + 15 * SCALE), int(oy + 46 * SCALE)
    n = SUPERSAMPLE
    for y in range(HEIGHT):
        row = bytearray([PAPER]) * WIDTH
        if y0 <= y <= y1:
            for x in range(x0, x1 + 1):
                hits = sum(covered(x + (i + 0.5) / n, y + (j + 0.5) / n)
                           for i in range(n) for j in range(n))
                if hits:
                    row[x] = round(PAPER - (PAPER - INK) * hits / (n * n))
        rows += b"\x00" + row  # filter type 0 per scanline
    return encode_png(bytes(rows))


def chunk(kind: bytes, data: bytes) -> bytes:
    return (struct.pack(">I", len(data)) + kind + data
            + struct.pack(">I", zlib.crc32(kind + data) & 0xFFFFFFFF))


def encode_png(scanlines: bytes) -> bytes:
    header = struct.pack(">IIBBBBB", WIDTH, HEIGHT, 8, 0, 0, 0, 0)  # 8-bit greyscale
    return (b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(scanlines, 9))
            + chunk(b"IEND", b""))


def write(target: Path) -> int:
    data = render()
    target.write_bytes(data)
    return len(data)
