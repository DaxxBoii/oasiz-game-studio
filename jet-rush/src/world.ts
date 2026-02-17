import * as THREE from "three";
import { C, type Block, type BlockRow } from "./config";
import { seededRandom, SimplexNoise } from "./utils";

/* ── Shared materials (created once) ── */

const blockShades = [0x0f1e30, 0x121f33, 0x0d1a2c, 0x142236, 0x101c2e];
let blockMats: THREE.MeshStandardMaterial[] = [];
let blockEdgeMat: THREE.MeshBasicMaterial;
let groundMat: THREE.MeshStandardMaterial;
let matsReady = false;

function ensureMats(): void {
  if (matsReady) return;
  matsReady = true;

  blockMats = blockShades.map(
    (c) =>
      new THREE.MeshStandardMaterial({
        color: c,
        roughness: 0.5,
        metalness: 0.4,
        emissive: 0x060e1a,
        emissiveIntensity: 0.3,
      }),
  );

  blockEdgeMat = new THREE.MeshBasicMaterial({
    color: 0x0066aa,
    transparent: true,
    opacity: 0.3,
  });

  groundMat = new THREE.MeshStandardMaterial({
    color: 0x080e1a,
    roughness: 0.8,
    metalness: 0.2,
  });
}

/* ── Ground ── */

export function buildGround(scene: THREE.Scene): THREE.Group[] {
  ensureMats();
  const size = C.GROUND_SIZE;
  const tiles: THREE.Group[] = [];

  for (let i = 0; i < C.GROUND_SEGMENTS; i++) {
    const g = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), groundMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    g.add(floor);
    g.position.z = -i * size;
    scene.add(g);
    tiles.push(g);
  }

  return tiles;
}

export function recycleGround(tiles: THREE.Group[], planeZ: number): void {
  for (const g of tiles) {
    if (g.position.z > planeZ + C.GROUND_SIZE) {
      g.position.z -= C.GROUND_SIZE * C.GROUND_SEGMENTS;
    }
  }
}

/* ── Noise instances (lazily created per run seed) ── */

let cachedSeed = -1;
let noiseLo: SimplexNoise;
let noiseHi: SimplexNoise;
let noiseCorridor: SimplexNoise;
let noiseCorridor2: SimplexNoise;

function ensureNoise(seed: number): void {
  if (seed === cachedSeed) return;
  cachedSeed = seed;
  noiseLo = new SimplexNoise(seed);
  noiseHi = new SimplexNoise(seed + 7919);
  noiseCorridor = new SimplexNoise(seed + 13337);
  noiseCorridor2 = new SimplexNoise(seed + 24571);
}

/* ── Height from noise ── */

function sampleHeight(x: number, z: number): number {
  const lo = (noiseLo.noise2D(x * C.NOISE_SCALE_LO, z * C.NOISE_SCALE_LO) + 1) * 0.5;
  const hi = (noiseHi.noise2D(x * C.NOISE_SCALE_HI, z * C.NOISE_SCALE_HI) + 1) * 0.5;
  const raw = lo * C.NOISE_WEIGHT_LO + hi * C.NOISE_WEIGHT_HI;
  const shaped = Math.pow(raw, C.NOISE_HEIGHT_POW);

  if (shaped >= C.TALL_NOISE_CUTOFF) {
    const t = (shaped - C.TALL_NOISE_CUTOFF) / (1 - C.TALL_NOISE_CUTOFF);
    return C.TALL_H_MIN + t * (C.TALL_H_MAX - C.TALL_H_MIN);
  }
  const t = shaped / C.TALL_NOISE_CUTOFF;
  return C.SHORT_H_MIN + t * (C.SHORT_H_MAX - C.SHORT_H_MIN);
}

/* ── Corridor center X at a given Z ── */

function corridorCenterX(z: number): number {
  return noiseCorridor.noise2D(0, z * C.CORRIDOR_WANDER_SCALE) * C.CORRIDOR_WANDER_AMP;
}

function corridor2CenterX(z: number): number {
  return noiseCorridor2.noise2D(5.5, z * C.CORRIDOR2_WANDER_SCALE) * C.CORRIDOR2_WANDER_AMP;
}

/* ── Cell data computed before mesh creation ── */

interface CellData {
  bx: number;
  bz: number;
  bw: number;
  bd: number;
  bh: number;
}

/* ── Spawn a dense row of city blocks ── */

