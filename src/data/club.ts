// Clubcode, teams en Sportlink-codes: data staat in club.json, dit bestand bewaakt de vorm.
// Een fout (ook na edits via het CMS) laat de build falen, zodat het programma niet stilletjes breekt.
import { z } from 'astro/zod';
import json from './club.json';

const team = z.strictObject({
  // Ook gebruikt in de url van de teampagina
  short: z.string().regex(/^[A-Za-z0-9]+$/, 'alleen letters en cijfers'),
  name: z.string().min(1),
  category: z.string().min(1),
  teamCode: z.string().regex(/^T\d+$/, 'teamcode begint met T, gevolgd door cijfers'),
  pools: z.array(z.strictObject({ name: z.string().min(1), code: z.number().int().positive() })).min(1),
});

export const club = z
  .strictObject({
    clubCode: z.string().regex(/^[A-Z0-9]+$/, 'clubcode bestaat uit hoofdletters en cijfers'),
    teams: z.array(team).min(1),
  })
  .superRefine((c, ctx) => {
    const shorts = c.teams.map((t) => t.short.toLowerCase());
    for (const short of new Set(shorts.filter((s, i) => shorts.indexOf(s) !== i))) {
      ctx.addIssue({ code: 'custom', message: `team ${short} staat meer dan eens in club.json` });
    }
  })
  .parse(json);
