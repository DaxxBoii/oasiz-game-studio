// @ts-nocheck
/**
 * Oasiz uploader CLI (fixed)
 *
 * Usage:
 *   bun run upload --list
 *   bun run upload <game-name> [--skip-build] [--dry-run] [--verbose]
 *
 * Expects:
 *   - game folder contains dist/index.html after build
 *   - credentials in .env:
 *       OASIZ_UPLOAD_TOKEN=...
 *       OASIZ_EMAIL=...
 *       (optional) OASIZ_API_URL=...
 *
 * Fixes:
 *   - Avoids printing huge responses (server may echo uploaded HTML)
 *   - Parses JSON when available and prints useful fields only
 *   - Shows status, content-type, and a short preview on errors
 *   - Adds --verbose to print more (still never dumps full HTML)
 */
import { existsSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

type PublishMeta = {
  title?: string;
  description?: string;
  category?: string;
  gameId?: string;
};

type CliOptions = {
  list: boolean;
  skipBuild: boolean;
  dryRun: boolean;
  verbose: boolean;
  gameName: string | null;
};

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const list = args.includes("--list");
  const skipBuild = args.includes("--skip-build");
  const dryRun = args.includes("--dry-run");
  const verbose = args.includes("--verbose");

  const positional = args.filter((a) => !a.startsWith("--"));
  const gameName = positional.length > 0 ? positional[0] : null;

  return { list, skipBuild, dryRun, verbose, gameName };
}

function parseDotEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();

    // Strip quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (key) out[key] = value;
  }
  return out;
}

async function loadEnv(): Promise<void> {
  const envPath = resolve(".env");
  if (!existsSync(envPath)) return;

  const text = await Bun.file(envPath).text();
  const parsed = parseDotEnv(text);
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof process.env[k] === "undefined") process.env[k] = v;
  }
}

async function listGames(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);

  const games: string[] = [];
  for (const d of dirs) {
    // "Game folder" heuristic: package.json + index.html + src/main.ts
    const pkg = join(rootDir, d, "package.json");
    const html = join(rootDir, d, "index.html");
    const main = join(rootDir, d, "src", "main.ts");
    if (existsSync(pkg) && existsSync(html) && existsSync(main)) games.push(d);
  }

  games.sort((a, b) => a.localeCompare(b));
  return games;
}

async function runCmd(cwd: string, cmd: string[], label: string): Promise<void> {
  console.log(`[upload] ${label}:`, cmd.join(" "));
  const proc = Bun.spawn(cmd, {
    cwd,
    stdio: ["ignore", "inherit", "inherit"],
    env: process.env,
  });
  const exitCode = await proc.exited;
  if (exitCode !== 0) throw new Error(`[upload] Command failed (${label}) exit=${exitCode}`);
}

function coerceMeta(raw: unknown, gameName: string): PublishMeta {
  const fallback: PublishMeta = {
    title: gameName,
    description: "test",
    category: "test",
    gameId: "",
  };
  if (!raw || typeof raw !== "object") return fallback;
  const m = raw as PublishMeta;
  return {
    title: typeof m.title === "string" && m.title.trim() ? m.title.trim() : fallback.title,
    description:
      typeof m.description === "string" && m.description.trim()
        ? m.description.trim()
        : fallback.description,
    category:
      typeof m.category === "string" && m.category.trim() ? m.category.trim() : fallback.category,
    gameId: typeof m.gameId === "string" && m.gameId.trim() ? m.gameId.trim() : fallback.gameId,
  };
}

function guessMime(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "application/octet-stream";
}

async function findThumbnail(
  gameDir: string
): Promise<{ filename: string; mime: string; base64: string } | null> {
  const thumbDir = join(gameDir, "thumbnail");
  if (!existsSync(thumbDir)) return null;

  const entries = await readdir(thumbDir, { withFileTypes: true });
  const files = entries.filter((e) => e.isFile()).map((e) => e.name);
  const picked = files.find((f) => /\.(png|jpe?g|webp|gif)$/i.test(f));
  if (!picked) return null;

  const buf = Buffer.from(await Bun.file(join(thumbDir, picked)).arrayBuffer());
  return {
    filename: picked,
    mime: guessMime(picked),
    base64: buf.toString("base64"),
  };
}

function byteCountUtf8(s: string): number {
  return Buffer.byteLength(s, "utf8");
}

function safePreview(s: string, max = 600): string {
  if (!s) return "";
  if (s.length <= max) return s;
  return s.slice(0, max) + `\n... (truncated, total chars=${s.length})`;
}

async function readResponse(res: Response, verbose: boolean) {
  const contentType = res.headers.get("content-type") || "";
  const rawText = await res.text();

  let json: any = null;
  if (contentType.includes("application/json")) {
    try {
      json = JSON.parse(rawText);
    } catch {
      // ignore parse errors; keep rawText
    }
  }

  if (verbose) {
    console.log(`[upload] Response status=${res.status} content-type=${contentType}`);
    console.log(`[upload] Response preview:\n${safePreview(rawText, 1200)}`);
  }

  return { contentType, rawText, json };
}

