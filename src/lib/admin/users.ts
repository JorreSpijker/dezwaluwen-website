// Gebruikers en rollen van /beheer. Lijst staat in beheer/gebruikers.json (via repo.ts, dus altijd de laatste versie);
// adressen in OWNER_EMAILS zijn altijd Admin, ook als die lijst stuk of leeg is.
import { OWNER_EMAILS } from 'astro:env/server';
import type { z } from 'astro/zod';
import { gebruikers } from '../../data/schemas';
import { readFile } from './repo';

export const USERS_PATH = 'beheer/gebruikers.json';

export type User = z.infer<typeof gebruikers>[number];
export type Role = User['role'];

const owners = (OWNER_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Rol wordt bij elk verzoek gecheckt; korte cache scheelt GitHub-calls
let cache: { at: number; users: User[] } | undefined;

async function users(): Promise<User[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.users;
  try {
    cache = { at: Date.now(), users: gebruikers.parse(JSON.parse((await readFile(USERS_PATH)).content)) };
  } catch (error) {
    // Kapotte of onbereikbare lijst: alleen owners kunnen nog in
    console.error('Gebruikerslijst niet leesbaar', error);
    return [];
  }
  return cache.users;
}

export const clearUsersCache = () => (cache = undefined);

const isOwner = (email: string) => owners.includes(email.trim().toLowerCase());

export async function findUser(email: string): Promise<User | undefined> {
  const address = email.trim().toLowerCase();
  const user = (await users()).find((u) => u.email.toLowerCase() === address);
  if (isOwner(address)) return { name: user?.name ?? address, email: address, role: 'admin' };
  return user;
}

export const hasRole = (user: User, role: Role) => role === 'editor' || user.role === 'admin';
