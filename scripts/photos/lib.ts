/**
 * The pure parts of `npm run photos:export` and `photos:prune` (ADR-012):
 * reading the arguments, naming the saved files, and the CSV beside them.
 * The scripts' network and disk work is in ./run.ts.
 */

export type BackupFile = {
  kind: "photo" | "drawing";
  id: string;
  gameId: string;
  game: string;
  playerId: string;
  nickname: string;
  at: number;
  score: number | null;
  url: string;
};

export type Args =
  | { command: "export"; slug: string; site: string; out: string }
  | { command: "prune"; slug: string; site: string; backup: string; count: number };

const SLUG = /^[a-z0-9-]{2,60}$/;

/** `export <slug> [--site URL] [--out DIR]` or `prune <slug> --backup TEXT --count N [--site URL]`. */
export function parseArgs(argv: string[], env: Record<string, string | undefined>): Args | string {
  const [command, slug, ...rest] = argv;
  const flags: Record<string, string> = {};
  for (let i = 0; i < rest.length; i += 2) {
    const key = rest[i];
    const value = rest[i + 1];
    if (!key?.startsWith("--") || value === undefined) return `Didn't understand "${key ?? ""}".`;
    flags[key.slice(2)] = value;
  }
  if (!slug || !SLUG.test(slug)) return "Say which event, like: holiday-2026";
  const site = (flags.site ?? env.GM_SITE ?? "http://localhost:3000").replace(/\/+$/, "");
  if (!/^https?:\/\//.test(site)) return "--site must start with http:// or https://";
  if (command === "export") return { command, slug, site, out: flags.out ?? `backups/${slug}` };
  if (command === "prune") {
    const backup = flags.backup?.trim() ?? "";
    const count = Number(flags.count);
    if (!backup) return 'Say where the backup is: --backup "Drive: Game Master/<slug>"';
    if (!Number.isInteger(count) || count < 0)
      return "Say how many files the backup holds: --count N (export prints it)";
    return { command, slug, site, backup, count };
  }
  return "Use export or prune.";
}

/** A name a file system takes on Windows, macOS and Linux: letters, digits and dashes. */
export const safe = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[^\w-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "x";

const extension = (url: string, kind: BackupFile["kind"]) => {
  const m = /\.(jpe?g|png|webp|svg)(?:$|\?)/i.exec(new URL(url).pathname);
  return (m?.[1] ?? (kind === "drawing" ? "svg" : "jpg")).toLowerCase();
};

/** Where a file is saved in the backup folder: by kind, then time, who, game and id. */
export function fileName(f: BackupFile): string {
  const when = new Date(f.at).toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `${f.kind}s/${when}_${safe(f.nickname)}_${safe(f.game)}_${safe(f.id)}.${extension(f.url, f.kind)}`;
}

const cell = (v: string | number | null) => {
  const s = v === null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** The CSV beside the files: one row per file, who, when, which game, its score. */
export function csv(files: BackupFile[]): string {
  const head = ["kind", "file", "game", "player", "taken_at", "score", "url"];
  const rows = files.map((f) =>
    [f.kind, fileName(f), f.game, f.nickname, new Date(f.at).toISOString(), f.score, f.url]
      .map(cell)
      .join(","),
  );
  return [head.join(","), ...rows].join("\n") + "\n";
}
