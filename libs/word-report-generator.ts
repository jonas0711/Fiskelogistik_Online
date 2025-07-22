/**
 * Word Rapport Generator Service
 * Identisk med Python-applikationens word_report.py funktionalitet
 * Genererer professionelle Word-dokumenter med rigtige tabeller og korrekt docx struktur
 */

import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, PageBreak } from 'docx';
import { DriverData, CalculatedMetrics, calculateMetrics, calculateOverallRanking } from './report-utils';
import { LOG_PREFIXES } from '@/components/ui/icons/icon-config';

// Interface for Word rapport konfiguration
export interface WordReportConfig {
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

export class WordReportGenerator {
  private config: WordReportConfig;
  
  // Definer kolonne grupper - identisk med Python applikation
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

  constructor(config: WordReportConfig) {
    console.log(`${LOG_PREFIXES.form} Initialiserer Word Rapport Generator...`);
    this.config = config;
    console.log(`${LOG_PREFIXES.success} Word generator konfigureret for ${config.reportType} rapport med ${config.totalDrivers} chauffører`);
  }

  /**
   * Opretter rapportens forside med titel og dato - identisk med Python
   */
  private createFrontPage(): Paragraph[] {
    console.log(`${LOG_PREFIXES.form} Opretter forside for ${this.config.reportType} rapport...`);
    
    // OPRET TITEL PARAGRAPH - identisk med Python opret_forside()
    const titleText = this.config.selectedGroup 
      ? `Fiskelogistik\nChaufførrapport\n${this.config.selectedGroup}`
      : this.config.selectedDriver
      ? `Fiskelogistik\nChaufførrapport\n${this.config.selectedDriver}`
      : 'Fiskelogistik\nChaufførrapport';
    
    const title = new Paragraph({
      children: [
        new TextRun({
          text: titleText,
          size: 72, // 36pt * 2 (docx bruger half-points)
          bold: true,
          color: '1E90FF', // Blå farve (30, 144, 255) som i Python
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    });

    // PERIODE PARAGRAPH - identisk med Python
    const period = new Paragraph({
      children: [
        new TextRun({
          text: this.config.period,
          size: 48, // 24pt * 2
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    });

    // GENERERET DATO - identisk med Python
    const generatedDate = new Paragraph({
      children: [
        new TextRun({
          text: `Genereret: ${new Date(this.config.generatedAt).toLocaleDateString('da-DK', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}`,
          size: 22 // 11pt * 2
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    });

    // SIDESKIFT EFTER FORSIDE - identisk med Python
    const pageBreak = new Paragraph({
      children: [new PageBreak()]
    });

    console.log(`${LOG_PREFIXES.success} Forside oprettet for ${this.config.reportType} rapport`);
    return [title, period, generatedDate, pageBreak];
  }

  /**
   * Tilføjer en formateret sektionsoverskrift - identisk med Python tilfoej_sektion_overskrift()
   */
  private createSectionHeading(text: string): Paragraph {
    return new Paragraph({
      children: [
        new TextRun({
          text,
          bold: true,
          size: 32, // 16pt * 2
          color: '1E90FF', // Blå farve som i Python
        })
      ],
      spacing: { before: 200, after: 200 }
    });
  }

  /**
   * Opretter samlet rangering baseret på fire hovedparametre - identisk med Python opret_samlet_rangering()
   */
  private createOverallRankingTable(): (Paragraph | Table)[] {
    console.log(`${LOG_PREFIXES.form} Opretter samlet rangering tabel med ${this.config.overallRanking.length} chauffører...`);
    
    const elements: (Paragraph | Table)[] = [];
    
    // TILFØJ SEKTIONSOVERSKRIFT
    elements.push(this.createSectionHeading('Samlet Performance Rangering'));

    // INTRO TEKST MED DETALJERET FORKLARING - forbedret med punktopstilling
    const performanceBullets = [
      'Tomgang: Mål på max 5% - Minimering af unødvendig tomgangskørsel',
      'Fartpilot: Mål på minimum 66,5% - Optimal brug af fartpilot ved højere hastigheder',
      'Motorbremse: Mål på minimum 56% - Effektiv brug af motorbremsning',
      'Påløbsdrift: Mål på minimum 7% - Udnyttelse af køretøjets momentum'
    ];
    const introParagraphs = [
      new Paragraph({
        children: [
          new TextRun({
            text: 'Den samlede rangering kombinerer præstationen på fire nøgleområder med følgende virksomhedsmål:',
            size: 22
          })
        ],
        spacing: { after: 100 }
      }),
      ...performanceBullets.map(text =>
        new Paragraph({
          children: [new TextRun({ text, size: 22 })],
          bullet: { level: 0 },
          spacing: { after: 50 }
        })
      ),
      new Paragraph({
        children: [
          new TextRun({
            text: 'Hver chauffør får points baseret på deres placering i hver kategori. Lavere samlet score er bedre, da det betyder bedre placeringer på tværs af kategorierne. De tre bedste chauffører er markeret med grøn for at fremhæve særligt god præstation. Målene er sat af virksomheden og bruges som reference for optimal kørsel.',
            size: 22
          })
        ],
        spacing: { after: 300 }
      })
    ];
    elements.push(...introParagraphs);

    // OPRET RANGERINGS TABEL - identisk med Python struktur
    const tableRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Placering', bold: true })]
            })],
            shading: { fill: 'E0E0E0' },
            width: { size: 10, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Chauffør', bold: true })]
            })],
            shading: { fill: 'E0E0E0' },
            width: { size: 30, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Samlet Score', bold: true })]
            })],
            shading: { fill: 'E0E0E0' },
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Tomgang', bold: true })]
            })],
            shading: { fill: 'E0E0E0' },
            width: { size: 11.25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Fartpilot', bold: true })]
            })],
            shading: { fill: 'E0E0E0' },
            width: { size: 11.25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Motorbremse', bold: true })]
            })],
            shading: { fill: 'E0E0E0' },
            width: { size: 11.25, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Påløbsdrift', bold: true })]
            })],
            shading: { fill: 'E0E0E0' },
            width: { size: 11.25, type: WidthType.PERCENTAGE }
          })
        ]
      })
    ];

    // TILFØJ DATA MED TOP 3 FARVEMARKERING - identisk med Python logik
    this.config.overallRanking.forEach((driver, index) => {
      const isTop3 = index < 3; // TOP 3 CHAUFFØRER MARKERES MED GRØN
      const textColor = isTop3 ? '008000' : '000000'; // Grøn for top 3, sort for resten
      
      const row = new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({
                text: String(index + 1),
                color: textColor,
                bold: isTop3
              })]
            })]
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({
                text: driver.driver,
                color: textColor,
                bold: isTop3
              })]
            })]
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({
                text: String(driver.totalScore),
                color: textColor,
                bold: isTop3
              })]
            })]
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({
                text: String(driver.rankings.Tomgangsprocent),
                color: textColor,
                bold: isTop3
              })]
            })]
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({
                text: String(driver.rankings['Fartpilot Andel']),
                color: textColor,
                bold: isTop3
              })]
            })]
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({
                text: String(driver.rankings['Motorbremse Andel']),
                color: textColor,
                bold: isTop3
              })]
            })]
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({
                text: String(driver.rankings['Påløbsdrift Andel']),
                color: textColor,
                bold: isTop3
              })]
            })]
          })
        ]
      });
      tableRows.push(row);
    });

    const table = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: tableRows,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1 }
      }
    });
    
    elements.push(table);
    elements.push(new Paragraph({ text: '', spacing: { after: 400 } }));
    
    // SIDESKIFT EFTER RANGERING - identisk med Python
    elements.push(new Paragraph({ children: [new PageBreak()] }));
    
    console.log(`${LOG_PREFIXES.success} Samlet rangering tabel oprettet med ${this.config.overallRanking.length} chauffører`);
    return elements;
  }

  /**
   * Opretter performance rangering for hver nøgletalskategori - identisk med Python opret_performance_rangering()
   */
  private createPerformanceRankingTables(): (Paragraph | Table)[] {
    console.log(`${LOG_PREFIXES.form} Opretter performance rangering tabeller...`);
    
    const elements: (Paragraph | Table)[] = [];
    
    // TILFØJ SEKTIONSOVERSKRIFT
    elements.push(this.createSectionHeading('Performance Rangering'));

    // INTRO TEKST - identisk med Python
    const introText = new Paragraph({
      children: [
        new TextRun({
          text: 'Nedenstående tabeller viser rangeringen af chauffører baseret på forskellige ' +
                'performancemålinger. Hver tabel fokuserer på et specifikt område af kørepræstation ' +
                'og hjælper med at identificere styrker og forbedringspotentialer.',
          size: 24 // 12pt * 2
        })
      ],
      spacing: { after: 400 }
    });

    elements.push(introText);

    // BEREGN NØGLETAL FOR ALLE CHAUFFØRER
    const driversWithMetrics = this.config.drivers.map(driver => ({
      driver: driver.driver_name,
      metrics: calculateMetrics(driver)
    }));

    // DEFINER NØGLETAL TIL PERFORMANCE RANGERING - identisk med Python
    const performanceMetrics = {
      'Tomgangsprocent': {
        title: 'Tomgangsprocent',
        higherIsBetter: false, // Lavere er bedre
        unit: '%',
        description: 'Procentdel af total motordriftstid brugt i tomgang. Lavere værdi indikerer mere effektiv kørsel.',
        target: 5.0
      },
      'Fartpilot Andel': {
        title: 'Fartpilot Anvendelse',
        higherIsBetter: true, // Højere er bedre
        unit: '%',
        description: 'Procentdel af køretid hvor fartpilot er anvendt ved højere hastigheder. Højere værdi betyder mere økonomisk kørsel.',
        target: 66.5
      },
      'Motorbremse Andel': {
        title: 'Motorbremse Anvendelse',
        higherIsBetter: true, // Højere er bedre
        unit: '%',
        description: 'Procentdel af bremsning udført med motorbremse frem for driftsbremse. Højere værdi er mere effektivt.',
        target: 56.0
      },
      'Påløbsdrift Andel': {
        title: 'Påløbsdrift Udnyttelse',
        higherIsBetter: true, // Højere er bedre
        unit: '%',
        description: 'Procentdel af køretid i påløbsdrift hvor køretøjet ruller frit. Højere værdi sparer brændstof.',
        target: 7.0
      }
    };

    // OPRET EN TABEL FOR HVERT NØGLETAL - identisk med Python struktur
    Object.entries(performanceMetrics).forEach(([metricKey, config]) => {
      // TITEL OG BESKRIVELSE
      const titleParagraph = new Paragraph({
        children: [
          new TextRun({
            text: `\n${config.title}`,
            bold: true,
            size: 28 // 14pt * 2
          })
        ],
        spacing: { before: 300, after: 200 }
      });

      const descriptionParagraph = new Paragraph({
        children: [
          new TextRun({
            text: config.description,
            size: 22, // 11pt * 2
            italics: true
          })
        ],
        spacing: { after: 200 }
      });

      elements.push(titleParagraph);
      elements.push(descriptionParagraph);

      // SORTER CHAUFFØRER EFTER NØGLETAL - identisk med Python logik
      const sortedDrivers = driversWithMetrics
        .map(dm => ({
          driver: dm.driver,
          value: dm.metrics[metricKey as keyof CalculatedMetrics] || 0
        }))
        .sort((a, b) => config.higherIsBetter ? b.value - a.value : a.value - b.value);

      // OPRET TABEL FOR DETTE NØGLETAL
      const tableRows: TableRow[] = [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: 'Placering', bold: true })]
              })],
              shading: { fill: 'E0E0E0' },
              width: { size: 20, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: 'Chauffør', bold: true })]
              })],
              shading: { fill: 'E0E0E0' },
              width: { size: 50, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph({ 
                children: [new TextRun({ text: `Score (${config.unit})`, bold: true })]
              })],
              shading: { fill: 'E0E0E0' },
              width: { size: 30, type: WidthType.PERCENTAGE }
            })
          ]
        })
      ];

      // TILFØJ DATA MED FARVEMARKERING FOR MÅL - identisk med Python
      sortedDrivers.forEach((item, index) => {
        const meetsTarget = config.target ? 
          (config.higherIsBetter ? item.value >= config.target : item.value <= config.target) : 
          false;
        
        const textColor = meetsTarget ? '008000' : '000000'; // Grøn hvis målet opfyldes
        const scoreText = `${item.value.toFixed(1)}${config.unit}`;
        
        const row = new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: String(index + 1),
                  color: textColor,
                  bold: meetsTarget
                })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: item.driver,
                  color: textColor,
                  bold: meetsTarget
                })]
              })]
            }),
            new TableCell({
              children: [new Paragraph({
                children: [new TextRun({
                  text: scoreText,
                  color: textColor,
                  bold: meetsTarget
                })]
              })]
            })
          ]
        });
        tableRows.push(row);
      });

      const table = new Table({
        width: {
          size: 100,
          type: WidthType.PERCENTAGE,
        },
        rows: tableRows,
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
          insideVertical: { style: BorderStyle.SINGLE, size: 1 }
        }
      });
      
      elements.push(table);
      elements.push(new Paragraph({ text: '', spacing: { after: 400 } }));
    });

    // SIDESKIFT EFTER PERFORMANCE RANGERING - identisk med Python
    elements.push(new Paragraph({ children: [new PageBreak()] }));
    
    console.log(`${LOG_PREFIXES.success} Performance rangering tabeller oprettet`);
    return elements;
  }

  /**
   * Opretter en tabel med specificerede data - identisk med Python opret_data_tabel()
   */
  private createDataTable(driverData: DriverData, columns: string[], title: string): (Paragraph | Table)[] {
    console.log(`${LOG_PREFIXES.form} Opretter data tabel: ${title} for ${driverData.driver_name}`);
    
    const elements: (Paragraph | Table)[] = [];
    
    // TILFØJ SEKTIONSOVERSKRIFT
    elements.push(this.createSectionHeading(title));

    // MAPPING AF KOLONNER TIL DATABASE FELTER - baseret på Python struktur
    const dataMapping: { [key: string]: any } = {
      // Driftsdata - mapping til database felter ifølge data.md
      'Ø Forbrug [l/100km]': driverData.avg_consumption_per_100km?.toFixed(1) || 'N/A',
      'Ø Rækkevidde ved forbrug [km/l]': driverData.avg_range_per_consumption?.toFixed(2) || 'N/A',
      'Ø Forbrug ved kørsel [l/100km]': driverData.avg_consumption_driving?.toFixed(1) || 'N/A',
      'Forbrug [l]': driverData.total_consumption?.toFixed(0) || 'N/A',
      'Kørestrækning [km]': driverData.driving_distance?.toFixed(0) || 'N/A',
      'Ø totalvægt [t]': driverData.avg_total_weight?.toFixed(1) || 'N/A',
      
      // Kørselsdata - mapping til database felter ifølge data.md
      'Aktiv påløbsdrift (km) [km]': driverData.active_coasting_km?.toFixed(0) || 'N/A',
      'Afstand i påløbsdrift [km]': driverData.coasting_distance?.toFixed(0) || 'N/A',
      'Kickdown (km) [km]': driverData.kickdown_km?.toFixed(0) || 'N/A',
      'Afstand med kørehastighedsregulering (> 50 km/h) [km]': driverData.cruise_distance_over_50?.toFixed(0) || 'N/A',
      'Afstand > 50 km/h uden kørehastighedsregulering [km]': driverData.distance_over_50_without_cruise?.toFixed(0) || 'N/A',
      'Forbrug med kørehastighedsregulering [l/100km]': driverData.consumption_with_cruise?.toFixed(1) || 'N/A',
      'Forbrug uden kørehastighedsregulering [l/100km]': driverData.consumption_without_cruise?.toFixed(1) || 'N/A',
      'Driftsbremse (km) [km]': driverData.service_brake_km?.toFixed(0) || 'N/A',
      'Afstand motorbremse [km]': driverData.engine_brake_distance?.toFixed(0) || 'N/A',
      'Overspeed (km uden påløbsdrift) [km]': driverData.overspeed_km_without_coasting?.toFixed(0) || 'N/A',
      
      // Tomgangsdata - mapping til database felter ifølge data.md
      'Motordriftstid [hh:mm:ss]': driverData.engine_runtime || 'N/A',
      'Køretid [hh:mm:ss]': driverData.driving_time || 'N/A',
      'Tomgang / stilstandstid [hh:mm:ss]': driverData.idle_standstill_time || 'N/A'
    };

    // OPRET TABEL MED 1 RÆKKE OG 2 KOLONNER - identisk med Python
    const tableRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Parameter', bold: true })]
            })],
            width: { size: 60, type: WidthType.PERCENTAGE },
            shading: { fill: 'E0E0E0' } // GRÅ BAGGRUND
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Værdi', bold: true })]
            })],
            width: { size: 40, type: WidthType.PERCENTAGE },
            shading: { fill: 'E0E0E0' } // GRÅ BAGGRUND
          })
        ]
      })
    ];

    // TILFØJ DATA RÆKKER - identisk med Python
    columns.forEach(column => {
      const row = new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: column })],
            width: { size: 60, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ text: String(dataMapping[column]) })],
            width: { size: 40, type: WidthType.PERCENTAGE }
          })
        ]
      });
      tableRows.push(row);
    });

    const table = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: tableRows,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1 }
      }
    });

    elements.push(table);
    elements.push(new Paragraph({ text: '', spacing: { after: 300 } })); // EKSTRA LINIE EFTER TABEL
    
    console.log(`${LOG_PREFIXES.success} Data tabel oprettet: ${title}`);
    return elements;
  }

  /**
   * Opretter nøgletal tabel med sammenligning - identisk med Python opret_noegletal_tabel()
   */
  private createMetricsTable(driverData: DriverData, previousData?: DriverData): (Paragraph | Table)[] {
    console.log(`${LOG_PREFIXES.form} Opretter nøgletal tabel for ${driverData.driver_name}...`);
    
    const metrics = calculateMetrics(driverData);
    const previousMetrics = previousData ? calculateMetrics(previousData) : null;
    const elements: (Paragraph | Table)[] = [];
    
    // TILFØJ SEKTIONSOVERSKRIFT
    elements.push(this.createSectionHeading('Nøgletal'));

    // NØGLETAL KONFIGURATION MED MÅL OG RETNING - identisk med Python
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

    // Bestem tidligere periode navne baseret på faktiske data
    let previousPeriodName = 'Tidligere periode';
    if (previousData) {
      const monthNames = [
        'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
        'Juli', 'August', 'September', 'Oktober', 'November', 'December'
      ];
      
      // Brug de faktiske måned/år fra de fundne data
      if (previousData.month && previousData.year) {
        previousPeriodName = `${monthNames[previousData.month - 1]} ${previousData.year}`;
      }
    } else {
      previousPeriodName = 'Ny chauffør';
    }

    // OPRET TABEL MED 5 KOLONNER - identisk med Python sammenligning
    const tableRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Parameter', bold: true })]
            })],
            shading: { fill: 'E0E0E0' },
            width: { size: 35, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: `Tidligere (${previousPeriodName})`, bold: true })]
            })],
            shading: { fill: 'E0E0E0' },
            width: { size: 18, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Nuværende', bold: true })]
            })],
            shading: { fill: 'E0E0E0' },
            width: { size: 18, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Mål', bold: true })]
            })],
            shading: { fill: 'E0E0E0' },
            width: { size: 15, type: WidthType.PERCENTAGE }
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ text: 'Udvikling siden sidst', bold: true })]
            })],
            shading: { fill: 'E0E0E0' },
            width: { size: 14, type: WidthType.PERCENTAGE }
          })
        ]
      })
    ];

    // TILFØJ NØGLETAL DATA MED SAMMENLIGNING - identisk med Python
    Object.entries(metricsConfig).forEach(([metricName, config]) => {
      const currentValue = metrics[metricName as keyof CalculatedMetrics] || 0;
      const previousValue = previousMetrics ? (previousMetrics[metricName as keyof CalculatedMetrics] || 0) : 0;
      
      const formattedCurrent = config.format(currentValue);
      const formattedPrevious = previousMetrics ? config.format(previousValue) : 'Ny chauffør';
      
      // Beregn procentændring og bestem farve
      let changeText = '';
      let changeColor = '000000'; // Sort som standard
      
      if (previousMetrics && previousValue !== 0) {
        const change = ((currentValue - previousValue) / previousValue) * 100;
        const isImprovement = config.higherIsBetter ? change > 0 : change < 0;
        
        changeColor = isImprovement ? '008000' : 'FF0000'; // Grøn for forbedring, rød for forværring
        changeText = `${change >= 0 ? '+' : ''}${change.toFixed(1)}%`;
      } else if (previousMetrics && previousValue === 0) {
        changeText = 'Ikke målbar';
        changeColor = '808080'; // Grå
      } else {
        changeText = 'Ny chauffør';
        changeColor = '0066CC'; // Blå for ny chauffør
      }
      
      const row = new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ text: config.explanation })]
          }),
          new TableCell({
            children: [new Paragraph({ text: formattedPrevious })]
          }),
          new TableCell({
            children: [new Paragraph({ text: formattedCurrent })]
          }),
          new TableCell({
            children: [new Paragraph({ text: config.target })]
          }),
          new TableCell({
            children: [new Paragraph({ 
              children: [new TextRun({ 
                text: changeText,
                color: changeColor,
                bold: changeText !== 'Ny chauffør' && changeText !== 'Ikke målbar'
              })]
            })]
          })
        ]
      });
      tableRows.push(row);
    });

    const table = new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: tableRows,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1 },
        bottom: { style: BorderStyle.SINGLE, size: 1 },
        left: { style: BorderStyle.SINGLE, size: 1 },
        right: { style: BorderStyle.SINGLE, size: 1 },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
        insideVertical: { style: BorderStyle.SINGLE, size: 1 }
      }
    });
    
    elements.push(table);
    elements.push(new Paragraph({ text: '', spacing: { after: 400 } }));

    // DETALJEREDE FORKLARINGER - forbedret layout med punktopstilling
    const explanationBullets = [
      'Påløbsdrift: Kørsels distance uden at bruge bremser eller speeder. Dette er når køretøjet ruller frit, hvilket sparer brændstof. En højere procent er bedre, da det viser effektiv udnyttelse af køretøjets momentum. Mål: Over 7%. God påløbsdrift opnås ved at rulle og begrænse pedalbrug.',
      'Fartpilot Anvendelse: Hvor meget fartpiloten bruges ved hastigheder over 50 km/t. En højere procent er bedre, da det giver mere jævn og økonomisk kørsel. Mål: Over 66,5%.',
      'Motorbremse: Hvor meget motorbremse bruges i forhold til driftsbremse. En højere procent er bedre, da motorbremse er mere økonomisk og sikker. Mål: Over 56%.',
      'Tomgang: Hvor meget tid køretøjet står i tomgang. En lavere procent er bedre, da tomgang forbruger unødvendigt brændstof. Mål: Under 5%.'
    ];
    elements.push(
      new Paragraph({
        children: [
          new TextRun({ text: 'Forklaring af nøgletal', bold: true, size: 28 }), // 14pt
        ],
        spacing: { after: 200 }
      }),
      ...explanationBullets.map(text =>
        new Paragraph({
          children: [new TextRun({ text, size: 22, italics: true })],
          bullet: { level: 0 },
          spacing: { after: 100 }
        })
      ),
      new Paragraph({ text: '', spacing: { after: 400 } })
    );

    console.log(`${LOG_PREFIXES.success} Nøgletal tabel oprettet for ${driverData.driver_name}`);
    return elements;
  }

  /**
   * Opretter detaljerede chaufførdata - identisk med Python struktur
   */
  private createDriverDetails(driver: DriverData, previousData?: DriverData): (Paragraph | Table)[] {
    console.log(`${LOG_PREFIXES.form} Opretter detaljer for ${driver.driver_name}...`);
    
    const elements: (Paragraph | Table)[] = [];
    
    // CHAUFFØR OVERSKRIFT - identisk med Python
    const driverHeading = new Paragraph({
      children: [
        new TextRun({
          text: driver.driver_name,
          color: '1E90FF', // Blå farve
          size: 36, // 18pt * 2
          bold: true
        })
      ],
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 300 }
    });

    elements.push(driverHeading);

    // OPRET TABELLER FOR HVER DATASEKTION - identisk med Python struktur
    elements.push(...this.createDataTable(driver, this.driftsDataKolonner, 'Driftsdata'));
    elements.push(...this.createDataTable(driver, this.korselsDataKolonner, 'Kørselsdata'));
    elements.push(...this.createDataTable(driver, this.tomgangsDataKolonner, 'Tomgangsdata'));

    // TILFØJ NØGLETAL MED SAMMENLIGNING
    elements.push(...this.createMetricsTable(driver, previousData));

    // SIDESKIFT MELLEM CHAUFFØRER - identisk med Python
    elements.push(new Paragraph({ children: [new PageBreak()] }));
    
    console.log(`${LOG_PREFIXES.success} Detaljer oprettet for ${driver.driver_name}`);
    return elements;
  }

  /**
   * Genererer Word rapport - identisk med Python generer_rapport() struktur
   */
  public async generateReport(): Promise<Buffer> {
    console.log(`${LOG_PREFIXES.form} Starter Word rapport generering for ${this.config.reportType} rapport...`);
    
    try {
      const allElements: (Paragraph | Table)[] = [];
      
      // OPRET FORSIDE
      allElements.push(...this.createFrontPage());

      // OPRET SAMLET RANGERING - identisk med Python tilfoej_samlet_rangering()
      allElements.push(...this.createOverallRankingTable());

      // OPRET PERFORMANCE RANGERING - identisk med Python opret_performance_rangering()
      allElements.push(...this.createPerformanceRankingTables());

      // HÅNDTER FORSKELLIGE RAPPORT TYPER - identisk med Python logik
      switch (this.config.reportType) {
        case 'samlet':
          // OPRET DETALJER FOR ALLE KVALIFICEREDE CHAUFFØRER MED SAMMENLIGNING
          this.config.drivers.forEach(driver => {
            const previousDriver = this.config.previousDrivers?.find(pd => pd.driver_name === driver.driver_name);
            allElements.push(...this.createDriverDetails(driver, previousDriver));
          });
          break;
          
        case 'gruppe':
          // OPRET DETALJER FOR ALLE CHAUFFØRER I GRUPPEN MED SAMMENLIGNING
          this.config.drivers.forEach(driver => {
            const previousDriver = this.config.previousDrivers?.find(pd => pd.driver_name === driver.driver_name);
            allElements.push(...this.createDriverDetails(driver, previousDriver));
          });
          break;
          
        case 'individuel':
          // OPRET DETALJER KUN FOR DEN VALGTE CHAUFFØR MED SAMMENLIGNING
          const selectedDriver = this.config.drivers.find(d => d.driver_name === this.config.selectedDriver);
          if (selectedDriver) {
            const previousDriver = this.config.previousDrivers?.find(pd => pd.driver_name === selectedDriver.driver_name);
            allElements.push(...this.createDriverDetails(selectedDriver, previousDriver));
          }
          break;
      }

      // OPRET WORD DOKUMENT MED KORREKT FORMATTERING
      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: {
                top: 1440,    // 1 tomme
                right: 1440,
                bottom: 1440,
                left: 1440
              }
            }
          },
          children: allElements
        }]
      });

      // GENERER WORD DOKUMENT
      const buffer = await Packer.toBuffer(doc);
      
      console.log(`${LOG_PREFIXES.success} Word rapport genereret succesfuldt - ${buffer.length} bytes`);
      return buffer;
      
    } catch (error) {
      console.error(`${LOG_PREFIXES.error} Fejl ved Word rapport generering:`, error);
      throw new Error(`Fejl ved Word rapport generering: ${error instanceof Error ? error.message : 'Ukendt fejl'}`);
    }
  }

  /**
   * Genererer filnavn - identisk med Python navngivning
   */
  public generateFilename(): string {
    console.log(`${LOG_PREFIXES.form} Genererer filnavn for ${this.config.reportType} rapport...`);
    
    const monthNames = [
      'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'December'
    ];
    
    const month = this.config.month ? monthNames[this.config.month - 1] : 'Ukendt';
    const year = this.config.year || new Date().getFullYear();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '').slice(0, 15);
    
    let filename = `Fiskelogistik_Chaufforrapport_${month}_${year}_${timestamp}.docx`;
    
    if (this.config.reportType === 'individuel' && this.config.selectedDriver) {
      // FJERN UGYLDIGE FILNAVN KARAKTERER - identisk med Python sikker navngivning
      const safeName = this.config.selectedDriver.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_');
      filename = `Fiskelogistik_Chauffør_${safeName}_${month}_${year}_${timestamp}.docx`;
    } else if (this.config.reportType === 'gruppe' && this.config.selectedGroup) {
      const safeGroupName = this.config.selectedGroup.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_');
      filename = `Fiskelogistik_Gruppe_${safeGroupName}_${month}_${year}_${timestamp}.docx`;
    }
    
    console.log(`${LOG_PREFIXES.success} Filnavn genereret: ${filename}`);
    return filename;
  }
} 