export function spawnRow(
  scene: THREE.Scene,
  z: number,
  runSeed: number,
  safeZone: boolean = false,
): BlockRow {
  ensureMats();
  ensureNoise(runSeed);

  const rng = seededRandom(Math.floor(z * 7.37 + runSeed));
  const cx1 = corridorCenterX(z);
  const cx2 = corridor2CenterX(z);

  /* ── Pass 1: compute cell positions and heights ── */
  const cells: CellData[] = [];

  for (let cellX = -C.BLOCK_SPREAD_X; cellX <= C.BLOCK_SPREAD_X; cellX += C.CELL_SIZE_X) {
    const jitterX = (rng() - 0.5) * 1.2;
    const jitterZ = (rng() - 0.5) * 1.0;
    const bx = cellX + jitterX;
    const bz = z + jitterZ;

    const bw = C.BLOCK_W_MIN + rng() * (C.BLOCK_W_MAX - C.BLOCK_W_MIN);
    const bd = C.BLOCK_D_MIN + rng() * (C.BLOCK_D_MAX - C.BLOCK_D_MIN);

    let bh = sampleHeight(bx, bz);

    if (safeZone) {
      bh = Math.min(bh, C.CORRIDOR_SAFE_H);
    }

    const dist1 = Math.abs(bx - cx1);
    const dist2 = Math.abs(bx - cx2);

    if (!safeZone) {
      if (dist1 < C.CORRIDOR_HALF_W) {
        const t = dist1 / C.CORRIDOR_HALF_W;
        const maxH = C.CORRIDOR_SAFE_H + t * t * (bh - C.CORRIDOR_SAFE_H);
        bh = Math.min(bh, maxH);
      }
      if (dist2 < C.CORRIDOR2_HALF_W) {
        const t = dist2 / C.CORRIDOR2_HALF_W;
        const maxH = C.CORRIDOR_SAFE_H + t * t * (bh - C.CORRIDOR_SAFE_H);
        bh = Math.min(bh, maxH);
      }
    }

    bh = Math.max(C.SHORT_H_MIN, bh);

    const deadLo = C.PLANE_Y - 1;
    const deadHi = C.PLANE_Y + 1;
    if (bh > deadLo && bh < deadHi) {
      bh = deadLo;
    }

    cells.push({ bx, bz, bw, bd, bh });
  }

  /* ── Pass 2: de-clump tall blocks ── */
  if (!safeZone) {
    const gap = C.TALL_MIN_GAP_CELLS;
    const thresh = C.TALL_THRESHOLD;
    let lastTallIdx = -gap - 1;

    for (let i = 0; i < cells.length; i++) {
      if (cells[i].bh >= thresh) {
        if (i - lastTallIdx <= gap) {
          cells[i].bh = C.SHORT_H_MIN + rng() * (C.SHORT_H_MAX - C.SHORT_H_MIN);
        } else {
          lastTallIdx = i;
        }
      }
    }
  }

  /* ── Pass 3: create meshes from cell data ── */
  const blocks: Block[] = [];
  const rng2 = seededRandom(Math.floor(z * 3.13 + runSeed));

  for (const cell of cells) {
    const { bx, bz, bw, bd, bh } = cell;

    const isMoving = !safeZone && bh > C.PLANE_Y && rng2() < C.MOVE_CHANCE;
    const moveAmp = isMoving
      ? C.MOVE_AMP_MIN + rng2() * (C.MOVE_AMP_MAX - C.MOVE_AMP_MIN)
      : 0;
    const moveSpeed = isMoving
      ? C.MOVE_SPEED_MIN + rng2() * (C.MOVE_SPEED_MAX - C.MOVE_SPEED_MIN)
      : 0;
    const movePhase = rng2() * Math.PI * 2;

    const geo = new THREE.BoxGeometry(bw, bh, bd);
    const mat = blockMats[Math.floor(rng2() * blockMats.length)];
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(bx, bh / 2, bz);
    scene.add(mesh);

    if (bh > 4.0) {
      const edgeGeo = new THREE.BoxGeometry(bw + 0.06, 0.06, bd + 0.06);
      const edge = new THREE.Mesh(edgeGeo, blockEdgeMat);
      edge.position.y = bh / 2;
      mesh.add(edge);
    }

    if (isMoving) {
      const stripMat = new THREE.MeshBasicMaterial({
        color: 0xff2255,
        transparent: true,
        opacity: 0.6,
      });
      const stripTop = new THREE.Mesh(
        new THREE.BoxGeometry(bw + 0.08, 0.1, bd + 0.08),
        stripMat,
      );
      stripTop.position.y = bh / 2;
      mesh.add(stripTop);

      const stripBot = new THREE.Mesh(
        new THREE.BoxGeometry(bw + 0.08, 0.1, bd + 0.08),
        stripMat,
      );
      stripBot.position.y = -bh / 2 + 0.05;
      mesh.add(stripBot);
    }

    blocks.push({
      mesh,
      worldZ: bz,
      worldX: bx,
      baseHeight: bh,
      width: bw,
      depth: bd,
      moving: isMoving,
      moveAmp,
      moveSpeed,
      movePhase,
      currentTop: bh,
    });
  }

  return { z, blocks };
}

/** Removes a row from the scene and disposes geometry. */
export function destroyRow(scene: THREE.Scene, row: BlockRow): void {
  for (const b of row.blocks) {
    scene.remove(b.mesh);
    b.mesh.geometry.dispose();
  }
}

/** Animates all moving blocks based on elapsed time. */
export function updateBlockAnimations(rows: BlockRow[], elapsed: number): void {
  for (const row of rows) {
    for (const b of row.blocks) {
      if (!b.moving) {
        b.currentTop = b.baseHeight;
        continue;
      }

      const yOffset = Math.sin(elapsed * b.moveSpeed + b.movePhase) * b.moveAmp;
      const newH = Math.max(0.3, b.baseHeight + yOffset);
      b.currentTop = newH;

      const scale = newH / b.baseHeight;
      b.mesh.scale.y = scale;
      b.mesh.position.y = newH / 2;
    }
  }
}
