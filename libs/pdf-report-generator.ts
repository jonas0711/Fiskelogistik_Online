/**
 * PDF Rapport Generator Service
 * Konverterer rapport data til HTML og derefter til PDF
 * Identisk struktur med Python applikation og Word generator
 */

import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import { DriverData, CalculatedMetrics, calculateMetrics, calculateOverallRanking } from './report-utils';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

// Interface for PDF rapport konfiguration - identisk med Word
export interface PDFReportConfig {
  reportType: 'samlet' | 'gruppe' | 'individuel';
  month?: number;
  year?: number;
  selectedGroup?: string;
  selectedDriver?: string;
  period: string;
  totalDrivers: number;
  drivers: DriverData[];
  previousDrivers?: DriverData[]; // Forrige måneds data til sammenligning
  overallRanking: Array<{
    driver: string;
    totalScore: number;
    weightAdjustedConsumption: number;
    rankings: {
      Tomgangsprocent: number;
      'Fartpilot Andel': number;
      'Motorbremse Andel': number;
      'Påløbsdrift Andel': number;
    };
  }>;
  generatedAt: string;
}

export class PDFReportGenerator {
  private config: PDFReportConfig;
  
  // Definer kolonne grupper - identisk med Python og Word generator
  private readonly driftsDataKolonner = [
    'Ø Forbrug [l/100km]',
    'Ø Rækkevidde ved forbrug [km/l]',
    'Ø Forbrug ved kørsel [l/100km]',
    'Forbrug [l]',
    'Kørestrækning [km]',
    'Ø totalvægt [t]'
  ];
  
  private readonly korselsDataKolonner = [
    'Aktiv påløbsdrift (km) [km]',
    'Afstand i påløbsdrift [km]',
    'Kickdown (km) [km]',
    'Afstand med kørehastighedsregulering (> 50 km/h) [km]',
    'Afstand > 50 km/h uden kørehastighedsregulering [km]',
    'Forbrug med kørehastighedsregulering [l/100km]',
    'Forbrug uden kørehastighedsregulering [l/100km]',
    'Driftsbremse (km) [km]',
    'Afstand motorbremse [km]',
    'Overspeed (km uden påløbsdrift) [km]'
  ];
  
  private readonly tomgangsDataKolonner = [
    'Motordriftstid [hh:mm:ss]',
    'Køretid [hh:mm:ss]',
    'Tomgang / stilstandstid [hh:mm:ss]'
  ];

  constructor(config: PDFReportConfig) {
    console.log(`${LOG_PREFIXES.form} Initialiserer PDF Rapport Generator...`);
    this.config = config;
    console.log(`${LOG_PREFIXES.success} PDF generator konfigureret for ${config.reportType} rapport med ${config.totalDrivers} chauffører`);
  }

