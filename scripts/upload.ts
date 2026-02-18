/**
 * Wrapper entrypoint (kept for backwards compatibility).
 *
 * The canonical uploader lives at repo root: `upload.ts`.
 * `bun run upload ...` now runs `upload.ts` directly, but some docs/tools may still call `bun scripts/upload.ts`.
 */
import "../upload.ts";

