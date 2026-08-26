"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, GraduationCap, BookOpen, Star, Users, Award, Heart, ArrowRight, FileCheck, IdCard, Calendar } from 'lucide-react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { supabase } from '@/integrations/supabase/client';
import ImageSlideshow from './ImageSlideshow';
import { flattenSlideItems } from '@/utils/slideHelpers';
import { formatImageUrl } from '@/utils/imageCompression';
import HeroTypewriterTitle, { renderTextWithGoldenAt } from './HeroTypewriterTitle';

import { DEFAULT_OG_IMAGE_NAME, DEFAULT_SVG_FALLBACK } from '@/config/site';

const DEFAULT_BG_IMAGE = "/og-cover.jpg";

const Hero = () => {
  const { settings, loading } = useSiteSettings();
  const hero = settings.hero || {};
  const [isVisible, setIsVisible] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [bgImgSrc, setBgImgSrc] = useState<string>(formatImageUrl(hero.background_image) || DEFAULT_BG_IMAGE);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    if (hero.background_image) {
      setBgImgSrc(formatImageUrl(hero.background_image));
    } else {
      setBgImgSrc(DEFAULT_BG_IMAGE);
    }
  }, [hero.background_image]);

  if (loading) return null;

  const heroSlides = flattenSlideItems(
    (Array.isArray(hero.images) && hero.images.length > 0)
      ? hero.images
      : (hero.right_image ? [{ url: hero.right_image, title: hero.right_image_title, subtitle: hero.right_image_subtitle }] : []),
    hero.right_image_title || 'Pendidikan Berkarakter',
    hero.right_image_subtitle || 'Terakreditasi & Berprestasi'
  );

  const fallbackSlide = {
    url: "/og-cover.jpg",
    title: hero.right_image_title || 'Pendidikan Berkarakter',
    subtitle: hero.right_image_subtitle || 'Terakreditasi & Berprestasi'
  };

  const currentItem = heroSlides[currentSlideIndex] || heroSlides[0] || fallbackSlide;
  const activeTitle = currentItem.title;
  const activeSubtitle = currentItem.subtitle;

  // Helper to render text with golden @ symbol
  const renderTextWithGoldenAt = (text: string) => {
    if (!text) return null;
    if (text.includes('@')) {
      const parts = text.split('@');
      return (
        <>
          {parts.map((part, index) => (
            <React.Fragment key={index}>
              {part}
              {index < parts.length - 1 && (
                <span 
                  className="text-amber-400 font-extrabold inline-block drop-shadow-[0_1px_3px_rgba(245,158,11,0.6)] px-[0.5px]"
                  style={{ WebkitTextFillColor: '#f59e0b' }}
                >
                  @
                </span>
              )}
            </React.Fragment>
          ))}
        </>
      );
    }
    return text;
  };

  return (
    <section className="relative min-h-[380px] sm:min-h-[85vh] flex items-center overflow-hidden bg-slate-100 pb-4 sm:pb-14">
      {/* Background Decorative Mesh & Hero Background Image */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Crisp & High Visibility Hero Background Image */}
        <img 
          key={bgImgSrc}
          src={bgImgSrc} 
          onError={() => {
            if (bgImgSrc !== DEFAULT_BG_IMAGE) {
              setBgImgSrc(DEFAULT_BG_IMAGE);
            } else if (bgImgSrc !== DEFAULT_SVG_FALLBACK) {
              setBgImgSrc(DEFAULT_SVG_FALLBACK);
            }
          }}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover scale-105 opacity-90 sm:opacity-95 transition-all duration-700" 
          alt="Madrasah Background" 
        />
        
        {/* Subtle Ambient Glow Blobs */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none"></div>

        {/* Soft Contrast Gradient Overlays (Ensures text legibility on left while keeping photo vivid) */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-50/95 via-slate-50/80 to-slate-50/30 md:to-transparent"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/40 via-transparent to-slate-50/80"></div>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      </div>

      <div className="container relative z-10 mx-auto px-3 sm:px-6 pt-20 sm:pt-24 pb-3 sm:pb-8">
          <div className="grid grid-cols-12 gap-2.5 sm:gap-8 lg:gap-12 items-center">
            
            {/* Left Content Column */}
            <div className="col-span-7 lg:col-span-7 text-left space-y-2 sm:space-y-5">
              
              {/* Top Moving Text Banner (Frameless & Ultra Modern) */}
              <div className="space-y-0.5 sm:space-y-1.5 pt-1 sm:pt-4">
                <div className={`inline-flex items-center gap-1.5 sm:gap-3 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
                  {/* Frameless Moving SIAKAD MODERN Text */}
                  <motion.div 
                    animate={{ 
                      y: [0, -3, 0],
                      x: [0, 2, 0]
                    }}
                    transition={{ 
                      duration: 3.5, 
                      repeat: Infinity, 
                      ease: "easeInOut" 
                    }}
                    className="inline-flex items-center gap-1.5 select-none py-0.5"
                  >
                    <span className="flex h-2 w-2 sm:h-2.5 sm:w-2.5 relative shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-80"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-600 shadow-sm"></span>
                    </span>

                    <motion.span 
                      animate={{
                        backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      style={{
                        backgroundImage: 'linear-gradient(90deg, #059669, #0d9488, #2563eb, #0d9488, #059669)',
                        backgroundSize: '200% auto',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                      }}
                      className="text-[10px] sm:text-sm font-black uppercase tracking-wider sm:tracking-[0.28em] drop-shadow-xs"
                    >
                      {renderTextWithGoldenAt(hero.badge_text && hero.badge_text !== 'Eksklusif & Modern' ? hero.badge_text : 'Si@Kad Modern')}
                    </motion.span>
                  </motion.div>

                  <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-widest text-slate-600 bg-white/90 px-3 py-1.5 rounded-full border border-slate-200/80 shadow-2xs">
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    Terakreditasi Unggul
                  </span>
                </div>

                {/* Main Heading with Selected Text Animation Mode (Starting from far left of Hero) */}
                <div className="w-full text-left pl-0 ml-0 overflow-visible py-1">
                  <HeroTypewriterTitle 
                    line1={hero.heading_line1 || 'Si@Kad'} 
                    line1Color={hero.heading_line1_color || '#0f172a'}
                    line1Font={hero.heading_line1_font || 'sans-black'}
                    line2={hero.heading_line2 || 'Madrasah'} 
                    line2Color={hero.heading_line2_color || 'gradient-emerald'}
                    line2Font={hero.heading_line2_font || 'serif-italic'}
                    size="xl"
                    isVisible={isVisible} 
                    animationType={hero.title_animation_type || 'typewriter'}
                  />
                </div>
              </div>

              {/* Subtitle / Description */}
              <p className={`text-[11px] sm:text-lg text-slate-600 max-w-xl mx-0 leading-snug sm:leading-relaxed font-medium line-clamp-2 sm:line-clamp-none transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                {hero.description || 'Selamat datang di institusi pendidikan yang memadukan kemuliaan akhlak dengan keunggulan intelektual berbasis digital & AI.'}
              </p>

              {/* Interactive Service Dock (Quick Access Grid inside Hero) */}
              <div className={`space-y-1.5 sm:space-y-3 pt-1 transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-[9px] sm:text-[11px] font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    Layanan Akademik
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2.5">
                  {/* Daftar Siswa */}
                  <a href="/students-list" className="group flex flex-col items-center sm:items-start p-1.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/95 hover:bg-white border border-teal-200/90 hover:border-teal-400 shadow-2xs hover:shadow-xl transition-all duration-300">
                    <div className="w-6 h-6 sm:w-9 sm:h-9 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-lg sm:rounded-xl flex items-center justify-center mb-1 sm:mb-1.5 shadow-xs group-hover:scale-110">
                      <Users className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <div className="text-center sm:text-left min-w-0 w-full">
                      <span className="text-[9px] sm:text-xs font-black text-slate-900 group-hover:text-teal-600 transition-colors block whitespace-normal leading-tight break-words">Daftar Siswa</span>
                      <span className="text-[9px] text-slate-400 font-semibold hidden sm:block whitespace-normal leading-tight break-words">Siswa & Alumni</span>
                    </div>
                  </a>

                  {/* Kalender */}
                  <a href="/calendar" className="group flex flex-col items-center sm:items-start p-1.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/95 hover:bg-white border border-blue-200/90 hover:border-blue-400 shadow-2xs hover:shadow-xl transition-all duration-300">
                    <div className="w-6 h-6 sm:w-9 sm:h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg sm:rounded-xl flex items-center justify-center mb-1 sm:mb-1.5 shadow-xs group-hover:scale-110">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <div className="text-center sm:text-left min-w-0 w-full">
                      <span className="text-[9px] sm:text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors block whitespace-normal leading-tight break-words">Kalender</span>
                      <span className="text-[9px] text-slate-400 font-semibold hidden sm:block whitespace-normal leading-tight break-words">Agenda Akademik</span>
                    </div>
                  </a>

                  {/* Perpustakaan */}
                  <a href="/library" className="group flex flex-col items-center sm:items-start p-1.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/95 hover:bg-white border border-purple-200/90 hover:border-purple-400 shadow-2xs hover:shadow-xl transition-all duration-300">
                    <div className="w-6 h-6 sm:w-9 sm:h-9 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg sm:rounded-xl flex items-center justify-center mb-1 sm:mb-1.5 shadow-xs group-hover:scale-110">
                      <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <div className="text-center sm:text-left min-w-0 w-full">
                      <span className="text-[9px] sm:text-xs font-black text-slate-900 group-hover:text-purple-600 transition-colors block whitespace-normal leading-tight break-words">Perpustakaan</span>
                      <span className="text-[9px] text-slate-400 font-semibold hidden sm:block whitespace-normal leading-tight break-words">E-Journal & Buku</span>
                    </div>
                  </a>

                  {/* Kartu Ujian */}
                  <a href="/exam-cards" className="group flex flex-col items-center sm:items-start p-1.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/95 hover:bg-white border border-emerald-200/90 hover:border-emerald-400 shadow-2xs hover:shadow-xl transition-all duration-300">
                    <div className="w-6 h-6 sm:w-9 sm:h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg sm:rounded-xl flex items-center justify-center mb-1 sm:mb-1.5 shadow-xs group-hover:scale-110">
                      <IdCard className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <div className="text-center sm:text-left min-w-0 w-full">
                      <span className="text-[9px] sm:text-xs font-black text-slate-900 group-hover:text-emerald-600 transition-colors block whitespace-normal leading-tight break-words">Kartu Ujian</span>
                      <span className="text-[9px] text-slate-400 font-semibold hidden sm:block whitespace-normal leading-tight break-words">Cetak Digital</span>
                    </div>
                  </a>
                </div>
              </div>

            </div>

            {/* Right Visual Image & Floating Stat Cards */}
            <div className={`col-span-5 lg:col-span-5 pt-2 xs:pt-3 sm:pt-0 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-6 scale-95'}`}>
              <div className="relative mx-auto w-full">
                
                {/* Glowing Aura Effect */}
                <div className="absolute -inset-1 bg-gradient-to-tr from-emerald-500 via-teal-400 to-amber-300 rounded-2xl sm:rounded-[2.5rem] blur-lg sm:blur-xl opacity-25 animate-pulse"></div>
                
                {/* Floating Top Card Badge */}
                <div className="absolute -top-3 -left-3 z-20 hidden sm:flex items-center gap-2.5 bg-slate-900/90 text-white p-3 px-4 rounded-2xl shadow-xl border border-white/20 backdrop-blur-md animate-bounce-slow">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black leading-none">Generasi Rabbani</p>
                    <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Unggul & Berakhlak</p>
                  </div>
                </div>

                {/* Main Glassmorphism Frame */}
                <div className="relative rounded-xl sm:rounded-[2rem] overflow-hidden border-2 sm:border-4 border-white shadow-xl sm:shadow-2xl bg-slate-900 group">
                  <ImageSlideshow 
                    images={heroSlides.length > 0 ? heroSlides : [fallbackSlide]} 
                    onIndexChange={(idx) => setCurrentSlideIndex(idx)}
                    className="w-full h-[160px] xs:h-[200px] sm:h-[440px] lg:h-[470px]" 
                    alt="Hero Visual" 
                    indicatorsPosition="top-right"
                    showOverlay={false}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent pointer-events-none"></div>
                  
                  {/* Floating Bottom Info Pill */}
                  <div className="absolute bottom-1.5 sm:bottom-4 left-1.5 sm:left-4 right-1.5 sm:right-4 bg-slate-900/90 backdrop-blur-md p-1.5 sm:p-3.5 rounded-lg sm:rounded-2xl border border-white/15 shadow-xl flex items-center justify-between z-10">
                    <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
                      <div className="w-6 h-6 sm:w-10 sm:h-10 rounded-md sm:rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shrink-0 shadow-md">
                        <GraduationCap className="w-3 h-3 sm:w-5 sm:h-5" />
                      </div>
                      {/* Title Runs (Typewriter), Subtitle Stays Static */}
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="overflow-hidden py-0.5">
                          <HeroTypewriterTitle
                            title={activeTitle}
                            dark={true}
                            size="xs"
                          />
                        </div>

                        {activeSubtitle && (
                          <p className="text-[8px] sm:text-[10px] text-emerald-300 font-medium truncate mt-0.5">
                            {activeSubtitle}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="flex h-2 w-2 sm:h-2.5 sm:w-2.5 relative shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-emerald-500"></span>
                    </span>
                  </div>
                </div>

                {/* Floating Bottom Right Stat Card */}
                <div className="absolute -bottom-4 -right-4 z-20 hidden sm:flex items-center gap-3 bg-white/95 text-slate-800 p-3 px-4 rounded-2xl shadow-xl border border-slate-100 backdrop-blur-md">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center">
                    <Heart className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-900">Ramah Anak</p>
                    <p className="text-[10px] text-slate-500 font-medium">Berbasis Kasih Sayang</p>
                  </div>
                </div>

              </div>
            </div>

          </div>
      </div>

    </section>
  );
};

export default Hero;