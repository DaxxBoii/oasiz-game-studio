/**
 * ARCHERY ATTACK — 2D Slingshot Archery Game
 *
 * Pull back to aim, wait for the steady window, release to fire.
 * Pure 2D canvas, no external libraries.
 */

// ============= TYPES =============
type GameState = "START" | "PLAYING" | "PAUSED" | "GAME_OVER";

interface Settings {
  music: boolean;
  fx: boolean;
  haptics: boolean;
}

interface Arrow {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  angle: number;
}

interface Target {
  x: number;
  y: number;
  radius: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  pathT: number;
  pathSpeed: number;
  pathDir: 1 | -1;
}

interface Cloud {
  x: number;
  y: number;
  speed: number;
  scale: number;
  opacity: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

// ============= CONFIG =============
const CONFIG = {
  // Physics
  GRAVITY: 0.0012,
  POWER_SCALE: 0.018,
  MAX_PULL: 140,
  PULL_ZONE_RADIUS: 200,

  // Arrow drawing
  ARROW_LENGTH: 40,
  ARROW_HEAD_SIZE: 10,

  // Target
  TARGET_RADIUS: 35,
  TARGET_HIT_RADIUS: 40,
  TARGET_SPEED_MIN: 0.00015,
  TARGET_SPEED_MAX: 0.0004,

  // Layout
  GROUND_RATIO: 0.15,
  BOW_X_RATIO: 0.15,
  BOW_RADIUS: 90,
  BAND_COLOR: "#8B5E3C",

  // Gameplay
  ROUND_TIME_MS: 20000,
  ARROWS_PER_ROUND: 8,
  RELOAD_TIME_MS: 800,

  // Wobble — "hold to focus" model
  // Starts very shaky, calms down over FOCUS_TIME, holds steady for STEADY_WINDOW,
  // then ramps back up. One chance per aim.
  WOBBLE_MAX: 0.22,            // max wobble (radians) at start
  WOBBLE_MIN: 0.01,            // near-perfect steadiness during window
  FOCUS_TIME_MS: 3000,         // ms to ramp from max wobble to steady
  STEADY_WINDOW_MS: 500,       // ms of steady aim before it deteriorates
  DETERIORATE_TIME_MS: 1500,   // ms to ramp back to max wobble after window
  WOBBLE_NOISE_SPEED: 0.005,   // high-freq jitter speed

  RING_COLORS: ["#FFD700", "#FF4444", "#4488FF", "#222222", "#FFFFFF"],
};

// ============= GLOBALS =============
const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// UI Elements
const startScreen = document.getElementById("startScreen")!;
const gameOverScreen = document.getElementById("gameOverScreen")!;
const pauseScreen = document.getElementById("pauseScreen")!;
const settingsModal = document.getElementById("settingsModal")!;
const settingsBtn = document.getElementById("settingsBtn")!;
const pauseBtn = document.getElementById("pauseBtn")!;
const scoreDisplay = document.getElementById("scoreDisplay")!;
const currentScoreEl = document.getElementById("currentScore")!;
const finalScoreEl = document.getElementById("finalScore")!;

// State
let gameState: GameState = "START";
let w = window.innerWidth;
let h = window.innerHeight;
const isMobile = window.matchMedia("(pointer: coarse)").matches;

// Score, timer, ammo
let score = 0;
let timeRemaining = CONFIG.ROUND_TIME_MS;
let arrowsLeft = CONFIG.ARROWS_PER_ROUND;

// Settings
let settings: Settings = loadSettings();

// Animation
let animationFrameId: number;
let lastTime = 0;

// Scene objects
let groundY = 0;
let bowAnchor = { x: 0, y: 0 };
let target: Target = {
  x: 0, y: 0, radius: CONFIG.TARGET_RADIUS,
  startX: 0, startY: 0, endX: 0, endY: 0,
  pathT: 0, pathSpeed: 0.0003, pathDir: 1,
};
let arrows: Arrow[] = [];
let particles: Particle[] = [];
let clouds: Cloud[] = [];

// Aiming state
let isAiming = false;
let pullPoint = { x: 0, y: 0 };
let pullDist = 0;
let reachedMaxPull = false;
let aimHoldTime = 0;      // ms spent holding the pull
let currentWobble = 0;    // current wobble magnitude (radians)
let wobbleOffset = 0;     // actual angular offset applied this frame

// Reload cooldown
let reloadTimer = 0;      // ms remaining before next shot allowed

// ============= CANVAS SETUP =============
function resizeCanvas(): void {
  w = window.innerWidth;
  h = window.innerHeight;
  canvas.width = w;
  canvas.height = h;

  groundY = h * (1 - CONFIG.GROUND_RATIO);
  bowAnchor.x = w * CONFIG.BOW_X_RATIO;
  bowAnchor.y = h * 0.5;

  console.log("[resizeCanvas] Canvas resized to:", w, "x", h);
}

// ============= HAPTICS =============
function triggerHaptic(
  type: "light" | "medium" | "heavy" | "success" | "error",
): void {
  if (!settings.haptics) return;
  if (typeof (window as any).triggerHaptic === "function") {
    (window as any).triggerHaptic(type);
  }
}

// ============= SETTINGS =============
function loadSettings(): Settings {
  const saved = localStorage.getItem("archeryAttack_settings");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return { music: true, fx: true, haptics: true };
}

function saveSettings(): void {
  localStorage.setItem("archeryAttack_settings", JSON.stringify(settings));
}

// ============= TARGET =============
function repositionTarget(): void {
  const pad = CONFIG.TARGET_RADIUS + 10;
  const minX = w * 0.4;
  const maxX = w * 0.92;
  const minY = h * 0.12;
  const maxY = groundY - pad;

  const x1 = minX + Math.random() * (maxX - minX);
  const y1 = minY + Math.random() * (maxY - minY);
  const x2 = minX + Math.random() * (maxX - minX);
  const y2 = minY + Math.random() * (maxY - minY);

  target.startX = x1;
  target.startY = y1;
  target.endX = x2;
  target.endY = y2;
  target.pathT = 0;
  target.pathDir = 1;
  target.pathSpeed =
    CONFIG.TARGET_SPEED_MIN +
    Math.random() * (CONFIG.TARGET_SPEED_MAX - CONFIG.TARGET_SPEED_MIN);
  target.x = x1;
  target.y = y1;
}

function updateTarget(dt: number): void {
  target.pathT += target.pathSpeed * dt * target.pathDir;

  if (target.pathT >= 1) {
    target.pathT = 1;
    target.pathDir = -1;
  } else if (target.pathT <= 0) {
    target.pathT = 0;
    target.pathDir = 1;
  }

  const t = target.pathT;
  const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

  target.x = target.startX + (target.endX - target.startX) * ease;
  target.y = target.startY + (target.endY - target.startY) * ease;
}

// ============= WOBBLE =============
function updateWobble(dt: number): void {
  if (!isAiming) {
    currentWobble = 0;
    wobbleOffset = 0;
    return;
  }

  aimHoldTime += dt;

  const t = aimHoldTime;
  const focusEnd = CONFIG.FOCUS_TIME_MS;
  const steadyEnd = focusEnd + CONFIG.STEADY_WINDOW_MS;
  const detEnd = steadyEnd + CONFIG.DETERIORATE_TIME_MS;

  let wobbleFrac: number; // 0 = perfectly steady, 1 = max wobble
  if (t < focusEnd) {
    // Phase 1: focusing — ramp down from 1 to 0 with easeOutCubic
    const p = t / focusEnd;
    wobbleFrac = 1 - p * p * p;
  } else if (t < steadyEnd) {
    // Phase 2: steady window — near zero
    wobbleFrac = 0;
  } else if (t < detEnd) {
    // Phase 3: deteriorating — ramp back up
    const p = (t - steadyEnd) / CONFIG.DETERIORATE_TIME_MS;
    wobbleFrac = p * p;
  } else {
    // Phase 4: fully shaky again
    wobbleFrac = 1;
  }

  currentWobble = CONFIG.WOBBLE_MIN + (CONFIG.WOBBLE_MAX - CONFIG.WOBBLE_MIN) * wobbleFrac;

  // High-frequency noise within the wobble magnitude
  const noise = Math.sin(t * CONFIG.WOBBLE_NOISE_SPEED * 7.3)
    * 0.6 + Math.sin(t * CONFIG.WOBBLE_NOISE_SPEED * 13.1) * 0.4;
  wobbleOffset = noise * currentWobble;
}

/** Returns 0 = max wobble, 1 = perfectly steady */
function getSteadiness(): number {
  return 1 - (currentWobble - CONFIG.WOBBLE_MIN) / (CONFIG.WOBBLE_MAX - CONFIG.WOBBLE_MIN);
}

// ============= PARTICLES =============
function spawnHitParticles(x: number, y: number): void {
  const colors = ["#FFD700", "#FF6644", "#FFAA22", "#FFFFFF"];
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.1 + Math.random() * 0.3;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 4,
    });
  }
}

