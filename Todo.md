# Todo
[] Pagina aanpasbaar maken in CMS
[] Tiptap uitbreiden met meer mogelijke nodes
[] Plan voor afbeelding uploads.

## Automatisch herbouwen met Vercel Cron
Programma, uitslagen en standen actueel houden door de site op vaste momenten opnieuw te bouwen. Plan: [docs/rebuild-plan.md](docs/rebuild-plan.md).

- [ ] Route `src/pages/api/cron/rebuild.ts`: check `Authorization: Bearer CRON_SECRET`, roep `DEPLOY_HOOK_URL` aan
- [ ] `CRON_SECRET` en `DEPLOY_HOOK_URL` in env-schema (`astro.config.mjs`) en `.env.example`
- [ ] `vercel.json` met crons (UTC): `0 3 * * *`, `0 13 * * 6`, `0 19 * * 6`, `0 21 * * 3`
- [ ] Vercel: Deploy Hook op `main` aanmaken, `DEPLOY_HOOK_URL` en `CRON_SECRET` zetten, deployen
- [ ] Testen via Settings → Cron Jobs → Run
- [ ] Sectie in `docs/cms-handleiding.md`
