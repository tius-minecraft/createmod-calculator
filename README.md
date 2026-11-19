# Create Calculator & Factory Planner

An Angular fork of [erykczy/createmod-calculator](https://github.com/erykczy/createmod-calculator) for **Create 6.0.10 on Minecraft 1.21.1 (NeoForge)**.

## Run locally

```sh
npm ci
npm start
```

Open [http://localhost:4200](http://localhost:4200). Build with `npm run build`. Run the unit tests with `npm test -- --watch=false --browsers=ChromeHeadless`.

The production build is in `dist/createmod-calculator/browser`. Serve `index.html` for application routes. The GitHub Pages copy uses `/createmod-calculator/` as its base URL and includes the same entry point as `404.html` so direct navigation works. For a different repo name, pass its path using `npm run build -- --base-href /repo-name/`.

## Plan a factory

1. Add one or more products and set the desired output per minute. Fluids use mB/min.
2. Configure machine RPM, belt RPM and the input stack size for batch machines.
3. Choose the recipe directly from any stage card. The selector groups alternatives by machine. You can also set an external supply, pick a tagged ingredient, or set the installed machine count.
4. Check supplies, byproducts, stress, and the stages that limit target capacity. Download the plan as CSV. The browser saves the plan configuration locally.

The planner works with expected yields for random outputs. It aggregates common recipe inputs and sizes parallel equipment from the required operations per minute. It reports byproducts separately so they can be reused in the build. **Cards** shows incoming materials and their rates. Switch to **Graph** to follow material connections from sources to targets. Select a node to see its inputs or change its recipe. The operation count for manual crafting is listed without a machine estimate. A cyclic recipe edge is treated as an external input.

The recipe catalog covers base Create and regular Minecraft crafting, cooking, and stonecutting recipes. The planner prefers the Encased Fan when Create supports bulk blasting or smoking. Mechanical Press with Basin is available for compacting regular stacks such as nine iron nuggets. Iron from gravel demonstrates a route with gravel washing and pressing, including the 12.5% nugget drop. Mod-dependent recipes and special recipes that cannot be expressed as fixed ingredients and yields are excluded. The catalog includes recipe facts and identifiers. It contains no game artwork.

## Farms and block generators

Open **Farms** to browse crops, trees and the four block generators. Each source has equipment icons, production rates and an in-game Ponder recording with playback and seeking. The caption identifies the crop or example in the recording.

The planner automatically adds these sources for their main products when a target or recipe needs them. Use the stage recipe selector to choose an external supply or another producer. Farm output estimates are per mature harvest after replanting reserves. Tree plans include planting items for the Deployer. Set your farm's interval, yield and installed plots in **Farms**. The planner uses those values and leaves farm contraption blocks and power to the build layout. [Mechanical Harvester](https://github.com/Creators-of-Create/Create/wiki/Mechanical-Harvester) · [Mechanical Saw](https://github.com/Creators-of-Create/Create/wiki/Mechanical-Saw).

Water and lava default to a **Hose Pulley · bottomless supply** stage. Create's default requires a connected body of at least 10,000 fluid blocks. For placeable honey and chocolate, select the bottomless option if the server configuration or datapack allows that fluid. The plan shows the flow demand in mB/min. Size pumps to match that demand. [Create fluid configuration](https://github.com/Creators-of-Create/Create/blob/mc1.21.1-6.0.10/src/main/java/com/simibubi/create/infrastructure/config/CFluids.java) · [Default bottomless fluid tag](https://github.com/Creators-of-Create/Create/blob/mc1.21.1-6.0.10/src/generated/resources/data/create/tags/fluid/bottomless/allow.json).

The **Power generators** group has a calculator for each power source. The planner's generator link opens the calculator for its selected source.

## Timing assumptions

- Default server config and 20 TPS. Real throughput depends on the feed, output clearance, belt routing, and fluid and fuel supply. The Packager and Spout tools accept a separate TPS setting.
- Water wheels generate 8 or 4 RPM. Windmills generate 1–16 RPM according to sail count. Steam output depends on heat, tank size, water supply, and engines sharing the boiler. Capacity in SU is independent of the gear ratio used to reach machine RPM. The generator RPM formulas and drill timing are unchanged across the 6.0.8, 6.0.9 and 6.0.10 tags for Minecraft 1.21.1.
- The four optimized block generators use recognized lava interactions and direct collection. With the optimization active, the block stays in place and the drill rearms on its 11-tick lazy schedule. Basalt uses an upward-flowing Chute above the block to leave Soul Soil in place below. The regular drill calculator accepts a regeneration delay. [Create fluid interactions](https://github.com/Creators-of-Create/Create/blob/mc1.21.1-6.0.10/src/main/java/com/simibubi/create/AllFluids.java) · [NeoForge fluid interactions](https://github.com/neoforged/NeoForge/blob/1.21.1/src/main/java/net/neoforged/neoforge/fluids/FluidInteractionRegistry.java).
- The Packager has a 20-tick animation, 21-tick queued output, and a 40-tick independent redstone pulse cooldown. A held redstone signal retries on the lazy schedule. Payload is up to nine stacks subject to stack size and bulky-item handling.
- The Spout starts at 20 and must reach −1 before restarting. The Item Drain estimate includes travel through the block with horizontal feed. A funnel counts one tick after the configured cooldown for the next extraction attempt.
- Sequenced Assembly uses weighted output odds and consumes every ingredient again on each loop where it is specified. Precision Mechanism has a 120/150 (80%) success rate. The standalone calculator gives serial and pipelined rates. Planner machine counts represent the work required across all steps of each machine type.
- Mixer timing distinguishes continuous processing of the same recipe from an isolated batch. Crafter latency uses the number of crafters on the longest routing path. Recipe-based estimates omit waiting for inputs, outputs and redstone.

### Upstream sources

- [Create 6.0.10 release](https://github.com/Creators-of-Create/Create/releases/tag/mc1.21.1-6.0.10) and [default stress multipliers](https://github.com/Creators-of-Create/Create/blob/mc1.21.1-6.0.10/src/main/java/com/simibubi/create/AllBlocks.java).
- Rotation and delay models derive from [WaterWheelBlockEntity](https://github.com/Creators-of-Create/Create/blob/mc1.21.1-6.0.10/src/main/java/com/simibubi/create/content/kinetics/waterwheel/WaterWheelBlockEntity.java), [WindmillBearingBlockEntity](https://github.com/Creators-of-Create/Create/blob/mc1.21.1-6.0.10/src/main/java/com/simibubi/create/content/contraptions/bearing/WindmillBearingBlockEntity.java), [PoweredShaftBlockEntity](https://github.com/Creators-of-Create/Create/blob/mc1.21.1-6.0.10/src/main/java/com/simibubi/create/content/kinetics/steamEngine/PoweredShaftBlockEntity.java), [BoilerData](https://github.com/Creators-of-Create/Create/blob/mc1.21.1-6.0.10/src/main/java/com/simibubi/create/content/fluids/tank/BoilerData.java), [DrillBlockEntity](https://github.com/Creators-of-Create/Create/blob/mc1.21.1-6.0.10/src/main/java/com/simibubi/create/content/kinetics/drill/DrillBlockEntity.java), and [BlockBreakingKineticBlockEntity](https://github.com/Creators-of-Create/Create/blob/mc1.21.1-6.0.10/src/main/java/com/simibubi/create/content/kinetics/base/BlockBreakingKineticBlockEntity.java).
- Processing and logistics derive from the [kinetics code](https://github.com/Creators-of-Create/Create/tree/mc1.21.1-6.0.10/src/main/java/com/simibubi/create/content/kinetics), [PackagerBlockEntity](https://github.com/Creators-of-Create/Create/blob/mc1.21.1-6.0.10/src/main/java/com/simibubi/create/content/logistics/packager/PackagerBlockEntity.java), [SpoutBlockEntity](https://github.com/Creators-of-Create/Create/blob/mc1.21.1-6.0.10/src/main/java/com/simibubi/create/content/fluids/spout/SpoutBlockEntity.java), [ItemDrainBlockEntity](https://github.com/Creators-of-Create/Create/blob/mc1.21.1-6.0.10/src/main/java/com/simibubi/create/content/fluids/drain/ItemDrainBlockEntity.java), [FunnelBlockEntity](https://github.com/Creators-of-Create/Create/blob/mc1.21.1-6.0.10/src/main/java/com/simibubi/create/content/logistics/funnel/FunnelBlockEntity.java), and [SequencedAssemblyRecipe](https://github.com/Creators-of-Create/Create/blob/mc1.21.1-6.0.10/src/main/java/com/simibubi/create/content/processing/sequenced/SequencedAssemblyRecipe.java).

To refresh the offline catalog and calculator presets, pass a checkout of the Create tag and the nested data JAR from the [official Minecraft version manifest](https://piston-meta.mojang.com/mc/game/version_manifest_v2.json).

```sh
unzip -p server.jar META-INF/versions/1.21.1/server-1.21.1.jar > minecraft-data.jar
python3 scripts/import-recipes.py /path/to/Create minecraft-data.jar
```

The app retains its [GPL-3.0 license](LICENSE). Create recipe data is derived from the [Create source catalog](https://github.com/Creators-of-Create/Create/tree/mc1.21.1-6.0.10/src/generated/resources/data/create/recipe), with the [Create MIT notice](LICENSE.create).

### Ponder recordings

The recordings were rendered in Minecraft 1.21.1 with Create 6.0.10 and Ponder 1.0.82 on NeoForge. Wheat, tree cutting, Deployer placement and drilling use the mod's existing storyboards. The other recorded crop scenes adapt the Harvester schematic to their own crops. The four block generator scenes use the same Ponder API with dedicated layouts. The website plays local MP4 files with still frames as previews. The capture mod and FFmpeg commands are in `scripts/ponder`. Use `python3 scripts/ponder/capture.py build --help` with the mapped NeoForge client and Create JAR. Start that client with the capture mod in a local world on a private 1280 × 800 X11 display. The `record` subcommand writes videos and preview frames into `src/assets/ponder`. [Create storyboards](https://github.com/Creators-of-Create/Create/tree/mc1.21.1-6.0.10/src/main/java/com/simibubi/create/infrastructure/ponder/scenes) · [Ponder source](https://github.com/Creators-of-Create/Ponder).

### Interface imagery

Create illustrations for the new controls come from the Create Wiki on MC-WIKI.net. [Packager](https://mc-wiki.net/create/packager/), [Spout](https://mc-wiki.net/create/spout/), [Precision Mechanism](https://mc-wiki.net/create/precision-mechanism/), [Brass Funnel](https://mc-wiki.net/create/brass-funnel/), [Andesite Funnel](https://mc-wiki.net/create/andesite-funnel/), [Item Drain](https://mc-wiki.net/create/item-drain/), [Windmill Bearing](https://mc-wiki.net/create/windmill-bearing/), [Steam Engine](https://mc-wiki.net/create/steam-engine/), [Hand Crank](https://mc-wiki.net/create/hand-crank/), and [Creative Motor](https://mc-wiki.net/create/creative-motor/).

Generator tab images for [Water Wheel](https://mineuniverse.net/wiki/create/water-wheel), [Large Water Wheel](https://mineuniverse.net/wiki/create/large-water-wheel), and [Copper Valve Handle](https://mineuniverse.net/wiki/create/copper-valve-handle) come from the MineUniverse Create Wiki.

The material atlas packs existing item sprites and block textures from the [Minecraft 1.21.1 client](https://piston-meta.mojang.com/mc/game/version_manifest_v2.json) and [Create 6.0.10](https://github.com/Creators-of-Create/Create/tree/mc1.21.1-6.0.10). To refresh it with Pillow installed, run `python3 scripts/import-item-icons.py /path/to/Create minecraft-client.jar`.
