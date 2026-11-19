"""Export ingredient, output and timing data for the base Create 6.0.10 planner."""

import argparse
from collections import defaultdict
from itertools import chain
import json
from pathlib import Path
from zipfile import ZipFile


MACHINES = {
    "compacting": "compacting", "pressing": "press", "crushing": "crushing",
    "cutting": "saw", "deploying": "deployer", "emptying": "drain", "filling": "spout",
    "haunting": "haunting", "splashing": "splashing", "milling": "millstone",
    "mixing": "mixer", "sandpaper_polishing": "polishing", "item_application": "manual",
    "mechanical_crafting": "crafter", "crafting_shaped": "manual", "crafting_shapeless": "manual",
    "smelting": "furnace", "blasting": "blasting", "smoking": "smoking",
    "campfire_cooking": "campfire", "stonecutting": "stonecutter",
}

# The Create tag files extend NeoForge's common vanilla material tags.
COMMON_MATERIALS = {
    "ingots": ("copper", "gold", "iron", "netherite"),
    "nuggets": ("gold", "iron"),
    "raw_materials": ("copper", "gold", "iron"),
    "storage_blocks": ("copper", "gold", "iron", "netherite", "coal", "diamond", "emerald", "lapis", "redstone",
                       "raw_copper", "raw_gold", "raw_iron"),
    "ores": ("copper", "gold", "iron", "coal", "diamond", "emerald", "lapis", "redstone"),
    "gems": ("amethyst", "diamond", "emerald", "lapis", "prismarine", "quartz"),
    "dusts": ("glowstone", "redstone"),
}


def ingredient_alternatives(value):
    if isinstance(value, list):
        return sorted({option for child in value for option in ingredient_alternatives(child)})
    if isinstance(value, str):
        return [value]
    if "fluid" in value:
        return ["fluid:" + value["fluid"]]
    if "item" in value:
        return [value["item"]]
    if "tag" in value:
        return [("fluid:#" if "amount" in value else "#") + value["tag"]]
    if "fluids" in value:
        fluids = value["fluids"]
        potion = value.get("components", {}).get("minecraft:potion_contents", {}).get("potion")
        suffix = f"[{potion}]" if potion else ""
        return ["fluid:" + entry + suffix for entry in ([fluids] if isinstance(fluids, str) else fluids)]
    return []


def outputs(values, weighted=False):
    weights = sum(value.get("chance", 1) for value in values) if weighted else 1
    return [
        {"item": "fluid:" + (value.get("fluid") or value["id"]) if "amount" in value else value["id"],
         "amount": value.get("amount", value.get("count", 1)),
         "chance": value.get("chance", 1) / weights}
        for value in values if ("id" in value or "fluid" in value) and value.get("chance", 1) > 0
    ]


def collect_inputs(values, factor=1):
    inputs = defaultdict(float)
    for value in values:
        choices = tuple(ingredient_alternatives(value))
        if not choices:
            return None
        inputs[choices] += (value.get("amount", 1) if isinstance(value, dict) else 1) * factor
    return inputs


def merge_inputs(inputs):
    merged = defaultdict(float)
    for group in inputs:
        if group is None:
            return None
        for key, amount in group.items():
            merged[key] += amount
    return [{"choices": key, "amount": amount} for key, amount in merged.items()]


def is_base_recipe(data):
    for condition in data.get("neoforge:conditions", []):
        # The conditional base variants are active specifically when the
        # compatibility mod is absent. Other optional variants need its items.
        if condition["type"] != "neoforge:not" or condition["value"]["type"] != "neoforge:mod_loaded":
            return False
        if condition["value"]["modid"] in ("minecraft", "neoforge", "create"):
            return False
    return True


def normalize(recipe_id, data):
    if not is_base_recipe(data):
        return None

    kind = data["type"].split(":")[-1]
    if kind == "sequenced_assembly":
        loops = data.get("loops", 1)
        sequence = []
        inputs = [collect_inputs([data["ingredient"]])]
        tools = []
        for step in data["sequence"]:
            machine = MACHINES[step["type"].split(":")[-1]]
            ingredients = step["ingredients"][1:]
            if step.get("keep_held_item"):
                tools.extend(merge_inputs([collect_inputs(ingredients)]))
            else:
                inputs.append(collect_inputs(ingredients, loops))
            sequence.append({"machine": machine, "ticks": step.get("processing_time", 0)})
        ingredients = merge_inputs(inputs)
        result = outputs(data["results"], weighted=True)
        return {"id": recipe_id, "inputs": ingredients, "outputs": result, "machine": "sequence",
                "loops": loops, "sequence": sequence, "tools": tools}

    if kind not in MACHINES:
        return None

    path_length = 0
    slots = 1
    if "key" in data:
        pattern = data["pattern"]
        keys = data["key"]
        values = [keys[cell] for row in pattern for cell in row if cell != " "]
        # One conventional routing: all rows turn toward the rightmost column and
        # then the bottom row. Count covered cells as crafters.
        if kind == "mechanical_crafting":
            path_length = len(pattern) + len(pattern[0]) - 1
            slots = len(pattern) * len(pattern[0])
    elif "ingredients" in data:
        values = data["ingredients"]
    else:
        values = [data["ingredient"]]
    tools = []
    if data.get("keep_held_item"):
        tools = merge_inputs([collect_inputs(values[1:])])
        values = values[:1]
    ingredients = merge_inputs([collect_inputs(values)])
    result = outputs(data.get("results") or [data["result"]])
    if not ingredients or not result:
        return None

    recipe = {"id": recipe_id, "inputs": ingredients, "outputs": result, "machine": MACHINES[kind]}
    duration = data.get("processing_time", data.get("cookingtime", 0))
    if kind == "stonecutting" and recipe_id.startswith("create:"):
        # Create's SawBlockEntity also accepts vanilla stonecutting recipes.
        recipe["machine"] = "saw"
        duration = 50
    if duration:
        recipe["ticks"] = duration
    if path_length:
        recipe.update({"pathLength": path_length, "slots": slots})
    if data.get("heat_requirement") not in (None, "none"):
        recipe["heat"] = data["heat_requirement"]
    if tools:
        recipe["tools"] = tools
    return recipe



