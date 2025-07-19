// UploadIcon komponent - bruges til fil upload funktionalitet
// Erstatter upload-relaterede emojis

import React from 'react';
import { Upload } from 'lucide-react';
import { IconProps, getIconStyles } from './icon-config';

const UploadIcon: React.FC<IconProps> = ({ 
  size = 'md', 
  color = 'neutral', 
  className,
  strokeWidth = 2 
}) => {
  const styles = getIconStyles(size, color, className);
  
  return (
    <Upload 
      size={styles.width} 
      color={styles.color} 
      className={styles.className}
      strokeWidth={strokeWidth}
    />
  );
};

export default UploadIcon; 