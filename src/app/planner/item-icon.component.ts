import { Component, Input } from '@angular/core';

export interface ItemAtlas {
  columns: number;
  rows: number;
  items: Record<string, number>;
}

let atlasRequest: Promise<ItemAtlas> | undefined;

export function loadItemAtlas(): Promise<ItemAtlas> {
  atlasRequest ??= fetch(new URL('assets/data/item-icons.json', document.baseURI))
    .then(response => {
      if (!response.ok) throw new Error('Could not load item icons.');
      return response.json() as Promise<ItemAtlas>;
    })
    .catch(error => {
      atlasRequest = undefined;
      throw error;
    });
  return atlasRequest;
}

@Component({
  selector: 'app-item-icon',
  standalone: true,
  template: '@if (atlas && index !== undefined) {<span [style.background-image]="image" [style.background-size]="size" [style.background-position]="position"></span>}',
  host: { 'aria-hidden': 'true' },
  styles: [`
    :host { display: inline-flex; flex: 0 0 20px; width: 20px; height: 20px; }
    span { width: 100%; height: 100%; image-rendering: pixelated; background-repeat: no-repeat; }
    :host:empty { display: none; }
  `],
})
export class ItemIconComponent {
  @Input({ required: true }) item!: string;
  @Input() atlas?: ItemAtlas;

  readonly image = 'url("assets/data/item-icons.png")';

  get index() {
    return this.atlas?.items[this.item] ?? this.atlas?.items[this.item.split('[')[0]];
  }

  get size() {
    return this.atlas ? this.atlas.columns * 20 + 'px ' + this.atlas.rows * 20 + 'px' : '';
  }

  get position() {
    const index = this.index;
    if (!this.atlas || index === undefined) return '';
    const column = index % this.atlas.columns;
    const row = Math.floor(index / this.atlas.columns);
    return -column * 20 + 'px ' + -row * 20 + 'px';
  }
}
