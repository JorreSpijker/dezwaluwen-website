# Handleiding beheer website KV de Zwaluwen

Met het beheer pas je zelf nieuws, trainingstijden, bestuur & commissies en teams aan. Wat je opslaat is eerst een **concept**: het staat nog niet op de site. Met **Publiceren** in het overzicht zet je alle wijzigingen in één keer live.

## Inloggen

1. Ga naar **dezwaluwen.nl/beheer** (of de link die je van de beheerder kreeg).
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

- Op het **overzicht** (dezwaluwen.nl/beheer) staat bovenaan welke wijzigingen nog niet gepubliceerd zijn, en door wie.
- **Bekijk preview** opent de site zoals hij wordt na publiceren. Na opslaan duurt het een paar minuten voor de preview klaar is.
- Klik **Publiceren** om alles live te zetten. Na ongeveer een minuut staat het op de site.
- Publiceren zet de wijzigingen van **iedereen** live, niet alleen die van jou.

## Meldingen na opslaan

| Melding | Betekenis |
|---|---|
| Opgeslagen als concept | Opgeslagen, nog niet live. Publiceer via het overzicht. |
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
