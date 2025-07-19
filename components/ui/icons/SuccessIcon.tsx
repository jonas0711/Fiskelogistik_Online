// SuccessIcon komponent - erstatter ✅ emoji
// Bruges til succes indikatorer

import React from 'react';
import { CheckCircle } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const SuccessIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'semantic', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <CheckCircle 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default SuccessIcon; 