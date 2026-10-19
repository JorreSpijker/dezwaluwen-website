import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const news = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/news' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      // Kortere titel voor de mobiele nieuwslijst
      titleShort: z.preprocess((v) => v || undefined, z.string().optional()),
      date: z.coerce.date(),
      category: z.string(),
      image: image(),
      imageAlt: z.string().default(''),
      // Vastgepind: altijd bovenaan, los van de datum
      sticky: z.boolean().default(false),
    }),
});

export const collections = { news };
