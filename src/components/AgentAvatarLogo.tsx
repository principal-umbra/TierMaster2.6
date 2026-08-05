import React from 'react';

export function getAgentInitials(name: string, overrideInitials?: string): string {
  if (overrideInitials) return overrideInitials;
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Calculates the best contrast text color (either white or black) for a given hex background color to preserve accessibility (WCAG).
 */
export function getContrastColor(hexColor: string): 'white' | 'black' {
  if (!hexColor) return 'white';
  let hex = hexColor.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) {
    // If not a valid hex, check for standard tailwind color names or default
    return 'white';
  }
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // YIQ formula for human eye perception of luminance
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? 'black' : 'white';
}

interface AgentAvatarLogoProps {
  name: string;
  initials?: string;
  tierColor?: string;
  avatarBg?: string; // Solid background color
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  style?: React.CSSProperties;
}

export function AgentAvatarLogo({ 
  name, 
  initials, 
  tierColor = '#64748B', 
  avatarBg,
  size = 'md',
  className = '',
  style = {}
}: AgentAvatarLogoProps) {
  const displayInitials = getAgentInitials(name, initials);
  
  // Decide active background: use custom avatarBg if set, otherwise fallback nicely
  const activeBg = avatarBg || tierColor;
  const contrast = getContrastColor(activeBg);
  
  // White or black lines/text depending on contrast to ensure high readability
  const textColor = contrast === 'white' ? '#FFFFFF' : '#0F172A';
  const strokeColor = contrast === 'white' ? 'rgba(255, 255, 255, 0.45)' : 'rgba(15, 23, 42, 0.35)';

  let sizeClasses = 'w-10 h-10 text-[12px]';
  if (size === 'sm') {
    sizeClasses = 'w-8 h-8 text-[10px]';
  } else if (size === 'md') {
    sizeClasses = 'w-10 h-10 text-[12px]';
  } else if (size === 'lg') {
    sizeClasses = 'w-14 h-14 text-[16px]';
  } else if (size === 'xl') {
    sizeClasses = 'w-20 h-20 text-[22px]';
  }

  return (
    <div 
      className={`${sizeClasses} ${className} rounded-full flex items-center justify-center font-display font-black tracking-tight select-none border-2 shrink-0 relative shadow-sm overflow-hidden`}
      style={{
        backgroundColor: activeBg,
        color: textColor,
        borderColor: strokeColor,
        ...style
      }}
      title={`${name} (${displayInitials})`}
    >
      {/* Background radial soft light overlay */}
      <div 
        className="absolute inset-0 rounded-full opacity-20 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at top left, ${contrast === 'white' ? '#FFFFFF' : '#000000'}, transparent 70%)`
        }}
      />
      
      {/* Central initials */}
      <span 
        className="relative z-10 drop-shadow-sm font-extrabold uppercase text-white-keep agent-avatar-initials"
        style={{ color: `${textColor} !important` }}
      >
        {displayInitials}
      </span>
      
      {/* Inner accessibilty/accent dashed ring */}
      <div 
        className="absolute inset-[3px] rounded-full border border-dashed opacity-40 pointer-events-none"
        style={{ borderColor: strokeColor }}
      />
    </div>
  );
}
