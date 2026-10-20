// Nieuwsbericht opslaan of verwijderen: markdown + eventueel nieuwe foto in één commit.
import type { APIRoute } from 'astro';
import { canAccess, checkContent } from '../../../lib/admin/access';
import { IMAGE_DIR, NEWS_DIR, imagePath, parseNews, serializeNews, slugify, type NewsMeta } from '../../../lib/admin/news';
import { ConflictError, commit, exists, readFile, type Change } from '../../../lib/admin/repo';

export const prerender = false;

type Body =
  | { action: 'save'; slug: string | null; sha: string | null; meta: NewsMeta; body: string; image?: string }
  | { action: 'delete'; slug: string; sha: string };

// Geüploade foto moet een WebP zijn (verkleind in de browser), max 3 MB
const isWebp = (base64: string) => {
  const bytes = Buffer.from(base64, 'base64');
  return bytes.length < 3_000_000 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
};

// Foto's die alleen bij dit bericht horen (in src/assets/news) mogen mee weg
const ownImage = (image: string) => imagePath(image).startsWith(`${IMAGE_DIR}/`);

async function uniqueSlug(title: string) {
  const base = slugify(title);
  for (let n = 1; ; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await exists(`${NEWS_DIR}/${slug}.md`))) return slug;
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user!;
  const input = (await request.json()) as Body;
  if (input.slug && !/^[a-z0-9-]+$/.test(input.slug)) return new Response('Ongeldige slug', { status: 400 });
  const changes: Change[] = [];
  let slug: string;
  let message: string;

  if (input.action === 'delete') {
    slug = input.slug;
    const { meta } = parseNews((await readFile(`${NEWS_DIR}/${slug}.md`)).content);
    changes.push({ path: `${NEWS_DIR}/${slug}.md`, content: null, sha: input.sha });
    if (ownImage(meta.image)) changes.push({ path: imagePath(meta.image), content: null, sha: (await readFile(imagePath(meta.image))).sha });
    message = `content: nieuws "${meta.title}" verwijderd door ${user.name}`;
  } else {
    slug = input.slug ?? (await uniqueSlug(input.meta.title));
    const meta = { ...input.meta };
    if (input.image) {
      if (!isWebp(input.image)) return Response.json({ issues: [{ path: ['image'], message: 'Foto kon niet worden verwerkt' }] }, { status: 422 });
      // Nieuwe naam per upload, zodat een vervangen foto niet uit een cache komt
      const path = `${IMAGE_DIR}/${slug}-${Date.now().toString(36)}.webp`;
      changes.push({ path, content: input.image, encoding: 'base64', sha: null });
      if (input.slug) {
        const old = parseNews((await readFile(`${NEWS_DIR}/${slug}.md`)).content).meta.image;
        if (ownImage(old)) changes.push({ path: imagePath(old), content: null, sha: (await readFile(imagePath(old))).sha });
      }
      meta.image = `../../${path.replace(/^src\//, '')}`;
    } else if (!meta.image || !(await exists(imagePath(meta.image)))) {
      return Response.json({ issues: [{ path: ['image'], message: 'Kies een foto' }] }, { status: 422 });
    }
    const content = serializeNews(meta, input.body);
    const checked = checkContent(`${NEWS_DIR}/${slug}.md`, content);
    if ('issues' in checked) return Response.json({ issues: checked.issues }, { status: 422 });
    changes.unshift({ path: `${NEWS_DIR}/${slug}.md`, content, sha: input.slug ? input.sha : null });
    message = `content: nieuws "${meta.title}" ${input.slug ? 'bijgewerkt' : 'toegevoegd'} door ${user.name}`;
  }

  // Laatste vangnet: alleen toegestane paden
  if (!changes.every((c) => canAccess(c.path))) return new Response('Geen toegang', { status: 403 });
  try {
    const { shas, commit: sha } = await commit(changes, message, { name: user.name, email: user.email });
    return Response.json({ slug, sha: shas[`${NEWS_DIR}/${slug}.md`], commit: sha });
  } catch (error) {
    if (error instanceof ConflictError) return Response.json({ message: error.message }, { status: 409 });
    throw error;
  }
};
