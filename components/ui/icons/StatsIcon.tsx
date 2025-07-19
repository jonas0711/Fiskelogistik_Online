// StatsIcon komponent - erstatter 📊 emoji
// Bruges til statistikker og data visualisering

import React from 'react';
import { BarChart3 } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const StatsIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'neutral', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <BarChart3 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default StatsIcon; 