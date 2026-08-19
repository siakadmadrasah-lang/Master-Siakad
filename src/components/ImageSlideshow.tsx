import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { formatImageUrl } from '@/utils/imageCompression';
import { DEFAULT_SVG_FALLBACK } from '@/config/site';
import HeroTypewriterTitle from './HeroTypewriterTitle';

export interface ImageSlideItem {
  url: string;
  title?: string;
  subtitle?: string;
  badge?: string;
}

interface ImageSlideshowProps {
  images?: Array<string | ImageSlideItem>;
  className?: string;
  alt?: string;
  overlayTitle?: string;
  overlaySubtitle?: string;
  overlayBadge?: string;
  showOverlay?: boolean;
  overlayPosition?: 'bottom' | 'top' | 'center';
  onIndexChange?: (index: number) => void;
  indicatorsPosition?: 'top-right' | 'top-left' | 'bottom-center' | 'top-center';
}

const ImageSlideshow: React.FC<ImageSlideshowProps> = ({
  images = [],
  className = "h-48 w-full",
  alt = "Slideshow image",
  overlayTitle,
  overlaySubtitle,
  overlayBadge,
  showOverlay = true,
  overlayPosition = 'bottom',
  onIndexChange,
  indicatorsPosition = 'top-right'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const parsedItems: ImageSlideItem[] = Array.isArray(images) && images.length > 0
    ? images.map(item => {
        if (typeof item === 'string') {
          const formatted = formatImageUrl(item);
          return { url: formatted || DEFAULT_SVG_FALLBACK };
        }
        const formatted = formatImageUrl(item?.url);
        return {
          url: formatted || DEFAULT_SVG_FALLBACK,
          title: item?.title,
          subtitle: item?.subtitle,
          badge: item?.badge,
        };
      })
    : [{ url: DEFAULT_SVG_FALLBACK }];

  const imageList = parsedItems.map(i => i.url);

  useEffect(() => {
    if (currentIndex >= imageList.length) {
      setCurrentIndex(0);
    } else {
      onIndexChange?.(currentIndex);
    }
  }, [currentIndex, imageList.length, onIndexChange]);

  useEffect(() => {
    if (imageList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % imageList.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [imageList.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
  };

  const currentItem = parsedItems[currentIndex] || parsedItems[0];
  const currentUrl = currentItem?.url || DEFAULT_SVG_FALLBACK;

  // Dynamic Text Logic: combines item-specific title or fallback to component level overlayTitle
  const activeTitle = currentItem?.title || overlayTitle;
  const activeSubtitle = currentItem?.subtitle || overlaySubtitle;
  const activeBadge = currentItem?.badge || overlayBadge;

  const handleImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const target = e.currentTarget;
    if (!target.dataset.errorLevel) {
      target.dataset.errorLevel = "1";
      target.src = "/og-cover.jpg";
    } else if (target.dataset.errorLevel === "1") {
      target.dataset.errorLevel = "2";
      target.src = DEFAULT_SVG_FALLBACK;
    }
  };

  return (
    <div className={`relative overflow-hidden bg-slate-900 group/slide ${className}`}>
      {/* Ambient Blurred Backdrop for frame precision */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          key={`bg-${currentIndex}-${currentUrl}`}
          src={currentUrl}
          onError={handleImgError}
          alt=""
          className="w-full h-full object-cover object-center blur-2xl scale-125 opacity-40 transition-opacity duration-700"
        />
      </div>

      {/* Main Image cleanly fitted & centered */}
      <img
        key={`fg-${currentIndex}-${currentUrl}`}
        src={currentUrl}
        onError={handleImgError}
        alt={`${alt} ${currentIndex + 1}`}
        className="relative z-10 w-full h-full object-cover object-center transition-all duration-700 ease-out group-hover/slide:scale-105"
      />

      {/* Subtle vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-slate-950/10 z-[15] pointer-events-none" />

      {/* Dynamic Text Title Overlay directly on photo (Styled like Hero & About floating pill badge) */}
      {showOverlay && (activeTitle || activeSubtitle || activeBadge) && (
        <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 z-[20] pointer-events-none">
          <div className="bg-slate-900/90 backdrop-blur-md p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-white/20 shadow-xl flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-md">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
              </div>
              <div className="min-w-0 flex-1 overflow-hidden">
                {activeBadge && (
                  <span className="inline-block text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-emerald-300">
                    {activeBadge}
                  </span>
                )}
                {activeTitle && (
                  <div className="overflow-hidden py-0.5">
                    <HeroTypewriterTitle
                      title={activeTitle}
                      dark={true}
                      size="sm"
                    />
                  </div>
                )}
                {activeSubtitle && (
                  <p className="text-[10px] sm:text-xs text-slate-300 font-medium truncate mt-0.5">
                    {activeSubtitle}
                  </p>
                )}
              </div>
            </div>
            <span className="flex h-2 w-2 sm:h-2.5 sm:w-2.5 relative shrink-0 ml-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500"></span>
            </span>
          </div>
        </div>
      )}
      
      {imageList.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 p-1 sm:p-2 rounded-full bg-slate-900/60 text-white backdrop-blur-md opacity-0 group-hover/slide:opacity-100 transition-all hover:bg-emerald-600 hover:scale-110 z-[25] shadow-lg border border-white/20"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 p-1 sm:p-2 rounded-full bg-slate-900/60 text-white backdrop-blur-md opacity-0 group-hover/slide:opacity-100 transition-all hover:bg-emerald-600 hover:scale-110 z-[25] shadow-lg border border-white/20"
            aria-label="Next image"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <div 
            className={`absolute flex gap-1 sm:gap-1.5 z-20 bg-slate-950/60 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-white/20 shadow-md ${
              indicatorsPosition === 'top-right' 
                ? 'top-2 right-2 sm:top-3 sm:right-3' 
                : indicatorsPosition === 'top-left'
                ? 'top-2 left-2 sm:top-3 sm:left-3'
                : indicatorsPosition === 'top-center'
                ? 'top-2 left-1/2 -translate-x-1/2 sm:top-3'
                : 'bottom-3 left-1/2 -translate-x-1/2'
            }`}
          >
            {imageList.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 ${
                  index === currentIndex ? "bg-emerald-400 w-3.5 sm:w-5" : "bg-white/50 w-1 sm:w-1.5 hover:bg-white/80"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ImageSlideshow;
