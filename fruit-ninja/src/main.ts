/**
 * FRUIT NINJA - Knife Hit Style Game
 * 
 * A casual web game where players throw knives at rotating fruit slices.
 * 
 * Features:
 * - 100 procedurally generated levels
 * - 8+ rotation patterns with smooth transitions
 * - Angle-based collision detection
 * - Seeded RNG for deterministic level generation
 * - Mobile and desktop support
 * - Debug mode with level preview
 * 
 * Difficulty Tuning:
 * - Adjust MIN_FRUIT_RADIUS, MAX_FRUIT_RADIUS for fruit size range
 * - Modify MIN_EMBEDDED_KNIVES, MAX_EMBEDDED_KNIVES for starting knife count
 * - Change MIN_ROTATION_SPEED, MAX_ROTATION_SPEED for speed range
 * - Tweak COLLISION_THRESHOLD_MULTIPLIER for collision sensitivity
 * - Modify MIN_ANGULAR_SPACING for minimum gap between embedded knives
 */

// Import assets
import background1Url from "../Assets/Backgrounds/Back 1.png";
import background2Url from "../Assets/Backgrounds/Back 2.png";
import avocadoUrl from "../Assets/Targets/Fruit/Normal Fruit/avocado.png";
import orangeUrl from "../Assets/Targets/Fruit/Normal Fruit/orange.png";
import grapeUrl from "../Assets/Targets/Fruit/Normal Fruit/grape.png";
import watermelonUrl from "../Assets/Targets/Fruit/Normal Fruit/watermelon.png";
import kiwiUrl from "../Assets/Targets/Fruit/Normal Fruit/kiwi.png";
import lemonUrl from "../Assets/Targets/Fruit/Normal Fruit/lemon.png";
import knifeUrl from "../Assets/Weapons/Normal Knif.png";
import brokenKnife1Url from "../Assets/Weapons/broken1.png";
import brokenKnife2Url from "../Assets/Weapons/broken2.png";
import knifeIconUrl from "../Assets/Weapons/icon.png";

// Import sound effects
import wooshUrl from "../sfx/woosh.wav";
import stabUrl from "../sfx/stab.wav";
import brokeUrl from "../sfx/broke.wav";
import dullUrl from "../sfx/dull.wav";
import successUrl from "../sfx/success.wav";

// ============= CONFIGURATION =============
const CONFIG = {
  // Fruit
  MIN_FRUIT_RADIUS: 75,
  MAX_FRUIT_RADIUS: 150,
  FRUIT_CENTER_X: 0.5, // Ratio of screen width
  FRUIT_CENTER_Y: 0.45, // Ratio of screen height
  
  // Knives
  KNIFE_WIDTH: 8, // Angular width in degrees
  KNIFE_THROW_SPEED: 800, // Pixels per second
  KNIFE_THROW_DISTANCE: 400, // Max distance from bottom
  COLLISION_THRESHOLD_MULTIPLIER: 1.2, // Multiplier for collision detection
  MIN_ANGULAR_SPACING: 15, // Minimum degrees between embedded knives
  
  // Level Generation
  TOTAL_LEVELS: 100,
  MIN_EMBEDDED_KNIVES: 4, // Increased from 2 to make early levels harder
  MAX_EMBEDDED_KNIVES: 12,
  MIN_ROTATION_SPEED: 60, // Increased from 30 to make early levels faster
  MAX_ROTATION_SPEED: 180,
  MIN_KNIVES_TO_THROW: 5, // Increased from 3 to make early levels harder
  MAX_KNIVES_TO_THROW: 8,
  
  // Visual
  FRUIT_RINGS: 3,
  SEED_COUNT: 5,
  KNIFE_COLOR: "#2c3e50",
  FRUIT_COLORS: [
    { outer: "#ff6b6b", middle: "#ff8787", inner: "#ffa8a8" }, // Red (Apple)
    { outer: "#4ecdc4", middle: "#6edcd4", inner: "#8eece4" }, // Cyan (Lime)
    { outer: "#ffe66d", middle: "#ffed85", inner: "#fff39d" }, // Yellow (Lemon)
    { outer: "#a8e6cf", middle: "#b8f0d9", inner: "#c8fae3" }, // Green (Green Apple)
    { outer: "#ff9ff3", middle: "#ffb3f7", inner: "#ffc7fb" }, // Pink (Grapefruit)
  ],
  
  // Animation
  KNIFE_STICK_BOUNCE: 0.3, // Bounce factor when knife sticks
  KNIFE_STICK_DURATION: 200, // ms
  
  // Audio (optional - can be added later)
  SOUND_ENABLED: false,
};

// ============= TYPES =============
type GameState = "START" | "PLAYING" | "PAUSED" | "GAME_OVER" | "WIN";

interface Settings {
  music: boolean;
  fx: boolean;
  haptics: boolean;
}

interface LevelConfig {
  fruitRadius: number;
  embeddedKnives: number[];
  coins: number[]; // Angles for coins (similar to embedded knives)
  rotationSpeed: number;
  rotationDirection: number; // -1 or 1
  rotationPattern: RotationPatternType;
  knivesToThrow: number;
  patternParams?: any; // Pattern-specific parameters
}

type RotationPatternType =
  | "constant"
  | "ramp_up_down"
  | "reverse_smooth"
  | "pulse"
  | "alternating"
  | "breathing"
  | "staged"
  | "chaotic";

interface Knife {
  angle: number; // Angle when embedded (0-360)
  isFlying: boolean;
  flyX: number; // X position when flying
  flyY: number; // Y position when flying
  flyStartX: number;
  flyStartY: number;
  flyTime: number;
  stickBounce: number; // Animation value for stick bounce
  throwScale: number; // Animation scale when thrown (for juice)
  throwRotation: number; // Animation rotation when thrown
  isColliding: boolean; // Highlight in red when colliding
  transitionTargetX?: number; // Target X for transition (optional)
  transitionTargetY?: number; // Target Y for transition (optional)
  transitionDistance?: number; // Distance for transition trajectory
  transitionKnifeWidth?: number; // Knife width for transition
  transitionKnifeHeight?: number; // Knife height for transition
  embeddedRotation?: number; // Rotation to use when embedded (for transition knives)
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: "splash" | "drop"; // splash = burst outward, drop = falls down
}

interface BrokenKnifePiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  scale: number;
  life: number;
  maxLife: number;
  // Which broken sprite to use (1 or 2)
  spriteIndex: number;
}

interface Coin {
  angle: number; // Angle when embedded (0-360)
  collected: boolean; // Whether coin has been collected
  animating: boolean; // Whether coin is animating to top left
  animX: number; // Current animation X
  animY: number; // Current animation Y
  animProgress: number; // Animation progress (0-1)
  spawnScale: number; // Spawn animation scale (0-1)
}

interface Fruit {
  radius: number;
  rotationAngle: number; // Current rotation angle in degrees
  colorIndex: number;
  image: HTMLImageElement | null;
  hitDistortion: number; // Distortion effect when hit (0-1)
}

// ============= SEEDED RNG =============
class SeededRNG {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min;
  }

  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
}

// ============= ROTATION PATTERNS =============
type RotationPattern = (t: number, baseSpeed: number, direction: number, params?: any) => number;

const ROTATION_PATTERNS: Record<RotationPatternType, RotationPattern> = {
  // Constant speed
  constant: (t, baseSpeed, direction) => baseSpeed * direction,

  // Ramp up then ramp down (ease in/out)
  ramp_up_down: (t, baseSpeed, direction) => {
    const cycle = 4; // 4 second cycle
    const phase = (t % cycle) / cycle;
    let multiplier = 1;
    if (phase < 0.5) {
      // Ramp up
      multiplier = phase * 2; // 0 to 1
    } else {
      // Ramp down
      multiplier = 2 - phase * 2; // 1 to 0
    }
    return baseSpeed * direction * (0.5 + multiplier * 0.5); // 50% to 100% speed
  },

  // Slow CW -> smoothly reverse -> fast CCW -> loop
  reverse_smooth: (t, baseSpeed, direction) => {
    const cycle = 6;
    const phase = (t % cycle) / cycle;
    let speed = baseSpeed;
    let dir = direction;
    
    if (phase < 0.33) {
      // Slow CW
      speed = baseSpeed * 0.3;
      dir = direction;
    } else if (phase < 0.66) {
      // Smooth reverse (interpolate direction)
      const reversePhase = (phase - 0.33) / 0.33;
      speed = baseSpeed * (0.3 + reversePhase * 0.7);
      dir = direction * (1 - reversePhase * 2); // 1 -> -1
    } else {
      // Fast CCW
      speed = baseSpeed * 1.5;
      dir = -direction;
    }
    return speed * dir;
  },

  // Constant speed with periodic pulses
  pulse: (t, baseSpeed, direction) => {
    const pulseFreq = 2; // 2 pulses per second
    const pulse = Math.sin(t * Math.PI * 2 * pulseFreq);
    const multiplier = 0.7 + pulse * 0.3; // 70% to 100%
    return baseSpeed * direction * multiplier;
  },

  // Alternating direction every N seconds with smooth interpolation
  alternating: (t, baseSpeed, direction) => {
    const switchInterval = 3; // Switch every 3 seconds
    const phase = (t % (switchInterval * 2)) / switchInterval;
    let dir = direction;
    
    if (phase < 0.5) {
      // First half: original direction
      dir = direction;
    } else {
      // Second half: reverse direction (with smooth transition)
      const transition = (phase - 0.5) * 2; // 0 to 1
      const smoothTransition = transition * transition * (3 - 2 * transition); // Smoothstep
      dir = direction * (1 - smoothTransition * 2); // 1 -> -1
    }
    return baseSpeed * dir;
  },

  // "Breathing" speed: sin wave modulation around base speed
  breathing: (t, baseSpeed, direction) => {
    const breathFreq = 0.5; // Slow breathing
    const breath = Math.sin(t * Math.PI * 2 * breathFreq);
    const multiplier = 0.6 + breath * 0.4; // 60% to 100%
    return baseSpeed * direction * multiplier;
  },

  // Staged pattern: segment A (slow), segment B (fast), segment C (reverse), repeat
  staged: (t, baseSpeed, direction) => {
    const cycle = 8;
    const phase = (t % cycle) / cycle;
    let speed = baseSpeed;
    let dir = direction;
    
    if (phase < 0.33) {
      // Segment A: slow
      speed = baseSpeed * 0.4;
      dir = direction;
    } else if (phase < 0.66) {
      // Segment B: fast
      speed = baseSpeed * 1.3;
      dir = direction;
    } else {
      // Segment C: reverse
      speed = baseSpeed * 0.8;
      dir = -direction;
    }
    return speed * dir;
  },

  // Chaotic: random-like but smooth
  chaotic: (t, baseSpeed, direction) => {
    // Use multiple sine waves for chaotic but smooth motion
    const wave1 = Math.sin(t * 0.7);
    const wave2 = Math.sin(t * 1.3);
    const wave3 = Math.sin(t * 2.1);
    const combined = (wave1 + wave2 * 0.5 + wave3 * 0.25) / 1.75;
    const multiplier = 0.5 + combined * 0.5; // 0% to 100%
    const dirMultiplier = Math.sin(t * 0.4) > 0 ? 1 : -1;
    return baseSpeed * direction * multiplier * dirMultiplier;
  },
};

// Smooth acceleration limiter
function applyAccelerationLimit(
  currentVelocity: number,
  targetVelocity: number,
  dt: number,
  maxAccel: number = 60 // degrees per second squared
): number {
  const diff = targetVelocity - currentVelocity;
  const maxChange = maxAccel * dt;
  if (Math.abs(diff) <= maxChange) {
    return targetVelocity;
  }
  return currentVelocity + Math.sign(diff) * maxChange;
}

// ============= LEVEL GENERATOR =============
class LevelGenerator {
  private rng: SeededRNG;

  constructor(seed: number = 12345) {
    this.rng = new SeededRNG(seed);
  }

  generateLevel(levelIndex: number): LevelConfig {
    // Difficulty ramps gradually
    const progress = levelIndex / (CONFIG.TOTAL_LEVELS - 1); // 0 to 1
    
    // Fruit radius (slightly smaller as difficulty increases)
    const fruitRadius = CONFIG.MIN_FRUIT_RADIUS + 
      (CONFIG.MAX_FRUIT_RADIUS - CONFIG.MIN_FRUIT_RADIUS) * (1 - progress * 0.3);
    
    // Embedded knives (more as difficulty increases, steeper curve for early levels)
    // Use a curve that starts higher and ramps faster: progress^0.7 makes early levels harder
    const embeddedKnifeProgress = Math.pow(progress, 0.7); // Steeper curve
    const embeddedKnives = this.generateEmbeddedKnives(
      Math.floor(CONFIG.MIN_EMBEDDED_KNIVES + 
        (CONFIG.MAX_EMBEDDED_KNIVES - CONFIG.MIN_EMBEDDED_KNIVES) * embeddedKnifeProgress),
      fruitRadius
    );
    
    // Rotation speed (faster as difficulty increases, steeper curve for early levels)
    // Use a curve that starts higher and ramps faster
    const speedProgress = Math.pow(progress, 0.7); // Steeper curve
    const rotationSpeed = (CONFIG.MIN_ROTATION_SPEED + 
      (CONFIG.MAX_ROTATION_SPEED - CONFIG.MIN_ROTATION_SPEED) * speedProgress) * 1.5;
    
    // Rotation direction
    const rotationDirection = this.rng.next() < 0.5 ? -1 : 1;
    
    // Rotation pattern (more complex patterns in later levels)
    const patternTypes: RotationPatternType[] = [
      "constant",
      "ramp_up_down",
      "pulse",
      "breathing",
    ];
    
    if (progress > 0.3) {
      patternTypes.push("alternating", "reverse_smooth");
    }
    if (progress > 0.6) {
      patternTypes.push("staged");
    }
    if (progress > 0.8) {
      patternTypes.push("chaotic");
    }
    
    const rotationPattern = this.rng.choice(patternTypes);
    
    // Knives to throw (more in later levels, steeper curve for early levels)
    const throwProgress = Math.pow(progress, 0.7); // Steeper curve
    const knivesToThrow = Math.floor(
      CONFIG.MIN_KNIVES_TO_THROW + 
      (CONFIG.MAX_KNIVES_TO_THROW - CONFIG.MIN_KNIVES_TO_THROW) * throwProgress
    );
    
    // Generate coins (ensure they don't overlap with knives)
    const coinCount = Math.max(1, Math.floor(2 + progress * 3)); // 2-5 coins
    const coins = this.generateCoins(coinCount, embeddedKnives, fruitRadius);
    
    return {
      fruitRadius: Math.round(fruitRadius),
      embeddedKnives,
      coins,
      rotationSpeed,
      rotationDirection,
      rotationPattern,
      knivesToThrow,
    };
  }

