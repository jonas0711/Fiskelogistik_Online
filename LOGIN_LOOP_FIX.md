# Login Loop Fix - Vercel Deployment

## Problembeskrivelse

### Symptomer
- Uendeligt login-loop på Vercel deployment
- Bruger indtaster korrekte credentials
- Ser kort glimt af beskyttet side (/rio)
- Bliver omdirigeret tilbage til login-siden
- Gentager sig i uendelig løkke

### Teknisk Årsag
Problemet skyldes en **cookie timing race condition** på Vercel's edge-netværk:

1. **Server-side redirect (302)** sammen med **Set-Cookie headers**
2. **Edge-netværk timing**: Cookies bliver ikke sat korrekt før redirect
3. **Middleware afvisning**: Ingen gyldige session cookies fundet
4. **Loop**: Bruger redirectes tilbage til login

## Løsningsstrategi

### Fra Server-side til Client-side Redirect

**Gamle implementering (problem):**
```typescript
// API returnerer 302 redirect
return NextResponse.redirect(redirectUrl, 302);
```

**Ny implementering (løsning):**
```typescript
// API returnerer JSON response
return NextResponse.json({
  success: true,
  data: { redirectUrl: '/rio' }
});
```

## Implementeringsdetaljer

### 1. Login API Endpoint (`app/api/auth/login/route.ts`)

**Ændringer:**
- Returnerer JSON response i stedet for 302 redirect
- Opretter response objekt FØRST
- Konfigurerer Supabase SSR client til at operere på response objektet
- Kopierer cookies fra Supabase response til JSON response

**Kode:**
```typescript
// LØSNING: Opret response objekt FØRST for at sikre cookie-håndtering
const response = NextResponse.json(
  {
    success: false,
    message: 'Login fejlede',
  } as ApiResponse,
  { status: 200 }
);

// Opret Supabase client med SSR cookie-håndtering
const supabase = createSupabaseClient(request, response);

// Efter succesfuld login
const successResponse = NextResponse.json(
  {
    success: true,
    message: 'Login succesfuldt',
    data: {
      redirectUrl: '/rio',
      user: { email: data.user?.email, id: data.user?.id }
    },
  } as ApiResponse,
  { status: 200 }
);

// Kopier cookies fra Supabase SSR response
response.cookies.getAll().forEach(cookie => {
  successResponse.cookies.set(cookie.name, cookie.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });
});
```

### 2. LoginForm Component (`components/LoginForm.tsx`)

**Ændringer:**
- Modtager JSON response i stedet for at følge redirect
- Implementerer client-side redirect med timing
- Bruger `redirect: 'manual'` for at undgå automatisk redirect

**Kode:**
```typescript
// LØSNING: Forbedret fetch med JSON response håndtering
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: formData.email, password: formData.password }),
  redirect: 'manual', // Vigtigt: Ikke følg redirect automatisk
  credentials: 'include',
});

// Parse JSON response
const result: LoginApiResponse = await response.json();

if (result.success) {
  // LØSNING: Client-side redirect med timing for cookie-stabilitet
  const redirectUrl = result.data?.redirectUrl || '/rio';
  
  // Vent kort for at sikre cookies er fuldt etableret
  setTimeout(() => {
    window.location.href = redirectUrl;
  }, 200); // Øget ventetid for bedre cookie-stabilitet
}
```

### 3. Middleware (`middleware.ts`)

**Ingen ændringer nødvendige:**
- Bruger allerede Supabase SSR korrekt
- Håndterer cookies korrekt
- Problemet var i login flow, ikke middleware

## Test og Verifikation

### Lokal Test
```bash
# Start udviklingsserver
npm run dev

# Kør test script
node scripts/test-login-fix.js
```

### Vercel Deployment Test
1. Deploy til Vercel
2. Test login flow
3. Verificer at cookies bliver sat korrekt
4. Tjek browser console for fejl

### Debug Headers
API'et returnerer debug headers for lettere fejlfinding:
- `X-Login-Success`: Indikerer succesfuld login
- `X-User-Email`: Bruger email
- `X-Cookie-Domain`: Cookie domain
- `X-Response-Type`: Response type (json)

## Forventede Resultater

### Efter Fix
1. **Login API**: Returnerer JSON med success status
2. **Cookies**: Sættes korrekt via Supabase SSR
3. **Frontend**: Modtager JSON og venter 200ms
4. **Redirect**: Client-side redirect til /rio
5. **Middleware**: Finder gyldige cookies og tillader adgang
6. **Resultat**: Ingen login loop

### Performance
- **Før**: Race condition mellem cookies og redirect
- **Efter**: Kontrolleret timing med client-side redirect
- **Impact**: Minimal - kun 200ms ekstra ventetid

## Troubleshooting

### Hvis problemet fortsætter

1. **Tjek miljøvariabler:**
   ```bash
   # Verificer at alle variabler er sat
   echo $NEXT_PUBLIC_SUPABASE_URL
   echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

2. **Browser console:**
   - Åbn Developer Tools
   - Tjek Console for fejl
   - Tjek Network tab for API calls

3. **Cookie inspection:**
   - Åbn Application tab i Developer Tools
   - Tjek Cookies under domain
   - Verificer at Supabase cookies er sat

4. **API test:**
   ```bash
   # Test login API direkte
   curl -X POST http://localhost:3000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test"}'
   ```

### Debug Steps
1. Kør `node scripts/test-login-fix.js`
2. Tjek response headers for `X-Response-Type: json`
3. Verificer at cookies bliver sat i response
4. Test client-side redirect timing

## Konklusion

Denne løsning eliminerer login-loop problemet ved at:
- Undgå server-side redirect race condition
- Implementere kontrolleret client-side redirect
- Sikre korrekt cookie timing
- Bevare alle sikkerhedsforanstaltninger

Løsningen følger Supabase's anbefalede praksis for SSR authentication på serverless platforme og er kompatibel med Vercel's edge-netværk. 