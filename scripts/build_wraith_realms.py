"""Build realm palettes from the canonical Wraith boss sprite.

The transformation is deliberately pixel-preserving: output dimensions and
alpha values are copied exactly from boss-wraith.png. Only opaque-pixel RGB
values change, so the silhouette, panel layout, core, engines, and weapon
geometry cannot drift between realms.
"""

from __future__ import annotations

from hashlib import sha256
import json
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "sprites" / "boss-wraith.png"
PHYSICAL = ROOT / "assets" / "sprites" / "boss-wraith-physical.png"
GHOST = ROOT / "assets" / "sprites" / "boss-wraith-ghost.png"
MANIFEST = ROOT / "assets" / "sprites" / "boss-wraith-realms.json"


def clamp_channel(value: float) -> int:
    return max(0, min(255, round(value)))


def realm_color(red: int, green: int, blue: int, realm: str) -> tuple[int, int, int]:
    luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
    cyan_emission = max(0.0, (green + blue) * 0.5 - red)
    emission = min(1.0, cyan_emission / 150.0)

    if realm == "physical":
        # Graphite-silver hull with white/cold-blue emissives. Keeping the
        # canonical dark panel values is what makes the shared weapon geometry
        # readable after the 640px source is reduced to gameplay size.
        silver = clamp_channel(10 + luminance * 0.62)
        base = (silver, clamp_channel(silver + 4), clamp_channel(silver + 9))
        energy = (
            clamp_channel(218 + luminance * 0.15),
            clamp_channel(236 + luminance * 0.09),
            clamp_channel(255),
        )
    else:
        base = (
            clamp_channel(24 + luminance * 0.80),
            clamp_channel(8 + luminance * 0.20),
            clamp_channel(48 + luminance * 1.04),
        )
        energy = (
            255,
            clamp_channel(82 + luminance * 0.46),
            255,
        )

    return tuple(
        clamp_channel(base[index] + (energy[index] - base[index]) * emission)
        for index in range(3)
    )


def alpha_digest(image: Image.Image) -> str:
    return sha256(image.getchannel("A").tobytes()).hexdigest()


def build_variant(source: Image.Image, realm: str) -> Image.Image:
    pixels = []
    raw = source.tobytes()
    for offset in range(0, len(raw), 4):
        red, green, blue, alpha = raw[offset : offset + 4]
        if alpha == 0:
            pixels.append((0, 0, 0, 0))
            continue
        recolored = realm_color(red, green, blue, realm)
        pixels.append((*recolored, alpha))
    output = Image.new("RGBA", source.size)
    output.putdata(pixels)
    return output


def main() -> None:
    with Image.open(SOURCE) as opened:
        source = opened.convert("RGBA")

    physical = build_variant(source, "physical")
    ghost = build_variant(source, "ghost")
    source_alpha = alpha_digest(source)
    assert alpha_digest(physical) == source_alpha
    assert alpha_digest(ghost) == source_alpha
    assert physical.size == source.size == ghost.size

    physical.save(PHYSICAL, optimize=True, compress_level=9)
    ghost.save(GHOST, optimize=True, compress_level=9)
    evidence = {
        "schemaVersion": 1,
        "source": SOURCE.name,
        "physical": PHYSICAL.name,
        "ghost": GHOST.name,
        "width": source.width,
        "height": source.height,
        "alphaSha256": source_alpha,
        "geometryContract": "identical_dimensions_and_alpha_mask",
    }
    MANIFEST.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(evidence))


if __name__ == "__main__":
    main()
