// Programma en uitslagen uit de korfbal.nl (dotlab) API, opgehaald tijdens de build.

export type Match = { time: string; home: string; away: string; homeOwn: boolean; awayOwn: boolean; score: string; result?: 'win' | 'draw' | 'loss' };
export type MatchDay = { label: string; matches: Match[] };

import { club } from '../data/club';

// Clubcode, teamcodes en poules staan in src/data/club.json
const CLUB = club.clubCode;
const API = `https://api-saas-site-prod-236.dotlab.net/general/api/competition/clubs/${CLUB}`;

type Team = { teamId: string; teamName: string; clubRefId: string; score: number };
type ApiMatch = {
  matchDate: string; // bv. "2026-10-17"
  startTime: string; // bv. "12:40:00", lokale tijd
  homeTeam: Team;
  awayTeam: Team;
  status: string; // "FINAL" = gespeeld
  facility?: { name: string; address?: { city: string } };
};
type ApiWeek = { matches: ApiMatch[] };

// YYYY-MM-DD in Nederlandse tijd
const isoDate = (date: Date) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam' }).format(date);

const dayLabel = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  const label = new Intl.DateTimeFormat('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
  return label.charAt(0).toUpperCase() + label.slice(1);
};

function toMatch(m: ApiMatch): Match {
  const homeOwn = m.homeTeam.clubRefId === CLUB;
  const awayOwn = m.awayTeam.clubRefId === CLUB;
  const played = m.status === 'FINAL';
  const home = m.homeTeam.score;
  const away = m.awayTeam.score;
  // Score vanuit eigen team; geen uitslag zonder eindstand of eigen team
  const diff = homeOwn ? home - away : away - home;
  const result = !played || !(homeOwn || awayOwn) ? undefined : diff > 0 ? 'win' : diff < 0 ? 'loss' : 'draw';
  return {
    time: m.startTime.slice(0, 5),
    home: m.homeTeam.teamName,
    away: m.awayTeam.teamName,
    homeOwn,
    awayOwn,
    score: played ? `${home}–${away}` : '–',
    result,
  };
}

function groupByDay(matches: ApiMatch[]): MatchDay[] {
  const days = new Map<string, MatchDay>();
  for (const m of matches) {
    const day = m.matchDate;
    if (!days.has(day)) days.set(day, { label: dayLabel(day), matches: [] });
    days.get(day)!.matches.push(toMatch(m));
  }
  return [...days.values()];
}

const DAY = 24 * 60 * 60 * 1000;

// Storing bij korfbal.nl mag de build (en dus elke contentwijziging) niet blokkeren:
// dan zonder wedstrijden verder, met een waarschuwing in de buildlog.
// Na de eerste fout de rest van de build overslaan, anders wacht elke pagina op een timeout.
let unavailable = false;

async function fetchMatches(endpoint: 'program' | 'results', from: Date, to: Date): Promise<ApiMatch[]> {
  if (unavailable) return [];
  try {
    const res = await fetch(`${API}/${endpoint}?dateFrom=${isoDate(from)}&dateTo=${isoDate(to)}`, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { data: weeks } = (await res.json()) as { data: ApiWeek[] };
    return weeks.flatMap((w) => w.matches);
  } catch (error) {
    unavailable = true;
    console.warn(`korfbal.nl ${endpoint} niet beschikbaar, verder zonder wedstrijden:`, String(error));
    return [];
  }
}

export async function getMatches(): Promise<{ program: MatchDay[]; results: MatchDay[] }> {
  const today = new Date();
  const [program, results] = await Promise.all([
    fetchMatches('program', today, new Date(today.getTime() + 7 * DAY)),
    fetchMatches('results', new Date(today.getTime() - 7 * DAY), today),
  ]);
  // Uitslagen: meest recente speeldag bovenaan
  return { program: groupByDay(program), results: groupByDay(results).reverse() };
}

// --- Teams ---

export type ClubTeam = {
  name: string; // "Zwaluwen J5", "Rivalen/Zwaluwen 3"
  teamCode: string;
  short: string; // "J5", "S3", zoals in trainingstijden en menu
  slug: string; // "j5"
  category: string; // "Senioren" / "Jeugd"
  pools: { name: string; code: number }[];
};

export const teams: ClubTeam[] = club.teams.map((team) => ({ ...team, slug: team.short.toLowerCase() }));

export type TeamMatch = Match & { date: string; isHome: boolean; location: string };

const shortDate = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, d)))
    .replaceAll('.', '');
};

