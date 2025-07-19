// AuthIcon komponent - erstatter 🔐 emoji
// Bruges til authentication og sikkerhed

import React from 'react';
import { Lock } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const AuthIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'neutral', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <Lock 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default AuthIcon; 