// ============= GAME STATE =============
function gameOver(): void {
  if (gameState !== "PLAYING") return;

  gameState = "GAME_OVER";
  console.log("[gameOver] Final score:", score);

  if (typeof (window as any).submitScore === "function") {
    (window as any).submitScore(score);
  }

  triggerHaptic("error");

  finalScoreEl.textContent = score.toString();
  scoreDisplay.classList.add("hidden");
  pauseBtn.classList.add("hidden");
  settingsBtn.classList.add("hidden");
  gameOverScreen.classList.remove("hidden");
}

function startGame(): void {
  console.log("[startGame] Starting game");
  gameState = "PLAYING";

  score = 0;
  timeRemaining = CONFIG.ROUND_TIME_MS;
  arrowsLeft = CONFIG.ARROWS_PER_ROUND;
  reloadTimer = 0;
  currentScoreEl.textContent = "0";

  arrows = [];
  particles = [];
  isAiming = false;
  aimHoldTime = 0;

  repositionTarget();

  startScreen.classList.add("hidden");
  gameOverScreen.classList.add("hidden");
  pauseScreen.classList.add("hidden");

  scoreDisplay.classList.remove("hidden");
  pauseBtn.classList.remove("hidden");
  settingsBtn.classList.remove("hidden");

  triggerHaptic("light");
}