function pickUsefulFields(json: any) {
  // Try a handful of common shapes without assuming the API format.
  // You can add/remove keys once you know the exact response contract.
  const candidates = [
    ["token", json?.token],
    ["token", json?.data?.token],
    ["uploadToken", json?.uploadToken],
    ["uploadToken", json?.data?.uploadToken],

    ["id", json?.id],
    ["id", json?.data?.id],
    ["gameId", json?.gameId],
    ["gameId", json?.data?.gameId],

    ["url", json?.url],
    ["url", json?.data?.url],
    ["gameUrl", json?.gameUrl],
    ["gameUrl", json?.data?.gameUrl],
    ["r2Key", json?.r2Key],
    ["r2Key", json?.data?.r2Key],

    ["message", json?.message],
    ["message", json?.data?.message],
    ["status", json?.status],
    ["status", json?.data?.status],
    ["ok", json?.ok],
    ["success", json?.success],
  ];

  const out: Record<string, any> = {};
  for (const [k, v] of candidates) {
    if (typeof v !== "undefined" && typeof out[k] === "undefined") out[k] = v;
  }
  return out;
}

async function main(): Promise<void> {
  await loadEnv();

  const opts = parseArgs(process.argv);
  const rootDir = resolve(".");

  if (opts.list) {
    const games = await listGames(rootDir);
    if (games.length === 0) {
      console.log("[upload] No game folders found at repo root.");
      return;
    }
    console.log("[upload] Available games:");
    for (const g of games) console.log(`- ${g}`);
    return;
  }

  if (!opts.gameName) {
    console.log("[upload] Usage:");
    console.log("  bun run upload --list");
    console.log("  bun run upload <game-name> [--skip-build] [--dry-run] [--verbose]");
    process.exitCode = 1;
    return;
  }

  const token = process.env.OASIZ_UPLOAD_TOKEN || "";
  const email = process.env.OASIZ_EMAIL || "";
  const apiUrl = process.env.OASIZ_API_URL || "https://api.oasiz.ai/api/upload/game";

  if (!token) throw new Error("[upload] Missing OASIZ_UPLOAD_TOKEN (set it in .env)");
  if (!email || email.includes("your-registered-email")) {
    throw new Error("[upload] Missing/placeholder OASIZ_EMAIL (set it in .env to your account email)");
  }

  const gameName = opts.gameName;
  const gameDir = resolve(gameName);
  if (!existsSync(gameDir)) throw new Error(`[upload] Game folder not found: ${gameDir}`);

  if (!opts.skipBuild) {
    await runCmd(gameDir, ["bun", "install"], "install");
    await runCmd(gameDir, ["bun", "run", "build"], "build");
  }

  const distHtmlPath = join(gameDir, "dist", "index.html");
  if (!existsSync(distHtmlPath)) {
    throw new Error(`[upload] Missing ${distHtmlPath}. Build must output dist/index.html`);
  }

  const html = await Bun.file(distHtmlPath).text();
  if (!html || html.length < 1000) {
    console.log("[upload] Warning: dist/index.html looks unusually small.");
  }

  const publishPath = join(gameDir, "publish.json");
  const rawMeta = existsSync(publishPath) ? await Bun.file(publishPath).json() : null;
  const meta = coerceMeta(rawMeta, gameName);

  const thumbnail = await findThumbnail(gameDir);

  const payload: Record<string, unknown> = {
    email,
    game: gameName,
    title: meta.title,
    description: meta.description,
    category: meta.category,
    html,
  };

  // Only include thumbnail if it exists (some APIs reject null)
  if (thumbnail) {
    payload.thumbnail = thumbnail;
  }

  // Only include gameId if it exists
  if (meta.gameId && meta.gameId.trim()) {
    payload.gameId = meta.gameId.trim();
  }

  // Always print sizes (helps diagnose 413 / payload limits)
  console.log(`[upload] Prepared payload: game="${payload.game}" title="${payload.title}" category="${payload.category}"`);
  if (payload.gameId) console.log(`[upload] gameId=${payload.gameId}`);
  console.log(`[upload] HTML bytes=${byteCountUtf8(html)} thumbnail=${thumbnail ? thumbnail.filename : "none"}`);
  console.log(`[upload] API URL=${apiUrl}`);

  if (opts.dryRun) {
    console.log("[upload] Dry run OK (no network request made).");
    return;
  }

  console.log(`[upload] Uploading "${gameName}"...`);

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const { contentType, rawText, json } = await readResponse(res, opts.verbose);

  if (!res.ok) {
    console.error(`[upload] Upload failed: HTTP ${res.status}`);
    console.error(`[upload] content-type=${contentType}`);

    if (json) {
      // Print structured error without dumping echoed HTML
      console.error("[upload] Error JSON:");
      console.error(JSON.stringify(json, null, 2));
    } else {
      // Print a short preview only
      console.error("[upload] Error body preview:");
      console.error(safePreview(rawText, 1200));
    }

    process.exitCode = 1;
    return;
  }

  // Success
  if (json) {
    const useful = pickUsefulFields(json);
    console.log("[upload] Upload OK.");
    if (Object.keys(useful).length > 0) {
      console.log("[upload] Result:", JSON.stringify(useful, null, 2));
    } else {
      // Avoid printing full response if it's huge / echoed
      console.log("[upload] Response JSON received (no common fields found). Use --verbose to preview.");
    }

    // Print helpful links if available
    if (json?.r2Key) {
      console.log("[upload] Direct HTML:", "https://assets.oasiz.ai/" + json.r2Key);
    }
    if (json?.gameUrl) {
      console.log("[upload] Game page:", json.gameUrl);
    }
    if (json?.gameId) {
      console.log("[upload] gameId:", json.gameId);
    }
  } else {
    // Non-JSON: print only a short preview
    console.log("[upload] Upload OK (non-JSON response).");
    console.log("[upload] Response preview:");
    console.log(safePreview(rawText, 1200));
  }
}

main().catch((e) => {
  console.error(String(e instanceof Error ? e.message : e));
  process.exitCode = 1;
});
