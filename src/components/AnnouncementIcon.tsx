import React from 'react';
import { 
  Megaphone, 
  Bell, 
  Sparkles, 
  Award, 
  GraduationCap, 
  Calendar, 
  AlertCircle, 
  Info, 
  Pin, 
  Flame, 
  Trophy, 
  Newspaper, 
  Zap 
} from 'lucide-react';

export interface AnnouncementIconOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  emoji: string;
}

export const defaultAnnouncementIconClassName = "w-3.5 h-3.5 shrink-0";

export const ANNOUNCEMENT_ICONS: AnnouncementIconOption[] = [
  { id: 'megaphone', label: 'Megaphone', icon: Megaphone, emoji: '📢' },
  { id: 'bell', label: 'Lonceng', icon: Bell, emoji: '🔔' },
  { id: 'sparkles', label: 'Sparkles', icon: Sparkles, emoji: '✨' },
  { id: 'award', label: 'Penghargaan', icon: Award, emoji: '🏆' },
  { id: 'graduation', label: 'Kelulusan/SPMB', icon: GraduationCap, emoji: '🎓' },
  { id: 'calendar', label: 'Agenda/Acara', icon: Calendar, emoji: '📅' },
  { id: 'alert', label: 'Penting/Warning', icon: AlertCircle, emoji: '⚠️' },
  { id: 'info', label: 'Informasi', icon: Info, emoji: 'ℹ️' },
  { id: 'pin', label: 'Semat / Pin', icon: Pin, emoji: '📌' },
  { id: 'flame', label: 'Hot / Trending', icon: Flame, emoji: '🔥' },
  { id: 'trophy', label: 'Juara / Prestasi', icon: Trophy, emoji: '🥇' },
  { id: 'newspaper', label: 'Berita Sekolah', icon: Newspaper, emoji: '📰' },
  { id: 'zap', label: 'Penting Kilat', icon: Zap, emoji: '⚡' },
];

interface AnnouncementIconProps {
  iconId?: string;
  className?: string;
  defaultIcon?: React.ComponentType<{ className?: string }>;
}

export const AnnouncementIcon: React.FC<AnnouncementIconProps> = ({ 
  iconId, 
  className = "w-3.5 h-3.5 shrink-0",
  defaultIcon: DefaultComponent = Megaphone
}) => {
  const matched = ANNOUNCEMENT_ICONS.find(i => i.id === iconId);
  const IconComp = matched ? matched.icon : DefaultComponent;
  return <IconComp className={className} />;
};

export default AnnouncementIcon;
