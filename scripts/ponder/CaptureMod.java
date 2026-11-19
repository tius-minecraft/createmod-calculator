package guidecapture;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import com.simibubi.create.AllBlocks;
import com.simibubi.create.content.contraptions.actors.harvester.HarvesterBlockEntity;
import com.simibubi.create.content.kinetics.drill.DrillBlock;
import com.simibubi.create.content.kinetics.fan.EncasedFanBlock;
import com.simibubi.create.content.kinetics.motor.CreativeMotorBlock;
import com.simibubi.create.content.kinetics.simpleRelays.ShaftBlock;
import com.simibubi.create.foundation.ponder.CreateSceneBuilder;
import net.createmod.ponder.api.registration.PonderPlugin;
import net.createmod.ponder.api.registration.PonderSceneRegistrationHelper;
import net.createmod.ponder.api.scene.SceneBuildingUtil;
import net.createmod.ponder.foundation.PonderIndex;
import net.createmod.ponder.foundation.PonderScene;
import net.createmod.ponder.foundation.ui.PonderUI;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.TitleScreen;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.block.Blocks;
import net.minecraft.world.level.block.CropBlock;
import net.minecraft.world.level.block.NetherWartBlock;
import net.minecraft.world.level.block.SweetBerryBushBlock;
import net.minecraft.world.level.block.HopperBlock;
import net.minecraft.world.level.block.LiquidBlock;
import net.minecraft.world.level.block.state.BlockState;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.fml.common.Mod;
import net.neoforged.neoforge.client.event.ClientTickEvent;
import net.neoforged.neoforge.common.NeoForge;

@Mod(value = "farm_capture", dist = Dist.CLIENT)
public class CaptureMod {
    private static final Path REQUEST = Path.of("capture-request.txt");
    private static final Path RESPONSE = Path.of("capture-response.txt");
    private static boolean registered;

    public CaptureMod() {
        NeoForge.EVENT_BUS.addListener(this::tick);
    }

    private void tick(ClientTickEvent.Post event) {
        Minecraft minecraft = Minecraft.getInstance();
        if (!registered && (minecraft.level != null || minecraft.screen instanceof TitleScreen)) {
            PonderIndex.addPlugin(new GeneratorScenes());
            PonderIndex.reload();
            registered = true;
        }
        if (!registered || minecraft.level == null || !Files.isRegularFile(REQUEST)) return;
        try {
            String request = Files.readString(REQUEST).trim();
            Files.delete(REQUEST);
            String[] params = request.split("\\s+");
            ResourceLocation component = ResourceLocation.parse(params[0]);
            List<PonderScene> scenes = PonderIndex.getSceneAccess().compile(component);
            PonderScene scene = scenes.stream()
                .filter(candidate -> params.length < 2 || candidate.getId().getPath().equals(params[1]))
                .findFirst().orElseThrow(() -> new IllegalArgumentException(scenes.stream().map(s -> s.getId().toString()).toList().toString()));
            scene.setNextUpEnabled(false);
            scene.builder().scaleSceneView(scene.getScaleFactor() * (params[0].equals("create:mechanical_saw") ? 1.07f : 1.16f));
            minecraft.setScreen(new CaptureScreen(scene));
            Files.writeString(RESPONSE, scene.getId() + " " + scene.getTotalTime());
        } catch (Exception exception) {
            exception.printStackTrace();
            try { Files.writeString(RESPONSE, "Error " + exception); } catch (Exception ignored) {}
        }
    }

    private static class CaptureScreen extends PonderUI {
        CaptureScreen(PonderScene scene) { super(List.of(scene)); }
        @Override
        protected void renderWidgets(GuiGraphics graphics, int x, int y, float partialTicks) {}

        @Override
        public void renderBackground(GuiGraphics graphics, int x, int y, float partialTicks) {
            graphics.fillGradient(0, 0, width, height, 0xff2f2934, 0xff1b1720);
        }
    }

    private record Generator(String item, String name, String contact, String setup, boolean basalt) {}

    private static class GeneratorScenes implements PonderPlugin {
        @Override
        public String getModId() { return "farm_capture"; }

