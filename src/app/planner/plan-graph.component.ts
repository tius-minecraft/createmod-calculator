import { DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MACHINES, itemName, materialUnit } from '../create/recipes';
import { ItemIconComponent, type ItemAtlas } from './item-icon.component';
import type { Goal, MaterialRate, Plan } from './production-plan';

const NODE_WIDTH = 160;
const NODE_HEIGHT = 72;
const COLUMN_STEP = 238;
const ROW_STEP = 91;
const PADDING = 14;

interface GraphNode extends MaterialRate {
  id: string;
  label: string;
  column: number;
  x: number;
  y: number;
}

interface GraphEdge {
  id: string;
  from: GraphNode;
  to: GraphNode;
  rate: number;
  path: string;
}

@Component({
  selector: 'app-plan-graph',
  standalone: true,
  imports: [DecimalPipe, ItemIconComponent],
  templateUrl: './plan-graph.component.html',
  styleUrl: './plan-graph.component.css',
})
export class PlanGraphComponent implements OnChanges {
  @Input({ required: true }) plan!: Plan;
  @Input({ required: true }) goals!: Goal[];
  @Input() atlas?: ItemAtlas;
  @Input() selected = '';
  @Output() selectMaterial = new EventEmitter<string>();

  readonly name = itemName;
  readonly unit = materialUnit;
  readonly nodeWidth = NODE_WIDTH;
  width = 0;
  height = 0;
  zoom = 1;
  nodes: GraphNode[] = [];
  edges: GraphEdge[] = [];

  ngOnChanges(changes: SimpleChanges) {
    if (!changes['plan'] && !changes['goals']) return;
    const rows = new Map<number, number>();
    const nodes = new Map<string, GraphNode>();
    const edges = new Map<string, GraphEdge>();
    const sourceOffset = this.plan.external.length ? 0 : 1;
    const targetColumn = 1 + Math.max(0, ...this.plan.stages.map(stage => stage.depth - sourceOffset));

    const addNode = (id: string, label: string, material: MaterialRate, column: number) => {
      const row = rows.get(column) ?? 0;
      nodes.set(id, { id, label, item: material.item, rate: material.rate, column,
        x: PADDING + column * COLUMN_STEP, y: row * ROW_STEP });
      rows.set(column, row + 1);
    };
    const addEdge = (fromId: string, toId: string, rate: number) => {
      const id = fromId + '→' + toId;
      const existing = edges.get(id);
      if (existing) {
        existing.rate += rate;
      } else {
        edges.set(id, { id, from: nodes.get(fromId)!, to: nodes.get(toId)!, rate, path: '' });
      }
    };

    for (const material of this.plan.external) addNode('supply/' + material.item, 'External supply', material, 0);
    for (const stage of this.plan.stages) {
      const recipe = stage.recipe;
      addNode(stage.item, recipe.farm?.method ?? (recipe.generator ? 'Block generator' : MACHINES[recipe.machine].label),
        stage, stage.depth - sourceOffset);
    }
    for (const stage of this.plan.stages) {
      for (const input of stage.input) addEdge(input.external ? 'supply/' + input.item : input.item, stage.item, input.rate);
    }
    for (const goal of this.goals.filter(goal => goal.rate > 0 && Number.isFinite(goal.rate))) {
      const id = 'target/' + goal.item;
      addNode(id, 'Production target', goal, targetColumn);
      addEdge(nodes.has(goal.item) ? goal.item : 'supply/' + goal.item, id, goal.rate);
    }

    // Send edges that skip columns through a channel above the cards.
    const longEdges = [...edges.values()].filter(edge => edge.to.column - edge.from.column > 1);
    const top = PADDING + longEdges.length * 7;
    for (const node of nodes.values()) node.y += top;
    let track = 0;
    for (const edge of edges.values()) {
      const startX = edge.from.x + NODE_WIDTH;
      const endX = edge.to.x - 3;
      const fromY = edge.from.y + NODE_HEIGHT / 2;
      const toY = edge.to.y + NODE_HEIGHT / 2;
      const gap = 30;
      if (edge.to.column - edge.from.column === 1) {
        edge.path = `M ${startX} ${fromY} C ${startX + gap} ${fromY}, ${endX - gap} ${toY}, ${endX} ${toY}`;
      } else {
        const channel = top - (++track) * 7;
        edge.path = `M ${startX} ${fromY} H ${startX + gap} V ${channel} H ${endX - gap} V ${toY} H ${endX}`;
      }
    }
    this.width = PADDING * 2 + targetColumn * COLUMN_STEP + NODE_WIDTH;
    this.height = top + Math.max(1, ...rows.values()) * ROW_STEP;
    this.nodes = [...nodes.values()];
    this.edges = [...edges.values()];
  }
}
