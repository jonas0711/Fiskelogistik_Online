# PDF Generering Setup Guide

## Oversigt

Dette projekt bruger en hybrid løsning for PDF generering:

- **Lokalt**: Puppeteer for fuld PDF funktionalitet
- **Vercel**: Intern API route med fallback til HTML

## Konfiguration

### 1. Miljøvariabler

Tilføj følgende til din `.env.local` fil:

```bash
# PDF Service (valgfrit - for ekstern PDF konvertering)
PDF_SERVICE_URL=https://api.html2pdf.app/v1/generate
PDF_SERVICE_API_KEY=din_api_key_her

# Vercel URL (sættes automatisk på Vercel)
VERCEL_URL=din_vercel_url.vercel.app
```

### 2. PDF Service Muligheder

#### Gratis Muligheder:
1. **HTML Fallback**: Systemet returnerer HTML filer som kan åbnes i browser
2. **Ekstern Service**: Brug en gratis HTML til PDF service

#### Betalte Muligheder:
1. **Puppeteer på Vercel**: Kræver Vercel Pro plan
2. **Dedikeret PDF Service**: F.eks. PDFShift, DocRaptor, etc.

### 3. Vercel Deployment

#### Automatisk Setup:
1. Push til GitHub
2. Vercel deployer automatisk
3. PDF generering virker med HTML fallback

#### Manuelt Setup:
1. Gå til Vercel Dashboard
2. Tilføj miljøvariabler under Settings > Environment Variables
3. Redeploy projektet

## Test af PDF Generering

### Lokalt Test:
```bash
npm run dev
# Gå til RIO > Reports og generer en rapport
```

### Vercel Test:
1. Deploy til Vercel
2. Test PDF generering via RIO systemet
3. Tjek logs for eventuelle fejl

## Troubleshooting

### Fejl: "PDF service API key ikke konfigureret"
- **Løsning**: Systemet bruger automatisk HTML fallback
- **Alternativ**: Konfigurer en PDF service API key

### Fejl: "Puppeteer fejler lokalt"
- **Løsning**: Kør `npm install` for at sikre dependencies
- **Alternativ**: Systemet fallback til Vercel metode

### Fejl: "Vercel timeout"
- **Løsning**: Tjek `vercel.json` for korrekte timeout indstillinger
- **Alternativ**: Reducer kompleksiteten af HTML

## Performance Optimering

### For Vercel:
- HTML fallback er hurtigst
- Ekstern PDF service kan være langsommere
- Puppeteer kræver Vercel Pro

### For Lokal Udvikling:
- Puppeteer giver bedste kvalitet
- Ingen timeout begrænsninger
- Fuldt kontrol over PDF output

## Næste Skridt

1. **Test lokalt**: Verificer at Puppeteer virker
2. **Deploy til Vercel**: Test HTML fallback
3. **Konfigurer PDF Service** (valgfrit): For bedre PDF kvalitet på Vercel
4. **Monitor Performance**: Tjek logs for fejl og performance

## Support

Hvis du oplever problemer:
1. Tjek console logs
2. Verificer miljøvariabler
3. Test både lokalt og på Vercel
4. Kontakt support hvis nødvendigt 