import { GameLibrary } from "@/components/admin/game-library";
import { AdminSignIn } from "@/components/admin/sign-in";
import { isAdmin } from "@/lib/admin/server";
import { catalogByName } from "@/lib/games";

export const dynamic = "force-dynamic";

/** The game library: every game that's been built (spec 23). */
export default async function AdminGamesPage() {
  if (!(await isAdmin())) return <AdminSignIn />;
  return <GameLibrary games={catalogByName()} />;
}
