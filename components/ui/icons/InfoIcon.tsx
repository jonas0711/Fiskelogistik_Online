// InfoIcon komponent - bruges til information indikatorer
// Erstatter info-relaterede emojis

import React from 'react';
import { Info } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const InfoIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'semantic', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <Info 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default InfoIcon; 