// Zod-schema's voor de data in src/data/*.json. Gedeeld door de build (fout = build faalt),
// de cms-API (fout = geen commit) en de formulieren in /cms.
import { z } from 'astro/zod';

// Foutmeldingen in het Nederlands (build en /cms)
z.config(z.locales.nl());

// Leeg optioneel veld uit een formulier ("") telt als niet ingevuld
const optional = <T extends z.ZodType>(schema: T) => z.preprocess((v) => v || undefined, schema.optional());

// --- Trainingstijden ---
export const days = ['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'] as const;
const day = z.enum(days);
const column = z.strictObject({ day, location: optional(z.string()) });
const slot = column.extend({ time: z.string().min(1), field: optional(z.string()), note: optional(z.string()) });
export const schedule = z
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
export const trainingstijden = z.strictObject({ veld: schedule, zaal: schedule });

// --- Club: teams en Sportlink-codes ---
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
  });

// --- Bestuur en commissies ---
const member = z.strictObject({ name: z.string().min(1), role: z.string().min(1), email: optional(z.email()) });

export const organisatie = z
  .strictObject({
    bestuur: z.strictObject({
      id: z.string().min(1),
      name: z.string().min(1),
      email: z.email(),
      description: z.string().min(1),
      tasksTitle: z.string().min(1),
      tasks: z.array(z.string().min(1)),
      // Bestuursleden tonen altijd een mailadres
      members: z.array(member.extend({ email: z.email() })),
    }),
    commissies: z.array(
      z.strictObject({
        id: z.string().regex(/^[a-z0-9-]+$/, 'alleen kleine letters, cijfers en -'),
        name: z.string().min(1),
        short: optional(z.string()),
        email: z.email(),
        description: z.string().min(1),
        tasks: z.array(z.string().min(1)),
        members: z.array(member),
      }),
    ),
  });

// --- Nieuws: frontmatter van src/content/news/*.md ---
// Gedeeld door content.config.ts (die voegt image() toe) en /cms
export const newsFields = {
  title: z.string().min(1),
  // Kortere titel voor de mobiele nieuwslijst
  titleShort: optional(z.string()),
  date: z.coerce.date(),
  category: z.string().min(1),
  imageAlt: z.string().default(''),
  // Vastgepind: altijd bovenaan, los van de datum
  sticky: z.boolean().default(false),
};

// In /cms is de foto een pad naar src/assets, gezien vanaf het md-bestand
export const newsImage = z.string().regex(/^\.\.\/\.\.\/assets\/[a-z0-9_/-]+\.(webp|jpe?g|png)$/, 'foto moet in src/assets staan');
export const newsFrontmatter = z.strictObject({ ...newsFields, image: newsImage });

// --- Pagina's: frontmatter van src/content/pages/*.md ---
// Slugs van bestaande routes (en 'nieuw' voor /cms/paginas/nieuw); een pagina mag die niet gebruiken
export const reservedSlugs = ['nieuws', 'teams', 'cms', 'api', 'proefles', 'trainingstijden', 'bestuur-en-commissies', 'nieuw'];
export const pageSlug = z
  .string()
  .regex(/^[a-z0-9-]+$/, 'alleen kleine letters, cijfers en -')
  .refine((s) => !reservedSlugs.includes(s), 'deze naam is al in gebruik op de site');

// Vaste blokken die na de eerste alinea komen
export const pageBlocks = { veld: 'Korfbalveld (tekening)', teams: 'Teams (uit trainingstijden)' } as const;

export const pageFields = {
  title: z.string().min(1),
  // Voor zoekmachines en bij delen
  description: z.string().min(1),
  // Kruimelpad: Home / <section>
  section: optional(z.string()),
  lead: z.string().min(1),
  imageAlt: z.string().default(''),
  // Feiten onder de foto; cijfers = groot getal met tekst eronder, {teams} = aantal teams
  factsStyle: z.enum(['tekst', 'cijfers']).default('tekst'),
  facts: z.array(z.strictObject({ title: z.string().min(1), text: z.string().min(1) })).default([]),
  block: optional(z.enum(Object.keys(pageBlocks) as [keyof typeof pageBlocks])),
};
export const pageFrontmatter = z.strictObject({ ...pageFields, image: optional(newsImage) });
