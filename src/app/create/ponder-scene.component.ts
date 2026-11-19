import { Component, Input, OnChanges } from '@angular/core';
import { itemName, type Recipe } from './recipes';
import { resourceSourceId } from './resource-sources';

interface PonderClip {
  id: string;
  title: string;
  description: string;
}

const WHEAT: PonderClip = {
  id: 'wheat',
  title: 'Mechanical Harvester',
  description: 'The original Ponder scene shows a rotating contraption harvesting and replanting wheat.',
};
const SAW: PonderClip = {
  id: 'trees',
  title: 'Sawing trees',
  description: 'The original Ponder scene shows the Mechanical Saw cutting trees from the base.',
};
const DEPLOYER: PonderClip = {
  id: 'replant',
  title: 'Deployer placement',
  description: 'This original Ponder scene demonstrates placement on a contraption using flowers. Use the same Deployer action with saplings for this farm.',
};
const DRILL: PonderClip = {
  id: 'drill',
  title: 'Mechanical Drill',
  description: 'The original Ponder scene demonstrates how the drill breaks the block in front of it, using planks as the example.',
};
const RECORDED_CROPS = new Set(['potato', 'carrot', 'beetroot', 'nether_wart', 'sweet_berries']);

@Component({
  selector: 'app-ponder-scene',
  standalone: true,
  templateUrl: './ponder-scene.component.html',
  styleUrl: './ponder-scene.component.css',
})
export class PonderSceneComponent implements OnChanges {
  @Input({ required: true }) recipe!: Recipe;

  readonly mediaPath = 'assets/ponder/';
  clips: PonderClip[] = [];
  active = 0;

  ngOnChanges() {
    this.active = 0;
    const id = resourceSourceId(this.recipe);
    const name = itemName(this.recipe.outputs[0].item);
    const farm = this.recipe.farm;
    if (this.recipe.generator) {
      this.clips = [{
        id,
        title: name + ' generator',
        description: 'A custom scene recorded in Create Ponder showing block formation and direct collection.',
      }];
    } else if (RECORDED_CROPS.has(id)) {
      this.clips = [{
        id,
        title: 'Harvesting ' + name,
        description: 'This scene uses the Create Harvester schematic to show the crop at maturity and after harvest.',
      }];
    } else if (farm?.scene === 'tree') {
      this.clips = [SAW, DEPLOYER];
    } else if (farm?.equipment[0] === 'create:mechanical_saw') {
      this.clips = [SAW];
    } else if (farm?.equipment[0] === 'create:mechanical_drill') {
      this.clips = [DRILL];
    } else {
      this.clips = [WHEAT];
    }
  }
}
