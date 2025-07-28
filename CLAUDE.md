app/api/ mappen: Dit Maskinrum
Her bygger du de endepunkter, som din frontend kan "kalde" for at udføre handlinger.
Hvad lægger du herind?
Server-logik, der reagerer på brugerhandlinger.
app/api/auth/login/route.js: Håndterer logikken, når en bruger prøver at logge ind.
app/api/posts/create/route.js: Håndterer logikken, når en bruger opretter et nyt opslag.
Hvordan bruger du det praktisk?

Når en bruger udfylder din LoginForm.js og klikker på "Log ind", sender komponenten dataene (e-mail/password) til /api/auth/login. Denne route.js-fil tjekker så, om oplysningerne er korrekte, og sender et svar tilbage.


app/ mappen: Samlevejledningen
Her samler du dine byggeklodser fra components-mappen til færdige sider.
Hvad lægger du herind?
Sider (page.js): Dette er selve indholdet for en given URL (f.eks. din forside eller en "Om os"-side).
Layouts (layout.js): Dette er den fælles ramme, som dine sider vises i (f.eks. en Header og Footer, der er på alle sider).
Datakode: I page.js og layout.js skriver du koden, der henter data fra din database.
Hvordan bruger du det praktisk?

På din forside (app/page.js) henter du en liste over de seneste nyheder. Når du har fået dataene, sender du dem videre til en <NewsList> komponent fra din components-mappe, som så sørger for at vise dem pænt. Du adskiller altså datahentning fra præsentationen.

I min .env.local og i Vercel enviroment variables ligger følgende variabler til Browserless:
BROWSERLESS_TOKEN
PUPPETEER_SERVICE_PROVIDER
PDF_GENERATION_STRATEGY

components/ mappen: Din Lego-kasse
Dette er den vigtigste mappe for din brugergrænseflade (UI).
Hvad lægger du herind?
Alle genanvendelige UI-elementer. Tænk på dem som byggeklodser:
Button.js (en generisk knap)
Card.js (et kort til at vise et produkt eller et opslag)
LoginForm.js (en formular til login)
Header.js, Footer.js
Hvordan bruger du det praktisk?

Byg dine komponenter, så de er "dumme". En Button.js skal kun vide, hvordan den ser ud (farver, størrelse, skrifttype). Hvad der sker, når du klikker på den, skal bestemmes dér, hvor du bruger den. På den måde kan du genbruge den samme flotte knap til både "Log ind", "Køb nu" og "Slet profil".

(Farverne bygger på de præcist udtrukne logo‑farver.)

1. TL;DR (Core Tokens)
Navn	HEX	Primær brug
Brand Blue	#0268AB	Links, logo, primær identitet
Brand Dark (Primary 700)	#024A7D	Primære knapper (bg), mørke sektioner
Brand Hover (Primary 600)	#0260A0	Hover på primær knap / aktiv navigation
Accent Aqua	#1FB1B1	Sekundære/alternative knapper, highlights
Light Background	#F5F8F9	Generel sidebaggrund (alternativ til hvid)
Panel Tint	#E6F4FA	Panel / sektion baggrund (lys blå)
Neutral Text	#1A2228	Primær brødtekst
Neutral Border	#B9C5CC	Standard kant/border

2. Brand Palet (Skaleret)
Primær (Blå)
primary.700 #024A7D
primary.600 #0260A0
primary.500 #0268AB (brand)
primary.300 #2E8FC8
primary.100 #C7E6F5
primary.050 #E6F4FA

Accent (Aqua/Teal)
accent.600 #148E8E
accent.500 #1FB1B1 (hoved‑accent)
accent.300 #56D2D2
accent.100 #CFF4F4
accent.050 #EAFBFB

Neutrale (Grå/Blågrå)
neutral.900 #1A2228 (primær tekst)
neutral.600 #4C5E6A (sekundær tekst)
neutral.400 #95A5AE (svag tekst / ikoner)
neutral.300 #B9C5CC (border)
neutral.100 #E7EEF1 (inputs / flader)
neutral.050 #F5F8F9 (sidebaggrund)
white #FFFFFF

