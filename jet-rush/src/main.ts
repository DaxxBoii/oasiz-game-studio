import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { FXAAShader } from "three/examples/jsm/shaders/FXAAShader.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { C, type GameState, type HapticType, type BlockRow, type Particle } from "./config";
import { AudioManager } from "./audio";
import { createJet, updateJetFX, type JetModel } from "./jet";
import { buildGround, recycleGround, spawnRow, destroyRow, updateBlockAnimations } from "./world";
import { emitTrail, tickTrail, spawnExplosion, tickExplosion } from "./particles";
import { initInput, resetInput, type InputState } from "./input";
import { cacheUI, loadSettings, applySettingsUI, bindSettingsUI, showPlaying, showGameOver, type UIElements } from "./ui";

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
  private trail: Particle[] = [];
  private explParts: Particle[] = [];

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
  private trailT = 0;
  private runSeed = 42;
  private mobile: boolean;

  /* Systems */
  private input: InputState;
  private settings = loadSettings();
  private sfx = new AudioManager();
  private ui: UIElements;

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

    /* Build world */
    this.jet = createJet(this.scene);
    this.groundTiles = buildGround(this.scene);
    this.spawnIdleBlocks();

    /* UI & Input */
    this.ui = cacheUI();
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
    for (let z = 30; z > -200; z -= C.ROW_SPACING) {
      this.rows.push(spawnRow(this.scene, z, 42));
    }
  }

  /* ═══ Start ═══ */

  private startGame(): void {
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
    this.trailT = 0;
    this.runSeed = Math.floor(Math.random() * 100000);
    this.nextRowZ = -40;

    resetInput(this.input);
    this.clearAll();

    this.jet.group.visible = true;
    this.jet.group.position.set(0, C.PLANE_Y, 0);
    this.jet.body.rotation.set(0, 0, 0);

    /* Pre-spawn rows: safe zone near player, normal blocks ahead */
    this.nextRowZ = 15;
    while (this.nextRowZ > -C.ROW_AHEAD) {
      const safe = this.nextRowZ > -40;
      this.rows.push(spawnRow(this.scene, this.nextRowZ, this.runSeed, safe));
      this.nextRowZ -= C.ROW_SPACING;
    }

    showPlaying(this.ui, this.mobile);
    if (this.settings.music) this.sfx.musicOn();
    this.hap("light");
    this.playFX("ui");
  }

  private clearAll(): void {
    for (const row of this.rows) destroyRow(this.scene, row);
    this.rows = [];
    for (const p of this.trail) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
    }
    this.trail = [];
    for (const p of this.explParts) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
    }
    this.explParts = [];
  }

  /* ═══ Game Over ═══ */

  private die(): void {
    console.log("[die]", "Score:", this.score);
    this.state = "GAME_OVER";

    showGameOver(this.ui, this.score);
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

    this.trail = tickTrail(this.scene, this.trail, dt);
    this.explParts = tickExplosion(this.scene, this.explParts, dt);

    this.updateCamera(dt);
    this.composer.render();
  }

  /* ═══ Camera ═══ */

  private updateCamera(dt: number): void {
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

  private idle(_dt: number): void {
    this.jet.group.visible = true;
    this.jet.group.position.x = Math.sin(this.elapsed * 0.6) * 3;
    this.jet.group.position.y = C.PLANE_Y;
    this.jet.group.position.z = 0;
    this.jet.body.rotation.z = -Math.sin(this.elapsed * 0.6) * 0.2;

    const glow = this.jet.body.getObjectByName("glow") as THREE.Mesh;
    if (glow) glow.scale.setScalar(1 + Math.sin(this.elapsed * 4) * 0.2);

    this.cam.position.set(0, C.CAM_UP, C.CAM_BACK);
    this.cam.lookAt(0, C.PLANE_Y - 0.5, -C.CAM_LOOK_AHEAD);
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

    if (this.input.touchId !== null && this.mobile) {
      const drag =
        (this.input.touchXNow - this.input.touchX0) /
        (window.innerWidth * 0.1);
      mx += THREE.MathUtils.clamp(drag, -1.5, 1.5);
    }

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
    this.trailT += dt;
    if (this.trailT > 1 / C.TRAIL_RATE) {
      this.trailT = 0;
      emitTrail(this.scene, this.jet.group.position, this.trail);
    }

    /* Recycle ground */
    recycleGround(this.groundTiles, this.planeZ);

    /* Spawn rows ahead */
    while (this.nextRowZ > this.planeZ - C.ROW_AHEAD) {
      this.rows.push(spawnRow(this.scene, this.nextRowZ, this.runSeed));
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

    /* Collision detection */
    if (this.checkCollisions()) return;

    this.ui.scoreTxt.textContent = String(this.score);
  }

  /* ═══ Collision ═══ */

  private checkCollisions(): boolean {
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

  /* ═══ Helpers ═══ */

  private hap(type: HapticType): void {
    if (this.settings.haptics && typeof window.triggerHaptic === "function") {
      window.triggerHaptic(type);
    }
  }

  private playFX(kind: "ui" | "crash"): void {
    if (!this.settings.fx) return;
    if (kind === "ui") this.sfx.ui();
    else this.sfx.crash();
  }

  private submitScore(): void {
    const s = Math.max(0, this.score);
    console.log("[submitScore]", s);
    if (typeof window.submitScore === "function") window.submitScore(s);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new JetRush();
});
