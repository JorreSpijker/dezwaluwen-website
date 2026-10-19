// Trainingstijden: alle data staat in trainingstijden.json (de enige plek om tijden aan te passen).
// Dit bestand levert alleen types en hulpfuncties voor de pagina's.
import { z } from 'astro/zod';
import json from './trainingstijden.json';

export type Cell = { time: string; field?: string; note?: string } | null;
export type Row = { team: string; cells: Cell[] };
export type Schedule = {
  id: string;
  title: string;
  start: string;
  columns: { day: string; location?: string }[];
  groups: { title: string; rows: Row[] }[];
  note: string;
};

// Schema bewaakt de JSON (ook na edits via het CMS): een fout laat de build falen
// Leeg optioneel veld uit het CMS ("") telt als niet ingevuld
const optional = <T extends z.ZodType>(schema: T) => z.preprocess((v) => v || undefined, schema.optional());
const day = z.enum(['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag']);
const column = z.strictObject({ day, location: optional(z.string()) });
const slot = column.extend({ time: z.string().min(1), field: optional(z.string()), note: optional(z.string()) });
const schedule = z
  .strictObject({
    title: z.string().min(1),
    start: z.string().min(1),
    columns: z.array(column).min(1),
    groups: z.array(
      z.strictObject({
        title: z.string().min(1),
        rows: z.array(z.strictObject({ team: z.string().min(1), slots: z.array(slot) })),
      }),
    ),
    note: z.string().default(''),
  })
  .superRefine((s, ctx) => {
    for (const row of s.groups.flatMap((g) => g.rows)) {
      for (const sl of row.slots) {
        if (row.slots.filter((x) => x.day === sl.day && x.location === sl.location).length > 1) {
          ctx.addIssue({ code: 'custom', message: `${s.title} ${row.team}: ${sl.day} staat meer dan eens in slots` });
        }
        const matches = s.columns.filter((c) => c.day === sl.day && c.location === sl.location).length;
        if (matches !== 1) {
          ctx.addIssue({
            code: 'custom',
            message: `${s.title} ${row.team}: ${sl.day}${sl.location ? ` (${sl.location})` : ''} staat ${matches ? 'dubbel' : 'niet'} in columns`,
          });
        }
      }
    }
  });
const data = z.strictObject({ veld: schedule, zaal: schedule }).parse(json);

// Slots per team omzetten naar één cel per kolom, voor de tabel
const toSchedule = (id: string, { groups, ...s }: z.infer<typeof schedule>): Schedule => ({
  id,
  ...s,
  groups: groups.map((g) => ({
    title: g.title,
    rows: g.rows.map((r) => ({
      team: r.team,
      cells: s.columns.map((c) => {
        const sl = r.slots.find((x) => x.day === c.day && x.location === c.location);
        return sl ? { time: sl.time, field: sl.field, note: sl.note } : null;
      }),
    })),
  })),
});

export const veld = toSchedule('veld', data.veld);
export const zaal = toSchedule('zaal', data.zaal);

// Trainingen van één team, bv. trainingFor('J5') → { veld: ['wo 18:00–19:00', …], zaal: [...] }
const teamName = (team: string) => team.replace('*', '').replace(/\s*\(.*\)$/, '').trim();

const rowFor = (schedule: Schedule, team: string) =>
  schedule.groups.flatMap((g) => g.rows).find((r) => teamName(r.team) === team);

function slots(schedule: Schedule, team: string) {
  const row = rowFor(schedule, team);
  if (!row) return [];
  return row.cells.flatMap((cell, i) =>
    cell ? [`${schedule.columns[i].day.slice(0, 2).toLowerCase()} ${cell.time}${cell.note ? ` (${cell.note})` : ''}`] : [],
  );
}

export const trainingFor = (team: string) => ({ veld: slots(veld, team), zaal: slots(zaal, team) });

// Dagen waarop een groep teams traint, in weekvolgorde, bv. 'woensdag en vrijdag'
function days(schedule: Schedule, teams: string[]) {
  const used = new Set(
    teams.flatMap((team) => rowFor(schedule, team)?.cells.flatMap((cell, i) => (cell ? [schedule.columns[i].day] : [])) ?? []),
  );
  const list = [...new Set(schedule.columns.map((c) => c.day))].filter((day) => used.has(day)).map((day) => day.toLowerCase());
  return list.length > 1 ? `${list.slice(0, -1).join(', ')} en ${list.at(-1)}` : (list[0] ?? '');
}

export const trainingDaysFor = (teams: string[]) => ({ veld: days(veld, teams), zaal: days(zaal, teams) });

// Korte samenvatting voor de hero, bv. 'Veld wo & vr · zaal ma & wo'
function shortDays(schedule: Schedule, teams: string[]) {
  const used = new Set(
    teams.flatMap((team) => rowFor(schedule, team)?.cells.flatMap((cell, i) => (cell ? [schedule.columns[i].day] : [])) ?? []),
  );
  return [...new Set(schedule.columns.map((c) => c.day))]
    .filter((day) => used.has(day))
    .map((day) => day.slice(0, 2).toLowerCase())
    .join(' & ');
}

export const trainingSummary = (teams: string[]) =>
  [
    ['Veld', shortDays(veld, teams)],
    ['zaal', shortDays(zaal, teams)],
  ]
    .filter(([, days]) => days)
    .map(([label, days]) => `${label} ${days}`)
    .join(' · ');
