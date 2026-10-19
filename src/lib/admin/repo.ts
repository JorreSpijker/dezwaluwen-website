// Bestanden lezen en committen in de repo: via de GitHub API, of lokaal in de werkmap als er geen GITHUB_TOKEN is (alleen in dev).
import { createHash } from 'node:crypto';
import { mkdir, readFile as readLocal, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { GITHUB_BRANCH, GITHUB_REPO, GITHUB_TOKEN } from 'astro:env/server';

export type RepoFile = { content: string; sha: string };

// Te schrijven bestand: tekst (utf-8), binair (base64) of null = verwijderen.
// sha = versie die de gebruiker heeft geladen (null = nieuw bestand); afwijking op de branch = conflict.
export type Change = { path: string; content: string | null; encoding?: 'utf-8' | 'base64'; sha: string | null };

export class ConflictError extends Error {}

const local = import.meta.env.DEV && !GITHUB_TOKEN;
const root = (path: string) => join(process.cwd(), path);

// Zelfde sha als git voor een blob, zodat de conflictcheck lokaal ook werkt
const blobSha = (body: Buffer) => createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex');

export async function github(path: string, init: RequestInit = {}) {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN ontbreekt');
  const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...init.headers,
    },
  });
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(`GitHub ${init.method ?? 'GET'} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const post = (path: string, body: unknown) => github(path, { method: 'POST', body: JSON.stringify(body) });

export async function readFile(path: string): Promise<RepoFile> {
  if (local) {
    const body = await readLocal(root(path));
    return { content: body.toString('utf8'), sha: blobSha(body) };
  }
  const file = await github(`/contents/${path}?ref=${encodeURIComponent(GITHUB_BRANCH)}`);
  if (!file) throw new Error(`${path} niet gevonden op ${GITHUB_BRANCH}`);
  return { content: Buffer.from(file.content, 'base64').toString('utf8'), sha: file.sha };
}

// Bestanden in een map (niet recursief)
export async function listDir(path: string): Promise<{ name: string; sha: string }[]> {
  if (local) {
    const names = await readdir(root(path));
    return Promise.all(names.map(async (name) => ({ name, sha: blobSha(await readLocal(root(`${path}/${name}`))) })));
  }
  const entries: { name: string; sha: string; type: string }[] = (await github(`/contents/${path}?ref=${encodeURIComponent(GITHUB_BRANCH)}`)) ?? [];
  return entries.filter((e) => e.type === 'file').map(({ name, sha }) => ({ name, sha }));
}

// Huidige sha per pad op de branch (null = bestaat niet), om conflicten te zien
async function currentShas(paths: string[], ref: string) {
  if (local) {
    return Promise.all(paths.map((p) => readLocal(root(p)).then(blobSha, () => null)));
  }
  return Promise.all(paths.map(async (p) => (await github(`/contents/${p}?ref=${ref}`))?.sha ?? null));
}

async function assertNoConflict(changes: Change[], ref: string) {
  const shas = await currentShas(
    changes.map((c) => c.path),
    ref,
  );
  const changed = changes.filter((c, i) => shas[i] !== c.sha).map((c) => c.path);
  if (changed.length) throw new ConflictError(`Iemand anders heeft dit net aangepast (${changed.join(', ')}). Herlaad de pagina.`);
}

// Alle wijzigingen in één commit, zodat een bericht met foto maar één deploy geeft
// Geeft de nieuwe sha per pad terug (null = verwijderd), zodat de client daarna opnieuw kan opslaan
export async function commit(changes: Change[], message: string, author: { name: string; email: string }) {
  const shas = Object.fromEntries(
    changes.map((c) => [c.path, c.content === null ? null : blobSha(Buffer.from(c.content, c.encoding === 'base64' ? 'base64' : 'utf8'))]),
  );
  if (local) {
    await assertNoConflict(changes, GITHUB_BRANCH);
    for (const c of changes) {
      if (c.content === null) await rm(root(c.path), { force: true });
      else {
        await mkdir(dirname(root(c.path)), { recursive: true });
        await writeFile(root(c.path), Buffer.from(c.content, c.encoding === 'base64' ? 'base64' : 'utf8'));
      }
    }
    console.log(`[beheer] lokaal opgeslagen (geen commit): ${message}`);
    return shas;
  }

  const head: string = (await github(`/git/ref/heads/${GITHUB_BRANCH}`)).object.sha;
  await assertNoConflict(changes, head);
  const baseTree: string = (await github(`/git/commits/${head}`)).tree.sha;

  const tree = await Promise.all(
    changes.map(async (c) => {
      if (c.content === null) return { path: c.path, mode: '100644', type: 'blob', sha: null };
      if (c.encoding === 'base64') {
        const blob = await post('/git/blobs', { content: c.content, encoding: 'base64' });
        return { path: c.path, mode: '100644', type: 'blob', sha: blob.sha };
      }
      return { path: c.path, mode: '100644', type: 'blob', content: c.content };
    }),
  );
  const newTree = await post('/git/trees', { base_tree: baseTree, tree });
  const newCommit = await post('/git/commits', { message, tree: newTree.sha, parents: [head], author });

  // Geen force: is de branch intussen verder, dan faalt dit en is het een conflict
  try {
    await github(`/git/refs/heads/${GITHUB_BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: newCommit.sha }) });
  } catch (error) {
    if (String(error).includes(': 422 ')) throw new ConflictError('Er is net iets anders opgeslagen. Probeer het opnieuw.');
    throw error;
  }
  return shas;
}
