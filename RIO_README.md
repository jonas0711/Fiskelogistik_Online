# Fiskelogistik RIO Program

## Oversigt

RIO (Rapport og Indberetning Online) er et professionelt web-baseret system til Fiskelogistik Gruppen A/S, der giver mulighed for at uploade, administrere og analysere chaufførdata fra Excel-filer.

## Funktioner

### 🚀 Hovedfunktioner

1. **Upload af Data**
   - Upload Excel-filer med chaufførdata
   - Automatisk konvertering til database format
   - Validering af data integritet
   - Tilknytning af måned og år til alle records

2. **Chauffør Administration**
   - Oversigt over alle chauffører
   - Søgning og filtrering
   - Detaljerede chaufførstatistikker
   - Performance metrics

3. **Rapporter**
   - Generering af forskellige rapporttyper
   - PDF eksport (under udvikling)
   - Excel eksport (under udvikling)
   - Månedlige oversigter

4. **Key Performance Indicators (KPI)**
   - Effektivitets score
   - Sikkerheds score
   - Miljø score
   - Trends og udvikling

5. **System Indstillinger**
   - Konfiguration af system parametre
   - Data retention indstillinger
   - Backup og notifikationer
   - Administrative funktioner

### 🔧 Tekniske Funktioner

- **Sikkerhed**: Row Level Security (RLS) på alle tabeller
- **Autentificering**: Supabase Auth med invitation-baseret adgang
- **Admin Kontrol**: Kun administratorer kan uploade og administrere data
- **Responsivt Design**: Mobil-venligt interface
- **Dark Mode**: Understøttet via Tailwind CSS

## Database Struktur

### driver_data Tabel

Tabellen indeholder 73 felter i alt:

- **5 administrative felter**: id, month, year, created_at, updated_at
- **68 datafelter**: Alle kolonner fra Excel-filen

#### Vigtige Felter

| Felt | Type | Beskrivelse |
|------|------|-------------|
| `driver_name` | TEXT | Chaufførens navn |
| `vehicles` | TEXT | Køretøjs ID |
| `driving_distance` | NUMERIC | Kørestrækning i km |
| `avg_consumption_per_100km` | NUMERIC | Gns. forbrug l/100km |
| `avg_speed` | NUMERIC | Gns. hastighed km/h |
| `co2_emission` | NUMERIC | CO₂ udledning i kg |

## Installation og Setup

### Forudsætninger

- Node.js 18+
- Supabase projekt
- Vercel konto (til deployment)

### 1. Klon Repository

```bash
git clone <repository-url>
cd fsk-online
```

### 2. Installer Dependencies

```bash
npm install
```

### 3. Konfigurer Miljøvariabler

Opret en `.env.local` fil:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 4. Opret Database Tabel

Kør følgende i Supabase SQL Editor:

```sql
-- Opret driver_data tabel
CREATE TABLE IF NOT EXISTS driver_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Alle 68 datafelter fra Excel
  driver_name TEXT,
  vehicles TEXT,
  -- ... (se libs/create-driver-data-table.ts for komplet liste)
);

-- Aktiver RLS
ALTER TABLE driver_data ENABLE ROW LEVEL SECURITY;

-- Opret policies
CREATE POLICY "Users can view driver data" ON driver_data
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert driver data" ON driver_data
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE auth.users.id = auth.uid() 
      AND auth.users.raw_user_meta_data->>'is_admin' = 'true'
    )
  );
```

### 5. Start Udviklingsserver

```bash
npm run dev
```

## Brug af Systemet

### 1. Login

- Gå til `/` for at logge ind
- Kun inviterede brugere kan få adgang
- Administratorer kan invitere nye brugere

### 2. Upload af Data

1. Gå til **RIO Program** → **Upload af Data**
2. Vælg Excel-fil (.xlsx eller .xls)
3. Vælg måned og år for dataene
4. Klik **Upload Data**

### 3. Se Chaufførdata

1. Gå til **RIO Program** → **Chauffører**
2. Brug søgning og filtre til at finde specifikke data
3. Se statistikker og oversigter

### 4. Generer Rapporter

1. Gå til **RIO Program** → **Rapporter**
2. Vælg rapport type (Oversigt, Performance, Månedlig, Miljø)
3. Se genererede rapporter

