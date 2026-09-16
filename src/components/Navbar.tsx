"use client";

import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Home, Info, Bell, LayoutGrid, Link as LinkIcon, 
  Sparkles, ChevronDown, Presentation, Calendar, Library, 
  Languages, Users as UsersIcon, Compass, Building, GraduationCap,
  ClipboardList, Trophy
} from 'lucide-react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';
import HeaderTitleAnimation from './HeaderTitleAnimation';

const Navbar = () => {
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const { settings } = useSiteSettings();
  const general = settings.general || {};

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const primaryNavLinks = [
    { name: 'Beranda', href: '/#home', icon: Home },
    { name: 'Tentang', href: '/#about', icon: Info },
    { name: 'Program', href: '/#programs', icon: LayoutGrid },
    { name: 'Berita', href: '/#announcements', icon: Bell },
  ];

  const academicLinks = [
    { name: 'Profil Madrasah (EMIS)', href: '/profil-madrasah', icon: Building },
    { name: 'Prestasi & Kejuaraan', href: '/prestasi', icon: Trophy },
    { name: 'Daftar Guru & Pendidik', href: '/teachers', icon: GraduationCap },
    { name: 'Kelas & Siswa', href: '/kelas', icon: UsersIcon },
    { name: 'Rekapitulasi Siswa', href: '/rekap-siswa-publik', icon: Compass },
    { name: 'Literasi Kurikulum', href: '/#literasi-kurikulum', icon: Sparkles },
    { name: 'Kalender Akademik', href: '/calendar', icon: Calendar },
    { name: 'Jadwal Pelajaran', href: '/jadwal', icon: LayoutGrid },
    { name: 'Catatan Kerja Guru (LCKH)', href: '/lckh', icon: ClipboardList },
    { name: 'Perpustakaan', href: '/library', icon: Library },
    { name: 'Tautan Cepat', href: '/links', icon: LinkIcon },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-3 md:px-6 py-2.5 sm:py-3 print:hidden ${isScrolled ? 'translate-y-0' : 'translate-y-1'}`}>
      <div className={`flex items-center justify-between h-16 px-4 md:px-8 rounded-2xl transition-all ${isScrolled ? 'bg-white/95 backdrop-blur-xl border border-slate-200 shadow-lg' : 'bg-white/70 backdrop-blur-md border border-slate-100 shadow-sm'}`}>
        <a href="/" className="flex items-center gap-2.5 sm:gap-3 group shrink-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-emerald-600 shadow-lg shrink-0">
            <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="flex flex-col justify-center">
            <HeaderTitleAnimation 
              part1={general.header_part1 || 'Si@Kad'}
              part1Color={general.header_part1_color || '#0f172a'}
              part1Font={general.header_part1_font || 'sans-black'}
              part2={general.header_part2 || 'Madrasah'}
              part2Color={general.header_part2_color || '#059669'}
              part2Font={general.header_part2_font || 'serif-bold'}
              text={general.app_name || general.school_name} 
              animationType={general.title_animation_type || general.header_animation_type || 'static'} 
            />
            <p className="text-[7.5px] sm:text-[9px] font-bold text-emerald-600 uppercase tracking-[0.1em] mt-0.5 sm:mt-1 leading-none">
              {general.tagline || "Sistem Informasi Akademik Madrasah"}
            </p>
          </div>
        </a>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-4 xl:gap-5">
          {primaryNavLinks.map((link, index) => (
            <a key={index} href={link.href} className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider transition-all hover:text-emerald-600 text-slate-700 hover:scale-105">
              <link.icon className="w-3.5 h-3.5 text-slate-400" /> {link.name}
            </a>
          ))}

          {/* Academic & Services Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider hover:text-emerald-600 text-slate-700 outline-none">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" /> AKADEMIK <ChevronDown className="w-3 h-3 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-xl border-slate-100 shadow-xl p-2 min-w-[200px]">
              {academicLinks.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <DropdownMenuItem key={idx} onClick={() => navigate(item.href)} className="rounded-lg font-bold text-[11px] uppercase py-2.5 cursor-pointer flex items-center gap-2">
                    <Icon className="w-4 h-4 text-emerald-600" /> {item.name}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Interactive Tools Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 font-bold text-[11px] uppercase tracking-wider hover:text-emerald-600 text-slate-700 outline-none">
              <Sparkles className="w-3.5 h-3.5 text-slate-400" /> INTERAKTIF <ChevronDown className="w-3 h-3 opacity-50" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="rounded-xl border-slate-100 shadow-xl p-2 min-w-[200px]">
              <DropdownMenuItem onClick={() => navigate('/materi-interaktif')} className="rounded-lg font-bold text-[11px] uppercase py-2.5 cursor-pointer"><BookOpen className="w-4 h-4 mr-2 text-emerald-500" /> Materi Interaktif</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/teaching-aids')} className="rounded-lg font-bold text-[11px] uppercase py-2.5 cursor-pointer"><Presentation className="w-4 h-4 mr-2 text-blue-500" /> Alat Bantu Mengajar</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/ai-teaching')} className="rounded-lg font-bold text-[11px] uppercase py-2.5 cursor-pointer"><Sparkles className="w-4 h-4 mr-2 text-teal-500" /> AI Teaching Hub</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/translator')} className="rounded-lg font-bold text-[11px] uppercase py-2.5 cursor-pointer"><Languages className="w-4 h-4 mr-2 text-orange-500" /> AI Translator</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/exam-cards')} className="rounded-lg font-bold text-[11px] uppercase py-2.5 cursor-pointer"><UsersIcon className="w-4 h-4 mr-2 text-purple-500" /> Kartu Peserta TKAD</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Dedicated Ruang Guru Portal CTA */}
          <button
            onClick={() => navigate('/ruang-guru')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold text-[11px] uppercase tracking-wider shadow-sm hover:shadow-md transition-all hover:scale-105"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>Ruang Guru</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
