# 🔐 Sikkerheds Brugerguide - Fiskelogistikgruppen Platform

**Dato:** 23. juli 2025  
**Version:** 1.0  
**For:** Udviklere og Systemadministratorer  

---

## 📋 **Oversigt**

Denne guide forklarer hvordan man bruger de implementerede sikkerhedskomponenter i Fiskelogistikgruppen platformen. Platformen bruger nu en **defense-in-depth** strategi med 5 sikkerhedslag for at beskytte mod uautoriseret adgang.

---

## 🛡️ **Lag 1: Middleware (Automatisk)**

### **Hvad det gør:**
- ✅ **Automatisk beskyttelse** - Alle ruter beskyttet uden ekstra kode
- ✅ **Edge-niveau validering** - Hurtig responstid på CDN-edge
- ✅ **Bearer token support** - Validerer Authorization headers
- ✅ **Session fallback** - Fallback til cookie-baseret authentication
- ✅ **Automatisk redirect** - Uautoriserede brugere sendes til login

### **Hvordan det virker:**
Middleware kører automatisk for alle requests og:
1. Tjekker om ruten er offentlig (login, auth endpoints)
2. Validerer Bearer token hvis tilgængelig
3. Validerer session cookies som fallback
4. Redirecter uautoriserede brugere til login

### **Ingen ekstra kode nødvendig:**
```typescript
// Middleware kører automatisk - ingen ændringer nødvendige
export default function MyPage() {
  return <div>Denne side er automatisk beskyttet</div>;
}
```

---

## 🛡️ **Lag 2: API Authentication (Eksisterende)**

### **Hvad det gør:**
- ✅ **Server-niveau beskyttelse** - Alle API endpoints kræver authentication
- ✅ **Admin authorization** - Role-based access control
- ✅ **Standardiserede responses** - Consistent error handling

### **Hvordan man bruger det:**

#### **For almindelige API routes:**
```typescript
import { withAuth, createSuccessResponse } from '../../../libs/server-auth';

export async function POST(request: NextRequest) {
  return withAuth(request, async (request, user) => {
    // Din API logik her
    const data = await processRequest(request);
    return createSuccessResponse(data, 'Handling fuldført');
  });
}
```

#### **For admin-only API routes:**
```typescript
import { withAdminAuth, createSuccessResponse } from '../../../libs/server-auth';

export async function POST(request: NextRequest) {
  return withAdminAuth(request, async (request, user) => {
    // Kun admin brugere kan nå her
    const data = await processAdminRequest(request);
    return createSuccessResponse(data, 'Admin handling fuldført');
  });
}
```

---

## 🛡️ **Lag 3: Component Guards (Ny)**

### **Hvad det gør:**
- ✅ **Rendering-niveau beskyttelse** - UI komponenter kun for autoriserede brugere
- ✅ **Server-side validering** - Sikker validering der ikke kan omgås
- ✅ **Loading states** - User-friendly feedback
- ✅ **Automatisk redirect** - Uautoriserede brugere sendes væk

### **Hvordan man bruger det:**

#### **For almindelige bruger sider:**
```typescript
import { UserGuard } from '../components/AuthGuard';

export default function MyPage() {
  return (
    <UserGuard>
      <div>Denne side er kun for autentificerede brugere</div>
    </UserGuard>
  );
}
```

#### **For admin-only sider:**
```typescript
import { AdminGuard } from '../components/AuthGuard';

export default function AdminPage() {
  return (
    <AdminGuard>
      <div>Denne side er kun for administratorer</div>
    </AdminGuard>
  );
}
```

#### **Med custom fallback UI:**
```typescript
import { AuthGuard } from '../components/AuthGuard';

export default function ProtectedPage() {
  return (
    <AuthGuard 
      requireAdmin={true}
      redirectTo="/rio"
      fallback={
        <div className="text-center p-8">
          <h1>Adgang nægtet</h1>
          <p>Du har ikke rettigheder til denne side</p>
        </div>
      }
    >
      <div>Beskyttet indhold</div>
    </AuthGuard>
  );
}
```

#### **Custom authentication logik:**
```typescript
import AuthGuard from '../components/AuthGuard';

export default function CustomPage() {
  return (
    <AuthGuard 
      requireAdmin={false}
      redirectTo="/custom-login"
    >
      <div>Custom beskyttet indhold</div>
    </AuthGuard>
  );
}
```

---

## 🛡️ **Lag 4: Database RLS (Eksisterende)**

### **Hvad det gør:**
- ✅ **Database-niveau beskyttelse** - Sidste forsvarslinje
- ✅ **Automatisk datafiltrering** - Brugere kan kun se deres egen data
- ✅ **Owner-baseret adgang** - Baseret på bruger-ID
- ✅ **Audit trail** - Automatisk logging

### **Hvordan det virker:**
RLS policies kører automatisk og filtrerer data baseret på den autentificerede bruger. Ingen ekstra kode nødvendig.

---

## 🛡️ **Lag 5: SEO Protection (Automatisk)**

### **Hvad det gør:**
- ✅ **Robots.txt** - Forbyder søgemaskineindeksering
- ✅ **Meta tags** - `noindex, nofollow` på alle sider
- ✅ **Crawl-delay** - Reducerer serverbelastning

### **Hvordan det virker:**
SEO beskyttelse kører automatisk via `robots.txt` og meta tags i `layout.tsx`.

