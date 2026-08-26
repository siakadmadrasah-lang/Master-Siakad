"use client";

import React from 'react';
import { usePrintSecurity } from '@/contexts/PrintSecurityContext';
import { Button } from '@/components/ui/button';
import { Lock, LockOpen, ShieldCheck, ShieldAlert, KeyRound, Sparkles } from 'lucide-react';

interface PrintSecurityIndicatorProps {
  className?: string;
  documentTitle?: string;
  variant?: 'badge' | 'button' | 'compact' | 'pill' | 'mini';
  onUnlocked?: () => void;
  showTextOnMobile?: boolean;
}

export const PrintSecurityIndicator: React.FC<PrintSecurityIndicatorProps> = ({
  className = '',
  documentTitle,
  variant = 'pill',
  onUnlocked,
  showTextOnMobile = false,
}) => {
  const {
    securitySettings,
    isAuthorized,
    openProtectionDialogManually,
    clearSessionAuthorization,
    loading,
  } = usePrintSecurity();

  const handleOpenModal = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    openProtectionDialogManually(() => {
      if (onUnlocked) onUnlocked();
    }, documentTitle || 'Akses Cetak Dokumen Resmi');
  };

  const handleRelock = (e: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    clearSessionAuthorization();
  };

  // 1. Jika proteksi cetak dinonaktifkan oleh admin (Bebas Sandi)
  if (!securitySettings.is_enabled) {
    if (variant === 'compact' || variant === 'mini') {
      return (
        <button
          type="button"
          onClick={handleOpenModal}
          title="Proteksi cetak dokumen dinonaktifkan (Bebas Sandi)"
          className={`inline-flex items-center justify-center p-2 rounded-xl bg-slate-100/90 hover:bg-slate-200/90 border border-slate-300 text-slate-600 transition-all cursor-pointer shadow-xs ${className}`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="sr-only">Bebas Sandi</span>
        </button>
      );
    }

    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100/90 border border-slate-300 text-slate-700 text-xs font-semibold shadow-xs ${className}`}>
        <ShieldCheck className="w-4 h-4 text-emerald-600" />
        <span>Bebas Sandi (Tanpa Password)</span>
      </div>
    );
  }

  // 2. Jika sudah terbuka / terverifikasi (Kunci Terbuka)
  if (isAuthorized) {
    if (variant === 'mini') {
      return (
        <button
          type="button"
          onClick={handleRelock}
          title="Dokumen Terbuka (Bebas Cetak). Klik untuk mengunci kembali."
          className={`inline-flex items-center justify-center p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 transition-all cursor-pointer shadow-xs ${className}`}
        >
          <LockOpen className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span className="sr-only">Kunci Terbuka</span>
        </button>
      );
    }

    if (variant === 'compact') {
      return (
        <div className={`inline-flex items-center gap-1.5 ${className}`}>
          <div 
            title="Dokumen Terbuka (Bebas Cetak)"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-xs"
          >
            <LockOpen className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
            <span className={showTextOnMobile ? "inline" : "hidden sm:inline"}>Kunci Terbuka</span>
          </div>
          <button
            type="button"
            onClick={handleRelock}
            title="Kunci kembali dokumen"
            className="text-[10px] text-slate-400 hover:text-red-600 underline font-semibold transition-colors cursor-pointer px-1 py-0.5"
          >
            Kunci Lagi
          </button>
        </div>
      );
    }

    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold shadow-xs">
          <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <LockOpen className="w-2.5 h-2.5" />
          </div>
          <span>Kunci Dokumen Terbuka</span>
        </div>
        <button
          type="button"
          onClick={handleRelock}
          title="Kunci kembali dokumen agar meminta sandi lagi"
          className="text-[11px] text-slate-500 hover:text-red-600 underline font-bold transition-colors cursor-pointer bg-slate-100/80 hover:bg-red-50 px-2 py-1 rounded-lg border border-slate-200"
        >
          Kunci Kembali
        </button>
      </div>
    );
  }

  // 3. Kondisi Dokumen Masih Terkunci (Perlu Masukkan Password)
  if (variant === 'mini') {
    return (
      <button
        type="button"
        onClick={handleOpenModal}
        title="Dokumen Terproteksi Kata Sandi. Klik di sini untuk memasukkan password cetak!"
        className={`relative p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white border border-amber-400 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 flex items-center justify-center transition-all cursor-pointer group ${className}`}
      >
        <Lock className="w-4 h-4 group-hover:rotate-12 transition-transform" />
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-300"></span>
        </span>
        <span className="sr-only">Masukkan Password Cetak</span>
      </button>
    );
  }

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleOpenModal}
        title="Dokumen Terproteksi Kata Sandi. Klik di sini untuk memasukkan password cetak!"
        className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer group border border-amber-400/40 active:scale-95 ${className}`}
      >
        <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform">
          <Lock className="w-2.5 h-2.5 text-white" />
        </div>
        <span className="tracking-tight text-[11px] whitespace-nowrap">
          {showTextOnMobile ? "Buka Sandi" : <><span className="hidden sm:inline">Proteksi Cetak: </span>Buka Sandi</>}
        </span>
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-200"></span>
        </span>
      </button>
    );
  }

  if (variant === 'button') {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleOpenModal}
        className={`bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white border-0 font-bold text-xs rounded-xl h-10 px-4 gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer ${className}`}
      >
        <Lock className="w-4 h-4 text-white shrink-0 animate-bounce" />
        <span>Buka Kunci Sandi Cetak</span>
        <KeyRound className="w-3.5 h-3.5 text-amber-200" />
      </Button>
    );
  }

  // Default: Clean Pill badge with interactive trigger
  return (
    <button
      type="button"
      onClick={handleOpenModal}
      title="Dokumen Terproteksi Kata Sandi. Klik di sini untuk memasukkan password cetak!"
      className={`group relative inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer border border-amber-400 active:scale-95 ${className}`}
    >
      <Lock className="w-3.5 h-3.5 text-amber-100 group-hover:rotate-6 transition-transform shrink-0" />
      <span className="text-[11px] font-bold text-white tracking-tight">
        Buka Sandi
      </span>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-200 animate-pulse"></span>
    </button>
  );
};

export default PrintSecurityIndicator;
