// UserIcon komponent - erstatter 👤 emoji
// Bruges til bruger-relaterede funktioner

import React from 'react';
import { User } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const UserIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'neutral', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <User 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default UserIcon; 