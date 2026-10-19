// Welke bestanden /beheer mag lezen en schrijven, met welke rol, en hoe de inhoud gecontroleerd wordt.
import { z } from 'astro/zod';
import { club, gebruikers, organisatie, trainingstijden } from '../../data/schemas';
import { USERS_PATH, hasRole, type Role, type User } from './users';

type Rule = { pattern: RegExp; role: Role; schema?: z.ZodType };

const rules: Rule[] = [
  { pattern: /^src\/data\/trainingstijden\.json$/, role: 'editor', schema: trainingstijden },
  { pattern: /^src\/content\/news\/[a-z0-9-]+\.md$/, role: 'editor' },
  { pattern: /^src\/assets\/news\/[a-z0-9-]+\.webp$/, role: 'editor' },
  { pattern: /^src\/data\/club\.json$/, role: 'admin', schema: club },
  { pattern: /^src\/data\/organisatie\.json$/, role: 'admin', schema: organisatie },
  { pattern: new RegExp(`^${USERS_PATH.replace('.', '\\.')}$`), role: 'admin', schema: gebruikers },
];

export const ruleFor = (path: string) => rules.find((r) => r.pattern.test(path));

export const canAccess = (user: User, path: string) => {
  const rule = ruleFor(path);
  return !!rule && hasRole(user, rule.role);
};

export type Issue = { path: (string | number)[]; message: string };

// JSON controleren met het schema; geldig = nette JSON (2 spaties) om te committen
export function checkJson(path: string, content: string): { content: string } | { issues: Issue[] } {
  const schema = ruleFor(path)?.schema;
  if (!schema) return { content };
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return { issues: [{ path: [], message: 'Geen geldige JSON' }] };
  }
  const result = schema.safeParse(data);
  if (!result.success) {
    return { issues: result.error.issues.map((i) => ({ path: i.path.map((p) => (typeof p === 'symbol' ? String(p) : p)), message: i.message })) };
  }
  return { content: `${JSON.stringify(result.data, null, 2)}\n` };
}

// JSON Schema voor de formulieren in /beheer (draft-7, wat de formulier-validator verwacht)
export function jsonSchemaFor(path: string) {
  const schema = ruleFor(path)?.schema;
  if (!schema) throw new Error(`Geen schema voor ${path}`);
  return z.toJSONSchema(schema, { target: 'draft-7', io: 'output', unrepresentable: 'any' });
}
