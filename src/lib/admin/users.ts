// Wie /cms mag gebruiken: de Google-adressen in BEHEER_EMAILS (Vercel-variabele, lokaal .env). Iedereen op de lijst mag alles.
import { BEHEER_EMAILS } from 'astro:env/server';

export type User = { name: string; email: string };

const allowed = (BEHEER_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const hasAccess = (email: string) => allowed.includes(email.trim().toLowerCase());
