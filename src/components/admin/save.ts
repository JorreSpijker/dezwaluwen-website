// Opslaan via /api/beheer/commit; vertaalt het antwoord naar een status voor de editors.
export type Change = { path: string; content: string | null; encoding?: 'utf-8' | 'base64'; sha: string | null };

export type SaveState =
  | { status: 'idle' | 'saving' }
  | { status: 'saved'; shas: Record<string, string | null> }
  | { status: 'invalid'; issues: { path: (string | number)[]; message: string }[] }
  | { status: 'error'; message: string };

export async function save(changes: Change[]): Promise<SaveState> {
  try {
    const res = await fetch('/api/beheer/commit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes }),
    });
    if (res.ok) return { status: 'saved', shas: (await res.json()).shas };
    if (res.status === 422) return { status: 'invalid', issues: (await res.json()).issues };
    if (res.status === 409) return { status: 'error', message: (await res.json()).message };
    if (res.status === 401) return { status: 'error', message: 'Je bent uitgelogd. Log opnieuw in; je wijzigingen gaan dan verloren, kopieer ze eerst.' };
    if (res.status === 403) return { status: 'error', message: 'Je hebt geen rechten om dit op te slaan.' };
    return { status: 'error', message: `Opslaan mislukt (${res.status}). Probeer het opnieuw.` };
  } catch {
    return { status: 'error', message: 'Geen verbinding. Probeer het opnieuw.' };
  }
}