const titleCase = (text: string) => text.toLowerCase().replace(/(^|[\s-])\S/g, (c) => c.toUpperCase());

// Club-brede wedstrijden van 4 weken terug tot 4 weken vooruit; één keer per build opgehaald
let matchCache: Promise<{ program: ApiMatch[]; results: ApiMatch[] }> | undefined;

function matchWindow() {
  const today = new Date();
  matchCache ??= Promise.all([
    fetchMatches('program', today, new Date(today.getTime() + 28 * DAY)),
    fetchMatches('results', new Date(today.getTime() - 28 * DAY), today),
  ]).then(([program, results]) => ({ program, results }));
  return matchCache;
}

export async function getTeamMatches(teamCode: string): Promise<{ program: TeamMatch[]; results: TeamMatch[] }> {
  const { program, results } = await matchWindow();
  const ofTeam = (m: ApiMatch) => m.homeTeam.teamId === teamCode || m.awayTeam.teamId === teamCode;
  const toTeamMatch = (m: ApiMatch): TeamMatch => ({
    ...toMatch(m),
    date: shortDate(m.matchDate),
    isHome: m.homeTeam.teamId === teamCode,
    location: [m.facility?.name, m.facility?.address?.city && titleCase(m.facility.address.city)].filter(Boolean).join(', '),
  });
  return {
    program: program.filter(ofTeam).map(toTeamMatch),
    // Meest recente uitslag bovenaan
    results: results.filter(ofTeam).map(toTeamMatch).reverse(),
  };
}

// --- Stand ---

const STANDING_API = 'https://api-saas-site-prod-236.dotlab.net/general/api/competition/matches/pools';

export type StandingRow = {
  position: number;
  team: string;
  own: boolean;
  played: number;
  won: number;
  draw: number;
  lost: number;
  difference: number;
  points: number;
};
export type Standing = { pool: string; rows: StandingRow[] };

type ApiStanding = {
  team: { name: string };
  stats: { position: number; played: number; won: number; draw: number; lost: number; points: number; goals: { difference: number } };
};

// Stand van elke poule waarin het team speelt; poule die niet te laden is, wordt overgeslagen (zie fetchMatches)
export async function getTeamStandings(team: ClubTeam): Promise<Standing[]> {
  const standings = await Promise.all(
    team.pools.map(async (pool): Promise<Standing | undefined> => {
      if (unavailable) return undefined;
      let data: { standings: ApiStanding[] }[];
      try {
        const res = await fetch(`${STANDING_API}/${pool.code}/standing`, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        ({ data } = (await res.json()) as { data: { standings: ApiStanding[] }[] });
      } catch (error) {
        unavailable = true;
        console.warn(`stand poule ${pool.code} niet beschikbaar, overgeslagen:`, String(error));
        return undefined;
      }
      return {
        pool: pool.name,
        rows: data
          .flatMap((d) => d.standings)
          .map(({ team: t, stats }) => ({
            position: stats.position,
            team: t.name,
            own: t.name === team.name,
            played: stats.played,
            won: stats.won,
            draw: stats.draw,
            lost: stats.lost,
            difference: stats.goals.difference,
            points: stats.points,
          }))
          .sort((a, b) => a.position - b.position),
      };
    }),
  );
  return standings.filter((s) => s !== undefined);
}
