// CleanupIcon komponent - erstatter 🧹 emoji
// Bruges til cleanup og vedligeholdelse

import React from 'react';
import { Trash2 } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const CleanupIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'neutral', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <Trash2 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default CleanupIcon; 