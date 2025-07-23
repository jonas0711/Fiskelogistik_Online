# Deployment Guide: Login Loop Fix

## Oversigt

Dette dokument beskriver hvordan login loop fix'et deployes til production på Vercel.

## Ændringer der skal deployes

### 1. Login API (`app/api/auth/login/route.ts`)
- **Ændring:** Server-side redirect i stedet for JSON response ved succesfuld login
- **Formål:** Løser cookie timing race condition
- **Status:** ✅ Implementeret

### 2. LoginForm (`components/LoginForm.tsx`)
- **Ændring:** Håndterer server-side redirect i stedet for client-side
- **Formål:** Følger server redirect automatisk
- **Status:** ✅ Implementeret

## Deployment Steps

### 1. Forberedelse
```bash
# Sørg for at alle ændringer er committed
git add .
git commit -m "fix: implement server-side redirect for login to solve cookie timing race condition"

# Push til GitHub
git push origin main
```

### 2. Vercel Deployment
1. Gå til [Vercel Dashboard](https://vercel.com/dashboard)
2. Vælg `fiskelogistik-online` projektet
3. Deployment starter automatisk når du pusher til `main` branch
4. Overvåg deployment processen

### 3. Verificer Miljøvariabler
Sørg for at følgende variabler er korrekt sat på Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=https://fiskelogistik-online.vercel.app
```

## Test efter Deployment

### 1. Production Test
1. Gå til https://fiskelogistik-online.vercel.app
2. Test login med korrekte credentials
3. Verificer at du bliver redirected til `/rio` uden loop
4. Test login med forkerte credentials (skal vise fejl)
5. Test direkte adgang til `/rio` uden login (skal redirect til `/`)

### 2. Browser Network Tab
Ved succesfuld login skal du se:
1. POST request til `/api/auth/login` med status 302
2. Location header med `/rio`
3. Set-Cookie headers med session data
4. Automatisk redirect til `/rio`

### 3. Console Logs
Tjek browser console for følgende logs:
```
✅ Login succesfuldt for: user@example.com
🍪 Sætter session cookies på redirect response...
✅ Session cookies sat på redirect response
🔄 Returnerer server-side redirect til /rio
```

## Rollback Plan

Hvis der opstår problemer efter deployment:

### 1. Hurtig Rollback
```bash
# Revert til tidligere commit
git revert HEAD
git push origin main
```

### 2. Manuel Rollback
Hvis automatisk rollback ikke virker:
1. Gå til Vercel Dashboard
2. Find tidligere deployment
3. Klik "Redeploy" på den tidligere version

## Monitoring

### 1. Vercel Analytics
- Overvåg error rates
- Tjek response times
- Se bruger flows

### 2. Supabase Dashboard
- Overvåg authentication logs
- Tjek for failed login attempts
- Se session data

### 3. Browser Console
- Overvåg client-side errors
- Tjek network requests
- Se redirect flows

## Success Kriterier

Deployment er succesfuldt hvis:

1. ✅ Login virker uden loop
2. ✅ Error handling fungerer korrekt
3. ✅ Middleware protection er intakt
4. ✅ Cookies sættes korrekt
5. ✅ Redirect flow er smooth
6. ✅ Ingen console errors
7. ✅ Alle miljøvariabler er korrekte

## Troubleshooting

### Problem: Login loop fortsætter
**Løsning:** Tjek at miljøvariablerne er korrekte på Vercel

### Problem: Cookies sættes ikke
**Løsning:** Verificer at `NEXT_PUBLIC_APP_URL` er sat korrekt

### Problem: Middleware blokerer login
**Løsning:** Tjek at `/api/auth/login` er i PUBLIC_ROUTES

### Problem: Redirect virker ikke
**Løsning:** Verificer at `redirect: 'follow'` er sat i fetch request

## Kontakt

Hvis der opstår problemer:
1. Tjek console logs først
2. Se Vercel deployment logs
3. Kontroller Supabase authentication logs
4. Test lokalt først

## Konklusion

Login loop fix'et er designet til at være robust og sikker. Server-side redirect løsningen eliminerer timing problemer og følger web standards. Deployment skulle være problemfrit og give øjeblikkelig forbedring af brugeroplevelsen. 