  /**
   * Genererer forbedret CSS styling - kompakt professionelt design med korrekt farvepalet
   */
  private generateCSS(): string {
    return `
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        @page {
          margin: 1.5cm;
          size: A4;
        }
        
        /* MODERNE BASE STYLING */
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Inter', 'Segoe UI', 'Roboto', sans-serif;
          line-height: 1.3;
          color: #1A2228;
          margin: 0;
          padding: 0;
          font-size: 10pt;
          background: #FFFFFF;
          font-weight: 400;
        }
        
        /* MODERNE FORSIDE MED LOGO */
        .front-page {
          text-align: center;
          height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          page-break-after: always;
          background: linear-gradient(135deg, #024A7D 0%, #0268AB 50%, #1FB1B1 100%);
          color: white;
          position: relative;
          overflow: hidden;
        }
        
        .front-page::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
          animation: pulse 4s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }
        
        .logo-container {
          margin-bottom: 30px;
          z-index: 2;
          position: relative;
        }
        
        .logo-placeholder {
          display: inline-block;
          background: transparent;
          border-radius: 20px;
          padding: 10px 20px;
        }
        
        .logo-placeholder svg {
          display: block;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
        }
        
        .title {
          font-size: 36pt;
          font-weight: 700;
          margin-bottom: 15px;
          line-height: 1.1;
          z-index: 2;
          position: relative;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          letter-spacing: -0.5px;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
        }
        
        .period {
          font-size: 24pt;
          margin-bottom: 20px;
          font-weight: 300;
          z-index: 2;
          position: relative;
          opacity: 0.9;
          -webkit-font-smoothing: antialiased;
        }
        
        .generated-date {
          font-size: 11pt;
          opacity: 0.8;
          z-index: 2;
          position: relative;
          background: rgba(255, 255, 255, 0.15);
          padding: 6px 12px;
          border-radius: 15px;
          backdrop-filter: blur(8px);
          -webkit-font-smoothing: antialiased;
        }
        
        /* KOMPAKTE SECTION HEADERS */
        .section-heading {
          font-size: 16pt;
          font-weight: 600;
          color: #024A7D;
          margin: 15px 0 10px 0;
          padding: 10px 15px;
          background: linear-gradient(135deg, #E6F4FA 0%, #F5F8F9 100%);
          border-left: 4px solid #0268AB;
          border-radius: 6px;
          box-shadow: 0 1px 4px rgba(2, 104, 171, 0.1);
        }
        
        .section-heading::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          width: 60px;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(2, 104, 171, 0.1));
          border-radius: 0 8px 8px 0;
        }
        
        /* KOMPAKTE CARDS */
        .content-card {
          background: white;
          border-radius: 8px;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
          margin: 10px 0;
          overflow: hidden;
          border: 1px solid #E6F4FA;
          page-break-inside: avoid;
        }
        
        /* KOMPAKTE TABELLER */
        .data-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin: 0;
          background: white;
          border-radius: 6px;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
        }
        
        .data-table th {
          background: linear-gradient(135deg, #024A7D 0%, #0268AB 100%);
          color: white;
          padding: 8px 10px;
          text-align: left;
          font-weight: 600;
          font-size: 9pt;
          border: none;
        }
        
        .data-table th:first-child {
          border-radius: 6px 0 0 0;
        }
        
        .data-table th:last-child {
          border-radius: 0 6px 0 0;
        }
        
        .data-table td {
          padding: 6px 10px;
          border: none;
          border-bottom: 1px solid #F0F4F8;
          font-size: 9pt;
        }
        
        .data-table tr:nth-child(even) td {
          background-color: #FAFCFE;
        }
        
        .data-table tr:hover td {
          background-color: #E6F4FA;
        }
        
        .data-table tr:last-child td {
          border-bottom: none;
        }
        
        .data-table tr:last-child td:first-child {
          border-radius: 0 0 0 6px;
        }
        
        .data-table tr:last-child td:last-child {
          border-radius: 0 0 6px 0;
        }
        
        /* KOMPAKTE RANGERING TABELLER */
        .ranking-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          margin: 0;
          background: white;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        }
        
        .ranking-table th {
          background: linear-gradient(135deg, #1FB1B1 0%, #148E8E 100%);
          color: white;
          padding: 10px 6px;
          text-align: center;
          font-weight: 600;
          font-size: 8pt;
          border: none;
        }
        
        .ranking-table th:first-child {
          border-radius: 8px 0 0 0;
        }
        
        .ranking-table th:last-child {
          border-radius: 0 8px 0 0;
        }
        
        .ranking-table td {
          padding: 8px 6px;
          border: none;
          border-bottom: 1px solid #F0F4F8;
          text-align: center;
          font-size: 8pt;
        }
        
        .ranking-table tr:nth-child(even) td {
          background-color: #FAFCFE;
        }
        
        .ranking-table tr:last-child td {
          border-bottom: none;
        }
        
        .ranking-table tr:last-child td:first-child {
          border-radius: 0 0 0 8px;
        }
        
        .ranking-table tr:last-child td:last-child {
          border-radius: 0 0 8px 0;
        }
        
        /* TOP 3 MARKERING UDEN STJERNER */
        .top-3 {
          background: linear-gradient(135deg, #DFF5E7 0%, #E8F5E8 100%) !important;
          color: #1F7D3A !important;
          font-weight: 600 !important;
        }
        
        /* KOMPAKT INTRO TEKST */
        .intro-text {
          font-size: 10pt;
          margin: 10px 0;
          color: #1A2228;
          line-height: 1.4;
          padding: 12px;
          background: white;
          border-radius: 6px;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
          border-left: 3px solid #1FB1B1;
        }
        
        /* KOMPAKTE BULLET POINTS */
        .bullet-list {
          list-style: none;
          padding: 0;
          margin: 10px 0;
        }
        
        .bullet-list li {
          position: relative;
          padding: 4px 0 4px 18px;
          margin: 4px 0;
          color: #1A2228;
          line-height: 1.4;
          font-size: 9pt;
        }
        
        .bullet-list li::before {
          content: '●';
          position: absolute;
          left: 0;
          color: #1FB1B1;
          font-weight: bold;
          font-size: 12pt;
        }
        
        /* KOMPAKT CHAUFFØR SEKTION */
        .driver-section {
          page-break-before: always;
          margin: 10px 0;
          background: white;
          border-radius: 10px;
          padding: 15px;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.06);
          border: 1px solid #E6F4FA;
        }
        
        .driver-heading {
          font-size: 20pt;
          font-weight: 700;
          background: linear-gradient(135deg, #0268AB 0%, #1FB1B1 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 15px;
          padding-bottom: 8px;
          border-bottom: 2px solid #E6F4FA;
          text-align: center;
        }
        
        /* 2-KOLONNE GRID FOR DATA TABELLER */
        .data-tables-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin: 15px 0;
        }
        
        .data-tables-grid .content-card {
          margin: 0;
        }
        
                 /* SPECIAL GRID FOR 3 ITEMS - OPTIMERET LAYOUT */
         .data-tables-grid-three {
           display: grid;
           grid-template-columns: 2fr 1fr;
           gap: 12px;
           margin: 15px 0;
         }
         
         .data-tables-grid-three .content-card:first-child {
           grid-column: 1;
           grid-row: 1 / 3;
         }
         
         .data-tables-grid-three .content-card:nth-child(2) {
           grid-column: 2;
           grid-row: 1;
         }
         
         .data-tables-grid-three .content-card:nth-child(3) {
           grid-column: 2;
           grid-row: 2;
         }
        
        /* PERFORMANCE SEKTION */
        .performance-section {
          page-break-before: always;
          background: white;
          border-radius: 10px;
          padding: 15px;
          margin: 10px 0;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.06);
        }
        
        .performance-metric {
          margin: 20px 0;
          page-break-inside: avoid;
          background: #FAFCFE;
          padding: 12px;
          border-radius: 6px;
          border-left: 3px solid #0268AB;
        }
        
        .performance-title {
          font-size: 14pt;
          font-weight: 600;
          color: #024A7D;
          margin-bottom: 8px;
        }
        
        .performance-description {
          font-size: 10pt;
          font-style: italic;
          color: #4C5E6A;
          margin-bottom: 10px;
          line-height: 1.4;
        }
        
        /* TARGET MET STYLING */
        .target-met {
          background: linear-gradient(135deg, #DFF5E7 0%, #E8F5E8 100%) !important;
          color: #1F7D3A !important;
          font-weight: 600 !important;
          border-left: 2px solid #28A745 !important;
          padding-left: 6px !important;
        }
        
        /* PAGE BREAK MANAGEMENT */
        .page-break {
          page-break-before: always;
        }
        
        /* PRINT OPTIMIZATIONS */
        @media print {
          .content-card {
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .driver-section {
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          }
        }
        
        /* RESPONSIVE GRID ADJUSTMENTS */
        @media (max-width: 21cm) {
          .data-tables-grid {
            grid-template-columns: 1fr;
            gap: 10px;
          }
          
          .data-tables-grid-three {
            grid-template-columns: 1fr;
          }
          
          .data-tables-grid-three .content-card:first-child {
            grid-column: 1;
          }
        }
      </style>
    `;
  }

