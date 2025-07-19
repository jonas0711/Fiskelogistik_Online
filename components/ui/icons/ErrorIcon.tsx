// ErrorIcon komponent - bruges til fejl indikatorer
// Erstatter error-relaterede emojis

import React from 'react';
import { AlertCircle } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const ErrorIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'semantic', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <AlertCircle 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default ErrorIcon; 