3. Semantiske Farver
Formål	Farve (bg / hoved)	Lys baggrund
Info	#0268AB	#E6F4FA
Success	#1F7D3A	#DFF5E7
Warning	#B25B00	#FFEBD1
Error	#A3242A	#F9DADA

Brug mønster: tekst/ikon = mørk farve, baggrund = lys variant.

4. Hurtige Brugsguidelines
UI Element	Baggrund	Tekst	Hover/Fokus
Primær knap	primary.700	#FFFFFF	bg → primary.600
Sekundær knap (outline)	#FFFFFF	primary.600	bg hover primary.050
Accent knap	accent.500	neutral.900 (bedre kontrast end hvid)	bg → accent.600, tekst kan skifte til hvid
Link	Transparent	primary.500	farve → primary.600
Kort / panel	#FFFFFF eller neutral.050	neutral.900	Border neutral.300
Input	#FFFFFF	neutral.900	Border: neutral.300 → fokus ring accent.500
Alert Info	info.100	info.600	Venstre kant info.600
Sidebaggrund	neutral.050	Tekst neutral.900	–

Fokus ring (keyboard): 2px solid #1FB1B1 (accent.500).

5. Kontrast (WCAG) – Vigtige Regler
primary.700 + hvid tekst = OK (AA/AAA).

primary.500 + hvid tekst = OK.

accent.500 + mørk tekst (neutral.900) = OK (≥4.5:1).

Hvid tekst på accent.500 ikke nok til normal brødtekst → kun til stor tekst eller skift til mørk tekst.

Undgå små hvide tekster på accent.500.

Links på hvid baggrund: brug primary.500 (hover primary.600) for tydelig kontrast.


Logo findes her: public\fiskelogistikgruppen-logo.png

Platformen laves til virksomheden Fiskelogistik Gruppen A/S

Platformen skal være så proffesionel som muligt. Derfor må du ikke bruge emoji - det skal være proffesionelle ikoner.

Organisations-filosofi er bygget op omkring et centralt princip i softwareudvikling: "Separation of Concerns" (Adskillelse af Ansvarsområder). Det betyder, at hver del af koden har ét specifikt formål og holdes adskilt fra andre dele. Det gør projektet meget lettere at forstå, vedligeholde og skalere. Det skal du efterleve.


libs/ mappen: Din Værktøjskasse
Her lægger du alle dine hjælpefunktioner og "service"-kode, som ikke er UI.
Hvad lægger du herind?
db.js: Koden, der forbinder til din database.
stripe.js: Funktioner til at håndtere betalinger med Stripe.
utils.js: Små hjælpefunktioner, f.eks. til at formatere en dato.
config.js: Central konfiguration for hele appen.
Hvordan bruger du det praktisk?

Når din app/page.js skal hente data, kalder den en funktion fra libs/db.js. På den måde er logikken for at tale med databasen centraliseret ét sted. Hvis du skifter database, skal du kun ændre i én fil.


Mail systemet sættes op via Mailjet og Browserless.

models/ mappen: Dine Data-Blåtryk
Her definerer du, hvordan din data er struktureret.
Hvad lægger du herind?
Skemaer (eller "modeller") for din database.
User.js: Definerer, at en bruger har et navn (tekst), email (tekst) og createdAt (dato).
Product.js: Definerer, at et produkt har et navn, en pris (tal) og et billede (URL).
Hvordan bruger du det praktisk?

Dette er din "single source of truth". Når du gemmer en ny bruger via din API, bruger du User-modellen til at sikre, at dataene gemmes korrekt i databasen.

Projektets mål & scope
En privat web-app (Next.js + Tailwind) kun ejeren må logge ind.

Hostes på Vercel (Hobby-plan) og bruger Supabase (Free) til database + autentificering.

Alt skal holde sig inden for gratis-kvoter.

Appen må ikke kunne findes i søgemaskiner.

