"use client";

import React from 'react';
import { usePrintSecurity } from '@/contexts/PrintSecurityContext';
import { Button } from '@/components/ui/button';
import { Lock, LockOpen, ShieldCheck, ShieldAlert, KeyRound } from 'lucide-react';

interface PrintSecurityIndicatorProps {
  className?: string;
  documentTitle?: string;
  variant?: 'badge' | 'button' | 'compact' | 'pill';
  onUnlocked?: () => void;
}

export const PrintSecurityIndicator: React.FC<PrintSecurityIndicatorProps> = ({
  className = '',
  documentTitle,
  variant = 'pill',
  onUnlocked,
}) => {
  const {
    securitySettings,
    isAuthorized,
    openProtectionDialogManually,
    clearSessionAuthorization,
  } = usePrintSecurity();

  // Jika proteksi cetak dinonaktifkan oleh admin
  if (!securitySettings.is_enabled) {
    if (variant === 'compact') return null;
    return (
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-[11px] font-medium ${className}`}>
        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
        <span>Bebas Sandi</span>
      </div>
    );
  }

  // Jika sudah terbuka / terverifikasi
  if (isAuthorized) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-xs">
          <LockOpen className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
          <span>Kunci Terbuka</span>
        </div>
        <button
          type="button"
          onClick={() => clearSessionAuthorization()}
          title="Kunci kembali dokumen"
          className="text-[10px] text-slate-400 hover:text-red-600 underline font-semibold transition-colors cursor-pointer"
        >
          Kunci Lagi
        </button>
      </div>
    );
  }

  // Kondisi Dokumen Masih Terkunci (Perlu Masukkan Password)
  const handleOpenModal = () => {
    openProtectionDialogManually(() => {
      if (onUnlocked) onUnlocked();
    }, documentTitle || 'Akses Cetak Dokumen Publik');
  };

  if (variant === 'compact') {
    return (
      <button
        type="button"
        onClick={handleOpenModal}
        title="Dokumen terproteksi kata sandi. Klik untuk memasukkan sandi / membuka kunci."
        className={`p-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 border border-amber-300/50 flex items-center justify-center transition-all cursor-pointer group shadow-xs ${className}`}
      >
        <Lock className="w-4 h-4 group-hover:scale-110 transition-transform text-amber-600" />
        <span className="sr-only">Buka Kunci Dokumen</span>
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
        className={`bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300 font-bold text-xs rounded-xl h-10 px-3.5 gap-2 shadow-xs transition-all cursor-pointer ${className}`}
      >
        <Lock className="w-4 h-4 text-amber-600 shrink-0" />
        <span>Buka Kunci Sandi</span>
      </Button>
    );
  }

  // Default: Pill badge with interactive trigger
  return (
    <button
      type="button"
      onClick={handleOpenModal}
      title="Klik untuk memasukkan kata sandi dan membuka kunci cetak dokumen"
      className={`group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-300 text-amber-900 text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer ${className}`}
    >
      <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 group-hover:rotate-12 transition-transform shadow-xs">
        <Lock className="w-3 h-3" />
      </div>
      <div className="flex items-center gap-1.5">
        <span>Dokumen Terkunci</span>
        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-amber-200/80 text-amber-900 group-hover:bg-amber-300 transition-colors flex items-center gap-1">
          <KeyRound className="w-2.5 h-2.5" /> Buka Sandi
        </span>
      </div>
    </button>
  );
};

export default PrintSecurityIndicator;
