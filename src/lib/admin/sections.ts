// Onderdelen van het CMS: zijbalk in de layout en tegels op het overzicht.
export type Section = { href: string; title: string; text: string; icon: string };

export const sections: Section[] = [
  { href: '/cms/nieuws', title: 'Nieuws', text: 'Berichten schrijven, aanpassen en vastpinnen', icon: 'news' },
  { href: '/cms/paginas', title: "Pagina's", text: "Teksten van pagina's aanpassen en nieuwe maken", icon: 'page' },
  { href: '/cms/trainingstijden', title: 'Trainingstijden', text: 'Tijden en velden voor veld en zaal', icon: 'clock' },
  { href: '/cms/organisatie', title: 'Bestuur & commissies', text: 'Leden, taken en contactgegevens', icon: 'users' },
  { href: '/cms/club', title: 'Teams & Sportlink', text: 'Teams, teamcodes en poules', icon: 'shield' },
];
