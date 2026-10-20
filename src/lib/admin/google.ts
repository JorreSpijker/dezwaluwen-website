// Inloggen met Google (OAuth met PKCE). Toegang bepalen wij zelf via users.ts.
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from 'astro:env/server';
import { Google } from 'arctic';

export const STATE_COOKIE = 'cms_google_state';
export const VERIFIER_COOKIE = 'cms_google_verifier';

// Callback-url hangt af van waar de site draait (lokaal, preview, productie); moet in Google Cloud geregistreerd zijn
export function google(origin: string) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) throw new Error('GOOGLE_CLIENT_ID of GOOGLE_CLIENT_SECRET ontbreekt');
  return new Google(GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, `${origin}/api/cms/google/callback`);
}
