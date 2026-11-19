import { AfterViewInit, Component, ElementRef, inject, Input, NgZone, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import type { ItemAtlas } from '../planner/item-icon.component';
import { itemName, type Recipe } from './recipes';
import { generatorCollection } from './resource-sources';
import { PonderScene, SCENE_HEIGHT, SCENE_WIDTH } from './ponder-scene';

const STEP_MS = 3300;

interface SceneStep {
  title: string;
  text: string;
}

@Component({
  selector: 'app-ponder-scene',
  standalone: true,
  templateUrl: './ponder-scene.component.html',
  styleUrl: './ponder-scene.component.css',
})
export class PonderSceneComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) recipe!: Recipe;
  @Input() atlas?: ItemAtlas;
  @ViewChild('canvas', { static: true }) canvas!: ElementRef<HTMLCanvasElement>;

  readonly width = SCENE_WIDTH;
  readonly height = SCENE_HEIGHT;
  steps: SceneStep[] = [];
  step = 0;
  playing = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  private readonly zone = inject(NgZone);
  private renderer?: PonderScene;
  private texture?: HTMLImageElement;
  private frame?: number;
  private elapsed = 0;
  private lastTime?: number;

  ngAfterViewInit() {
    const context = this.canvas.nativeElement.getContext('2d');
    if (!context) return;
    const texture = this.texture = new Image();
    texture.onload = () => {
      this.renderer = new PonderScene(context, texture);
      this.draw();
      this.animate();
    };
    texture.src = new URL('assets/data/item-icons.png', document.baseURI).href;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['recipe']) {
      this.steps = this.describe(this.recipe);
      this.step = 0;
      this.elapsed = 0;
    }
    this.draw();
  }

  ngOnDestroy() {
    this.stop();
    if (this.texture) this.texture.onload = null;
  }

  togglePlayback() {
    this.playing = !this.playing;
    if (this.playing) this.animate();
    else this.stop();
  }

  show(index: number) {
    this.playing = false;
    this.stop();
    this.step = index;
    this.elapsed = STEP_MS * .68;
    this.draw();
  }

  private describe(recipe: Recipe): SceneStep[] {
    const product = itemName(recipe.outputs[0].item);
    if (recipe.generator) {
      return [
        { title: 'Set up the contact', text: recipe.generator.formation },
        { title: 'Form ' + product, text: 'Let the block form directly against the face of the drill. Keep the input fluids in place.' },
        { title: 'Collect the drops', text: generatorCollection(recipe.generator) },
      ];
    }
    const farm = recipe.farm!;
    const substrate = itemName(farm.soil);
    return [
      { title: 'Prepare the growing surface',
        text: farm.scene === 'cocoa' ? 'Plant Cocoa Beans on the side of a Jungle Log.'
          : 'Plant ' + itemName(farm.planting) + ' on ' + substrate + (product === 'Kelp' ? ' underwater.' : '.') },
      { title: 'Let the crop grow', text: farm.scene === 'tree' ? 'Leave room for the trunk and canopy to grow.' :
        farm.scene === 'column' ? 'Keep the base in place, then harvest the block that grows above it.' :
          'Wait for the plant to mature before harvesting.' },
      { title: 'Harvest and collect', text: farm.setup },
    ];
  }

  private animate() {
    if (!this.playing || !this.renderer || this.frame !== undefined) return;
    this.zone.runOutsideAngular(() => { this.frame = requestAnimationFrame(this.tick); });
  }

  private readonly tick = (time: number) => {
    this.frame = undefined;
    this.elapsed += this.lastTime === undefined ? 0 : Math.min(100, time - this.lastTime);
    this.lastTime = time;
    if (this.elapsed >= STEP_MS) {
      this.elapsed = 0;
      this.zone.run(() => { this.step = (this.step + 1) % this.steps.length; });
    }
    this.draw();
    this.animate();
  };

  private draw() {
    if (this.atlas) this.renderer?.render(this.recipe, this.atlas, this.step, this.elapsed / STEP_MS);
  }

  private stop() {
    if (this.frame !== undefined) cancelAnimationFrame(this.frame);
    this.frame = undefined;
    this.lastTime = undefined;
  }
}
