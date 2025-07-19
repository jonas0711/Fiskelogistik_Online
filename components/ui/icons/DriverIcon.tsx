// DriverIcon komponent - erstatter 🚗 emoji
// Bruges til chauffør-relaterede funktioner

import React from 'react';
import { Truck } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const DriverIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'neutral', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <Truck 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default DriverIcon; 