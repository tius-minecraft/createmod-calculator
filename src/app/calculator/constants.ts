import { crushingDurations, cuttingDurations, millingDurations } from "../create/recipe-durations";
import { CalculatorData } from "./calculator.model";

export var g_invisibleChar: string = "​";

export function decimal(num?: number): number | undefined {
  return num === undefined ? undefined : Number(num.toFixed(3));
}

export function clamp(num: number, min: number, max: number) {
  return Math.max(min, Math.min(max, num));
}

export function lerp(a: number, b: number, t: number) {
  return a + t * (b - a);
}

export var g_calculatorsData: CalculatorData[] = [
  {
    name: "Mechanical Drill",
    id: "drill",
    iconPath: "assets/icons/drill.png",
    wikiPage: "https://create.fandom.com/wiki/Mechanical_Drill"
  },
  {
    name: "Mechanical Mixer",
    id: "mixer",
    iconPath: "assets/icons/mixer.png",
    wikiPage: "https://create.fandom.com/wiki/Mechanical_Mixer"
  },
  {
    name: "Encased Fan",
    id: "fan",
    iconPath: "assets/icons/fan.png",
    wikiPage: "https://create.fandom.com/wiki/Encased_Fan"
  },
  {
    name: "Mechanical Press",
    id: "press",
    iconPath: "assets/icons/press.png",
    wikiPage: "https://create.fandom.com/wiki/Mechanical_Press"
  },
  {
    name: "Millstone",
    id: "millstone",
    iconPath: "assets/icons/millstone.png",
    wikiPage: "https://create.fandom.com/wiki/Millstone#Recipe_Table"
  },
  {
    name: "Crushing",
    id: "crushing",
    iconPath: "assets/icons/crushing.png",
    wikiPage: "https://create.fandom.com/wiki/Crushing_Wheel#Recipe_Duration_Table"
  },
  {
    name: "Mechanical Belt",
    id: "belt",
    iconPath: "assets/icons/belt.png",
    wikiPage: "https://create.fandom.com/wiki/Mechanical_Belt"
  },
  {
    name: "Mechanical Saw",
    id: "saw",
    iconPath: "assets/icons/saw.png",
    wikiPage: "https://create.fandom.com/wiki/Mechanical_Saw"
  },
  {
    name: "Deployer",
    id: "deployer",
    iconPath: "assets/icons/deployer.png",
    wikiPage: "https://create.fandom.com/wiki/Deployer"
  },
  {
    name: "Mechanical Arm",
    id: "arm",
    iconPath: "assets/icons/arm.png",
    wikiPage: "https://create.fandom.com/wiki/Mechanical_Arm"
  },
  {
    name: "Mechanical Crafter",
    id: "crafter",
    iconPath: "assets/icons/crafter.png",
    wikiPage: "https://create.fandom.com/wiki/Mechanical_Crafter"
  },
  {
    name: "Mechanical Pump",
    id: "pump",
    iconPath: "assets/icons/pump.png",
    wikiPage: "https://create.fandom.com/wiki/Mechanical_Pump"
  }
];

export var g_drillHardness = new Map<string, number>([
  ["cobblestone", 2],
  ["stone", 1.5],
  ["basalt", 1.25],
  ["obsidian", 50]
]);

export var g_sawHardness = new Map<string, number>([
  ["log (any)", 2],
  ["wood (any)", 2],
  ["mangrove roots", 0.7],
  ["mushroom stem", 0.2],
  ["cactus", 0.4]
])

export const OPTIMIZED_GENERATOR = -1;

export var g_delays = new Map<string, number>([
  ["No Delay", 0],
  ["Fluid regeneration (30 ticks)", 30],
  ["Optimized generator", OPTIMIZED_GENERATOR]
]);

export var g_crushingInputDelays = new Map<string, number>([
  ["Funnel (fastest)", 1],
  ["Chute (slower)", 3],
  ["Thrown (slowest, not recommended)", 27]
]);

export var g_crafterInputDelays = new Map<string, number>([
  ["Funnel (faster)", 0],
  ["Chute (slower)", 2]
]);

export const g_cuttingRecipes = new Map<string, number>([
  ["Stonecutting and log stripping", 50],
  ...cuttingDurations
]);

export const g_millstoneRecipes = new Map<string, number>(millingDurations);
export const g_crushingRecipes = new Map<string, number>(crushingDurations);