Konti & adgang
Konto	Krav
GitHub	Opret privat repo jonas-dashboard. Aktivér 2-faktor før første push.
Vercel	Brug brugerens Vercel-organisation. Aktivér 2FA; udvikler får Deploy-adgang, ikke Owner.
Supabase	Opret projekt i brugerens Supabase-org; udvikler får Contributor-rolle.


Arkitektur & libraries
| Lag         | Teknologi                       | Fastlåste regler                                                             |
| ----------- | ------------------------------- | ---------------------------------------------------------------------------- |
| Frontend    | **Next.js 14 App Router**       | TypeScript, React Server Components hvor muligt.                             |
| Styling     | **Tailwind CSS**                | Mobil-first, brug `md:`/`lg:` breakpoints.                                   |
| UI-kit      | **shadcn/ui** over Tailwind     | Ingen hårdkodede modals/toasts; brug biblioteket.                           |
| Data & Auth | **Supabase JS** via SSR-klient  | Auth **må kun** tillade whitelisted e-mail. RLS **skal** være aktiv. |
| Serverless  | **/app/api/\*** routes          | Alle tredjeparts-nøgler læses via `process.env.*`.                           |


 Database-regler
Schema as code: brug Supabase Migrations (supabase db diff → supabase db push).

Navngivning: snake_case, ental tabel-navn (e.g. note).

Standardfelter: id uuid PK, owner uuid FK (references auth.user), created_at timestamptz default now().

Ingen hard-delete brug deleted_at nullable timestamptz.

Design-retningslinjer
Mobil-first: basis-layout testes i iPhone 14-viewport før desktop-breakpoints.

Minimum touch-mål 44 x 44 px.

Tekst kontrast skal opfylde WCAG AA.

Dark-mode via Tailwind dark:; brug next-themes.

Git-workflow
main = protected; push direkte forbudt.

feature/ branches for alt nyt.

Pull Request → mindst én reviewer (kan være brugeren) → squash-merge.

Commit-format:

makefile
Kopiér
Rediger
feat: kort beskrivelse…
fix:   …
chore: …
Automatisk ESLint/Prettier check i GitHub Actions (CI).


CI/CD og miljø-variabler
| Miljø          | Branch           | URL-mønster                    | Secrets                               |
| -------------- | ---------------- | ------------------------------ | ------------------------------------- |
| **Preview**    | alle PR-branches | `*-brugerens-dashboard.vercel.app` | Kopieres automatisk fra *Production*. |
| **Production** | `main`           | `brugerens-dashboard.vercel.app`   | Sættes manuelt i Vercel:              |


Test & kvalitet
| Testtype          | Værktøj                                | Krav                                      |
| ----------------- | -------------------------------------- | ----------------------------------------- |
| Linting           | ESLint                                 | No warnings on `npm run lint`.            |
| Unit-/integration | Vitest + React Testing Library         | Min. 80 % statements on utils/components. |
| E2E               | Playwright (desktop + mobile viewport) | Login-flow + kritiske CRUD-flows.         |
| Accessibility     | Lighthouse CI                          | ≥ 90 score på “Accessibility”.            |

Handover / dokumentation
Opdater README.md med: lokal opsætning, scripts, miljø-vars og RLS-policy-forklaring.

“Definition of Done”
En Pull Request kan først merges, når alle punkter under § 7 Security-checkliste, § 8 Database-regler, § 10 Test & kvalitet og § 11 Udrulning er opfyldt og dokumentation (§ 12) er opdateret.

Be as organised as you possibly can. Make code blocks as simple as you can. Make codefiles as small as possible, and devide codefiles in to more files if they get big. In this way it is easier to debug, but also understand the codebase. Every new feature or thing you make should be made in new files to be as organised as possible. We dont want big overwhelming files.

Fortæl mig hvis jeg skal gå ind og gøre noget på vores Supabase dashboard eller rette indstillinger for at alt virker.

Derudover kan du altid se vores databse information tabel navn, samt konlonne navne osv. så skal du læse filen data.md (@data.md)