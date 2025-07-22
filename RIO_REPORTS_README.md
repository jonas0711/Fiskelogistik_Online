# RIO Rapport Generator - Dokumentation

## Oversigt

Denne dokumentation beskriver den nye rapportgenereringsfunktionalitet i FSK Online platformen, som er baseret på den oprindelige Python-applikation. Systemet giver mulighed for at generere detaljerede rapporter over chaufførdata med avancerede nøgletal og rangeringer.

## Funktioner

### 1. Rapport Typer

#### Samlet Rapport
- **Beskrivelse:** Genererer en samlet rapport over alle kvalificerede chauffører
- **Indhold:** 
  - Samlet performance rangering
  - Detaljerede data for hver chauffør
  - Nøgletal og statistikker
- **Anvendelse:** Månedlige/årlige oversigter

#### Gruppe Rapport
- **Beskrivelse:** Genererer rapport for specifik chauffør gruppe
- **Indhold:**
  - Gruppebaseret rangering
  - Sammenligning inden for gruppen
  - Gruppespecifikke statistikker
- **Anvendelse:** Team-baserede analyser

#### Individuel Rapport
- **Beskrivelse:** Genererer detaljeret rapport for enkelt chauffør
- **Indhold:**
  - Personlige nøgletal
  - Sammenligning med andre chauffører
  - Detaljerede kørselsdata
- **Anvendelse:** Personlig feedback og udvikling

### 2. Nøgletal og Beregninger

#### Tomgangsprocent
- **Formel:** (Tomgangstid / Motordriftstid) × 100
- **Mål:** Under 5%
- **Beskrivelse:** Procentdel af total motordriftstid brugt i tomgang

#### Fartpilot Andel
- **Formel:** (Fartpilot distance / Total distance over 50 km/h) × 100
- **Mål:** Over 66,5%
- **Beskrivelse:** Procentdel af køretid hvor fartpilot er aktivt

#### Motorbremse Andel
- **Formel:** (Motorbremse distance / Total bremsedistance) × 100
- **Mål:** Over 56%
- **Beskrivelse:** Procentdel af total bremsning udført med motorbremse

#### Påløbsdrift Andel
- **Formel:** ((Aktiv påløbsdrift + Påløbsdrift distance) / Total distance) × 100
- **Mål:** Over 7%
- **Beskrivelse:** Procentdel af køretid i påløbsdrift

#### Diesel Effektivitet
- **Formel:** Kørestrækning / Forbrug
- **Enhed:** km/l
- **Beskrivelse:** Antal kilometer kørt per liter brændstof

#### Vægtkorrigeret Forbrug
- **Formel:** (Forbrug / Distance × 100) / Totalvægt
- **Enhed:** l/100km/t
- **Beskrivelse:** Brændstofforbrug justeret for lastens vægt

### 3. Samlet Rangering

#### Rangering System
- **Metode:** Kombinerer placeringer i fire hovedkategorier
- **Kategorier:** Tomgang, Fartpilot, Motorbremse, Påløbsdrift
- **Scoring:** Lavere samlet score = bedre præstation
- **Tie-break:** Vægtkorrigeret forbrug

#### Placering Beregning
1. Sorter chauffører i hver kategori
2. Tildel placering (1, 2, 3, ...)
3. Sum placeringer for samlet score
4. Sorter efter samlet score
5. Ved uafgjort: Sorter efter vægtkorrigeret forbrug

## Teknisk Arkitektur

### 1. Komponenter

#### ReportGenerator
- **Fil:** `components/ReportGenerator.tsx`
- **Funktion:** Hovedkomponent til rapportgenerering
- **Features:**
  - Step-by-step wizard interface
  - Validering af input
  - API integration
  - Rapportvisning

#### ReportViewer
- **Fil:** `components/ReportViewer.tsx`
- **Funktion:** Visning af genererede rapporter
- **Features:**
  - Tab-baseret navigation
  - Detaljerede tabeller
  - Responsivt design
  - Modal interface

### 2. API Endpoints

#### POST /api/rio/reports/generate
- **Funktion:** Genererer rapport baseret på konfiguration
- **Input:**
  ```typescript
  {
    reportType: 'samlet' | 'gruppe' | 'individuel';
    minKm: number;
    month?: number;
    year?: number;
    selectedGroup?: string;
    selectedDriver?: string;
    format: 'word' | 'pdf';
  }
  ```
- **Output:**
  ```typescript
  {
    success: boolean;
    message: string;
    data: {
      filename: string;
      reportType: string;
      driverCount: number;
      period: string;
      reportData: any;
    };
  }
  ```