function pauseGame(): void {
  if (gameState !== "PLAYING") return;
  console.log("[pauseGame] Game paused");
  gameState = "PAUSED";
  pauseScreen.classList.remove("hidden");
  triggerHaptic("light");
}

function resumeGame(): void {
  if (gameState !== "PAUSED") return;
  console.log("[resumeGame] Game resumed");
  gameState = "PLAYING";
  pauseScreen.classList.add("hidden");
  triggerHaptic("light");
}

function showStartScreen(): void {
  console.log("[showStartScreen] Showing start screen");
  gameState = "START";

  startScreen.classList.remove("hidden");
  gameOverScreen.classList.add("hidden");
  pauseScreen.classList.add("hidden");
  scoreDisplay.classList.add("hidden");
  pauseBtn.classList.add("hidden");
  settingsBtn.classList.add("hidden");
}

// ============= CLOUDS =============
function initClouds(): void {
  clouds = [];
  for (let i = 0; i < 6; i++) {
    clouds.push({
      x: Math.random() * w * 1.5 - w * 0.25,
      y: 30 + Math.random() * (groundY * 0.4),
      speed: 0.008 + Math.random() * 0.015,
      scale: 0.6 + Math.random() * 0.8,
      opacity: 0.4 + Math.random() * 0.4,
    });
  }
}

function updateClouds(dt: number): void {
  for (const c of clouds) {
    c.x += c.speed * dt;
    if (c.x > w + 150) {
      c.x = -150;
      c.y = 30 + Math.random() * (groundY * 0.4);
    }
  }
}