  /**
   * Genererer moderne forside HTML med korrekt Fiskelogistik Gruppen logo
   */
  private generateFrontPage(): string {
    const titleText = this.config.selectedGroup 
            ? `Fiskelogistik<br>Chaufførrapport<br>${this.config.selectedGroup}`
            : this.config.selectedDriver
            ? `Fiskelogistik<br>Chaufførrapport<br>${this.config.selectedDriver}`
      : 'Fiskelogistik<br>Chaufførrapport';

    return `
      <div class="front-page">
        <div class="logo-container">
          <div class="logo-placeholder">
            <svg width="280" height="120" viewBox="0 0 280 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <!-- Oval baggrund gradient -->
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1" />
                  <stop offset="50%" style="stop-color:#0268AB;stop-opacity:1" />
                  <stop offset="100%" style="stop-color:#1FB1B1;stop-opacity:1" />
                </linearGradient>
              </defs>
              
              <!-- Oval form -->
              <ellipse cx="140" cy="60" rx="130" ry="45" fill="url(#logoGradient)" opacity="0.95"/>
              
              <!-- Hovedtekst -->
              <text x="140" y="48" text-anchor="middle" fill="white" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="1px">
                FISKELOGISTIK
              </text>
              
              <!-- Undertekst -->
              <text x="140" y="70" text-anchor="middle" fill="white" font-family="Inter, Arial, sans-serif" font-size="14" font-weight="300" letter-spacing="2px" opacity="0.9">
                GRUPPEN A/S
              </text>
              
              <!-- Lille ® symbol -->
              <circle cx="260" cy="35" r="8" fill="none" stroke="white" stroke-width="1" opacity="0.8"/>
              <text x="260" y="39" text-anchor="middle" fill="white" font-family="Inter, Arial, sans-serif" font-size="8" font-weight="400">®</text>
            </svg>
          </div>
        </div>
        <div class="title">${titleText}</div>
        <div class="period">${this.config.period}</div>
        <div class="generated-date">
          Genereret: ${new Date(this.config.generatedAt).toLocaleDateString('da-DK', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </div>
    `;
  }

