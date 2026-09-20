import React, { useState } from 'react';
import {
  FolderKanban,
  Terminal,
  Gamepad2,
  Music2,
  SlidersHorizontal,
  Camera,
  PlaySquare,
  Compass,
  Radio,
  MessageSquare,
  Crosshair,
  MapPin,
  ShoppingBag,
  Headphones,
  Settings,
  Smartphone,
  Wifi,
  Battery,
  Layers,
  HelpCircle,
  Image,
  Search,
  User,
  Clock,
  Mail,
  Volume2,
  Phone,
  Calculator,
  MessageCircle
} from 'lucide-react';

export function getLucideIcon(iconName: string, className: string = 'w-5 h-5') {
  switch (iconName) {
    case 'Phone':
      return <Phone className={className} />;
    case 'Calculator':
      return <Calculator className={className} />;
    case 'MessageCircle':
      return <MessageCircle className={className} />;
    case 'FolderKanban':
      return <FolderKanban className={className} />;
    case 'Terminal':
      return <Terminal className={className} />;
    case 'Gamepad2':
      return <Gamepad2 className={className} />;
    case 'Music2':
      return <Music2 className={className} />;
    case 'SlidersHorizontal':
      return <SlidersHorizontal className={className} />;
    case 'Camera':
      return <Camera className={className} />;
    case 'PlaySquare':
      return <PlaySquare className={className} />;
    case 'Compass':
      return <Compass className={className} />;
    case 'Radio':
      return <Radio className={className} />;
    case 'MessageSquare':
      return <MessageSquare className={className} />;
    case 'Crosshair':
      return <Crosshair className={className} />;
    case 'MapPin':
      return <MapPin className={className} />;
    case 'ShoppingBag':
      return <ShoppingBag className={className} />;
    case 'Headphones':
      return <Headphones className={className} />;
    case 'Settings':
      return <Settings className={className} />;
    case 'Smartphone':
      return <Smartphone className={className} />;
    case 'Wifi':
      return <Wifi className={className} />;
    case 'Battery':
      return <Battery className={className} />;
    case 'Layers':
      return <Layers className={className} />;
    case 'Image':
      return <Image className={className} />;
    case 'Search':
      return <Search className={className} />;
    case 'User':
      return <User className={className} />;
    case 'Clock':
      return <Clock className={className} />;
    case 'Mail':
      return <Mail className={className} />;
    case 'Volume2':
      return <Volume2 className={className} />;
    default:
      return <Smartphone className={className} />;
  }
}

export const AppIconImg: React.FC<{ src: string; fallbackIcon: string; className?: string; alt?: string }> = ({
  src,
  fallbackIcon,
  className = 'w-5 h-5',
  alt = 'App Icon',
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return getLucideIcon(fallbackIcon, className);
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`${className} object-contain rounded-[2px] transition-transform`}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
};

export function getAppIcon(iconName: string, className: string = 'w-5 h-5', iconUrl?: string) {
  const resolvedUrl =
    iconUrl ||
    (iconName && (iconName.startsWith('/') || iconName.startsWith('http') || iconName.startsWith('data:image'))
      ? iconName
      : undefined);

  if (resolvedUrl) {
    return <AppIconImg src={resolvedUrl} fallbackIcon={iconName} className={className} />;
  }
  return getLucideIcon(iconName, className);
}
