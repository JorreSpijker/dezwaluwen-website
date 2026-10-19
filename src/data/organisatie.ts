// Bestuur en commissies: data staat in organisatie.json, dit bestand bewaakt de vorm.
import { z } from 'astro/zod';
import json from './organisatie.json';

// Leeg optioneel veld uit het CMS ("") telt als niet ingevuld
const optional = <T extends z.ZodType>(schema: T) => z.preprocess((v) => v || undefined, schema.optional());
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
  })
  .parse(json);
