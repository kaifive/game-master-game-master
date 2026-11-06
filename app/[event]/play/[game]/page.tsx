import { notFound } from "next/navigation";
import { GameView } from "@/components/events/views";
import { toPublicEvent } from "@/lib/events";
import { eventRuntime, getEvent } from "@/lib/events/server";
import { instructionsFor } from "@/lib/games/server";

export const dynamic = "force-dynamic";

/** A game's page: instructions, play and result for solo games (spec 08). */
export default async function GamePage({
  params,
}: {
  params: Promise<{ event: string; game: string }>;
}) {
  const { event: slug, game: gameId } = await params;
  const config = getEvent(slug);
  if (!config) notFound();
  const event = toPublicEvent(config);
  const game = event.games.find((g) => g.id === gameId);
  if (!game) notFound();
  const instructions = instructionsFor(config, gameId);
  return (
    <GameView
      event={event}
      game={game}
      status={await eventRuntime().status(slug)}
      {...(instructions ? { play: { instructions } } : {})}
    />
  );
}
