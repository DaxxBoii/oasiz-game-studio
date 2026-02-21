// AUTO-GENERATED FILE. DO NOT EDIT.
// Source: shared/assets/entities/*.svg + shared/assets/entities/manifest.json
// Run: bun run generate:entities

export interface ShapePoint {
  x: number;
  y: number;
}

export interface GeneratedEntityTrailMeta {
  anchor: ShapePoint;
  maxAgeSec: number;
  startRadius: number;
  endRadius: number;
  alpha: number;
  blur: number;
  sampleIntervalSec: number;
  minSampleDistance: number;
}

export interface GeneratedEntityHardpointsMeta {
  muzzle?: ShapePoint;
  trail?: ShapePoint;
  joustLeft?: ShapePoint;
  joustRight?: ShapePoint;
  shieldRadii?: ShapePoint;
}

export interface GeneratedEntityRenderMeta {
  trail?: GeneratedEntityTrailMeta;
  hardpoints?: GeneratedEntityHardpointsMeta;
}

export interface GeneratedEntitySvgData {
  id: string;
  svgTemplate: string;
  viewBox: { minX: number; minY: number; width: number; height: number };
  colliderPathId: string;
  colliderPath: string;
  colliderVertices: ReadonlyArray<ShapePoint>;
  centerOfGravityLocal: ShapePoint;
  renderMeta?: GeneratedEntityRenderMeta;
  renderScale: number;
  physicsScale: number;
  slotDefaults: Readonly<Record<string, string>>;
}

