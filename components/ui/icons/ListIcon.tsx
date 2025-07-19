// ListIcon komponent - erstatter 📋 emoji
// Bruges til lister og metadata

import React from 'react';
import { List } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const ListIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'neutral', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <List 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default ListIcon; 