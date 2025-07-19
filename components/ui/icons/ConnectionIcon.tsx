// ConnectionIcon komponent - erstatter 🔌 emoji
// Bruges til forbindelse og initialisering

import React from 'react';
import { Wifi } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const ConnectionIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'neutral', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <Wifi 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default ConnectionIcon; 