  /**
   * Genererer moderne samlet rangering HTML med cards og forbedret layout
   */
  private generateOverallRankingHTML(): string {
    const rankingRows = this.config.overallRanking.map((driver, index) => {
      const isTop3 = index < 3;
      const cssClass = isTop3 ? 'top-3' : '';
      
      return `
        <tr class="${cssClass}">
          <td class="${cssClass}">${index + 1}</td>
          <td class="${cssClass}">${driver.driver}</td>
          <td class="${cssClass}">${driver.totalScore}</td>
          <td class="${cssClass}">${driver.rankings.Tomgangsprocent}</td>
          <td class="${cssClass}">${driver.rankings['Fartpilot Andel']}</td>
          <td class="${cssClass}">${driver.rankings['Motorbremse Andel']}</td>
          <td class="${cssClass}">${driver.rankings['Påløbsdrift Andel']}</td>
        </tr>
      `;
    }).join('');

    return `
      <div class="content-card">
      <div class="section-heading">Samlet Performance Rangering</div>
      
      <div class="intro-text">
          <p>Den samlede rangering kombinerer præstationen på fire nøgleområder med følgende virksomhedsmål:</p>
          <ul class="bullet-list">
            <li>Tomgang: Mål på max 5% - Minimering af unødvendig tomgangskørsel</li>
            <li>Fartpilot: Mål på minimum 66,5% - Optimal brug af fartpilot ved højere hastigheder</li>
            <li>Motorbremse: Mål på minimum 56% - Effektiv brug af motorbremsning</li>
            <li>Påløbsdrift: Mål på minimum 7% - Udnyttelse af køretøjets momentum</li>
          </ul>
          <p>Hver chauffør får points baseret på deres placering i hver kategori. Lavere samlet score er bedre, da det betyder bedre placeringer på tværs af kategorierne. De tre bedste chauffører er markeret med grøn for at fremhæve særligt god præstation. Målene er sat af virksomheden og bruges som reference for optimal kørsel.</p>
      </div>
      
      <table class="ranking-table">
        <thead>
          <tr>
            <th>Placering</th>
            <th>Chauffør</th>
            <th>Samlet Score</th>
            <th>Tomgang</th>
            <th>Fartpilot</th>
            <th>Motorbremse</th>
            <th>Påløbsdrift</th>
          </tr>
        </thead>
        <tbody>
            ${rankingRows}
        </tbody>
      </table>
      </div>
      <div class="page-break"></div>
    `;
  }

