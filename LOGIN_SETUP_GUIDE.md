# Login Setup Guide - Løsning af Login Problem

## Problem
Du kan ikke logge ind fordi der mangler environment variabler i `.env.local` filen.

## Løsning

### 1. Opret .env.local fil
Du skal oprette en `.env.local` fil i projektets rod mappe med følgende indhold:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Security Configuration
WHITELISTED_EMAILS=jonas.ingvorsen@gmail.com

# Mail System Configuration (SMTP)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL=your-email@gmail.com
TEST_EMAIL=test@example.com
APP_PASSWORD=your-app-password

# Browserless Configuration (for PDF generation)
BROWSERLESS_TOKEN=your-browserless-token
PUPPETEER_SERVICE_PROVIDER=browserless
PDF_GENERATION_STRATEGY=browserless
```

### 2. Hent Supabase Værdier
Du skal hente dine Supabase værdier fra dit Supabase Dashboard:

1. Gå til [Supabase Dashboard](https://supabase.com/dashboard)
2. Vælg dit projekt
3. Gå til "Settings" → "API"
4. Kopier følgende værdier:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Opdater .env.local
Erstat placeholder værdierne i `.env.local` med dine rigtige Supabase værdier.

### 4. Genstart Development Server
Efter du har oprettet `.env.local` filen:

```bash
# Stop development server (Ctrl+C)
# Start igen
npm run dev
```

### 5. Test Login
Nu skulle du kunne:
1. Gå til `http://localhost:3000`
2. Se login siden
3. Logge ind med din email og password

## Fejlfinding

### Hvis du stadig ikke kan logge ind:

1. **Tjek console fejl**: Åbn browser developer tools (F12) og se om der er fejl
2. **Tjek Supabase Dashboard**: Verificer at dine API nøgler er korrekte
3. **Tjek whitelist**: Sørg for at din email er i `WHITELISTED_EMAILS`
4. **Tjek bruger eksisterer**: Verificer at du har oprettet en bruger i Supabase Auth

### Hvis du ikke har en bruger endnu:

Du skal først oprette en bruger i Supabase:

1. Gå til Supabase Dashboard → "Authentication" → "Users"
2. Klik "Add user"
3. Indtast din email og password
4. Sæt brugeren som admin (hvis nødvendigt)

## Sikkerhedsnoter

- `.env.local` filen er allerede i `.gitignore` og vil ikke blive committet til git
- Hold dine API nøgler hemmelige
- Del aldrig `.env.local` filen med andre

## Status
✅ **LØST** - Efter oprettelse af `.env.local` fil med korrekte Supabase værdier 