export const GENERATED_ENTITY_SVG_DATA = [
  {
    "id": "ship",
    "svgTemplate": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-20 -20 40 40\" role=\"img\" aria-label=\"Ship (vertical squash)\">\n  <defs>\n    <style>\n      .slot-secondary { fill: var(--slot-secondary, #ffffff); }\n      .slot-stroke { stroke: var(--slot-stroke, #ffffff); }\n      .stop-primary { stop-color: var(--slot-primary, #00f0ff); }\n      .stop-dark { stop-color: #07121a; }\n    </style>\n\n    <linearGradient id=\"hullGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n      <stop offset=\"0\" class=\"stop-primary\" stop-opacity=\"1\"/>\n      <stop offset=\"0.60\" class=\"stop-primary\" stop-opacity=\"1\"/>\n      <stop offset=\"1\" class=\"stop-dark\" stop-opacity=\"1\"/>\n    </linearGradient>\n\n    <linearGradient id=\"wingGrad\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n      <stop offset=\"0\" class=\"stop-primary\" stop-opacity=\"1\"/>\n      <stop offset=\"1\" class=\"stop-dark\" stop-opacity=\"1\"/>\n    </linearGradient>\n\n    <radialGradient id=\"coreGlow\" cx=\"50%\" cy=\"50%\" r=\"50%\">\n      <stop offset=\"0\" class=\"stop-primary\" stop-opacity=\"1.0\"/>\n      <stop offset=\"45%\" class=\"stop-primary\" stop-opacity=\"0.55\"/>\n      <stop offset=\"100%\" class=\"stop-primary\" stop-opacity=\"0\"/>\n    </radialGradient>\n\n  </defs>\n\n  <metadata id=\"render-meta\">\n{\n  \"trail\": {\n    \"anchor\": { \"x\": -9.2, \"y\": 0.0 },\n    \"maxAgeSec\": 4.0,\n    \"startRadius\": 10.5,\n    \"endRadius\": 2.2,\n    \"alpha\": 0.48,\n    \"blur\": 14.0,\n    \"sampleIntervalSec\": 0.04,\n    \"minSampleDistance\": 0.7\n  }\n}\n  </metadata>\n\n  <!-- Editor-only guide layer. generate-entity-assets strips this from runtime SVG. -->\n  \n\n  <!-- scale(1 0.8) is applied AFTER rotate => squashes screen-vertical -->\n  <g id=\"visual\" transform=\"scale(1 0.8) rotate(90) scale(0.35) translate(-0.25 -4.5)\">\n    <circle cx=\"0\" cy=\"30\" r=\"28\" fill=\"url(#coreGlow)\"/>\n\n    <polygon\n      points=\"-32.9,27.1 -49.9,22.7 -33.6,10.5 -19.2,23.0\"\n      fill=\"url(#wingGrad)\"\n      class=\"slot-stroke\"\n      stroke-width=\"3\"\n      stroke-linejoin=\"round\"\n    />\n    <polygon\n      points=\"36.2,27.1 50.4,23.0 34.3,10.3 19.3,22.4\"\n      fill=\"url(#wingGrad)\"\n      class=\"slot-stroke\"\n      stroke-width=\"3\"\n      stroke-linejoin=\"round\"\n    />\n\n    <polygon\n      points=\"0,-32 37,3 16,18 -16,18 -37,3\"\n      fill=\"url(#hullGrad)\"\n      class=\"slot-stroke\"\n      stroke-width=\"3\"\n      stroke-linejoin=\"round\"\n    />\n\n    <polygon points=\"0,-22 26,4 0,16\" fill=\"#000\" opacity=\"0.18\"/>\n    <polygon points=\"0,-22 -26,4 0,16\" fill=\"#000\" opacity=\"0.10\"/>\n    <polygon points=\"-16,18 0,16 16,18 0,10\" fill=\"#000\" opacity=\"0.12\"/>\n\n    <polygon points=\"0,-24 15,-11 0,-7 -15,-11\" fill=\"#07121a\" opacity=\"0.95\"/>\n    <path class=\"slot-secondary\" d=\"M -16 -14 L 0 -28 L 16 -14 L 12 -10 L 0 -20 L -12 -10 Z\" opacity=\"1\"/>\n\n    <polygon\n      points=\"0,34 13,24 0,14 -13,24\"\n      fill=\"var(--slot-primary, #00f0ff)\"\n      opacity=\"0.78\"\n      class=\"slot-stroke\"\n      stroke-width=\"3\"\n      stroke-linejoin=\"round\"\n    />\n    <polygon\n      points=\"0,31 9,24 0,17 -9,24\"\n      fill=\"var(--slot-primary, #00f0ff)\"\n      opacity=\"0.92\"\n    />\n  </g>\n\n  <path\n    id=\"collider\"\n    d=\"M 12.775 -0.07 L 0.525 10.29 L -6.475 14.042 L -10.325 -0.07 L -6.37 -14.042 L 0.525 -10.43 Z\"\n    fill=\"none\"\n    stroke=\"none\"\n  />\n</svg>",
    "viewBox": {
      "minX": -20,
      "minY": -20,
      "width": 40,
      "height": 40
    },
    "colliderPathId": "collider",
    "colliderPath": "M 12.775 -0.07 L 0.525 10.29 L -6.475 14.042 L -10.325 -0.07 L -6.37 -14.042 L 0.525 -10.43 Z",
    "colliderVertices": [
      {
        "x": 12.775,
        "y": -0.07
      },
      {
        "x": 0.525,
        "y": 10.29
      },
      {
        "x": -6.475,
        "y": 14.042
      },
      {
        "x": -10.325,
        "y": -0.07
      },
      {
        "x": -6.37,
        "y": -14.042
      },
      {
        "x": 0.525,
        "y": -10.43
      }
    ],
    "centerOfGravityLocal": {
      "x": 12.775,
      "y": -0.07
    },
    "renderMeta": {
      "trail": {
        "anchor": {
          "x": -9.2,
          "y": 0
        },
        "maxAgeSec": 4,
        "startRadius": 10.5,
        "endRadius": 2.2,
        "alpha": 0.48,
        "blur": 14,
        "sampleIntervalSec": 0.04,
        "minSampleDistance": 0.7
      },
      "hardpoints": {
        "shieldRadii": {
          "x": 19.2,
          "y": 16.1
        },
        "muzzle": {
          "x": 13.2,
          "y": 0
        },
        "trail": {
          "x": -12.8,
          "y": 0
        },
        "joustLeft": {
          "x": -9.8,
          "y": -13.2
        },
        "joustRight": {
          "x": -9.8,
          "y": 13.2
        }
      }
    },
    "renderScale": 1.5,
    "physicsScale": 1.5,
    "slotDefaults": {
      "slot-primary": "#00f0ff",
      "slot-secondary": "#ffffff",
      "slot-tertiary": "#ff4400",
      "slot-stroke": "#ffffff"
    }
  },
  {
    "id": "pilot",
    "svgTemplate": "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-20 -20 40 40\" role=\"img\" aria-label=\"Astro Party pilot hi-fi\">\n  <defs>\n    <style>\n      .slot-secondary { fill: var(--slot-secondary, #f5f5f5); }\n      .slot-stroke { stroke: var(--slot-outline, #ffffff); }\n      .stop-primary { stop-color: var(--slot-primary, #00f0ff); }\n      .stop-dark { stop-color: var(--slot-tertiary, #1d2636); }\n    </style>\n\n    <linearGradient id=\"suitGrad\" x1=\"0.05\" y1=\"0.15\" x2=\"0.95\" y2=\"0.85\">\n      <stop offset=\"0\" class=\"stop-primary\" stop-opacity=\"1\"/>\n      <stop offset=\"0.58\" class=\"stop-primary\" stop-opacity=\"1\"/>\n      <stop offset=\"1\" class=\"stop-dark\" stop-opacity=\"1\"/>\n    </linearGradient>\n\n    <linearGradient id=\"panelGrad\" x1=\"0\" y1=\"1\" x2=\"1\" y2=\"0\">\n      <stop offset=\"0\" class=\"stop-dark\" stop-opacity=\"1\"/>\n      <stop offset=\"0.42\" class=\"stop-primary\" stop-opacity=\"0.85\"/>\n      <stop offset=\"1\" class=\"stop-primary\" stop-opacity=\"1\"/>\n    </linearGradient>\n\n    <radialGradient id=\"visorGlow\" cx=\"62%\" cy=\"48%\" r=\"52%\">\n      <stop offset=\"0\" class=\"stop-primary\" stop-opacity=\"0.95\"/>\n      <stop offset=\"55%\" class=\"stop-primary\" stop-opacity=\"0.35\"/>\n      <stop offset=\"100%\" class=\"stop-dark\" stop-opacity=\"1\"/>\n    </radialGradient>\n\n    <radialGradient id=\"thrusterGlow\" cx=\"25%\" cy=\"50%\" r=\"60%\">\n      <stop offset=\"0\" class=\"stop-primary\" stop-opacity=\"1\"/>\n      <stop offset=\"45%\" class=\"stop-primary\" stop-opacity=\"0.55\"/>\n      <stop offset=\"100%\" class=\"stop-primary\" stop-opacity=\"0\"/>\n    </radialGradient>\n\n    <filter id=\"softShadow\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\">\n      <feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"0.55\" result=\"b\"/>\n      <feOffset in=\"b\" dx=\"0.35\" dy=\"0.45\" result=\"o\"/>\n      <feColorMatrix in=\"o\" type=\"matrix\"\n        values=\"0 0 0 0 0\n                0 0 0 0 0\n                0 0 0 0 0\n                0 0 0 0.24 0\" result=\"s\"/>\n      <feMerge>\n        <feMergeNode in=\"s\"/>\n        <feMergeNode in=\"SourceGraphic\"/>\n      </feMerge>\n    </filter>\n  </defs>\n\n  <g id=\"visual\" filter=\"url(#softShadow)\" transform=\"scale(0.62)\">\n    <circle cx=\"-12.4\" cy=\"0\" r=\"7.2\" fill=\"url(#thrusterGlow)\"/>\n\n    <path\n      d=\"M -16.0 -5.6 L -11.2 -8.6 L -9.0 -2.6 L -9.0 2.6 L -11.2 8.6 L -16.0 5.6 L -17.2 0 Z\"\n      fill=\"var(--slot-tertiary, #1d2636)\"\n      opacity=\"0.94\"\n      class=\"slot-stroke\"\n      stroke-width=\"0.9\"\n      stroke-linejoin=\"round\"\n    />\n\n    <path\n      d=\"M -14.6 -4.5 L -11.4 -6.4 L -10.0 -2.0 L -10.0 2.0 L -11.4 6.4 L -14.6 4.5 L -15.4 0 Z\"\n      fill=\"url(#panelGrad)\"\n      opacity=\"0.9\"\n    />\n\n    <path\n      d=\"M -9.6 -7.2\n         L 2.8 -7.2\n         Q 5.0 -7.2 6.6 -5.6\n         L 8.4 -3.8\n         Q 9.6 -2.6 9.6 -0.8\n         L 9.6 0.8\n         Q 9.6 2.6 8.4 3.8\n         L 6.6 5.6\n         Q 5.0 7.2 2.8 7.2\n         L -8.0 7.2\n         Q -10.2 7.2 -11.2 5.2\n         L -12.6 2.4\n         Q -13.2 1.2 -13.2 0\n         Q -13.2 -1.2 -12.6 -2.4\n         L -11.2 -5.2\n         Q -10.2 -7.2 -9.6 -7.2 Z\"\n      fill=\"url(#suitGrad)\"\n      class=\"slot-stroke\"\n      stroke-width=\"1.05\"\n      stroke-linejoin=\"round\"\n    />\n\n    <path\n      d=\"M -9.1 -6.2\n         L 2.7 -6.2\n         Q 4.6 -6.2 5.9 -4.9\n         L 7.5 -3.3\n         Q 8.5 -2.3 8.5 -0.9\n         L 8.5 0.9\n         Q 8.5 2.3 7.5 3.3\n         L 5.9 4.9\n         Q 4.6 6.2 2.7 6.2\n         L -7.9 6.2\n         Q -9.5 6.2 -10.2 4.8\n         L -11.4 2.4\n         Q -11.9 1.2 -11.9 0\n         Q -11.9 -1.2 -11.4 -2.4\n         L -10.2 -4.8\n         Q -9.5 -6.2 -9.1 -6.2 Z\"\n      fill=\"none\"\n      class=\"slot-stroke\"\n      stroke-width=\"0.45\"\n      opacity=\"0.65\"\n      stroke-linejoin=\"round\"\n    />\n\n    <g opacity=\"0.95\">\n      <polygon points=\"-2.8,-3.0 1.0,0 -2.8,3.0 -6.2,0\" fill=\"var(--slot-primary, #00f0ff)\"/>\n      <polygon points=\"-3.6,-1.8 -1.2,0 -3.6,1.8 -5.6,0\" fill=\"var(--slot-tertiary, #1d2636)\" opacity=\"0.28\"/>\n      <path d=\"M -2.8 -3.0 L 1.0 0 L -2.8 3.0\" fill=\"none\" stroke=\"var(--slot-secondary, #f5f5f5)\" opacity=\"0.26\" stroke-width=\"0.35\"/>\n    </g>\n\n    <!-- Internal body paneling -->\n    <polygon points=\"-0.6,-5.7 5.6,-0.3 -0.6,5.1\" fill=\"#000\" opacity=\"0.16\"/>\n    <polygon points=\"-0.6,-5.7 -6.8,-0.3 -0.6,5.1\" fill=\"#000\" opacity=\"0.16\"/>\n    <polygon points=\"-5.8,4.8 -0.6,4.2 4.6,4.8 -0.6,2.4\" fill=\"#000\" opacity=\"0.12\"/>\n    <path d=\"M -3.8 -3.5 L -0.6 -5.9 L 2.6 -3.5 L 1.8 -2.7 L -0.6 -4.5 L -3.0 -2.7 Z\" fill=\"var(--slot-secondary, #f5f5f5)\" opacity=\"0.42\"/>\n\n    <path d=\"M -7.6 -4.2 L 4.8 -4.2\" stroke=\"var(--slot-tertiary, #1d2636)\" stroke-width=\"0.55\" opacity=\"0.22\"/>\n    <path d=\"M -8.5 4.2 L 4.0 4.2\" stroke=\"var(--slot-tertiary, #1d2636)\" stroke-width=\"0.55\" opacity=\"0.18\"/>\n    <path d=\"M -0.8 -6.8 L -0.8 6.8\" stroke=\"var(--slot-tertiary, #1d2636)\" stroke-width=\"0.45\" opacity=\"0.16\"/>\n\n    <circle\n      cx=\"13.2\"\n      cy=\"0\"\n      r=\"6.5\"\n      fill=\"var(--slot-tertiary, #1d2636)\"\n      opacity=\"0.96\"\n      class=\"slot-stroke\"\n      stroke-width=\"1.05\"\n    />\n\n    <circle\n      cx=\"13.2\"\n      cy=\"0\"\n      r=\"5.6\"\n      fill=\"none\"\n      class=\"slot-stroke\"\n      stroke=\"var(--slot-secondary, #f5f5f5)\"\n      stroke-width=\"0.7\"\n      opacity=\"0.9\"\n    />\n\n    <path\n      d=\"M 9.6 -3.3\n         Q 12.4 -5.2 15.2 -4.0\n         Q 17.8 -2.8 17.8 0\n         Q 17.8 2.8 15.2 4.0\n         Q 12.4 5.2 9.6 3.3\n         Q 10.8 0 9.6 -3.3 Z\"\n      fill=\"url(#visorGlow)\"\n    />\n\n    <path\n      d=\"M 11.0 -2.4\n         Q 13.2 -3.8 15.2 -3.0\n         Q 16.6 -2.4 17.0 -1.0\n         Q 15.4 -1.2 14.0 -0.4\n         Q 12.2 0.6 11.2 2.0\n         Q 11.8 0 11.0 -2.4 Z\"\n      fill=\"var(--slot-secondary, #f5f5f5)\"\n      opacity=\"0.14\"\n    />\n    <circle cx=\"16.0\" cy=\"-1.4\" r=\"0.55\" fill=\"var(--slot-secondary, #f5f5f5)\" opacity=\"0.22\"/>\n    <circle cx=\"15.4\" cy=\"1.6\" r=\"0.40\" fill=\"var(--slot-secondary, #f5f5f5)\" opacity=\"0.18\"/>\n  </g>\n\n  <!-- Keep pilot collider stable for gameplay parity; M/L/Z only for extractor -->\n  <path\n    id=\"collider\"\n    d=\"M -10.664 0 L -9.92 -3.472 L -6.944 -5.332 L -5.952 -4.464 L 1.736 -4.464 L 4.092 -3.472 L 5.208 -2.356 L 5.952 -2.046 L 7.688 -3.224 L 9.424 -2.48 L 11.036 -1.736 L 11.346 0 L 11.036 1.736 L 9.424 2.48 L 7.688 3.224 L 5.952 2.046 L 5.208 2.356 L 4.092 3.472 L 1.736 4.464 L -4.96 4.464 L -6.944 5.332 L -9.92 3.472 Z\"\n    fill=\"none\"\n    stroke=\"none\"\n  />\n</svg>",
    "viewBox": {
      "minX": -20,
      "minY": -20,
      "width": 40,
      "height": 40
    },
    "colliderPathId": "collider",
    "colliderPath": "M -10.664 0 L -9.92 -3.472 L -6.944 -5.332 L -5.952 -4.464 L 1.736 -4.464 L 4.092 -3.472 L 5.208 -2.356 L 5.952 -2.046 L 7.688 -3.224 L 9.424 -2.48 L 11.036 -1.736 L 11.346 0 L 11.036 1.736 L 9.424 2.48 L 7.688 3.224 L 5.952 2.046 L 5.208 2.356 L 4.092 3.472 L 1.736 4.464 L -4.96 4.464 L -6.944 5.332 L -9.92 3.472 Z",
    "colliderVertices": [
      {
        "x": -10.664,
        "y": 0
      },
      {
        "x": -9.92,
        "y": -3.472
      },
      {
        "x": -6.944,
        "y": -5.332
      },
      {
        "x": -5.952,
        "y": -4.464
      },
      {
        "x": 1.736,
        "y": -4.464
      },
      {
        "x": 4.092,
        "y": -3.472
      },
      {
        "x": 5.208,
        "y": -2.356
      },
      {
        "x": 5.952,
        "y": -2.046
      },
      {
        "x": 7.688,
        "y": -3.224
      },
      {
        "x": 9.424,
        "y": -2.48
      },
      {
        "x": 11.036,
        "y": -1.736
      },
      {
        "x": 11.346,
        "y": 0
      },
      {
        "x": 11.036,
        "y": 1.736
      },
      {
        "x": 9.424,
        "y": 2.48
      },
      {
        "x": 7.688,
        "y": 3.224
      },
      {
        "x": 5.952,
        "y": 2.046
      },
      {
        "x": 5.208,
        "y": 2.356
      },
      {
        "x": 4.092,
        "y": 3.472
      },
      {
        "x": 1.736,
        "y": 4.464
      },
      {
        "x": -4.96,
        "y": 4.464
      },
      {
        "x": -6.944,
        "y": 5.332
      },
      {
        "x": -9.92,
        "y": 3.472
      }
    ],
    "centerOfGravityLocal": {
      "x": -10.664,
      "y": 0
    },
    "renderScale": 1.3,
    "physicsScale": 1.3,
    "slotDefaults": {
      "slot-primary": "#00f0ff",
      "slot-secondary": "#f5f5f5",
      "slot-tertiary": "#d6d6d6",
      "slot-outline": "#dcdcdc"
    }
  },
  {
    "id": "pilot_death_burst",
    "svgTemplate": "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"-20 -20 40 40\" role=\"img\" aria-label=\"Pilot death (suit burst)\">\n  <defs>\n    <style>\n      .slot-secondary { fill: var(--slot-secondary, #ffffff); }\n      .slot-stroke { stroke: var(--slot-stroke, #ffffff); }\n      .stop-primary { stop-color: var(--slot-primary, #00f0ff); }\n      .stop-dark { stop-color: #07121a; }\n    </style>\n\n    <!-- Suit metal -->\n    <linearGradient id=\"suitMetal\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">\n      <stop offset=\"0\" class=\"stop-primary\" stop-opacity=\"0.25\"/>\n      <stop offset=\"0.35\" class=\"stop-dark\" stop-opacity=\"1\"/>\n      <stop offset=\"1\" stop-color=\"#020508\" stop-opacity=\"1\"/>\n    </linearGradient>\n\n    <!-- Big energy burst -->\n    <radialGradient id=\"burstGlow\" cx=\"52%\" cy=\"48%\" r=\"62%\">\n      <stop offset=\"0\" class=\"stop-primary\" stop-opacity=\"0.98\"/>\n      <stop offset=\"0.35\" class=\"stop-primary\" stop-opacity=\"0.7\"/>\n      <stop offset=\"0.7\" class=\"stop-primary\" stop-opacity=\"0.25\"/>\n      <stop offset=\"1\" class=\"stop-primary\" stop-opacity=\"0\"/>\n    </radialGradient>\n\n    <!-- Hot core -->\n    <radialGradient id=\"core\" cx=\"50%\" cy=\"50%\" r=\"60%\">\n      <stop offset=\"0\" class=\"stop-primary\" stop-opacity=\"1\"/>\n      <stop offset=\"0.55\" class=\"stop-primary\" stop-opacity=\"0.7\"/>\n      <stop offset=\"1\" class=\"stop-primary\" stop-opacity=\"0\"/>\n    </radialGradient>\n\n    <filter id=\"softGlow\" x=\"-40%\" y=\"-40%\" width=\"180%\" height=\"180%\">\n      <feGaussianBlur stdDeviation=\"0.8\" result=\"b\"/>\n      <feMerge>\n        <feMergeNode in=\"b\"/>\n        <feMergeNode in=\"SourceGraphic\"/>\n      </feMerge>\n    </filter>\n\n    <filter id=\"shadow\" x=\"-30%\" y=\"-30%\" width=\"160%\" height=\"160%\">\n      <feGaussianBlur in=\"SourceAlpha\" stdDeviation=\"0.6\" result=\"b\"/>\n      <feOffset in=\"b\" dx=\"0.4\" dy=\"0.55\" result=\"o\"/>\n      <feColorMatrix in=\"o\" type=\"matrix\"\n        values=\"0 0 0 0 0\n                0 0 0 0 0\n                0 0 0 0 0\n                0 0 0 0.26 0\" result=\"s\"/>\n      <feMerge>\n        <feMergeNode in=\"s\"/>\n        <feMergeNode in=\"SourceGraphic\"/>\n      </feMerge>\n    </filter>\n  </defs>\n\n  <g id=\"visual\" filter=\"url(#shadow)\">\n    <!-- Energy bloom -->\n    <circle cx=\"1.2\" cy=\"0\" r=\"12.6\" fill=\"url(#burstGlow)\" opacity=\"0.95\" filter=\"url(#softGlow)\"/>\n\n    <!-- Burst rays (ship-like triangles) -->\n    <g opacity=\"0.75\">\n      <polygon points=\"2,-15 4,-10 0,-11\" fill=\"var(--slot-primary, #00f0ff)\"/>\n      <polygon points=\"12,-10 9,-6 7,-10\" fill=\"var(--slot-primary, #00f0ff)\"/>\n      <polygon points=\"15,1 10,1 12,-2\" fill=\"var(--slot-primary, #00f0ff)\"/>\n      <polygon points=\"12,12 8,8 12,7\" fill=\"var(--slot-primary, #00f0ff)\"/>\n      <polygon points=\"-2,16 -1,11 3,13\" fill=\"var(--slot-primary, #00f0ff)\"/>\n      <polygon points=\"-13,10 -9,7 -10,12\" fill=\"var(--slot-primary, #00f0ff)\"/>\n      <polygon points=\"-16,-1 -11,-2 -13,2\" fill=\"var(--slot-primary, #00f0ff)\"/>\n      <polygon points=\"-12,-12 -9,-7 -13,-7\" fill=\"var(--slot-primary, #00f0ff)\"/>\n    </g>\n\n    <!-- Suit halves pulled apart (reads as \"burst open\") -->\n    <g opacity=\"0.92\">\n      <!-- Left half -->\n      <path\n        d=\"M -10.8 -6.8\n           L -1.2 -6.8\n           L -2.6 -1.0\n           L -2.6 1.0\n           L -1.2 6.8\n           L -9.2 6.8\n           Q -10.7 6.8 -11.6 5.2\n           L -13.1 2.2\n           Q -13.8 1.1 -13.8 0\n           Q -13.8 -1.1 -13.1 -2.2\n           L -11.6 -5.2\n           Q -10.7 -6.8 -10.8 -6.8 Z\"\n        fill=\"url(#suitMetal)\"\n        class=\"slot-stroke\"\n        stroke-width=\"0.95\"\n        stroke-linejoin=\"round\"\n        transform=\"translate(-1.0,0) rotate(-8)\"\n      />\n\n      <!-- Right half (with helmet stub) -->\n      <path\n        d=\"M 2.0 -6.8\n           L 5.2 -6.8\n           Q 7.3 -6.8 8.9 -5.2\n           L 10.8 -3.3\n           Q 11.9 -2.2 11.9 -0.8\n           L 11.9 0.8\n           Q 11.9 2.2 10.8 3.3\n           L 8.9 5.2\n           Q 7.3 6.8 5.2 6.8\n           L 2.0 6.8\n           L 0.6 1.0\n           L 0.6 -1.0 Z\"\n        fill=\"url(#suitMetal)\"\n        class=\"slot-stroke\"\n        stroke-width=\"0.95\"\n        stroke-linejoin=\"round\"\n        transform=\"translate(1.4,0) rotate(10)\"\n      />\n    </g>\n\n    <!-- Torn seam highlights -->\n    <path d=\"M -1.2 -6.7 L 0.6 -1.0 L 0.6 1.0 L -1.2 6.7\"\n      stroke=\"var(--slot-primary, #00f0ff)\" stroke-width=\"0.55\" opacity=\"0.9\" stroke-linecap=\"round\" />\n\n    <!-- Core shard (diamond like pilot chest) -->\n    <polygon points=\"-0.4,-2.4 2.4,0 -0.4,2.4 -3.0,0\" fill=\"var(--slot-primary, #00f0ff)\" opacity=\"0.88\" filter=\"url(#softGlow)\"/>\n\n    <!-- Helmet popped off (small, upper-right) -->\n    <g transform=\"translate(10.6,-7.8) rotate(18)\" opacity=\"0.95\">\n      <circle cx=\"0\" cy=\"0\" r=\"3.2\" fill=\"#07121a\" class=\"slot-stroke\" stroke-width=\"0.85\"/>\n      <path d=\"M -2.2 -1.2 Q 0 -2.2 2.2 -1.2 Q 2.6 0 2.2 1.2 Q 0 2.2 -2.2 1.2 Q -2.6 0 -2.2 -1.2 Z\"\n        fill=\"var(--slot-primary, #00f0ff)\" opacity=\"0.35\"/>\n    </g>\n\n    <!-- Small debris blocks (ship plating) -->\n    <g opacity=\"0.65\">\n      <polygon points=\"-8,-12 -5,-10 -8,-9 -10,-11\" fill=\"var(--slot-secondary, #ffffff)\"/>\n      <polygon points=\"6,12 9,10 10,13 7,14\" fill=\"var(--slot-secondary, #ffffff)\"/>\n      <polygon points=\"-14,6 -12,4 -11,7 -13,8\" fill=\"var(--slot-secondary, #ffffff)\"/>\n      <polygon points=\"14,4 16,2 16,5\" fill=\"var(--slot-secondary, #ffffff)\"/>\n    </g>\n\n    <!-- Tiny status light dying out -->\n    <circle cx=\"18.3\" cy=\"0\" r=\"0.85\" fill=\"#ff2b6f\" opacity=\"0.5\"/>\n  </g>\n\n  <path id=\"collider\" d=\"M -17.2 0\n       L -16.0 -5.6\n       L -11.2 -8.6\n       L -9.6 -7.2\n       L 2.8 -7.2\n       Q 5.0 -7.2 6.6 -5.6\n       L 8.4 -3.8\n       Q 9.6 -2.6 9.6 -0.8\n       L 9.6 -3.3\n       Q 12.4 -5.2 15.2 -4.0\n       Q 17.8 -2.8 17.8 0\n       Q 17.8 2.8 15.2 4.0\n       Q 12.4 5.2 9.6 3.3\n       L 9.6 0.8\n       Q 9.6 2.6 8.4 3.8\n       L 6.6 5.6\n       Q 5.0 7.2 2.8 7.2\n       L 4.8 8.4\n       L 5.3 9.5\n       L -8.1 9.5\n       L -11.2 8.6\n       L -16.0 5.6\n       Z\" fill=\"none\" stroke=\"none\"/>\n</svg>",
    "viewBox": {
      "minX": -20,
      "minY": -20,
      "width": 40,
      "height": 40
    },
    "colliderPathId": "collider",
    "colliderPath": "M -17.2 0\n       L -16.0 -5.6\n       L -11.2 -8.6\n       L -9.6 -7.2\n       L 2.8 -7.2\n       Q 5.0 -7.2 6.6 -5.6\n       L 8.4 -3.8\n       Q 9.6 -2.6 9.6 -0.8\n       L 9.6 -3.3\n       Q 12.4 -5.2 15.2 -4.0\n       Q 17.8 -2.8 17.8 0\n       Q 17.8 2.8 15.2 4.0\n       Q 12.4 5.2 9.6 3.3\n       L 9.6 0.8\n       Q 9.6 2.6 8.4 3.8\n       L 6.6 5.6\n       Q 5.0 7.2 2.8 7.2\n       L 4.8 8.4\n       L 5.3 9.5\n       L -8.1 9.5\n       L -11.2 8.6\n       L -16.0 5.6\n       Z",
    "colliderVertices": [
      {
        "x": -17.2,
        "y": 0
      },
      {
        "x": -16,
        "y": -5.6
      },
      {
        "x": -11.2,
        "y": -8.6
      },
      {
        "x": -9.6,
        "y": -7.2
      },
      {
        "x": 2.8,
        "y": -7.2
      },
      {
        "x": 5,
        "y": -7.2
      },
      {
        "x": 6.6,
        "y": -5.6
      },
      {
        "x": 8.4,
        "y": -3.8
      },
      {
        "x": 9.6,
        "y": -2.6
      },
      {
        "x": 9.6,
        "y": -0.8
      },
      {
        "x": 9.6,
        "y": -3.3
      },
      {
        "x": 12.4,
        "y": -5.2
      },
      {
        "x": 15.2,
        "y": -4
      },
      {
        "x": 17.8,
        "y": -2.8
      },
      {
        "x": 17.8,
        "y": 0
      },
      {
        "x": 17.8,
        "y": 2.8
      },
      {
        "x": 15.2,
        "y": 4
      },
      {
        "x": 12.4,
        "y": 5.2
      },
      {
        "x": 9.6,
        "y": 3.3
      },
      {
        "x": 9.6,
        "y": 0.8
      },
      {
        "x": 9.6,
        "y": 2.6
      },
      {
        "x": 8.4,
        "y": 3.8
      },
      {
        "x": 6.6,
        "y": 5.6
      },
      {
        "x": 5,
        "y": 7.2
      },
      {
        "x": 2.8,
        "y": 7.2
      },
      {
        "x": 4.8,
        "y": 8.4
      },
      {
        "x": 5.3,
        "y": 9.5
      },
      {
        "x": -8.1,
        "y": 9.5
      },
      {
        "x": -11.2,
        "y": 8.6
      },
      {
        "x": -16,
        "y": 5.6
      }
    ],
    "centerOfGravityLocal": {
      "x": -17.2,
      "y": 0
    },
    "renderScale": 1.15,
    "physicsScale": 1,
    "slotDefaults": {
      "slot-primary": "#00f0ff",
      "slot-secondary": "#ffffff",
      "slot-stroke": "#ffffff"
    }
  }
] as const;
