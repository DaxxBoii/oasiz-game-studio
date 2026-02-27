import * as THREE from "three";
import {
  BOARD_CELL_PIXELS,
  BOT_COUNT,
  BOT_IDLE_MAX,
  BOT_IDLE_MIN,
  BOT_INIT_SIZE,
  BOT_MAX_TRAIL,
  BOT_NAMES,
  BOT_RESPAWN_TIME,
  BOT_VENTURE_MAX,
  BOT_VENTURE_MIN,
  CAMERA_LERP,
  CCW,
  COLORS,
  CW,
  DIR_DX,
  DIR_DY,
  GRID_H,
  GRID_W,
  MOVE_SPEED,
  OPPOSITE,
  PLAYER_INIT_SIZE,
  TOTAL_CELLS,
} from "./constants";
import { AudioSystem } from "./systems/AudioSystem";
import { RuntimeBridge } from "./systems/RuntimeBridge";
import { loadSettings as loadSettingsFromStorage, saveSettings as saveSettingsToStorage } from "./systems/SettingsStorage";
import { UISystem } from "./systems/UISystem";
import type { Cell, Dir, Entity, HapticType, PersistentState, Phase, Settings, SfxName } from "./types";
import { clamp, dirToYaw, inBounds, idx, lerp, randFloat, randInt } from "./utils";

export class PaperIO3D {
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cameraLookAt = new THREE.Vector3();
  private tempVec = new THREE.Vector3();

  private width = 0;
  private height = 0;
  private dpr = 1;
  private isMobile = false;

  private phase: Phase = "start";
  private lastTime = 0;

  private grid = new Uint8Array(TOTAL_CELLS);
  private trailGrid = new Uint8Array(TOTAL_CELLS);
  private cellShade = new Float32Array(TOTAL_CELLS);
  private boardDirty = true;

  private boardCanvas: HTMLCanvasElement;
  private boardCtx: CanvasRenderingContext2D;
  private boardTexture: THREE.CanvasTexture;
  private boardMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;

  private player!: Entity;
  private bots: Entity[] = [];
  private entityMeshes = new Map<number, THREE.Group>();

  private score = 0;
  private displayScore = 0;
  private playerMoving = false;

  private settings: Settings = { music: true, fx: true, haptics: true };
  private persistentState: PersistentState = {};
  private readonly runtimeBridge = new RuntimeBridge();
  private readonly audioSystem: AudioSystem;
  private readonly uiSystem: UISystem;

  private touchPointerId: number | null = null;
  private hasCursor = false;
  private cursorClientX = 0;
  private cursorClientY = 0;
  private playerWorldX = 0;
  private playerWorldY = 0;
  private playerFacingX = 0;
  private playerFacingY = 1;
  private playerFacingYaw = 0;
  private readonly pointerNdc = new THREE.Vector2();
  private readonly raycaster = new THREE.Raycaster();
  private readonly boardPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private readonly rayHit = new THREE.Vector3();

  constructor() {
    console.log("[PaperIO3D.constructor]", "Initializing Three.js Paper.io");

    this.canvas = this.getElement<HTMLCanvasElement>("game");
    this.settings = loadSettingsFromStorage();
    this.audioSystem = new AudioSystem(() => this.settings);
    this.uiSystem = new UISystem(this.settings);

    this.boardCanvas = document.createElement("canvas");
    this.boardCanvas.width = GRID_W * BOARD_CELL_PIXELS;
    this.boardCanvas.height = GRID_H * BOARD_CELL_PIXELS;
    const context = this.boardCanvas.getContext("2d");
    if (!context) {
      throw new Error("Could not create board texture context");
    }
    this.boardCtx = context;
    this.boardCtx.imageSmoothingEnabled = true;
    this.boardTexture = new THREE.CanvasTexture(this.boardCanvas);
    this.boardTexture.colorSpace = THREE.SRGBColorSpace;
    this.boardTexture.magFilter = THREE.LinearFilter;
    this.boardTexture.minFilter = THREE.LinearFilter;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#cfeae7");
    this.scene.fog = new THREE.Fog("#cfeae7", 80, 190);
    this.camera = new THREE.PerspectiveCamera(56, 1, 0.1, 300);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.03;

    const boardMaterial = new THREE.MeshStandardMaterial({
      map: this.boardTexture,
      roughness: 0.94,
      metalness: 0.02,
    });
    this.boardMesh = new THREE.Mesh(new THREE.PlaneGeometry(GRID_W, GRID_H), boardMaterial);
    this.boardMesh.rotation.x = -Math.PI / 2;
    this.boardMesh.position.y = 0;
    this.boardMesh.receiveShadow = true;
    this.scene.add(this.boardMesh);

    this.setupWorld();
    this.seedCellShade();
    this.loadPersistentState();
    this.setupUI();
    this.setupInput();
    this.populatePreviewBoard();
    this.applyPhaseUI();
    this.handleResize();

    window.addEventListener("resize", () => this.handleResize());
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  private getElement<T extends HTMLElement>(id: string): T {
    const el = document.getElementById(id);
    if (!el) {
      throw new Error("Missing required element #" + id);
    }
    return el as T;
  }

  private setupWorld(): void {
    const hemi = new THREE.HemisphereLight("#ffffff", "#bfe3dd", 1.02);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight("#fffef4", 0.72);
    sun.position.set(18, 28, 14);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 90;
    sun.shadow.camera.left = -45;
    sun.shadow.camera.right = 45;
    sun.shadow.camera.top = 45;
    sun.shadow.camera.bottom = -45;
    this.scene.add(sun);

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(GRID_W + 2.6, 1.2, GRID_H + 2.6),
      new THREE.MeshStandardMaterial({
        color: "#b4d8d2",
        roughness: 0.96,
        metalness: 0.01,
      })
    );
    frame.position.set(0, -0.72, 0);
    frame.receiveShadow = true;
    this.scene.add(frame);

    const underPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(60, 70, 2.4, 48),
      new THREE.MeshStandardMaterial({
        color: "#c5e3de",
        roughness: 0.98,
        metalness: 0,
      })
    );
    underPlate.position.set(0, -2, 0);
    underPlate.receiveShadow = true;
    this.scene.add(underPlate);

