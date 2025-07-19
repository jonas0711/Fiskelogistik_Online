# Admin Invitation System Setup Guide

## Oversigt

Dette system giver admins mulighed for at invitere nye brugere direkte fra appen i stedet for at skulle bruge Supabase dashboardet. Systemet er bygget med sikkerhed i fokus og bruger Supabase Admin API til at sende invitationer.

## Funktioner

- ✅ Admin rolle system med metadata
- ✅ Sikker invitation API endpoint
- ✅ Admin dashboard med invitation formular
- ✅ Accept-invite side til nye brugere
- ✅ Token-baseret autorisation
- ✅ Detaljeret logging og fejlhåndtering

## Opsætning

### 1. Miljøvariabler

Sørg for at følgende miljøvariabler er sat i `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=din_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=din_anon_key
SUPABASE_SERVICE_ROLE_KEY=din_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Sæt admin rolle på en bruger

For at en bruger kan sende invitationer, skal de have admin rolle. Du kan gøre dette på to måder:

#### Metode A: Via Supabase Dashboard
1. Gå til Supabase Dashboard → Authentication → Users
2. Find brugeren du vil gøre til admin
3. Klik på brugeren og gå til "User Management"
4. Under "User Metadata" tilføj:
   ```json
   {
     "role": "admin",
     "is_admin": true
   }
   ```

#### Metode B: Via kode (udvikling)
Du kan bruge hjælpefunktionen i `libs/setup-admin.ts`:

```typescript
import { setUserAsAdminByEmail } from './libs/setup-admin';

// Sæt admin rolle på en bruger
await setUserAsAdminByEmail('admin@eksempel.dk');
```

### 3. Test systemet

1. Start udviklingsserveren:
   ```bash
   npm run dev
   ```

2. Log ind med en admin bruger

3. Gå til `/admin` for at se admin dashboard

4. Brug invitation formular til at sende invitationer

## Sådan fungerer det

### 1. Admin sender invitation
- Admin går til `/admin` siden
- Udfylder invitation formular med email, navn og rolle
- System validerer admin token
- Supabase Admin API sender invitation email

### 2. Bruger accepterer invitation
- Bruger modtager email med invitation link
- Klikker på linket og kommer til `/auth/accept-invite`
- Sætter deres første password
- Bliver automatisk logget ind og omdirigeret til dashboard

### 3. Sikkerhed
- Kun admins kan sende invitationer
- Service role key bruges kun på serveren
- Token validering på alle admin endpoints
- RLS (Row Level Security) er aktivt

## API Endpoints

### POST /api/auth/invite
Sender invitation til ny bruger.

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body:**
```json
{
  "email": "ny@bruger.dk",
  "full_name": "Ny Bruger",
  "role": "user",
  "message": "Velkommen til systemet!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invitation sendt succesfuldt",
  "data": {
    "invitation_id": "uuid",
    "email": "ny@bruger.dk",
    "expires_at": "2024-01-01T00:00:00Z"
  }
}
```

## Filer og struktur

```
libs/
├── admin.ts              # Admin funktioner og middleware
├── setup-admin.ts        # Hjælpefunktioner til admin opsætning
└── db.ts                 # Database forbindelser

app/
├── api/auth/invite/
│   └── route.ts          # Invitation API endpoint
├── admin/
│   └── page.tsx          # Admin dashboard side
├── auth/accept-invite/
│   └── page.tsx          # Accept invitation side
└── dashboard/
    └── page.tsx          # Opdateret dashboard med admin links

components/
└── InviteUserForm.tsx    # Invitation formular komponent
```

## Fejlfinding

### "Du skal være admin for at sende invitationer"
- Tjek om brugeren har admin rolle i user_metadata
- Brug `isUserAdminByEmail()` funktionen til at verificere

### "Ugyldig invitation link"
- Tjek om invitation linket er korrekt
- Verificer at redirectTo URL er korrekt i Supabase

### "Bruger eksisterer allerede"
- Tjek om email adressen allerede er registreret
- Brug `listAllUsers()` funktionen til at se alle brugere

## Sikkerhedsnoter

1. **Service Role Key**: Aldrig eksponer service role key i frontend
2. **Token Validering**: Altid valider admin token på server-side
3. **RLS**: Hold Row Level Security aktivt på alle tabeller
4. **Logging**: Log alle admin handlinger for audit trail
5. **Rate Limiting**: Overvej at implementere rate limiting på invitation API

## Udvidelser

Systemet kan udvides med:
- Invitation historik og statistikker
- Bulk invitation funktionalitet
- Custom invitation templates
- Invitation udløbsdatoer
- Email notifikationer til admins 