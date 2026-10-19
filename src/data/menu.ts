import { club } from './club';

export type MenuItem = {
  label: string;
  groups: { title: string; links: string[] }[];
  promoTitle: string;
  promoText: string;
  promoCta: string;
};

// Menulinks met een bestaande pagina; de rest wijst nog naar #

const hrefs: Record<string, string> = {
  Nieuws: '/nieuws/',
  Trainingstijden: '/trainingstijden/',
  'Wat is korfbal?': '/wat-is-korfbal/',
  'Wie zijn de Zwaluwen?': '/wie-zijn-de-zwaluwen/',
  'Bestuur & commissies': '/bestuur-en-commissies/',
  'Gratis proefles': '/proefles/',
  // Teampagina's voor alle teams uit club.json
  ...Object.fromEntries(club.teams.map((team) => [team.short, `/teams/${team.short.toLowerCase()}/`])),
};

export const linkHref = (label: string) => hrefs[label] ?? '#';

export const menu: MenuItem[] = [
  {
    label: 'Nieuw lid?',
    groups: [{ title: 'Kennismaken', links: ['Wat is korfbal?', 'Wie zijn de Zwaluwen?', 'Hoe kan ik meedoen?'] }],
    promoTitle: 'Train gratis mee',
    promoText: 'Kies je leeftijd, kom naar een training en ontdek of korfbal bij je past.',
    promoCta: 'Gratis proefles',
  },
  {
    label: 'Voor ouders & leden',
    groups: [
      { title: 'Praktisch', links: ['Trainingstijden', 'Wedstrijdprogramma', 'Clubshop', 'Jaarplanning'] },
      { title: 'Senioren', links: ['S1', 'S2', 'S3'] },
      { title: 'Midweek', links: ['MW1'] },
      { title: 'Jeugd', links: ['J1', 'J2', 'J3', 'J4'] },
      { title: ' ', links: ['J5', 'J6', 'J7', 'J8'] },
    ],
    promoTitle: 'Waar vind ik wat?',
    promoText: 'Trainingstijden, programma, jaarplanning en meer: alles voor ouders en leden overzichtelijk op één pagina.',
    promoCta: 'Naar het overzicht →',
  },
  {
    label: 'Club',
    groups: [
      { title: 'Vereniging', links: ['Nieuws', 'Over de club', 'Bestuur & commissies', 'Vrijwilligers', 'Sponsors'] },
      { title: 'Praktisch', links: ['Accommodatie & route', 'Kantine', 'Contact'] },
    ],
    promoTitle: 'Help je mee?',
    promoText: 'Zonder vrijwilligers geen club. Een uurtje per maand helpt al.',
    promoCta: 'Vrijwilliger worden',
  },
];
