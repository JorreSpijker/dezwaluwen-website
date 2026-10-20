# Plan: eigen CMS (`/cms`)

Branch: `feature/admin`

## Doel
Vrijwilligers loggen in met hun Google-account (geen wachtwoord, geen GitHub-account), passen JSON-data aan via formulieren en beheren nieuwsberichten. Opslaan = commit op `main`, Vercel deployt, direct live.

## Uitgangspunten
| Onderwerp | Keuze |
|---|---|
| Hosting | Vercel; site blijft statisch, alleen `/cms` + `/api/cms/*` server-side |
| Login | Google (OAuth + PKCE via `arctic`), alleen accounts die wij toevoegen, geen database |
| Toegang | `BEHEER_EMAILS` in Vercel, geen rollen |
| GitHub | fine-grained token |
| Opslag | git (GitHub API), geen database |
| Validatie | dezelfde zod-schema's voor build, API en formulieren |
| UI | React-islands alleen in `/cms` |
| Workflow | direct live, geen review |

Afgevallen: Decap/Sveltia (login vereist GitHub of DecapBridge, configuratie te beperkt), Keystatic/Tina (schema's dubbel, gratis tier te klein), database-CMS (verlies git-geschiedenis).

## Toegang
- Vercel-variabele `BEHEER_EMAILS` (komma-gescheiden Google-adressen); lokaal in `.env`. Iedereen op de lijst mag alles; geen rollen.
- Middleware checkt bij elk verzoek of het adres uit de sessie nog in `BEHEER_EMAILS` staat: adres eruit + redeploy = direct geen toegang.
- Toegestane bestanden staan in `src/lib/admin/access.ts`; al het andere wordt geweigerd (403).

## Architectuur
```
browser /cms (React)
  │  login: /api/cms/google ─► Google ─► /api/cms/google/callback
  │         ─► e-mail in BEHEER_EMAILS? ─► sessiecookie (JWT, httpOnly)
  │
  │  laden:   GET  /api/cms/file?path=…        ─► GitHub: inhoud + sha
  │  opslaan: POST /api/cms/commit {files, baseSha}
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
  lib/admin/users.ts         toegang via BEHEER_EMAILS
  lib/admin/repo.ts          lezen + commit van meerdere bestanden (GitHub API via fetch; lokaal zonder token: werkmap)
  middleware.ts              /cms en /api/cms afschermen
  pages/cms/              login, overzicht, editors (prerender = false)
  pages/api/cms/          login, verify, logout, file, commit, news
  components/admin/          React: JsonForm, TrainingGrid, NewsEditor, ImageUpload
```

## Stappen

### 0. ✅ Basis
Validatiewerk (schema's, platte `trainingstijden.json`) als eerste commit op deze branch.
→ verify: `npm run build` slaagt, `dist` identiek aan `main`.

### 1. ✅ Server-side routes
Astro 7 (met `compressHTML: true` voor witruimte zoals Astro 6), `@astrojs/vercel` adapter, `@astrojs/react`. Standaard blijft alles prerendered; alleen cms-routes `export const prerender = false`.
→ verify: build toont publieke pagina's als statisch; `/cms` server-rendered; Vercel preview-deploy werkt.

### 2. ✅ Schema's centraliseren
Schema's uit `trainingstijden.ts`, `club.ts`, `organisatie.ts` verhuizen naar `src/data/schemas.ts`; bestaande modules importeren ze.
→ verify: build-output identiek; `z.toJSONSchema()` levert bruikbaar JSON Schema voor `club` en `organisatie`.

### 3. ✅ Login
- `/cms/login`: knop "Inloggen met Google" → `/api/cms/google` (state + PKCE in cookies van 10 min) → Google → `/api/cms/google/callback`.
- Callback: state check, code inwisselen, alleen geverifieerd e-mailadres; toegang als adres in `BEHEER_EMAILS` staat.
- Sessie: JWT 30 dagen, getekend met `AUTH_SECRET`, cookie `httpOnly`, `secure`, `SameSite=Lax`.
- `middleware.ts`: zonder geldige sessie → redirect naar login (pagina's) of 401 (API).
→ verify: account buiten lijst → "geen toegang"; ongeldige state/code → "mislukt"; zonder cookie geen toegang; adres uit `BEHEER_EMAILS` blokkeert bestaande sessie.

### 4. ✅ GitHub-laag
- Lezen: inhoud + blob-sha per bestand.
- Schrijven: meerdere bestanden in 1 commit via Git Data API (tree → commit → ref update). Nieuws + foto = 1 commit = 1 deploy.
- Conflict: client stuurt sha's mee van wat geladen is; afwijking op `main` → 409 "iemand anders heeft dit net aangepast, herlaad".
- Allowlist van paden: `src/data/{trainingstijden,club,organisatie}.json`, `src/content/news/*.md`, `src/assets/news/*.webp`.
- Commit-auteur = naam/e-mail van editor; bericht `content: <bestand> bijgewerkt door <naam>`.
- Branch via `GITHUB_BRANCH`: lokaal/preview naar testbranch, productie naar `main`.
→ verify: testcommit op testbranch met juiste auteur; tweede save met oude sha geeft 409; pad buiten allowlist geweigerd.

### 5. ✅ JSON-editors (club, organisatie)
Formulier gegenereerd uit JSON Schema (react-jsonschema-form). Server valideert met zod vóór commit; fouten terug in formulier.
→ verify: wijziging opslaan geeft minimale diff; ongeldige teamcode geeft foutmelding, geen commit.

### 6. ✅ Trainingstijden-editor
Eigen grid zoals tabel op site: tabblad veld/zaal, teams als rijen, kolommen (dag + locatie) als kolommen, cel = tijd/veld/opmerking. Rijen en kolommen toevoegen/verwijderen/verplaatsen.
→ verify: zonder wijziging opslaan geeft lege diff; wijziging verschijnt correct op `/trainingstijden`.

### 7. ✅ Nieuws
- Lijst (titel, datum, vastgepind), nieuw, bewerken, verwijderen (met bevestiging).
- Velden uit `content.config.ts`-schema; tekst in Tiptap, opslag als markdown.
- Foto: client-side verkleinen (max 1600px, webp) vóór upload (Vercel-limiet 4,5 MB per request); opslag in `src/assets/news/<slug>-<id>.webp`. Vervangen of verwijderen ruimt eigen foto op; bestaande foto's buiten `news/` blijven staan.
- Frontmatter-schema gedeeld met `content.config.ts` (`newsFields` in `schemas.ts`); tekst ongewijzigd = originele markdown terug.
- Slug uit titel, uniek gemaakt.
→ verify: nieuw bericht met foto = 1 commit, build slaagt, bericht staat op `/nieuws/`.

### 8. ✅ Deploystatus
Na opslaan volgt de editor de Vercel-deploy van de commit via GitHub-deployments (`/api/cms/deploy`, elke 10 s, max 10 min): "bezig" → "live" of "mislukt". Geen Vercel-token nodig; GitHub-token heeft Deployments read nodig.
→ verify: status wisselt binnen paar minuten naar live.

### 9. Afronding
✅ Handleiding editors (`docs/cms-handleiding.md`). Nog te doen door beheerder: env-vars in Vercel, eerste adressen in `BEHEER_EMAILS`.
→ verify: end-to-end op productie door editor zonder technische kennis.

## Fase 2: concept en publiceren met één knop

### Doel
Wijzigingen verzamelen zonder dat ze live gaan, bekijken op een preview, en met één knop **Publiceren** alles tegelijk live zetten.

### Werking
```
opslaan (alle editors) ─► commit op branch `concept`        (niet live)
                             └─► Vercel bouwt preview van `concept`
/cms: "N wijzigingen niet gepubliceerd" + lijst + preview-link
Publiceren ─► GitHub merge `concept` → `main` ─► Vercel deployt productie ─► deploystatus
         └─► daarna `main` → `concept` (concept blijft gelijk met code-wijzigingen op main)
```

### Stappen

**✅ 10. Concept-branch als opslagdoel**
- `GITHUB_BRANCH=concept` (bestaande opslag in `src/lib/admin/repo.ts` blijft ongewijzigd). Nieuwe env `GITHUB_PUBLISH_BRANCH` (default `main`).
- Branch `concept` eenmalig aanmaken vanaf `main` (handmatig, of `publish` maakt hem aan als hij ontbreekt).
- Melding na opslaan wordt: "Opgeslagen als concept. Publiceer via het overzicht." (geen deploy-polling meer per opslag).
→ verify: opslaan maakt commit op `concept`, productie ongewijzigd.

**✅ 11. Overzicht van ongepubliceerde wijzigingen**
- `repo.ts`: `pending()` via `GET /compare/{main}...{concept}` → aantal commits, gewijzigde bestanden (pad + status), auteurs.
- Bestandspaden vertalen naar leesbare namen: "Nieuws: <titel/slug>", "Trainingstijden", "Teams & Sportlink", "Bestuur & commissies", foto's samenvoegen met hun bericht.
- Preview-url: laatste GitHub-deployment voor de head van `concept` → `environment_url` (hergebruik patroon uit `deployState()`).
- In `src/pages/cms/index.astro`: paneel bovenaan met lijst, "Bekijk preview" en knop **Publiceren**; leeg = "Alles is gepubliceerd".
→ verify: na twee opslagen toont paneel 2 wijzigingen met namen en werkende preview-link.

**✅ 12. Publiceren**
- `POST /api/cms/publish`: `POST /merges {base: main, head: concept}` met bericht `content: gepubliceerd door <naam>`.
  - 201 → merge-commit-sha terug; 204 → niets te publiceren; 409 → conflict-melding ("neem contact op met beheerder").
- Na succes: `POST /merges {base: concept, head: main}` zodat `concept` code-wijzigingen van `main` meekrijgt.
- UI: knop met bevestiging ("N wijzigingen live zetten?"), daarna bestaande `DeployStatus` (`src/components/admin/DeployStatus.tsx`) op de merge-commit.
- Lokaal zonder `GITHUB_TOKEN`: paneel toont "Publiceren werkt alleen online" (werkmap = direct).
→ verify: publiceren → productie toont wijzigingen, paneel weer leeg, deploystatus "live".

**✅ 13. Handleiding bijwerken**
`docs/cms-handleiding.md`: concept, preview bekijken, publiceren.

### Vercel-instellingen
- Production branch blijft `main`; previews voor `concept` aan (standaard).
- **Deployment Protection**: standaard vragen Vercel-previews om een Vercel-login. Uitzetten voor previews (of alleen "Only Production Deployments" beschermen), anders kunnen editors de preview niet zien.

### Aandachtspunten
- Conflict alleen als code op `main` dezelfde content-bestanden wijzigt; dan handmatig oplossen in git.
- Iedereen in `BEHEER_EMAILS` mag publiceren (geen rollen).
- Builds: elke opslag = preview-build, elke publicatie = productie-build. Ruim binnen Vercel Hobby.

## Env-vars (Vercel, nooit in repo)
| Naam | Doel |
|---|---|
| `AUTH_SECRET` | tekenen tokens/sessies |
| `BEHEER_EMAILS` | komma-gescheiden Google-adressen met toegang |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth-client |
| `GITHUB_TOKEN` | fine-grained token, alleen deze repo, Contents read/write + Deployments read |
| `GITHUB_REPO`, `GITHUB_BRANCH` | doel van commits (`concept`) |
| `GITHUB_PUBLISH_BRANCH` | branch die live gaat bij publiceren (default `main`) |

## Risico's en aandachtspunten
- Google-redirect-URI's moeten vooraf geregistreerd zijn: localhost en productiedomein. Vercel-previews hebben wisselende url's → inloggen op previews werkt niet zonder vaste preview-domeinnaam.
- Alleen Google-accounts; editor zonder Google-account kan een gratis account maken met eigen e-mailadres.
- Fine-grained GitHub-token verloopt (max 1 jaar): herinnering zetten om te vernieuwen. Verlopen token = opslaan faalt, site blijft werken.
- Elke opslag = deploy. Prima binnen Vercel Hobby; check of Hobby toegestaan is voor vereniging.
- Sportlink-fetch tijdens build mag contentdeploy niet blokkeren (check `src/lib/matches.ts`).

## Open vragen
1. Deployment Protection voor previews uitzetten in Vercel (nodig om preview te kunnen bekijken)?