---

## 🧪 **Testing**

### **Test Middleware:**
```bash
# Kør middleware test script
node test-middleware.js
```

### **Test Component Guards:**
```typescript
// Test AuthGuard komponent
import { render, screen } from '@testing-library/react';
import AuthGuard from '../components/AuthGuard';

test('AuthGuard viser loading state', () => {
  render(<AuthGuard><div>Content</div></AuthGuard>);
  expect(screen.getByText('Validerer adgang...')).toBeInTheDocument();
});
```

### **Test API Authentication:**
```bash
# Test uden authentication
curl -X GET http://localhost:3000/api/rio/upload
# Forventet: 401 UNAUTHORIZED

# Test med ugyldig token
curl -X GET http://localhost:3000/api/rio/upload \
  -H "Authorization: Bearer invalid_token"
# Forventet: 401 UNAUTHORIZED
```

---

## 🔧 **Konfiguration**

### **Environment Variables:**
```bash
# Krævet for middleware
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Krævet for authentication
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### **Middleware Konfiguration:**
```typescript
// middleware.ts - Tilføj nye offentlige ruter her
const PUBLIC_ROUTES = [
  '/',                    // Login side
  '/api/auth/login',      // Login API
  '/api/auth/invite',     // Invite API
  '/api/auth/set-password', // Password setup API
  '/api/auth/session',    // Session API
  '/setup-admin',         // Admin setup side
  '/test-admin',          // Test admin side
  '/test-driver-emails',  // Test driver emails side
  '/new-public-route',    // Tilføj nye offentlige ruter her
];
```

---

## 🚨 **Fejlhåndtering**

### **Almindelige Fejl:**

#### **401 UNAUTHORIZED:**
```typescript
// Bruger ikke autentificeret
if (response.status === 401) {
  // Redirect til login eller vis fejlmeddelelse
  router.push('/');
}
```

#### **403 FORBIDDEN:**
```typescript
// Bruger har ikke rettigheder
if (response.status === 403) {
  // Vis adgang nægtet meddelelse
  setError('Du har ikke rettigheder til denne handling');
}
```

#### **Session Timeout:**
```typescript
// Session er udløbet
if (error.message.includes('Refresh Token Not Found')) {
  // Logger bruger ud og redirecter til login
  await supabase.auth.signOut();
  router.push('/');
}
```

### **Debugging:**
```typescript
// Aktiver detaljeret logging
console.log('🔐 Authentication status:', isAuthenticated);
console.log('👤 Bruger roller:', userRoles);
console.log('🔍 Admin status:', isAdmin);
```

---

## 📊 **Monitoring**

### **Sikkerhedslogs:**
- ✅ **Failed authentication attempts** - Logges automatisk
- ✅ **Access patterns** - Overvåges for unormale mønstre
- ✅ **Error rates** - API error rates trackes
- ✅ **Performance metrics** - Middleware performance overvåges

### **Vedligeholdelse:**
- 🔄 **Månedlige reviews** - Gennemgang af access logs
- 🔄 **Kvartalsvise tests** - Penetration testing
- 🔄 **Årlige audits** - Omfattende sikkerhedsreview

---

## 🎯 **Best Practices**

### **For Udviklere:**
1. **Brug altid AuthGuard** for beskyttede sider
2. **Brug withAuth/withAdminAuth** for API routes
3. **Test authentication flows** regelmæssigt
4. **Log sikkerhedsrelaterede events** for debugging

### **For Systemadministratorer:**
1. **Overvåg access logs** regelmæssigt
2. **Opdater whitelist** når nye medarbejdere tilføjes
3. **Gennemfør sikkerhedstest** kvartalsvist
4. **Backup sikkerhedskonfiguration** regelmæssigt

### **For Sikkerhed:**
1. **Implementer MFA** når organisationen vokser
2. **Overvej IP whitelisting** for ekstra sikkerhed
3. **Planlæg penetration tests** regelmæssigt
4. **Hold sikkerhedsdokumentation** opdateret

---

## 📞 **Support**

### **Hvis noget ikke virker:**
1. **Tjek console logs** for fejlmeddelelser
2. **Verificer environment variables** er korrekte
3. **Test middleware** med test scriptet
4. **Kontakt system administrator** hvis problemer fortsætter

### **Nødkontakt:**
- **System Administrator:** [Kontaktoplysninger]
- **Sikkerhedsteam:** [Kontaktoplysninger]
- **Teknisk Support:** [Kontaktoplysninger]

---

## 📋 **Checklist**

### **For Nye Sider:**
- [ ] Wrapped med AuthGuard/AdminGuard
- [ ] Testet uden authentication
- [ ] Testet med ugyldig token
- [ ] Testet med gyldig authentication
- [ ] Error handling implementeret

### **For Nye API Routes:**
- [ ] Bruger withAuth/withAdminAuth
- [ ] Testet uden authentication
- [ ] Testet med ugyldig token
- [ ] Testet med gyldig authentication
- [ ] Standardiserede responses

### **For Deployment:**
- [ ] Environment variables sat
- [ ] Middleware testet
- [ ] Component guards testet
- [ ] API authentication testet
- [ ] SEO protection verificeret

---

**🔒 Platformen er nu fuldt sikret med enterprise-niveau beskyttelse!** 