function drawCloud(c: Cloud): void {
  ctx.globalAlpha = c.opacity;
  ctx.fillStyle = "#FFFFFF";
  const s = c.scale;
  ctx.beginPath();
  ctx.ellipse(c.x, c.y, 50 * s, 25 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(c.x - 30 * s, c.y + 5 * s, 35 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(c.x + 30 * s, c.y + 5 * s, 35 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(c.x + 10 * s, c.y - 12 * s, 30 * s, 18 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawSun(): void {
  const sunX = w * 0.82;
  const sunY = h * 0.1;
  const sunR = 50;

  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.3, sunX, sunY, sunR * 2.5);
  glow.addColorStop(0, "rgba(255, 240, 150, 0.5)");
  glow.addColorStop(0.5, "rgba(255, 220, 100, 0.15)");
  glow.addColorStop(1, "rgba(255, 200, 50, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR * 2.5, 0, Math.PI * 2);
  ctx.fill();

  const body = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunR);
  body.addColorStop(0, "#FFFDE0");
  body.addColorStop(0.7, "#FFE44D");
  body.addColorStop(1, "#FFB800");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
}

// ============= DRAWING =============
function drawSky(): void {
  const grad = ctx.createLinearGradient(0, 0, 0, groundY);
  grad.addColorStop(0, "#3388CC");
  grad.addColorStop(0.5, "#66BBEE");
  grad.addColorStop(1, "#AADDFF");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, groundY);
}

function drawGround(): void {
  const grad = ctx.createLinearGradient(0, groundY, 0, h);
  grad.addColorStop(0, "#5A9E3F");
  grad.addColorStop(0.3, "#4A8C34");
  grad.addColorStop(1, "#3B7228");
  ctx.fillStyle = grad;
  ctx.fillRect(0, groundY, w, h - groundY);

  ctx.strokeStyle = "#6BBF4A";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(w, groundY);
  ctx.stroke();
}

function drawTower(): void {
  const tx = bowAnchor.x;
  const topY = bowAnchor.y + 20;
  const towerW = 50;
  const halfW = towerW / 2;

  const grad = ctx.createLinearGradient(tx - halfW, topY, tx + halfW, topY);
  grad.addColorStop(0, "#6B6B6B");
  grad.addColorStop(0.3, "#8A8A8A");
  grad.addColorStop(0.7, "#8A8A8A");
  grad.addColorStop(1, "#5A5A5A");
  ctx.fillStyle = grad;
  ctx.fillRect(tx - halfW, topY, towerW, groundY - topY);

  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 1;
  const rowH = 18;
  for (let y = topY + rowH; y < groundY; y += rowH) {
    ctx.beginPath();
    ctx.moveTo(tx - halfW, y);
    ctx.lineTo(tx + halfW, y);
    ctx.stroke();
    const offset = (Math.floor((y - topY) / rowH) % 2 === 0) ? 0 : halfW;
    ctx.beginPath();
    ctx.moveTo(tx - halfW + offset, y);
    ctx.lineTo(tx - halfW + offset, y + rowH);
    ctx.stroke();
  }

  const bw = 12;
  const bh = 14;
  const platW = towerW + 20;
  const platHalfW = platW / 2;

  ctx.fillStyle = "#777";
  ctx.fillRect(tx - platHalfW, topY - 4, platW, 8);

  ctx.fillStyle = "#6B6B6B";
  for (let bx = tx - platHalfW; bx < tx + platHalfW; bx += bw * 2) {
    ctx.fillRect(bx, topY - 4 - bh, bw, bh);
  }
}

function drawArcher(): void {
  const ax = bowAnchor.x - 8;
  const feetY = bowAnchor.y + 18;

  // Legs
  ctx.strokeStyle = "#3A2518";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ax - 5, feetY);
  ctx.lineTo(ax, feetY - 18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ax + 5, feetY);
  ctx.lineTo(ax, feetY - 18);
  ctx.stroke();

  // Body
  const bodyTop = feetY - 38;
  ctx.strokeStyle = "#2E7D32";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(ax, feetY - 18);
  ctx.lineTo(ax, bodyTop);
  ctx.stroke();

  // Arms
  ctx.strokeStyle = "#D2A679";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(ax, bodyTop + 6);
  ctx.lineTo(ax + 18, bodyTop + 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(ax, bodyTop + 6);
  ctx.lineTo(ax + 14, bodyTop + 10);
  ctx.stroke();

  // Head
  ctx.fillStyle = "#D2A679";
  ctx.beginPath();
  ctx.arc(ax, bodyTop - 6, 7, 0, Math.PI * 2);
  ctx.fill();

  // Hood
  ctx.fillStyle = "#2E7D32";
  ctx.beginPath();
  ctx.arc(ax, bodyTop - 8, 7.5, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(ax - 7, bodyTop - 8);
  ctx.lineTo(ax - 2, bodyTop - 20);
  ctx.lineTo(ax + 4, bodyTop - 10);
  ctx.closePath();
  ctx.fill();
}

function drawBow(): void {
  const ax = bowAnchor.x;
  const ay = bowAnchor.y;
  const r = CONFIG.BOW_RADIUS;

  ctx.strokeStyle = "#8B4513";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.arc(ax, ay, r, -Math.PI * 0.45, Math.PI * 0.45, false);
  ctx.stroke();

  const topX = ax + Math.cos(-Math.PI * 0.45) * r;
  const topY = ay + Math.sin(-Math.PI * 0.45) * r;
  const botX = ax + Math.cos(Math.PI * 0.45) * r;
  const botY = ay + Math.sin(Math.PI * 0.45) * r;

  if (isAiming) {
    // Apply wobble offset to the pull point for visual jitter
    const baseAngle = Math.atan2(
      pullPoint.y - bowAnchor.y,
      pullPoint.x - bowAnchor.x,
    );
    const wobbledAngle = baseAngle + wobbleOffset;
    const displayX = bowAnchor.x + Math.cos(wobbledAngle) * pullDist;
    const displayY = bowAnchor.y + Math.sin(wobbledAngle) * pullDist;

    ctx.strokeStyle = CONFIG.BAND_COLOR;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.lineTo(displayX, displayY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(botX, botY);
    ctx.lineTo(displayX, displayY);
    ctx.stroke();

    drawNockedArrow(displayX, displayY);
  } else {
    ctx.strokeStyle = CONFIG.BAND_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.lineTo(botX, botY);
    ctx.stroke();
  }
}

function drawNockedArrow(px: number, py: number): void {
  const dx = bowAnchor.x - px;
  const dy = bowAnchor.y - py;
  const angle = Math.atan2(dy, dx);
  const len = CONFIG.ARROW_LENGTH;

  const tipX = px + Math.cos(angle) * len * 0.6;
  const tipY = py + Math.sin(angle) * len * 0.6;
  const tailX = px - Math.cos(angle) * len * 0.4;
  const tailY = py - Math.sin(angle) * len * 0.4;

  ctx.strokeStyle = "#5C3A1E";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  const hs = CONFIG.ARROW_HEAD_SIZE;
  ctx.fillStyle = "#888";
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - Math.cos(angle - 0.4) * hs, tipY - Math.sin(angle - 0.4) * hs);
  ctx.lineTo(tipX - Math.cos(angle + 0.4) * hs, tipY - Math.sin(angle + 0.4) * hs);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#CC3333";
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(tailX + Math.cos(angle - 0.5) * 8, tailY + Math.sin(angle - 0.5) * 8);
  ctx.lineTo(tailX + Math.cos(angle) * 6, tailY + Math.sin(angle) * 6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(tailX + Math.cos(angle + 0.5) * 8, tailY + Math.sin(angle + 0.5) * 8);
  ctx.lineTo(tailX + Math.cos(angle) * 6, tailY + Math.sin(angle) * 6);
  ctx.closePath();
  ctx.fill();
}

function drawArrow(arrow: Arrow): void {
  const len = CONFIG.ARROW_LENGTH;
  const hs = CONFIG.ARROW_HEAD_SIZE;
  const a = arrow.angle;

  const tipX = arrow.x + Math.cos(a) * len * 0.6;
  const tipY = arrow.y + Math.sin(a) * len * 0.6;
  const tailX = arrow.x - Math.cos(a) * len * 0.4;
  const tailY = arrow.y - Math.sin(a) * len * 0.4;

  ctx.strokeStyle = "#5C3A1E";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(tipX, tipY);
  ctx.stroke();

  ctx.fillStyle = "#888";
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(tipX - Math.cos(a - 0.4) * hs, tipY - Math.sin(a - 0.4) * hs);
  ctx.lineTo(tipX - Math.cos(a + 0.4) * hs, tipY - Math.sin(a + 0.4) * hs);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#CC3333";
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(tailX + Math.cos(a - 0.5) * 8, tailY + Math.sin(a - 0.5) * 8);
  ctx.lineTo(tailX + Math.cos(a) * 6, tailY + Math.sin(a) * 6);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tailX, tailY);
  ctx.lineTo(tailX + Math.cos(a + 0.5) * 8, tailY + Math.sin(a + 0.5) * 8);
  ctx.lineTo(tailX + Math.cos(a) * 6, tailY + Math.sin(a) * 6);
  ctx.closePath();
  ctx.fill();
}

function drawTarget(): void {
  const rings = CONFIG.RING_COLORS;
  const t = target;

  for (let i = 0; i < rings.length; i++) {
    const r = t.radius * (1 - i / rings.length);
    ctx.fillStyle = rings[i];
    ctx.beginPath();
    ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "#333";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(t.x, t.y, t.radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawParticles(): void {
  for (const p of particles) {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFocusIndicator(): void {
  if (!isAiming || pullDist < 15) return;

  const steadiness = getSteadiness();

  // Ring around the bow that shrinks/changes color with steadiness
  const maxR = 30;
  const minR = 8;
  const r = maxR - (maxR - minR) * steadiness;

  // Color: red (shaky) → yellow → green (steady)
  let color: string;
  if (steadiness > 0.7) {
    color = `rgba(50, 220, 50, ${0.6 + steadiness * 0.4})`;
  } else if (steadiness > 0.3) {
    color = `rgba(220, 200, 50, 0.6)`;
  } else {
    color = `rgba(220, 80, 50, 0.5)`;
  }

  // Draw at bow anchor
  ctx.strokeStyle = color;
  ctx.lineWidth = steadiness > 0.7 ? 3 : 2;
  ctx.setLineDash(steadiness > 0.7 ? [] : [4, 4]);
  ctx.beginPath();
  ctx.arc(bowAnchor.x, bowAnchor.y, CONFIG.BOW_RADIUS + 10 + r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // "STEADY!" flash when very stable
  if (steadiness > 0.85) {
    ctx.fillStyle = "rgba(50, 255, 50, 0.8)";
    ctx.font = "bold 14px 'Inter', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("STEADY", bowAnchor.x, bowAnchor.y - CONFIG.BOW_RADIUS - 20);
    ctx.textAlign = "left";
  }
}

function drawArrowIcon(x: number, y: number, color: string): void {
  const len = 18;
  const headSize = 5;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + len, y);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x + len + headSize, y);
  ctx.lineTo(x + len - 2, y - headSize);
  ctx.lineTo(x + len - 2, y + headSize);
  ctx.closePath();
  ctx.fill();
}

function drawHUD(): void {
  // Timer — top center
  const secs = Math.ceil(timeRemaining / 1000);
  const timerText = secs.toString();
  const urgent = secs <= 5;

  ctx.textAlign = "center";
  ctx.font = `bold ${urgent ? 52 : 44}px 'Cinzel', serif`;
  ctx.fillStyle = urgent ? "#FF3333" : "rgba(255, 255, 255, 0.9)";
  ctx.shadowColor = urgent ? "rgba(255, 0, 0, 0.6)" : "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = urgent ? 20 : 10;
  ctx.fillText(timerText, w / 2, isMobile ? 130 : 70);
  ctx.shadowBlur = 0;
  ctx.textAlign = "left";

  // Arrow icons — bottom left
  const margin = 20;
  const baseY = isMobile ? 230 : 140;
  const color = arrowsLeft <= 2 ? "#FF4444" : "#dd7733";
  const cols = 4;
  const spacingX = 32;
  const spacingY = 14;

  for (let i = 0; i < arrowsLeft; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    drawArrowIcon(margin + col * spacingX, baseY + row * spacingY, color);
  }

  // Reload indicator
  if (reloadTimer > 0) {
    const pct = 1 - reloadTimer / CONFIG.RELOAD_TIME_MS;
    const barW = 60;
    const barH = 4;
    const barX = bowAnchor.x - barW / 2;
    const barY = bowAnchor.y + CONFIG.BOW_RADIUS + 30;

    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = "#dd7733";
    ctx.fillRect(barX, barY, barW * pct, barH);
  }
}

// ============= UPDATE =============
function update(dt: number): void {
  if (gameState !== "PLAYING") return;

  // Move clouds
  updateClouds(dt);

  // Move target
  updateTarget(dt);

  // Reload cooldown
  if (reloadTimer > 0) {
    reloadTimer -= dt;
    if (reloadTimer < 0) reloadTimer = 0;
  }

  // Update wobble
  updateWobble(dt);

  // Update arrows
  for (const arrow of arrows) {
    if (!arrow.active) continue;

    arrow.vy += CONFIG.GRAVITY * dt;
    arrow.x += arrow.vx * dt;
    arrow.y += arrow.vy * dt;
    arrow.angle = Math.atan2(arrow.vy, arrow.vx);

    if (arrow.y >= groundY) {
      arrow.active = false;
      continue;
    }

    if (arrow.x < -50 || arrow.x > w + 50 || arrow.y < -100) {
      arrow.active = false;
      continue;
    }

    const dx = arrow.x - target.x;
    const dy = arrow.y - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < CONFIG.TARGET_HIT_RADIUS) {
      arrow.active = false;

      const ringFrac = dist / target.radius;
      let points = 2;
      if (ringFrac < 0.2) points = 10;
      else if (ringFrac < 0.4) points = 8;
      else if (ringFrac < 0.6) points = 6;
      else if (ringFrac < 0.8) points = 4;

      score += points;
      currentScoreEl.textContent = score.toString();

      spawnHitParticles(target.x, target.y);
      triggerHaptic("success");
      repositionTarget();
      continue;
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= 0.002 * dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }

  // Clean up dead arrows
  arrows = arrows.filter((a) => a.active);

  // Countdown timer
  timeRemaining -= dt;
  if (timeRemaining <= 0) {
    timeRemaining = 0;
    gameOver();
  }

  // Game over if out of arrows and none in flight
  if (arrowsLeft <= 0 && arrows.length === 0 && !isAiming) {
    gameOver();
  }
}

// ============= INPUT =============
function getPointerPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
  if ("touches" in e && e.touches.length > 0) {
    return { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }
  if ("changedTouches" in e && e.changedTouches.length > 0) {
    return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
  }
  return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
}

function handlePointerDown(e: MouseEvent | TouchEvent): void {
  if (gameState !== "PLAYING") return;
  if (arrowsLeft <= 0) return;
  if (reloadTimer > 0) return;

  const pos = getPointerPos(e);
  const dx = pos.x - bowAnchor.x;
  const dy = pos.y - bowAnchor.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < CONFIG.PULL_ZONE_RADIUS) {
    isAiming = true;
    reachedMaxPull = false;
    pullPoint.x = pos.x;
    pullPoint.y = pos.y;
    pullDist = 0;
    aimHoldTime = 0;
    triggerHaptic("light");
    e.preventDefault();
  }
}

function handlePointerMove(e: MouseEvent | TouchEvent): void {
  if (!isAiming) return;

  const pos = getPointerPos(e);
  const dx = pos.x - bowAnchor.x;
  const dy = pos.y - bowAnchor.y;
  let dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > CONFIG.MAX_PULL) {
    const scale = CONFIG.MAX_PULL / dist;
    pullPoint.x = bowAnchor.x + dx * scale;
    pullPoint.y = bowAnchor.y + dy * scale;
    dist = CONFIG.MAX_PULL;

    if (!reachedMaxPull) {
      reachedMaxPull = true;
      triggerHaptic("medium");
    }
  } else {
    pullPoint.x = pos.x;
    pullPoint.y = pos.y;
    reachedMaxPull = false;
  }

  pullDist = dist;
  e.preventDefault();
}

function handlePointerUp(e: MouseEvent | TouchEvent): void {
  if (!isAiming) return;

  isAiming = false;

  if (pullDist < 15) {
    return;
  }

  // Fire arrow with wobble applied to direction
  const baseAngle = Math.atan2(
    bowAnchor.y - pullPoint.y,
    bowAnchor.x - pullPoint.x,
  );
  const fireAngle = baseAngle + wobbleOffset;
  const power = pullDist * CONFIG.POWER_SCALE;

  const arrow: Arrow = {
    x: bowAnchor.x,
    y: bowAnchor.y,
    vx: Math.cos(fireAngle) * power,
    vy: Math.sin(fireAngle) * power,
    active: true,
    angle: fireAngle,
  };

  arrows.push(arrow);
  arrowsLeft--;
  reloadTimer = CONFIG.RELOAD_TIME_MS;
  triggerHaptic("medium");

  e.preventDefault();
}

function setupInputHandlers(): void {
  canvas.addEventListener("mousedown", handlePointerDown);
  window.addEventListener("mousemove", handlePointerMove);
  window.addEventListener("mouseup", handlePointerUp);
  canvas.addEventListener("touchstart", handlePointerDown, { passive: false });
  window.addEventListener("touchmove", handlePointerMove, { passive: false });
  window.addEventListener("touchend", handlePointerUp, { passive: false });

  window.addEventListener("keydown", (e) => {
    if (gameState === "PLAYING") {
      if (e.key === "Escape") {
        pauseGame();
      }
    } else if (gameState === "PAUSED" && e.key === "Escape") {
      resumeGame();
    } else if (
      gameState === "START" &&
      (e.key === " " || e.key === "Enter")
    ) {
      startGame();
    }
  });

  document.getElementById("startButton")!.addEventListener("click", () => {
    triggerHaptic("light");
    startGame();
  });

  settingsBtn.addEventListener("click", () => {
    triggerHaptic("light");
    settingsModal.classList.remove("hidden");
  });

  document
    .getElementById("startSettingsBtn")
    ?.addEventListener("click", () => {
      triggerHaptic("light");
      settingsModal.classList.remove("hidden");
    });

  document.getElementById("settingsClose")!.addEventListener("click", () => {
    triggerHaptic("light");
    settingsModal.classList.add("hidden");
  });

  pauseBtn.addEventListener("click", () => {
    triggerHaptic("light");
    pauseGame();
  });

  document.getElementById("resumeButton")!.addEventListener("click", () => {
    triggerHaptic("light");
    resumeGame();
  });

  document
    .getElementById("pauseRestartButton")!
    .addEventListener("click", () => {
      triggerHaptic("light");
      pauseScreen.classList.add("hidden");
      startGame();
    });

  document
    .getElementById("pauseMenuButton")!
    .addEventListener("click", () => {
      triggerHaptic("light");
      showStartScreen();
    });

  document.getElementById("restartButton")!.addEventListener("click", () => {
    triggerHaptic("light");
    startGame();
  });

  document
    .getElementById("backToStartButton")!
    .addEventListener("click", () => {
      triggerHaptic("light");
      showStartScreen();
    });

  setupSettingsToggles();
}

function setupSettingsToggles(): void {
  const musicToggle = document.getElementById("musicToggle")!;
  const fxToggle = document.getElementById("fxToggle")!;
  const hapticToggle = document.getElementById("hapticToggle")!;

  musicToggle.classList.toggle("active", settings.music);
  fxToggle.classList.toggle("active", settings.fx);
  hapticToggle.classList.toggle("active", settings.haptics);

  musicToggle.addEventListener("click", () => {
    settings.music = !settings.music;
    musicToggle.classList.toggle("active", settings.music);
    saveSettings();
    triggerHaptic("light");
  });

  fxToggle.addEventListener("click", () => {
    settings.fx = !settings.fx;
    fxToggle.classList.toggle("active", settings.fx);
    saveSettings();
    triggerHaptic("light");
  });

  hapticToggle.addEventListener("click", () => {
    settings.haptics = !settings.haptics;
    hapticToggle.classList.toggle("active", settings.haptics);
    saveSettings();
    if (settings.haptics) {
      triggerHaptic("light");
    }
  });
}

// ============= GAME LOOP =============
function gameLoop(timestamp: number): void {
  const dt = Math.min(timestamp - lastTime, 50);
  lastTime = timestamp;

  update(dt);

  ctx.clearRect(0, 0, w, h);
  drawSky();
  drawSun();
  for (const c of clouds) drawCloud(c);
  drawGround();
  drawTower();
  drawArcher();
  drawTarget();
  drawFocusIndicator();
  drawBow();

  for (const arrow of arrows) {
    if (arrow.active) drawArrow(arrow);
  }

  drawParticles();

  if (gameState === "PLAYING") {
    drawHUD();
  }

  // Build number — always visible
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "11px monospace";
  ctx.textAlign = "right";
  ctx.fillText("build 7", w - 10, h - 10);
  ctx.textAlign = "left";

  animationFrameId = requestAnimationFrame(gameLoop);
}

// ============= INIT =============
function init(): void {
  console.log("[init] Initializing Archery Attack");

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  setupInputHandlers();
  initClouds();

  repositionTarget();

  requestAnimationFrame(gameLoop);

  showStartScreen();

  console.log("[init] Game initialized, isMobile:", isMobile);
}

init();
