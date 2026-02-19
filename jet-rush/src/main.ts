import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { C, type GameState, type HapticType, type BlockRow, type Particle, type Collectible } from "./config";
import { AudioManager } from "./audio";
import { createJet, updateJetFX, loadShipFBX, type JetModel } from "./jet";
import { Shop } from "./shop";
import { buildGround, recycleGround, spawnRow, destroyRow, updateBlockAnimations } from "./world";
import { spawnExplosion, tickExplosion, spawnCollectBurst } from "./particles";
import { spawnCollectible, tickCollectibles, destroyCollectible } from "./collectibles";
import { getCorridorCenter } from "./world";
import { initInput, resetInput, type InputState } from "./input";
import { cacheUI, loadSettings, applySettingsUI, bindSettingsUI, showPlaying, showGameOver, updateStartOrbTotal, type UIElements } from "./ui";

class JetRush {
  /* Three.js core */
  private scene: THREE.Scene;
  private cam: THREE.PerspectiveCamera;
  private ren: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private fxaaPass: ShaderPass;

  /* Objects */
  private jet: JetModel;
  private groundTiles: THREE.Group[];
  private rows: BlockRow[] = [];
  private explParts: Particle[] = [];
  private trailPositions: THREE.Vector3[] = [];
  private trailMesh: THREE.Mesh | null = null;
  private readonly PLAY_TRAIL_MAX = 30;
  private collectibles: Collectible[] = [];
  private nextCollectZ = 0;

  /* State */
  private state: GameState = "START";
  private score = 0;
  private planeZ = 0;
  private planeX = 0;
  private targetX = 0;
  private tilt = 0;
  private speed = C.SPEED_INIT;
  private elapsed = 0;
  private lastT = 0;
  private nextRowZ = 0;
  private shake = 0;
  private trailTimer = 0;
  private runSeed = 42;
  private mobile: boolean;
  private orbsCollected = 0;
  private totalOrbs = 0;

  /* Invincibility */
  private invincible = false;
  private invincibleTimer = 0;
  private shieldMesh: THREE.Mesh | null = null;

  /* Systems */
  private input: InputState;
  private settings = loadSettings();
  private sfx = new AudioManager();
  private ui: UIElements;
  private shop: Shop;

  constructor() {
    console.log("[JetRush]", "Init");
    this.mobile = window.matchMedia("(pointer: coarse)").matches;

    /* Scene */
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020a18);
    this.scene.fog = new THREE.Fog(0x020a18, 80, 320);

