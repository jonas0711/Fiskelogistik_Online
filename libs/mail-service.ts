/**
 * Mail Service Library
 * Baseret på Python-applikationens mail_system.py og mail_handler.py
 * Håndterer SMTP mail sending med nodemailer og email templates
 */

import nodemailer from 'nodemailer';
import { supabase, supabaseAdmin } from './db';
import { DriverData, calculateMetrics } from './report-utils';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

// Interface for mail konfiguration - identisk med Python struktur
export interface MailConfig {
  smtp_server: string;          // f.eks. "smtp.gmail.com"
  smtp_port: number;           // f.eks. 587 (TLS) eller 465 (SSL)
  email: string;               // Afsender email
  password: string;            // App password (IKKE normalt password)
  test_email?: string;         // Test email adresse
  created_at?: string;
  updated_at?: string;
}

// Interface for mail sending request
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
 * Mail Service Class - identisk struktur med Python MailSystem
 */
export class MailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: MailConfig | null = null;
  private maxRetries: number = 3;
  private retryDelay: number = 2000; // 2 sekunder

  constructor() {
    console.log(`${LOG_PREFIXES.config} Initialiserer Mail Service...`);
  }

  /**
   * Henter mail konfiguration fra miljøvariabler eller database
   * Prioriterer miljøvariabler over database konfiguration
   */
  private async getMailConfig(): Promise<MailConfig | null> {
    console.log(`${LOG_PREFIXES.search} Henter mail konfiguration...`);
    
    // Først: Tjek om alle nødvendige miljøvariabler er sat
    const envSmtpServer = process.env.SMTP_SERVER;
    const envSmtpPort = process.env.SMTP_PORT;
    const envEmail = process.env.EMAIL;
    const envPassword = process.env.APP_PASSWORD;
    const envTestEmail = process.env.TEST_EMAIL;
    
    if (envSmtpServer && envSmtpPort && envEmail && envPassword) {
      console.log(`${LOG_PREFIXES.success} Mail konfiguration hentet fra miljøvariabler for: ${envEmail}`);
      
      const envConfig: MailConfig = {
        smtp_server: envSmtpServer,
        smtp_port: parseInt(envSmtpPort, 10),
        email: envEmail,
        password: envPassword,
        test_email: envTestEmail || undefined,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      this.config = envConfig;
      return envConfig;
    }
    
    console.log(`${LOG_PREFIXES.warning} Miljøvariabler ikke komplet sat - forsøger database...`);
    
    // Fallback: Hent fra database hvis miljøvariabler ikke er sat
    try {
      const { data, error } = await supabase
        .from('mail_config')
        .select('*')
        .limit(1)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          console.log(`${LOG_PREFIXES.warning} Ingen mail konfiguration fundet i database eller miljøvariabler`);
          return null;
        }
        console.error(`${LOG_PREFIXES.error} Database fejl ved hentning af mail config:`, error);
        return null;
      }
      
      if (!data) {
        console.log(`${LOG_PREFIXES.warning} Tom mail konfiguration`);
        return null;
      }
      
      // Validér kritiske felter
      if (!data.smtp_server || !data.email || !data.password) {
        console.error(`${LOG_PREFIXES.error} Manglende kritiske mail konfiguration felter`);
        return null;
      }
      
      console.log(`${LOG_PREFIXES.success} Mail konfiguration hentet fra database for: ${data.email}`);
      this.config = data as MailConfig;
      return this.config;
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Uventet fejl ved hentning af mail config:`, error);
      return null;
    }
  }

  /**
   * Opretter SMTP transporter - identisk med Python create_smtp_connection()
   */
  private async createTransporter(): Promise<nodemailer.Transporter | null> {
    console.log(`${LOG_PREFIXES.connection} Opretter SMTP transporter...`);
    
    if (!this.config) {
      this.config = await this.getMailConfig();
      if (!this.config) {
        console.error(`${LOG_PREFIXES.error} Ingen mail konfiguration tilgængelig`);
        return null;
      }
    }
    
    try {
      // Opret nodemailer transporter baseret på port - identisk logik med Python
      const transportConfig = {
        host: this.config.smtp_server,
        port: this.config.smtp_port,
        secure: this.config.smtp_port === 465, // true for 465 (SSL), false for andre porter
        auth: {
          user: this.config.email,
          pass: this.config.password,
        },
        // Timeout og retry indstillinger
        connectionTimeout: 30000, // 30 sekunder
        greetingTimeout: 30000,
        socketTimeout: 30000,
      };
      
      // Tilføj STARTTLS for port 587 - identisk med Python logik
      if (this.config.smtp_port === 587) {
        (transportConfig as any).requireTLS = true;
      }
      
      console.log(`${LOG_PREFIXES.connection} Opretter SMTP forbindelse til ${this.config.smtp_server}:${this.config.smtp_port}`);
      
      const transporter = nodemailer.createTransport(transportConfig);
      
      // Verificer SMTP forbindelse
      await transporter.verify();
      
      console.log(`${LOG_PREFIXES.success} SMTP transporter oprettet og verificeret succesfuldt`);
      this.transporter = transporter;
      return transporter;
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} SMTP transporter oprettelse fejlede:`, error);
      
      // Detaljeret fejlhåndtering - identisk med Python error handling
      if (error instanceof Error) {
        if (error.message.includes('Authentication failed')) {
          console.error(`${LOG_PREFIXES.error} SMTP autentificering fejlede - tjek email og password`);
        } else if (error.message.includes('connection timeout')) {
          console.error(`${LOG_PREFIXES.error} SMTP forbindelse timeout - tjek server og port`);
        } else if (error.message.includes('ENOTFOUND')) {
          console.error(`${LOG_PREFIXES.error} SMTP server ikke fundet - tjek server adresse`);
        }
      }
      
      return null;
    }
  }

  /**
   * Logger mail afsendelse i database - identisk med Python _log_mail_sent()
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
   * Sender mail med retry logik - identisk med Python send_mail() struktur
   */
  public async sendMail(request: SendMailRequest): Promise<boolean> {
    console.log(`${LOG_PREFIXES.form} Sender mail til ${request.to}...`);
    
    let attempt = 0;
    let lastError: Error | null = null;
    
    while (attempt < this.maxRetries) {
      try {
        attempt++;
        console.log(`${LOG_PREFIXES.info} Mail forsøg ${attempt}/${this.maxRetries} til ${request.to}`);
        
        // Opret transporter hvis ikke allerede oprettet
        if (!this.transporter) {
          this.transporter = await this.createTransporter();
          if (!this.transporter) {
            throw new Error('Kunne ikke oprette SMTP transporter');
          }
        }
        
        // Forbered mail indhold
        const mailOptions: nodemailer.SendMailOptions = {
          from: this.config?.email,
          to: request.to,
          subject: request.subject,
          html: request.htmlBody,
        };
        
        // Tilføj vedhæftninger hvis tilgængelige
        if (request.attachments && request.attachments.length > 0) {
          mailOptions.attachments = request.attachments.map(att => ({
            filename: att.filename,
            content: att.content,
            contentType: att.contentType,
          }));
          
          console.log(`${LOG_PREFIXES.info} Tilføjer ${request.attachments.length} vedhæftninger`);
        }
        
        // Send mail
        const info = await this.transporter.sendMail(mailOptions);
        
        console.log(`${LOG_PREFIXES.success} Mail sendt succesfuldt til ${request.to}, Message ID: ${info.messageId}`);
        
        // Log success i database
        if (request.driverId) {
          await this.logMailSent({
            driver_id: request.driverId,
            recipient_email: request.to,
            subject: request.subject,
            status: 'sent',
            message: `Mail sendt succesfuldt (forsøg ${attempt})`
          });
        }
        
        return true;
        
      } catch (error) {
        lastError = error as Error;
        console.error(`${LOG_PREFIXES.error} Mail forsøg ${attempt} fejlede:`, lastError.message);
        
        // Log fejl i database
        if (request.driverId) {
          await this.logMailSent({
            driver_id: request.driverId,
            recipient_email: request.to,
            subject: request.subject,
            status: 'failed',
            message: `Forsøg ${attempt} fejlede: ${lastError.message}`
          });
        }
        
        // Reset transporter ved visse fejl
        if (lastError.message.includes('Authentication failed') || 
            lastError.message.includes('Connection timeout')) {
          console.log(`${LOG_PREFIXES.warning} Resetter SMTP transporter efter fejl`);
          this.transporter = null;
        }
        
        // Vent før næste forsøg (exponential backoff)
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`${LOG_PREFIXES.info} Venter ${delay}ms før næste forsøg...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    console.error(`${LOG_PREFIXES.error} Mail sending opggivet efter ${this.maxRetries} forsøg til ${request.to}`);
    
    // Log endelig fejl
    if (request.driverId) {
      await this.logMailSent({
        driver_id: request.driverId,
        recipient_email: request.to,
        subject: request.subject,
        status: 'failed',
        message: `Opggivet efter ${this.maxRetries} forsøg: ${lastError?.message}`
      });
    }
    
    return false;
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
   * Tester mail konfiguration ved at sende test mail
   */
  public async sendTestMail(): Promise<boolean> {
    console.log(`${LOG_PREFIXES.test} Sender test mail...`);
    
    try {
      const config = await this.getMailConfig();
      if (!config || !config.test_email) {
        console.error(`${LOG_PREFIXES.error} Ingen test email konfigureret`);
        return false;
      }
      
      const htmlBody = `
        <h2>Fiskelogistik Mail Test</h2>
        <p>Dette er en test mail fra FSK Online platformen.</p>
        <p>Mail systemet fungerer korrekt!</p>
        <p>Sendt: ${new Date().toLocaleString('da-DK')}</p>
      `;
      
      const success = await this.sendMail({
        to: config.test_email || 'fallback@example.com',
        subject: 'FSK Online - Mail Test',
        htmlBody
      });
      
      console.log(`${LOG_PREFIXES.success} Test mail ${success ? 'sendt' : 'fejlede'}`);
      return success;
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Test mail fejl:`, error);
      return false;
    }
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