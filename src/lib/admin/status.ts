// Statuspagina van het CMS: wat staat er klaar om te publiceren, en wat is er wanneer en door wie livegezet.
import { parseNews } from './news';
import { parsePage } from './pages';
import { drafts, pending, previewUrl, productionDeploys, readFile } from './repo';

const names: Record<string, string> = {
  'src/data/trainingstijden.json': 'Trainingstijden',
  'src/data/club.json': 'Teams & Sportlink',
  'src/data/organisatie.json': 'Bestuur & commissies',
};
const statuses: Record<string, string> = { added: 'nieuw', removed: 'verwijderd' };

// Ongepubliceerde wijzigingen met leesbare namen; foto's horen bij hun bericht of pagina
export async function pendingItems() {
  const changes = drafts ? await pending() : null;
  const files = changes?.files ?? [];
  const hasNews = files.some((f) => f.path.startsWith('src/content/news/'));
  const hasPages = files.some((f) => f.path.startsWith('src/content/pages/'));
  const items = await Promise.all(
    files
      .filter((f) => !(hasNews && f.path.startsWith('src/assets/news/')) && !(hasPages && f.path.startsWith('src/assets/pages/')))
      .map(async (f) => {
        let label = names[f.path] ?? f.path;
        const news = f.path.match(/^src\/content\/news\/(.+)\.md$/);
        if (news) label = `Nieuws: ${f.status === 'removed' ? news[1] : parseNews((await readFile(f.path)).content).meta.title}`;
        const page = f.path.match(/^src\/content\/pages\/(.+)\.md$/);
        if (page) label = `Pagina: ${f.status === 'removed' ? page[1] : parsePage((await readFile(f.path)).content).meta.title}`;
        if (f.path.startsWith('src/assets/news/')) label = 'Nieuwsfoto';
        if (f.path.startsWith('src/assets/pages/')) label = 'Paginafoto';
        return { label, status: statuses[f.status] ?? 'aangepast' };
      }),
  );
  const preview = changes?.head ? await previewUrl(changes.head) : null;
  return { items, authors: changes?.authors ?? [], preview };
}

// Deploys met wie en wat: CMS-commits eindigen op "door <naam>" (de Google-gebruiker), de rest is een code-wijziging
export async function deployHistory(count = 10) {
  return (await productionDeploys(count)).map((d) => {
    const content = d.message.match(/^content: (.+) door (.+)$/);
    return {
      ...d,
      who: content ? content[2] : `Ontwikkelaar (${d.author})`,
      what: content ? content[1][0].toUpperCase() + content[1].slice(1) : d.message,
    };
  });
}
