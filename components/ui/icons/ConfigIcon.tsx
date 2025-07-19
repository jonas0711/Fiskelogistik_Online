// ConfigIcon komponent - erstatter 🔧 emoji
// Bruges til konfiguration og udvikling

import React from 'react';
import { Wrench } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const ConfigIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'neutral', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <Wrench 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default ConfigIcon; 