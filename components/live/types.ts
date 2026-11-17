import type { ReactNode } from "react";
import type { LiveView } from "@/lib/live";

export type ActiveLiveView = Extract<LiveView, { active: true }>;

/** What a showdown's TV view gets (specs 25 to 27). */
export type LiveTvProps = {
  view: ActiveLiveView;
  /** The game's own view for the TV. */
  game: unknown;
  /** The server's time on this device (S11-AC5). */
  serverNow: () => number;
  revealed: boolean;
};

/** What a showdown's phone controller gets: the captain's view and a way to send a move. */
export type LiveControllerProps = LiveTvProps & {
  send: (move: unknown) => Promise<void>;
  busy: boolean;
};

/** One showdown type's screens. */
export type LiveRenderer = {
  Tv: (props: LiveTvProps) => ReactNode;
  Controller: (props: LiveControllerProps) => ReactNode;
  /** A short looping demo of how it plays, for the TV intro (S24-AC4). */
  Demo?: (props: { still: boolean }) => ReactNode;
};
