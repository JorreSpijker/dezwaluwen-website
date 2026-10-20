// Opslaan via de beheer-API; vertaalt het antwoord naar een status voor de editors.
export type Change = { path: string; content: string | null; encoding?: 'utf-8' | 'base64'; sha: string | null };

export type SaveState<T = unknown> =
  | { status: 'idle' | 'saving' }
  | { status: 'saved'; data: T }
  | { status: 'invalid'; issues: { path: (string | number)[]; message: string }[] }
  | { status: 'error'; message: string };

export async function post<T>(url: string, body: unknown): Promise<SaveState<T>> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) return { status: 'saved', data: await res.json() };
    if (res.status === 422) return { status: 'invalid', issues: (await res.json()).issues };
    if (res.status === 409) return { status: 'error', message: (await res.json()).message };
    if (res.status === 401) return { status: 'error', message: 'Je bent uitgelogd. Log opnieuw in; je wijzigingen gaan dan verloren, kopieer ze eerst.' };
    if (res.status === 403) return { status: 'error', message: 'Je hebt geen rechten om dit op te slaan.' };
    if (res.status === 413) return { status: 'error', message: 'De foto is te groot.' };
    return { status: 'error', message: `Opslaan mislukt (${res.status}). Probeer het opnieuw.` };
  } catch {
    return { status: 'error', message: 'Geen verbinding. Probeer het opnieuw.' };
  }
}

export const save = (changes: Change[]) => post<{ shas: Record<string, string | null>; commit: string | null }>('/api/beheer/commit', { changes });
