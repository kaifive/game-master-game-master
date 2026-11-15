/** Writes docs/GAMES.md from the game catalog (spec 23): `npm run games:doc`. */
import { writeFileSync } from "node:fs";
import { gamesDoc } from "@/lib/games";

writeFileSync("docs/GAMES.md", gamesDoc());
process.stdout.write("docs/GAMES.md written from lib/games/catalog.ts\n");
