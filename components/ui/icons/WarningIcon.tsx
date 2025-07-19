// WarningIcon komponent - bruges til advarsel indikatorer
// Erstatter warning-relaterede emojis

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const WarningIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'semantic', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <AlertTriangle 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default WarningIcon; 