  private generateEmbeddedKnives(count: number, fruitRadius: number): number[] {
    // Evenly distribute knives around the circumference
    const angles: number[] = [];
    
    if (count === 0) {
      return angles;
    }
    
    // Calculate equal spacing: 360 degrees divided by number of knives
    const spacing = 360 / count;
    
    // Start at a random offset to add variety, then space evenly
    const startOffset = this.rng.nextFloat(0, 360);
    
    for (let i = 0; i < count; i++) {
      // Evenly space each knife around the circle
      const angle = normalizeAngle(startOffset + (i * spacing));
      angles.push(angle);
    }
    
    return angles.sort((a, b) => a - b);
  }

  private generateCoins(count: number, knifeAngles: number[], fruitRadius: number): number[] {
    // Generate coins that don't overlap with knives
    const angles: number[] = [];
    const minDistanceFromKnife = 30; // Minimum degrees between coin and knife
    
    if (count === 0) {
      return angles;
    }
    
    // Calculate equal spacing for coins
    const spacing = 360 / count;
    const startOffset = this.rng.nextFloat(0, 360);
    
    let attempts = 0;
    const maxAttempts = count * 50;
    
    while (angles.length < count && attempts < maxAttempts) {
      // Try evenly spaced positions first
      const baseAngle = normalizeAngle(startOffset + (angles.length * spacing));
      
      // Try the base angle and nearby positions
      let angle = baseAngle;
      let valid = false;
      
      // Check multiple positions around the base angle
      for (let offset = 0; offset < 360 && !valid; offset += 5) {
        angle = normalizeAngle(baseAngle + offset);
        valid = true;
        
        // Check distance from all knives
        for (const knifeAngle of knifeAngles) {
          const diff = angleDifference(angle, knifeAngle);
          if (diff < minDistanceFromKnife) {
            valid = false;
            break;
          }
        }
        
        // Check distance from already placed coins
        for (const existingCoin of angles) {
          const diff = angleDifference(angle, existingCoin);
          if (diff < minDistanceFromKnife) {
            valid = false;
            break;
          }
        }
        
        if (valid) {
          break;
        }
      }
      
      if (valid) {
        angles.push(angle);
      } else {
        // If evenly spaced doesn't work, try random positions
        const randomAngle = this.rng.nextFloat(0, 360);
        let randomValid = true;
        
        for (const knifeAngle of knifeAngles) {
          const diff = angleDifference(randomAngle, knifeAngle);
          if (diff < minDistanceFromKnife) {
            randomValid = false;
            break;
          }
        }
        
        for (const existingCoin of angles) {
          const diff = angleDifference(randomAngle, existingCoin);
          if (diff < minDistanceFromKnife) {
            randomValid = false;
            break;
          }
        }
        
        if (randomValid) {
          angles.push(randomAngle);
        }
      }
      
      attempts++;
    }
    
    return angles.sort((a, b) => a - b);
  }

  generateAllLevels(): LevelConfig[] {
    const levels: LevelConfig[] = [];
    for (let i = 0; i < CONFIG.TOTAL_LEVELS; i++) {
      levels.push(this.generateLevel(i));
    }
    return levels;
  }
}

// ============= UTILITY FUNCTIONS =============
function normalizeAngle(angle: number): number {
  angle = angle % 360;
  if (angle < 0) angle += 360;
  return angle;
}

function angleDifference(a1: number, a2: number): number {
  const diff = normalizeAngle(a1 - a2);
  return Math.min(diff, 360 - diff);
}

