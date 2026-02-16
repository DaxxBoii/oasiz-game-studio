import * as THREE from "three";

/* ── Game State ── */

export type GameState = "START" | "PLAYING" | "GAME_OVER";
export type HapticType = "light" | "medium" | "heavy" | "success" | "error";

/* ── Settings ── */

export interface Settings {
  music: boolean;
  fx: boolean;
  haptics: boolean;
}

/* ── Block Data ── */

export interface Block {
  mesh: THREE.Mesh;
  worldZ: number;
  worldX: number;
  baseHeight: number;
  width: number;
  depth: number;
  moving: boolean;
  moveAmp: number;
  moveSpeed: number;
  movePhase: number;
  currentTop: number;
}

export interface BlockRow {
  z: number;
  blocks: Block[];
}

/* ── Particle Data ── */

export interface Particle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  vel: THREE.Vector3;
}

/* ── Window Extensions ── */

declare global {
  interface Window {
    submitScore?: (score: number) => void;
    triggerHaptic?: (type: HapticType) => void;
  }
}

/* ── Constants ── */

export const C = {
  PLANE_Y: 3.5,
  PLANE_HIT_R: 0.85,
  PLANE_HIT_HALF_W: 1.0,

  SPEED_INIT: 32,
  SPEED_MAX: 72,
  SPEED_RAMP: 0.35,

  LATERAL_SPEED: 20,
  BOUNDARY_X: 40,

  CAM_BACK: 10,
  CAM_UP: 6,
  CAM_LOOK_AHEAD: 20,
  CAM_SMOOTH: 4.5,

  GROUND_SIZE: 600,
  GROUND_SEGMENTS: 4,

  ROW_SPACING: 12,
  ROW_AHEAD: 350,
  ROW_BEHIND: 40,

  BLOCKS_PER_ROW_MIN: 6,
  BLOCKS_PER_ROW_MAX: 14,
  BLOCK_SPREAD_X: 35,

  BLOCK_W_MIN: 1.5,
  BLOCK_W_MAX: 4.0,
  BLOCK_D_MIN: 1.5,
  BLOCK_D_MAX: 4.0,

  BLOCK_H_SHORT_MIN: 0.5,
  BLOCK_H_SHORT_MAX: 2.0,
  BLOCK_H_MED_MIN: 2.0,
  BLOCK_H_MED_MAX: 4.5,
  BLOCK_H_TALL_MIN: 4.0,
  BLOCK_H_TALL_MAX: 8.0,

  MOVE_CHANCE: 0.18,
  MOVE_AMP_MIN: 1.5,
  MOVE_AMP_MAX: 4.0,
  MOVE_SPEED_MIN: 0.6,
  MOVE_SPEED_MAX: 1.8,

  TRAIL_LIFE: 0.22,
  TRAIL_RATE: 55,
} as const;
