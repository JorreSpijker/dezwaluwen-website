import type { ImageMetadata } from 'astro';
import desktop0 from '../assets/hero-desktop-0.webp';
import desktop1 from '../assets/hero-desktop-1.webp';
import desktop2 from '../assets/hero-desktop-2.webp';
import desktop3 from '../assets/hero-desktop-3.webp';
import mobile0 from '../assets/hero-mobile-0.webp';
import mobile1 from '../assets/hero-mobile-1.webp';
import mobile2 from '../assets/hero-mobile-2.webp';
import mobile3 from '../assets/hero-mobile-3.webp';
// Dummyfoto's contactpersonen; vervangen door echte foto's
import contactKangoeroes from '../assets/contacts/kangoeroes.svg';
import contactJ5J8 from '../assets/contacts/j5-j8.svg';
import contactJ1J4 from '../assets/contacts/j1-j4.svg';
import contactSenioren from '../assets/contacts/senioren.svg';

// Alle gegevens voor de proefles/lid-worden-flow, per leeftijdscategorie.
// Gebruikt door de hero (homepage) en de pagina /proefles/.

// Foto van een contactpersoon toevoegen: zet hem in src/assets/ en importeer hem hierboven.
export type Contact = { name: string; role: string; photo?: ImageMetadata };

export type AgeGroup = {
  // Waarde voor ?leeftijd= in de URL
  key: string;
  label: string;
  group: string;
  alt: string;
  desktop: ImageMetadata;
  mobile: ImageMetadata;
  youth: boolean;
  korfbal: string;
  club: string;
  dates: string[];
  // Teams in deze categorie, zoals in src/data/trainingstijden.ts
  teams: string[];
  // true: tijden per team tonen; false: alleen trainingsdagen (team wordt samen bepaald)
  showTimes: boolean;
  // Ontvangt het potentiële nieuwe lid bij de proefles
  contact: Contact;
};

// Teksten en proefles-data uit het Claude Design
export const ages: AgeGroup[] = [
  {
    key: '4-6',
    label: '4–6',
    group: 'Kangoeroes (4–6 jaar)',
    alt: 'Kangoeroes spelen met de bal',
    desktop: desktop0,
    mobile: mobile0,
    youth: true,
    korfbal: 'Bij de kangoeroes leer je spelenderwijs gooien, vangen en rennen. We spelen met lage korven en zachte ballen, dus iedereen scoort.',
    club: 'Elke zaterdagochtend trainen onze kangoeroes met twee vaste trainers. Ouders kijken vaak mee vanuit de kantine, met koffie erbij.',
    dates: ['Za 4 okt · 09:00', 'Za 11 okt · 09:00', 'Za 18 okt · 09:00'],
    teams: ['Kangoeroes'],
    showTimes: true,
    contact: { name: 'Dominique Bosman', role: 'Trainster kangoeroes', photo: contactKangoeroes },
  },
  {
    key: '7-11',
    label: '7–11',
    group: 'Jeugd J5–J8 (7–11 jaar)',
    alt: 'Pupil schiet op de korf',
    desktop: desktop1,
    mobile: mobile1,
    youth: true,
    korfbal: 'Korfbal speel je met jongens en meisjes samen in één team. Je leert samenspelen, passen en scoren, en op zaterdag speel je een echte wedstrijd.',
    club: 'In J5 t/m J8 spelen teams van acht kinderen, ingedeeld op leeftijd. Elk team heeft een eigen trainer en coach die je snel wegwijs maakt.',
    dates: ['Di 30 sep · 18:00', 'Do 2 okt · 18:00', 'Di 7 okt · 18:00'],
    teams: ['J5', 'J6', 'J7', 'J8'],
    showTimes: false,
    contact: { name: 'Bart Ross', role: 'Jeugdcoördinator J5–J8', photo: contactJ5J8 },
  },
  {
    key: '12-17',
    label: '12–17',
    group: 'Jeugd J1–J4 (12–17 jaar)',
    alt: 'Junioren juichen na een doelpunt',
    desktop: desktop2,
    mobile: mobile2,
    youth: true,
    korfbal: 'Korfbal is snel en tactisch. Je valt aan en verdedigt in je eigen vak, en na elke twee doelpunten wissel je van rol.',
    club: 'J1 t/m J4 spelen competitie op het veld en in de zaal. Je traint twee keer per week met je team, en ook zonder ervaring stroom je makkelijk in.',
    dates: ['Ma 29 sep · 19:00', 'Wo 1 okt · 19:00', 'Ma 6 okt · 19:00'],
    teams: ['J1', 'J2', 'J3', 'J4'],
    showTimes: false,
    contact: { name: 'Maarten Willemsen', role: 'Jeugdcoördinator J1–J4', photo: contactJ1J4 },
  },
  {
    key: '18',
    label: '18+',
    group: 'Senioren S1–S3 & midweek MW1',
    alt: 'Senioren in actie tijdens een wedstrijd',
    desktop: desktop3,
    mobile: mobile3,
    youth: false,
    korfbal: 'Korfbal is de enige teamsport waarin mannen en vrouwen samen in één team spelen. Veel beweging, weinig lichamelijk contact.',
    club: 'S1 t/m S3 spelen competitie op zaterdag. MW1 speelt op woensdagavond in de midweekcompetitie, ideaal als je in het weekend geen tijd hebt.',
    dates: ['Di 30 sep · 20:30', 'Wo 1 okt · 20:00', 'Do 2 okt · 20:30'],
    teams: ['S1', 'S2', 'S3', 'MW1'],
    showTimes: true,
    contact: { name: 'Jorre Spijker', role: 'Contactpersoon TC', photo: contactSenioren },
  },
];

export const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

export const proeflesUrl = (age?: AgeGroup) => (age ? `/proefles/?leeftijd=${age.key}` : '/proefles/');

// Standaard geselecteerd, zoals in het design
export const defaultAge = 1;
