// SettingsIcon komponent - erstatter ⚙️ emoji
// Bruges til indstillinger og konfiguration

import React from 'react';
import { Settings } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const SettingsIcon: React.FC<IconProps> = ({ 
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

export default SettingsIcon; 