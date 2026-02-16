import * as THREE from "three";
import { C } from "./config";

export interface JetModel {
  group: THREE.Group;
  body: THREE.Group;
}

/** Builds the jet plane model and returns the outer group + inner body group. */
export function createJet(scene: THREE.Scene): JetModel {
  const group = new THREE.Group();
  const body = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x2288ff, roughness: 0.3, metalness: 0.7,
    emissive: 0x1155cc, emissiveIntensity: 0.25,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff, roughness: 0.2, metalness: 0.9,
    emissive: 0x00aaff, emissiveIntensity: 0.6,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x0a1a3a, roughness: 0.4, metalness: 0.8,
  });

  /* Fuselage */
  const fuseGeo = new THREE.ConeGeometry(0.35, 2.8, 8);
  fuseGeo.rotateX(Math.PI / 2);
  body.add(new THREE.Mesh(fuseGeo, bodyMat));

  /* Cockpit */
  const cockpitGeo = new THREE.SphereGeometry(0.28, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const cockpit = new THREE.Mesh(cockpitGeo, accentMat);
  cockpit.position.set(0, 0.2, -0.3);
  cockpit.rotation.x = -Math.PI / 6;
  body.add(cockpit);

  /* Wings */
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, 0);
  wingShape.lineTo(2.2, -0.3);
  wingShape.lineTo(2.0, 0.1);
  wingShape.lineTo(0.3, 0.2);
  wingShape.lineTo(0, 0);
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.06, bevelEnabled: false });

  const leftWing = new THREE.Mesh(wingGeo, bodyMat);
  leftWing.position.set(0.15, -0.05, 0.2);
  const rightWing = new THREE.Mesh(wingGeo, bodyMat);
  rightWing.position.set(-0.15, -0.05, 0.2);
  rightWing.rotation.y = Math.PI;
  body.add(leftWing, rightWing);

  /* Tail fin */
  const tailFinShape = new THREE.Shape();
  tailFinShape.moveTo(0, 0);
  tailFinShape.lineTo(0, 0.8);
  tailFinShape.lineTo(-0.5, 0.1);
  tailFinShape.lineTo(0, 0);
  const tailFin = new THREE.Mesh(
    new THREE.ExtrudeGeometry(tailFinShape, { depth: 0.04, bevelEnabled: false }),
    darkMat,
  );
  tailFin.position.set(-0.02, 0.1, 1.2);
  body.add(tailFin);

  /* Tail horizontal wings */
  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 0.4), darkMat);
  tailWing.position.set(0, 0, 1.2);
  body.add(tailWing);

  /* Engine glow */
  const glowMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 8),
    new THREE.MeshBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.85 }),
  );
  glowMesh.position.set(0, 0, 1.5);
  glowMesh.name = "glow";
  body.add(glowMesh);

  /* Engine exhaust cone */
  const exhaustGeo = new THREE.ConeGeometry(0.16, 1.0, 8);
  exhaustGeo.rotateX(-Math.PI / 2);
  const exhaust = new THREE.Mesh(
    exhaustGeo,
    new THREE.MeshBasicMaterial({ color: 0x0066ff, transparent: true, opacity: 0.35 }),
  );
  exhaust.position.set(0, 0, 2.1);
  exhaust.name = "exh";
  body.add(exhaust);

  body.scale.setScalar(0.85);
  group.add(body);
  group.position.set(0, C.PLANE_Y, 0);
  scene.add(group);

  return { group, body };
}

/** Animates engine glow and exhaust based on elapsed time. */
export function updateJetFX(body: THREE.Group, elapsed: number): void {
  const glow = body.getObjectByName("glow") as THREE.Mesh | undefined;
  if (glow) {
    glow.scale.setScalar(1 + Math.sin(elapsed * 8) * 0.3);
    (glow.material as THREE.MeshBasicMaterial).opacity =
      0.6 + Math.sin(elapsed * 6) * 0.25;
  }

  const exh = body.getObjectByName("exh") as THREE.Mesh | undefined;
  if (exh) {
    exh.scale.set(1, 1, 0.7 + Math.sin(elapsed * 12) * 0.4);
  }
}
