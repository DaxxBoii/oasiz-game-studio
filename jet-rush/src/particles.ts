import * as THREE from "three";
import { C, type Particle } from "./config";

/** Emits a single engine trail particle behind the jet. */
export function emitTrail(
  scene: THREE.Scene,
  jetPos: THREE.Vector3,
  particles: Particle[],
): void {
  const sz = 0.04 + Math.random() * 0.06;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(sz, 4, 4),
    new THREE.MeshBasicMaterial({
      color: 0x00ccff,
      transparent: true,
      opacity: 0.5,
    }),
  );
  mesh.position.set(
    jetPos.x + (Math.random() - 0.5) * 0.2,
    jetPos.y + (Math.random() - 0.5) * 0.15,
    jetPos.z + 1.2,
  );
  scene.add(mesh);

  particles.push({
    mesh,
    life: C.TRAIL_LIFE,
    maxLife: C.TRAIL_LIFE,
    vel: new THREE.Vector3(
      (Math.random() - 0.5) * 1.2,
      (Math.random() - 0.5) * 1.0,
      2 + Math.random() * 1.5,
    ),
  });
}

/** Updates trail particles, removing dead ones. Returns the filtered array. */
export function tickTrail(
  scene: THREE.Scene,
  particles: Particle[],
  dt: number,
): Particle[] {
  return particles.filter((p) => {
    p.life -= dt;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      return false;
    }
    p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
    const alpha = p.life / p.maxLife;
    (p.mesh.material as THREE.MeshBasicMaterial).opacity = alpha * 0.4;
    p.mesh.scale.setScalar(alpha * 0.5 + 0.5);
    return true;
  });
}

/** Spawns an explosion burst of box particles. */
export function spawnExplosion(
  scene: THREE.Scene,
  x: number,
  y: number,
  z: number,
  particles: Particle[],
): void {
  const colors = [0xff4466, 0xff8800, 0xffcc00, 0x00ccff, 0x2288ff];
  for (let i = 0; i < 35; i++) {
    const sz = 0.08 + Math.random() * 0.2;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(sz, sz, sz),
      new THREE.MeshBasicMaterial({
        color: colors[i % 5],
        transparent: true,
        opacity: 1,
      }),
    );
    mesh.position.set(x, y, z);
    scene.add(mesh);

    const a1 = Math.random() * Math.PI * 2;
    const a2 = Math.random() * Math.PI - Math.PI / 2;
    const speed = 5 + Math.random() * 15;

    particles.push({
      mesh,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 0.8,
      vel: new THREE.Vector3(
        Math.cos(a1) * Math.cos(a2) * speed,
        Math.sin(a2) * speed + 4,
        Math.sin(a1) * Math.cos(a2) * speed,
      ),
    });
  }
}

/** Updates explosion particles with gravity. Returns the filtered array. */
export function tickExplosion(
  scene: THREE.Scene,
  particles: Particle[],
  dt: number,
): Particle[] {
  return particles.filter((p) => {
    p.life -= dt;
    if (p.life <= 0) {
      scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      return false;
    }
    p.vel.y -= 12 * dt;
    p.mesh.position.add(p.vel.clone().multiplyScalar(dt));
    p.mesh.rotation.x += dt * 5;
    p.mesh.rotation.y += dt * 3;
    (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life / p.maxLife;
    return true;
  });
}
