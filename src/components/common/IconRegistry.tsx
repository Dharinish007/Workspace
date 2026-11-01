import React from 'react';
import {
  Briefcase,
  Code,
  BookOpen,
  Heart,
  Dumbbell,
  CheckSquare,
  Calendar,
  Flame,
  Compass,
  Star,
  Coffee,
  Target,
  Folder,
  Zap,
  Music,
  Smile,
  Clock,
  Sun,
  Moon,
  Laptop,
  PenTool,
  TrendingUp,
  Award,
  Globe,
  LucideProps
} from 'lucide-react';

export const BUILT_IN_ICONS: { [key: string]: React.FC<LucideProps> } = {
  Briefcase,
  Code,
  BookOpen,
  Heart,
  Dumbbell,
  CheckSquare,
  Calendar,
  Flame,
  Compass,
  Star,
  Coffee,
  Target,
  Folder,
  Zap,
  Music,
  Smile,
  Clock,
  Sun,
  Moon,
  Laptop,
  PenTool,
  TrendingUp,
  Award,
  Globe,
};

export const BUILT_IN_ICON_NAMES = Object.keys(BUILT_IN_ICONS);

export interface IconRendererProps extends LucideProps {
  name: string;
}

export const IconRenderer: React.FC<IconRendererProps> = ({ name, ...props }) => {
  const IconComponent = BUILT_IN_ICONS[name] || Folder;
  return <IconComponent {...props} />;
};

