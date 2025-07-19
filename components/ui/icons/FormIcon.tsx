// FormIcon komponent - erstatter 📝 emoji
// Bruges til formularer og input

import React from 'react';
import { Edit3 } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const FormIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'neutral', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <Edit3 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default FormIcon; 