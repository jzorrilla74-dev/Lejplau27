export const BLOCK = {
  widthM: 9.4,
  depthM: 33.5,
  setbacks: { front: 3.5, rear: 5.0, north: 1.0, south: 0 },
  maxCoverageRatio: 0.60,
  maxFootprintM2: 189,
  partyWall: { startM: 9.37, lengthM: 8.25 },
};
export const GRID_M = 0.1;
export const FINE_GRID_M = 0.01;
export const VISUAL_GRID_M = 0.5;
export const SCALE_DEFAULT = 60;
export const SCALE_MIN = 8;
export const SCALE_MAX = 200;
export const OPENROUTER_MODEL = 'anthropic/claude-opus-4';
export const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
