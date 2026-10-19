# Plan: eigen beheeromgeving (`/beheer`)

Branch: `feature/admin`

## Doel
Vrijwilligers loggen in met hun Google-account (geen wachtwoord, geen GitHub-account), passen JSON-data aan via formulieren en beheren nieuwsberichten. Opslaan = commit op `main`, Vercel deployt, direct live.

## Uitgangspunten
| Onderwerp | Keuze |
|---|---|
| Hosting | Vercel; site blijft statisch, alleen `/beheer` + `/api/beheer/*` server-side |
| Login | Google (OAuth + PKCE via `arctic`), alleen accounts die wij toevoegen, geen database |
| Rechten | rollen Editor en Admin (zie Rollen) |
| GitHub | fine-grained token |
| Opslag | git (GitHub API), geen database |
| Validatie | dezelfde zod-schema's voor build, API en formulieren |
| UI | React-islands alleen in `/beheer` |
| Workflow | direct live, geen review |

Afgevallen: Decap/Sveltia (login vereist GitHub of DecapBridge, configuratie te beperkt), Keystatic/Tina (schema's dubbel, gratis tier te klein), database-CMS (verlies git-geschiedenis).

## Rollen
| Onderdeel | Editor | Admin |
|---|---|---|
| Nieuws | ✓ | ✓ |
| Trainingstijden | ✓ | ✓ |
| Bestuur & commissies (`organisatie.json`) | – | ✓ |
| Teams & Sportlink (`club.json`) | – | ✓ |
| Gebruikers beheren | – | ✓ |

- Gebruikers in `beheer/gebruikers.json` (repo-root, buiten `src`: komt nooit in publieke site). Per gebruiker: naam, e-mail, rol. Repo is privé.
- Admin beheert gebruikers in `/beheer/gebruikers`; opslaan = commit, net als content.
- `OWNER_EMAILS` (env) is altijd Admin, ook als `gebruikers.json` stuk of leeg is: nooit buitengesloten.
- Rol wordt bij elk verzoek opnieuw gecheckt tegen `gebruikers.json` (60 s cache), niet alleen bij login. Verwijderde gebruiker of lagere rol werkt dus direct, niet pas na verlopen sessie.
- Rechten afgedwongen op server (API + pagina's); UI verbergt alleen wat niet mag.

## Architectuur
```
browser /beheer (React)
  │  login: /api/beheer/google ─► Google ─► /api/beheer/google/callback
  │         ─► e-mail in gebruikerslijst? ─► sessiecookie (JWT, httpOnly)
  │
  │  laden:   GET  /api/beheer/file?path=…        ─► GitHub: inhoud + sha
  │  opslaan: POST /api/beheer/commit {files, baseSha}
  │             ─► zod-validatie ─► conflictcheck ─► 1 commit (Git Data API)
  ▼
GitHub main ─► Vercel build (zod-validatie nogmaals) ─► live
```

## Bestanden (nieuw)
```
src/
  data/schemas.ts            zod-schema's, gedeeld door build, API en formulieren
  lib/admin/auth.ts          sessie (jose)
  lib/admin/google.ts        Google OAuth-client (arctic)
  lib/admin/users.ts         gebruikers + rollen uit beheer/gebruikers.json, rechtencheck
  lib/admin/repo.ts          lezen + commit van meerdere bestanden (GitHub API via fetch; lokaal zonder token: werkmap)
  middleware.ts              /beheer en /api/beheer afschermen
  pages/beheer/              login, overzicht, editors (prerender = false)
  pages/api/beheer/          login, verify, logout, file, commit, news
  components/admin/          React: JsonForm, TrainingGrid, NewsEditor, ImageUpload
```

## Stappen

### 0. ✅ Basis
Validatiewerk (schema's, platte `trainingstijden.json`) als eerste commit op deze branch.
→ verify: `npm run build` slaagt, `dist` identiek aan `main`.

### 1. ✅ Server-side routes
Astro 7 (met `compressHTML: true` voor witruimte zoals Astro 6), `@astrojs/vercel` adapter, `@astrojs/react`. Standaard blijft alles prerendered; alleen beheerroutes `export const prerender = false`.
→ verify: build toont publieke pagina's als statisch; `/beheer` server-rendered; Vercel preview-deploy werkt.

### 2. ✅ Schema's centraliseren
Schema's uit `trainingstijden.ts`, `club.ts`, `organisatie.ts` verhuizen naar `src/data/schemas.ts`; bestaande modules importeren ze.
→ verify: build-output identiek; `z.toJSONSchema()` levert bruikbaar JSON Schema voor `club` en `organisatie`.

### 3. ✅ Login
- `/beheer/login`: knop "Inloggen met Google" → `/api/beheer/google` (state + PKCE in cookies van 10 min) → Google → `/api/beheer/google/callback`.
- Callback: state check, code inwisselen, alleen geverifieerd e-mailadres; toegang als adres in `gebruikers.json` of `OWNER_EMAILS` staat.
- Sessie: JWT 30 dagen, getekend met `AUTH_SECRET`, cookie `httpOnly`, `secure`, `SameSite=Lax`.
- `middleware.ts`: zonder geldige sessie → redirect naar login (pagina's) of 401 (API).
- Rechtencheck per route: `requireRole('editor' | 'admin')`.
→ verify: account buiten lijst → "geen toegang"; ongeldige state/code → "mislukt"; zonder cookie geen toegang; Editor krijgt 403 op `club.json`, `organisatie.json` en gebruikersbeheer; gebruiker uit lijst halen blokkeert bestaande sessie binnen 60 s.

### 4. GitHub-laag
- Lezen: inhoud + blob-sha per bestand.
- Schrijven: meerdere bestanden in 1 commit via Git Data API (tree → commit → ref update). Nieuws + foto = 1 commit = 1 deploy.
- Conflict: client stuurt sha's mee van wat geladen is; afwijking op `main` → 409 "iemand anders heeft dit net aangepast, herlaad".
- Allowlist van paden per rol: Editor `src/data/trainingstijden.json`, `src/content/news/*.md`, `src/assets/news/*`; Admin daarnaast `src/data/{club,organisatie}.json`, `beheer/gebruikers.json`.
- Commit-auteur = naam/e-mail van editor; bericht `content: <bestand> bijgewerkt door <naam>`.
- Branch via `GITHUB_BRANCH`: lokaal/preview naar testbranch, productie naar `main`.
→ verify: testcommit op testbranch met juiste auteur; tweede save met oude sha geeft 409; pad buiten allowlist geweigerd.

### 5. JSON-editors (club, organisatie)
Formulier gegenereerd uit JSON Schema (react-jsonschema-form). Server valideert met zod vóór commit; fouten terug in formulier.
→ verify: wijziging opslaan geeft minimale diff; ongeldige teamcode geeft foutmelding, geen commit.

### 6. Trainingstijden-editor
Eigen grid zoals tabel op site: tabblad veld/zaal, teams als rijen, kolommen (dag + locatie) als kolommen, cel = tijd/veld/opmerking. Rijen en kolommen toevoegen/verwijderen/verplaatsen.
→ verify: zonder wijziging opslaan geeft lege diff; wijziging verschijnt correct op `/trainingstijden`.

### 7. Nieuws
- Lijst (titel, datum, vastgepind), nieuw, bewerken, verwijderen (met bevestiging).
- Velden uit `content.config.ts`-schema; tekst in Tiptap, opslag als markdown.
- Foto: client-side verkleinen (max 1600px, webp) vóór upload (Vercel-limiet 4,5 MB per request); opslag in `src/assets/news/`, frontmatter `../../assets/news/<naam>.webp`.
- Slug uit titel, uniek gemaakt.
→ verify: nieuw bericht met foto = 1 commit, build slaagt, bericht staat op `/nieuws/`.

### 7b. Gebruikersbeheer (Admin)
Lijst gebruikers, toevoegen (naam, e-mail, rol), rol wijzigen, verwijderen. Schema in `schemas.ts` (geldig e-mailadres, unieke adressen).
→ verify: nieuwe Editor kan inloggen en alleen nieuws/trainingstijden openen; Admin kan zichzelf niet de laatste Admin-rol afnemen.

### 8. Deploystatus (optioneel)
Na opslaan status uit Vercel API tonen ("bezig" → "live").
→ verify: status wisselt binnen paar minuten naar live.

### 9. Afronding
Handleiding editors (`docs/beheer-handleiding.md`), env-vars in Vercel, eerste gebruikers toevoegen.
→ verify: end-to-end op productie door editor zonder technische kennis.

## Env-vars (Vercel, nooit in repo)
| Naam | Doel |
|---|---|
| `AUTH_SECRET` | tekenen tokens/sessies |
| `OWNER_EMAILS` | komma-gescheiden, altijd Admin (noodtoegang) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth-client |
| `GITHUB_TOKEN` | fine-grained token, alleen deze repo, contents read/write |
| `GITHUB_REPO`, `GITHUB_BRANCH` | doel van commits |
| `VERCEL_TOKEN` | alleen voor stap 8 |

## Risico's en aandachtspunten
- Google-redirect-URI's moeten vooraf geregistreerd zijn: localhost en productiedomein. Vercel-previews hebben wisselende url's → inloggen op previews werkt niet zonder vaste preview-domeinnaam.
- Alleen Google-accounts; editor zonder Google-account kan een gratis account maken met eigen e-mailadres.
- Fine-grained GitHub-token verloopt (max 1 jaar): herinnering zetten om te vernieuwen. Verlopen token = opslaan faalt, site blijft werken.
- Elke opslag = deploy. Prima binnen Vercel Hobby; check of Hobby toegestaan is voor vereniging.
- Sportlink-fetch tijdens build mag contentdeploy niet blokkeren (check `src/lib/matches.ts`).

## Open vragen
1. Klopt rolverdeling: Editor = nieuws + trainingstijden, Admin = alles?
