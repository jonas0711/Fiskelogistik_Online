/**
 * Mail Service Library
 * Baseret på Python-applikationens mail_system.py og mail_handler.py
 * Håndterer Mailjet mail sending med HTTP API og email templates
 */

import { supabase, supabaseAdmin } from './db';
import { DriverData, calculateMetrics } from './report-utils';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

// Interface for Mailjet konfiguration
export interface MailjetConfig {
  api_key_public: string;      // Mailjet public API key
  api_key_private: string;     // Mailjet private API key
  sender_email: string;        // Afsender email
  sender_name: string;         // Afsender navn
  test_email?: string;         // Test email adresse
}

// Interface for mail request
export interface SendMailRequest {
  to: string;                  // Modtager email
  subject: string;             // Email emne
  htmlBody: string;            // HTML email indhold
  attachments?: EmailAttachment[]; // Vedhæftninger
  driverId?: string;           // Chauffør ID for logging
}

// Interface for email vedhæftning
export interface EmailAttachment {
  filename: string;            // Filnavn
  content: Buffer;             // Fil indhold som buffer
  contentType: string;         // MIME type
}

// Interface for rapport data til email - identisk med Python struktur
export interface ReportEmailData {
  statistik: {
    name: string;
    date: string;
    total_trips?: number;
    total_distance: number;
    total_time?: string;
    avg_trip_length?: number;
    avg_trip_time?: number;
    // Kritiske nøgletal - identisk med Python beregninger
    tomgangsprocent: number;    // Mål: Under 5%
    fartpilot_andel: number;    // Mål: Over 66,5%
    motorbremse_andel: number;  // Mål: Over 50%
    paalobsdrift_andel: number; // Mål: Over 7%
  };
  rapport?: Buffer;              // PDF/Word fil som buffer
}

// Interface for mail log entry
export interface MailLogEntry {
  driver_id: string;
  recipient_email: string;
  subject: string;
  status: 'sent' | 'failed' | 'pending';
  message?: string;
  sent_at?: string;
}

/**
 * Mail Service Class - kun Mailjet implementation
 */
export class MailService {
  private mailjetConfig: MailjetConfig | null = null;

  constructor() {
    console.log(`${LOG_PREFIXES.config} Initialiserer Mail Service (Mailjet only)...`);
  }

  /**
   * Henter Mailjet konfiguration fra miljøvariabler
   */
  private async getMailjetConfig(): Promise<MailjetConfig | null> {
    console.log(`${LOG_PREFIXES.search} Tjekker Mailjet konfiguration...`);
    
    const mjApiKeyPublic = process.env.MJ_APIKEY_PUBLIC;
    const mjApiKeyPrivate = process.env.MJ_APIKEY_PRIVATE;
    const mjSenderEmail = process.env.MJ_SENDER_EMAIL;
    const mjSenderName = process.env.MJ_SENDER_NAME;
    const envTestEmail = process.env.TEST_EMAIL;
    
    if (mjApiKeyPublic && mjApiKeyPrivate && mjSenderEmail && mjSenderName) {
      console.log(`${LOG_PREFIXES.success} Mailjet konfiguration fundet for: ${mjSenderEmail}`);
      
      const mailjetConfig: MailjetConfig = {
        api_key_public: mjApiKeyPublic,
        api_key_private: mjApiKeyPrivate,
        sender_email: mjSenderEmail,
        sender_name: mjSenderName,
        test_email: envTestEmail || undefined
      };
      
      this.mailjetConfig = mailjetConfig;
      return mailjetConfig;
    }
    
    console.log(`${LOG_PREFIXES.warning} Mailjet miljøvariabler ikke komplet sat`);
    return null;
  }

