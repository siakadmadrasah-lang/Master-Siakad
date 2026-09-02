import React, { useState, useEffect } from 'react';
import { BookOpen, GraduationCap, Sparkles, School, Award, Sparkle } from 'lucide-react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { formatImageUrl } from '@/utils/imageCompression';

export interface PageLoaderProps {
  title?: string;
  subtitle?: string;
  tagline?: string;
  customSettings?: any;
  isRuangGuru?: boolean;
  onClose?: () => void;
}

export const InitialPageLoader: React.FC<PageLoaderProps> = ({
  title,
  subtitle,
  tagline,
  customSettings,
  isRuangGuru = false,
}) => {
  const { settings = {} } = useSiteSettings();
  const { activeMadrasah } = useMadrasah();
  const [imageError, setImageError] = useState(false);

  // Merge configured settings with overrides
  const rawLoader = settings.page_loader || {};
  const activeConfig = isRuangGuru
    ? (rawLoader.ruang_guru || (rawLoader.show_for_ruang_guru !== false ? rawLoader : {}))
    : (rawLoader.portal || rawLoader);

  const cfg = customSettings || activeConfig || {};
  const isEnabled = cfg.enabled !== false;

  // Display texts
  const displayTitle = title || cfg.title || (isRuangGuru ? 'Ruang Kerja Guru & Pendidik' : 'Si@Kad Madrasah');
  const displaySubtitle = subtitle || cfg.subtitle || (isRuangGuru ? 'Menyiapkan Portal & Administrasi GTK...' : (activeMadrasah?.nama || 'Sistem Informasi Akademik Madrasah'));
  const displayTagline = tagline || cfg.tagline || (isRuangGuru ? 'Akses Mandiri Pendidik & Tenaga Kependidikan' : 'Membangun Generasi Unggul Berkarakter Qur\'ani');

  const animationType = cfg.animation_type || 'bounce';
  const loaderStyle = cfg.loader_style || 'islamic_emerald';
  const bgTheme = cfg.bg_theme || 'emerald_dark';
  const showProgressBar = cfg.show_progress_bar !== false;

  // Resolve custom logo / photo
  const rawCandidateUrl =
    cfg.custom_logo_url ||
    cfg.logo_url ||
    (isRuangGuru ? (rawLoader.ruang_guru?.custom_logo_url || '') : (rawLoader.portal?.custom_logo_url || '')) ||
    rawLoader.custom_logo_url ||
    settings?.general?.logo_url ||
    settings?.identitas_madrasah?.logo_url ||
    activeMadrasah?.logo_url ||
    '';

  const logoUrl = formatImageUrl(rawCandidateUrl);
  const hasCustomLogoUrl = Boolean(logoUrl && logoUrl.trim().length > 0);

  // Icon type resolution: If custom_logo_url / valid logo is present, default icon_type to 'logo' unless user explicitly selected another icon
  const iconType = cfg.icon_type || (hasCustomLogoUrl ? 'logo' : (isRuangGuru ? 'graduation' : 'logo'));
  
  // Decide whether to render the custom photo/logo:
  const isExplicitNonLogoIcon = ['book', 'school', 'sparkles', 'award'].includes(iconType);
  const shouldRenderPhoto = hasCustomLogoUrl && (iconType === 'logo' || (!isExplicitNonLogoIcon && Boolean(rawCandidateUrl))) && !imageError;

  // Shape, Zoom, Fit
  const logoShape = cfg.logo_shape || 'circle'; // 'circle' | 'rounded' | 'soft_vignette'
  const logoZoom = typeof cfg.logo_zoom === 'number' ? cfg.logo_zoom : 130;
  const logoFit = cfg.logo_fit || 'cover'; // 'cover' | 'contain'

  useEffect(() => {
    setImageError(false);
  }, [logoUrl]);

  if (!isEnabled && !customSettings) {
    return null;
  }

  // Background Theme Styles
  let bgClasses = 'bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 text-white';
  let ambientGlowColor = 'bg-emerald-500/20';
  let textPrimary = 'text-white';
  let textSecondary = 'text-emerald-200/80';
  let textTagline = 'text-slate-400';
  let barGradient = 'from-emerald-500 via-teal-400 to-emerald-500';

  if (bgTheme === 'slate_dark') {
    bgClasses = 'bg-gradient-to-br from-slate-950 via-slate-900 to-zinc-950 text-white';
    ambientGlowColor = 'bg-blue-500/15';
    textSecondary = 'text-slate-300';
    barGradient = 'from-blue-500 via-indigo-400 to-cyan-500';
  } else if (bgTheme === 'blue_dark') {
    bgClasses = 'bg-gradient-to-br from-slate-950 via-blue-950 to-indigo-950 text-white';
    ambientGlowColor = 'bg-blue-500/20';
    textSecondary = 'text-blue-200/90';
    barGradient = 'from-cyan-400 via-blue-500 to-indigo-500';
  } else if (bgTheme === 'gradient_mesh') {
    bgClasses = 'bg-gradient-to-tr from-slate-950 via-emerald-950 to-cyan-950 text-white';
    ambientGlowColor = 'bg-teal-400/25';
    textSecondary = 'text-teal-200/90';
    barGradient = 'from-emerald-400 via-cyan-400 to-teal-300';
  } else if (bgTheme === 'light') {
    bgClasses = 'bg-gradient-to-br from-slate-50 via-emerald-50/70 to-teal-50 text-slate-900';
    ambientGlowColor = 'bg-emerald-300/30';
    textPrimary = 'text-slate-900';
    textSecondary = 'text-emerald-800';
    textTagline = 'text-slate-500';
    barGradient = 'from-emerald-600 via-teal-500 to-emerald-600';
  }

  // Animation CSS for Icon
  let animationClass = 'animate-bounce';
  if (animationType === 'pulse') animationClass = 'animate-pulse scale-105';
  if (animationType === 'spin') animationClass = 'animate-spin';
  if (animationType === 'orbit') animationClass = 'animate-spin duration-1000';
  if (animationType === 'float') animationClass = 'animate-bounce duration-1000';
  if (animationType === 'flip') animationClass = 'animate-pulse';

  const renderIconContent = (isMinimal = false) => {
    if (shouldRenderPhoto && logoUrl) {
      // Shape classes
      const isCircle = logoShape === 'circle';
      const shapeClass = isCircle ? 'rounded-full' : 'rounded-2xl';

      return (
        <div 
          className={`relative w-full h-full ${shapeClass} overflow-hidden flex items-center justify-center bg-white/10 backdrop-blur-md shadow-inner`}
        >
          {/* Subtle Ambient Blurred Clone */}
          <img
            src={logoUrl}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover blur-lg scale-125 opacity-30 select-none pointer-events-none"
          />

          {/* Foreground Crisp Logo / Photo */}
          <div className="relative z-10 w-full h-full flex items-center justify-center overflow-hidden p-1">
            <img
              src={logoUrl}
              alt="Logo Page Loader"
              referrerPolicy="no-referrer"
              loading="eager"
              decoding="sync"
              style={{
                transform: `scale(${Math.max(80, Math.min(200, logoZoom)) / 100})`,
                transformOrigin: 'center center',
              }}
              className={`w-full h-full ${logoFit === 'contain' ? 'object-contain' : 'object-cover'} ${shapeClass} drop-shadow-md transition-transform duration-300`}
              onError={() => {
                console.warn('InitialPageLoader: Failed to load logo URL', logoUrl);
                setImageError(true);
              }}
            />
          </div>

          {/* Border Ring Accent */}
          {isCircle && (
            <div className="absolute inset-0 rounded-full border border-emerald-400/40 pointer-events-none shadow-xs" />
          )}
        </div>
      );
    }

    if (iconType === 'school') {
      return <School className="w-9 h-9 text-emerald-400 drop-shadow-sm" />;
    }
    if (iconType === 'sparkles') {
      return <Sparkles className="w-9 h-9 text-emerald-400 drop-shadow-sm" />;
    }
    if (iconType === 'award') {
      return <Award className="w-9 h-9 text-emerald-400 drop-shadow-sm" />;
    }
    if (iconType === 'book') {
      return <BookOpen className="w-9 h-9 text-emerald-400 drop-shadow-sm" />;
    }
    if (iconType === 'graduation' || isRuangGuru) {
      return <GraduationCap className="w-9 h-9 text-emerald-400 drop-shadow-sm" />;
    }
    return <BookOpen className="w-9 h-9 text-emerald-400 drop-shadow-sm" />;
  };

  const isCustomPhoto = shouldRenderPhoto;
  const isCircleShape = (cfg.logo_shape || 'circle') === 'circle';

  return (
    <div className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center ${bgClasses} select-none transition-all duration-300 backdrop-blur-sm`}>
      {/* Ambient background glow */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 ${ambientGlowColor} rounded-full blur-3xl pointer-events-none animate-pulse`} />

      <div className="relative z-10 flex flex-col items-center gap-4 px-6 text-center max-w-md w-full">
        
        {/* Style Variant 1: Islamic Emerald or Default Glow */}
        {loaderStyle === 'islamic_emerald' && (
          <div className="relative">
            <div className={`w-24 h-24 sm:w-28 sm:h-28 ${isCustomPhoto && isCircleShape ? 'rounded-full' : 'rounded-3xl'} bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 p-1 shadow-2xl shadow-emerald-500/30 ${animationClass}`}>
              <div className={`w-full h-full bg-slate-950/80 backdrop-blur-md ${isCustomPhoto && isCircleShape ? 'rounded-full' : 'rounded-3xl'} flex items-center justify-center ${isCustomPhoto ? 'p-1 overflow-hidden' : 'p-3'} border border-emerald-400/30`}>
                {renderIconContent()}
              </div>
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 shadow-sm shadow-emerald-400"></span>
            </span>
          </div>
        )}

        {/* Style Variant 2: Academic Dark Luxury */}
        {loaderStyle === 'academic_dark' && (
          <div className="relative">
            <div className={`w-24 h-24 sm:w-28 sm:h-28 ${isCustomPhoto && isCircleShape ? 'rounded-full' : 'rounded-2xl'} bg-gradient-to-b from-slate-800 to-slate-950 p-1 shadow-2xl border border-slate-700/80 ${animationClass}`}>
              <div className={`w-full h-full ${isCustomPhoto && isCircleShape ? 'rounded-full' : 'rounded-xl'} bg-slate-900 flex items-center justify-center ${isCustomPhoto ? 'p-1 overflow-hidden' : 'p-3'} border border-amber-400/40`}>
                {renderIconContent()}
              </div>
            </div>
            <div className="absolute -inset-2 rounded-full border border-dashed border-emerald-400/40 animate-spin" />
          </div>
        )}

        {/* Style Variant 3: Glassmorphism */}
        {loaderStyle === 'glassmorphism' && (
          <div className={`relative p-1.5 ${isCustomPhoto && isCircleShape ? 'rounded-full' : 'rounded-3xl'} bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl`}>
            <div className={`w-24 h-24 sm:w-26 sm:h-26 ${isCustomPhoto && isCircleShape ? 'rounded-full' : 'rounded-2xl'} bg-gradient-to-br from-emerald-500/30 to-teal-500/20 flex items-center justify-center ${isCustomPhoto ? 'p-1 overflow-hidden' : 'p-2.5'} ${animationClass}`}>
              {renderIconContent()}
            </div>
          </div>
        )}

        {/* Style Variant 4: Minimalist Line & Spin */}
        {loaderStyle === 'minimalist' && (
          <div className="relative flex items-center justify-center w-24 h-24 sm:w-26 sm:h-26">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/20 border-t-emerald-400 animate-spin" />
            <div className={`w-20 h-20 sm:w-22 sm:h-22 ${isCustomPhoto && isCircleShape ? 'rounded-full overflow-hidden' : ''} flex items-center justify-center ${animationClass}`}>
              {renderIconContent(true)}
            </div>
          </div>
        )}

        {/* Style Variant 5: Modern Light */}
        {loaderStyle === 'modern_light' && (
          <div className="relative">
            <div className={`w-24 h-24 sm:w-28 sm:h-28 ${isCustomPhoto && isCircleShape ? 'rounded-full' : 'rounded-2xl'} bg-white shadow-xl ${isCustomPhoto ? 'p-1 overflow-hidden' : 'p-3'} border border-emerald-100 flex items-center justify-center ${animationClass}`}>
              {renderIconContent()}
            </div>
          </div>
        )}

        {/* Brand Titles */}
        <div className="space-y-1.5 mt-2 max-w-sm">
          <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${textPrimary} leading-tight drop-shadow-sm`}>
            {displayTitle}
          </h1>
          <p className={`text-xs sm:text-sm font-medium ${textSecondary} leading-snug`}>
            {displaySubtitle}
          </p>
          {displayTagline && (
            <p className={`text-[11px] font-semibold ${textTagline} uppercase tracking-widest pt-1 flex items-center justify-center gap-1.5`}>
              <Sparkle className="w-3 h-3 text-emerald-400 shrink-0" />
              <span>{displayTagline}</span>
            </p>
          )}
        </div>

        {/* Dynamic Progress Bar */}
        {showProgressBar && (
          <div className="w-48 sm:w-56 h-1.5 bg-slate-800/80 rounded-full overflow-hidden mt-2 p-0.5 border border-white/10 shadow-inner">
            <div className={`h-full bg-gradient-to-r ${barGradient} rounded-full animate-indeterminate shadow-sm`}></div>
          </div>
        )}
      </div>
    </div>
  );
};

export default InitialPageLoader;
