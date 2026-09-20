import React from 'react';

interface DesktopBackgroundProps {
  wallpaper?: string;
  backgroundColor?: string;
  children?: React.ReactNode;
  onContextMenu?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
}

export const DesktopBackground: React.FC<DesktopBackgroundProps> = ({
  wallpaper = 'linear-gradient(135deg, #050a14 0%, #00122e 40%, #000c1e 70%, #020408 100%)',
  backgroundColor = '#0c0c0c',
  children,
  onContextMenu,
  onClick,
}) => {
  // Determine if wallpaper is image URL or CSS gradient/color
  const isImageUrl =
    wallpaper && (wallpaper.startsWith('http://') || wallpaper.startsWith('https://') || wallpaper.startsWith('/'));

  const backgroundStyle: React.CSSProperties = isImageUrl
    ? {
        backgroundImage: `url(${wallpaper})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundColor: backgroundColor || '#0c0c0c',
      }
    : {
        background: wallpaper || backgroundColor || '#0c0c0c',
      };

  return (
    <div
      id="desktop-background"
      className="relative flex-1 w-full h-full overflow-hidden select-none"
      style={backgroundStyle}
      onClick={onClick}
      onContextMenu={onContextMenu}
    >
      {/* Subtle Windows 10 ambient light effect */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/40 via-transparent to-black/20" />

      {/* Foreground desktop content (shortcuts, canvas, active windows) */}
      <div className="relative z-10 w-full h-full">
        {children}
      </div>
    </div>
  );
};
