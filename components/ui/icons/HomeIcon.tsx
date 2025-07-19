// HomeIcon komponent - erstatter 🏠 emoji
// Bruges til navigation til hovedsiden

import React from 'react';
import { Home } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const HomeIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'neutral', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <Home 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default HomeIcon; 