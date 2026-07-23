"""Create game-ready sprite derivatives from the user's Downloads artwork.

The source files remain untouched. Checkerboard-backed PNGs are converted to
real transparency, all sprites are tightly cropped with a shared padding rule,
and oversized source art is reduced to a practical browser-game resolution.
"""

from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


DOWNLOADS = Path(r"C:\Users\alyss\Downloads")
REPO_ROOT = Path(__file__).resolve().parents[1]
OUTPUT = REPO_ROOT / "assets" / "sprites"
UI_OUTPUT = REPO_ROOT / "assets" / "ui"
POWERUP_OUTPUT = REPO_ROOT / "assets" / "powerups"
SOURCE_ART = REPO_ROOT / "source-art"

ASSETS = {
    "player.png": ("WhitePlayerShip.png", 512),
    "enemy-red.png": ("RedStandardFighter.png", 448),
    "enemy-orange.png": ("OrangeWeakFastFighter.png", 448),
    "enemy-purple.png": ("PurpleTankFighter.png", 448),
    "enemy-phantom.png": ("CyanCarbonPhantomFighter.png", 448),
    "enemy-splitter.png": ("SplitterFusedFormFighter.png", 448),
    "enemy-splitter-shard.png": ("SplitterShardFormFighter.png", 384),
    "enemy-siphon.png": ("AcidGreenSiphonFighter.png", 448),
    "enemy-minecaster.png": ("OrangeCarbonMinecasterFighter.png", 448),
    "enemy-shieldbearer.png": ("DarkBlueShieldbearerFighter.png", 448),
    "enemy-railgunner.png": ("RedBlackRailgunnerFighter.png", 448),
    "enemy-repair-drone.png": ("WhiteRepairEnemy.png", 448),
    "enemy-leech.png": ("GreenLeechFighter.png", 448),
    "enemy-carrier.png": ("OrangeCarbonCarrierFighter.png", 448),
    "boss-standard.png": ("StandardBoss.png", 640),
    "boss-wraith.png": ("WraithBoss.png", 640),
    "boss-debris-warden.png": ("DebrisWardenBoss.png", 640),
    "boss-mothership.png": ("MothershipBoss.png", 640),
    "boss-siphon-core.png": ("SiphonCoreBoss.png", 640),
    "boss-hive-breaker.png": ("HiveBreakerBoss.png", 640),
    "boss-rail-tyrant.png": ("RailGunTyrantBoss.png", 640),
    "boss-gravity-well.png": ("GravityWellBoss.png", 640),
    "asteroid-rock-1.png": ("AsteroidNumber1.png", 320),
    "asteroid-rock-2.png": ("AsteroidNumber2.png", 320),
    "asteroid-rock-3.png": ("AsteroidNumber3.png", 320),
}

UI_ASSETS = {
    "menu-codex.png": ("Codex Book Icon.png", 256),
    "menu-road.png": ("Progression Road Icon.png", 256),
    "menu-world.png": ("World Icon.png", 256),
    "menu-trophy.png": ("Trophy Icon.png", 256),
}

POWERUP_ASSETS = {
    "ion-burst.png": ("ion_burst.png.png", 320),
    "magnet.png": ("magnet.png.png", 320),
    "score-surge.png": ("score_surge.png.png", 320),
    "dual.png": ("dual.png.png", 320),
    "piercing.png": ("piercing.png.png", 320),
    "wingman.png": ("wingman.png.png", 320),
    "phase-shield.png": ("phaseshield.png.png", 320),
    "rapid.png": ("rapid.png.png", 320),
    "spread.png": ("spreadshot.png.png", 320),
    "stabilizer.png": ("stabilizer.png.png", 320),
    "energy-cell.png": ("energy_cell.png.png", 320),
    "overcharge.png": ("overcharge.png.png", 320),
    "repair.png": ("repair.png.png", 320),
}


def find_source(source_name: str) -> Path:
    for candidate in (SOURCE_ART / source_name, REPO_ROOT / source_name, DOWNLOADS / source_name):
        if candidate.exists():
            return candidate
    raise FileNotFoundError(source_name)


def is_checker_background(pixel: tuple[int, int, int, int]) -> bool:
    red, green, blue, _ = pixel
    return min(red, green, blue) >= 200 and max(red, green, blue) - min(red, green, blue) <= 24


