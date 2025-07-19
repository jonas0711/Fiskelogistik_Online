// ReportIcon komponent - erstatter 📋 emoji
// Bruges til rapporter og lister

import React from 'react';
import { FileText } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const ReportIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'neutral', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <FileText 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default ReportIcon; 