    this.cam = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.5,
      500,
    );
    this.cam.position.set(0, C.CAM_UP, C.CAM_BACK);

    this.ren = new THREE.WebGLRenderer({ antialias: true });
    this.ren.setPixelRatio(Math.min(window.devicePixelRatio, 2.5));
    this.ren.setSize(window.innerWidth, window.innerHeight);
    this.ren.toneMapping = THREE.ACESFilmicToneMapping;
    this.ren.toneMappingExposure = 1.0;
    document.getElementById("gameContainer")!.appendChild(this.ren.domElement);

    /* Post-processing: Bloom */
    this.composer = new EffectComposer(this.ren);
    this.composer.addPass(new RenderPass(this.scene, this.cam));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      C.BLOOM_STRENGTH,
      C.BLOOM_RADIUS,
      C.BLOOM_THRESHOLD,
    );
    this.composer.addPass(this.bloomPass);
    this.fxaaPass = new ShaderPass(FXAAShader);
    this.fxaaPass.uniforms["resolution"].value.set(
      1 / (window.innerWidth * this.ren.getPixelRatio()),
      1 / (window.innerHeight * this.ren.getPixelRatio()),
    );
    this.composer.addPass(this.fxaaPass);
    this.composer.addPass(new OutputPass());

    this.initLights();

    /* Shop (needs to init before jet so we know which model to load) */
    this.shop = new Shop(
      () => this.totalOrbs,
      (n) => { this.totalOrbs = n; this.saveTotalOrbs(); updateStartOrbTotal(this.ui, this.totalOrbs); },
      (t) => this.hap(t),
      () => this.playFX("ui"),
      (modelPath) => loadShipFBX(this.jet.body, modelPath),
    );

    /* Build world */
    this.jet = createJet(this.scene, this.shop.getSelectedModelPath());
    this.groundTiles = buildGround(this.scene);
    this.spawnIdleBlocks();

    /* UI & Input */
    this.ui = cacheUI();
    this.totalOrbs = this.loadTotalOrbs();
    updateStartOrbTotal(this.ui, this.totalOrbs);

    this.input = initInput(
      () => this.state,
      () => this.startGame(),
      (t) => this.hap(t),
    );
    applySettingsUI(this.settings);
    bindSettingsUI(
      () => this.state,
      this.settings,
      this.sfx,
      (t) => this.hap(t),
      (k) => this.playFX(k),
    );

    window.addEventListener("resize", () => this.resize());
    this.ren.setAnimationLoop((t) => this.loop(t));
  }

  /* ═══ Lights ═══ */

  private initLights(): void {
    this.scene.add(new THREE.AmbientLight(0x334466, 0.9));

    const sun = new THREE.DirectionalLight(0x6688bb, 1.4);
    sun.position.set(8, 25, -15);
    this.scene.add(sun);

    const back = new THREE.DirectionalLight(0xff4466, 0.25);
    back.position.set(-5, 10, 20);
    this.scene.add(back);

    this.scene.add(new THREE.HemisphereLight(0x223344, 0x0a0a14, 0.6));
  }

  /* ═══ Resize ═══ */

  private resize(): void {
    this.cam.aspect = window.innerWidth / window.innerHeight;
    this.cam.updateProjectionMatrix();
    this.ren.setSize(window.innerWidth, window.innerHeight);
    this.composer.setSize(window.innerWidth, window.innerHeight);
    this.bloomPass.resolution.set(window.innerWidth, window.innerHeight);
    const pixelRatio = this.ren.getPixelRatio();
    this.fxaaPass.uniforms["resolution"].value.set(
      1 / (window.innerWidth * pixelRatio),
      1 / (window.innerHeight * pixelRatio),
    );
    this.mobile = window.matchMedia("(pointer: coarse)").matches;
  }

  /* ═══ Idle Blocks (start screen atmosphere) ═══ */

  private spawnIdleBlocks(): void {
    this.idleNextRowZ = 30;
    for (let z = 30; z > -200; z -= C.ROW_SPACING) {
      this.rows.push(spawnRow(this.scene, z, 42, false, 0, true));
    }
    this.idleNextRowZ = -200;
  }

  /* ═══ Start ═══ */

  private startGame(): void {
    if (this.shop.isOpen()) return;
    console.log("[startGame]", "New run");
    this.state = "PLAYING";
    this.score = 0;
    this.planeZ = 0;
    this.planeX = 0;
    this.targetX = 0;
    this.tilt = 0;
    this.speed = C.SPEED_INIT;
    this.elapsed = 0;
    this.lastT = 0;
    this.shake = 0;
    this.trailTimer = 0;
    this.runSeed = Math.floor(Math.random() * 100000);
    this.nextRowZ = -40;
    this.idleZ = 0;

    resetInput(this.input);
    this.cleanupIdleTrail();
    this.clearAll();

    this.jet.group.visible = true;
    this.jet.group.position.set(0, C.PLANE_Y, 0);
    this.jet.body.rotation.set(0, 0, 0);

    this.orbsCollected = 0;
    this.nextCollectZ = -30;

    /* Pre-spawn rows: safe zone near player, normal blocks ahead */
    this.nextRowZ = 15;
    while (this.nextRowZ > -C.ROW_AHEAD) {
      const safe = this.nextRowZ > -40;
      this.rows.push(
        spawnRow(this.scene, this.nextRowZ, this.runSeed, safe, this.score),
      );
      this.nextRowZ -= C.ROW_SPACING;
    }

    this.activateShield();

    showPlaying(this.ui);
    if (this.settings.music) this.sfx.musicOn();
    this.hap("light");
    this.playFX("ui");
  }

  private clearAll(): void {
    for (const row of this.rows) destroyRow(this.scene, row);
    this.rows = [];
    this.cleanupPlayTrail();
    this.deactivateShield();
    for (const p of this.explParts) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
    }
    this.explParts = [];
    for (const c of this.collectibles) destroyCollectible(this.scene, c);
    this.collectibles = [];
  }

  /* ═══ Game Over ═══ */

  private die(): void {
    console.log("[die]", "Score:", this.score, "Orbs:", this.orbsCollected);
    this.state = "GAME_OVER";

    this.totalOrbs += this.orbsCollected;
    this.saveTotalOrbs();

    showGameOver(this.ui, this.score, this.orbsCollected);
    spawnExplosion(
      this.scene,
      this.jet.group.position.x,
      this.jet.group.position.y,
      this.jet.group.position.z,
      this.explParts,
    );
    this.jet.group.visible = false;

    this.submitScore();
    this.playFX("crash");
    this.hap("error");
    this.sfx.musicOff();
  }

  /* ═══ Loop ═══ */

  private loop(t: number): void {
    if (this.lastT === 0) {
      this.lastT = t;
      return;
    }
    const dt = Math.min((t - this.lastT) / 1000, 0.05);
    this.lastT = t;
    this.elapsed += dt;

    updateBlockAnimations(this.rows, this.elapsed);

    if (this.state === "PLAYING") this.tick(dt);
    else if (this.state === "START") this.idle(dt);

    this.explParts = tickExplosion(this.scene, this.explParts, dt);

    this.updateCamera(dt);
    this.composer.render();
  }

  /* ═══ Camera ═══ */

  private updateCamera(dt: number): void {
    if (this.state === "START") return;

    if (this.state === "PLAYING" || this.state === "GAME_OVER") {
      const px = this.jet.group.position.x;
      const pz = this.jet.group.position.z;

      const tx = px;
      const tz = pz + C.CAM_BACK;

      this.cam.position.x += (tx - this.cam.position.x) * C.CAM_SMOOTH * dt;
      this.cam.position.y +=
        (C.CAM_UP - this.cam.position.y) * C.CAM_SMOOTH * dt;
      this.cam.position.z += (tz - this.cam.position.z) * C.CAM_SMOOTH * dt;

      if (this.shake > 0) {
        this.shake *= 0.87;
        if (this.shake < 0.01) this.shake = 0;
        this.cam.position.x += (Math.random() - 0.5) * this.shake * 0.7;
        this.cam.position.y += (Math.random() - 0.5) * this.shake * 0.4;
      }

      this.cam.lookAt(
        px,
        C.PLANE_Y - 0.5,
        pz - C.CAM_LOOK_AHEAD,
      );
    }
  }

  /* ═══ Idle (Start Screen) ═══ */

  private idleZ = 0;
  private idleNextRowZ = 0;
  private idleX = 0;
  private idleXTarget = 0;
  private idleWanderTimer = 0;
  private idleTrailTimer = 0;
  private idleTrailStrip: THREE.Mesh | null = null;
  private idleTrailPositions: THREE.Vector3[] = [];
  private readonly IDLE_TRAIL_MAX_POINTS = 120;

  private idle(dt: number): void {
    this.jet.group.visible = true;

    const idleSpeed = 28;
    this.idleZ -= idleSpeed * dt;
    this.idleWanderTimer -= dt;
    if (this.idleWanderTimer <= 0) {
      this.idleWanderTimer = 1.2 + Math.random() * 1.6;
      this.idleXTarget = (Math.random() * 2 - 1) * 8.5;
    }
    const blend = 1 - Math.pow(0.001, dt);
    this.idleX += (this.idleXTarget - this.idleX) * blend;

    this.jet.group.position.x = this.idleX;
    this.jet.group.position.y = C.PLANE_Y;
    this.jet.group.position.z = this.idleZ;
    const idleBank = THREE.MathUtils.clamp((this.idleXTarget - this.idleX) * -0.09, -0.35, 0.35);
    this.jet.body.rotation.z += (idleBank - this.jet.body.rotation.z) * Math.min(1, dt * 5);
    this.jet.body.rotation.x = 0;

    updateJetFX(this.jet.body, this.elapsed);

    this.updateIdleTrail(dt);

    recycleGround(this.groundTiles, this.idleZ);

    while (this.idleNextRowZ > this.idleZ - C.ROW_AHEAD) {
      this.rows.push(spawnRow(this.scene, this.idleNextRowZ, 42, false, 0, true));
      this.idleNextRowZ -= C.ROW_SPACING;
    }

    const behind = this.idleZ + C.ROW_BEHIND;
    this.rows = this.rows.filter((row) => {
      if (row.z > behind) {
        destroyRow(this.scene, row);
        return false;
      }
      return true;
    });

    const camHeight = 55;
    const camLookAhead = 25;
    this.cam.position.set(0, camHeight, this.idleZ + 12);
    this.cam.lookAt(0, C.PLANE_Y, this.idleZ - camLookAhead);
  }

  private updateIdleTrail(dt: number): void {
    this.idleTrailTimer += dt;
    if (this.idleTrailTimer > 0.016) {
      this.idleTrailTimer = 0;
      this.idleTrailPositions.push(this.jet.group.position.clone());
      if (this.idleTrailPositions.length > this.IDLE_TRAIL_MAX_POINTS) {
        this.idleTrailPositions.shift();
      }
    }

    if (this.idleTrailPositions.length < 2) return;

    if (this.idleTrailStrip) {
      this.scene.remove(this.idleTrailStrip);
      this.idleTrailStrip.geometry.dispose();
    }

    const pts = this.idleTrailPositions;
    const count = pts.length;
    const verts: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const width = (0.3 + t * 1.8) * 0.3;
      const p = pts[i];

      verts.push(p.x - width, p.y, p.z);
      verts.push(p.x + width, p.y, p.z);

      const alpha = t * t;
      const r = 0.0 + t * 0.0;
      const g = 0.6 + t * 0.2;
      const b = 1.0;
      colors.push(r, g, b, alpha * 0.6);
      colors.push(r, g, b, alpha * 0.6);

      if (i < count - 1) {
        const bi = i * 2;
        indices.push(bi, bi + 1, bi + 2);
        indices.push(bi + 1, bi + 3, bi + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
    geo.setIndex(indices);

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.idleTrailStrip = new THREE.Mesh(geo, mat);
    this.scene.add(this.idleTrailStrip);
  }

  private cleanupIdleTrail(): void {
    if (this.idleTrailStrip) {
      this.scene.remove(this.idleTrailStrip);
      this.idleTrailStrip.geometry.dispose();
      this.idleTrailStrip = null;
    }
    this.idleTrailPositions = [];
  }

  /* ═══ Gameplay Ribbon Trail ═══ */

  private updatePlayTrail(): void {
    if (this.trailPositions.length < 2) return;

    if (this.trailMesh) {
      this.scene.remove(this.trailMesh);
      this.trailMesh.geometry.dispose();
    }

    const pts = this.trailPositions;
    const count = pts.length;
    const verts: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];

    const trailYOffset = -0.5;
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      const width = t * 0.2;
      const p = pts[i];
      const y = p.y + trailYOffset;

      verts.push(p.x - width, y, p.z);
      verts.push(p.x + width, y, p.z);

      const alpha = t * t;
      const r = 0.0;
      const g = 0.55 + t * 0.25;
      const b = 1.0;
      colors.push(r, g, b, alpha * 0.55);
      colors.push(r, g, b, alpha * 0.55);

      if (i < count - 1) {
        const bi = i * 2;
        indices.push(bi, bi + 1, bi + 2);
        indices.push(bi + 1, bi + 3, bi + 2);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 4));
    geo.setIndex(indices);

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.trailMesh = new THREE.Mesh(geo, mat);
    this.scene.add(this.trailMesh);
  }

  private cleanupPlayTrail(): void {
    if (this.trailMesh) {
      this.scene.remove(this.trailMesh);
      this.trailMesh.geometry.dispose();
      this.trailMesh = null;
    }
    this.trailPositions = [];
  }

  /* ═══ Game Tick ═══ */

  private tick(dt: number): void {
    /* Speed ramp */
    this.speed = Math.min(
      C.SPEED_MAX,
      C.SPEED_INIT + (Math.abs(this.planeZ) * C.SPEED_RAMP) / 100,
    );

    const dz = this.speed * dt;
    this.planeZ -= dz;
    this.score = Math.floor(Math.abs(this.planeZ) / 3);

    /* Lateral movement from input */
    let mx = 0;
    if (this.input.left) mx -= 1;
    if (this.input.right) mx += 1;

    this.targetX += mx * C.LATERAL_SPEED * dt;
    this.targetX = THREE.MathUtils.clamp(
      this.targetX,
      -C.BOUNDARY_X,
      C.BOUNDARY_X,
    );

    const lf = 1 - Math.pow(0.0005, dt);
    this.planeX += (this.targetX - this.planeX) * lf;

    this.jet.group.position.set(this.planeX, C.PLANE_Y, this.planeZ);

    /* Bank tilt */
    const tt = -mx * 0.45;
    this.tilt += (tt - this.tilt) * 5 * dt;
    this.jet.body.rotation.z = this.tilt;

    /* Engine FX */
    updateJetFX(this.jet.body, this.elapsed);

    /* Trail */
    this.trailTimer += dt;
    if (this.trailTimer > 0.016) {
      this.trailTimer = 0;
      this.trailPositions.push(this.jet.group.position.clone());
      if (this.trailPositions.length > this.PLAY_TRAIL_MAX) {
        this.trailPositions.shift();
      }
    }
    this.updatePlayTrail();

    /* Recycle ground */
    recycleGround(this.groundTiles, this.planeZ);

    /* Spawn rows ahead */
    while (this.nextRowZ > this.planeZ - C.ROW_AHEAD) {
      this.rows.push(
        spawnRow(this.scene, this.nextRowZ, this.runSeed, false, this.score),
      );
      this.nextRowZ -= C.ROW_SPACING;
    }

    /* Cleanup rows behind */
    const behind = this.planeZ + C.ROW_BEHIND;
    this.rows = this.rows.filter((row) => {
      if (row.z > behind) {
        destroyRow(this.scene, row);
        return false;
      }
      return true;
    });

    /* Spawn collectibles ahead */
    while (this.nextCollectZ > this.planeZ - C.ROW_AHEAD) {
      const rng = () => Math.random();
      if (rng() < C.COLLECT_SPAWN_CHANCE) {
        const cx = getCorridorCenter(this.nextCollectZ, this.runSeed);
        this.collectibles.push(
          spawnCollectible(this.scene, this.nextCollectZ, cx, rng),
        );
      }
      this.nextCollectZ -= C.COLLECT_SPAWN_INTERVAL;
    }

    /* Tick collectibles — attract & collect */
    const picked = tickCollectibles(
      this.collectibles,
      this.planeX,
      C.PLANE_Y,
      this.planeZ,
      dt,
      this.elapsed,
    );
    if (picked > 0) {
      this.orbsCollected += picked;
      this.score += picked * C.COLLECT_SCORE_BONUS;
      this.ui.orbDisplay.textContent = String(this.orbsCollected);
      this.hap("medium");
      this.playFX("collect");
    }

    /* Remove collected & far-behind (only if not attracting) */
    const collectBehind = this.planeZ + C.ROW_BEHIND;
    this.collectibles = this.collectibles.filter((c) => {
      if (c.collected) {
        spawnCollectBurst(
          this.scene,
          c.mesh.position.x,
          c.mesh.position.y,
          c.mesh.position.z,
          this.explParts,
        );
        destroyCollectible(this.scene, c);
        return false;
      }
      if (!c.attracting && c.worldZ > collectBehind) {
        destroyCollectible(this.scene, c);
        return false;
      }
      return true;
    });

    /* Invincibility countdown & shield animation */
    if (this.invincible) {
      this.invincibleTimer -= dt;
      if (this.invincibleTimer <= 0) {
        this.deactivateShield();
      } else if (this.shieldMesh) {
        this.shieldMesh.rotation.y += dt * 0.5;
        this.shieldMesh.rotation.x += dt * 0.3;
        const mat = this.shieldMesh.material as THREE.MeshBasicMaterial;
        const pulse = 0.45 + Math.sin(this.elapsed * 4) * 0.15;
        if (this.invincibleTimer < 2) {
          const blink = Math.sin(this.elapsed * 14) > 0 ? 1.0 : 0.15;
          mat.opacity = pulse * blink;
        } else {
          mat.opacity = pulse;
        }
      }
    }

    /* Collision detection */
    if (this.checkCollisions()) return;

    this.ui.scoreTxt.textContent = String(this.score);
  }

  /* ═══ Collision ═══ */

  private checkCollisions(): boolean {
    if (this.invincible) return false;

    for (const row of this.rows) {
      if (Math.abs(row.z - this.planeZ) > 5) continue;

      for (const b of row.blocks) {
        const halfD = b.depth / 2;
        if (this.planeZ > b.worldZ + halfD + C.PLANE_HIT_R) continue;
        if (this.planeZ < b.worldZ - halfD - C.PLANE_HIT_R) continue;

        const halfW = b.width / 2;
        if (this.planeX > b.worldX + halfW + C.PLANE_HIT_HALF_W) continue;
        if (this.planeX < b.worldX - halfW - C.PLANE_HIT_HALF_W) continue;

        if (b.currentTop < C.PLANE_Y - C.PLANE_HIT_R) continue;

        this.shake = 1.5;
        this.die();
        return true;
      }
    }
    return false;
  }

  /* ═══ Invincibility Shield ═══ */

  private createShieldMesh(): THREE.Mesh {
    const geo = new THREE.IcosahedronGeometry(C.SHIELD_RADIUS, 2);
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0, 1.8, 3.0),
      wireframe: true,
      transparent: true,
      opacity: 0.5,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = "shield";
    return mesh;
  }

  private activateShield(): void {
    this.invincible = true;
    this.invincibleTimer = 5;

    if (!this.shieldMesh) {
      this.shieldMesh = this.createShieldMesh();
    }
    this.shieldMesh.visible = true;
    this.shieldMesh.rotation.set(0, 0, 0);
    (this.shieldMesh.material as THREE.MeshBasicMaterial).opacity = 0.5;

    if (!this.jet.group.children.includes(this.shieldMesh)) {
      this.jet.group.add(this.shieldMesh);
    }
  }

  private deactivateShield(): void {
    this.invincible = false;
    this.invincibleTimer = 0;
    if (this.shieldMesh) {
      this.shieldMesh.visible = false;
    }
  }

  /* ═══ Helpers ═══ */

  private hap(type: HapticType): void {
    if (this.settings.haptics && typeof window.triggerHaptic === "function") {
      window.triggerHaptic(type);
    }
  }

  private playFX(kind: "ui" | "crash" | "collect"): void {
    if (!this.settings.fx) return;
    if (kind === "ui") this.sfx.ui();
    else if (kind === "crash") this.sfx.crash();
    else if (kind === "collect") this.sfx.collect();
  }

  private submitScore(): void {
    const s = Math.max(0, this.score);
    console.log("[submitScore]", s);
    if (typeof window.submitScore === "function") window.submitScore(s);
  }

  private loadTotalOrbs(): number {
    try {
      return parseInt(localStorage.getItem("jetRush_orbs") || "0", 10) || 0;
    } catch {
      return 0;
    }
  }

  private saveTotalOrbs(): void {
    try {
      localStorage.setItem("jetRush_orbs", String(this.totalOrbs));
    } catch {
      console.log("[saveTotalOrbs]", "localStorage unavailable");
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new JetRush();
});
