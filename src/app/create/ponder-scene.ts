import type { ItemAtlas } from '../planner/item-icon.component';
import type { Recipe } from './recipes';

export const SCENE_WIDTH = 480;
export const SCENE_HEIGHT = 266;

type Point = [number, number];

const FLUID_COLORS: Record<string, string> = {
  'minecraft:lava_bucket': '#ed6b27',
  'minecraft:water_bucket': '#437edd',
  'create:honey_bucket': '#e8a23c',
  'create:chocolate_bucket': '#613721',
};

const ROOT_CROPS = new Set(['minecraft:carrot', 'minecraft:potato', 'minecraft:beetroot']);

export class PonderScene {
  constructor(private readonly ctx: CanvasRenderingContext2D, private readonly texture: HTMLImageElement) {}

  render(recipe: Recipe, atlas: ItemAtlas, step: number, progress: number) {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, SCENE_WIDTH, SCENE_HEIGHT);
    ctx.imageSmoothingEnabled = false;
    if (recipe.generator) this.drawGenerator(recipe, atlas, step, progress);
    if (recipe.farm) this.drawFarm(recipe, atlas, step, progress);
  }

  private drawGenerator(recipe: Recipe, atlas: ItemAtlas, step: number, progress: number) {
    const generator = recipe.generator!;
    const item = recipe.outputs[0].item;
    this.board(atlas, generator.ground ? 'minecraft:netherrack' : 'minecraft:stone', 2);
    const fluid = generator.material;
    this.block(atlas, -1, 0, -.12, 'minecraft:lava_bucket', .13, FLUID_COLORS['minecraft:lava_bucket']);
    this.block(atlas, 0, -1, -.12, fluid, generator.ground ? .91 : .13, FLUID_COLORS[fluid]);
    if (generator.ground) {
      this.block(atlas, 0, 0, -.85, generator.ground, .85);
    } else {
      this.block(atlas, 1, 0, -.5, 'create:belt_connector', .28, '#80654d');
    }
    if (step === 1) {
      this.pulse(this.project(-.38, .5, .11), this.project(.5, .5, .11), progress, '#ffaa49');
      if (!generator.ground) {
        this.pulse(this.project(.5, -.38, .11), this.project(.5, .5, .11), progress, FLUID_COLORS[fluid]);
      }
    }
    if (step === 2 || (step === 1 && progress > .34)) {
      this.block(atlas, 0, 0, 0, item, step === 1 ? Math.min(.94, (progress - .34) * 5) : .94);
    }
    this.device(atlas, 0, 1, 0, 'create:mechanical_drill', step === 2);
    if (generator.ground && step === 2) this.device(atlas, 0, 0, 1.12, 'create:chute', false);
    if (step === 2) {
      const origin = this.project(.5, .5, .97);
      const output = generator.ground ? this.project(.5, .5, 2.65) : this.project(2.75, .5, -.12);
      this.transfer(atlas, item, origin, output, progress);
      this.spark(origin, progress);
    }
  }

  private drawFarm(recipe: Recipe, atlas: ItemAtlas, step: number, progress: number) {
    const farm = recipe.farm!;
    const output = recipe.outputs[0].item;
    const maturity = step === 0 ? .24 : step === 1 ? .24 + .76 * progress : 1;
    const cutter = farm.equipment[0];
    const tree = farm.scene === 'tree';
    const cocoa = farm.scene === 'cocoa';
    const fruit = farm.scene === 'fruit';
    const bed = cocoa ? 'minecraft:grass_block' : farm.soil;
    const soilId = farm.scene === 'field' && farm.soil === 'minecraft:farmland' ? bed : 'minecraft:dirt';
    this.board(atlas, soilId, 2);

    if (output === 'minecraft:sugar_cane' || output === 'minecraft:kelp' || farm.soil === 'minecraft:farmland') {
      this.block(atlas, 1, -1, -.16, 'minecraft:water_bucket', .12, FLUID_COLORS['minecraft:water_bucket']);
    }
    const plots = tree || cocoa || fruit ? [0] : [-1, 0, 1];
    for (const x of plots) {
      this.block(atlas, x, 0, -.24, bed, .24);
      const harvested = step === 2 && progress * (plots.length + 1) > x - plots[0] + .55;
      const plant = harvested ? .24 : maturity;
      if (tree && plant > .45) {
        const height = .6 + plant * 1.05;
        this.block(atlas, x + .23, .23, 0, output, height, undefined, .54);
        const leaves = output.replace('_log', '_leaves');
        for (const [dx, dz] of [[.11, -.28], [-.22, .03], [.27, .2], [.02, .47]]) {
          this.block(atlas, x + dx, dz, height - .28, leaves, .63, '#4d7936', .72);
        }
        this.block(atlas, x + .1, .12, height + .18, leaves, .65, '#5b8441', .78);
      } else if (farm.scene === 'column') {
        const levels = plant > .65 ? 2 : 1;
        for (let level = 0; level < levels; level++) {
          if (output === 'minecraft:cactus') {
            this.block(atlas, x + .19, .19, level * .6, output, .57, undefined, .62);
          } else {
            this.sprite(atlas, output, this.project(x + .5, .5, .42 + level * .7), 40);
          }
        }
      } else if (cocoa) {
        this.block(atlas, -.25, 0, 0, farm.soil, 1.7, undefined, .67);
        this.sprite(atlas, output, this.project(.55, .52, .7), 19 + plant * 14);
      } else if (fruit) {
        this.sprite(atlas, farm.planting, this.project(-.2, .4, .25), 24);
        if (plant > .42) {
          const block = output === 'minecraft:melon_slice' ? 'minecraft:melon' : output;
          this.block(atlas, .13, .13, 0, block, plant * .78, undefined, .74);
        }
      } else {
        const display = plant > .65 ? output : farm.planting;
        const position = this.project(x + .5, .5, .23 + plant * .28);
        if (ROOT_CROPS.has(output)) this.stem(position, plant);
        this.sprite(atlas, display, position, 17 + plant * 23);
      }
    }
    const toolX = step === 2 ? -1.45 + progress * 3 : -1.45;
    const height = farm.scene === 'column' || cocoa ? .42 : -.1;
    this.device(atlas, toolX, 1, height, cutter, step === 2);
    if (step === 2) {
      if (tree && progress > .55) this.device(atlas, .72, -.46, .68, farm.equipment[1], true);
      const harvest = this.project(toolX + .4, .65, .5 + height);
      this.transfer(atlas, output, harvest, this.project(2.45, 1.25, .08), progress);
    }
  }

  private board(atlas: ItemAtlas, surface: string, radius: number) {
    for (let x = -radius; x <= radius; x++) {
      for (let z = -radius; z <= radius; z++) {
        if (Math.abs(x) + Math.abs(z) > 3) continue;
        this.block(atlas, x, z, -.7, surface, .52, (x + z) % 2 ? '#3a373e' : '#49454b');
      }
    }
  }

  private device(atlas: ItemAtlas, x: number, z: number, y: number, item: string, running: boolean) {
    this.block(atlas, x + .12, z + .12, y, 'minecraft:stripped_spruce_log', .54, '#8c684e', .76);
    this.sprite(atlas, item, this.project(x + .52, z + .5, y + .65), 50);
    if (running) this.pulse(this.project(x + .48, z + .28, y + .57), this.project(x + .48, z - .3, y + .57), .55, '#ffd58e');
  }

  private project(x: number, z: number, height: number): Point {
    return [240 + (x - z) * 32, 151 + (x + z) * 16 - height * 36];
  }

  private block(atlas: ItemAtlas, x: number, z: number, y: number, item: string, height: number, tint?: string, width = 1) {
    const a = this.project(x, z, y + height);
    const b = this.project(x + width, z, y + height);
    const c = this.project(x, z + width, y + height);
    const d = this.project(x + width, z + width, y + height);
    const depth = height * 36;
    this.face(atlas, item, b, d, [b[0], b[1] + depth], '#242028', .38, tint);
    this.face(atlas, item, c, d, [c[0], c[1] + depth], '#242028', .58, tint);
    this.face(atlas, item, a, b, c, '#fcddb0', .09, tint);
  }

  private face(atlas: ItemAtlas, item: string, a: Point, b: Point, c: Point, shade: string, opacity: number, tint?: string) {
    const ctx = this.ctx;
    ctx.save();
    ctx.transform((b[0] - a[0]) / 16, (b[1] - a[1]) / 16, (c[0] - a[0]) / 16, (c[1] - a[1]) / 16, a[0], a[1]);
    ctx.fillStyle = tint ?? '#66606a';
    ctx.fillRect(0, 0, 16, 16);
    ctx.globalAlpha = FLUID_COLORS[item] ? 0 : tint ? .48 : 1;
    this.blit(atlas, item, 0, 0, 16);
    ctx.globalAlpha = opacity;
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, 16, 16);
    ctx.restore();
  }

  private sprite(atlas: ItemAtlas, item: string, [x, y]: Point, size: number) {
    this.blit(atlas, item, Math.round(x - size / 2), Math.round(y - size / 2), Math.round(size));
  }

  private blit(atlas: ItemAtlas, item: string, x: number, y: number, size: number) {
    const index = atlas.items[item];
    if (index === undefined) return;
    const tile = this.texture.naturalWidth / atlas.columns;
    this.ctx.drawImage(this.texture, index % atlas.columns * tile, Math.floor(index / atlas.columns) * tile,
      tile, tile, x, y, size, size);
  }

  private stem([x, y]: Point, maturity: number) {
    const ctx = this.ctx;
    ctx.fillStyle = '#5a923b';
    ctx.fillRect(x - 2, y - 13 * maturity, 4, 20 * maturity);
    ctx.fillRect(x - 7, y - 9 * maturity, 14, 4);
  }

  private pulse(from: Point, to: Point, progress: number, color: string) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    for (let i = 0; i < 4; i++) {
      const part = (progress + i * .23) % 1;
      ctx.fillRect(from[0] + (to[0] - from[0]) * part, from[1] + (to[1] - from[1]) * part, 3, 3);
    }
  }

  private transfer(atlas: ItemAtlas, item: string, from: Point, to: Point, progress: number) {
    const part = Math.max(0, Math.min(1, progress * 1.35 - .10));
    const lift = Math.sin(Math.PI * part) * 26;
    this.sprite(atlas, item, [from[0] + (to[0] - from[0]) * part, from[1] + (to[1] - from[1]) * part - lift], 25);
  }

  private spark([x, y]: Point, progress: number) {
    const ctx = this.ctx;
    const distance = (progress * 5 % 1) * 17;
    ctx.fillStyle = '#ffd497';
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(x + Math.cos(i * 1.26) * distance, y + Math.sin(i * 1.26) * distance, 3, 3);
    }
  }
}