  /**
   * Genererer moderne performance rangering HTML med cards og forbedret styling
   */
  private generatePerformanceRankingHTML(): string {
    const metricsConfig = {
      'Tomgangsprocent': {
        title: 'Tomgangsprocent',
        higherIsBetter: false,
        unit: '%',
        description: 'Procentdel af total motordriftstid brugt i tomgang. Lavere værdi indikerer mere effektiv kørsel.',
        target: 5.0
      },
      'Fartpilot Andel': {
        title: 'Fartpilot Anvendelse',
        higherIsBetter: true,
        unit: '%',
        description: 'Procentdel af køretid hvor fartpilot er anvendt ved højere hastigheder. Højere værdi betyder mere økonomisk kørsel.',
        target: 66.5
      },
      'Motorbremse Andel': {
        title: 'Motorbremse Anvendelse',
        higherIsBetter: true,
        unit: '%',
        description: 'Procentdel af bremsning udført med motorbremse frem for driftsbremse. Højere værdi er mere effektivt.',
        target: 56.0
      },
      'Påløbsdrift Andel': {
        title: 'Påløbsdrift Udnyttelse',
        higherIsBetter: true,
        unit: '%',
        description: 'Procentdel af køretid i påløbsdrift hvor køretøjet ruller frit. Højere værdi sparer brændstof.',
        target: 7.0
      }
    };

    const driversWithMetrics = this.config.drivers.map(driver => ({
      driver: driver.driver_name,
      metrics: calculateMetrics(driver)
    }));

    const performanceHTML = Object.entries(metricsConfig).map(([metricKey, config]) => {
      const sortedDrivers = driversWithMetrics
        .map(dm => ({
          driver: dm.driver,
          value: dm.metrics[metricKey as keyof typeof dm.metrics] || 0
        }))
        .sort((a, b) => config.higherIsBetter ? b.value - a.value : a.value - b.value);

      const tableRows = sortedDrivers.map((item, index) => {
        const meetsTarget = config.target ? 
          (config.higherIsBetter ? item.value >= config.target : item.value <= config.target) : 
          false;
        
        const cssClass = meetsTarget ? 'target-met' : '';
        const scoreText = `${item.value.toFixed(1)}${config.unit}`;
        
        return `
          <tr class="${cssClass}">
            <td class="${cssClass}">${index + 1}</td>
            <td class="${cssClass}">${item.driver}</td>
            <td class="${cssClass}">${scoreText}</td>
          </tr>
        `;
      }).join('');

      return `
        <div class="performance-metric">
          <div class="performance-title">${config.title}</div>
          <div class="performance-description">${config.description}</div>
          
          <table class="ranking-table">
            <thead>
              <tr>
                <th>Placering</th>
                <th>Chauffør</th>
                <th>Score (${config.unit})</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    return `
      <div class="performance-section">
        <div class="section-heading">Performance Rangering</div>
        
        <div class="intro-text">
          <p>Nedenstående tabeller viser rangeringen af chauffører baseret på forskellige performancemålinger. Hver tabel fokuserer på et specifikt område af kørepræstation og hjælper med at identificere styrker og forbedringspotentialer.</p>
        </div>
        
        ${performanceHTML}
      </div>
      <div class="page-break"></div>
    `;
  }

  /**
   * Genererer moderne data tabel HTML med cards
   */
  private generateDataTableHTML(driver: DriverData, columns: string[], title: string): string {
    const dataMapping: { [key: string]: any } = {
      // Driftsdata
      'Ø Forbrug [l/100km]': driver.avg_consumption_per_100km?.toFixed(1) || 'N/A',
      'Ø Rækkevidde ved forbrug [km/l]': driver.avg_range_per_consumption?.toFixed(2) || 'N/A',
      'Ø Forbrug ved kørsel [l/100km]': driver.avg_consumption_driving?.toFixed(1) || 'N/A',
      'Forbrug [l]': driver.total_consumption?.toFixed(0) || 'N/A',
      'Kørestrækning [km]': driver.driving_distance?.toFixed(0) || 'N/A',
      'Ø totalvægt [t]': driver.avg_total_weight?.toFixed(1) || 'N/A',
      
      // Kørselsdata
      'Aktiv påløbsdrift (km) [km]': driver.active_coasting_km?.toFixed(0) || 'N/A',
      'Afstand i påløbsdrift [km]': driver.coasting_distance?.toFixed(0) || 'N/A',
      'Kickdown (km) [km]': driver.kickdown_km?.toFixed(0) || 'N/A',
      'Afstand med kørehastighedsregulering (> 50 km/h) [km]': driver.cruise_distance_over_50?.toFixed(0) || 'N/A',
      'Afstand > 50 km/h uden kørehastighedsregulering [km]': driver.distance_over_50_without_cruise?.toFixed(0) || 'N/A',
      'Forbrug med kørehastighedsregulering [l/100km]': driver.consumption_with_cruise?.toFixed(1) || 'N/A',
      'Forbrug uden kørehastighedsregulering [l/100km]': driver.consumption_without_cruise?.toFixed(1) || 'N/A',
      'Driftsbremse (km) [km]': driver.service_brake_km?.toFixed(0) || 'N/A',
      'Afstand motorbremse [km]': driver.engine_brake_distance?.toFixed(0) || 'N/A',
      'Overspeed (km uden påløbsdrift) [km]': driver.overspeed_km_without_coasting?.toFixed(0) || 'N/A',
      
      // Tomgangsdata
      'Motordriftstid [hh:mm:ss]': driver.engine_runtime || 'N/A',
      'Køretid [hh:mm:ss]': driver.driving_time || 'N/A',
      'Tomgang / stilstandstid [hh:mm:ss]': driver.idle_standstill_time || 'N/A'
    };

    const tableRows = columns.map(column => `
      <tr>
        <td>${column}</td>
        <td><strong>${dataMapping[column]}</strong></td>
      </tr>
    `).join('');

    return `
      <div class="content-card">
        <div class="section-heading">${title}</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Værdi</th>
              </tr>
            </thead>
            <tbody>
            ${tableRows}
            </tbody>
          </table>
      </div>
    `;
  }

  /**
   * Genererer moderne nøgletal tabel HTML med sammenligning og cards
   */
  private generateMetricsTableHTML(driverData: DriverData, previousData?: DriverData): string {
    const metrics = calculateMetrics(driverData);
    const previousMetrics = previousData ? calculateMetrics(previousData) : null;
    
    const metricsConfig = {
      'Tomgangsprocent': { 
        format: (val: number) => `${val.toFixed(1)}%`, 
        target: 'Under 5%', 
        explanation: 'Procentdel af total motordriftstid brugt i tomgang. Lavere er bedre.',
        higherIsBetter: false
      },
      'Fartpilot Andel': { 
        format: (val: number) => `${val.toFixed(1)}%`, 
        target: 'Over 66,5%', 
        explanation: 'Procentdel af køretid hvor fartpilot er aktivt. Højere er bedre.',
        higherIsBetter: true
      },
      'Motorbremse Andel': { 
        format: (val: number) => `${val.toFixed(1)}%`, 
        target: 'Over 56%', 
        explanation: 'Procentdel af total bremsning udført med motorbremse. Højere er bedre.',
        higherIsBetter: true
      },
      'Påløbsdrift Andel': { 
        format: (val: number) => `${val.toFixed(1)}%`, 
        target: 'Over 7%', 
        explanation: 'Procentdel af køretid i påløbsdrift. Højere er bedre.',
        higherIsBetter: true
      },
      'Diesel Effektivitet': { 
        format: (val: number) => `${val.toFixed(2)} km/l`, 
        target: 'Højere er bedre', 
        explanation: 'Antal kilometer kørt per liter brændstof. Højere er bedre.',
        higherIsBetter: true
      },
      'Vægtkorrigeret Forbrug': { 
        format: (val: number) => `${val.toFixed(2)} l/100km/t`, 
        target: 'Lavere er bedre', 
        explanation: 'Brændstofforbrug justeret for lastens vægt. Lavere er bedre.',
        higherIsBetter: false
      },
      'Overspeed Andel': { 
        format: (val: number) => `${val.toFixed(1)}%`, 
        target: 'Under 1%', 
        explanation: 'Procentdel af køretid over hastighedsgrænsen. Lavere er bedre.',
        higherIsBetter: false
      }
    };

    // Bestem tidligere periode navn baseret på faktiske data
    let previousPeriodName = 'Tidligere periode';
    if (previousData) {
      const monthNames = [
        'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'December'
      ];
      
      if (previousData.month && previousData.year) {
        previousPeriodName = `${monthNames[previousData.month - 1]} ${previousData.year}`;
      }
    } else {
      previousPeriodName = 'Ny chauffør';
    }

    const tableRows = Object.entries(metricsConfig).map(([metricName, config]) => {
      const currentValue = metrics[metricName as keyof CalculatedMetrics] || 0;
      const previousValue = previousMetrics ? (previousMetrics[metricName as keyof CalculatedMetrics] || 0) : 0;
      
      const formattedCurrent = config.format(currentValue);
      const formattedPrevious = previousMetrics ? config.format(previousValue) : 'Ny chauffør';
      
      // Beregn procentændring og bestem farve
      let changeText = '';
      let changeColor = '#000000';
      
      if (previousMetrics && previousValue !== 0) {
        const change = ((currentValue - previousValue) / previousValue) * 100;
        const isImprovement = config.higherIsBetter ? change > 0 : change < 0;
        
        changeColor = isImprovement ? '#008000' : '#FF0000';
        changeText = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
      } else if (previousMetrics && previousValue === 0) {
        changeText = 'Ikke målbar';
        changeColor = '#808080';
      } else {
        changeText = 'Ny chauffør';
        changeColor = '#0066CC';
      }
      
      return `
        <tr>
          <td>${config.explanation}</td>
          <td>${formattedPrevious}</td>
          <td><strong>${formattedCurrent}</strong></td>
          <td>${config.target}</td>
          <td style="color: ${changeColor}; font-weight: ${changeText !== 'Ny chauffør' && changeText !== 'Ikke målbar' ? 'bold' : 'normal'};">${changeText}</td>
        </tr>
      `;
    }).join('');

    const explanationBullets = [
      'Påløbsdrift: Kørsel uden bremse/speeder. Køretøjet ruller frit og sparer brændstof. Mål: Over 7%.',
      'Fartpilot: Brug af fartpilot ved +50 km/t. Mere jævn og økonomisk kørsel. Mål: Over 66,5%.',
      'Motorbremse: Motorbremse vs. driftsbremse. Mere økonomisk og sikker. Mål: Over 56%.',
      'Tomgang: Tid i tomgang. Forbruger unødvendigt brændstof. Mål: Under 5%.'
    ];

    return `
      <div class="content-card">
        <div class="section-heading">Nøgletal</div>
          <table class="data-table">
            <thead>
              <tr>
                <th>Parameter</th>
              <th>Tidligere (${previousPeriodName})</th>
              <th>Nuværende</th>
                <th>Mål</th>
              <th>Udvikling siden sidst</th>
              </tr>
            </thead>
            <tbody>
            ${tableRows}
            </tbody>
          </table>
      </div>
      
      <div class="content-card">
        <div class="section-heading">Forklaring af nøgletal</div>
        <ul class="bullet-list">
          ${explanationBullets.map(text => `<li>${text}</li>`).join('')}
        </ul>
          </div>
    `;
  }

  /**
   * Genererer kompakt chauffør detaljer HTML med smart grid layout
   */
  private generateDriverDetailsHTML(driver: DriverData, previousData?: DriverData): string {
    return `
      <div class="driver-section">
        <div class="driver-heading">${driver.driver_name}</div>
        
        <div class="data-tables-grid-three">
          ${this.generateDataTableHTML(driver, this.driftsDataKolonner, 'Driftsdata')}
          ${this.generateDataTableHTML(driver, this.korselsDataKolonner, 'Kørselsdata')}
          ${this.generateDataTableHTML(driver, this.tomgangsDataKolonner, 'Tomgangsdata')}
        </div>
        
        ${this.generateMetricsTableHTML(driver, previousData)}
        </div>
      `;
  }

  /**
   * Genererer komplet HTML dokument - identisk struktur med Python og Word
   */
  private generateHTML(): string {
    console.log(`${LOG_PREFIXES.form} Genererer HTML indhold for PDF rapport...`);
    
    let driversHTML = '';
    
    // Håndter forskellige rapport typer - identisk med Python logik
    switch (this.config.reportType) {
      case 'samlet':
        // Generer for alle kvalificerede chauffører med sammenligning
        driversHTML = this.config.drivers.map(driver => {
          const previousDriver = this.config.previousDrivers?.find(pd => pd.driver_name === driver.driver_name);
          return this.generateDriverDetailsHTML(driver, previousDriver);
        }).join('');
        break;
        
      case 'gruppe':
        // Generer for alle chauffører i gruppen med sammenligning
        driversHTML = this.config.drivers.map(driver => {
          const previousDriver = this.config.previousDrivers?.find(pd => pd.driver_name === driver.driver_name);
          return this.generateDriverDetailsHTML(driver, previousDriver);
    }).join('');
        break;
        
      case 'individuel':
        // Generer kun for den valgte chauffør med sammenligning
        const selectedDriver = this.config.drivers.find(d => d.driver_name === this.config.selectedDriver);
        if (selectedDriver) {
          const previousDriver = this.config.previousDrivers?.find(pd => pd.driver_name === selectedDriver.driver_name);
          driversHTML = this.generateDriverDetailsHTML(selectedDriver, previousDriver);
        }
        break;
    }

    return `
      <!DOCTYPE html>
      <html lang="da">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fiskelogistik Chaufførrapport - ${this.config.period}</title>
        ${this.generateCSS()}
      </head>
      <body>
        ${this.generateFrontPage()}
        ${this.generateOverallRankingHTML()}
        ${this.generatePerformanceRankingHTML()}
        ${driversHTML}
      </body>
      </html>
    `;
  }

  /**
   * Genererer PDF rapport med fixet viewport - konverterer HTML til PDF
   */
  public async generateReport(): Promise<Buffer> {
    console.log(`${LOG_PREFIXES.form} Starter PDF rapport generering for ${this.config.reportType} rapport...`);
    
    try {
      // Generer HTML indhold
      const html = this.generateHTML();
      
      // Opret browser instance til PDF konvertering med forbedret kvalitet
      const browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox', 
          '--disable-setuid-sandbox', 
          '--disable-dev-shm-usage',
          '--disable-web-security',
          '--disable-features=VizDisplayCompositor'
        ]
      });

      const page = await browser.newPage();
      
      // Fixed viewport for at undgå sorte striber
      await page.setViewport({ 
        width: 794,  // A4 bredde i pixels (210mm ved 96 DPI)
        height: 1123, // A4 højde i pixels (297mm ved 96 DPI)
        deviceScaleFactor: 2 // Højere DPI for skarpere tekst
      });

      // Indlæs HTML med forbedret encoding
      await page.setContent(html, { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });

      // Generer PDF med optimerede indstillinger for at undgå sorte striber
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '1.5cm',
          bottom: '1.5cm',
          left: '1.5cm',
          right: '1.5cm'
        },
        printBackground: true,
        preferCSSPageSize: true,
        displayHeaderFooter: false,
        scale: 1.0,
        // Fix for sort stribe
        width: '210mm',
        height: '297mm'
      }) as Buffer;
      
      await browser.close();
      
      console.log(`${LOG_PREFIXES.success} PDF rapport genereret succesfuldt - ${pdfBuffer.length} bytes`);
      return pdfBuffer;
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Fejl ved PDF generering:`, error);
      throw new Error(`PDF generering fejlede: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
    }
  }

  /**
   * Genererer PDF filnavn - identisk med Python navngivning
   */
  public generateFilename(): string {
    console.log(`${LOG_PREFIXES.form} Genererer PDF filnavn for ${this.config.reportType} rapport...`);
    
    const monthNames = [
      'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'December'
    ];
    
    const month = this.config.month ? monthNames[this.config.month - 1] : 'Ukendt';
    const year = this.config.year || new Date().getFullYear();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    
    let filename = `Fiskelogistik_Chaufforrapport_${month}_${year}_${timestamp}.pdf`;
    
    if (this.config.reportType === 'individuel' && this.config.selectedDriver) {
      // Fjern ugyldige filnavn karakterer - identisk med Python sikker navngivning
      const safeName = this.config.selectedDriver.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_');
      filename = `Fiskelogistik_Chauffør_${safeName}_${month}_${year}_${timestamp}.pdf`;
    } else if (this.config.reportType === 'gruppe' && this.config.selectedGroup) {
      const safeGroupName = this.config.selectedGroup.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_');
      filename = `Fiskelogistik_Gruppe_${safeGroupName}_${month}_${year}_${timestamp}.pdf`;
    }
    
    console.log(`${LOG_PREFIXES.success} PDF filnavn genereret: ${filename}`);
    return filename;
  }
} 