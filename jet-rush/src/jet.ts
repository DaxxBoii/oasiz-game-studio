import * as THREE from "three";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import { C } from "./config";

export interface JetModel {
  group: THREE.Group;
  body: THREE.Group;
}

/** Builds the jet plane model and returns the outer group + inner body group. */
export function createJet(scene: THREE.Scene): JetModel {
  const group = new THREE.Group();
  const body = new THREE.Group();

  /* Create placeholder geometry while FBX loads */
  const placeholderMat = new THREE.MeshStandardMaterial({
    color: 0x2288ff, roughness: 0.3, metalness: 0.7,
    emissive: 0x1155cc, emissiveIntensity: 0.25,
    transparent: true, opacity: 0,
  });
  const placeholder = new THREE.Mesh(
    new THREE.BoxGeometry(0.1, 0.1, 0.1),
    placeholderMat,
  );
  placeholder.name = "placeholder";
  body.add(placeholder);

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

  /* Load textures */
  const textureLoader = new THREE.TextureLoader();
  const baseTexture = textureLoader.load("assets/textures/PolygonSciFiSpace_Texture_01_A.png");
  const emissiveTexture = textureLoader.load("assets/textures/PolygonSciFiSpace_Emissive_01.png");

  /* Configure texture settings */
  baseTexture.colorSpace = THREE.SRGBColorSpace;
  baseTexture.flipY = false;
  emissiveTexture.flipY = false;

  /* Load FBX model */
  const loader = new FBXLoader();
  loader.load(
    "assets/models/SM_Ship_Fighter_01.fbx",
    (fbx) => {
      console.log("[createJet] FBX loaded");

      /* Apply textured material to all meshes */
      const shipMat = new THREE.MeshStandardMaterial({
        map: baseTexture,
        emissiveMap: emissiveTexture,
        emissive: 0xffffff,
        emissiveIntensity: 2.0,
        roughness: 0.4,
        metalness: 0.6,
      });

      fbx.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          (child as THREE.Mesh).material = shipMat;
        }
      });

      /* Scale and orient the model */
      fbx.scale.setScalar(C.PLANE_SCALE);
      fbx.rotation.set(0, Math.PI, 0);
      fbx.position.set(0, -0.3, 0);
      fbx.name = "shipModel";

      /* Remove placeholder and add FBX */
      const ph = body.getObjectByName("placeholder");
      if (ph) body.remove(ph);
      body.add(fbx);

      /* Reposition glow and exhaust for new model */
      const glow = body.getObjectByName("glow") as THREE.Mesh;
      if (glow) glow.position.set(0, 0, 1.8);

      const exh = body.getObjectByName("exh") as THREE.Mesh;
      if (exh) exh.position.set(0, 0, 2.3);
    },
    undefined,
    (err) => {
      console.error("[createJet] FBX load error:", err);
    },
  );

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
