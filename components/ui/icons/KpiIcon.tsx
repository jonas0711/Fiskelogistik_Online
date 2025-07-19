// KpiIcon komponent - erstatter 📈 emoji
// Bruges til KPI og performance indikatorer

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const KpiIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'neutral', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <TrendingUp 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default KpiIcon; 