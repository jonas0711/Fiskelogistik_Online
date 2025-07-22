// Ikon konfiguration baseret på Fiskelogistik Gruppen design system
// Dette definerer standardstørrelser og farver for alle ikoner i applikationen

export const ICON_SIZES = {
  xs: 16,    // 16px - Meget små ikoner (indikatorer)
  sm: 20,    // 20px - Små ikoner (sekundære elementer)
  md: 24,    // 24px - Standard størrelse (default)
  lg: 32,    // 32px - Store ikoner (dashboard tiles)
  xl: 48,    // 48px - Meget store ikoner (empty states)
} as const;

export const ICON_COLORS = {
  // Primære farver baseret på brand palette
  primary: {
    600: '#0260A0',  // Brand Hover
    700: '#024A7D',  // Brand Dark
  },
  // Accent farver
  accent: {
    500: '#1FB1B1',  // Accent Aqua
    600: '#148E8E',  // Accent Dark
  },
  // Neutrale farver
  neutral: {
    400: '#95A5AE',  // Svag tekst / ikoner
    600: '#4C5E6A',  // Sekundær tekst
    900: '#1A2228',  // Primær tekst
  },
  // Semantiske farver
  semantic: {
    info: '#0268AB',     // Info blå
    success: '#1F7D3A',  // Success grøn
    warning: '#B25B00',  // Warning orange
    error: '#A3242A',    // Error rød
  },
  // Standard farver
  current: 'currentColor', // Arver farve fra parent
  white: '#FFFFFF',
} as const;

// TypeScript typer for ikon størrelser og farver
export type IconSize = keyof typeof ICON_SIZES;
export type IconColor = keyof typeof ICON_COLORS;

// Standard ikon props interface
export interface IconProps {
  size?: IconSize;
  color?: IconColor;
  className?: string;
  strokeWidth?: number;
}

// Standard ikon styling
export const getIconStyles = (size: IconSize = 'md', color: IconColor = 'neutral', className?: string) => {
  const sizeValue = ICON_SIZES[size];
  const colorValue = ICON_COLORS[color];
  
  // Håndterer farve værdier - hvis det er et objekt, brug den første værdi
  const colorString = typeof colorValue === 'string' 
    ? colorValue 
    : Object.values(colorValue)[0];
  
  return {
    width: sizeValue,
    height: sizeValue,
    color: colorString,
    className: className,
  };
};

// Console log prefix mapping (erstat emojis med tekst)
export const LOG_PREFIXES = {
  home: '[HOME]',
  connection: '[CONN]',
  success: '[SUCCESS]',
  auth: '[AUTH]',
  render: '[RENDER]',
  stats: '[STATS]',
  users: '[USERS]',
  test: '[TEST]',
  debug: '[DEBUG]',
  cleanup: '[CLEANUP]',
  search: '[SEARCH]',
  delete: '[DELETE]',
  admin: '[ADMIN]',
  user: '[USER]',
  list: '[LIST]',
  settings: '[SETTINGS]',
  config: '[CONFIG]',
  form: '[FORM]',
  driver: '[DRIVER]',
  kpi: '[KPI]',
  upload: '[UPLOAD]',
  report: '[REPORT]',
  error: '[ERROR]',
  warning: '[WARNING]',
  info: '[INFO]',
  found: '[FOUND]',
  notfound: '[NOT_FOUND]',
  newdriver: '[NEW_DRIVER]',
  limit: '[LIMIT]',
} as const; 