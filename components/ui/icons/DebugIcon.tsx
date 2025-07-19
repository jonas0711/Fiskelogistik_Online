// DebugIcon komponent - erstatter 🐛 emoji
// Bruges til debug funktionalitet

import React from 'react';
import { Bug } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const DebugIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'neutral', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <Bug 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default DebugIcon; 