        @Override
        public void registerScenes(PonderSceneRegistrationHelper<ResourceLocation> helper) {
            List<Generator> generators = List.of(
                new Generator("minecraft:cobblestone", "Cobblestone", "minecraft:water",
                    "Flowing lava meets water.", false),
                new Generator("minecraft:basalt", "Basalt", "minecraft:blue_ice",
                    "Lava flows beside Blue Ice, above Soul Soil.", true),
                new Generator("create:limestone", "Limestone", "create:honey",
                    "Flowing lava meets honey.", false),
                new Generator("create:scoria", "Scoria", "create:chocolate",
                    "Flowing lava meets chocolate.", false));
            List<Crop> crops = List.of(
                fieldCrop("potato", "Potatoes", (CropBlock) Blocks.POTATOES),
                fieldCrop("carrot", "Carrots", (CropBlock) Blocks.CARROTS),
                fieldCrop("beetroot", "Beetroot", (CropBlock) Blocks.BEETROOTS),
                new Crop("nether_wart", "Nether Wart", Blocks.SOUL_SAND.defaultBlockState(),
                    Blocks.NETHER_WART.defaultBlockState().setValue(NetherWartBlock.AGE, 3), Blocks.NETHER_WART.defaultBlockState()),
                new Crop("sweet_berries", "Sweet Berries", Blocks.DIRT.defaultBlockState(),
                    Blocks.SWEET_BERRY_BUSH.defaultBlockState().setValue(SweetBerryBushBlock.AGE, 3),
                    Blocks.SWEET_BERRY_BUSH.defaultBlockState().setValue(SweetBerryBushBlock.AGE, 1)));
            for (Crop crop : crops) {
                helper.addStoryBoard(ResourceLocation.withDefaultNamespace(crop.item()), ResourceLocation.parse("create:harvester"),
                    (builder, util) -> animateCrop(new CreateSceneBuilder(builder), util, crop));
            }
            for (Generator generator : generators) {
                helper.addStoryBoard(ResourceLocation.parse(generator.item()), "generator",
                    (builder, util) -> animate(new CreateSceneBuilder(builder), util, generator));
            }
        }
    }

    private record Crop(String item, String name, BlockState soil, BlockState mature, BlockState replanted) {}

    private static Crop fieldCrop(String item, String name, CropBlock block) {
        return new Crop(item, name, Blocks.FARMLAND.defaultBlockState(),
            block.getStateForAge(block.getMaxAge()), block.getStateForAge(0));
    }

    private static void animateCrop(CreateSceneBuilder scene, SceneBuildingUtil util, Crop crop) {
        scene.title("harvest_" + crop.item(), "Harvesting " + crop.name());
        scene.configureBasePlate(0, 0, 6);
        scene.scaleSceneView(.95f);
        scene.setNextUpEnabled(false);

        List<BlockPos> plots = List.of(util.grid().at(2, 1, 3), util.grid().at(1, 1, 2), util.grid().at(3, 1, 2),
            util.grid().at(2, 1, 1), util.grid().at(3, 1, 1), util.grid().at(4, 1, 2));
        BlockPos bearing = util.grid().at(4, 1, 4);
        for (BlockPos plot : plots) {
            if (!crop.soil().is(Blocks.FARMLAND)) scene.world().setBlock(plot.below(), crop.soil(), false);
            scene.world().setBlock(plot, crop.mature(), false);
        }
        scene.showBasePlate();
        scene.idle(8);
        for (BlockPos plot : plots) scene.world().showSection(util.select().position(plot), Direction.UP);
        scene.world().showSection(util.select().position(bearing), Direction.DOWN);
        var contraption = scene.world().showIndependentSection(util.select().fromTo(4, 2, 4, 2, 2, 5)
            .add(util.select().fromTo(2, 1, 5, 0, 1, 5)), Direction.DOWN);
        scene.world().configureCenterOfRotation(contraption, util.vector().centerOf(bearing));
        scene.idle(8);
        for (int index = 0; index < 3; index++) {
            scene.world().showSectionAndMerge(util.select().position(index, 1, 4), Direction.SOUTH, contraption);
            scene.idle(5);
        }
        scene.overlay().showText(50).attachKeyFrame().placeNearTarget().pointAt(util.vector().topOf(bearing))
            .text("Move Mechanical Harvesters across mature " + crop.name() + ".");
        scene.idle(55);
        for (int index = 0; index < 3; index++) {
            scene.world().modifyBlockEntity(util.grid().at(index, 1, 4), HarvesterBlockEntity.class,
                harvester -> harvester.setAnimatedSpeed(-150));
        }
        scene.world().rotateBearing(bearing, -360, 140);
        scene.world().rotateSection(contraption, 0, -360, 0, 140);
        var drop = new ItemStack(BuiltInRegistries.ITEM.get(ResourceLocation.withDefaultNamespace(crop.item())));
        for (BlockPos plot : plots) {
            scene.idle(5);
            scene.world().setBlock(plot, crop.replanted(), true);
            scene.world().createItemEntity(util.vector().centerOf(plot), util.vector().of(.08, .28, -.13), drop.copy());
        }
        scene.overlay().showText(77).attachKeyFrame().placeNearTarget().pointAt(util.vector().topOf(plots.get(0)))
            .text("Harvesters collect the crop and reset it so it can grow again.");
        scene.idle(112);
        scene.markAsFinished();
    }

