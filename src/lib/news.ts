import { getCollection, type CollectionEntry } from 'astro:content';

export type NewsEntry = CollectionEntry<'news'>;

// Vastgepinde berichten eerst, daarna nieuwste eerst
export async function getNews() {
  const news = await getCollection('news');
  return news.sort(
    (a, b) => Number(b.data.sticky) - Number(a.data.sticky) || b.data.date.getTime() - a.data.date.getTime(),
  );
}

export const newsUrl = (entry: NewsEntry) => `/nieuws/${entry.id}/`;

// Eerste alinea van het bericht als platte tekst
export const excerpt = (entry: NewsEntry) =>
  (entry.body ?? '')
    .trim()
    .split(/\n\s*\n/)[0]
    .replace(/[*_`>#]/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

const format = (date: Date, month: 'long' | 'short', year = false) =>
  new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month, year: year ? 'numeric' : undefined, timeZone: 'Europe/Amsterdam' })
    .format(date)
    .replace('.', '');

// "21 september", "21 sep", "21 september 2025"
export const formatDate = (date: Date) => format(date, 'long');
export const formatDateShort = (date: Date) => format(date, 'short');
export const formatDateFull = (date: Date) => format(date, 'long', true);
