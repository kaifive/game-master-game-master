import type { Team, TeamsSummary } from "./model";
import type { TeamRepo, TeamSummaryRepo } from "./repo";
import { teamErrors } from "./repo.errors";

/** In-memory teams: for tests, and local runs without Firebase. */
export class MemoryTeamRepo implements TeamRepo {
  private readonly events = new Map<
    string,
    { teams: Map<string, Team>; names: Map<string, string> }
  >();
  private nextId = 1;

  private data(slug: string) {
    let d = this.events.get(slug);
    if (!d) this.events.set(slug, (d = { teams: new Map(), names: new Map() }));
    return d;
  }

  private teamOf(slug: string, playerId: string) {
    return [...this.data(slug).teams.values()].find((t) => t.memberIds.includes(playerId));
  }

  private team(slug: string, teamId: string) {
    const t = this.data(slug).teams.get(teamId);
    if (!t) throw teamErrors.noTeam();
    return t;
  }

  list(slug: string) {
    return Promise.resolve(
      [...this.data(slug).teams.values()].sort((a, b) => a.createdAt - b.createdAt),
    );
  }

  create(slug: string, captainId: string, color: number) {
    if (this.teamOf(slug, captainId)) return Promise.reject(teamErrors.onTeam());
    const n = this.nextId++;
    const team: Team = {
      id: `t${String(n)}`,
      name: null,
      color,
      captainId,
      memberIds: [captainId],
      createdAt: n,
    };
    this.data(slug).teams.set(team.id, team);
    return Promise.resolve(team);
  }

  rename(slug: string, teamId: string, name: string, key: string) {
    const d = this.data(slug);
    const team = d.teams.get(teamId);
    if (!team) return Promise.reject(teamErrors.noTeam());
    const owner = d.names.get(key);
    if (owner && owner !== teamId) return Promise.reject(teamErrors.nameTaken());
    for (const [k, id] of d.names) if (id === teamId) d.names.delete(k);
    d.names.set(key, teamId);
    d.teams.set(teamId, { ...team, name });
    return Promise.resolve();
  }

  join(slug: string, teamId: string, playerId: string, maxSize: number) {
    const team = this.data(slug).teams.get(teamId);
    if (!team) return Promise.reject(teamErrors.noTeam());
    if (this.teamOf(slug, playerId)) return Promise.reject(teamErrors.onTeam());
    if (team.memberIds.length >= maxSize) return Promise.reject(teamErrors.full());
    this.data(slug).teams.set(teamId, { ...team, memberIds: [...team.memberIds, playerId] });
    return Promise.resolve();
  }

  async move(slug: string, playerId: string, teamId: string) {
    const to = this.team(slug, teamId);
    if (to.memberIds.includes(playerId)) return;
    await this.drop(slug, playerId);
    const fresh = this.team(slug, teamId);
    this.data(slug).teams.set(teamId, { ...fresh, memberIds: [...fresh.memberIds, playerId] });
  }

  setCaptain(slug: string, teamId: string, playerId: string) {
    const team = this.data(slug).teams.get(teamId);
    if (!team) return Promise.reject(teamErrors.noTeam());
    if (!team.memberIds.includes(playerId)) return Promise.reject(teamErrors.notMember());
    this.data(slug).teams.set(teamId, { ...team, captainId: playerId });
    return Promise.resolve();
  }

  drop(slug: string, playerId: string) {
    const team = this.teamOf(slug, playerId);
    if (team)
      this.data(slug).teams.set(team.id, {
        ...team,
        memberIds: team.memberIds.filter((id) => id !== playerId),
        captainId: team.captainId === playerId ? null : team.captainId,
      });
    return Promise.resolve();
  }

  clear(slug: string) {
    this.events.delete(slug);
    return Promise.resolve();
  }
}

/** The in-memory teams summary. */
export class MemoryTeamSummaryRepo implements TeamSummaryRepo {
  private readonly summaries = new Map<string, TeamsSummary>();

  read(slug: string) {
    return Promise.resolve(this.summaries.get(slug) ?? null);
  }

  write(slug: string, summary: TeamsSummary) {
    this.summaries.set(slug, structuredClone(summary));
    return Promise.resolve();
  }
}