    private static void animate(CreateSceneBuilder scene, SceneBuildingUtil util, Generator generator) {
        scene.title("generator_" + generator.name().toLowerCase(java.util.Locale.ROOT), generator.name() + " Generator");
        scene.configureBasePlate(0, 0, 7);
        scene.scaleSceneView(1.0f);
        scene.setNextUpEnabled(false);

        BlockPos target = util.grid().at(3, 1, 3);
        BlockPos drill = target.east();
        BlockPos contact = target.west();
        BlockPos lava = target.north();
        BlockState output = BuiltInRegistries.BLOCK.get(ResourceLocation.parse(generator.item())).defaultBlockState();
        BlockState second = BuiltInRegistries.BLOCK.get(ResourceLocation.parse(generator.contact())).defaultBlockState();

        scene.showBasePlate();
        scene.idle(8);
        scene.world().setBlock(drill, AllBlocks.MECHANICAL_DRILL.getDefaultState().setValue(DrillBlock.FACING, Direction.WEST), false);
        scene.world().setBlock(drill.east(), AllBlocks.SHAFT.getDefaultState().setValue(ShaftBlock.AXIS, Direction.Axis.X), false);
        scene.world().setBlock(drill.east(2), AllBlocks.CREATIVE_MOTOR.getDefaultState().setValue(CreativeMotorBlock.FACING, Direction.WEST), false);
        scene.world().showSection(util.select().fromTo(drill, drill.east(2)), Direction.DOWN);
        scene.world().setKineticSpeed(util.select().fromTo(drill, drill.east(2)), 64);
        if (generator.basalt()) {
            scene.world().setBlock(target.below(), Blocks.SOUL_SOIL.defaultBlockState(), false);
        } else {
            scene.world().setBlock(target.below(), Blocks.HOPPER.defaultBlockState().setValue(HopperBlock.FACING, Direction.SOUTH), false);
            scene.world().setBlock(target.below().south(), Blocks.BARREL.defaultBlockState(), false);
        }
        scene.world().setBlock(contact, second, false);
        scene.world().showSection(util.select().position(contact), Direction.DOWN);
        scene.world().setBlock(lava, Blocks.LAVA.defaultBlockState(), false);
        scene.world().showSection(util.select().position(lava), Direction.DOWN);
        scene.overlay().showText(63).attachKeyFrame().placeNearTarget().pointAt(util.vector().topOf(target))
            .text(generator.setup());
        scene.idle(45);
        scene.world().setBlock(target, Blocks.LAVA.defaultBlockState().setValue(LiquidBlock.LEVEL, 1), false);
        scene.world().showSection(util.select().position(target), Direction.DOWN);
        scene.idle(20);
        scene.world().setBlock(target, output, false);
        scene.idle(20);

        if (generator.basalt()) {
            scene.world().setBlock(target.above(), AllBlocks.CHUTE.getDefaultState(), false);
            scene.world().setBlock(target.above(2), AllBlocks.ENCASED_FAN.getDefaultState().setValue(EncasedFanBlock.FACING, Direction.DOWN), false);
            scene.world().showSection(util.select().fromTo(target.above(), target.above(2)), Direction.DOWN);
            scene.world().setKineticSpeed(util.select().position(target.above(2)), -128);
        }
        scene.overlay().showText(72).attachKeyFrame().placeNearTarget().pointAt(util.vector().topOf(target))
            .text(generator.basalt() ? "Use an upward-flowing Chute above the basalt."
                : "Collect the drops directly below the drill with a Hopper or Belt.");
        for (int i = 0; i < 3; i++) {
            scene.idle(15);
            scene.world().incrementBlockBreakingProgress(target);
        }
        scene.world().createItemEntity(util.vector().centerOf(target).add(.2, .37, .2), util.vector().of(.0, .12, .2), new ItemStack(output.getBlock()));
        scene.idle(34);
        scene.markAsFinished();
    }
}
