import React from 'react';
import {
  AlertTriangle,
  Bell,
  Calendar,
  Chart,
  Check,
  ChevronRight,
  Clock,
  Download,
  Edit,
  Flame,
  Flask,
  Home,
  Import,
  InfoCircle,
  Moon,
  Plus,
  Settings,
  Share,
  Sun,
  Trash,
  Upload,
  X,
  type IconComponent,
  type IconWeight,
} from 'reicon-react';

export type IconName =
  | 'plus'
  | 'download'
  | 'share'
  | 'settings'
  | 'calendar'
  | 'chart'
  | 'help'
  | 'alert'
  | 'trash'
  | 'edit'
  | 'check'
  | 'close'
  | 'home'
  | 'history'
  | 'lab'
  | 'bell'
  | 'moon'
  | 'sun'
  | 'flame'
  | 'export'
  | 'import'
  | 'chevronRight';

interface ThemedIconProps {
  name: IconName;
  size?: number;
  className?: string;
  color?: string;
  weight?: IconWeight;
}

const ICON_MAP: Record<IconName, IconComponent> = {
  plus: Plus,
  download: Download,
  share: Share,
  settings: Settings,
  calendar: Calendar,
  chart: Chart,
  help: InfoCircle,
  alert: AlertTriangle,
  trash: Trash,
  edit: Edit,
  check: Check,
  close: X,
  home: Home,
  history: Clock,
  lab: Flask,
  bell: Bell,
  moon: Moon,
  sun: Sun,
  flame: Flame,
  export: Upload,
  import: Import,
  chevronRight: ChevronRight,
};

export const ThemedIcon: React.FC<ThemedIconProps> = ({
  name,
  size = 20,
  className = '',
  color,
  weight = 'Outline',
}) => {
  const Icon = ICON_MAP[name] || InfoCircle;
  return (
    <Icon
      size={size}
      weight={weight}
      color={color || 'currentColor'}
      className={`transition-colors duration-200 text-slate-700 dark:text-slate-200 ${className}`}
    />
  );
};

export default ThemedIcon;
