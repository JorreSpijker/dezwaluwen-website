// Wijzigingen opslaan als één commit. Eerst rechten en schema per bestand; fout = geen commit.
import type { APIRoute } from 'astro';
import { canAccess, checkJson, type Issue } from '../../../lib/admin/access';
import { ConflictError, commit, type Change } from '../../../lib/admin/repo';
import { USERS_PATH, clearUsersCache } from '../../../lib/admin/users';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const user = locals.user!;
  const { changes } = (await request.json()) as { changes: Change[] };
  if (!Array.isArray(changes) || !changes.length) return new Response('Geen wijzigingen', { status: 400 });
  if (!changes.every((c) => canAccess(user, c.path))) return new Response('Geen toegang', { status: 403 });

  const issues: Issue[] = [];
  const checked = changes.map((c) => {
    if (c.content === null || c.encoding === 'base64') return c;
    const result = checkJson(c.path, c.content);
    if ('issues' in result) {
      issues.push(...result.issues);
      return c;
    }
    return { ...c, content: result.content };
  });
  if (issues.length) return Response.json({ issues }, { status: 422 });

  const names = changes.map((c) => c.path.split('/').pop()).join(', ');
  let shas: Record<string, string | null>;
  try {
    shas = await commit(checked, `content: ${names} bijgewerkt door ${user.name}`, { name: user.name, email: user.email });
  } catch (error) {
    if (error instanceof ConflictError) return Response.json({ message: error.message }, { status: 409 });
    throw error;
  }
  if (changes.some((c) => c.path === USERS_PATH)) clearUsersCache();
  return Response.json({ shas });
};
