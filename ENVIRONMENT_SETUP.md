# Environment Variables Setup Guide

**Dato:** 23. juli 2025  
**Projekt:** FSK Online Dashboard  
**Formål:** Korrekt opsætning af environment variabler for invitation system

---

## Problem

Invitation links bruger localhost i stedet for den rigtige produktions-URL. Dette skyldes, at environment variablerne ikke er sat korrekt.

---

## Løsning

### 1. **Lokal Development (.env.local)**

Opret en `.env.local` fil i projektets rod mappe:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App Configuration (KRITISK for invitation links)
NEXT_PUBLIC_APP_URL=https://fiskelogistik-online.vercel.app

# Security Configuration
WHITELISTED_EMAILS=admin@fiskelogistikgruppen.dk,user1@fiskelogistikgruppen.dk

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

### 2. **Vercel Production Environment Variables**

Gå til [Vercel Dashboard](https://vercel.com/dashboard) og følg disse trin:

1. **Vælg dit projekt:** `fiskelogistik-online`
2. **Gå til Settings:** Klik på "Settings" tab
3. **Environment Variables:** Klik på "Environment Variables" sektion
4. **Tilføj variabler:** Klik på "Add New" for hver variabel

#### **KRITISKE VARIABLER:**

```bash
# App URL (MEST KRITISK)
NEXT_PUBLIC_APP_URL=https://fiskelogistik-online.vercel.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security
WHITELISTED_EMAILS=admin@fiskelogistikgruppen.dk,user1@fiskelogistikgruppen.dk

# Mail System
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL=your-email@gmail.com
TEST_EMAIL=test@example.com
APP_PASSWORD=your-app-password

# Browserless
BROWSERLESS_TOKEN=your-browserless-token
PUPPETEER_SERVICE_PROVIDER=browserless
PDF_GENERATION_STRATEGY=browserless
```

### 3. **Verificer Environment Variables**

Efter du har sat variablerne op:

1. **Redeploy projektet:**
   - Gå til Vercel Dashboard
   - Klik på "Deployments"
   - Find den seneste deployment
   - Klik "Redeploy"

2. **Test invitation system:**
   - Log ind som admin
   - Gå til `/admin` siden
   - Send en test invitation
   - Tjek at linket bruger den korrekte URL

---

## Test Steps

### 1. **Lokal Test**
```bash
# Start development server
npm run dev

# Åbn browser og gå til http://localhost:3000
# Log ind som admin
# Send test invitation
# Tjek console logs for URL debugging
```

### 2. **Production Test**
1. Gå til: https://fiskelogistik-online.vercel.app
2. Log ind som admin
3. Gå til `/admin` siden
4. Send test invitation
5. Tjek email for korrekt URL

### 3. **Debug Logs**
Tjek browser console for følgende logs:
```
🔧 getAppUrl() kaldt med request: true
📡 Request headers: { host: "...", protocol: "https", ... }
✅ URL bestemt fra request: https://fiskelogistik-online.vercel.app
🌐 Base URL bestemt: https://fiskelogistik-online.vercel.app
🔗 Redirect URL med invitation data: https://fiskelogistik-online.vercel.app/auth/accept-invite?email=...
```

---

## Troubleshooting

### Problem: Invitation links bruger stadig localhost
**Løsning:**
1. Verificer at `NEXT_PUBLIC_APP_URL` er sat korrekt i Vercel
2. Redeploy projektet efter environment variable ændringer
3. Clear browser cache og test igen

### Problem: Environment variables vises ikke
**Løsning:**
1. Tjek at variablerne er sat for "Production" environment
2. Verificer at der ikke er stavefejl i variabelnavne
3. Redeploy projektet

### Problem: Debug logs viser ikke korrekt URL
**Løsning:**
1. Tjek at alle environment variables er sat
2. Verificer at deployment er færdig
3. Tjek browser console for fejl

---

## Konklusion

**Status:** ✅ **KLAR TIL IMPLEMENTERING**

**Nøglepunkter:**
1. **NEXT_PUBLIC_APP_URL** er den mest kritiske variabel
2. **Redeploy** er nødvendig efter environment variable ændringer
3. **Debug logging** hjælper med fejlfinding
4. **Test lokalt først** før production deployment

**Næste skridt:**
1. Sæt environment variables i Vercel
2. Redeploy projektet
3. Test invitation system
4. Verificer at alle links virker korrekt 