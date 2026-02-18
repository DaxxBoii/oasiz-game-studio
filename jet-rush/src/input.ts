import type { GameState, HapticType } from "./config";
import { $ } from "./utils";

export interface InputState {
  left: boolean;
  right: boolean;
  touchId: number | null;
  touchX0: number;
  touchXNow: number;
}

type TapCallback = () => void;

/**
 * Sets up all input listeners (keyboard, touch, mobile buttons).
 * Returns the mutable input state object that the game reads each frame.
 */
export function initInput(
  getState: () => GameState,
  onTap: TapCallback,
  haptic: (type: HapticType) => void,
): InputState {
  const input: InputState = {
    left: false,
    right: false,
    touchId: null,
    touchX0: 0,
    touchXNow: 0,
  };

  const isUI = (e: Event) =>
    !!(e.target as HTMLElement).closest(
      ".modal-card,.icon-btn,.setting-row,.settings-list,.ctrl-btn,.shop-btn,.shop-container,#shopModal",
    );

  const handleTap = (e: Event) => {
    if (isUI(e)) return;
    const state = getState();
    if (state === "START" || state === "GAME_OVER") {
      onTap();
    }
  };

  /* Mouse */
  window.addEventListener("mousedown", handleTap);

  /* Touch - taps for start/restart, drag for steering */
  window.addEventListener(
    "touchstart",
    (e: TouchEvent) => {
      if (isUI(e)) return;
      const state = getState();
      if (state !== "PLAYING") {
        handleTap(e);
        return;
      }
      if (input.touchId !== null) return;
      const t = e.changedTouches[0];
      input.touchId = t.identifier;
      input.touchX0 = t.clientX;
      input.touchXNow = t.clientX;
    },
    { passive: true },
  );

  window.addEventListener(
    "touchmove",
    (e: TouchEvent) => {
      if (getState() !== "PLAYING" || input.touchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === input.touchId) {
          input.touchXNow = e.changedTouches[i].clientX;
          break;
        }
      }
    },
    { passive: true },
  );

  const touchEnd = (e: TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === input.touchId) {
        input.touchId = null;
        break;
      }
    }
  };
  window.addEventListener("touchend", touchEnd);
  window.addEventListener("touchcancel", touchEnd);

  /* Keyboard */
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "Enter") {
      e.preventDefault();
      handleTap(e);
      return;
    }
    if (getState() !== "PLAYING") return;
    if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = true;
    if (e.code === "ArrowRight" || e.code === "KeyD") input.right = true;
  });

  window.addEventListener("keyup", (e) => {
    if (e.code === "ArrowLeft" || e.code === "KeyA") input.left = false;
    if (e.code === "ArrowRight" || e.code === "KeyD") input.right = false;
  });

  /* Mobile buttons */
  const btnL = $("btnLeft");
  const btnR = $("btnRight");

  btnL.addEventListener("touchstart", (e) => {
    e.preventDefault();
    e.stopPropagation();
    input.left = true;
    haptic("light");
  });
  btnL.addEventListener("touchend", (e) => {
    e.preventDefault();
    input.left = false;
  });
  btnR.addEventListener("touchstart", (e) => {
    e.preventDefault();
    e.stopPropagation();
    input.right = true;
    haptic("light");
  });
  btnR.addEventListener("touchend", (e) => {
    e.preventDefault();
    input.right = false;
  });

  return input;
}

/** Resets input state for a new game. */
export function resetInput(input: InputState): void {
  input.left = false;
  input.right = false;
  input.touchId = null;
  input.touchX0 = 0;
  input.touchXNow = 0;
}
