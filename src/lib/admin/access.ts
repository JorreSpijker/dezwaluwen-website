// Welke bestanden /cms mag lezen en schrijven, en hoe de inhoud gecontroleerd wordt.
import { z } from 'astro/zod';
import { club, newsFrontmatter, organisatie, trainingstijden } from '../../data/schemas';
import { parseNews } from './news';

type Rule = { pattern: RegExp; schema?: z.ZodType };

const rules: Rule[] = [
  { pattern: /^src\/data\/trainingstijden\.json$/, schema: trainingstijden },
  { pattern: /^src\/content\/news\/[a-z0-9-]+\.md$/, schema: newsFrontmatter },
  { pattern: /^src\/assets\/news\/[a-z0-9-]+\.webp$/ },
  { pattern: /^src\/data\/club\.json$/, schema: club },
  { pattern: /^src\/data\/organisatie\.json$/, schema: organisatie },
];

export const ruleFor = (path: string) => rules.find((r) => r.pattern.test(path));

export const canAccess = (path: string) => !!ruleFor(path);

// Foto's mogen ook buiten src/assets/news gelezen worden (bestaande nieuwsfoto's), alleen voor voorbeeld in de editor
export const canReadImage = (path: string) => /^src\/assets\/[a-z0-9_/-]+\.(webp|jpe?g|png)$/.test(path);

export type Issue = { path: (string | number)[]; message: string };

const toIssues = (error: z.ZodError): Issue[] =>
  error.issues.map((i) => ({ path: i.path.map((p) => (typeof p === 'symbol' ? String(p) : p)), message: i.message }));

// Inhoud controleren met het schema. JSON: geldig = nette JSON (2 spaties) om te committen. Markdown: frontmatter checken.
export function checkContent(path: string, content: string): { content: string } | { issues: Issue[] } {
  const schema = ruleFor(path)?.schema;
  if (!schema) return { content };
  if (path.endsWith('.md')) {
    const result = schema.safeParse(parseNews(content).meta);
    return result.success ? { content } : { issues: toIssues(result.error) };
  }
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return { issues: [{ path: [], message: 'Geen geldige JSON' }] };
  }
  const result = schema.safeParse(data);
  if (!result.success) return { issues: toIssues(result.error) };
  return { content: `${JSON.stringify(result.data, null, 2)}\n` };
}

// JSON Schema voor de formulieren in /cms (draft-7, wat de formulier-validator verwacht)
export function jsonSchemaFor(path: string) {
  const schema = ruleFor(path)?.schema;
  if (!schema) throw new Error(`Geen schema voor ${path}`);
  return z.toJSONSchema(schema, { target: 'draft-7', io: 'output', unrepresentable: 'any' });
}
