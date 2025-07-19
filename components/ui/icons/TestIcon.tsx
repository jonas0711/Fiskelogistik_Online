// TestIcon komponent - erstatter 🧪 emoji
// Bruges til test funktionalitet

import React from 'react';
import { TestTube } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const TestIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'neutral', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <TestTube 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default TestIcon; 