// Pagina's in /cms: markdown met frontmatter lezen en schrijven in src/content/pages.
import { stringify } from 'yaml';
import { splitFrontmatter } from './news';
import { listDir, readFile } from './repo';

export const PAGES_DIR = 'src/content/pages';
export const PAGE_IMAGE_DIR = 'src/assets/pages';

// Frontmatter zoals de editor hem gebruikt; image '' = geen foto
export type PageMeta = {
  title: string;
  description: string;
  section: string;
  lead: string;
  image: string;
  imageAlt: string;
  factsStyle: 'tekst' | 'cijfers';
  facts: { title: string; text: string }[];
  block: string;
};

export function parsePage(content: string): { meta: PageMeta; body: string } {
  const { data, body } = splitFrontmatter(content);
  return {
    meta: {
      title: data.title ?? '',
      description: data.description ?? '',
      section: data.section ?? '',
      lead: data.lead ?? '',
      image: data.image ?? '',
      imageAlt: data.imageAlt ?? '',
      factsStyle: data.factsStyle === 'cijfers' ? 'cijfers' : 'tekst',
      facts: Array.isArray(data.facts) ? data.facts.map((f: { title?: unknown; text?: unknown }) => ({ title: String(f.title ?? ''), text: String(f.text ?? '') })) : [],
      block: data.block ?? '',
    },
    body,
  };
}

// Vaste volgorde; lege optionele velden weglaten
export function serializePage(meta: PageMeta, body: string) {
  const data: Record<string, unknown> = { title: meta.title, description: meta.description };
  if (meta.section) data.section = meta.section;
  data.lead = meta.lead;
  if (meta.image) Object.assign(data, { image: meta.image, imageAlt: meta.imageAlt });
  if (meta.facts.length) Object.assign(data, { factsStyle: meta.factsStyle, facts: meta.facts });
  if (meta.block) data.block = meta.block;
  return `---\n${stringify(data, { lineWidth: 0 })}---\n\n${body.trim()}\n`;
}

export async function listPages() {
  const files = (await listDir(PAGES_DIR)).filter((f) => f.name.endsWith('.md'));
  const items = await Promise.all(
    files.map(async (f) => {
      const { meta } = parsePage((await readFile(`${PAGES_DIR}/${f.name}`)).content);
      return { slug: f.name.replace(/\.md$/, ''), ...meta };
    }),
  );
  return items.sort((a, b) => a.title.localeCompare(b.title, 'nl'));
}
