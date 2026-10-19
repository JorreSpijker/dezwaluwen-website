# Voorstel: pagina Gratis proefles

## Doel
Een bezoeker (vaak een ouder) gaat van "ik klik op Gratis proefles" naar een ingeplande proefles, in zo weinig mogelijk stappen, en weet daarna precies waar en wanneer hij moet zijn.

## Bron
Het Claude Design bevat al de content per leeftijdsgroep (`AGES` in `design.html`):
- de groep en de trainingstijden;
- `korfbal`: wat je leert op die leeftijd;
- `club`: hoe het team en de begeleiding werken;
- `fee` en `feeNote`: de contributie per maand, de eerste 3 trainingen gratis;
- `dates`: de eerstvolgende 3 proeflesmomenten.

Ook de stappen staan erin: Leeftijd → Korfbal → De club → Kosten → Proefles.

## URL en instappunten
- `/proefles/`
- De knop in de hero linkt naar `/proefles/?leeftijd=7-11`, zodat de gekozen leeftijd al geselecteerd is.
- De knop in de header, de vaste knop op mobiel en het promoblok in het menu linken naar `/proefles/` zonder voorselectie.

## Opbouw (aanbevolen: één pagina, gestuurd door leeftijd)
1. **Intro**: de titel "Train gratis mee", één zin uitleg en de leeftijdskiezer (4–6 / 7–11 / 12–17 / 18+, dezelfde als in de hero).
2. **Voor jouw leeftijd**: drie blokken naast elkaar die meewisselen met de gekozen leeftijd:
   - *Korfbal*: de tekst uit `korfbal` en een foto;
   - *De club*: de tekst uit `club` en de trainingstijden;
   - *Kosten*: het bedrag per maand, groot, en daaronder `feeNote`.
3. **Kies je proefles**: de 3 data als klikbare kaartjes, bijvoorbeeld "Di 30 sep · 18:00".
4. **Aanmelden**: een kort formulier:
   - naam deelnemer;
   - geboortedatum of leeftijd, alvast ingevuld vanuit de keuze;
   - naam ouder (alleen voor jeugd);
   - e-mail;
   - telefoon;
   - opmerking (optioneel).

   De knop heet "Plan mijn proefles".
5. **Bevestiging** (na verzenden): "Tot dinsdag 30 september om 18:00", met adres, route-link en wat je mee moet nemen.
6. **Praktisch / FAQ**: wat neem ik mee, waar is het, mogen ouders kijken, wat na 3 trainingen.

Op desktop staat het aanmeldblok (stap 3 en 4) als vaste kolom rechts in beeld; links staat de uitleg. Op mobiel staat alles onder elkaar en scrollt de vaste knop "Plan je gratis proefles" naar het formulier.

### Alternatief: wizard met 5 stappen (zoals in het design)
Een voortgangsbalk met Leeftijd → Korfbal → De club → Kosten → Proefles en per stap één scherm.
- Voordeel: rustig en sturend.
- Nadeel: wie alleen wil aanmelden moet 4 schermen door, en de informatie is niet te scannen of te vinden voor Google.

## Formulierafhandeling (keuze nodig)
De site is statisch, dus het formulier heeft een externe verwerker nodig:
- **Formulierdienst** (bijvoorbeeld Formspree, Web3Forms, Basin): de inzending gaat per e-mail naar de ledenwervingcommissie. Geen server nodig.
- **Formulier van de hosting** (Netlify Forms): alleen als we op Netlify hosten.
- **Bestaand aanmeldformulier van de club** (bijvoorbeeld Sportlink): doorlinken in plaats van zelf een formulier bouwen.

## Data
De proefles-data komen in `src/data/ages.ts`, met de teksten uit het design. Dat zijn nu vaste waarden (september/oktober 2025) die per seizoen bijgewerkt moeten worden. Later kunnen ze eventueel automatisch uit de trainingstijden komen.

## Open vragen
- Kiezen we voor één pagina of voor de wizard?
- Hoe wordt het formulier afgehandeld, en naar welk e-mailadres gaan de inzendingen?
- Kloppen de contributiebedragen uit het design (€ 9 / 13 / 16 / 22, MW1 € 15)? Die zijn door het design-tool gegenereerd.
