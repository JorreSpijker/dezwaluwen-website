# Handleiding CMS website KV de Zwaluwen

Met het CMS pas je zelf nieuws, pagina's, trainingstijden, bestuur & commissies en teams aan. Wat je opslaat is eerst een **concept**: het staat nog niet op de site. Met **Publiceren** op **Status** zet je alle wijzigingen in één keer live.

## Inloggen

1. Ga naar **dezwaluwen.nl/cms** (of de link die je van de beheerder kreeg).
2. Klik op **Inloggen met Google** en kies je Google-account.
3. Zie je "Dit Google-account heeft geen toegang"? Dan staat dit account niet op de lijst. Kies een ander account, of vraag de beheerder je adres toe te voegen.

Je blijft 30 dagen ingelogd. Uitloggen kan rechtsboven.

## Nieuws

- **Nieuw bericht:** Nieuws → *+ Nieuw bericht*. Vul titel, datum, categorie, foto en tekst in en klik **Plaatsen**.
- **Bewerken:** klik op een bericht in de lijst, pas aan, klik **Opslaan**.
- **Korte titel:** optioneel, voor de nieuwslijst op de telefoon. Leeg = gewone titel.
- **Vastpinnen:** het bericht staat altijd bovenaan, los van de datum. Haal het vinkje weg als het niet meer actueel is.
- **Foto:** kies een JPG of PNG; de foto wordt automatisch verkleind. Vul ook de **fotobeschrijving** in (wat staat erop?), voor mensen die de foto niet kunnen zien.
- **Tekst:** gebruik de knoppen boven het tekstvak voor kopjes, vet, schuin, lijstjes en links.
- **Verwijderen:** open het bericht en klik **Verwijderen**. Dit kan niet ongedaan worden gemaakt.

## Pagina's

- **Bewerken:** Pagina's → klik op een pagina. Titel, intro en tekst pas je aan op de pagina zelf, net als bij nieuws (ook het **/**-menu en tabellen).
- **Nieuwe pagina:** Pagina's → *+ Nieuwe pagina*. Het **adres** (bijv. `/sponsoren/`) volgt de titel; pas het aan vóór je plaatst, daarna kan het niet meer. Een nieuwe pagina staat niet vanzelf in het menu: vraag de beheerder hem toe te voegen.
- **Afbeelding:** optioneel. Vul ook de beschrijving in.
- **Kruimelpad:** de menugroep boven de titel, bijv. "Nieuw lid?".
- **Beschrijving voor Google:** één of twee zinnen die in zoekresultaten staan.
- **Feiten:** blokjes onder de foto. Kies *Titel met tekst* of *Groot cijfer met tekst*. In een cijfer wordt `{teams}` automatisch het aantal teams.
- **Vast blok:** de korfbalveldtekening of de lijst met teams, na de eerste alinea.

## Trainingstijden

- Kies bovenaan **Veld** of **Zaal**.
- Elke kolom is een dag (eventueel met locatie), elke rij een team.
- Vul per cel de **tijd** in (bijv. `18:00–19:00`), en eventueel veld en opmerking. **Tijd leeg = geen training** op die dag.
- Met *+ Kolom*, *+ Team* en *+ Groep* voeg je toe; met ← → ↑ ↓ verplaats je; met ✕ verwijder je.
- Klik onderaan op **Opslaan**.

## Bestuur & commissies, Teams & Sportlink

- Pas velden aan en klik onderaan op **Opslaan**.
- Lijsten (leden, taken, teams) hebben knoppen om toe te voegen, te verwijderen en te verplaatsen.
- **Teams & Sportlink:** de teamcode en poulecodes komen uit Sportlink. Een verkeerde code betekent dat programma en uitslagen van dat team niet meer kloppen. Twijfel je? Vraag het eerst.

## Publiceren

- Op **Status** (dezwaluwen.nl/cms/status) staat welke wijzigingen nog niet gepubliceerd zijn, en door wie. Het rondje rechtsboven is oranje zolang er iets klaarstaat, groen als alles live is.
- Daaronder zie je wanneer de site voor het laatst is livegezet en door wie, en de laatste 10 keer daarvoor.
- **Bekijk preview** opent de site zoals hij wordt na publiceren. Na opslaan duurt het een paar minuten voor de preview klaar is.
- Klik **Publiceren** om alles live te zetten. Na ongeveer een minuut staat het op de site.
- Publiceren zet de wijzigingen van **iedereen** live, niet alleen die van jou.

## Meldingen na opslaan

| Melding | Betekenis |
|---|---|
| Opgeslagen als concept | Opgeslagen, nog niet live. Publiceer via Status. |
| Bezig met publiceren… | Opgeslagen, de site wordt bijgewerkt. Even wachten. |
| Opgeslagen en live op de site | Klaar. |
| Niet opgeslagen, controleer: … | Er klopt iets niet in de invoer (bijv. verplicht veld leeg). Pas aan en sla opnieuw op. |
| Iemand anders heeft dit net aangepast | Iemand sloeg tegelijk iets op. **Kopieer je tekst**, herlaad de pagina en voer je wijziging opnieuw in. |
| Publiceren is mislukt | Opgeslagen, maar de site kon niet bijgewerkt worden; de oude versie blijft zichtbaar. Laat het de beheerder weten. |

## Voor de beheerder

- **Toegang geven of intrekken:** Vercel → Project → Settings → Environment Variables → `BEHEER_EMAILS` (komma-gescheiden Google-adressen) aanpassen en daarna **Redeploy**.
- **Concept en live:** opslaan gaat naar branch `concept` (`GITHUB_BRANCH=concept`), Publiceren merget die naar `main` (`GITHUB_PUBLISH_BRANCH`). De branch `concept` wordt bij de eerste opslag vanzelf aangemaakt. Vercel-previews van `concept` zijn alleen zichtbaar als Deployment Protection voor previews uit staat.
- **Iets terugdraaien:** elke opslag is een commit op GitHub met de naam van de editor. Revert die commit, of zet in Vercel een vorige deploy terug via *Promote*.
- **GitHub-token verloopt** (max. 1 jaar). Daarna mislukt opslaan; de site blijft werken. Maak een nieuw fine-grained token (alleen deze repo, Contents read/write, Deployments read) en zet het in Vercel als `GITHUB_TOKEN`.
- Alle instellingen staan in `.env.example`.
