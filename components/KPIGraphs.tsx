/**
 * KPI Grafer Komponent
 * Implementeret baseret på Python-version med Chart.js
 * Viser interaktive grafer for hver KPI med trendlinjer og målområder
 */

'use client';

import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Registrer Chart.js komponenter
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  annotationPlugin
);

// Interface for historisk data
interface HistoricalData {
  month: number;
  year: number;
  data: {
    idlePercentage: number;
    cruiseControlPercentage: number;
    engineBrakePercentage: number;
    coastingPercentage: number;
    dieselEfficiency: number;
    weightAdjustedConsumption: number;
    overspeedPercentage: number;
    co2Efficiency: number;
  };
}

// KPI konfiguration (som Python-versionen)
interface KPIConfig {
  [key: string]: {
    navn: string;
    beskrivelse: string;
    format: string;
    maal_min?: number;
    maal_max?: number;
    hoejere_er_bedre: boolean;
    enhed: string;
  };
}

interface KPIGraphsProps {
  historicalData: HistoricalData[];
}

export default function KPIGraphs({ historicalData }: KPIGraphsProps) {
  console.log('📊 Initialiserer KPI Grafer komponent...');
  console.log('📈 Historisk data for grafer:', historicalData.length, 'måneder');

  // KPI konfiguration (som Python-versionen) - tilpasset data.md
  const kpiConfig: KPIConfig = useMemo(() => ({
    idlePercentage: {
      navn: 'Tomgangsprocent',
      beskrivelse: 'Procentdel af tid i tomgang i forhold til total motordriftstid (idle_standstill_time / engine_runtime)',
      format: '{:.1f}%',
      maal_min: 0,
      maal_max: 5,
      hoejere_er_bedre: false,
      enhed: '%'
    },
    cruiseControlPercentage: {
      navn: 'Fartpilot Andel',
      beskrivelse: 'Andel af kørsel med fartpilot aktiveret over 50 km/h (cruise_distance_over_50 / total distance over 50)',
      format: '{:.1f}%',
      maal_min: 66.5,
      maal_max: 100,
      hoejere_er_bedre: true,
      enhed: '%'
    },
    engineBrakePercentage: {
      navn: 'Motorbremse Andel',
      beskrivelse: 'Andel af bremsning der sker via motorbremse i stedet for driftsbremse (engine_brake_distance / total brake distance)',
      format: '{:.1f}%',
      maal_min: 56,
      maal_max: 100,
      hoejere_er_bedre: true,
      enhed: '%'
    },
    coastingPercentage: {
      navn: 'Påløbsdrift Andel',
      beskrivelse: 'Andel af kørsel i påløbsdrift (active_coasting_km + coasting_distance / driving_distance)',
      format: '{:.1f}%',
      maal_min: 7,
      maal_max: 100,
      hoejere_er_bedre: true,
      enhed: '%'
    },
    dieselEfficiency: {
      navn: 'Diesel Effektivitet',
      beskrivelse: 'Brændstofeffektivitet målt i kilometer per liter (driving_distance / total_consumption)',
      format: '{:.2f} km/l',
      hoejere_er_bedre: true,
      enhed: 'km/l'
    },
    weightAdjustedConsumption: {
      navn: 'Vægtkorrigeret Forbrug',
      beskrivelse: 'Brændstofforbrug justeret for køretøjets vægt ((total_consumption / driving_distance) * 100 / avg_total_weight)',
      format: '{:.3f} l/100km/t',
      hoejere_er_bedre: false,
      enhed: 'l/100km/t'
    },
    overspeedPercentage: {
      navn: 'Overspeed Andel',
      beskrivelse: 'Andel af kørsel over hastighedsgrænsen uden påløbsdrift (overspeed_km_without_coasting / driving_distance)',
      format: '{:.1f}%',
      hoejere_er_bedre: false,
      enhed: '%'
    },
    co2Efficiency: {
      navn: 'CO₂ Effektivitet',
      beskrivelse: 'CO₂-udledning per ton-km (co2_emission / driving_distance / avg_total_weight)',
      format: '{:.4f} kg CO₂/ton-km',
      hoejere_er_bedre: false,
      enhed: 'kg CO₂/ton-km'
    }
  }), []);

  /**
   * Formaterer dato labels (som Python-versionen)
   */
  const formatDateLabels = (dates: string[]): string[] => {
    return dates.map(date => {
      // Fjern årstal fra visningen hvis det er samme år
      if (date.includes('2024')) {
        return date.replace(' 2024', '');
      } else if (date.includes('2023')) {
        return date.replace(' 2023', "'23");
      }
      return date;
    });
  };

  /**
   * Opretter graf data for en specifik KPI
   */
  const createGraphData = (kpiName: string) => {
    const config = kpiConfig[kpiName];
    console.log(`📊 Opretter graf data for ${kpiName}...`);

    // Sorter data kronologisk (nyeste først, som Python)
    const sortedData = [...historicalData].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });

    // Vend rækkefølgen for visning (ældste først på x-aksen)
    const reversedData = sortedData.reverse();

    // Månedsnavne
    const monthNames = [
      'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
      'Juli', 'August', 'September', 'Oktober', 'November', 'December'
    ];

    // Opret labels og værdier
    const labels = reversedData.map(item => {
      const monthName = monthNames[item.month - 1];
      return `${monthName} ${item.year}`;
    });

    const values = reversedData.map(item => item.data[kpiName as keyof typeof item.data]);

    // Formater labels (fjern årstal hvis samme år)
    const formattedLabels = formatDateLabels(labels);

    console.log(`✅ Graf data for ${kpiName}:`, {
      labels: formattedLabels,
      values: values.map(v => v.toFixed(2))
    });

    // Opret dynamiske punktfarver baseret på målområde
    const pointColors = values.map(value => {
      if (config.maal_min !== undefined && config.maal_max !== undefined) {
        if (config.hoejere_er_bedre) {
          if (value >= config.maal_min && value <= config.maal_max) {
            return '#1F7D3A'; // Grøn for inden for mål
          } else if (value < config.maal_min) {
            return '#B25B00'; // Orange for under mål
          } else {
            return '#A3242A'; // Rød for over mål
          }
        } else {
          if (value <= config.maal_max) {
            return '#1F7D3A'; // Grøn for inden for mål
          } else {
            return '#A3242A'; // Rød for over mål
          }
        }
      }
      return '#0268AB'; // Standard brand blå
    });

    return {
      labels: formattedLabels,
      datasets: [
        {
          label: 'Faktisk værdi',
          data: values,
          borderColor: '#024A7D', // Primary 700 - mørkere blå
          backgroundColor: 'rgba(2, 74, 125, 0.06)',
          borderWidth: 3,
          pointBackgroundColor: pointColors,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 3,
          pointRadius: 8,
          pointHoverRadius: 14,
          pointHoverBorderWidth: 4,
          pointHoverBackgroundColor: '#1FB1B1', // Accent Aqua på hover
          fill: true,
          tension: 0.3
        }
      ]
    };
  };

    /**
   * Opretter graf options med styling (som Python-versionen)
   */
  const createGraphOptions = (kpiName: string) => {
    const config = kpiConfig[kpiName];
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12
            },
            color: '#024A7D'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          titleColor: '#024A7D',
          bodyColor: '#1A2228',
          borderColor: '#1FB1B1',
          borderWidth: 2,
          cornerRadius: 16,
          displayColors: false,
          titleFont: {
            size: 14
          },
          bodyFont: {
            size: 13
          },
          padding: 16,
          callbacks: {
            title: (context: any) => {
              return context[0].label;
            },
            label: (context: any) => {
              const value = context.parsed.y;
              // Bestem antal decimaler baseret på enhed
              let decimals = 2;
              if (config.enhed.includes('CO₂')) {
                decimals = 4;
              } else if (config.enhed.includes('l/100km/t')) {
                decimals = 3;
              } else if (config.enhed.includes('%')) {
                decimals = 1;
              }
              
              let tooltipText = `${config.navn}: ${value.toFixed(decimals)} ${config.enhed}`;
              
              // Tilføj information om afstand til målområde
              if (config.maal_min !== undefined && config.maal_max !== undefined) {
                if (config.hoejere_er_bedre) {
                  if (value < config.maal_min) {
                    const distance = config.maal_min - value;
                    tooltipText += `\n📉 ${distance.toFixed(decimals)} ${config.enhed} under mål`;
                  } else if (value > config.maal_max) {
                    const distance = value - config.maal_max;
                    tooltipText += `\n📈 ${distance.toFixed(decimals)} ${config.enhed} over mål`;
                  } else {
                    tooltipText += `\n✅ Inden for målområde`;
                  }
                } else {
                  if (value > config.maal_max) {
                    const distance = value - config.maal_max;
                    tooltipText += `\n📈 ${distance.toFixed(decimals)} ${config.enhed} over mål`;
                  } else {
                    tooltipText += `\n✅ Inden for målområde`;
                  }
                }
              }
              
              return tooltipText;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            color: 'rgba(2, 104, 171, 0.08)',
            drawBorder: false,
            lineWidth: 1
          },
          ticks: {
            color: '#4C5E6A',
            font: {
              size: 11
            },
            maxRotation: 45,
            minRotation: 45,
            padding: 8
          },
          border: {
            color: 'rgba(2, 104, 171, 0.2)',
            width: 1
          }
        },
        y: {
          grid: {
            color: 'rgba(2, 104, 171, 0.08)',
            drawBorder: false,
            lineWidth: 1
          },
          ticks: {
            color: '#4C5E6A',
            font: {
              size: 11
            },
            padding: 8
          },
          border: {
            color: 'rgba(2, 104, 171, 0.2)',
            width: 1
          },
          title: {
            display: true,
            text: `Værdi (${config.enhed})`,
            color: '#024A7D',
            font: {
              size: 13
            },
            padding: {
              top: 10,
              bottom: 10
            }
          }
        }
      },
      elements: {
        point: {
          hoverBackgroundColor: '#1FB1B1',
          hoverBorderColor: '#ffffff',
          hoverBorderWidth: 4
        }
      },
      interaction: {
        intersect: true,
        mode: 'point' as const
      }
    };
  };

  /**
   * Opretter målområde annotation med forbedret styling
   */
  const createTargetAnnotations = (kpiName: string) => {
    const config = kpiConfig[kpiName];
    
    const annotations: any = {};

    if (config.maal_min !== undefined && config.maal_max !== undefined) {
      if (config.hoejere_er_bedre) {
        // For KPIer hvor højere er bedre - vis målområdet fra min til max
        annotations.targetZone = {
          type: 'box',
          xMin: -0.5,
          xMax: historicalData.length - 0.5,
          yMin: config.maal_min,
          yMax: config.maal_max,
          backgroundColor: 'rgba(2, 104, 171, 0.12)', // Øget opacity for bedre synlighed
          borderColor: 'rgba(2, 104, 171, 0.3)',
          borderWidth: 2,
          borderDash: [8, 4],
          label: {
            content: `Målområde (${config.maal_min}-${config.maal_max} ${config.enhed})`,
            position: 'start',
            color: '#024A7D',
            font: {
              size: 12,
              weight: 'bold'
            },
            padding: 6,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 4
          }
        };
        
        // Tilføj grænselinjer for målområdet
        annotations.targetMinLine = {
          type: 'line',
          xMin: -0.5,
          xMax: historicalData.length - 0.5,
          yMin: config.maal_min,
          yMax: config.maal_min,
          borderColor: '#1FB1B1', // Accent Aqua for grænselinjer
          borderWidth: 2,
          borderDash: [3, 3],
          label: {
            content: `${config.maal_min} ${config.enhed}`,
            position: 'start',
            color: '#1FB1B1',
            font: {
              size: 10,
              weight: 'bold'
            },
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 3
          }
        };
        
        annotations.targetMaxLine = {
          type: 'line',
          xMin: -0.5,
          xMax: historicalData.length - 0.5,
          yMin: config.maal_max,
          yMax: config.maal_max,
          borderColor: '#1FB1B1', // Accent Aqua for grænselinjer
          borderWidth: 2,
          borderDash: [3, 3],
          label: {
            content: `${config.maal_max} ${config.enhed}`,
            position: 'end',
            color: '#1FB1B1',
            font: {
              size: 10,
              weight: 'bold'
            },
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 3
          }
        };
      } else {
        // For KPIer hvor lavere er bedre - vis målområdet fra 0 til max
        annotations.targetZone = {
          type: 'box',
          xMin: -0.5,
          xMax: historicalData.length - 0.5,
          yMin: 0,
          yMax: config.maal_max,
          backgroundColor: 'rgba(2, 104, 171, 0.12)', // Øget opacity for bedre synlighed
          borderColor: 'rgba(2, 104, 171, 0.3)',
          borderWidth: 2,
          borderDash: [8, 4],
          label: {
            content: `Målområde (0-${config.maal_max} ${config.enhed})`,
            position: 'start',
            color: '#024A7D',
            font: {
              size: 12,
              weight: 'bold'
            },
            padding: 6,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 4
          }
        };
        
        // Tilføj grænselinje for målområdet (kun max for "lavere er bedre")
        annotations.targetMaxLine = {
          type: 'line',
          xMin: -0.5,
          xMax: historicalData.length - 0.5,
          yMin: config.maal_max,
          yMax: config.maal_max,
          borderColor: '#1FB1B1', // Accent Aqua for grænselinjer
          borderWidth: 2,
          borderDash: [3, 3],
          label: {
            content: `${config.maal_max} ${config.enhed}`,
            position: 'end',
            color: '#1FB1B1',
            font: {
              size: 10,
              weight: 'bold'
            },
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 3
          }
        };
      }
    } else {
      // For KPIer uden definerede mål - vis retningslinjer baseret på "højere er bedre"
      if (config.hoejere_er_bedre) {
        // For KPIer hvor højere er bedre - vis brand farve retningslinje
        annotations.guideline = {
          type: 'line',
          yMin: 0,
          yMax: 0,
          borderColor: 'rgba(2, 104, 171, 0.4)',
          borderWidth: 2,
          borderDash: [10, 5],
          label: {
            content: 'Retningslinje (Højere er bedre)',
            position: 'end',
            color: '#0268AB',
            font: {
              size: 10,
              weight: 'bold'
            }
          }
        };
      } else {
        // For KPIer hvor lavere er bedre - vis brand farve retningslinje
        annotations.guideline = {
          type: 'line',
          yMin: 0,
          yMax: 0,
          borderColor: 'rgba(2, 104, 171, 0.4)',
          borderWidth: 2,
          borderDash: [10, 5],
          label: {
            content: 'Retningslinje (Lavere er bedre)',
            position: 'end',
            color: '#0268AB',
            font: {
              size: 10,
              weight: 'bold'
            }
          }
        };
      }
    }

    return annotations;
  };



  console.log('🎨 Renderer KPI Grafer...');

  if (historicalData.length === 0) {
    return (
      <Card className="shadow-lg border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95">
        <CardContent className="p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            Ingen historisk data tilgængelig for grafer
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
            Upload data for at se grafiske trends
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Graf titel */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 via-cyan-600 to-blue-700 rounded-full mb-6 shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-4">
          KPI Trend Analyse
        </h3>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
          Historisk udvikling af Key Performance Indicators over tid med interaktive grafer og detaljerede analyser
        </p>
      </div>

      {/* KPI Grafer */}
      <div className="space-y-8">
        {Object.entries(kpiConfig).map(([kpiName, config]) => {
        const graphData = createGraphData(kpiName);
        const graphOptions = createGraphOptions(kpiName);
        const annotations = createTargetAnnotations(kpiName);

        // Tilføj målområde annotations
        if (Object.keys(annotations).length > 0) {
          (graphOptions as any).plugins.annotation = annotations;
        }

        return (
          <Card key={kpiName} className="shadow-xl border-0 bg-white/95 backdrop-blur-sm dark:bg-gray-800/95 hover:shadow-2xl transition-all duration-300">
            <CardHeader className="pb-4 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-100 dark:from-gray-700 dark:via-gray-600 dark:to-gray-500 rounded-t-lg border-b border-blue-100 dark:border-gray-600">
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <div className="w-4 h-4 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full mr-3 shadow-sm"></div>
                {config.navn}
              </CardTitle>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">
                {config.beskrivelse}
              </p>
              {config.maal_min !== undefined && config.maal_max !== undefined && (
                <div className="mt-2 flex items-center">
                  <div className="w-3 h-3 bg-blue-600 rounded mr-2"></div>
                  <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">
                    Målområde: {config.maal_min} - {config.maal_max} {config.enhed}
                  </span>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-8">
              <div className="h-96 w-full">
                <Line data={graphData} options={graphOptions} />
              </div>
            </CardContent>
          </Card>
        );
      })}
      </div>
    </div>
  );
} 