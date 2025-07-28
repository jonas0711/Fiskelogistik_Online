# Rapport: Migration fra SMTP til Mailjet

## **PROBLEM BESKRIVELSE**

Jeres nuværende mail-system bruger SMTP via nodemailer, hvilket skaber følgende problemer på Vercel:

### **Nuværende SMTP-arkitektur:**
- **Mail Service**: `libs/mail-service.ts` med nodemailer transporter
- **Miljøvariabler**: `SMTP_SERVER`, `SMTP_PORT`, `EMAIL`, `APP_PASSWORD`, `TEST_EMAIL`
- **Database**: `mail_config` tabel som fallback til env-vars
- **Logging**: `mail_log` tabel for audit trail
- **Rate limiting**: Chunking i 5 mails ad gangen med 2 sek delay

### **Kritiske problemer:**
1. **Vercel SMTP-ustabilitet**: Socket timeouts og connection failures på serverless
2. **Reliability issues**: SMTP-forbindelser kan droppes under load
3. **Rate limiting kompleksitet**: Nuværende system har brug for manuel chunking
4. **Maintenance overhead**: SMTP kræver infrastruktur-maintenance

## **MAILJET MIGRATION LØSNING**

### **Nye miljøvariabler (allerede sat):**
```
MJ_APIKEY_PUBLIC     = [sat i Vercel]
MJ_APIKEY_PRIVATE    = [sat i Vercel] 
MJ_SENDER_EMAIL      = [sat i Vercel]
MJ_SENDER_NAME       = [sat i Vercel]
```

### **Fordele ved Mailjet:**
- **HTTP REST API**: Stabilt på Vercel serverless
- **Built-in rate limiting**: 200 mails/dag, 6000/måned
- **15 MB attachments**: Perfekt til PDF-rapporter
- **Simplified sending**: Færre konfigurationer og fejlpunkter

## **TEKNISK MIGRATION PLAN**

### **1. Ændringer i `libs/mail-service.ts`:**

**Fjern SMTP-kode:**
- Nodemailer transporter
- SMTP connection handling
- SSL/TLS port logik
- Retry/timeout mekanismer

**Implementer Mailjet:**
- HTTP POST til Mailjet v3.1 API
- API nøgle autentificering
- JSON payload med HTML + attachments
- Built-in error handling

### **2. Mail-konfiguration håndtering:**

**Environment variable prioritering:**
- Mailjet vars har prioritet over SMTP vars
- Behold fallback til database hvis nødvendigt
- Opdater validering til Mailjet format

### **3. PDF-integration (beholdes uændret):**

**Browserless integration:**
- `libs/puppeteer-service.ts` forbliver identisk
- PDF Buffer passes direkte til Mailjet
- Rate limits håndteres samme måde

### **4. API endpoint ændringer:**

**`/api/rio/mail/send-report/route.ts`:**
- Samme interface og funktionalitet
- Rate limiting kan forenkles (Mailjet håndterer det)
- Fejlhåndtering opdateres til HTTP errors

### **5. Database strukturer:**

**Behold eksisterende:**
- `mail_config` tabel (fallback)
- `mail_log` tabel (audit trail)
- `driver_emails` tabel (uændret)

### **6. Admin interface opdateringer:**

**`components/MailConfigCard.tsx`:**
- Tilføj Mailjet status visning
- Behold SMTP fallback visning
- Test-mail funktionalitet opdateres

## **IMPLEMENTATION STEPS**

### **Phase 1: Core Mail Service**
1. **Opdater `libs/mail-service.ts`:**
   - Tilføj Mailjet HTTP client
   - Implementer `sendMailViaMailjet()`
   - Behold SMTP som fallback

### **Phase 2: Integration**
2. **Test og validering:**
   - Opdater test script til Mailjet
   - Verificer PDF attachment handling
   - Test rate limiting

### **Phase 3: Deployment**
3. **Graduel udrulning:**
   - Deploy med feature flag
   - Monitor mail delivery
   - Fjern SMTP-kode når stabilt

### **Phase 4: Cleanup**
4. **Code cleanup:**
   - Fjern nodemailer dependency
   - Rens SMTP miljøvariabler
   - Opdater dokumentation

## **BEVAREDE FUNKTIONALITETER**

### **Samme mail-indhold:**
- HTML templates bevares identisk
- PDF attachments samme format
- Subject lines og styling
- Sender information

### **Rate limiting:**
- Chunking kan fjernes eller forenkles
- Mailjet håndterer daglige limits
- Fejlhåndtering forbedres

### **Logging og audit:**
- `mail_log` tabel beholdes
- Samme success/failure tracking
- Admin interface opdateres minimalt

## **TESTING STRATEGI**

### **1. Test mail functionality:**
```bash
# Eksisterende test script opdateres
scripts/test-mail-system.js
```

### **2. PDF generation test:**
- Verificer Browserless + Mailjet integration
- Test 15 MB attachment grænse
- Validér PDF formatting

### **3. Bulk mail test:**
- Test 40 mails månedligt scenario
- Verificer rate limiting
- Monitor delivery success rates

## **RISIKO MITIGATION**

### **Rollback plan:**
- Behold SMTP-kode som fallback
- Feature flag til at skifte mellem systemer
- Monitor delivery rates første uger

### **Data integritet:**
- Samme logging struktur
- Backup af alle mail templates
- Test data migration scripts

## **POST-MIGRATION FORDELE**

1. **Øget stabilitet**: HTTP > SMTP på serverless
2. **Mindre kompleksitet**: Færre konfigurationer
3. **Bedre monitoring**: Mailjet dashboard + logs
4. **Fremtidssikring**: Skalerbar til større volumes
5. **Lavere maintenance**: Ingen SMTP server management

## **UDVIKLINGSOPGAVE SCOPE**

**Estimeret arbejde: 4-6 timer**

### **Kritiske filer der skal ændres:**
- `libs/mail-service.ts` (main changes)
- `components/MailConfigCard.tsx` (UI updates)  
- `scripts/test-mail-system.js` (testing)
- `README.md` (documentation)

### **Testing og deployment:**
- Local testing med nye env vars
- Staging deployment validation
- Production rollout med monitoring

**Alle eksisterende interfaces, mail-indhold og PDF-generering forbliver 100% identiske for brugerne.**