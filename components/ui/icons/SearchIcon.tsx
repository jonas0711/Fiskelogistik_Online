// SearchIcon komponent - erstatter 🔍 emoji
// Bruges til søgefunktionalitet

import React from 'react';
import { Search } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const SearchIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'neutral', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <Search 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default SearchIcon; 