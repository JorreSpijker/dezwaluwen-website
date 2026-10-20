// Bestanden lezen en committen in de repo: via de GitHub API, of lokaal in de werkmap als er geen GITHUB_TOKEN is (alleen in dev).
import { createHash } from 'node:crypto';
import { mkdir, readFile as readLocal, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { GITHUB_BRANCH, GITHUB_PUBLISH_BRANCH, GITHUB_REPO, GITHUB_TOKEN } from 'astro:env/server';

export type RepoFile = { content: string; sha: string };

// Te schrijven bestand: tekst (utf-8), binair (base64) of null = verwijderen.
// sha = versie die de gebruiker heeft geladen (null = nieuw bestand); afwijking op de branch = conflict.
export type Change = { path: string; content: string | null; encoding?: 'utf-8' | 'base64'; sha: string | null };

export class ConflictError extends Error {}

const local = import.meta.env.DEV && !GITHUB_TOKEN;
const root = (path: string) => join(process.cwd(), path);

// Opslaan op een andere branch dan die live gaat = concept; live zetten met publish()
export const drafts = !local && GITHUB_BRANCH !== GITHUB_PUBLISH_BRANCH;

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
  if (res.status === 404 || res.status === 204) return undefined;
  if (!res.ok) throw new Error(`GitHub ${init.method ?? 'GET'} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

const post = (path: string, body: unknown) => github(path, { method: 'POST', body: JSON.stringify(body) });

// Ruwe inhoud + sha van een bestand op de branch
export async function readBytes(path: string): Promise<{ body: Buffer; sha: string }> {
  if (local) {
    const body = await readLocal(root(path));
    return { body, sha: blobSha(body) };
  }
  const file = await github(`/contents/${path}?ref=${encodeURIComponent(GITHUB_BRANCH)}`);
  if (!file) throw new Error(`${path} niet gevonden op ${GITHUB_BRANCH}`);
  return { body: Buffer.from(file.content, 'base64'), sha: file.sha };
}

export async function readFile(path: string): Promise<RepoFile> {
  const { body, sha } = await readBytes(path);
  return { content: body.toString('utf8'), sha };
}

export const exists = async (path: string) => (await currentShas([path], GITHUB_BRANCH))[0] !== null;

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
// Geeft de nieuwe sha per pad terug (null = verwijderd), zodat de client daarna opnieuw kan opslaan,
// en de commit-sha voor de deploystatus (null = lokaal, geen commit)
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
    return { shas, commit: null, draft: false };
  }

  const head = await branchHead();
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
  return { shas, commit: newCommit.sha as string, draft: drafts };
}

// Laatste commit op GITHUB_BRANCH; conceptbranch ontbreekt nog = aanmaken vanaf de live branch
async function branchHead(): Promise<string> {
  const ref = await github(`/git/ref/heads/${GITHUB_BRANCH}`);
  if (ref) return ref.object.sha;
  if (!drafts) throw new Error(`Branch ${GITHUB_BRANCH} bestaat niet`);
  const sha: string = (await github(`/git/ref/heads/${GITHUB_PUBLISH_BRANCH}`)).object.sha;
  await post('/git/refs', { ref: `refs/heads/${GITHUB_BRANCH}`, sha });
  return sha;
}

// Nog niet gepubliceerd: wat er op de conceptbranch staat en niet op de live branch
export async function pending() {
  const compare = await github(`/compare/${encodeURIComponent(GITHUB_PUBLISH_BRANCH)}...${encodeURIComponent(GITHUB_BRANCH)}`);
  if (!compare) return { files: [], authors: [], head: null };
  const files: { path: string; status: string }[] = (compare.files ?? []).map((f: { filename: string; status: string }) => ({ path: f.filename, status: f.status }));
  const authors: string[] = [...new Set<string>((compare.commits ?? []).map((c: { commit: { author: { name: string } } }) => c.commit.author.name))];
  const head: string | null = files.length ? compare.commits.at(-1).sha : null;
  return { files, authors, head };
}

// Preview van een commit: url van de geslaagde Vercel-deploy (null = nog bezig of niet gevonden)
export async function previewUrl(sha: string): Promise<string | null> {
  const [deployment] = (await github(`/deployments?sha=${sha}&per_page=1`)) ?? [];
  if (!deployment) return null;
  const [status] = (await github(`/deployments/${deployment.id}/statuses?per_page=1`)) ?? [];
  return status?.state === 'success' ? (status.environment_url ?? status.target_url ?? null) : null;
}

// Concept live zetten: conceptbranch in de live branch mergen, daarna concept gelijkzetten met live.
// Geeft de merge-commit terug voor de deploystatus (null = niets te publiceren)
export async function publish(name: string): Promise<string | null> {
  let merge;
  try {
    merge = await post('/merges', { base: GITHUB_PUBLISH_BRANCH, head: GITHUB_BRANCH, commit_message: `content: gepubliceerd door ${name}` });
  } catch (error) {
    if (String(error).includes(': 409 ')) throw new ConflictError('Publiceren lukt niet door een conflict met andere wijzigingen. Neem contact op met de beheerder.');
    throw error;
  }
  if (!merge) return null;
  // Doorspoelen; is er intussen opgeslagen, dan mergen (dat nieuwe concept blijft open staan)
  try {
    await github(`/git/refs/heads/${GITHUB_BRANCH}`, { method: 'PATCH', body: JSON.stringify({ sha: merge.sha }) });
  } catch (error) {
    if (!String(error).includes(': 422 ')) throw error;
    await post('/merges', { base: GITHUB_BRANCH, head: GITHUB_PUBLISH_BRANCH });
  }
  return merge.sha;
}

// Status van de Vercel-deploy voor een commit; Vercel meldt deploys als GitHub-deployments
export async function deployState(sha: string): Promise<'pending' | 'ready' | 'error'> {
  const [deployment] = (await github(`/deployments?sha=${sha}&per_page=1`)) ?? [];
  if (!deployment) return 'pending';
  const [status] = (await github(`/deployments/${deployment.id}/statuses?per_page=1`)) ?? [];
  if (status?.state === 'success') return 'ready';
  if (status?.state === 'failure' || status?.state === 'error') return 'error';
  return 'pending';
}
