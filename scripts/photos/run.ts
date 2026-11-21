import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { csv, fileName, parseArgs, type BackupFile } from "./lib";

/**
 * After an event (ADR-012, runbooks/event-checklist.md):
 *   npm run photos:export -- holiday-2026 --site https://<site>
 *   npm run photos:prune -- holiday-2026 --site https://<site> --backup "Drive: Game Master/holiday-2026" --count 42
 * Signs in with ADMIN_PASSPHRASE, like Controls. Export saves every photo and
 * kept drawing with a CSV; prune deletes them from Blob once the event has
 * ended and the count matches the backup.
 */

const say = (line: string) => process.stdout.write(`${line}\n`);

async function signIn(site: string, passphrase: string): Promise<string> {
  const res = await fetch(`${site}/api/admin/session`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ passphrase }),
  });
  if (!res.ok)
    throw new Error(`Sign-in failed (${String(res.status)}). Check ADMIN_PASSPHRASE and --site.`);
  const cookie = res.headers.get("set-cookie")?.split(";")[0];
  if (!cookie) throw new Error("Sign-in gave no session.");
  return cookie;
}

async function call<T>(site: string, path: string, cookie: string, body?: unknown): Promise<T> {
  const res = await fetch(`${site}${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { cookie, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const json = (await res.json().catch(() => null)) as { error?: string } | null;
  if (!res.ok) throw new Error(json?.error ?? `The site said ${String(res.status)}.`);
  return json as T;
}

async function main() {
  const args = parseArgs(process.argv.slice(2), process.env);
  if (typeof args === "string") throw new Error(args);
  const passphrase = process.env.ADMIN_PASSPHRASE;
  if (!passphrase) throw new Error("Set ADMIN_PASSPHRASE to the admin passphrase first.");
  const cookie = await signIn(args.site, passphrase);
  const path = `/api/admin/events/${args.slug}/backup`;
  if (args.command === "prune") {
    const { deleted } = await call<{ deleted: number }>(args.site, path, cookie, {
      backup: args.backup,
      count: args.count,
    });
    say(
      `Deleted ${String(deleted)} file${deleted === 1 ? "" : "s"} from Blob; their records now say "${args.backup}".`,
    );
    return;
  }
  const { files, count } = await call<{ files: BackupFile[]; count: number }>(
    args.site,
    path,
    cookie,
  );
  let saved = 0;
  for (const f of files) {
    const res = await fetch(f.url);
    if (!res.ok)
      throw new Error(`Couldn't download ${f.url} (${String(res.status)}). Nothing was deleted.`);
    const to = join(args.out, fileName(f));
    await mkdir(dirname(to), { recursive: true });
    await writeFile(to, Buffer.from(await res.arrayBuffer()));
    saved++;
  }
  await mkdir(args.out, { recursive: true });
  await writeFile(join(args.out, "files.csv"), csv(files));
  const photos = files.filter((f) => f.kind === "photo").length;
  say(
    `Saved ${String(saved)} of ${String(count)} files (${String(photos)} photos, ${String(saved - photos)} drawings) to ${args.out}.`,
  );
  say(
    `Back it up, check the count, then: npm run photos:prune -- ${args.slug} --site ${args.site} --backup "<where>" --count ${String(count)}`,
  );
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