  /**
   * Sender mail via Mailjet HTTP API
   */
  private async sendMailViaMailjet(request: SendMailRequest): Promise<boolean> {
    console.log(`${LOG_PREFIXES.connection} Sender mail via Mailjet til ${request.to}...`);
    
    if (!this.mailjetConfig) {
      this.mailjetConfig = await this.getMailjetConfig();
      if (!this.mailjetConfig) {
        console.error(`${LOG_PREFIXES.error} Ingen Mailjet konfiguration tilgængelig`);
        return false;
      }
    }
    
    try {
      // Forbered Mailjet payload
      const payload = {
        Messages: [
          {
            From: {
              Email: this.mailjetConfig.sender_email,
              Name: this.mailjetConfig.sender_name
            },
            To: [
              {
                Email: request.to
              }
            ],
            Subject: request.subject,
            HTMLPart: request.htmlBody,
            Attachments: request.attachments?.map(att => ({
              ContentType: att.contentType,
              Filename: att.filename,
              Base64Content: att.content.toString('base64')
            })) || []
          }
        ]
      };
      
      // Send HTTP request til Mailjet
      const response = await fetch('https://api.mailjet.com/v3.1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(
            `${this.mailjetConfig.api_key_public}:${this.mailjetConfig.api_key_private}`
          ).toString('base64')}`
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Mailjet API fejl: ${response.status} - ${errorData}`);
      }
      
      const result = await response.json();
      const messageResult = result.Messages?.[0];
      
      if (messageResult?.Status === 'success') {
        console.log(`${LOG_PREFIXES.success} Mail sendt via Mailjet til ${request.to}, Message ID: ${messageResult.To?.[0]?.MessageID}`);
        return true;
      } else {
        console.error(`${LOG_PREFIXES.error} Mailjet besked fejlede:`, messageResult);
        return false;
      }
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Mailjet HTTP fejl:`, error);
      return false;
    }
  }

  /**
   * Logger mail afsendelse i database
   */
  private async logMailSent(entry: MailLogEntry): Promise<void> {
    console.log(`${LOG_PREFIXES.form} Logger mail afsendelse for ${entry.driver_id}...`);
    
    try {
      const { error } = await supabaseAdmin
        .from('mail_log')
        .insert({
          driver_id: entry.driver_id,
          recipient_email: entry.recipient_email,
          subject: entry.subject,
          status: entry.status,
          message: entry.message,
          sent_at: entry.status === 'sent' ? new Date().toISOString() : null,
        });
      
      if (error) {
        console.error(`${LOG_PREFIXES.error} Fejl ved logging af mail:`, error);
      } else {
        console.log(`${LOG_PREFIXES.success} Mail afsendelse logget succesfuldt`);
      }
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Uventet fejl ved mail logging:`, error);
    }
  }

  /**
   * Genererer HTML email indhold baseret på rapport data - identisk med Python _create_html_report()
   */
  private generateReportHTML(reportData: ReportEmailData): string {
    console.log(`${LOG_PREFIXES.form} Genererer HTML email indhold for ${reportData.statistik.name}...`);
    
    try {
      const statistik = reportData.statistik;
      
      // Udtræk fornavn - identisk med Python _get_first_name()
      const fornavn = this.getFirstName(statistik.name);
      
      // Evaluer målsætning opfyldelse - identisk med Python logik
      const goals = {
        'Tomgang': {
          value: statistik.tomgangsprocent,
          target: 5.0,
          success: statistik.tomgangsprocent <= 5.0,
          text: 'Mål: Under 5%'
        },
        'Fartpilot anvendelse': {
          value: statistik.fartpilot_andel,
          target: 66.5,
          success: statistik.fartpilot_andel >= 66.5,
          text: 'Mål: Over 66,5%'
        },
        'Brug af motorbremse': {
          value: statistik.motorbremse_andel,
          target: 50.0,
          success: statistik.motorbremse_andel >= 50.0,
          text: 'Mål: Over 50%'
        },
        'Påløbsdrift': {
          value: statistik.paalobsdrift_andel,
          target: 7.0,
          success: statistik.paalobsdrift_andel >= 7.0,
          text: 'Mål: Over 7%'
        }
      };
      
      // Opret personaliseret HTML email - identisk design med Python
      let htmlContent = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { 
            font-family: 'Segoe UI', Arial, sans-serif; 
            margin: 0; 
            padding: 20px; 
            line-height: 1.6; 
            color: #1A2228; 
            background-color: #F5F8F9;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #FFFFFF;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(2, 104, 171, 0.1);
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #024A7D 0%, #0268AB 50%, #1FB1B1 100%);
            color: white;
            padding: 30px 20px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
        }
        .content {
            padding: 30px 20px;
        }
        .greeting { 
            font-size: 18px; 
            margin-bottom: 20px;
            color: #024A7D;
            font-weight: 500;
        }
        .goals-container { 
            background: #F5F8F9; 
            padding: 25px; 
            border-radius: 10px; 
            margin: 25px 0;
            border-left: 4px solid #0268AB;
        }
        .goals-container h3 {
            margin-top: 0;
            color: #024A7D;
            font-size: 18px;
            font-weight: 600;
        }
        .goal-item { 
            margin: 20px 0; 
            padding: 15px; 
            border-radius: 8px;
            background: white;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        .goal-name {
            font-weight: 600;
            color: #1A2228;
            margin-bottom: 5px;
        }
        .goal-value { 
            font-weight: bold; 
            font-size: 20px;
            margin: 5px 0;
        }
        .goal-target { 
            color: #4C5E6A; 
            font-size: 14px; 
            margin-top: 5px;
        }
        .success { 
            color: #1F7D3A;
            background: linear-gradient(135deg, #DFF5E7 0%, #E8F5E8 100%);
        }
        .warning { 
            color: #A3242A;
            background: linear-gradient(135deg, #F9DADA 0%, #FDE8E8 100%);
        }
        .footer { 
            margin-top: 30px; 
            padding-top: 20px; 
            border-top: 1px solid #E6F4FA; 
            color: #4C5E6A; 
            font-size: 14px;
        }
        .contact-info {
            background: #E6F4FA;
            padding: 15px;
            border-radius: 8px;
            margin-top: 15px;
        }
        .contact-info strong {
            color: #024A7D;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Fiskelogistik Chaufførrapport</h1>
        </div>
        
        <div class="content">
            <div class="greeting">
                Kære ${fornavn},
            </div>
            
            <p>Hermed din månedlige kørselsrapport for <strong>${statistik.date}</strong>.</p>
            
            <div class="goals-container">
                <h3>Din performance på de 4 målsætninger:</h3>`;

      // Tilføj hver målsætning med farve-kodning - identisk med Python logik
      Object.entries(goals).forEach(([name, goal]) => {
        const statusClass = goal.success ? 'success' : 'warning';
        htmlContent += `
                <div class="goal-item ${statusClass}">
                    <div class="goal-name">${name}</div>
                    <div class="goal-value">${goal.value.toFixed(1)}%</div>
                    <div class="goal-target">${goal.text}</div>
                </div>`;
      });

      // Afslut HTML - identisk med Python struktur
      htmlContent += `
            </div>
            
            <p>Din komplette rapport er vedhæftet som PDF-fil, hvor du kan finde flere detaljer om din kørsel.</p>
            
            <div class="footer">
                <div class="contact-info">
                    <p><strong>Har du spørgsmål til rapporten?</strong></p>
                    <p>Kontakt venligst:</p>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Susan</li>
                        <li>Rasmus</li>
                    </ul>
                </div>
                
                <p style="margin-top: 20px;">Med venlig hilsen<br><strong>Fiskelogistik Gruppen A/S</strong></p>
            </div>
        </div>
    </div>
</body>
</html>`;

      console.log(`${LOG_PREFIXES.success} HTML email indhold genereret for ${statistik.name}`);
      return htmlContent;
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Fejl ved HTML generering:`, error);
      
      // Fallback HTML ved fejl
      return this.generateFallbackHTML(reportData.statistik.name);
    }
  }

  /**
   * Genererer fallback HTML email - enkel version ved fejl
   */
  private generateFallbackHTML(driverName: string): string {
    const fornavn = this.getFirstName(driverName);
    
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { background: #0268AB; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Fiskelogistik Chaufførrapport</h1>
    </div>
    <div class="content">
        <p>Kære ${fornavn},</p>
        <p>Din månedlige kørselsrapport er vedhæftet.</p>
        <p>Med venlig hilsen<br>Fiskelogistik Gruppen A/S</p>
    </div>
</body>
</html>`;
  }

  /**
   * Udtrækker fornavn fra fuldt navn - identisk med Python _get_first_name()
   */
  private getFirstName(fullName: string): string {
    if (!fullName) return "";
    
    // Håndter format "Efternavn, Fornavn" - identisk med Python logik
    if (fullName.includes(',')) {
      const parts = fullName.split(',');
      if (parts.length > 1 && parts[1].trim()) {
        return parts[1].trim().split(' ')[0];
      }
    }
    
    // Standard format "Fornavn Efternavn"
    return fullName.split(' ')[0];
  }

  /**
   * Sender mail med retry logik - prioriterer Mailjet over SMTP
   */
  /**
   * Sender mail via Mailjet HTTP API
   */
  public async sendMail(request: SendMailRequest): Promise<boolean> {
    console.log(`${LOG_PREFIXES.form} Sender mail til ${request.to}...`);
    
    const mailjetConfig = await this.getMailjetConfig();
    if (!mailjetConfig) {
      console.error(`${LOG_PREFIXES.error} Ingen Mailjet konfiguration tilgængelig`);
      return false;
    }
    
    console.log(`${LOG_PREFIXES.info} Bruger Mailjet til mail sending...`);
    
    const mailjetSuccess = await this.sendMailViaMailjet(request);
    if (mailjetSuccess) {
      // Log success i database
      if (request.driverId) {
        await this.logMailSent({
          driver_id: request.driverId,
          recipient_email: request.to,
          subject: request.subject,
          status: 'sent',
          message: 'Mail sendt succesfuldt via Mailjet'
        });
      }
      return true;
    } else {
      console.error(`${LOG_PREFIXES.error} Mailjet sending fejlede for ${request.to}`);
      
      // Log fejl i database
      if (request.driverId) {
        await this.logMailSent({
          driver_id: request.driverId,
          recipient_email: request.to,
          subject: request.subject,
          status: 'failed',
          message: 'Mailjet sending fejlede'
        });
      }
      
      return false;
    }
  }

  /**
   * Sender rapport til chauffør - identisk med Python send_report() funktionalitet
   */
  public async sendReport(driverId: string, reportData: ReportEmailData, recipientEmail?: string): Promise<boolean> {
    console.log(`${LOG_PREFIXES.form} Sender rapport til chauffør ${driverId}...`);
    
    try {
      // Bestem modtager email
      let toEmail = recipientEmail;
      if (!toEmail) {
        // Hent email fra driver_emails tabel
        const { data: driverEmailData, error: emailError } = await supabase
          .from('driver_emails')
          .select('email')
          .eq('driver_name', driverId)
          .single();
        
        if (emailError || !driverEmailData?.email) {
          console.error(`${LOG_PREFIXES.error} Ingen email fundet for chauffør ${driverId}`);
          return false;
        }
        
        toEmail = driverEmailData.email;
      }
      
      console.log(`${LOG_PREFIXES.info} Sender rapport til ${toEmail} for chauffør ${driverId}`);
      
      // Generer email indhold
      const htmlBody = this.generateReportHTML(reportData);
      const subject = `Chauffør Rapport - ${reportData.statistik.name} - ${reportData.statistik.date}`;
      
      // Forbered vedhæftninger
      const attachments: EmailAttachment[] = [];
      if (reportData.rapport) {
        attachments.push({
          filename: `Rapport_${reportData.statistik.name}_${reportData.statistik.date.replace(' ', '_')}.pdf`,
          content: reportData.rapport,
          contentType: 'application/pdf'
        });
      }
      
      // Send mail - sikr at toEmail ikke er undefined
      if (!toEmail) {
        console.error(`${LOG_PREFIXES.error} Ingen gyldig email adresse for chauffør ${driverId}`);
        return false;
      }
      
      const success = await this.sendMail({
        to: toEmail,
        subject,
        htmlBody,
        attachments,
        driverId
      });
      
      if (success) {
        console.log(`${LOG_PREFIXES.success} Rapport sendt succesfuldt til ${reportData.statistik.name} (${toEmail})`);
        
        // Opdater last_report_sent i driver_emails
        await supabaseAdmin
          .from('driver_emails')
          .update({ 
            last_report_sent: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('driver_name', driverId);
      }
      
      return success;
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Fejl ved rapport sending til ${driverId}:`, error);
      return false;
    }
  }

  /**
   * Tester mail konfiguration ved at sende test mail via Mailjet
   */
  public async sendTestMail(): Promise<boolean> {
    console.log(`${LOG_PREFIXES.test} Sender test mail via Mailjet...`);
    
    try {
      const mailjetConfig = await this.getMailjetConfig();
      if (!mailjetConfig) {
        console.error(`${LOG_PREFIXES.error} Ingen Mailjet konfiguration tilgængelig`);
        return false;
      }
      
      const testEmail = mailjetConfig.test_email;
      if (!testEmail) {
        console.error(`${LOG_PREFIXES.error} Ingen test email konfigureret`);
        return false;
      }
      
      const htmlBody = `
        <h2>Fiskelogistik Mail Test</h2>
        <p>Dette er en test mail fra FSK Online platformen.</p>
        <p>Mail provider: <strong>Mailjet</strong></p>
        <p>Mail systemet fungerer korrekt!</p>
        <p>Sendt: ${new Date().toLocaleString('da-DK')}</p>
      `;
      
      const success = await this.sendMail({
        to: testEmail,
        subject: 'FSK Online - Mail Test',
        htmlBody
      });
      
      console.log(`${LOG_PREFIXES.success} Test mail ${success ? 'sendt' : 'fejlede'} via Mailjet`);
      return success;
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Test mail fejl:`, error);
      return false;
    }
  }

  /**
   * Returnerer hvilken mail provider der er konfigureret
   */
  public async getMailProvider(): Promise<'mailjet' | 'none'> {
    const mailjetConfig = await this.getMailjetConfig();
    if (mailjetConfig) {
      return 'mailjet';
    }
    
    return 'none';
  }

  /**
   * Returnerer mail konfiguration status
   */
  public async getConfigStatus(): Promise<{
    provider: 'mailjet' | 'none';
    senderEmail?: string;
    testEmail?: string;
    configured: boolean;
  }> {
    const mailjetConfig = await this.getMailjetConfig();
    if (mailjetConfig) {
      return {
        provider: 'mailjet',
        senderEmail: mailjetConfig.sender_email,
        testEmail: mailjetConfig.test_email,
        configured: true
      };
    }
    
    return {
      provider: 'none',
      configured: false
    };
  }
}

// Singleton instance - identisk med Python pattern
let mailServiceInstance: MailService | null = null;

/**
 * Henter singleton instance af MailService
 */
export function getMailService(): MailService {
  if (!mailServiceInstance) {
    mailServiceInstance = new MailService();
  }
  return mailServiceInstance;
}

// Eksporter utility funktioner
export { MailService as default }; 