    const glowMaterial = new THREE.MeshBasicMaterial({
      color: "#d8efea",
      transparent: true,
      opacity: 0.4,
    });
    const glowRing = new THREE.Mesh(new THREE.RingGeometry(45, 54, 64), glowMaterial);
    glowRing.rotation.x = -Math.PI / 2;
    glowRing.position.y = -1.2;
    this.scene.add(glowRing);
  }

  private seedCellShade(): void {
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const value = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const fract = value - Math.floor(value);
        this.cellShade[idx(x, y)] = (fract - 0.5) * 0.12;
      }
    }
  }

  private setupUI(): void {
    this.uiSystem.bindHandlers({
      onStartPressed: () => {
        if (this.phase === "start") {
          this.startGame();
        }
      },
      onRestartPressed: () => {
        if (this.phase === "over") {
          this.goToStart();
        }
      },
      onSettingsOpened: () => {},
      onSettingsClosed: () => {},
      onMusicToggle: (enabled) => {
        this.settings.music = enabled;
        this.saveSettings();
        if (this.settings.music && this.phase === "playing") {
          this.audioSystem.startBgMusic();
        } else {
          this.audioSystem.stopBgMusic();
        }
      },
      onFxToggle: (enabled) => {
        this.settings.fx = enabled;
        this.saveSettings();
      },
      onHapticsToggle: (enabled) => {
        this.settings.haptics = enabled;
        this.saveSettings();
      },
      onUiTap: () => {
        this.triggerHaptic("light");
        this.playSfx("tap");
      },
    });
  }

  private setupInput(): void {
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    this.canvas.addEventListener("pointerdown", (e) => this.onPointerDown(e));
    this.canvas.addEventListener("pointermove", (e) => this.onPointerMove(e));
    this.canvas.addEventListener("pointerup", (e) => this.onPointerUp(e));
    this.canvas.addEventListener("pointerleave", (e) => this.onPointerLeave(e));
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === "Escape" && this.uiSystem.isSettingsOpen()) {
      this.uiSystem.closeSettings();
      return;
    }

    if (this.uiSystem.isSettingsOpen()) return;

    if (this.phase === "start") {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        this.startGame();
      }
      return;
    }

    if (this.phase === "over") {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        this.goToStart();
      }
      return;
    }

    // Movement is pointer-driven in any direction.
  }

  private onPointerDown(e: PointerEvent): void {
    if (this.uiSystem.isSettingsOpen()) return;

    if (this.phase === "start") {
      this.startGame();
      return;
    }

    if (this.phase === "over") {
      this.goToStart();
      return;
    }

    if (this.isMobile) {
      this.touchPointerId = e.pointerId;
    }

    this.cursorClientX = e.clientX;
    this.cursorClientY = e.clientY;
    this.hasCursor = true;
    this.startPlayerMovement();
  }

  private onPointerMove(e: PointerEvent): void {
    if (this.uiSystem.isSettingsOpen()) return;
    if (this.phase !== "playing") return;

    if (this.isMobile) {
      if (this.touchPointerId === null || e.pointerId !== this.touchPointerId) return;
    }

    this.cursorClientX = e.clientX;
    this.cursorClientY = e.clientY;
    this.hasCursor = true;
    this.startPlayerMovement();
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.isMobile) return;
    if (this.touchPointerId === null || e.pointerId !== this.touchPointerId) return;
    this.touchPointerId = null;
    this.hasCursor = false;
  }

  private onPointerLeave(e: PointerEvent): void {
    if (this.isMobile) {
      if (this.touchPointerId !== null && e.pointerId === this.touchPointerId) {
        this.touchPointerId = null;
        this.hasCursor = false;
      }
      return;
    }

    this.touchPointerId = null;
    this.hasCursor = false;
  }

  private startPlayerMovement(): void {
    if (!this.player || !this.player.alive || !this.hasCursor) return;

    const target = this.screenPointToBoardPoint(this.cursorClientX, this.cursorClientY);
    if (!target) return;

    this.updatePlayerFacing(target.x, target.y);
    if (this.playerMoving) return;
    this.playerMoving = true;
    this.playSfx("tap");
    this.triggerHaptic("light");
  }

  private updatePlayerFacing(targetX: number, targetY: number): void {
    const dx = targetX - this.playerWorldX;
    const dy = targetY - this.playerWorldY;
    const length = Math.hypot(dx, dy);
    if (length < 0.0001) return;
    this.playerFacingX = dx / length;
    this.playerFacingY = dy / length;
    this.playerFacingYaw = Math.atan2(this.playerFacingX, this.playerFacingY);
  }

  private screenPointToBoardPoint(clientX: number, clientY: number): Cell | null {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;

    this.pointerNdc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointerNdc, this.camera);

    if (!this.raycaster.ray.intersectPlane(this.boardPlane, this.rayHit)) return null;

    const edgePadding = 0.001;
    const x = clamp(this.rayHit.x + GRID_W / 2, edgePadding, GRID_W - edgePadding);
    const y = clamp(this.rayHit.z + GRID_H / 2, edgePadding, GRID_H - edgePadding);
    return { x, y };
  }

  private saveSettings(): void {
    saveSettingsToStorage(this.settings);
    this.uiSystem.setSettings(this.settings);
  }

  private loadPersistentState(): void {
    this.persistentState = this.runtimeBridge.loadPersistentState();
  }

  private savePersistentState(): void {
    this.runtimeBridge.savePersistentState(this.persistentState);
  }

  private applyPhaseUI(): void {
    this.uiSystem.setPhase(this.phase);
  }

  private populatePreviewBoard(): void {
    this.grid.fill(0);
    this.trailGrid.fill(0);

    this.spawnTerritory(Math.floor(GRID_W * 0.25), Math.floor(GRID_H * 0.3), 1, 11);
    this.spawnTerritory(Math.floor(GRID_W * 0.74), Math.floor(GRID_H * 0.27), 2, 10);
    this.spawnTerritory(Math.floor(GRID_W * 0.32), Math.floor(GRID_H * 0.74), 3, 11);
    this.spawnTerritory(Math.floor(GRID_W * 0.72), Math.floor(GRID_H * 0.72), 4, 10);
    this.boardDirty = true;
    this.rebuildBoardTexture();
  }

  private startGame(): void {
    console.log("[PaperIO3D.startGame]", "Starting new match");
    this.phase = "playing";
    this.playerMoving = false;
    this.score = 0;
    this.displayScore = 0;
    this.lastTime = performance.now();
    this.uiSystem.closeSettings();

    this.grid.fill(0);
    this.trailGrid.fill(0);
    this.removeEntityMeshes();
    this.hasCursor = false;
    this.touchPointerId = null;

    const playerX = Math.floor(GRID_W * 0.5);
    const playerY = Math.floor(GRID_H * 0.5);
    this.player = this.createEntity(playerX, playerY, 1, "You", true);
    this.playerWorldX = playerX + 0.5;
    this.playerWorldY = playerY + 0.5;
    this.playerFacingX = 0;
    this.playerFacingY = 1;
    this.playerFacingYaw = 0;
    this.spawnTerritory(playerX, playerY, 1, PLAYER_INIT_SIZE);
    this.createEntityMesh(this.player);

    const botSpawns: Cell[] = [
      { x: Math.floor(GRID_W * 0.2), y: Math.floor(GRID_H * 0.24) },
      { x: Math.floor(GRID_W * 0.78), y: Math.floor(GRID_H * 0.23) },
      { x: Math.floor(GRID_W * 0.5), y: Math.floor(GRID_H * 0.8) },
    ];

    this.bots = [];
    for (let i = 0; i < BOT_COUNT; i++) {
      const spawn = botSpawns[i];
      const bot = this.createEntity(spawn.x, spawn.y, i + 2, BOT_NAMES[i], false);
      bot.dir = randInt(0, 3) as Dir;
      bot.nextDir = bot.dir;
      this.bots.push(bot);
      this.spawnTerritory(spawn.x, spawn.y, i + 2, BOT_INIT_SIZE);
      this.createEntityMesh(bot);
    }

    this.incrementSessions();
    this.updateScore();
    this.boardDirty = true;
    this.rebuildBoardTexture();
    this.applyPhaseUI();
    this.updateHudText();

    if (this.settings.music) {
      this.audioSystem.startBgMusic();
    }
    this.playSfx("start");
    this.triggerHaptic("light");
  }

  private goToStart(): void {
    console.log("[PaperIO3D.goToStart]", "Switching to start screen");
    this.phase = "start";
    this.playerMoving = false;
    this.score = 0;
    this.displayScore = 0;
    this.hasCursor = false;
    this.touchPointerId = null;
    this.removeEntityMeshes();
    this.bots = [];
    this.audioSystem.stopBgMusic();
    this.populatePreviewBoard();
    this.applyPhaseUI();
    this.updateHudText();
  }

  private gameOver(): void {
    if (this.phase !== "playing") return;
    this.phase = "over";
    this.player.alive = false;
    this.hasCursor = false;
    this.touchPointerId = null;
    this.audioSystem.stopBgMusic();
    this.playSfx("death");
    this.triggerHaptic("error");
    this.submitFinalScore();
    this.uiSystem.setFinalScore(Math.max(0, Math.round(this.score)) + "%");
    this.applyPhaseUI();
    console.log("[PaperIO3D.gameOver]", "Run ended at " + this.score.toFixed(1) + "%");
  }

  private submitFinalScore(): void {
    const finalScore = Math.max(0, Math.round(this.score));
    console.log("[PaperIO3D.submitFinalScore]", "Submitting score " + finalScore);
    this.runtimeBridge.submitScore(finalScore);
  }

  private incrementSessions(): void {
    const current = typeof this.persistentState.sessions === "number" ? this.persistentState.sessions : 0;
    this.persistentState.sessions = current + 1;
    this.savePersistentState();
  }

  private createEntity(
    x: number,
    y: number,
    ownerIdx: number,
    name: string,
    isPlayer: boolean
  ): Entity {
    return {
      cellX: x,
      cellY: y,
      dir: 1,
      nextDir: 1,
      moveProgress: 0,
      trail: [],
      alive: true,
      ownerIdx,
      name,
      isPlayer,
      homeX: x,
      homeY: y,
      aiState: "idle",
      aiTimer: randFloat(BOT_IDLE_MIN, BOT_IDLE_MAX),
      ventureSteps: 0,
      respawnTimer: BOT_RESPAWN_TIME,
    };
  }

  private removeEntityMeshes(): void {
    for (const mesh of this.entityMeshes.values()) {
      this.scene.remove(mesh);
    }
    this.entityMeshes.clear();
  }

  private createEntityMesh(entity: Entity): void {
    const color = COLORS[entity.ownerIdx - 1]?.mesh ?? "#ffffff";
    const accent = COLORS[entity.ownerIdx - 1]?.accent ?? "#ffffff";

    const group = new THREE.Group();

    const body = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 18, 16),
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.13,
        roughness: 0.3,
        metalness: 0.15,
      })
    );
    body.castShadow = true;
    group.add(body);

    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.34, 12),
      new THREE.MeshStandardMaterial({
        color: accent,
        roughness: 0.25,
        metalness: 0.1,
      })
    );
    tip.rotation.x = Math.PI / 2;
    tip.position.set(0, 0.02, 0.34);
    tip.castShadow = true;
    group.add(tip);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.34, 20),
      new THREE.MeshBasicMaterial({
        color: "#000000",
        transparent: true,
        opacity: 0.18,
      })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.32;
    group.add(shadow);

    const world = this.entityToWorld(entity, 0);
    group.position.set(world.x, world.y, world.z);
    group.rotation.y = entity.isPlayer ? this.playerFacingYaw : dirToYaw(entity.dir);
    this.scene.add(group);
    this.entityMeshes.set(entity.ownerIdx, group);
  }

  private spawnTerritory(cx: number, cy: number, ownerIdx: number, size: number): void {
    const half = Math.floor(size / 2);
    for (let dy = -half; dy < size - half; dy++) {
      for (let dx = -half; dx < size - half; dx++) {
        const x = cx + dx;
        const y = cy + dy;
        if (!inBounds(x, y)) continue;
        this.grid[idx(x, y)] = ownerIdx;
      }
    }
    this.boardDirty = true;
  }

  private gameLoop(time: number): void {
    const dt = this.lastTime > 0 ? clamp((time - this.lastTime) / 1000, 0.001, 0.05) : 0.016;
    this.lastTime = time;

    this.update(dt, time * 0.001);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame((next) => this.gameLoop(next));
  }

  private update(dt: number, t: number): void {
    if (this.phase === "playing") {
      this.updateGameplay(dt);
    }

    this.updateEntityMeshes(t);
    this.updateCamera(dt, t);

    if (this.boardDirty) {
      this.rebuildBoardTexture();
    }
  }

  private updateGameplay(dt: number): void {
    if (this.player.alive) {
      this.movePlayerFreely(dt);
    }

    for (const bot of this.bots) {
      if (bot.alive) {
        bot.aiTimer -= dt;
        this.moveEntity(bot, dt, true);
      } else {
        bot.respawnTimer -= dt;
        if (bot.respawnTimer <= 0) {
          this.respawnBot(bot);
        }
      }
    }

    this.displayScore = lerp(this.displayScore, this.score, clamp(dt * 7, 0, 1));
    this.uiSystem.setScore(this.displayScore.toFixed(1) + "%");
    this.updateHudText();
  }

  private movePlayerFreely(dt: number): void {
    if (!this.player.alive || !this.playerMoving || !this.hasCursor) return;

    const target = this.screenPointToBoardPoint(this.cursorClientX, this.cursorClientY);
    if (!target) return;

    this.updatePlayerFacing(target.x, target.y);

    const dx = target.x - this.playerWorldX;
    const dy = target.y - this.playerWorldY;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.0001) return;

    const travel = Math.min(distance, MOVE_SPEED * dt);
    const prevX = this.playerWorldX;
    const prevY = this.playerWorldY;
    const nextX = prevX + (dx / distance) * travel;
    const nextY = prevY + (dy / distance) * travel;

    if (nextX < 0 || nextX >= GRID_W || nextY < 0 || nextY >= GRID_H) {
      this.killEntity(this.player, "out-of-bounds");
      return;
    }

    this.playerWorldX = nextX;
    this.playerWorldY = nextY;
    this.advancePlayerThroughCells(prevX, prevY, nextX, nextY);
  }

  private advancePlayerThroughCells(prevX: number, prevY: number, nextX: number, nextY: number): void {
    if (!this.player.alive) return;

    const dx = nextX - prevX;
    const dy = nextY - prevY;
    const distance = Math.hypot(dx, dy);
    const steps = Math.max(1, Math.ceil(distance / 0.1));

    let lastCellX = this.player.cellX;
    let lastCellY = this.player.cellY;
    for (let step = 1; step <= steps && this.player.alive; step++) {
      const t = step / steps;
      const sampleX = prevX + dx * t;
      const sampleY = prevY + dy * t;
      const cellX = Math.floor(sampleX);
      const cellY = Math.floor(sampleY);
      if (cellX === lastCellX && cellY === lastCellY) continue;
      if (!this.processEntityCellEntry(this.player, cellX, cellY)) break;
      lastCellX = cellX;
      lastCellY = cellY;
    }
  }

  private processEntityCellEntry(entity: Entity, nextX: number, nextY: number): boolean {
    if (!inBounds(nextX, nextY)) {
      this.killEntity(entity, "out-of-bounds");
      return false;
    }

    const trailOwner = this.trailGrid[idx(nextX, nextY)];
    if (trailOwner !== 0) {
      if (trailOwner === entity.ownerIdx) {
        this.killEntity(entity, "self-trail");
        return false;
      }

      const victim = this.getEntityByOwner(trailOwner);
      if (victim && victim.alive) {
        this.killEntity(victim, "tail-cut");
        this.playSfx("kill");
        if (entity.isPlayer) {
          this.triggerHaptic("success");
        }
      }
    }

    if (!entity.alive) return false;

    entity.cellX = nextX;
    entity.cellY = nextY;
    this.handleTrailAndCapture(entity);
    return entity.alive;
  }

  private moveEntity(entity: Entity, dt: number, isBot: boolean): void {
    if (!entity.alive) return;
    if (entity.isPlayer && !this.playerMoving) return;

    entity.moveProgress += dt * MOVE_SPEED;

    while (entity.moveProgress >= 1 && entity.alive) {
      entity.moveProgress -= 1;

      if (isBot) {
        this.chooseBotDirection(entity);
      }

      if (entity.nextDir !== OPPOSITE[entity.dir]) {
        entity.dir = entity.nextDir;
      }

      const nextX = entity.cellX + DIR_DX[entity.dir];
      const nextY = entity.cellY + DIR_DY[entity.dir];

      const enteredCell = this.processEntityCellEntry(entity, nextX, nextY);
      if (!enteredCell) break;

      if (isBot) {
        this.updateBotStateAfterStep(entity);
      }
    }
  }

  private chooseBotDirection(bot: Entity): void {
    if (!bot.alive) return;

    const onOwnCell = this.grid[idx(bot.cellX, bot.cellY)] === bot.ownerIdx;
    if (bot.aiState === "homing" && bot.trail.length === 0 && onOwnCell) {
      bot.aiState = "idle";
      bot.aiTimer = randFloat(BOT_IDLE_MIN, BOT_IDLE_MAX);
      bot.ventureSteps = 0;
    }

    if (bot.aiState === "idle" && bot.aiTimer <= 0) {
      bot.aiState = "venture";
      bot.ventureSteps = randInt(BOT_VENTURE_MIN, BOT_VENTURE_MAX);
    }

    if (bot.aiState === "homing") {
      bot.nextDir = this.directionToward(bot.cellX, bot.cellY, bot.homeX, bot.homeY, bot.dir);
      return;
    }

    if (bot.aiState === "idle") {
      bot.nextDir = this.pickStayInsideDirection(bot);
      return;
    }

    const safeDirs = this.getSafeDirs(bot, false);
    if (safeDirs.length === 0) {
      bot.nextDir = OPPOSITE[bot.dir];
      return;
    }

    const straight = safeDirs.find((d) => d === bot.dir);
    if (straight !== undefined && Math.random() < 0.72) {
      bot.nextDir = straight;
      return;
    }

    bot.nextDir = safeDirs[randInt(0, safeDirs.length - 1)];
  }

  private updateBotStateAfterStep(bot: Entity): void {
    if (!bot.alive) return;

    if (bot.trail.length > 0) {
      if (bot.aiState !== "homing" && (bot.ventureSteps <= 0 || bot.trail.length > BOT_MAX_TRAIL)) {
        bot.aiState = "homing";
      }
      return;
    }

    if (bot.aiState === "venture") {
      if (bot.ventureSteps <= 0) {
        bot.aiState = "idle";
        bot.aiTimer = randFloat(BOT_IDLE_MIN, BOT_IDLE_MAX);
      }
      return;
    }

    if (bot.aiState === "idle" && Math.random() < 0.07) {
      bot.nextDir = Math.random() < 0.5 ? CW[bot.dir] : CCW[bot.dir];
    }
  }

  private getSafeDirs(bot: Entity, allowReverse: boolean): Dir[] {
    const order: Dir[] = [bot.dir, CW[bot.dir], CCW[bot.dir], OPPOSITE[bot.dir]];
    const result: Dir[] = [];

    for (const dir of order) {
      if (!allowReverse && dir === OPPOSITE[bot.dir]) continue;
      const nx = bot.cellX + DIR_DX[dir];
      const ny = bot.cellY + DIR_DY[dir];
      if (!inBounds(nx, ny)) continue;
      if (this.trailGrid[idx(nx, ny)] === bot.ownerIdx) continue;
      result.push(dir);
    }

    if (result.length === 0 && !allowReverse) {
      return this.getSafeDirs(bot, true);
    }

    return result;
  }

  private pickStayInsideDirection(bot: Entity): Dir {
    const dirs = this.getSafeDirs(bot, false);
    if (dirs.length === 0) return bot.dir;

    const inside = dirs.filter((dir) => {
      const nx = bot.cellX + DIR_DX[dir];
      const ny = bot.cellY + DIR_DY[dir];
      return this.grid[idx(nx, ny)] === bot.ownerIdx;
    });

    if (inside.length > 0) {
      if (inside.includes(bot.dir) && Math.random() < 0.78) return bot.dir;
      return inside[randInt(0, inside.length - 1)];
    }

    return dirs[randInt(0, dirs.length - 1)];
  }

  private directionToward(fromX: number, fromY: number, toX: number, toY: number, currentDir: Dir): Dir {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const priorities: Dir[] = [];

    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx > 0) priorities.push(1);
      if (dx < 0) priorities.push(3);
      if (dy > 0) priorities.push(2);
      if (dy < 0) priorities.push(0);
    } else {
      if (dy > 0) priorities.push(2);
      if (dy < 0) priorities.push(0);
      if (dx > 0) priorities.push(1);
      if (dx < 0) priorities.push(3);
    }

    priorities.push(currentDir, CW[currentDir], CCW[currentDir], OPPOSITE[currentDir]);

    for (const dir of priorities) {
      if (dir === OPPOSITE[currentDir] && priorities.length > 1) continue;
      const nx = fromX + DIR_DX[dir];
      const ny = fromY + DIR_DY[dir];
      if (!inBounds(nx, ny)) continue;
      if (this.trailGrid[idx(nx, ny)] === this.grid[idx(fromX, fromY)]) continue;
      return dir;
    }

    return currentDir;
  }

  private handleTrailAndCapture(entity: Entity): void {
    const currentIdx = idx(entity.cellX, entity.cellY);
    const onOwnTerritory = this.grid[currentIdx] === entity.ownerIdx;

    if (onOwnTerritory) {
      if (entity.trail.length > 0) {
        this.closeLoop(entity);
      }
      return;
    }

    const last = entity.trail[entity.trail.length - 1];
    if (!last || last.x !== entity.cellX || last.y !== entity.cellY) {
      entity.trail.push({ x: entity.cellX, y: entity.cellY });
      this.trailGrid[currentIdx] = entity.ownerIdx;
      this.boardDirty = true;
      if (!entity.isPlayer && entity.aiState === "idle") {
        entity.aiState = "homing";
      }
      if (!entity.isPlayer && entity.aiState === "venture") {
        entity.ventureSteps -= 1;
      }
    }
  }

  private closeLoop(entity: Entity): void {
    let trailPainted = 0;
    for (const cell of entity.trail) {
      const i = idx(cell.x, cell.y);
      if (this.grid[i] !== entity.ownerIdx) {
        trailPainted += 1;
      }
      this.grid[i] = entity.ownerIdx;
      this.trailGrid[i] = 0;
    }

    const enclosed = this.fillEnclosedArea(entity.ownerIdx);
    entity.trail = [];
    this.boardDirty = true;
    this.updateScore();

    if (trailPainted + enclosed > 0) {
      this.playSfx("claim");
      if (entity.isPlayer) {
        this.triggerHaptic(enclosed > 20 ? "success" : "medium");
      }
    }
  }

  private fillEnclosedArea(ownerIdx: number): number {
    const blocked = new Uint8Array(TOTAL_CELLS);
    const visited = new Uint8Array(TOTAL_CELLS);
    const queueX = new Int16Array(TOTAL_CELLS);
    const queueY = new Int16Array(TOTAL_CELLS);

    for (let i = 0; i < TOTAL_CELLS; i++) {
      if (this.grid[i] === ownerIdx) blocked[i] = 1;
    }

    let head = 0;
    let tail = 0;

    const enqueue = (x: number, y: number) => {
      const i = idx(x, y);
      if (blocked[i] || visited[i]) return;
      visited[i] = 1;
      queueX[tail] = x;
      queueY[tail] = y;
      tail += 1;
    };

    for (let x = 0; x < GRID_W; x++) {
      enqueue(x, 0);
      enqueue(x, GRID_H - 1);
    }
    for (let y = 1; y < GRID_H - 1; y++) {
      enqueue(0, y);
      enqueue(GRID_W - 1, y);
    }

    while (head < tail) {
      const x = queueX[head];
      const y = queueY[head];
      head += 1;

      for (let dir: Dir = 0; dir < 4; dir = (dir + 1) as Dir) {
        const nx = x + DIR_DX[dir];
        const ny = y + DIR_DY[dir];
        if (!inBounds(nx, ny)) continue;
        const i = idx(nx, ny);
        if (blocked[i] || visited[i]) continue;
        visited[i] = 1;
        queueX[tail] = nx;
        queueY[tail] = ny;
        tail += 1;
      }
    }

    let captured = 0;
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        const i = idx(x, y);
        if (blocked[i] || visited[i]) continue;
        this.grid[i] = ownerIdx;
        captured += 1;
      }
    }

    return captured;
  }

  private clearTrail(entity: Entity): void {
    for (const cell of entity.trail) {
      const i = idx(cell.x, cell.y);
      if (this.trailGrid[i] === entity.ownerIdx) {
        this.trailGrid[i] = 0;
      }
    }
    entity.trail = [];
    this.boardDirty = true;
  }

  private killEntity(entity: Entity, reason: string): void {
    if (!entity.alive) return;
    console.log("[PaperIO3D.killEntity]", entity.name + " removed: " + reason);

    entity.alive = false;
    entity.moveProgress = 0;
    this.clearTrail(entity);

    if (entity.isPlayer) {
      this.gameOver();
      return;
    }

    entity.aiState = "idle";
    entity.aiTimer = randFloat(BOT_IDLE_MIN, BOT_IDLE_MAX);
    entity.ventureSteps = 0;
    entity.respawnTimer = BOT_RESPAWN_TIME;

    const mesh = this.entityMeshes.get(entity.ownerIdx);
    if (mesh) {
      mesh.visible = false;
    }
  }

  private respawnBot(bot: Entity): void {
    bot.alive = true;
    bot.cellX = bot.homeX;
    bot.cellY = bot.homeY;
    bot.dir = randInt(0, 3) as Dir;
    bot.nextDir = bot.dir;
    bot.moveProgress = 0;
    bot.aiState = "idle";
    bot.aiTimer = randFloat(BOT_IDLE_MIN, BOT_IDLE_MAX);
    bot.ventureSteps = 0;
    bot.respawnTimer = BOT_RESPAWN_TIME;
    this.clearTrail(bot);
    this.spawnTerritory(bot.homeX, bot.homeY, bot.ownerIdx, BOT_INIT_SIZE);

    const mesh = this.entityMeshes.get(bot.ownerIdx);
    if (mesh) {
      mesh.visible = true;
    }
    this.updateScore();
  }

  private getEntityByOwner(ownerIdx: number): Entity | null {
    if (this.player && this.player.ownerIdx === ownerIdx) return this.player;
    for (const bot of this.bots) {
      if (bot.ownerIdx === ownerIdx) return bot;
    }
    return null;
  }

  private updateScore(): void {
    let owned = 0;
    for (let i = 0; i < TOTAL_CELLS; i++) {
      if (this.grid[i] === 1) owned += 1;
    }
    this.score = (owned / TOTAL_CELLS) * 100;
    this.uiSystem.setScore(this.score.toFixed(1) + "%");
  }

  private updateHudText(): void {
    if (this.phase !== "playing" || !this.player) {
      this.uiSystem.setStatus("");
      return;
    }

    if (!this.playerMoving) {
      this.uiSystem.setStatus(this.isMobile ? "Touch and drag to move and start your trail" : "Move your cursor to start your trail");
      return;
    }

    if (this.player.trail.length > 0) {
      this.uiSystem.setStatus("Loop back to your land to lock territory");
      return;
    }

    this.uiSystem.setStatus("Own more ground than the bots");
  }

  private updateEntityMeshes(t: number): void {
    if (this.phase === "start") return;

    const entities = [this.player, ...this.bots];
    for (const entity of entities) {
      const mesh = this.entityMeshes.get(entity.ownerIdx);
      if (!mesh) continue;
      if (!entity.alive) {
        mesh.visible = false;
        continue;
      }

      mesh.visible = true;
      const world = this.entityToWorld(entity, entity.moveProgress);
      mesh.position.set(world.x, world.y, world.z);
      mesh.rotation.y = entity.isPlayer ? this.playerFacingYaw : dirToYaw(entity.dir);
      const pulse = 1 + Math.sin(t * 6 + entity.ownerIdx * 1.7) * 0.03;
      mesh.scale.set(pulse, pulse, pulse);
    }
  }

  private entityToWorld(entity: Entity, progress: number): THREE.Vector3 {
    if (entity.isPlayer) {
      this.tempVec.set(this.playerWorldX - GRID_W / 2, 0.42, this.playerWorldY - GRID_H / 2);
      return this.tempVec;
    }

    const fx = entity.cellX + DIR_DX[entity.dir] * progress;
    const fy = entity.cellY + DIR_DY[entity.dir] * progress;
    this.tempVec.set(fx - GRID_W / 2 + 0.5, 0.42, fy - GRID_H / 2 + 0.5);
    return this.tempVec;
  }

  private updateCamera(dt: number, t: number): void {
    const easing = 1 - Math.exp(-dt * CAMERA_LERP);

    if (this.phase === "playing" && this.player && this.player.alive) {
      const playerPos = this.entityToWorld(this.player, this.player.moveProgress);
      const desiredX = playerPos.x;
      const desiredY = this.isMobile ? 14.4 : 13.6;
      const desiredZ = playerPos.z + (this.isMobile ? 12 : 11);

      this.camera.position.lerp(new THREE.Vector3(desiredX, desiredY, desiredZ), easing);
      this.cameraLookAt.lerp(new THREE.Vector3(playerPos.x, 0.15, playerPos.z), easing * 1.15);
      this.camera.lookAt(this.cameraLookAt);
      return;
    }

    const orbitRadius = 38;
    const orbitSpeed = this.phase === "over" ? 0.25 : 0.18;
    const orbit = t * orbitSpeed;
    const desired = new THREE.Vector3(
      Math.cos(orbit) * orbitRadius,
      this.isMobile ? 17.6 : 16.2,
      Math.sin(orbit) * orbitRadius
    );
    const look = new THREE.Vector3(0, 0, 0);
    this.camera.position.lerp(desired, easing);
    this.cameraLookAt.lerp(look, easing);
    this.camera.lookAt(this.cameraLookAt);
  }

  private rebuildBoardTexture(): void {
    const ctx = this.boardCtx;
    const px = BOARD_CELL_PIXELS;
    const textureW = this.boardCanvas.width;
    const textureH = this.boardCanvas.height;

    ctx.clearRect(0, 0, textureW, textureH);

    const baseGradient = ctx.createLinearGradient(0, 0, 0, textureH);
    baseGradient.addColorStop(0, "#d8efec");
    baseGradient.addColorStop(0.62, "#d1ece8");
    baseGradient.addColorStop(1, "#c8e7e2");
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, textureW, textureH);

    // Soft wavy ribbons in the base map, similar to the reference look.
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (let band = 0; band < 7; band++) {
      const ratio = (band + 0.5) / 7;
      const baseY = ratio * textureH;
      ctx.strokeStyle = this.hexWithAlpha("#95c9c4", 0.16 + ratio * 0.05);
      ctx.lineWidth = px * (0.42 + ratio * 0.1);
      ctx.beginPath();
      for (let sx = -px; sx <= textureW + px; sx += px) {
        const wave =
          Math.sin(sx * 0.020 + band * 1.43) * px * 1.45 +
          Math.cos(sx * 0.010 - band * 0.81) * px * 0.72;
        const sy = baseY + wave;
        if (sx <= -px) {
          ctx.moveTo(sx, sy);
        } else {
          ctx.lineTo(sx, sy);
        }
      }
      ctx.stroke();
    }

    // Fine deterministic variation to avoid a flat digital look.
    for (let y = 0; y < GRID_H; y += 3) {
      for (let x = 0; x < GRID_W; x += 3) {
        const shade = this.cellShade[idx(x, y)];
        if (Math.abs(shade) < 0.03) continue;
        const alpha = Math.min(0.045, Math.abs(shade) * 0.32);
        ctx.fillStyle = shade > 0 ? this.hexWithAlpha("#ffffff", alpha) : this.hexWithAlpha("#6ea8a0", alpha);
        ctx.beginPath();
        ctx.arc((x + 0.5) * px, (y + 0.5) * px, px * 0.95, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const drawDisc = (x: number, y: number, radius: number): void => {
      ctx.beginPath();
      ctx.arc((x + 0.5) * px, (y + 0.5) * px, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    const isBoundaryCell = (ownerIdx: number, x: number, y: number): boolean => {
      for (let dir: Dir = 0; dir < 4; dir = (dir + 1) as Dir) {
        const nx = x + DIR_DX[dir];
        const ny = y + DIR_DY[dir];
        if (!inBounds(nx, ny) || this.grid[idx(nx, ny)] !== ownerIdx) {
          return true;
        }
      }
      return false;
    };

    const strokeTrailLinks = (ownerIdx: number, strokeColor: string, lineWidth: number): void => {
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          if (this.trailGrid[idx(x, y)] !== ownerIdx) continue;
          const cx = (x + 0.5) * px;
          const cy = (y + 0.5) * px;
          if (x + 1 < GRID_W && this.trailGrid[idx(x + 1, y)] === ownerIdx) {
            ctx.moveTo(cx, cy);
            ctx.lineTo((x + 1.5) * px, cy);
          }
          if (y + 1 < GRID_H && this.trailGrid[idx(x, y + 1)] === ownerIdx) {
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx, (y + 1.5) * px);
          }
        }
      }
      ctx.stroke();
    };

    // Territories: filled soft blobs with darker outlines.
    for (let ownerIdx = 1; ownerIdx <= COLORS.length; ownerIdx++) {
      const theme = COLORS[ownerIdx - 1];
      ctx.fillStyle = theme.territory;
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          if (this.grid[idx(x, y)] !== ownerIdx) continue;
          drawDisc(x, y, px * 0.8);
        }
      }

      ctx.strokeStyle = this.adjustHex(theme.territory, -0.18);
      ctx.lineWidth = px * 0.22;
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          if (this.grid[idx(x, y)] !== ownerIdx) continue;
          if (!isBoundaryCell(ownerIdx, x, y)) continue;
          ctx.beginPath();
          ctx.arc((x + 0.5) * px, (y + 0.5) * px, px * 0.78, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }

    // Trails: rounded tubes with a soft underlay.
    for (let ownerIdx = 1; ownerIdx <= COLORS.length; ownerIdx++) {
      const trailColor = COLORS[ownerIdx - 1].trail;
      strokeTrailLinks(ownerIdx, this.hexWithAlpha(trailColor, 0.35), px * 0.86);
      strokeTrailLinks(ownerIdx, trailColor, px * 0.55);

      ctx.fillStyle = trailColor;
      for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
          if (this.trailGrid[idx(x, y)] !== ownerIdx) continue;
          ctx.beginPath();
          ctx.arc((x + 0.5) * px, (y + 0.5) * px, px * 0.29, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    ctx.globalAlpha = 1;
    this.boardTexture.needsUpdate = true;
    this.boardDirty = false;
  }

  private hexWithAlpha(hex: string, alpha: number): string {
    const clean = hex.startsWith("#") ? hex.slice(1) : hex;
    const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    const r = parseInt(full.slice(0, 2), 16);
    const g = parseInt(full.slice(2, 4), 16);
    const b = parseInt(full.slice(4, 6), 16);
    const a = clamp(alpha, 0, 1).toFixed(3);
    return "rgba(" + r + ", " + g + ", " + b + ", " + a + ")";
  }

  private adjustHex(hex: string, amount: number): string {
    const clean = hex.startsWith("#") ? hex.slice(1) : hex;
    const full = clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
    const r = clamp(Math.round(parseInt(full.slice(0, 2), 16) + amount * 255), 0, 255);
    const g = clamp(Math.round(parseInt(full.slice(2, 4), 16) + amount * 255), 0, 255);
    const b = clamp(Math.round(parseInt(full.slice(4, 6), 16) + amount * 255), 0, 255);
    const rr = r.toString(16).padStart(2, "0");
    const gg = g.toString(16).padStart(2, "0");
    const bb = b.toString(16).padStart(2, "0");
    return "#" + rr + gg + bb;
  }

  private playSfx(name: SfxName): void {
    this.audioSystem.playSfx(name);
  }

  private triggerHaptic(type: HapticType): void {
    this.audioSystem.triggerHaptic(type);
  }

  private handleResize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.isMobile = window.matchMedia("(pointer: coarse)").matches;

    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.width, this.height, false);

    this.camera.aspect = this.width / Math.max(1, this.height);
    this.camera.fov = this.isMobile ? 60 : 56;
    this.camera.updateProjectionMatrix();

    console.log(
      "[PaperIO3D.handleResize]",
      "Viewport " + this.width + "x" + this.height + ", mobile=" + this.isMobile
    );
  }
}
