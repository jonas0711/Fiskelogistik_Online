# FSK Online Dashboard

## Projektbeskrivelse
En privat web-app bygget med Next.js 14, TypeScript, Tailwind CSS og ShadCN/UI. Kun ejeren kan logge ind.

## Teknologier
- **Frontend**: Next.js 14 App Router med TypeScript
- **Styling**: Tailwind CSS med ShadCN/UI komponenter
- **Database**: Supabase (Free tier)
- **Hosting**: Vercel (Hobby plan)
- **Authentication**: Supabase Auth med whitelisted emails

## Mappestruktur

```
fsk-online/
├── app/                    # Next.js App Router
│   ├── api/               # API endpoints (Dit Maskinrum)
│   │   ├── auth/          # Authentication endpoints
│   │   │   └── login/     # Login route
│   │   └── posts/         # Posts endpoints
│   │       └── create/    # Create post route
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Homepage
├── components/            # Genanvendelige UI-komponenter (Din Lego-kasse)
├── libs/                  # Hjælpefunktioner og services (Din Værktøjskasse)
├── models/                # Database modeller (Dine Data-Blåtryk)
├── public/                # Statiske filer
└── src/                   # Source files
    └── lib/               # Utility functions
```

## Installation og Setup

### Lokal udvikling
```bash
# Installer dependencies
npm install

# Start udviklingsserver
npm run dev

# Åbn http://localhost:3000 i din browser
```

### Miljøvariabler
Opret en `.env.local` fil i roden med følgende variabler:
```env
NEXT_PUBLIC_SUPABASE_URL=din_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=din_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=din_service_role_key
```

## Scripts
- `npm run dev` - Start udviklingsserver
- `npm run build` - Build til production
- `npm run start` - Start production server
- `npm run lint` - Kør ESLint
- `npm run type-check` - TypeScript type checking

## Sikkerhed
- Authentication kun via whitelisted emails
- Row Level Security (RLS) aktivt på alle tabeller
- Alle API keys gemt i miljøvariabler
- Ingen hard-delete, bruger `deleted_at` timestamp
- JSON response + client-side redirect for login (løser cookie timing race condition på Vercel)

## Nylige Fixes
- **Login Loop Fix**: Løst cookie timing race condition på Vercel deployment
  - Se `LOGIN_LOOP_FIX.md` for detaljeret dokumentation
  - Implementeret JSON response i stedet for server-side redirect
  - Client-side redirect med timing for cookie-stabilitet
  - Eliminerer timing problemer mellem login API og middleware på edge-netværk

### Login Flow (Ny Implementering)
1. **Frontend**: Bruger indtaster credentials
2. **API**: `/api/auth/login` returnerer JSON response med success status
3. **Cookies**: Supabase SSR client sætter authentication cookies
4. **Frontend**: Modtager JSON og venter 200ms for cookie-stabilitet
5. **Redirect**: Client-side redirect til `/rio` med `window.location.href`
6. **Middleware**: Finder gyldige cookies og tillader adgang

## Database Regler
- Snake_case navngivning
- Standard felter: `id`, `owner`, `created_at`
- Soft delete med `deleted_at` nullable timestamp
- Alle tabeller har RLS policies

## Git Workflow
- `main` branch er beskyttet
- Brug `feature/` branches for nye features
- Pull Request → Review → Squash merge
- Commit format: `feat:`, `fix:`, `chore:`

## Konti og Adgang
- **GitHub**: Privat repo `jonas-dashboard`
- **Vercel**: Brug Vercel organisation
- **Supabase**: Projekt i Supabase org

## Test og Kvalitet
- ESLint: Ingen warnings
- Vitest + React Testing Library: 80% coverage
- Playwright E2E tests
- Lighthouse CI: ≥90 accessibility score

## Troubleshooting

### Login Loop Problem
Hvis du oplever login loop på Vercel deployment:
1. Verificer at alle miljøvariabler er sat korrekt
2. Tjek browser console for fejl
3. Kør `node scripts/test-login-fix.js` for at teste login flow
4. Se `LOGIN_LOOP_FIX.md` for detaljerede løsninger
