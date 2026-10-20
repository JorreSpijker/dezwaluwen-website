// Pagina opslaan of verwijderen: markdown + eventueel nieuwe of verwijderde foto in één commit.
import type { APIRoute } from 'astro';
import { pageSlug } from '../../../data/schemas';
import { canAccess, checkContent } from '../../../lib/admin/access';
import { imagePath } from '../../../lib/admin/news';
import { PAGE_IMAGE_DIR, PAGES_DIR, parsePage, serializePage, type PageMeta } from '../../../lib/admin/pages';
import { ConflictError, commit, exists, readFile, type Change } from '../../../lib/admin/repo';

export const prerender = false;

// slug = bestaande pagina, of null met newSlug voor een nieuwe
type Body =
  | { action: 'save'; slug: string | null; newSlug?: string; sha: string | null; meta: PageMeta; body: string; image?: string }
  | { action: 'delete'; slug: string; sha: string };

// Geüploade foto moet een WebP zijn (verkleind in de browser), max 3 MB
const isWebp = (base64: string) => {
  const bytes = Buffer.from(base64, 'base64');
  return bytes.length < 3_000_000 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
};

// Foto's die alleen bij deze pagina horen (in src/assets/pages) mogen mee weg
const ownImage = (image: string) => !!image && imagePath(image).startsWith(`${PAGE_IMAGE_DIR}/`);
const removeImage = async (image: string): Promise<Change[]> =>
  ownImage(image) ? [{ path: imagePath(image), content: null, sha: (await readFile(imagePath(image))).sha }] : [];

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user!;
  const input = (await request.json()) as Body;
  if (input.slug && !/^[a-z0-9-]+$/.test(input.slug)) return new Response('Ongeldige slug', { status: 400 });
  const changes: Change[] = [];
  let slug: string;
  let message: string;

  if (input.action === 'delete') {
    slug = input.slug;
    const { meta } = parsePage((await readFile(`${PAGES_DIR}/${slug}.md`)).content);
    changes.push({ path: `${PAGES_DIR}/${slug}.md`, content: null, sha: input.sha }, ...(await removeImage(meta.image)));
    message = `content: pagina "${meta.title}" verwijderd door ${user.name}`;
  } else {
    if (input.slug) slug = input.slug;
    else {
      const checked = pageSlug.safeParse(input.newSlug ?? '');
      if (!checked.success) return Response.json({ issues: [{ path: ['adres'], message: checked.error.issues[0].message }] }, { status: 422 });
      if (await exists(`${PAGES_DIR}/${checked.data}.md`)) return Response.json({ issues: [{ path: ['adres'], message: 'er is al een pagina met dit adres' }] }, { status: 422 });
      slug = checked.data;
    }
    const meta = { ...input.meta };
    const old = input.slug ? parsePage((await readFile(`${PAGES_DIR}/${slug}.md`)).content).meta.image : '';
    if (input.image) {
      if (!isWebp(input.image)) return Response.json({ issues: [{ path: ['image'], message: 'Foto kon niet worden verwerkt' }] }, { status: 422 });
      // Nieuwe naam per upload, zodat een vervangen foto niet uit een cache komt
      const path = `${PAGE_IMAGE_DIR}/${slug}-${Date.now().toString(36)}.webp`;
      changes.push({ path, content: input.image, encoding: 'base64', sha: null }, ...(await removeImage(old)));
      meta.image = `../../${path.replace(/^src\//, '')}`;
    } else if (meta.image !== old) {
      // Foto weggehaald (een andere bestaande foto kiezen kan niet vanuit de editor)
      meta.image = '';
      changes.push(...(await removeImage(old)));
    }
    const content = serializePage(meta, input.body);
    const checked = checkContent(`${PAGES_DIR}/${slug}.md`, content);
    if ('issues' in checked) return Response.json({ issues: checked.issues }, { status: 422 });
    changes.unshift({ path: `${PAGES_DIR}/${slug}.md`, content, sha: input.slug ? input.sha : null });
    message = `content: pagina "${meta.title}" ${input.slug ? 'bijgewerkt' : 'toegevoegd'} door ${user.name}`;
  }

  // Laatste vangnet: alleen toegestane paden
  if (!changes.every((c) => canAccess(c.path))) return new Response('Geen toegang', { status: 403 });
  try {
    const { shas, commit: sha, draft } = await commit(changes, message, { name: user.name, email: user.email });
    return Response.json({ slug, sha: shas[`${PAGES_DIR}/${slug}.md`], commit: sha, draft });
  } catch (error) {
    if (error instanceof ConflictError) return Response.json({ message: error.message }, { status: 409 });
    throw error;
  }
};
