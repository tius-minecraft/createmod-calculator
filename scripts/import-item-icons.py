"""Pack existing Minecraft and Create item sprites and block textures into an atlas."""

import argparse
from functools import lru_cache
from io import BytesIO
import json
import math
from pathlib import Path
from zipfile import ZipFile

from PIL import Image


TILE = 16
COLUMNS = 48
TEXTURE_KEYS = ("layer0", "all", "front", "side", "texture", "particle", "top", "end")


def resource(path, default="minecraft"):
    return path.split(":", 1) if ":" in path else (default, path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("create_checkout", type=Path)
    parser.add_argument("minecraft_client_jar", type=Path)
    args = parser.parse_args()
    sources = [args.create_checkout / "src" / name / "resources" for name in ("main", "generated")]
    recipes = json.loads(Path("src/assets/data/create-6.0.10.json").read_text())
    materials = {result["item"] for recipe in recipes for result in recipe["outputs"]}
    materials.update(choice for recipe in recipes for ingredient in recipe["inputs"] + recipe.get("tools", [])
                     for choice in ingredient["choices"])
    materials.update({"fluid:minecraft:water", "fluid:minecraft:lava", "fluid:minecraft:milk"})

    with ZipFile(args.minecraft_client_jar) as archive:
        vanilla = "assets/minecraft/models/item/"
        materials.update("minecraft:" + path[len(vanilla):-5] for path in archive.namelist()
                         if path.startswith(vanilla) and path.endswith(".json") and "/" not in path[len(vanilla):])
        for source in sources:
            materials.update("create:" + path.stem for path in (source / "assets/create/models/item").glob("*.json"))

        @lru_cache(maxsize=None)
        def read(path):
            if path.startswith("assets/minecraft/"):
                try:
                    return archive.read(path)
                except KeyError:
                    return None
            for root in sources:
                file = root / path
                if file.is_file():
                    return file.read_bytes()
            return None

        def model_textures(namespace, name, visited=frozenset()):
            if (namespace, name) in visited:
                return {}
            data = read(f"assets/{namespace}/models/{name}.json")
            if data is None:
                return {}
            model = json.loads(data)
            parent = model.get("parent")
            inherited = model_textures(*resource(parent), visited | {(namespace, name)}) if parent else {}
            return {**inherited, **model.get("textures", {})}

        def texture(texture_id):
            namespace, name = resource(texture_id)
            data = read(f"assets/{namespace}/textures/{name}.png")
            if data is None:
                return None
            # Animated block textures store successive frames vertically.
            with Image.open(BytesIO(data)) as original:
                sprite = original.convert("RGBA")
            if sprite.height > sprite.width and sprite.height % sprite.width == 0:
                sprite = sprite.crop((0, 0, sprite.width, sprite.width))
            sprite.thumbnail((TILE, TILE), Image.Resampling.NEAREST)
            return sprite

        def item_texture(item):
            namespace, name = resource(item)
            assembly = model_textures(namespace, "item/" + name)
            for key in dict.fromkeys((*TEXTURE_KEYS, *assembly)):
                value = assembly.get(key)
                seen = {key}
                while isinstance(value, str) and value.startswith("#"):
                    if value[1:] in seen:
                        value = None
                        break
                    seen.add(value[1:])
                    value = assembly.get(value[1:])
                if value and (sprite := texture(value)) is not None:
                    return sprite
            return texture(f"{namespace}:item/{name}") or texture(f"{namespace}:block/{name}")

        def material_texture(item):
            if not item.startswith("fluid:"):
                return item_texture(item)
            namespace, name = resource(item[6:].split("[", 1)[0])
            return (item_texture(f"{namespace}:{name}_bucket")
                    or texture(f"{namespace}:block/{name}_still")
                    or item_texture("minecraft:bucket"))

        entries = {}
        sprites = []
        for item in sorted(materials):
            if (sprite := material_texture(item)) is not None:
                entries[item] = len(sprites)
                sprites.append(sprite)

    rows = math.ceil(len(sprites) / COLUMNS)
    atlas = Image.new("RGBA", (COLUMNS * TILE, rows * TILE))
    for index, sprite in enumerate(sprites):
        x, y = index % COLUMNS * TILE, index // COLUMNS * TILE
        atlas.paste(sprite, (x + (TILE - sprite.width) // 2, y + (TILE - sprite.height) // 2))

    atlas.save("src/assets/data/item-icons.png", optimize=True)
    Path("src/assets/data/item-icons.json").write_text(
        json.dumps({"columns": COLUMNS, "rows": rows, "items": entries}, separators=(",", ":")) + "\n")
    print(f"Packed {len(sprites)} material icons")


if __name__ == "__main__":
    main()
