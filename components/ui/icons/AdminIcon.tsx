// AdminIcon komponent - erstatter 🔧 emoji
// Bruges til admin funktioner og indstillinger

import React from 'react';
import { Settings } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const AdminIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'neutral', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <Settings 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default AdminIcon; 