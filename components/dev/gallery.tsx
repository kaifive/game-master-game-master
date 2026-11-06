"use client";

import { useState } from "react";
import { useSlots } from "@/components/slots/registry";
import type { Moment } from "@/lib/motion";

const noop = () => undefined;

function Item({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="grid content-start gap-2">
      <h3 className="m-0 text-xs font-bold tracking-widest text-gm-text-muted uppercase">{name}</h3>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

/** One gallery section: every slot, in the surrounding pack or admin theme. */
export function GallerySlots({ title }: { title: string }) {
  const s = useSlots();
  const [playing, setPlaying] = useState<Moment | null>(null);
  return (
    <section aria-label={title}>
      <s.Surface className="grid gap-6 p-4">
        <h2 className="m-0 font-gm-display text-2xl font-bold">{title}</h2>
        <Item name="Surface">
          <p className="m-0 text-sm text-gm-text-muted">The ground every screen sits on.</p>
        </Item>
        <Item name="Banner">
          <div className="w-full">
            <s.Banner title="Nova Wushu Holiday Party" live />
          </div>
        </Item>
        <Item name="Button">
          <s.Button>Play Word Sprint</s.Button>
          <s.Button tone="secondary">Enter a code</s.Button>
          <s.Button disabled>Locked</s.Button>
        </Item>
        <Item name="Panel">
          <s.Panel label="Join">
            <p className="m-0">Scan to join, or enter code DRGN5</p>
          </s.Panel>
        </Item>
        <Item name="ScoreCard">
          <s.ScoreCard label="Gift Guess" value={150} state="highlight" size="lg" />
          <s.ScoreCard label="Snow Scramble" value={120} state="scored" />
          <s.ScoreCard label="Daily Word" value={100} state="scored" size="sm" />
          <s.ScoreCard label="Word Sprint" state="blank" size="sm" />
        </Item>
        <Item name="Tile">
          <s.Tile letter="S" state="correct" />
          <s.Tile letter="T" state="present" />
          <s.Tile letter="C" state="absent" />
          <s.Tile letter="A" state="typed" />
          <s.Tile state="empty" />
        </Item>
        <Item name="Key">
          <s.Key label="A" state="correct" onPress={noop} />
          <s.Key label="T" state="present" onPress={noop} />
          <s.Key label="E" state="absent" onPress={noop} />
          <s.Key label="Q" onPress={noop} />
          <s.Key label="Enter" wide onPress={noop} />
        </Item>
        <Item name="Progress">
          <div className="grid w-full max-w-xs gap-3">
            <s.Progress done={5} total={9} label="Games scored" />
            <s.Progress done={14} total={30} label="Photos found" />
          </div>
        </Item>
        <Item name="Toast">
          <s.Toast text="Mai finished Gift Guess" value={150} />
          <s.Toast text="Bao joined Team Crane" />
        </Item>
        <Item name="LeaderboardRow">
          <ul className="m-0 w-full max-w-xl list-none p-0">
            <s.LeaderboardRow rank={1} name="Team Dragon" score={1840} team={1} highlight />
            <s.LeaderboardRow rank={2} name="Team Crane" score={1620} team={2} />
          </ul>
        </Item>
        <Item name="Buzzer">
          <div className="w-32">
            <s.Buzzer state="ready" onBuzz={noop} />
          </div>
          <div className="w-32">
            <s.Buzzer state="locked" onBuzz={noop} />
          </div>
        </Item>
        <Item name="CodeEntry">
          <div className="w-full max-w-xs">
            <s.CodeEntry onSubmit={noop} error="That code isn't valid." />
          </div>
        </Item>
        <Item name="Celebration">
          <s.Button
            tone="secondary"
            onClick={() => {
              setPlaying({
                id: String(Date.now()),
                kind: "judged-right",
                text: "Team Crane is right",
                value: 400,
              });
            }}
          >
            Play a celebration
          </s.Button>
          {playing && (
            <s.Celebration
              key={playing.id}
              moment={playing}
              surface="display"
              onDone={() => {
                setPlaying(null);
              }}
            />
          )}
        </Item>
      </s.Surface>
    </section>
  );
}
