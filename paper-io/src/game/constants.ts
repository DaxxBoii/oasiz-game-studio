import type { ColorTheme, Dir } from "./types";

export const GRID_W = 72;
export const GRID_H = 72;
export const TOTAL_CELLS = GRID_W * GRID_H;
export const BOT_COUNT = 3;
export const MOVE_SPEED = 8.5;
export const PLAYER_INIT_SIZE = 5;
export const BOT_INIT_SIZE = 4;
export const BOT_IDLE_MIN = 0.8;
export const BOT_IDLE_MAX = 2.2;
export const BOT_VENTURE_MIN = 10;
export const BOT_VENTURE_MAX = 22;
export const BOT_MAX_TRAIL = 22;
export const BOT_RESPAWN_TIME = 1.6;
export const CAMERA_LERP = 7;
export const BOARD_CELL_PIXELS = 10;

export const DIR_DX: Record<Dir, number> = { 0: 0, 1: 1, 2: 0, 3: -1 };
export const DIR_DY: Record<Dir, number> = { 0: -1, 1: 0, 2: 1, 3: 0 };
export const OPPOSITE: Record<Dir, Dir> = { 0: 2, 1: 3, 2: 0, 3: 1 };
export const CW: Record<Dir, Dir> = { 0: 1, 1: 2, 2: 3, 3: 0 };
export const CCW: Record<Dir, Dir> = { 0: 3, 1: 0, 2: 1, 3: 2 };

export const COLORS: ColorTheme[] = [
  {
    name: "You",
    territory: "#f1d537",
    trail: "#f2df83",
    mesh: "#f0cc25",
    accent: "#ffe98d",
  },
  {
    name: "Razor",
    territory: "#2fc2cb",
    trail: "#7fd9dd",
    mesh: "#2bb3bc",
    accent: "#b4eef1",
  },
  {
    name: "Blitz",
    territory: "#98d93d",
    trail: "#bce779",
    mesh: "#87cb31",
    accent: "#dbf4b1",
  },
  {
    name: "Nova",
    territory: "#eb6e96",
    trail: "#f6a9bf",
    mesh: "#dc5f87",
    accent: "#ffd2df",
  },
];

export const BOT_NAMES = ["Razor", "Blitz", "Nova"];
