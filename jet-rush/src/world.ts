import * as THREE from "../node_modules/@types/three";
import { C, type Block, type BlockRow } from "./config";
import { seededRandom } from "./utils";

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
  const gridMat = new THREE.MeshBasicMaterial({
    color: 0x0044aa,
    transparent: true,
    opacity: 0.18,
  });

  const tiles: THREE.Group[] = [];

  for (let i = 0; i < C.GROUND_SEGMENTS; i++) {
    const g = new THREE.Group();

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(size, size), groundMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    g.add(floor);

    /* Grid lines along Z (cross lines for speed perception) */
    for (let j = -size / 2; j <= size / 2; j += 8) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(size, 0.02, 0.05), gridMat);
      line.position.set(0, 0.01, j);
      g.add(line);
    }

    /* Grid lines along X (lane lines) */
    for (let j = -size / 2; j <= size / 2; j += 8) {
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.02, size), gridMat);
      line.position.set(j, 0.01, 0);
      g.add(line);
    }

    g.position.z = -i * size;
    scene.add(g);
    tiles.push(g);
  }

  return tiles;
}

/** Recycles ground tiles so they always surround the player. */
export function recycleGround(tiles: THREE.Group[], planeZ: number): void {
  for (const g of tiles) {
    if (g.position.z > planeZ + C.GROUND_SIZE) {
      g.position.z -= C.GROUND_SIZE * C.GROUND_SEGMENTS;
    }
  }
}

/* ── Block Rows ── */

export function spawnRow(
  scene: THREE.Scene,
  z: number,
  runSeed: number,
): BlockRow {
  ensureMats();
  const rng = seededRandom(Math.floor(z * 7.37 + runSeed));
  const count = Math.floor(
    C.BLOCKS_PER_ROW_MIN + rng() * (C.BLOCKS_PER_ROW_MAX - C.BLOCKS_PER_ROW_MIN),
  );
  const blocks: Block[] = [];

  for (let i = 0; i < count; i++) {
    const bx = (rng() - 0.5) * 2 * C.BLOCK_SPREAD_X;
    const bw = C.BLOCK_W_MIN + rng() * (C.BLOCK_W_MAX - C.BLOCK_W_MIN);
    const bd = C.BLOCK_D_MIN + rng() * (C.BLOCK_D_MAX - C.BLOCK_D_MIN);

    /* Height distribution: 55% short, 25% medium, 20% tall */
    const hRoll = rng();
    let bh: number;
    if (hRoll < 0.55) {
      bh = C.BLOCK_H_SHORT_MIN + rng() * (C.BLOCK_H_SHORT_MAX - C.BLOCK_H_SHORT_MIN);
    } else if (hRoll < 0.80) {
      bh = C.BLOCK_H_MED_MIN + rng() * (C.BLOCK_H_MED_MAX - C.BLOCK_H_MED_MIN);
    } else {
      bh = C.BLOCK_H_TALL_MIN + rng() * (C.BLOCK_H_TALL_MAX - C.BLOCK_H_TALL_MIN);
    }

    /* Moving blocks - only some medium/tall ones */
    const isMoving = bh > 2.0 && rng() < C.MOVE_CHANCE;
    const moveAmp = isMoving
      ? C.MOVE_AMP_MIN + rng() * (C.MOVE_AMP_MAX - C.MOVE_AMP_MIN)
      : 0;
    const moveSpeed = isMoving
      ? C.MOVE_SPEED_MIN + rng() * (C.MOVE_SPEED_MAX - C.MOVE_SPEED_MIN)
      : 0;
    const movePhase = rng() * Math.PI * 2;

    /* Mesh */
    const geo = new THREE.BoxGeometry(bw, bh, bd);
    const mat = blockMats[Math.floor(rng() * blockMats.length)];
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(bx, bh / 2, z);
    scene.add(mesh);

    /* Edge highlights on tall blocks */
    if (bh > 2.5) {
      const edgeGeo = new THREE.BoxGeometry(bw + 0.06, 0.06, bd + 0.06);
      const edge = new THREE.Mesh(edgeGeo, blockEdgeMat);
      edge.position.y = bh / 2;
      mesh.add(edge);
    }

    /* Red accent strips on moving blocks */
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
      worldZ: z,
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