### 5. KPI Oversigt

1. Gå til **RIO Program** → **Key Performance Indicators**
2. Se scores og trends
3. Analyser performance metrics

## Excel-fil Format

### Påkrævede Kolonner

Excel-filen skal indeholde følgende kolonner (i dansk):

1. Chauffør
2. Køretøjer
3. Forudseende kørsel (vurdering) [%]
4. Ø Forbrug [l/100km]
5. Kørestrækning [km]
6. Ø-hastighed [km/h]
7. CO₂-emission [kg]
8. ... (alle 68 kolonner fra data.md)

### Fil Krav

- **Format**: .xlsx eller .xls
- **Maksimal størrelse**: 10MB
- **Kodning**: UTF-8
- **Første række**: Kolonne overskrifter

## Sikkerhed

### Autentificering

- Supabase Auth med email/password
- Invitation-baseret adgang
- Session management

### Autorisering

- **Almindelige brugere**: Kan se data og generere rapporter
- **Administratorer**: Kan uploade data og administrere systemet

### Data Sikkerhed

- Row Level Security (RLS) på alle tabeller
- Kun autentificerede brugere kan læse data
- Kun administratorer kan skrive data
- Automatisk backup (konfigurerbar)

## API Endpoints

### Upload API

```
POST /api/rio/upload
Content-Type: multipart/form-data

Parameters:
- file: Excel fil
- month: Måned (1-12)
- year: År (2020-2030)
```

### Response

```json
{
  "success": true,
  "recordsProcessed": 25,
  "month": 7,
  "year": 2025,
  "message": "Succesfuldt importeret 25 chauffør records for 7/2025"
}
```

## Fejlfinding

### Almindelige Problemer

1. **Upload fejler**
   - Tjek fil format (.xlsx/.xls)
   - Tjek fil størrelse (max 10MB)
   - Tjek admin rettigheder

2. **Login problemer**
   - Tjek invitation status
   - Tjek email/password
   - Kontakt administrator

3. **Data vises ikke**
   - Tjek database forbindelse
   - Tjek RLS policies
   - Tjek bruger rettigheder

### Logs

Alle handlinger logges i browser console og server logs:

```javascript
console.log('📤 Upload started...');
console.log('✅ Data uploaded successfully');
console.log('❌ Upload failed:', error);
```

## Udvikling

### Projekt Struktur

```
app/
├── rio/                    # RIO program sider
│   ├── page.tsx           # Hovedside
│   ├── upload/page.tsx    # Upload side
│   ├── drivers/page.tsx   # Chauffører side
│   ├── reports/page.tsx   # Rapporter side
│   ├── kpi/page.tsx       # KPI side
│   └── settings/page.tsx  # Indstillinger side
├── api/
│   └── rio/
│       └── upload/        # Upload API
└── dashboard/page.tsx     # Dashboard med RIO link

components/
├── RIONavigation.tsx      # RIO navigation
├── DataUploadForm.tsx     # Upload form
└── ui/                    # ShadCN komponenter

libs/
├── create-driver-data-table.ts  # Database setup
├── db.ts                 # Supabase klient
└── admin.ts              # Admin funktioner
```

### Tilføj Nye Funktioner

1. **Opret ny side**:
   ```bash
   mkdir app/rio/new-feature
   touch app/rio/new-feature/page.tsx
   ```

2. **Tilføj til navigation**:
   - Opdater `components/RIONavigation.tsx`
   - Tilføj ny navigation item

3. **Opret API endpoint**:
   ```bash
   mkdir app/api/rio/new-feature
   touch app/api/rio/new-feature/route.ts
   ```

## Deployment

### Vercel Deployment

1. Push til GitHub
2. Forbind til Vercel
3. Sæt miljøvariabler
4. Deploy automatisk

### Miljøvariabler i Vercel

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

## Support

For support eller spørgsmål:

1. Tjek denne dokumentation
2. Se browser console for fejl
3. Kontakt system administrator
4. Åbn issue på GitHub

## Version Historie

### v1.0.0 (2025-07-19)
- Initial release
- Upload af Excel data
- Chauffør administration
- Rapporter og KPI
- System indstillinger
- Sikkerhed og autentificering

## Licens

Dette projekt er privat software til Fiskelogistik Gruppen A/S. 