#### GET /api/rio/reports/generate
- **Funktion:** Henter tilgængelige rapport muligheder
- **Output:**
  ```typescript
  {
    success: boolean;
    data: {
      periods: Array<{year: number, month: number}>;
      drivers: string[];
      reportTypes: Array<{value: string, label: string, description: string}>;
      formats: Array<{value: string, label: string}>;
    };
  }
  ```

### 3. Hjælpefunktioner

#### report-utils.ts
- **Fil:** `libs/report-utils.ts`
- **Funktioner:**
  - `calculateMetrics()`: Beregner nøgletal
  - `calculateOverallRanking()`: Beregner samlet rangering
  - `filterQualifiedDrivers()`: Filtrerer chauffører
  - `formatNumber()`: Formaterer tal
  - `formatPercentage()`: Formaterer procenter

## Brugergrænseflade

### 1. Navigation
- **Tab 1:** Statistikker (eksisterende funktionalitet)
- **Tab 2:** Rapport Generator (ny funktionalitet)

### 2. Rapport Generator Flow
1. **Vælg Rapport Type**
   - Samlet, Gruppe eller Individuel
   - Visuel kort-baseret vælger

2. **Vælg Periode**
   - Måned/år fra tilgængelige data
   - Grid-baseret periodevælger

3. **Konfigurer Indstillinger**
   - Minimum kilometer krav
   - Chauffør/gruppe valg (hvis relevant)
   - Rapport format

4. **Generer og Vis**
   - Sammenfatning af konfiguration
   - Generering med loading indikator
   - Automatisk visning af resultat

### 3. Rapport Visning
- **Oversigt Tab:** Samlet statistik og top 3 chauffører
- **Rangering Tab:** Komplet rangeringstabel med forklaringer
- **Detaljer Tab:** Individuelle chaufførdata og nøgletal

## Database Integration

### 1. Tabeller
- **driver_data:** Hovedtabel med chaufførdata
- **Felter:** 73 felter inklusive administrative felter

### 2. Filtre
- **Måned/År:** Baseret på `month` og `year` felter
- **Minimum Kilometer:** Baseret på `driving_distance` felt
- **Chauffør:** Baseret på `driver_name` felt

### 3. Beregninger
- **Tidskonvertering:** "hh:mm:ss" til sekunder
- **Procentberegninger:** Alle nøgletal som procenter
- **Rangering:** Dynamisk sortering og placering

## Sikkerhed

### 1. Autentificering
- **Session tjek:** Alle API calls kræver gyldig session
- **Admin rettigheder:** Kun administratorer kan generere rapporter

### 2. Validering
- **Input validering:** Alle parametre valideres
- **Data validering:** Tjek for tilgængelige data
- **Fejlhåndtering:** Omfattende error handling

## Fremtidige Forbedringer

### 1. Word/PDF Generering
- **Nuværende:** JSON data returneres
- **Fremtid:** Faktisk filgenerering med biblioteker som:
  - `docx` for Word dokumenter
  - `puppeteer` for PDF generering

### 2. Email Integration
- **Funktionalitet:** Send rapporter direkte via email
- **Implementering:** SMTP integration med Supabase

### 3. Avancerede Filtre
- **Gruppe management:** Database-baseret grupper
- **Tidsperioder:** Fleksible datointervaller
- **Køretøjstyper:** Filtrering på køretøjsdata

### 4. Eksport Muligheder
- **CSV eksport:** Struktureret data eksport
- **Excel integration:** Direkte Excel filer
- **API integration:** Webhook support

## Fejlfinding

### 1. Almindelige Problemer

#### Ingen data fundet
- **Årsag:** Ingen chauffører opfylder minimum kilometer krav
- **Løsning:** Reducer minimum kilometer eller upload flere data

#### API fejl
- **Årsag:** Session udløbet eller manglende admin rettigheder
- **Løsning:** Log ind igen og tjek admin status

#### Beregningsfejl
- **Årsag:** Manglende eller ugyldige data
- **Løsning:** Tjek data kvalitet og formatering

### 2. Debugging
- **Console logs:** Alle funktioner logger detaljerede informationer
- **API responses:** Tjek network tab for fejl
- **State inspection:** React DevTools for komponent state

## Konfiguration

### 1. Miljøvariabler
```env
# Supabase konfiguration (allerede konfigureret)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Standard Indstillinger
- **Minimum kilometer:** 1000 km
- **Rapport format:** Word (.docx)
- **Sortering:** Nyeste perioder først

## Support

For spørgsmål eller problemer med rapportgenereringsfunktionaliteten, kontakt systemadministratoren eller se den tekniske dokumentation i kodebasen. 