def automation_variants(recipes, press_candidates):
    """Match the fan and Basin Press recipe selection in Create 6.0.10."""
    cooking = defaultdict(dict)
    for recipe in recipes.values():
        machine = recipe["machine"]
        if machine not in ("furnace", "blasting", "smoking") or recipe["id"].endswith("_manual_only"):
            continue
        for item in recipe["inputs"][0]["choices"]:
            if not item.startswith("#"):
                cooking[item].setdefault(machine, recipe)

    grouped = defaultdict(list)
    for item, variants in cooking.items():
        smelting = variants.get("furnace") or variants.get("blasting")
        smoking = variants.get("smoking")
        if smoking:
            grouped[("fan_smoking", smoking["id"])].append(item)
        if smelting and (not smoking or smoking["outputs"][0]["item"] != smelting["outputs"][0]["item"]):
            grouped[("fan_blasting", smelting["id"])].append(item)

    for (machine, source_id), choices in sorted(grouped.items()):
        namespace, path = source_id.split(":", 1)
        yield {
            "id": f"create:{machine}/{namespace}/{path}",
            "machine": machine,
            "inputs": [{"choices": sorted(choices), "amount": 1}],
            "outputs": recipes[source_id]["outputs"],
        }

    crushing_inputs = {
        item for recipe in recipes.values() if recipe["machine"] == "crushing"
        for item in recipe["inputs"][0]["choices"]
    }
    for recipe in recipes.values():
        if recipe["machine"] != "millstone":
            continue
        choices = sorted(set(recipe["inputs"][0]["choices"]) - crushing_inputs)
        if choices:
            path = recipe["id"].split("/", 1)[1]
            yield {**recipe, "id": f"create:crushing/fallback/{path}", "machine": "crushing",
                   "inputs": [{**recipe["inputs"][0], "choices": choices}]}

    for source_id in press_candidates:
        recipe = recipes[source_id]
        ingredients = recipe["inputs"]
        if len(ingredients) == 1 and ingredients[0]["amount"] in (4, 9):
            namespace, path = source_id.split(":", 1)
            yield {**recipe, "id": f"create:compacting/{namespace}/{path}", "machine": "compacting"}


def load_create(root):
    for source_set in ("main", "generated"):
        root_data = root / "src" / source_set / "resources" / "data"
        for path in sorted(root_data.rglob("*.json")):
            logical = path.relative_to(root_data).as_posix()
            if "/recipe/" in logical or "/tags/item/" in logical or "/tags/fluid/" in logical:
                yield logical, json.loads(path.read_text())


