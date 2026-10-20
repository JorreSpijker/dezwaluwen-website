# Plan: automatisch herbouwen met Vercel Cron

## Context
Programma, uitslagen en standen (`src/lib/matches.ts`) worden alleen tijdens de build opgehaald. Zonder deploy blijven oude uitslagen staan. Doel: de site op vaste momenten automatisch opnieuw bouwen, zodat de wedstrijddata actueel is. Site blijft statisch; bezoekers doen geen API-calls.

## Werking
```
Vercel Cron (vast tijdstip) ─► GET /api/cron/rebuild  (Authorization: Bearer CRON_SECRET)
                                 └─► POST Deploy Hook (branch main) ─► build haalt korfbal.nl op ─► live
```
De cron roept een kleine route in onze eigen app aan; die triggert de Deploy Hook. De hook-url blijft zo geheim (env), niet in `vercel.json`.

## Vercel-regels (Hobby)
- Max. **1× per dag per cron-job**, maar tot 100 jobs per project → meerdere jobs met elk een eigen dag/tijd mogen.
- Tijdstip is **±59 min** (job `0 19 * * 6` draait ergens tussen 19:00 en 19:59).
- Schema's in **UTC** (NL = UTC+2 zomer, UTC+1 winter).
- Crons draaien alleen op de productie-deploy; geen retry bij fout.
- Deploy Hooks: max 60 per uur per project; dubbele aanroepen annuleren de vorige build.

## Schema
| Job | Cron (UTC) | NL-tijd (ongeveer) | Waarom |
|---|---|---|---|
| Elke nacht | `0 3 * * *` | 04:00–05:00 / 05:00–06:00 | programmavenster schuift dagelijks op |
| Zaterdag middag | `0 13 * * 6` | 14:00–16:00 | ochtendwedstrijden jeugd |
| Zaterdag avond | `0 19 * * 6` | 20:00–22:00 | alle zaterdaguitslagen en standen |
| Woensdag avond | `0 21 * * 3` | 22:00–00:00 | midweek (MW1) |

## Stappen

**1. Cron-route**
- `src/pages/api/cron/rebuild.ts` (`prerender = false`), `GET`:
  - `Authorization` moet `Bearer ${CRON_SECRET}` zijn, anders 401.
  - `POST` naar `DEPLOY_HOOK_URL`; antwoord van Vercel (job-id) teruggeven, fout → 502 (zichtbaar in Vercel-logs).
- Valt buiten `/api/cms`, dus de login-middleware (`src/middleware.ts`) laat hem met rust.
→ verify: lokaal `curl -H "Authorization: Bearer <secret>" localhost:4321/api/cron/rebuild` geeft job-id (met test-hook); zonder header 401.

**2. Config**
- `astro.config.mjs` env-schema: `CRON_SECRET`, `DEPLOY_HOOK_URL` (server, secret, optional).
- `vercel.json` met `crons` uit het schema hierboven, alle naar `/api/cron/rebuild`.
- `.env.example`: beide variabelen met uitleg.
→ verify: `npm run build` slaagt; `.vercel/output/config.json` bevat de crons.

**3. Vercel instellen (beheerder)**
- Settings → Git → Deploy Hooks: hook "Cron rebuild" op branch `main`; url in env `DEPLOY_HOOK_URL`.
- Env `CRON_SECRET`: willekeurige string (≥16 tekens, bv. `openssl rand -hex 24`).
- Deploy; daarna Settings → Cron Jobs toont 4 jobs.
→ verify: in Cron Jobs op **Run** klikken → nieuwe deployment "Deploy Hook" in de lijst, site bijgewerkt.

**4. Documentatie**
Korte sectie in `docs/cms-handleiding.md` (voor de beheerder): wanneer de site vanzelf ververst, hoe je cron uitzet of het schema wijzigt.

## Aandachtspunten
- Bij storing van korfbal.nl gaat de build door zonder wedstrijden (bestaande afhandeling in `matches.ts`); volgende cron herstelt het.
- Cron-builds tellen mee voor build-minuten; 4 jobs ≈ 10 builds per week, ruim binnen Hobby.
- Komt later Fase 2 (concept-branch, `docs/cms-plan.md`): hook blijft op `main`, dus cron publiceert geen concepten.
- Precieze tijden nodig (bijv. direct na de laatste wedstrijd)? Dan Pro-plan, of een externe cron-dienst die de Deploy Hook aanroept.

## Open vragen
Geen. Schema bevestigd.
