// Bestanden lezen uit de repo: via de GitHub API, of lokaal uit de werkmap als er geen GITHUB_TOKEN is (alleen in dev).
import { createHash } from 'node:crypto';
import { readFile as readLocal } from 'node:fs/promises';
import { join } from 'node:path';
import { GITHUB_BRANCH, GITHUB_REPO, GITHUB_TOKEN } from 'astro:env/server';

export type RepoFile = { content: string; sha: string };

const local = import.meta.env.DEV && !GITHUB_TOKEN;

// Zelfde sha als git voor een blob, zodat de conflictcheck lokaal ook werkt
const blobSha = (content: string) => {
  const body = Buffer.from(content);
  return createHash('sha1').update(`blob ${body.length}\0`).update(body).digest('hex');
};

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
  if (!res.ok) throw new Error(`GitHub ${init.method ?? 'GET'} ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function readFile(path: string): Promise<RepoFile> {
  if (local) {
    const content = await readLocal(join(process.cwd(), path), 'utf8');
    return { content, sha: blobSha(content) };
  }
  const file = await github(`/contents/${path}?ref=${encodeURIComponent(GITHUB_BRANCH)}`);
  return { content: Buffer.from(file.content, 'base64').toString('utf8'), sha: file.sha };
}
