import React from 'react';

interface LocalIconProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  name: string;
  className?: string;
}

/**
 * Componente para cargar iconos SVG físicos almacenados en public/icons/
 */
export function LocalIcon({ name, className = 'w-6 h-6', ...props }: LocalIconProps) {
  return (
    <img 
      src={`/icons/${name}.svg`} 
      alt={`${name} icon`} 
      className={`inline-block object-contain ${className}`}
      {...props}
    />
  );
}