def load_vanilla(jar):
    with ZipFile(jar) as archive:
        for name in sorted(archive.namelist()):
            if name.startswith(("data/minecraft/recipe/", "data/minecraft/tags/item/")) and name.endswith(".json"):
                yield name.removeprefix("data/"), json.loads(archive.read(name))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("create_checkout", type=Path)
    parser.add_argument("minecraft_data_jar", type=Path)
    args = parser.parse_args()
    recipes = {}
    press_candidates = []
    tags = defaultdict(set)

    for logical, data in chain(load_vanilla(args.minecraft_data_jar), load_create(args.create_checkout)):
        namespace, kind, remainder = logical[:-5].split("/", 2)
        if kind == "recipe":
            if namespace not in ("create", "minecraft"):
                continue
            recipe = normalize(f"{namespace}:{remainder}", data)
            if recipe:
                recipes[recipe["id"]] = recipe
                if (data["type"] in ("minecraft:crafting_shaped", "minecraft:crafting_shapeless")
                        and not recipe["id"].endswith("_manual_only")
                        and all(" " not in row for row in data.get("pattern", []))):
                    press_candidates.append(recipe["id"])
        elif remainder.startswith(("item/", "fluid/")):
            category, tag = remainder.split("/", 1)
            prefix = "fluid:" if category == "fluid" else ""
            key = f"{prefix}#{namespace}:{tag}"
            if data.get("replace"):
                tags[key].clear()
            for entry in data["values"]:
                item = entry if isinstance(entry, str) else entry["id"]
                if item.removeprefix("#").split(":")[0] in ("minecraft", "create", "c", "neoforge"):
                    tags[key].add(prefix + item)

    vanilla = {
        "barrels/wooden": "barrel", "chests/wooden": "chest trapped_chest",
        "cobblestones": "cobblestone mossy_cobblestone cobbled_deepslate",
        "ender_pearls": "ender_pearl", "eggs": "egg", "feathers": "feather",
        "glass_blocks": "glass tinted_glass", "gunpowders": "gunpowder", "leathers": "leather",
        "netherracks": "netherrack", "obsidians": "obsidian", "rods/wooden": "stick",
        "sands/colorless": "sand", "sands/red": "red_sand", "slimeballs": "slime_ball",
        "strings": "string",
    }
    for name, items in vanilla.items():
        tags[f"#c:{name}"].update(f"minecraft:{item}" for item in items.split())
    colors = "black blue brown cyan gray green light_blue light_gray lime magenta orange pink purple red white yellow"
    for color in colors.split():
        tags[f"#c:dyes/{color}"].add(f"minecraft:{color}_dye")
    for wood in "acacia birch cherry dark_oak jungle mangrove oak spruce".split():
        tags["#c:stripped_logs"].add(f"minecraft:stripped_{wood}_log")
        tags["#c:stripped_woods"].add(f"minecraft:stripped_{wood}_wood")
    for wood in ("crimson", "warped"):
        tags["#c:stripped_logs"].add(f"minecraft:stripped_{wood}_stem")
        tags["#c:stripped_woods"].add(f"minecraft:stripped_{wood}_hyphae")
    tags["#minecraft:convertable_to_mud"].update(
        ["minecraft:dirt", "minecraft:coarse_dirt", "minecraft:rooted_dirt"]
    )
    tags["fluid:#c:milk"].add("fluid:minecraft:milk")

    for kind, materials in COMMON_MATERIALS.items():
        for item in materials:
            if kind == "raw_materials":
                ids = [f"minecraft:raw_{item}"]
            elif kind == "storage_blocks":
                ids = [f"minecraft:{item}_block"]
            elif kind == "ores":
                ids = [f"minecraft:{item}_ore", f"minecraft:deepslate_{item}_ore"]
            elif kind == "gems":
                suffix = "_shard" if item in ("amethyst", "prismarine") else "_lazuli" if item == "lapis" else ""
                ids = [f"minecraft:{item}{suffix}"]
            elif kind == "dusts":
                ids = ["minecraft:glowstone_dust" if item == "glowstone" else "minecraft:redstone"]
            else:
                ids = [f"minecraft:{item}_{kind[:-1]}"]
            tags[f"#c:{kind}/{item}"].update(ids)
    tags["#c:stones"].update(["minecraft:stone", "minecraft:cobblestone", "minecraft:andesite", "minecraft:granite",
                              "minecraft:diorite", "minecraft:deepslate"])
    tags["#c:foods/dough"].add("create:dough")
    tags["#c:foods/flour/wheat"].add("create:wheat_flour")
    tags["fluid:#c:water"].add("fluid:minecraft:water")
    tags["fluid:#c:lava"].add("fluid:minecraft:lava")

    def resolve(option, ancestors=frozenset()):
        if option in ancestors:
            return set()
        if option in tags:
            return set().union(*(resolve(child, ancestors | {option}) for child in tags[option]))
        return {option}

    def expand(group):
        choices = set().union(*(resolve(option) for option in group["choices"]))
        concrete = {choice for choice in choices if "#" not in choice}
        group["choices"] = sorted(concrete or choices)

    for recipe in recipes.values():
        for group in recipe["inputs"] + recipe.get("tools", []):
            expand(group)

    for variant in automation_variants(dict(recipes), press_candidates):
        recipes[variant["id"]] = variant

    output = Path("src/assets/data/create-6.0.10.json")
    output.write_text(
        "[\n" + ",\n".join(json.dumps(recipe, separators=(",", ":")) for recipe in recipes.values()) + "\n]\n"
    )
    durations = {}
    for kind in ("cutting", "milling", "crushing"):
        prefix = f"create:{kind}/"
        entries = sorted(
            (recipe_id.removeprefix(prefix).replace("_", " ").replace("/", " / "), recipe.get("ticks", 0))
            for recipe_id, recipe in recipes.items() if recipe_id.startswith(prefix) and "/fallback/" not in recipe_id
        )
        durations[kind] = entries
    duration_source = Path("src/app/create/recipe-durations.ts")
    lines = ["// Generated by scripts/import-recipes.py."]
    for kind, entries in durations.items():
        lines.append(f"export const {kind}Durations: [string, number][] = [")
        lines.extend(f"  {json.dumps(entry)}," for entry in entries)
        lines.extend(["];", ""])
    duration_source.write_text("\n".join(lines))
    print(f"Wrote {len(recipes)} recipes to {output}")


if __name__ == "__main__":
    main()
