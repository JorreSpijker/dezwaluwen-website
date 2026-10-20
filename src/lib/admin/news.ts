// Nieuwsberichten in /beheer: markdown met frontmatter lezen en schrijven in src/content/news.
import { parse, stringify } from 'yaml';
import { listDir, readFile } from './repo';

export const NEWS_DIR = 'src/content/news';
export const IMAGE_DIR = 'src/assets/news';

// Frontmatter zoals de editor hem gebruikt; datum als YYYY-MM-DD
export type NewsMeta = {
  title: string;
  titleShort?: string;
  date: string;
  category: string;
  image: string;
  imageAlt: string;
  sticky: boolean;
};

const isoDate = (value: unknown) => (value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? ''));

export function parseNews(content: string): { meta: NewsMeta; body: string } {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  const data = (match ? parse(match[1]) : {}) ?? {};
  return {
    meta: {
      title: data.title ?? '',
      titleShort: data.titleShort || undefined,
      date: isoDate(data.date),
      category: data.category ?? '',
      image: data.image ?? '',
      imageAlt: data.imageAlt ?? '',
      sticky: data.sticky === true,
    },
    body: (match ? match[2] : content).replace(/^\n+/, ''),
  };
}

// Vaste volgorde, lege korte titel en sticky: false weglaten (zoals de bestaande berichten)
export function serializeNews(meta: NewsMeta, body: string) {
  const data: Record<string, unknown> = { title: meta.title };
  if (meta.titleShort) data.titleShort = meta.titleShort;
  Object.assign(data, { date: meta.date, category: meta.category, image: meta.image, imageAlt: meta.imageAlt });
  if (meta.sticky) data.sticky = true;
  return `---\n${stringify(data, { lineWidth: 0 })}---\n\n${body.trim()}\n`;
}

// Pad in de repo van de foto uit de frontmatter (relatief aan src/content/news)
export const imagePath = (image: string) => image.replace(/^\.\.\/\.\.\//, 'src/');

export const slugify = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '') || 'bericht';

export async function listNews() {
  const files = (await listDir(NEWS_DIR)).filter((f) => f.name.endsWith('.md'));
  const items = await Promise.all(
    files.map(async (f) => {
      const { meta } = parseNews((await readFile(`${NEWS_DIR}/${f.name}`)).content);
      return { slug: f.name.replace(/\.md$/, ''), ...meta };
    }),
  );
  return items.sort((a, b) => Number(b.sticky) - Number(a.sticky) || b.date.localeCompare(a.date));
}