def replace_connected_checkerboard(image: Image.Image) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = rgba.getchannel("A")
    if alpha.getextrema()[0] < 255:
        return rgba

    pixels = rgba.load()
    width, height = rgba.size
    visited = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    def enqueue(x: int, y: int) -> None:
        index = y * width + x
        if visited[index] or not is_checker_background(pixels[x, y]):
            return
        visited[index] = 1
        queue.append((x, y))

    for x in range(width):
        enqueue(x, 0)
        enqueue(x, height - 1)
    for y in range(height):
        enqueue(0, y)
        enqueue(width - 1, y)

    while queue:
        x, y = queue.popleft()
        if x > 0:
            enqueue(x - 1, y)
        if x + 1 < width:
            enqueue(x + 1, y)
        if y > 0:
            enqueue(x, y - 1)
        if y + 1 < height:
            enqueue(x, y + 1)

    background = Image.new("L", rgba.size, 0)
    background.putdata([255 if value else 0 for value in visited])
    background = background.filter(ImageFilter.GaussianBlur(0.65))
    rgba.putalpha(background.point(lambda value: 255 - value))
    return rgba


def trim_and_resize(image: Image.Image, max_dimension: int) -> Image.Image:
    alpha = image.getchannel("A")
    bounds = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
    if not bounds:
        raise ValueError("The processed image has no visible pixels")
    left, top, right, bottom = bounds
    padding = max(8, round(max(right - left, bottom - top) * 0.025))
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(image.width, right + padding)
    bottom = min(image.height, bottom + padding)
    cropped = image.crop((left, top, right, bottom))
    scale = min(1.0, max_dimension / max(cropped.size))
    if scale < 1:
        cropped = cropped.resize(
            (max(1, round(cropped.width * scale)), max(1, round(cropped.height * scale))),
            Image.Resampling.LANCZOS,
        )
    return cropped


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build optimized game artwork derivatives.")
    parser.add_argument("--force", action="store_true", help="Rebuild sprite files that already exist.")
    parser.add_argument("--ui-only", action="store_true", help="Only rebuild favicon and touch-icon assets.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    OUTPUT.mkdir(parents=True, exist_ok=True)
    if not args.ui_only:
        for output_name, (source_name, max_dimension) in ASSETS.items():
            destination = OUTPUT / output_name
            if destination.exists() and not args.force:
                print(f"skip {output_name} (use --force to rebuild)")
                continue
            source = find_source(source_name)
            with Image.open(source) as opened:
                processed = trim_and_resize(replace_connected_checkerboard(opened), max_dimension)
                processed.save(destination, optimize=True, compress_level=9)
                print(f"{source.name} -> {output_name} {processed.width}x{processed.height}")

        UI_OUTPUT.mkdir(parents=True, exist_ok=True)
        for output_name, (source_name, max_dimension) in UI_ASSETS.items():
            destination = UI_OUTPUT / output_name
            if destination.exists() and not args.force:
                print(f"skip {output_name} (use --force to rebuild)")
                continue
            source = find_source(source_name)
            with Image.open(source) as opened:
                processed = trim_and_resize(replace_connected_checkerboard(opened), max_dimension)
                processed.save(destination, optimize=True, compress_level=9)
                print(f"{source.name} -> {output_name} {processed.width}x{processed.height}")

        POWERUP_OUTPUT.mkdir(parents=True, exist_ok=True)
        for output_name, (source_name, max_dimension) in POWERUP_ASSETS.items():
            destination = POWERUP_OUTPUT / output_name
            if destination.exists() and not args.force:
                print(f"skip {output_name} (use --force to rebuild)")
                continue
            source = find_source(source_name)
            with Image.open(source) as opened:
                processed = trim_and_resize(replace_connected_checkerboard(opened), max_dimension)
                processed.save(destination, optimize=True, compress_level=9)
                print(f"{source.name} -> powerups/{output_name} {processed.width}x{processed.height}")

    favicon_source = find_source("StarStrikeRUSHFavicon.png")
    if favicon_source.exists():
        UI_OUTPUT.mkdir(parents=True, exist_ok=True)
        with Image.open(favicon_source) as opened:
            icon = opened.convert("RGB")
            for size, name in ((512, "icon-512.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")):
                resized = icon.resize((size, size), Image.Resampling.LANCZOS)
                resized.save(UI_OUTPUT / name, optimize=True, compress_level=9)
                print(f"{favicon_source.name} -> {name} {size}x{size}")


if __name__ == "__main__":
    main()
