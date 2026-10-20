import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { newsFields } from './data/schemas';

const news = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/news' }),
  schema: ({ image }) => z.object({ ...newsFields, image: image() }),
});

export const collections = { news };