// ============= GAME CLASS =============
class KnifeHitGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState = "PLAYING";
  private settings: Settings = { music: true, fx: true, haptics: true };
  
  // Game objects
  private fruit: Fruit;
  private knives: Knife[] = [];
  private coins: Coin[] = [];
  private totalCoins: number = 0; // Total coins collected
  private knivesToThrow: number = 0;
  private currentLevel: number = 0;
  private levels: LevelConfig[] = [];
  private levelGenerator: LevelGenerator;
  
  // Rotation
  private rotationTime: number = 0;
  private currentAngularVelocity: number = 0;
  private targetAngularVelocity: number = 0;
  
  // Animation
  private lastTime: number = 0;
  private debugMode: boolean = false;
  
  // Effects
  private particles: Particle[] = [];
  private brokenKnifePieces: BrokenKnifePiece[] = [];
  private screenShake: { x: number; y: number; time: number } = { x: 0, y: 0, time: 0 };
  private screenFlash: { active: boolean; time: number; duration: number } = { active: false, time: 0, duration: 0.15 };
  private backgroundOverlay: { target: number; current: number; speed: number } = { target: 0, current: 0, speed: 2.0 }; // 0 = normal, negative = darker, positive = brighter
  
  // Level transition
  private transitionActive: boolean = false;
  private transitionTime: number = 0;
  private transitionPhase: "bg_slide" | "fruit_zoom" | "knives_fly" | "complete" = "bg_slide";
  private bgSlideOffset: number = 0; // Background slides down from top
  private fruitZoomScale: number = 0; // Fruit zooms in from 0 to 1
  private fruitWiggleTime: number = 0; // Wiggle animation after zoom
  private embeddedKnivesFlying: boolean = false; // Track if embedded knives are flying in
  
  // Slow motion and camera
  private slowMoActive: boolean = false;
  private slowMoTime: number = 0;
  private slowMoDuration: number = 1.5; // seconds
  private cameraZoom: number = 1.0;
  private cameraTargetZoom: number = 1.0;
  private cameraX: number = 0;
  private cameraY: number = 0;
  private cameraTargetX: number = 0;
  private cameraTargetY: number = 0;
  
  // Celebration
  private celebrationActive: boolean = false;
  private celebrationTime: number = 0;
  private encouragementText: string = "";
  private encouragementX: number = -500; // Start off screen
  private tapToContinueOpacity: number = 1.0;
  private tapToContinueFlicker: number = 0;
  
  // Collision prediction and game over
  private collisionPredicted: boolean = false;
  private collisionKnifeIndex: number = -1; // Index of flying knife that will collide
  private collisionEmbeddedKnifeIndex: number = -1; // Index of embedded knife being hit
  private collisionPoint: { x: number; y: number } | null = null;
  private gameOverActive: boolean = false;
  private tapToRetryOpacity: number = 1.0;
  private tapToRetryFlicker: number = 0;
  
  // Assets
  private background1Image: HTMLImageElement | null = null;
  private background2Image: HTMLImageElement | null = null;
  private avocadoImage: HTMLImageElement | null = null;
  private orangeImage: HTMLImageElement | null = null;
  private grapeImage: HTMLImageElement | null = null;
  private watermelonImage: HTMLImageElement | null = null;
  private kiwiImage: HTMLImageElement | null = null;
  private lemonImage: HTMLImageElement | null = null;
  private knifeImage: HTMLImageElement | null = null;
  private brokenKnife1Image: HTMLImageElement | null = null;
  private brokenKnife2Image: HTMLImageElement | null = null;
  private knifeIconImage: HTMLImageElement | null = null;
  private assetsLoaded: boolean = false;
  
  // Audio
  private wooshSound: HTMLAudioElement | null = null;
  private stabSound: HTMLAudioElement | null = null;
  private brokeSound: HTMLAudioElement | null = null;
  private dullSound: HTMLAudioElement | null = null;
  private successSound: HTMLAudioElement | null = null;
  private transitionSound: HTMLAudioElement | null = null;
  private spawnSound: HTMLAudioElement | null = null;
  
  // UI Elements
  private startScreen: HTMLElement;
  private gameOverScreen: HTMLElement;
  private winScreen: HTMLElement;
  private pauseScreen: HTMLElement;
  private settingsModal: HTMLElement;
  private levelDisplay: HTMLElement;
  private coinDisplay: HTMLElement;
  private bottomHud: HTMLElement;
  private knifePreviewImage: HTMLImageElement;
  private flyingKnifeSprite: HTMLImageElement;
  private knivesCount: HTMLElement;
  private knifeIconsContainer: HTMLElement;
  private debugPanel: HTMLElement;
  private debugContent: HTMLElement;
  private settingsIconBtn: HTMLElement;
  private settingsBtn: HTMLElement;

  constructor() {
    this.canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    this.ctx = this.canvas.getContext("2d")!;
    
    // Initialize UI
    this.startScreen = document.getElementById("startScreen")!;
    this.gameOverScreen = document.getElementById("gameOverScreen")!;
    this.winScreen = document.getElementById("winScreen")!;
    this.pauseScreen = document.getElementById("pauseScreen")!;
    this.settingsModal = document.getElementById("settingsModal")!;
    this.levelDisplay = document.getElementById("levelDisplay")!;
    this.coinDisplay = document.getElementById("coinDisplay")!;
    this.bottomHud = document.getElementById("bottomHud")!;
    this.knifePreviewImage = document.getElementById("knifePreviewImage") as HTMLImageElement;
    this.flyingKnifeSprite = document.getElementById("flyingKnifeSprite") as HTMLImageElement;
    this.knivesCount = document.getElementById("knivesCount")!;
    this.knifeIconsContainer = document.getElementById("knifeIconsContainer")!;
    this.debugPanel = document.getElementById("debugPanel")!;
    this.debugContent = document.getElementById("debugContent")!;
    this.settingsIconBtn = document.getElementById("settingsIconBtn")!;
    this.settingsBtn = document.getElementById("settingsBtn")!;
    
    // Generate levels
    this.levelGenerator = new LevelGenerator(12345);
    this.levels = this.levelGenerator.generateAllLevels();
    
    // Load assets
    this.loadAssets();
    
    // Setup event listeners
    this.setupEventListeners();
    this.setupSettings();
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());
    
    // Load settings
    this.loadSettings();
    
    // Start game loop
    this.gameLoop(0);
  }

  private loadAssets(): void {
    let loadedCount = 0;
    const totalAssets = 10; // 2 backgrounds + 6 fruits + 1 knife + 1 knife icon
    
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === totalAssets) {
        this.assetsLoaded = true;
        console.log("[KnifeHitGame] All assets loaded");
        // Start game immediately after assets load
        this.startGame();
      }
    };
    
    // Load background 1
    this.background1Image = new Image();
    this.background1Image.src = background1Url;
    this.background1Image.onload = checkAllLoaded;
    this.background1Image.onerror = () => {
      console.warn("[KnifeHitGame] Failed to load background1");
      checkAllLoaded();
    };
    
    // Load background 2
    this.background2Image = new Image();
    this.background2Image.src = background2Url;
    this.background2Image.onload = checkAllLoaded;
    this.background2Image.onerror = () => {
      console.warn("[KnifeHitGame] Failed to load background2");
      checkAllLoaded();
    };
    
    // Load avocado
    this.avocadoImage = new Image();
    this.avocadoImage.src = avocadoUrl;
    this.avocadoImage.onload = checkAllLoaded;
    this.avocadoImage.onerror = () => {
      console.warn("[KnifeHitGame] Failed to load avocado");
      checkAllLoaded();
    };
    
    // Load orange
    this.orangeImage = new Image();
    this.orangeImage.src = orangeUrl;
    this.orangeImage.onload = checkAllLoaded;
    this.orangeImage.onerror = () => {
      console.warn("[KnifeHitGame] Failed to load orange");
      checkAllLoaded();
    };
    
    // Load grape
    this.grapeImage = new Image();
    this.grapeImage.src = grapeUrl;
    this.grapeImage.onload = checkAllLoaded;
    this.grapeImage.onerror = () => {
      console.warn("[KnifeHitGame] Failed to load grape");
      checkAllLoaded();
    };
    
    // Load watermelon
    this.watermelonImage = new Image();
    this.watermelonImage.src = watermelonUrl;
    this.watermelonImage.onload = checkAllLoaded;
    this.watermelonImage.onerror = () => {
      console.warn("[KnifeHitGame] Failed to load watermelon");
      checkAllLoaded();
    };
    
    // Load kiwi
    this.kiwiImage = new Image();
    this.kiwiImage.src = kiwiUrl;
    this.kiwiImage.onload = checkAllLoaded;
    this.kiwiImage.onerror = () => {
      console.warn("[KnifeHitGame] Failed to load kiwi");
      checkAllLoaded();
    };
    
    // Load lemon
    this.lemonImage = new Image();
    this.lemonImage.src = lemonUrl;
    this.lemonImage.onload = checkAllLoaded;
    this.lemonImage.onerror = () => {
      console.warn("[KnifeHitGame] Failed to load lemon");
      checkAllLoaded();
    };
    
    // Load knife
    this.knifeImage = new Image();
    this.knifeImage.src = knifeUrl;
    this.knifeImage.onload = checkAllLoaded;
    this.knifeImage.onerror = () => {
      console.warn("[KnifeHitGame] Failed to load knife");
      checkAllLoaded();
    };
    
    // Load broken knife sprites
    this.brokenKnife1Image = new Image();
    this.brokenKnife1Image.src = brokenKnife1Url;
    this.brokenKnife1Image.onload = checkAllLoaded;
    this.brokenKnife1Image.onerror = () => {
      console.warn("[KnifeHitGame] Failed to load broken knife 1");
      checkAllLoaded();
    };
    
    this.brokenKnife2Image = new Image();
    this.brokenKnife2Image.src = brokenKnife2Url;
    this.brokenKnife2Image.onload = checkAllLoaded;
    this.brokenKnife2Image.onerror = () => {
      console.warn("[KnifeHitGame] Failed to load broken knife 2");
      checkAllLoaded();
    };
    
    // Load knife icon
    this.knifeIconImage = new Image();
    this.knifeIconImage.src = knifeIconUrl;
    this.knifeIconImage.onload = checkAllLoaded;
    this.knifeIconImage.onerror = () => {
      console.warn("[KnifeHitGame] Failed to load knife icon");
      checkAllLoaded();
    };
    
    // Load audio files (all at same volume level)
    this.wooshSound = new Audio(wooshUrl);
    this.wooshSound.preload = "auto";
    this.wooshSound.volume = 0.5; // 50% volume
    
    this.stabSound = new Audio(stabUrl);
    this.stabSound.preload = "auto";
    this.stabSound.volume = 1.0;
    
    this.brokeSound = new Audio(brokeUrl);
    this.brokeSound.preload = "auto";
    this.brokeSound.volume = 1.0;
    
    this.dullSound = new Audio(dullUrl);
    this.dullSound.preload = "auto";
    this.dullSound.volume = 1.0;
    
    this.successSound = new Audio(successUrl);
    this.successSound.preload = "auto";
    this.successSound.volume = 1.0;
    
    // Create transition and spawn sounds using Web Audio API
    this.transitionSound = this.createTransitionSound();
    this.spawnSound = this.createSpawnSound();
    this.plingSound = this.createPlingSound();
  }
  
  private createTransitionSound(): HTMLAudioElement {
    // Create a simple transition sound using a data URL
    // This is a placeholder - in production, you'd use a generated audio file
    const audio = new Audio();
    // Use a simple approach: create audio programmatically
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const duration = 0.5;
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / audioContext.sampleRate;
        const fadeIn = Math.min(1, t / 0.1);
        const fadeOut = Math.min(1, (duration - t) / 0.1);
        const envelope = fadeIn * fadeOut;
        const freq = 400 + (200 * (1 - t / duration));
        data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.3;
      }
      
      // Store buffer for later playback
      (audio as any).audioBuffer = buffer;
      (audio as any).audioContext = audioContext;
    } catch (e) {
      console.warn("[KnifeHitGame] Failed to create transition sound:", e);
    }
    
    audio.volume = 1.0;
    return audio;
  }
  
  private createSpawnSound(): HTMLAudioElement {
    // Create a simple spawn sound using a data URL
    const audio = new Audio();
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const duration = 0.3;
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / audioContext.sampleRate;
        const envelope = Math.exp(-t * 15) * (1 - t / duration);
        const freq = 600 + (300 * (1 - t / duration));
        data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.4;
      }
      
      // Store buffer for later playback
      (audio as any).audioBuffer = buffer;
      (audio as any).audioContext = audioContext;
    } catch (e) {
      console.warn("[KnifeHitGame] Failed to create spawn sound:", e);
    }
    
    audio.volume = 1.0;
    return audio;
  }
  
  private playGeneratedSound(sound: HTMLAudioElement): void {
    if (!sound || !this.settings.fx) return;
    
    try {
      const audioContext = (sound as any).audioContext;
      const buffer = (sound as any).audioBuffer;
      
      if (audioContext && buffer) {
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();
        source.buffer = buffer;
        gainNode.gain.value = 1.0;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        source.start();
      }
    } catch (e) {
      console.warn("[KnifeHitGame] Failed to play generated sound:", e);
    }
  }
  
  private createPlingSound(): HTMLAudioElement {
    const audio = new Audio();
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const duration = 0.2;
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * duration, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / audioContext.sampleRate;
        const envelope = Math.exp(-t * 20) * (1 - t / duration);
        // Higher frequency for a "pling" sound
        const freq = 800 + (400 * (1 - t / duration));
        data[i] = Math.sin(2 * Math.PI * freq * t) * envelope * 0.5;
      }
      
      (audio as any).audioBuffer = buffer;
      (audio as any).audioContext = audioContext;
    } catch (e) {
      console.warn("[KnifeHitGame] Failed to create pling sound:", e);
    }
    audio.volume = 1.0;
    return audio;
  }

  private setupEventListeners(): void {
    // Start button
    document.getElementById("startButton")!.addEventListener("click", () => {
      this.triggerHaptic("light");
      this.startGame();
    });
    
    // Restart button
    document.getElementById("restartButton")!.addEventListener("click", () => {
      this.triggerHaptic("light");
      this.restart();
    });
    
    // Menu buttons
    document.getElementById("menuButton")!.addEventListener("click", () => {
      this.triggerHaptic("light");
      this.showMenu();
    });
    document.getElementById("menuButtonWin")!.addEventListener("click", () => {
      this.triggerHaptic("light");
      this.showMenu();
    });
    document.getElementById("menuButtonPause")!.addEventListener("click", () => {
      this.triggerHaptic("light");
      this.showMenu();
    });
    
    // Next level button
    document.getElementById("nextLevelButton")!.addEventListener("click", () => {
      this.triggerHaptic("light");
      this.nextLevel();
    });
    
    // Settings (top right button)
    this.settingsBtn.addEventListener("click", () => {
      this.triggerHaptic("light");
      this.showSettings();
    });
    
    // Settings (HUD icon)
    this.settingsIconBtn.addEventListener("click", () => {
      this.triggerHaptic("light");
      this.showSettings();
    });
    document.getElementById("closeSettings")!.addEventListener("click", () => {
      this.triggerHaptic("light");
      this.hideSettings();
    });
    
    // Input
    this.canvas.addEventListener("click", (e) => this.handleInput(e));
    this.canvas.addEventListener("touchstart", (e) => {
      e.preventDefault();
      this.handleInput(e);
    });
    window.addEventListener("keydown", (e) => {
      if (e.code === "Space") {
        e.preventDefault();
        if (this.state === "PLAYING") {
          this.throwKnife();
        }
      } else if (e.code === "KeyL" && this.state === "PLAYING") {
        // Debug: Skip level
        this.nextLevel();
      } else if (e.code === "KeyR") {
        // Debug: Restart
        this.restart();
      } else if (e.code === "KeyD") {
        // Debug: Toggle debug panel
        this.debugMode = !this.debugMode;
        this.debugPanel.classList.toggle("visible", this.debugMode);
      }
    });
  }

  private setupSettings(): void {
    const musicToggle = document.getElementById("musicToggle")!;
    const fxToggle = document.getElementById("fxToggle")!;
    const hapticsToggle = document.getElementById("hapticsToggle")!;
    
    musicToggle.addEventListener("click", () => {
      this.settings.music = !this.settings.music;
      musicToggle.classList.toggle("active", this.settings.music);
      this.saveSettings();
    });
    
    fxToggle.addEventListener("click", () => {
      this.settings.fx = !this.settings.fx;
      fxToggle.classList.toggle("active", this.settings.fx);
      this.saveSettings();
    });
    
    hapticsToggle.addEventListener("click", () => {
      this.settings.haptics = !this.settings.haptics;
      hapticsToggle.classList.toggle("active", this.settings.haptics);
      this.saveSettings();
    });
    
    // Initialize toggle states
    musicToggle.classList.toggle("active", this.settings.music);
    fxToggle.classList.toggle("active", this.settings.fx);
    hapticsToggle.classList.toggle("active", this.settings.haptics);
  }

  private loadSettings(): void {
    const saved = localStorage.getItem("knifeHitSettings");
    if (saved) {
      this.settings = { ...this.settings, ...JSON.parse(saved) };
    }
  }

  private saveSettings(): void {
    localStorage.setItem("knifeHitSettings", JSON.stringify(this.settings));
  }

  private resizeCanvas(): void {
    const container = this.canvas.parentElement!;
    this.canvas.width = container.clientWidth;
    this.canvas.height = container.clientHeight;
  }

  private handleInput(e: MouseEvent | TouchEvent): void {
    if (this.state === "PLAYING") {
      this.throwKnife();
    } else if (this.state === "WIN" && this.celebrationActive) {
      // Tap to continue to next level
      this.celebrationActive = false;
      // Reset background overlay before next level
      this.backgroundOverlay.target = 0;
      this.nextLevel();
    } else if (this.state === "GAME_OVER" && this.gameOverActive) {
      // Tap to retry
      this.restart();
    } else if (this.state === "START") {
      this.startGame();
    }
  }

  private throwKnife(): void {
    if (this.transitionActive) return; // Don't allow throwing during transition
    if (this.knivesToThrow <= 0) return;
    if (this.knives.some(k => k.isFlying)) return; // Only one knife flying at a time
    
    // Get the preview knife position from bottom HUD
    const previewRect = this.knifePreviewImage.getBoundingClientRect();
    const containerRect = this.canvas.getBoundingClientRect();
    const previewX = previewRect.left + previewRect.width / 2;
    const previewY = previewRect.top + previewRect.height / 2;
    
    // Get fruit center position
    const fruitCenterX = this.canvas.width * CONFIG.FRUIT_CENTER_X;
    const fruitCenterY = this.canvas.height * CONFIG.FRUIT_CENTER_Y;
    const fruitScreenX = containerRect.left + (fruitCenterX / this.canvas.width) * containerRect.width;
    const fruitScreenY = containerRect.top + (fruitCenterY / this.canvas.height) * containerRect.height;
    
    // Make the preview knife itself fly
    if (this.knifeImage && this.assetsLoaded) {
      const imageWidth = this.knifeImage.naturalWidth || this.knifeImage.width;
      const imageHeight = this.knifeImage.naturalHeight || this.knifeImage.height;
      const aspectRatio = imageWidth / imageHeight;
      // Use same size as embedded knives (radius * 0.6)
      const fruitRadius = this.fruit ? this.fruit.radius : 120;
      const baseSize = fruitRadius * 0.6;
      let width: number;
      let height: number;
      
      if (aspectRatio > 1) {
        width = baseSize;
        height = baseSize / aspectRatio;
      } else {
        height = baseSize;
        width = baseSize * aspectRatio;
      }
      
      // Use separate flying knife sprite instead of preview image
      // Store base size for scaling with camera zoom
      this.flyingKnifeSprite.src = this.knifeImage.src;
      this.flyingKnifeSprite.setAttribute("data-base-width", width.toString());
      this.flyingKnifeSprite.setAttribute("data-base-height", height.toString());
      
      // Initial size (will be scaled with camera zoom in update loop)
      this.flyingKnifeSprite.style.left = `${previewX - width / 2}px`;
      this.flyingKnifeSprite.style.top = `${previewY - height / 2}px`;
      this.flyingKnifeSprite.style.width = `${width}px`;
      this.flyingKnifeSprite.style.height = `${height}px`;
      this.flyingKnifeSprite.style.display = "block";
      this.flyingKnifeSprite.style.opacity = "1";
      
      // Set initial rotation based on image orientation (reuse variables already declared above)
      const isHorizontal = aspectRatio > 1;
      const rotationDeg = isHorizontal ? 0 : 90; // If already horizontal, no rotation needed
      this.flyingKnifeSprite.style.transform = `rotate(${rotationDeg}deg)`;
    }
    
    // Convert to canvas coordinates for game logic
    const canvasX = ((previewX - containerRect.left) / containerRect.width) * this.canvas.width;
    const canvasY = ((previewY - containerRect.top) / containerRect.height) * this.canvas.height;
    
    const knife: Knife = {
      angle: 0, // Will be set when it sticks
      isFlying: true,
      flyX: canvasX,
      flyY: canvasY,
      flyStartX: canvasX,
      flyStartY: canvasY,
      flyTime: 0,
      stickBounce: 0,
      throwScale: 1.0, // No scale animation
      throwRotation: 0, // No rotation animation
      isColliding: false,
    };
    
    this.knives.push(knife);
    this.knivesToThrow--;
    
    // Check if this is the last knife - trigger slow motion
    const isLastKnife = this.knivesToThrow === 0;
    if (isLastKnife) {
      this.slowMoActive = true;
      this.slowMoTime = 0;
      this.cameraTargetZoom = 2.0; // Zoom in 2x
      
      // Target camera to where knife will hit the fruit (fruit center)
      const fruitCenterX = this.canvas.width * CONFIG.FRUIT_CENTER_X;
      const fruitCenterY = this.canvas.height * CONFIG.FRUIT_CENTER_Y;
      // Don't offset camera - just zoom to fruit center
      this.cameraTargetX = 0;
      this.cameraTargetY = 0;
    }
    
    // Immediately show the next knife in the preview (flying knife is separate now)
    // Show preview even if it's the last knife (before it was thrown)
    this.updateKnivesRemaining();
    this.triggerHaptic("light");
    
    // Play woosh sound when throwing knife
    if (this.settings.fx && this.wooshSound) {
      this.wooshSound.currentTime = 0;
      this.wooshSound.play().catch(() => {
        // Ignore audio play errors (e.g., user hasn't interacted yet)
      });
    }
  }

  private startGame(): void {
    this.currentLevel = 0;
    this.loadLevel(this.currentLevel);
    this.state = "PLAYING";
    this.startScreen.classList.add("hidden");
    this.gameOverScreen.classList.add("hidden");
    this.winScreen.classList.add("hidden");
    this.pauseScreen.classList.add("hidden");
    this.settingsIconBtn.classList.remove("hidden");
    this.settingsBtn.classList.remove("hidden");
    this.updateKnivesRemaining(); // Show bottom HUD
  }

  private loadLevel(levelIndex: number): void {
    if (levelIndex >= this.levels.length) {
      // Game complete!
      this.state = "GAME_OVER";
      return;
    }
    
    const level = this.levels[levelIndex];
    this.currentLevel = levelIndex;
    
    // Create fruit (cycle through available fruit images)
    const fruitImages = [
      this.avocadoImage,
      this.orangeImage,
      this.grapeImage,
      this.watermelonImage,
      this.kiwiImage,
      this.lemonImage,
    ].filter(img => img !== null); // Filter out any null images
    
    const fruitImageIndex = levelIndex % fruitImages.length;
    this.fruit = {
      radius: level.fruitRadius,
      rotationAngle: 0,
      colorIndex: levelIndex % CONFIG.FRUIT_COLORS.length,
      image: fruitImages[fruitImageIndex] || null,
      hitDistortion: 0,
    };
    
    // Create embedded knives - initially set as flying from sides
    // Use same logic as gameplay knife throw
    const w = this.canvas.width;
    const h = this.canvas.height;
    const fruitCenterX = w * CONFIG.FRUIT_CENTER_X;
    const fruitCenterY = h * CONFIG.FRUIT_CENTER_Y;
    
    // Calculate knife size (same as gameplay)
    let knifeWidth = 180;
    let knifeHeight = 180;
    if (this.knifeImage && this.assetsLoaded) {
      const imageWidth = this.knifeImage.naturalWidth || this.knifeImage.width;
      const imageHeight = this.knifeImage.naturalHeight || this.knifeImage.height;
      const aspectRatio = imageWidth / imageHeight;
      const fruitRadius = level.fruitRadius;
      const baseSize = fruitRadius * 0.6;
      
      if (aspectRatio > 1) {
        knifeWidth = baseSize;
        knifeHeight = baseSize / aspectRatio;
      } else {
        knifeHeight = baseSize;
        knifeWidth = baseSize * aspectRatio;
      }
    }
    
    this.knives = level.embeddedKnives.map((angle, index) => {
      const normalizedAngle = normalizeAngle(angle);
      
      return {
        angle: normalizedAngle,
        isFlying: false, // Not flying - spawn in place
        flyX: 0,
        flyY: 0,
        flyStartX: 0,
        flyStartY: 0,
        flyTime: 0,
        stickBounce: 0,
        throwScale: 0, // Start at 0 for zoom-in animation
        throwRotation: 0,
        isColliding: false,
        transitionKnifeWidth: knifeWidth,
        transitionKnifeHeight: knifeHeight,
      };
    });
    
    // Initialize coins
    this.coins = level.coins.map((angle) => {
      const normalizedAngle = normalizeAngle(angle);
      return {
        angle: normalizedAngle,
        collected: false,
        animating: false,
        animX: 0,
        animY: 0,
        animProgress: 0,
        spawnScale: 0, // Start at 0 for zoom-in animation
      };
    });
    
    this.knivesToThrow = level.knivesToThrow;
    this.rotationTime = 0;
    this.currentAngularVelocity = 0;
    this.targetAngularVelocity = 0;
    
    this.updateLevelDisplay();
    
    // Reset collision prediction and game over state
    this.collisionPredicted = false;
    this.collisionPoint = null;
    this.gameOverActive = false;
    // Clear broken knife pieces
    this.brokenKnifePieces = [];
    // Reset background overlay
    this.backgroundOverlay.target = 0;
    this.backgroundOverlay.current = 0;
    
    // Start transition animation
    this.transitionActive = true;
    this.transitionTime = 0;
    this.transitionPhase = "bg_slide";
    this.bgSlideOffset = -h; // Start above screen
    this.fruitZoomScale = 0;
    this.fruitWiggleTime = 0;
    this.embeddedKnivesFlying = true;
    
    // Hide UI during transition
    this.settingsIconBtn.classList.add("hidden");
    this.settingsBtn.classList.add("hidden");
    this.bottomHud.classList.add("hidden");
  }

  private nextLevel(): void {
    // Instantly reset camera zoom before transition
    this.cameraZoom = 1.0;
    this.cameraTargetZoom = 1.0;
    this.cameraX = 0;
    this.cameraY = 0;
    this.cameraTargetX = 0;
    this.cameraTargetY = 0;
    this.slowMoActive = false;
    
    if (this.currentLevel < this.levels.length - 1) {
      this.currentLevel++;
      this.loadLevel(this.currentLevel);
      this.state = "PLAYING";
      this.winScreen.classList.add("hidden");
      
      // Resume spin sound for next level (will start when transition completes)
    } else {
      // Game complete
      this.state = "GAME_OVER";
      this.gameOverScreen.classList.remove("hidden");
    }
  }

  private restart(): void {
    // Reset coin count on restart
    this.totalCoins = 0;
    // Instantly reset camera zoom before transition
    this.cameraZoom = 1.0;
    this.cameraTargetZoom = 1.0;
    this.cameraX = 0;
    this.cameraY = 0;
    this.cameraTargetX = 0;
    this.cameraTargetY = 0;
    this.slowMoActive = false;
    
    this.currentLevel = 0;
    this.loadLevel(this.currentLevel);
    this.state = "PLAYING";
    this.gameOverScreen.classList.add("hidden");
    this.winScreen.classList.add("hidden");
    this.startScreen.classList.add("hidden");
    // Reset game over state
    this.gameOverActive = false;
    this.collisionPredicted = false;
    this.collisionPoint = null;
    
    // Resume spin sound on restart (will start when transition completes)
    // Clear broken knife pieces and screen flash
    this.brokenKnifePieces = [];
    this.screenFlash.active = false;
    // Reset background overlay
    this.backgroundOverlay.target = 0;
    this.backgroundOverlay.current = 0;
    // Reset background overlay
    this.backgroundOverlay.target = 0;
    this.backgroundOverlay.current = 0;
  }

  private pause(): void {
    if (this.state === "PLAYING") {
      this.state = "PAUSED";
      // Only show pause screen if settings modal is not visible
      if (!this.settingsModal.classList.contains("visible")) {
        this.pauseScreen.classList.remove("hidden");
      }
    }
  }

  private resume(): void {
    if (this.state === "PAUSED") {
      this.state = "PLAYING";
      this.pauseScreen.classList.add("hidden");
    }
  }

  private showMenu(): void {
    this.state = "START";
    this.startScreen.classList.remove("hidden");
    this.gameOverScreen.classList.add("hidden");
    this.winScreen.classList.add("hidden");
    this.pauseScreen.classList.add("hidden");
    this.settingsIconBtn.classList.add("hidden");
    this.settingsBtn.classList.add("hidden");
    this.bottomHud.classList.add("hidden"); // Hide bottom HUD on menu
    
  }

  private showSettings(): void {
    // Force reflow to ensure initial state is applied
    this.settingsModal.offsetHeight;
    this.settingsModal.classList.add("visible");
    // Hide pause screen if it's showing
    this.pauseScreen.classList.add("hidden");
    if (this.state === "PLAYING") {
      this.pause();
    }
  }

  private hideSettings(): void {
    this.settingsModal.classList.remove("visible");
    // Wait for animation to complete before resuming (if needed)
    setTimeout(() => {
      if (this.state === "PAUSED") {
        this.resume();
      }
    }, 300); // Match CSS transition duration
  }

  private updateLevelDisplay(): void {
    this.levelDisplay.textContent = `Level ${this.currentLevel + 1}/${CONFIG.TOTAL_LEVELS}`;
    // Update coins display with total collected coins
    this.coinDisplay.textContent = this.totalCoins.toString();
  }

  private updateKnivesRemaining(): void {
    // Update bottom HUD (preview knife with count)
    // Show preview if we have knives to throw OR if there's a knife currently flying (so we see the preview before it disappears)
    const hasKnivesToShow = this.knivesToThrow > 0 || this.knives.some(k => k.isFlying);
    if ((this.state === "PLAYING" || this.state === "PAUSED") && hasKnivesToShow) {
      this.bottomHud.classList.remove("hidden");
      
      // Update knife preview image with proper aspect ratio
      if (this.knifeImage && this.assetsLoaded) {
        const imageWidth = this.knifeImage.naturalWidth || this.knifeImage.width;
        const imageHeight = this.knifeImage.naturalHeight || this.knifeImage.height;
        const aspectRatio = imageWidth / imageHeight;
        
        // Auto-size based on available space in bottom HUD
        // Use viewport-based sizing that fits within the bottom area
        const containerHeight = window.innerHeight;
        const availableHeight = containerHeight * 0.25; // Use 25% of viewport height for bottom HUD
        const maxKnifeHeight = availableHeight * 0.4; // Knife takes 40% of available space
        const maxKnifeWidth = window.innerWidth * 0.15; // Max 15% of viewport width
        
        let width: number;
        let height: number;
        
        if (aspectRatio > 1) {
          // Wider than tall
          width = Math.min(maxKnifeWidth, maxKnifeHeight * aspectRatio);
          height = width / aspectRatio;
        } else {
          // Taller than wide
          height = Math.min(maxKnifeHeight, maxKnifeWidth / aspectRatio);
          width = height * aspectRatio;
        }
        
        this.knifePreviewImage.src = this.knifeImage.src;
        this.knifePreviewImage.style.width = `${width}px`;
        this.knifePreviewImage.style.height = `${height}px`;
        this.knifePreviewImage.style.display = "block";
        // Set rotation to 90° (laying flat/horizontal) when at bottom
        // Check image orientation: if image is wider than tall, it's already horizontal
        // If it's taller than wide, we need to rotate it 90° to make it horizontal
        const isHorizontal = aspectRatio > 1;
        const rotationDeg = isHorizontal ? 0 : 90; // If already horizontal, no rotation needed
        
        // Force transform to be applied immediately and on image load
        this.knifePreviewImage.style.transform = `rotate(${rotationDeg}deg)`;
        
        // Ensure it's set after image loads (in case image is cached and onload doesn't fire)
        const setRotation = () => {
          this.knifePreviewImage.style.transform = `rotate(${rotationDeg}deg)`;
        };
        this.knifePreviewImage.onload = setRotation;
        // Also set it immediately in case image is already loaded
        if (this.knifePreviewImage.complete) {
          setRotation();
        }
      } else {
        this.knifePreviewImage.style.display = "none";
      }
      
      // Update count text above knife (show 0 if no knives left but knife is flying)
      const displayCount = this.knivesToThrow > 0 ? this.knivesToThrow : 0;
      this.knivesCount.textContent = displayCount.toString();
      
      // Update knife icons below knife preview
      this.knifeIconsContainer.innerHTML = "";
      if (this.knifeIconImage && this.assetsLoaded) {
        for (let i = 0; i < this.knivesToThrow; i++) {
          const icon = document.createElement("img");
          icon.className = "knife-icon-bottom";
          icon.src = this.knifeIconImage.src;
          icon.alt = "Knife icon";
          // Stagger the animation for each icon
          icon.style.animationDelay = `${i * 0.05}s`;
          this.knifeIconsContainer.appendChild(icon);
        }
      }
    } else {
      this.bottomHud.classList.add("hidden");
    }
  }

  private triggerHaptic(type: "light" | "medium" | "heavy" | "success" | "error"): void {
    if (this.settings.haptics && typeof (window as any).triggerHaptic === "function") {
      (window as any).triggerHaptic(type);
    }
  }

  private update(dt: number): void {
    // Update transition if active
    if (this.transitionActive) {
      this.updateTransition(dt);
      // Don't update game logic during transition
      return;
    }
    
    if (this.state !== "PLAYING" && this.state !== "WIN" && this.state !== "GAME_OVER") return;
    
    // Apply slow motion time scale
    let actualDt = dt;
    if (this.slowMoActive) {
      actualDt = dt * 0.2; // 5x slower
      this.slowMoTime += dt;
      // Don't auto-end slow motion during game over - let it stay zoomed
      if (!this.gameOverActive && this.slowMoTime >= this.slowMoDuration) {
        this.slowMoActive = false;
        // Start zooming back out smoothly
        this.cameraTargetZoom = 1.0;
        this.cameraTargetX = 0;
        this.cameraTargetY = 0;
      }
    } else {
      // If slow motion ended, ensure we're zooming back out
      if (this.cameraZoom > 1.0 && !this.gameOverActive) {
        this.cameraTargetZoom = 1.0;
        this.cameraTargetX = 0;
        this.cameraTargetY = 0;
      }
    }
    
    // Smooth camera zoom and position (faster when zooming out)
    const zoomSpeed = this.cameraTargetZoom < this.cameraZoom ? 5 : 3; // Faster zoom out
    this.cameraZoom += (this.cameraTargetZoom - this.cameraZoom) * dt * zoomSpeed;
    this.cameraX += (this.cameraTargetX - this.cameraX) * dt * 5;
    this.cameraY += (this.cameraTargetY - this.cameraY) * dt * 5;
    
    const level = this.levels[this.currentLevel];
    
    // Only update rotation if not in transition
    if (!this.transitionActive) {
      this.rotationTime += actualDt; // Use actualDt for rotation
      
      // Calculate target angular velocity from pattern
      const pattern = ROTATION_PATTERNS[level.rotationPattern];
      this.targetAngularVelocity = pattern(
        this.rotationTime,
        level.rotationSpeed,
        level.rotationDirection
      );
      
      // Apply acceleration limit for smooth transitions
      this.currentAngularVelocity = applyAccelerationLimit(
        this.currentAngularVelocity,
        this.targetAngularVelocity,
        dt,
        120 // Max acceleration
      );
      
      // Update fruit rotation (keep spinning even during celebration)
      if (this.fruit) {
        this.fruit.rotationAngle = normalizeAngle(
          this.fruit.rotationAngle + this.currentAngularVelocity * actualDt
        );
      }
    }
    
    // Update celebration
    if (this.celebrationActive) {
      this.celebrationTime += dt;
      
      // Animate encouragement text sliding in
      if (this.encouragementX < 50) {
        this.encouragementX += (50 - this.encouragementX) * dt * 5;
      }
      
      // Flicker tap to continue
      this.tapToContinueFlicker += dt * 3;
      this.tapToContinueOpacity = 0.5 + Math.sin(this.tapToContinueFlicker) * 0.5;
    }
    
    // Update background overlay (smoothly transition to target)
    this.backgroundOverlay.current += (this.backgroundOverlay.target - this.backgroundOverlay.current) * dt * this.backgroundOverlay.speed;
    
    // Update game over
    if (this.gameOverActive) {
      // Flicker tap to retry
      this.tapToRetryFlicker += dt * 3;
      this.tapToRetryOpacity = 0.5 + Math.sin(this.tapToRetryFlicker) * 0.5;
    }
    
    // Update flying knives
    // Use real dt for knife movement so collision happens at the right time
    // Slow motion effect comes from camera zoom, not from slowing down the knife
    for (const knife of this.knives) {
      if (knife.isFlying) {
        knife.flyTime += dt; // Use real dt - slow motion is visual only (camera zoom)
        
        // Calculate trajectory from start position to fruit center
        const fruitCenterX = this.canvas.width * CONFIG.FRUIT_CENTER_X;
        const fruitCenterY = this.canvas.height * CONFIG.FRUIT_CENTER_Y;
        const dx = fruitCenterX - knife.flyStartX;
        const dy = fruitCenterY - knife.flyStartY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Update knife position along trajectory
        const progress = Math.min(1, knife.flyTime * CONFIG.KNIFE_THROW_SPEED / distance);
        knife.flyX = knife.flyStartX + dx * progress;
        knife.flyY = knife.flyStartY + dy * progress;
        
        // No throw animation effects (removed scale and wobble)
        knife.throwScale = 1.0;
        knife.throwRotation = 0;
        
        // Update flying knife sprite position and scale with camera zoom
        if (this.flyingKnifeSprite.style.display === "block") {
          const containerRect = this.canvas.getBoundingClientRect();
          const screenX = containerRect.left + (knife.flyX / this.canvas.width) * containerRect.width;
          const screenY = containerRect.top + (knife.flyY / this.canvas.height) * containerRect.height;
          
          // Get base size from data attributes (set when knife is thrown)
          const baseWidth = parseFloat(this.flyingKnifeSprite.getAttribute("data-base-width") || "180");
          const baseHeight = parseFloat(this.flyingKnifeSprite.getAttribute("data-base-height") || "180");
          
          // Scale sprite size with camera zoom so it stays big when zoomed in
          const spriteWidth = baseWidth * this.cameraZoom;
          const spriteHeight = baseHeight * this.cameraZoom;
          
          this.flyingKnifeSprite.style.left = `${screenX - spriteWidth / 2}px`;
          this.flyingKnifeSprite.style.top = `${screenY - spriteHeight / 2}px`;
          this.flyingKnifeSprite.style.width = `${spriteWidth}px`;
          this.flyingKnifeSprite.style.height = `${spriteHeight}px`;
          
          // Slerp rotation from 90° (laying flat, pointing up) to angle pointing toward fruit
          // Calculate target angle based on trajectory direction (from start to fruit)
          const trajectoryDx = fruitCenterX - knife.flyStartX;
          const trajectoryDy = fruitCenterY - knife.flyStartY;
          const targetAngleRad = Math.atan2(trajectoryDy, trajectoryDx);
          const targetAngleDeg = targetAngleRad * (180 / Math.PI);
          
          // CSS rotation: 0° = right, 90° = down, 180° = left, 270° = up
          // Determine starting angle based on image orientation (same as initial rotation)
          if (!this.knifeImage) return;
          const imageWidth = this.knifeImage.naturalWidth || this.knifeImage.width;
          const imageHeight = this.knifeImage.naturalHeight || this.knifeImage.height;
          const aspectRatio = imageWidth / imageHeight;
          const isHorizontal = aspectRatio > 1;
          const baseStartAngle = isHorizontal ? 0 : 90; // If already horizontal, start at 0°
          
          // We want: start laying flat, end at angle pointing along trajectory
          const startAngle = baseStartAngle; // Start laying flat
          const endAngle = targetAngleDeg + 90; // Target angle in CSS coordinates
          
          // Normalize angle difference for shortest path
          let angleDiff = endAngle - startAngle;
          if (angleDiff > 180) angleDiff -= 360;
          if (angleDiff < -180) angleDiff += 360;
          
          // Smooth interpolation from start to end
          // Use progress with easing for smooth rotation
          const rotationProgress = Math.min(1, progress * 1.2); // Rotate slightly faster than movement
          const easedT = 1 - Math.pow(1 - rotationProgress, 3); // Cubic ease-out
          const currentAngle = startAngle + angleDiff * easedT;
          
          this.flyingKnifeSprite.style.transform = `rotate(${currentAngle}deg)`;
        }
        
        // Predictive collision detection - check if collision will happen soon
        const currentDx = fruitCenterX - knife.flyX;
        const currentDy = fruitCenterY - knife.flyY;
        const distanceToCenter = Math.sqrt(currentDx * currentDx + currentDy * currentDy);
        
        // Predict collision a few frames ahead
        if (this.fruit && !this.collisionPredicted && distanceToCenter > this.fruit.radius) {
          const predictionTime = 0.05; // 50ms ahead
          const futureProgress = Math.min(1, (knife.flyTime + predictionTime) * CONFIG.KNIFE_THROW_SPEED / distance);
          const futureX = knife.flyStartX + dx * futureProgress;
          const futureY = knife.flyStartY + dy * futureProgress;
          const futureDx = fruitCenterX - futureX;
          const futureDy = fruitCenterY - futureY;
          const futureDistanceToCenter = Math.sqrt(futureDx * futureDx + futureDy * futureDy);
          
          // Check for predicted collision
          if (futureDistanceToCenter <= this.fruit.radius) {
            // Calculate future angle
            const futureVx = futureX - fruitCenterX;
            const futureVy = futureY - fruitCenterY;
            const futureLen = Math.max(0.00001, Math.hypot(futureVx, futureVy));
            const futureUx = futureVx / futureLen;
            const futureUy = futureVy / futureLen;
            const futureAngleWorld = normalizeAngle(Math.atan2(futureUy, futureUx) * (180 / Math.PI) + 90);
            const futureRelativeAngle = normalizeAngle(futureAngleWorld - this.fruit.rotationAngle);
            
            const collisionThreshold = (CONFIG.KNIFE_WIDTH * CONFIG.COLLISION_THRESHOLD_MULTIPLIER);
            
            // Check if future position will collide
            for (let i = 0; i < this.knives.length; i++) {
              const embeddedKnife = this.knives[i];
              if (embeddedKnife.isFlying) continue;
              const diff = angleDifference(futureRelativeAngle, embeddedKnife.angle);
              if (diff < collisionThreshold) {
                // Collision predicted! Trigger slow motion
                this.collisionPredicted = true;
                this.collisionKnifeIndex = this.knives.indexOf(knife);
                this.collisionEmbeddedKnifeIndex = i;
                
                // Trigger slow motion and zoom to collision point
                this.slowMoActive = true;
                this.slowMoTime = 0;
                this.cameraTargetZoom = 2.0;
                this.cameraTargetX = 0;
                this.cameraTargetY = 0;
                
                break;
              }
            }
          }
        }
        
        // Check if knife reached the fruit using circular collider
        if (this.fruit && distanceToCenter <= this.fruit.radius) {
          // Vector from fruit center -> knife (outward direction)
          const vx = knife.flyX - fruitCenterX;
          const vy = knife.flyY - fruitCenterY;
          
          // Project to exact circumference to remove dt/jitter variation
          const len = Math.max(0.00001, Math.hypot(vx, vy));
          const ux = vx / len;
          const uy = vy / len;
          
          // Calculate exact impact point on fruit circumference
          const impactX = fruitCenterX + ux * this.fruit.radius;
          const impactY = fruitCenterY + uy * this.fruit.radius;
          
          // Project knife to exact circumference
          knife.flyX = impactX;
          knife.flyY = impactY;
          
          // Angle convention: 0°=top, 90°=right, 180°=bottom, 270°=left
          const angleWorld = normalizeAngle(Math.atan2(uy, ux) * (180 / Math.PI) + 90);
          
          // Store knife angle relative to fruit (so it rotates with fruit consistently)
          const relativeAngle = normalizeAngle(angleWorld - this.fruit.rotationAngle);
          
          // Check for coin collision first (before knife collision)
          const coinCollisionThreshold = 15; // Degrees
          for (let i = 0; i < this.coins.length; i++) {
            const coin = this.coins[i];
            if (coin.collected || coin.animating) continue;
            const diff = angleDifference(relativeAngle, coin.angle);
            if (diff < coinCollisionThreshold) {
              // Collect coin
              coin.collected = true;
              coin.animating = true;
              coin.animX = impactX;
              coin.animY = impactY;
              coin.animProgress = 0;
              
              // Increment coin count
              this.totalCoins++;
              this.updateLevelDisplay();
              
              // Trigger haptic feedback
              if (this.settings.haptics) {
                this.triggerHaptic("light");
              }
              
              // Play pling sound effect
              if (this.settings.fx && this.plingSound) {
                this.playGeneratedSound(this.plingSound);
              }
              
              // Don't check for knife collision if coin was hit
              break;
            }
          }
          
          // Collision threshold
          const collisionThreshold = (CONFIG.KNIFE_WIDTH * CONFIG.COLLISION_THRESHOLD_MULTIPLIER);
          
          let collision = false;
          let collidingEmbeddedIndex = -1;
          for (let i = 0; i < this.knives.length; i++) {
            const embeddedKnife = this.knives[i];
            if (embeddedKnife.isFlying) continue;
            const diff = angleDifference(relativeAngle, embeddedKnife.angle);
            if (diff < collisionThreshold) {
              collision = true;
              collidingEmbeddedIndex = i;
              break;
            }
          }
          
          if (collision) {
            // Knife breaks into pieces and falls
            this.flyingKnifeSprite.style.display = "none";
            
            // Get exact position of the knife when it breaks
            const knifeX = knife.flyX;
            const knifeY = knife.flyY;
            
            // Play broke sound, then dull sound
            if (this.settings.fx) {
              if (this.brokeSound) {
                this.brokeSound.currentTime = 0;
                this.brokeSound.play().catch(() => {});
              }
              // Play dull sound immediately after broke
              if (this.dullSound) {
                this.dullSound.currentTime = 0;
                // Small delay to play after broke starts
                setTimeout(() => {
                  if (this.settings.fx && this.dullSound) {
                    this.dullSound.play().catch(() => {});
                  }
                }, 50);
              }
            }
            
            // Trigger screen flash
            this.screenFlash.active = true;
            this.screenFlash.time = 0;
            
            // Create broken knife pieces at exact knife position (using native sprite resolution)
            this.createBrokenKnifePieces(knifeX, knifeY, knife.throwRotation);
            
            // Remove the broken knife from the array immediately - it should not spawn on the fruit
            // Find and remove the knife from the array
            const knifeIndex = this.knives.indexOf(knife);
            if (knifeIndex !== -1) {
              this.knives.splice(knifeIndex, 1);
            }
            
            // Trigger slow motion if not already active
            if (!this.slowMoActive) {
              this.slowMoActive = true;
              this.slowMoTime = 0;
              this.cameraTargetZoom = 2.0;
              this.cameraTargetX = 0;
              this.cameraTargetY = 0;
            }
            
            // Start game over sequence (no modal)
            this.gameOverActive = true;
            this.state = "GAME_OVER";
            // Darken background smoothly
            this.backgroundOverlay.target = -0.5; // Darken to 50%
            this.triggerHaptic("error");
            
            // Submit score on game over (level reached)
            console.log("[KnifeHitGame] Submitting final score:", this.currentLevel);
            if (typeof (window as any).submitScore === "function") {
              (window as any).submitScore(this.currentLevel); // Submit level reached (0-indexed)
            }
            
            // Break out of the loop since the knife is removed and game is over
            break;
          } else {
            // Knife sticks - store angle and stop flying
            knife.angle = relativeAngle;
            knife.isFlying = false;
            knife.stickBounce = 1;
            
            // Play stab sound when knife hits fruit
            if (this.settings.fx && this.stabSound) {
              this.stabSound.currentTime = 0;
              this.stabSound.play().catch(() => {});
            }
            
            // Fruit distortion effect
            if (this.fruit) {
              this.fruit.hitDistortion = 1.0; // Start at full distortion
            }
            
            // Enhanced explosion effects
            const isLastKnife = this.knivesToThrow === 0;
            
            // Calculate knife tip position for particle effects
            const knifeTipOffset = this.fruit.radius * 0.35;
            const knifeTipX = impactX + ux * knifeTipOffset;
            const knifeTipY = impactY + uy * knifeTipOffset;
            
            // Offset particles to spawn closer to the impact point (adjust these values to fine-tune)
            // Positive offsetX/Y moves particles in the direction of the knife (towards fruit center)
            // Negative offsetX/Y moves particles away from fruit center
            // Change 0.1 to adjust offset: 0.0 = no offset, 0.1 = 10% of radius, -0.1 = opposite direction
            const particleOffsetX = ux * (this.fruit.radius * -1); // Adjust multiplier to fine-tune
            const particleOffsetY = uy * (this.fruit.radius * -1); // Adjust multiplier to fine-tune
            
            if (isLastKnife) {
              // Bigger explosion for last knife at knife tip
              this.createBigExplosion(knifeTipX, knifeTipY, particleOffsetX, particleOffsetY);
              this.screenShake.time = 0.5; // Longer shake
              this.screenShake.x = (Math.random() - 0.5) * 30;
              this.screenShake.y = (Math.random() - 0.5) * 30;
              
              // Start celebration immediately (slow motion will end naturally)
              this.startCelebration();
            } else {
              // Normal splash for regular knives at knife tip
              this.createSplashEffect(knifeTipX, knifeTipY, particleOffsetX, particleOffsetY);
              this.createDropParticles(knifeTipX, knifeTipY, particleOffsetX, particleOffsetY);
              this.screenShake.time = 0.2;
              this.screenShake.x = (Math.random() - 0.5) * 10;
              this.screenShake.y = (Math.random() - 0.5) * 10;
            }
            
            // Hide flying sprite
            this.flyingKnifeSprite.style.display = "none";
            
            // Update preview if more knives
            if (this.knivesToThrow > 0) {
              this.updateKnivesRemaining();
            }
            
            this.triggerHaptic("medium");
            
            // Check win - no modal, just keep playing
            if (this.knivesToThrow === 0 && !this.knives.some(k => k.isFlying)) {
              this.state = "WIN"; // Keep state as WIN but don't show modal
              // Brighten background smoothly
              this.backgroundOverlay.target = 0.3; // Brighten by 30%
              this.triggerHaptic("success");
              
              // Play success sound when clearing level
              if (this.settings.fx && this.successSound) {
                this.successSound.currentTime = 0;
                this.successSound.play().catch(() => {});
              }
              
              if (typeof (window as any).submitScore === "function") {
                (window as any).submitScore(this.currentLevel + 1);
              }
            }
          }
        }
      } else if (knife.stickBounce > 0) {
        // Animate stick bounce
        knife.stickBounce = Math.max(0, knife.stickBounce - dt * 5);
      }
    }
    
    // Update fruit distortion
    if (this.fruit && this.fruit.hitDistortion > 0) {
      this.fruit.hitDistortion = Math.max(0, this.fruit.hitDistortion - actualDt * 3);
    }
    
    // Update particles
    this.updateParticles(actualDt);
    this.updateBrokenKnifePieces(actualDt);
    
    // Update coin animations
    this.updateCoinAnimations(dt);
    
    // Update screen shake
    if (this.screenShake.time > 0) {
      this.screenShake.time = Math.max(0, this.screenShake.time - dt);
      if (this.screenShake.time > 0) {
        // Decay shake
        const intensity = this.screenShake.time / 0.2;
        this.screenShake.x = (Math.random() - 0.5) * 10 * intensity;
        this.screenShake.y = (Math.random() - 0.5) * 10 * intensity;
      } else {
        this.screenShake.x = 0;
        this.screenShake.y = 0;
      }
    }
    
    // Update screen flash
    if (this.screenFlash.active) {
      this.screenFlash.time += dt;
      if (this.screenFlash.time >= this.screenFlash.duration) {
        this.screenFlash.active = false;
        this.screenFlash.time = 0;
      }
    }
    
    // Update debug info
    if (this.debugMode) {
      this.updateDebugInfo(level);
    }
  }
  
  private createSplashEffect(x: number, y: number, offsetX: number = 0, offsetY: number = 0): void {
    // Create juice splash particles that burst outward
    const particleCount = 20; // More particles for juicier effect
    const fruitColor = this.getFruitJuiceColor(); // Get color based on current fruit
    // Apply offset to spawn position
    const spawnX = x + offsetX;
    const spawnY = y + offsetY;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 100 + Math.random() * 60; // Faster for more impact
      const particle: Particle = {
        x: spawnX,
        y: spawnY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.5 + Math.random() * 0.4,
        size: 4 + Math.random() * 5, // Bigger drops
        color: fruitColor,
        type: "splash",
      };
      this.particles.push(particle);
    }
  }
  
  private createBigExplosion(x: number, y: number, offsetX: number = 0, offsetY: number = 0): void {
    // Create massive juice explosion with many particles
    const particleCount = 50; // More particles for bigger explosion
    const fruitColor = this.getFruitJuiceColor(); // Get color based on current fruit
    // Apply offset to spawn position
    const spawnX = x + offsetX;
    const spawnY = y + offsetY;
    
    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 180 + Math.random() * 120; // Faster for more impact
      const particle: Particle = {
        x: spawnX,
        y: spawnY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.7 + Math.random() * 0.5,
        maxLife: 0.7 + Math.random() * 0.5,
        size: 5 + Math.random() * 7, // Bigger juice drops
        color: fruitColor,
        type: "splash",
      };
      this.particles.push(particle);
    }
    
    // Also create juice drop particles
    for (let i = 0; i < 10; i++) { // Reduced from 20 to 10
      const particle: Particle = {
        x: spawnX,
        y: spawnY, // Use offset position
        vx: (Math.random() - 0.5) * 60,
        vy: 100 + Math.random() * 100,
        life: 1.2 + Math.random() * 0.6,
        maxLife: 1.2 + Math.random() * 0.6,
        size: 4 + Math.random() * 5, // Bigger drops
        color: fruitColor,
        type: "drop",
      };
      this.particles.push(particle);
    }
  }
  
  private updateTransition(dt: number): void {
    this.transitionTime += dt;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const fruitCenterX = w * CONFIG.FRUIT_CENTER_X;
    const fruitCenterY = h * CONFIG.FRUIT_CENTER_Y;
    
    if (this.transitionPhase === "bg_slide") {
      // Background slides down from top (0.5 seconds)
      const slideDuration = 0.5;
      const progress = Math.min(1, this.transitionTime / slideDuration);
      // Ease out
      const eased = 1 - Math.pow(1 - progress, 3);
      this.bgSlideOffset = -h + (h * eased);
      
      // Play transition sound at the start
      if (this.transitionTime === 0 || this.transitionTime < dt) {
        if (this.transitionSound) {
          this.playGeneratedSound(this.transitionSound);
        }
      }
      
      if (progress >= 1) {
        this.bgSlideOffset = 0;
        this.transitionPhase = "fruit_zoom";
        this.transitionTime = 0;
      }
    } else if (this.transitionPhase === "fruit_zoom") {
      // Fruit zooms in (0.4 seconds)
      const zoomDuration = 0.4;
      const progress = Math.min(1, this.transitionTime / zoomDuration);
      // Ease out
      const eased = 1 - Math.pow(1 - progress, 3);
      this.fruitZoomScale = eased;
      
      // Play spawn sound when fruit starts zooming
      if (this.transitionTime === 0 || this.transitionTime < dt) {
        if (this.spawnSound) {
          this.playGeneratedSound(this.spawnSound);
        }
      }
      
      if (progress >= 1) {
        // Zoom complete - keep at scale 1
        this.fruitZoomScale = 1;
        // Start wiggle animation (0.3 seconds)
        this.fruitWiggleTime += dt;
        
        // After wiggle completes (0.3 seconds), transition to knives zoom
        if (this.fruitWiggleTime >= 0.3) {
          this.transitionPhase = "knives_fly";
          this.transitionTime = 0;
          // Ensure fruit stays at scale 1
          this.fruitZoomScale = 1;
        }
      }
    } else if (this.transitionPhase === "knives_fly") {
      // Zoom in knives (same animation as fruit) - only starts after fruit wiggle completes
      const zoomDuration = 0.4;
      const progress = Math.min(1, this.transitionTime / zoomDuration);
      // Ease out (same as fruit)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      // Play spawn sound when knives start zooming
      if (this.transitionTime === 0 || this.transitionTime < dt) {
        if (this.spawnSound) {
          this.playGeneratedSound(this.spawnSound);
        }
      }
      
      // Apply zoom scale to all embedded knives
      for (const knife of this.knives) {
        knife.throwScale = eased;
      }
      
      // Apply zoom scale to all coins
      for (const coin of this.coins) {
        coin.spawnScale = eased;
      }
      
      if (progress >= 1) {
        // All knives zoomed in, complete transition
        for (const knife of this.knives) {
          knife.throwScale = 1.0; // Ensure they're at full scale
        }
        // All coins zoomed in
        for (const coin of this.coins) {
          coin.spawnScale = 1.0; // Ensure they're at full scale
        }
        this.transitionPhase = "complete";
        this.transitionActive = false;
        this.embeddedKnivesFlying = false;
        this.fruitWiggleTime = 0;
        
        // Show UI and start rotation
        this.settingsIconBtn.classList.remove("hidden");
        this.settingsBtn.classList.remove("hidden");
        this.updateKnivesRemaining();
        
        // Start fruit rotation
        const level = this.levels[this.currentLevel];
        this.targetAngularVelocity = level.rotationSpeed * level.rotationDirection;
      }
    }
  }
  
  private startCelebration(): void {
    this.celebrationActive = true;
    this.celebrationTime = 0;
    this.encouragementX = -500;
    
    // Random encouraging messages (no emojis)
    const messages = [
      "EXCELLENT!",
      "AMAZING!",
      "PERFECT!",
      "INCREDIBLE!",
      "OUTSTANDING!",
      "FANTASTIC!",
      "BRILLIANT!",
      "LEGENDARY!",
    ];
    this.encouragementText = messages[Math.floor(Math.random() * messages.length)];
  }
  
  private createDropParticles(x: number, y: number, offsetX: number = 0, offsetY: number = 0): void {
    // Create juice drops that fall down
    const particleCount = 6; // Reduced from 12 to 6
    const fruitColor = this.getFruitJuiceColor(); // Get color based on current fruit
    // Apply offset to spawn position
    const spawnX = x + offsetX;
    const spawnY = y + offsetY;
    
    for (let i = 0; i < particleCount; i++) {
      const particle: Particle = {
        x: spawnX,
        y: spawnY, // Use offset position
        vx: (Math.random() - 0.5) * 40,
        vy: 60 + Math.random() * 70,
        life: 0.8 + Math.random() * 0.5,
        maxLife: 0.8 + Math.random() * 0.5,
        size: 3 + Math.random() * 4, // Bigger drops
        color: fruitColor,
        type: "drop",
      };
      this.particles.push(particle);
    }
  }
  
  private getFruitJuiceColor(): string {
    // Get juice color based on current fruit type
    if (!this.fruit) {
      // Default orange/yellow if fruit not loaded
      return `hsl(${30 + Math.random() * 20}, 85%, ${55 + Math.random() * 15}%)`;
    }
    
    // Get fruit color index to determine juice color
    const fruitColors = [
      { h: 30, s: 85, l: 60 },  // Orange (avocado - greenish, but use orange for juice)
      { h: 25, s: 90, l: 55 },  // Orange (orange)
      { h: 280, s: 70, l: 50 }, // Purple (grape)
      { h: 120, s: 80, l: 50 }, // Green (watermelon - red inside, but green rind)
      { h: 60, s: 75, l: 55 },  // Yellow-green (kiwi)
      { h: 50, s: 90, l: 60 },  // Yellow (lemon)
    ];
    
    const baseColor = fruitColors[this.fruit.colorIndex % fruitColors.length];
    // Add some variation for more natural look
    const h = baseColor.h + (Math.random() - 0.5) * 10;
    const s = baseColor.s + (Math.random() - 0.5) * 15;
    const l = baseColor.l + (Math.random() - 0.5) * 20;
    
    return `hsl(${h}, ${Math.max(60, Math.min(100, s))}%, ${Math.max(40, Math.min(80, l))}%)`;
  }
  
  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      // Update position
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      
      // Apply gravity to drop particles
      if (p.type === "drop") {
        p.vy += 200 * dt; // Gravity
      } else {
        // Friction for splash particles
        p.vx *= 0.95;
        p.vy *= 0.95;
      }
      
      // Update life
      p.life -= dt;
      
      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateDebugInfo(level: LevelConfig): void {
    const info = [
      `Level: ${this.currentLevel + 1}`,
      `Fruit Radius: ${level.fruitRadius}px`,
      `Embedded Knives: ${level.embeddedKnives.length}`,
      `Knives to Throw: ${this.knivesToThrow}`,
      `Rotation Speed: ${level.rotationSpeed.toFixed(1)}°/s`,
      `Direction: ${level.rotationDirection > 0 ? "CW" : "CCW"}`,
      `Pattern: ${level.rotationPattern}`,
      `Current Vel: ${this.currentAngularVelocity.toFixed(1)}°/s`,
      `Rotation Angle: ${this.fruit.rotationAngle.toFixed(1)}°`,
    ];
    this.debugContent.innerHTML = info.map(line => `<div>${line}</div>`).join("");
  }

  private render(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Apply camera zoom and position
    const fruitCenterX = w * CONFIG.FRUIT_CENTER_X;
    const fruitCenterY = h * CONFIG.FRUIT_CENTER_Y;
    
    this.ctx.save();
    // Apply camera transform
    this.ctx.translate(fruitCenterX, fruitCenterY);
    this.ctx.scale(this.cameraZoom, this.cameraZoom);
    this.ctx.translate(-fruitCenterX + this.cameraX, -fruitCenterY + this.cameraY);
    
    // Apply screen shake offset
    const shakeX = this.screenShake.x;
    const shakeY = this.screenShake.y;
    this.ctx.translate(shakeX, shakeY);
    
    // Draw background with slide animation during transition
    const bgImage = this.currentLevel % 2 === 0 ? this.background1Image : this.background2Image;
    if (bgImage && this.assetsLoaded) {
      if (this.transitionActive && this.transitionPhase === "bg_slide") {
        // Draw background with offset during slide
        this.ctx.drawImage(bgImage, 0, this.bgSlideOffset, w, h);
      } else {
        this.ctx.drawImage(bgImage, 0, 0, w, h);
      }
    } else {
      // Fallback: clear canvas
      this.ctx.clearRect(0, 0, w, h);
    }
    
    // Draw brightness/darkness overlay
    if (this.backgroundOverlay.current !== 0) {
      this.ctx.save();
      if (this.backgroundOverlay.current < 0) {
        // Darken (negative value)
        this.ctx.fillStyle = `rgba(0, 0, 0, ${Math.abs(this.backgroundOverlay.current)})`;
      } else {
        // Brighten (positive value)
        this.ctx.fillStyle = `rgba(255, 255, 255, ${this.backgroundOverlay.current})`;
      }
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.restore();
    }
    
    // Allow rendering during transition
    const isTransitioning = this.transitionActive;
    if (!isTransitioning && this.state !== "PLAYING" && this.state !== "PAUSED" && this.state !== "WIN" && this.state !== "GAME_OVER") {
      this.ctx.restore();
      return;
    }
    
    if (!this.assetsLoaded) {
      this.ctx.restore();
      return; // Wait for assets to load
    }
    
    // During bg_slide phase, don't draw fruit or knives yet
    if (isTransitioning && this.transitionPhase === "bg_slide") {
      this.ctx.restore();
      return; // Only background is visible during slide
    }
    
    // Draw embedded knives FIRST (behind the fruit)
    // Only draw knives during knives_fly phase (they start invisible at scale 0)
    // Check if fruit exists before drawing knives
    if (this.fruit) {
      for (let i = 0; i < this.knives.length; i++) {
        const knife = this.knives[i];
        if (!knife.isFlying) {
          // During knives_fly phase, apply zoom scale to each knife individually
          // During fruit_zoom phase, knives are invisible (throwScale = 0)
          if (isTransitioning && this.transitionPhase === "knives_fly" && knife.throwScale > 0) {
            this.ctx.save();
            // Calculate knife position
            const angleRad = ((knife.angle + this.fruit.rotationAngle - 90) * Math.PI) / 180;
            const positionRadius = this.fruit.radius * 0.4; // Position where knife is embedded
            const knifeX = fruitCenterX + Math.cos(angleRad) * positionRadius;
            const knifeY = fruitCenterY + Math.sin(angleRad) * positionRadius;

            // Apply zoom scale centered on knife position
            this.ctx.translate(knifeX, knifeY);
            this.ctx.scale(knife.throwScale, knife.throwScale);
            this.ctx.translate(-knifeX, -knifeY);

            // Use embeddedRotation if available (for transition knives), otherwise use default rotation
            this.drawKnife(
              fruitCenterX,
              fruitCenterY,
              this.fruit.radius,
              knife.angle + this.fruit.rotationAngle,
              knife.stickBounce,
              false, // No longer using isColliding
              knife.embeddedRotation // Pass custom rotation for transition knives
            );

            this.ctx.restore();
          } else if (!isTransitioning) {
            // Normal gameplay - draw knives normally
            this.drawKnife(
              fruitCenterX,
              fruitCenterY,
              this.fruit.radius,
              knife.angle + this.fruit.rotationAngle,
              knife.stickBounce,
              false, // No longer using isColliding
              knife.embeddedRotation // Pass custom rotation for transition knives
            );
          }
        }
      }
    }
    
    // Draw fruit ON TOP (so knives appear inside) with transition animations
    // Only draw fruit during fruit_zoom and knives_fly phases (not during bg_slide)
    // Check if fruit exists before drawing
    if (this.fruit) {
      if (isTransitioning && this.transitionPhase === "fruit_zoom") {
        // Apply zoom and wiggle during fruit zoom phase only
        // Fruit starts at scale 0 and animates to scale 1
        this.ctx.save();
        this.ctx.translate(fruitCenterX, fruitCenterY);
        this.ctx.scale(this.fruitZoomScale, this.fruitZoomScale);
        
        // Apply wiggle only after zoom completes (when scale is 1)
        if (this.fruitZoomScale >= 1 && this.fruitWiggleTime > 0) {
          const wiggle = Math.sin(this.fruitWiggleTime * Math.PI * 6) * 0.05 * (1 - this.fruitWiggleTime / 0.3);
          const scaleX = 1.0 + wiggle;
          const scaleY = 1.0 - wiggle;
          this.ctx.scale(scaleX, scaleY);
        }
        
        this.ctx.translate(-fruitCenterX, -fruitCenterY);
        this.drawFruit(fruitCenterX, fruitCenterY, this.fruit);
        this.ctx.restore();
      } else if (isTransitioning && this.transitionPhase === "knives_fly") {
        // During knives_fly phase, fruit is at full scale (no animation, no wiggle)
        this.drawFruit(fruitCenterX, fruitCenterY, this.fruit);
      } else if (!isTransitioning) {
        // Normal gameplay - draw fruit normally
        this.drawFruit(fruitCenterX, fruitCenterY, this.fruit);
      }
    }
    
    // Draw coins (before particles so they appear behind juice)
    this.drawCoins(fruitCenterX, fruitCenterY);
    
    // Draw particles
    this.drawParticles();
    
    // Draw flying knives (on top of everything) - only player's knife
    // Transition knives are now embedded and drawn with zoom scale above
    // Player's knife uses HTML sprite (flyingKnifeSprite), handled in update loop
    
    // Draw broken knife pieces (on top of everything, after flying knives)
    this.drawBrokenKnifePieces();
    
    this.ctx.restore(); // Restore from camera and screen shake
    
    // Draw screen flash (outside camera transform, on top of everything)
    if (this.screenFlash.active) {
      const flashAlpha = 1.0 - (this.screenFlash.time / this.screenFlash.duration);
      this.ctx.save();
      this.ctx.fillStyle = "#ffffff";
      this.ctx.globalAlpha = flashAlpha * 0.8; // White flash at 80% opacity max
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.restore();
    }
    
    // Draw celebration UI (outside camera transform)
    if (this.celebrationActive) {
      this.drawCelebrationUI();
    }
    
    // Draw game over UI
    if (this.gameOverActive) {
      this.drawGameOverUI();
    }
  }
  
  private drawCelebrationUI(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    // Draw encouragement text from left side
    this.ctx.save();
    this.ctx.font = `bold ${Math.min(w * 0.08, 60)}px Fredoka One`;
    this.ctx.fillStyle = "#ffffff";
    this.ctx.strokeStyle = "#000000";
    this.ctx.lineWidth = 4;
    this.ctx.textAlign = "left";
    this.ctx.textBaseline = "middle";
    
    const textX = this.encouragementX;
    const textY = h * 0.3;
    
    // Draw text with outline
    this.ctx.strokeText(this.encouragementText, textX, textY);
    this.ctx.fillText(this.encouragementText, textX, textY);
    
    this.ctx.restore();
    
    // Draw tap to continue on right side
    this.ctx.save();
    this.ctx.font = `${Math.min(w * 0.05, 40)}px Fredoka One`;
    this.ctx.fillStyle = `rgba(255, 255, 255, ${this.tapToContinueOpacity})`;
    this.ctx.textAlign = "right";
    this.ctx.textBaseline = "middle";
    
    const tapX = w - 30;
    const tapY = h * 0.7;
    
    this.ctx.fillText("Tap to Continue →", tapX, tapY);
    this.ctx.restore();
  }

  private drawGameOverUI(): void {
    const w = this.canvas.width;
    const h = this.canvas.height;
    
    this.ctx.save();
    this.ctx.font = `bold ${Math.min(w * 0.05, 40)}px Fredoka One`;
    this.ctx.fillStyle = "#ffffff";
    this.ctx.textAlign = "right";
    this.ctx.textBaseline = "middle";
    
    // Draw "Tap to Retry" on the right side
    const tapX = w * 0.9;
    const tapY = h * 0.7;
    
    this.ctx.globalAlpha = this.tapToRetryOpacity;
    this.ctx.fillText("← Tap to Retry", tapX, tapY);
    this.ctx.restore();
  }

  private drawFruit(centerX: number, centerY: number, fruit: Fruit): void {
    if (!fruit || !fruit.image) {
      return; // Don't draw if fruit or image is not available
    }
    if (fruit.image) {
      // Draw fruit image with proper aspect ratio
      const imageWidth = fruit.image.naturalWidth || fruit.image.width;
      const imageHeight = fruit.image.naturalHeight || fruit.image.height;
      const aspectRatio = imageWidth / imageHeight;
      
      // Scale based on radius but keep aspect ratio
      const baseSize = fruit.radius * 1.1; // Slightly bigger than radius
      let width: number;
      let height: number;
      
      if (aspectRatio > 1) {
        // Wider than tall
        width = baseSize;
        height = baseSize / aspectRatio;
      } else {
        // Taller than wide
        height = baseSize;
        width = baseSize * aspectRatio;
      }
      
      // Apply distortion effect
      const distortion = fruit.hitDistortion;
      // Use deterministic values based on distortion to avoid flickering
      // Create a pulsing squash/stretch effect
      const pulse = Math.sin(distortion * Math.PI * 6); // Fast pulse that slows as distortion decreases
      const scaleX = 1.0 + pulse * 0.08 * distortion; // Horizontal squash/stretch
      const scaleY = 1.0 - pulse * 0.08 * distortion; // Vertical squash/stretch
      // Small offset that decreases with distortion
      const offsetX = Math.sin(distortion * Math.PI * 8) * 2 * distortion;
      const offsetY = Math.cos(distortion * Math.PI * 8) * 2 * distortion;
      
      this.ctx.save();
      this.ctx.translate(centerX + offsetX, centerY + offsetY);
      this.ctx.rotate((fruit.rotationAngle * Math.PI) / 180);
      this.ctx.scale(scaleX, scaleY);
      this.ctx.drawImage(fruit.image, -width / 2, -height / 2, width, height);
      this.ctx.restore();
    } else {
      // Fallback: draw simple circle
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, fruit.radius, 0, Math.PI * 2);
      this.ctx.fillStyle = "#ff6b6b";
      this.ctx.fill();
    }
  }

  private drawKnife(
    centerX: number,
    centerY: number,
    radius: number,
    angle: number,
    bounce: number,
    isColliding: boolean = false,
    customRotation?: number // Optional custom rotation override (for transition knives)
  ): void {
    // Convert angle from our convention (0°=top) to canvas convention (0°=right)
    // angle - 90 converts: 0° top -> -90° canvas = 270° canvas (which is up/right)
    const angleRad = ((angle - 90) * Math.PI) / 180;
    
    if (!this.knifeImage) {
      // Fallback: draw simple triangle
      // Position deeper inside fruit (at 50% of radius) so tip is inside
      const innerRadius = radius * 0.5;
      const offset = bounce * 5;
      const x = centerX + Math.cos(angleRad) * (innerRadius + offset);
      const y = centerY + Math.sin(angleRad) * (innerRadius + offset);
      
      this.ctx.save();
      this.ctx.translate(x, y);
      
      // Use custom rotation if provided (for transition knives), otherwise use default rotation
      if (customRotation !== undefined) {
        const customRotationRad = (customRotation * Math.PI) / 180;
        this.ctx.rotate(customRotationRad);
      } else {
        this.ctx.rotate(angleRad + Math.PI / 2 + Math.PI);
      }
      
      // 3x bigger
      this.ctx.fillStyle = isColliding ? "#ff0000" : CONFIG.KNIFE_COLOR;
      this.ctx.beginPath();
      this.ctx.moveTo(0, -36); // 3x bigger
      this.ctx.lineTo(-15, 36);
      this.ctx.lineTo(15, 36);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
      return;
    }
    
    // Calculate proper aspect ratio for knife
    const imageWidth = this.knifeImage.naturalWidth || this.knifeImage.width;
    const imageHeight = this.knifeImage.naturalHeight || this.knifeImage.height;
    const aspectRatio = imageWidth / imageHeight;
    
    // Size knife bigger
    const baseSize = radius * 0.6; // Bigger size
    let width: number;
    let height: number;
    
    if (aspectRatio > 1) {
      width = baseSize;
      height = baseSize / aspectRatio;
    } else {
      height = baseSize;
      width = baseSize * aspectRatio;
    }
    
    // Position knife so more of the blade is inside
    // The knife extends from the handle (outside) to the tip (inside)
    // We want more of the blade inside the fruit
    const knifeLength = height; // Total knife height
    const bladeLength = knifeLength * 0.6; // Approximate blade length (60% of total)
    const bladeInside = bladeLength * 0.7; // 70% of blade inside (more inserted)
    
    // Position at rim minus more blade, so more blade is inside
    const positionRadius = radius - bladeInside;
    const offset = bounce * 5; // Bounce animation
    const x = centerX + Math.cos(angleRad) * (positionRadius + offset);
    const y = centerY + Math.sin(angleRad) * (positionRadius + offset);
    
    this.ctx.save();
    this.ctx.translate(x, y);
    
    // Use custom rotation if provided (for transition knives), otherwise use default rotation
    if (customRotation !== undefined) {
      // Convert CSS rotation (0°=right, 90°=down) to canvas rotation
      // CSS: 0°=right, 90°=down, 180°=left, 270°=up
      // Canvas: 0°=right, 90°=down, 180°=left, 270°=up
      // The knife image needs to be rotated to point in the correct direction
      // Custom rotation is already in CSS degrees, convert to radians and adjust
      const customRotationRad = (customRotation * Math.PI) / 180;
      this.ctx.rotate(customRotationRad);
    } else {
      // Default rotation: point outward from fruit center
      this.ctx.rotate(angleRad + Math.PI / 2 + Math.PI); // Rotate 180 degrees (original rotation)
    }
    
    // Apply red tint if colliding
    if (isColliding) {
      this.ctx.globalCompositeOperation = "source-over";
      this.ctx.drawImage(this.knifeImage, -width / 2, -height / 2, width, height);
      // Overlay red tint
      this.ctx.globalCompositeOperation = "multiply";
      this.ctx.fillStyle = "#ff0000";
      this.ctx.fillRect(-width / 2, -height / 2, width, height);
      this.ctx.globalCompositeOperation = "source-over";
    } else {
      this.ctx.drawImage(this.knifeImage, -width / 2, -height / 2, width, height);
    }
    
    this.ctx.restore();
  }

  private drawFlyingKnifeSprite(x: number, y: number, scale: number, rotation: number, knife?: Knife): void {
    if (!this.knifeImage) {
      // Fallback: draw simple triangle
      this.ctx.save();
      this.ctx.translate(x, y);
      this.ctx.rotate(Math.PI / 2 + Math.PI + (rotation * Math.PI / 180));
      this.ctx.scale(scale, scale);
      this.ctx.fillStyle = CONFIG.KNIFE_COLOR;
      this.ctx.beginPath();
      this.ctx.moveTo(0, -15);
      this.ctx.lineTo(-6, 15);
      this.ctx.lineTo(6, 15);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.restore();
      return;
    }
    
    // Use transition knife size if available, otherwise calculate from fruit radius
    let knifeWidth: number;
    let knifeHeight: number;
    
    if (knife && knife.transitionKnifeWidth && knife.transitionKnifeHeight) {
      // Use stored transition size (same as gameplay)
      knifeWidth = knife.transitionKnifeWidth;
      knifeHeight = knife.transitionKnifeHeight;
    } else {
      // Calculate size (same as gameplay)
      const imageWidth = this.knifeImage.naturalWidth || this.knifeImage.width;
      const imageHeight = this.knifeImage.naturalHeight || this.knifeImage.height;
      const aspectRatio = imageWidth / imageHeight;
      const fruitRadius = this.fruit ? this.fruit.radius : 120;
      const baseSize = fruitRadius * 0.6;
      
      if (aspectRatio > 1) {
        knifeWidth = baseSize;
        knifeHeight = baseSize / aspectRatio;
      } else {
        knifeHeight = baseSize;
        knifeWidth = baseSize * aspectRatio;
      }
    }
    
    // Draw knife with correct size and rotation (same as gameplay)
    // Rotation is already calculated in CSS coordinates, convert to canvas coordinates
    this.ctx.save();
    this.ctx.translate(x, y);
    // Convert CSS rotation to canvas rotation (CSS: 0°=right, Canvas: 0°=right, but we need to match the gameplay sprite rotation)
    // The gameplay sprite uses: rotate((rotation * Math.PI / 180)) where rotation is in CSS degrees
    this.ctx.rotate((rotation * Math.PI) / 180);
    this.ctx.drawImage(this.knifeImage, -knifeWidth / 2, -knifeHeight / 2, knifeWidth, knifeHeight);
    this.ctx.restore();
  }
  
  private drawParticles(): void {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      
      if (p.type === "drop") {
        // Draw teardrop shape for juice drops
        this.drawJuiceDrop(p.x, p.y, p.size, p.vy, p.color);
      } else {
        // Draw splash particles as slightly elongated ovals for liquid effect
        this.drawJuiceSplash(p.x, p.y, p.size, p.vx, p.vy, p.color);
      }
      
      this.ctx.restore();
    }
  }
  
  private drawJuiceDrop(x: number, y: number, size: number, vy: number, color: string): void {
    // Draw a teardrop shape pointing downward
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    
    // Teardrop shape: circle on top, point on bottom
    const dropLength = size * 1.5; // Make drops slightly elongated
    const direction = vy > 0 ? 1 : -1; // Point in direction of movement
    
    // Top circle part
    this.ctx.arc(x, y - dropLength * 0.3 * direction, size, 0, Math.PI * 2);
    
    // Bottom point
    this.ctx.moveTo(x, y + dropLength * 0.7 * direction);
    this.ctx.lineTo(x - size * 0.6, y + dropLength * 0.2 * direction);
    this.ctx.lineTo(x + size * 0.6, y + dropLength * 0.2 * direction);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Add a highlight for 3D effect
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    this.ctx.beginPath();
    this.ctx.arc(x - size * 0.3, y - dropLength * 0.4 * direction, size * 0.4, 0, Math.PI * 2);
    this.ctx.fill();
  }
  
  private drawJuiceSplash(x: number, y: number, size: number, vx: number, vy: number, color: string): void {
    // Draw elongated oval in direction of movement for liquid splash effect
    this.ctx.fillStyle = color;
    
    // Calculate angle of movement
    const angle = Math.atan2(vy, vx);
    const elongation = 1.3; // Make splashes slightly elongated
    
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.rotate(angle);
    this.ctx.beginPath();
    this.ctx.ellipse(0, 0, size * elongation, size / elongation, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Add a highlight for 3D liquid effect
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    this.ctx.beginPath();
    this.ctx.ellipse(-size * 0.3, -size * 0.3, size * 0.5 * elongation, size * 0.5 / elongation, 0, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.restore();
  }
  
  private createBrokenKnifePieces(x: number, y: number, rotation: number): void {
    if (!this.brokenKnife1Image || !this.brokenKnife2Image) return;
    
    // Spawn exactly 2 broken pieces at the exact same position
    for (let i = 0; i < 2; i++) {
      const spriteIndex = i + 1; // 1 or 2
      
      // Pieces fall in different directions (left and right)
      const direction = i === 0 ? -1 : 1; // Left (-1) or Right (1)
      const speed = 80 + Math.random() * 40; // Horizontal speed
      
      const piece: BrokenKnifePiece = {
        x, // Exact same position
        y, // Exact same position
        vx: direction * speed, // Different horizontal directions
        vy: 50 + Math.random() * 50, // Downward velocity
        rotation: rotation + (Math.random() - 0.5) * 0.5, // Slight rotation variation
        rotationSpeed: (Math.random() - 0.5) * 8, // Random rotation speed
        scale: 1.0, // No scaling - use native resolution
        life: 2.0, // Pieces last 2 seconds
        maxLife: 2.0,
        spriteIndex: spriteIndex, // Which broken sprite to use (1 or 2)
      };
      
      this.brokenKnifePieces.push(piece);
    }
  }
  
  private updateBrokenKnifePieces(dt: number): void {
    for (let i = this.brokenKnifePieces.length - 1; i >= 0; i--) {
      const piece = this.brokenKnifePieces[i];
      
      // Update position
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      
      // Apply gravity
      piece.vy += 300 * dt; // Gravity pulls down
      
      // Update rotation
      piece.rotation += piece.rotationSpeed * dt;
      
      // Apply friction
      piece.vx *= 0.98;
      piece.vy *= 0.98;
      
      // Update life
      piece.life -= dt;
      
      // Remove dead pieces
      if (piece.life <= 0) {
        this.brokenKnifePieces.splice(i, 1);
      }
    }
  }
  
  private updateCoinAnimations(dt: number): void {
    const targetX = 60; // Top left corner X (with padding)
    const targetY = 60; // Top left corner Y (with padding)
    
    for (const coin of this.coins) {
      if (coin.animating) {
        coin.animProgress += dt * 2; // Animation speed
        
        if (coin.animProgress >= 1) {
          // Animation complete
          coin.animating = false;
          coin.animProgress = 1;
        }
        
        // Ease out animation (easeOutCubic)
        const t = coin.animProgress;
        const eased = 1 - Math.pow(1 - t, 3);
        
        // Interpolate position
        const startX = coin.animX;
        const startY = coin.animY;
        coin.animX = startX + (targetX - startX) * eased;
        coin.animY = startY + (targetY - startY) * eased;
      }
    }
  }
  
  private drawCoins(centerX: number, centerY: number): void {
    if (!this.fruit) return;
    
    const targetX = 60; // Top left corner X
    const targetY = 60; // Top left corner Y
    
    for (const coin of this.coins) {
      if (coin.collected && coin.animating) {
        // Draw coin animating to top left
        this.drawCoin(coin.animX, coin.animY, 1.0 - coin.animProgress, 1.0);
      } else if (!coin.collected) {
        // Draw coin spinning with fruit
        const angleRad = ((coin.angle + this.fruit.rotationAngle - 90) * Math.PI) / 180;
        const positionRadius = this.fruit.radius * 0.7; // Outside the fruit (120% of radius)
        const coinX = centerX + Math.cos(angleRad) * positionRadius;
        const coinY = centerY + Math.sin(angleRad) * positionRadius;
        this.drawCoin(coinX, coinY, 1.0, coin.spawnScale);
      }
    }
  }
  
  private drawCoin(x: number, y: number, alpha: number, scale: number = 1.0): void {
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.translate(x, y);
    this.ctx.scale(scale, scale);
    this.ctx.translate(-x, -y);
    
    // Draw coin as a golden circle
    const coinSize = 20;
    
    // Outer glow
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, coinSize);
    gradient.addColorStop(0, "rgba(255, 215, 0, 0.8)");
    gradient.addColorStop(0.5, "rgba(255, 215, 0, 0.4)");
    gradient.addColorStop(1, "rgba(255, 215, 0, 0)");
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, coinSize, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Coin body (golden)
    this.ctx.fillStyle = "#FFD700";
    this.ctx.beginPath();
    this.ctx.arc(x, y, coinSize * 0.7, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Coin border
    this.ctx.strokeStyle = "#FFA500";
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(x, y, coinSize * 0.7, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Coin symbol ($)
    this.ctx.fillStyle = "#FFA500";
    this.ctx.font = "bold 16px Orbitron";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("$", x, y);
    
    this.ctx.restore();
  }
  
  private drawBrokenKnifePieces(): void {
    for (const piece of this.brokenKnifePieces) {
      // Get the appropriate broken sprite
      const brokenSprite = piece.spriteIndex === 1 ? this.brokenKnife1Image : this.brokenKnife2Image;
      if (!brokenSprite) continue;
      
      const alpha = piece.life / piece.maxLife;
      
      // Use native sprite resolution but scale down
      const spriteWidth = brokenSprite.naturalWidth || brokenSprite.width;
      const spriteHeight = brokenSprite.naturalHeight || brokenSprite.height;
      
      // Scale down to 30% of native size, then apply piece.scale
      const sizeMultiplier = 0.3;
      const displayWidth = spriteWidth * sizeMultiplier * piece.scale;
      const displayHeight = spriteHeight * sizeMultiplier * piece.scale;
      
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.translate(piece.x, piece.y);
      this.ctx.rotate(piece.rotation);
      
      // Draw the broken knife sprite at reduced size
      this.ctx.drawImage(
        brokenSprite,
        -displayWidth / 2,  // Destination X (centered)
        -displayHeight / 2, // Destination Y (centered)
        displayWidth,       // Destination width (60% of native)
        displayHeight       // Destination height (60% of native)
      );
      
      this.ctx.restore();
    }
  }

  private gameLoop(time: number): void {
    const dt = (time - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = time;
    
    if (dt > 0 && dt < 1) {
      // Cap dt to prevent large jumps
      this.update(Math.min(dt, 0.1));
    }
    
    this.render();
    requestAnimationFrame((t) => this.gameLoop(t));
  }
}

// Initialize game when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    new KnifeHitGame();
  });
} else {
  new KnifeHitGame();
}
