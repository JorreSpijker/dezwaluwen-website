# Plan: KV de Zwaluwen website — homepage + menu (Astro)

## Context
`design.html` = Claude Design bundle (richting 1b "Vliegende start"): homepage desktop 1280 + mobiel 390. Repo verder leeg. Doel fase 1: design omzetten naar echte Astro-site, alleen homepage + menu, programma/uitslagen live uit Sportlink. Overige pagina's (proefles-flow, nieuws, teams) later; menu-links wijzen voorlopig naar `#`/placeholder.

Bij start implementatie: dit plan kopiëren naar `plan.md` in repo (conform CLAUDE.md).

## Design-inventaris (uit bundle)
- Font: Schibsted Grotesk (primair). Andere fonts in bundle = design-tool varianten, niet gebruiken.
- Kleuren: blauw `#005daa`, oranje accent `#ee5a36`, tekst `#111827`, grijs `#6b7280`/`#4b5563`, achtergrond `#f4f6fa`, lijnen `#e6ecf3`.
- Assets: 12 webp-foto's, 1 svg (logo), woff2 fonts — base64/gzip in manifest; uitpakscript bestaat al (python, scratchpad).
- Data in component-script: `MENU` (3 items met groups + promo), `AGES` (4 leeftijdsgroepen + tijden), `MATCHES`/`RES` (dummy).

## Secties homepage
1. Header: logo, 3 menu-items met mega-menu (groups + promoblok), vaste knop "Gratis proefles".
2. Hero (split): "Korfbal voor iedereen. Samen sporten begint hier." + leeftijdskiezer (4–6 / 7–11 / 12–17 / 18+) toont groep + trainingstijden + CTA.
3. Nieuws: 4 items + "Alle nieuws →".
4. Programma/Uitslagen: tabs, per dag gegroepeerd, thuis/uit-tag, veld, score.
5. Snelle links: Zwaluwenpost, WhatsApp community, Lid worden, Clubshop.
6. Clubshop-blok.
7. Footer: Over de club, Vrijwilligers, Route, Contact, ©.
Mobiel: menu als bottom sheet met submenu (terug-knop), vaste CTA "Plan je gratis proefles" onderin, compacte nieuwslijst.

## Aanpak
1. **Assets uitpakken** — script naar `scripts/unpack-design.py`; foto's naar `src/assets/`, logo naar `public/`, Schibsted Grotesk via `@fontsource/schibsted-grotesk` (geen bundle-fonts). → verify: foto's openen, juiste beelden bij juiste sectie (vergelijken met design in browser).
2. **Astro scaffold** — `npm create astro` (minimal, TS), geen UI-framework; interactie (menu, leeftijdskiezer, tabs) met klein vanilla `<script>` per component. CSS: tokens als custom properties in `src/styles/global.css`, scoped `<style>` per component. → verify: `npm run dev` draait.
3. **Content als data** — `src/data/menu.ts`, `src/data/ages.ts`, `src/data/news.ts` (statisch, uit design). Geen CMS in fase 1.
4. **Componenten** — `Header.astro` (+ `MegaMenu`), `MobileMenu.astro` (sheet), `Hero.astro` (+ leeftijdskiezer), `News.astro`, `Matches.astro` (tabs), `QuickLinks.astro`, `Shop.astro`, `Footer.astro`, `StickyCta.astro`; `src/pages/index.astro` zet ze samen. → verify: visueel naast `design.html` op 1280 en 390.
5. **Wedstrijddata** — `src/lib/matches.ts`: build-time fetch van mijn.korfbal.nl API (`/clubs/NCX35M2/program` komende week, `/results` afgelopen week), groeperen per dag, eigen teams via `clubRefId`. Geen sleutel nodig; bij API-fout faalt de build.
6. **Actualiteit data** — statische site, dus periodieke rebuild (bv. hosting build hook via cron/GitHub Action, elk uur op wedstrijddagen). Exacte hosting nog kiezen.
7. **Toegankelijkheid/responsive** — menu toetsenbord + `aria-expanded`, focus trap in sheet, tabs met `role="tablist"`, geen horizontale scroll op 390.

## Open punten (niet blokkerend voor start)
- Hosting (Netlify/Vercel/Cloudflare Pages) + rebuild-schema.
- Echte nieuwsitems/foto's of design-content houden.

## Verificatie
- `npm run build` slaagt en toont actuele wedstrijden.
- `npm run preview`, in Chrome naast `design.html` vergelijken op 1280 en 390: header/mega-menu, leeftijdskiezer wisselt groep+tijden, tabs wisselen programma/uitslagen, mobiel sheet + submenu + vaste CTA.
- Lighthouse a11y/performance check op homepage.
