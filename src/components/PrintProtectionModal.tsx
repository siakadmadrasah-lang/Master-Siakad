"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Lock, KeyRound, Eye, EyeOff, FileText, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { PrintSecuritySettings } from '@/types/printSecurity';

interface PrintProtectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  documentTitle?: string;
  securitySettings: PrintSecuritySettings;
}

export const PrintProtectionModal: React.FC<PrintProtectionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  documentTitle,
  securitySettings,
}) => {
  const [inputPassword, setInputPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputPassword('');
      setErrorMessage('');
      setShowPassword(false);
      setIsSubmitting(false);
      setIsShaking(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.getModifierState) {
      setCapsLockOn(e.getModifierState('CapsLock'));
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputPassword.trim()) {
      setErrorMessage('Silakan masukkan kata sandi proteksi dokumen.');
      triggerShake();
      return;
    }

    setIsSubmitting(true);
    const targetPassword = (securitySettings.password || 'madrasah123').trim();

    if (inputPassword.trim() === targetPassword) {
      // Simpan session auth jika diaktifkan
      if (securitySettings.allow_session_cache !== false) {
        try {
          sessionStorage.setItem('siakad_print_authorized', 'true');
          sessionStorage.setItem('siakad_print_auth_time', Date.now().toString());
        } catch (err) {
          // ignore session storage error
        }
      }

      setErrorMessage('');
      setIsSubmitting(false);
      onClose();
      // Jalankan callback aksi cetak dokumen
      setTimeout(() => {
        onSuccess();
      }, 100);
    } else {
      setIsSubmitting(false);
      setErrorMessage('Kata sandi salah! Silakan hubungi admin / tata usaha madrasah.');
      triggerShake();
      setTimeout(() => {
        inputRef.current?.select();
      }, 50);
    }
  };

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-3xl border-0 shadow-2xl bg-white font-sans">
        {/* Header Visual with authoritative gradient */}
        <div className="bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-950 text-white p-6 sm:p-7 relative">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldCheck className="w-6 h-6 text-emerald-300" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest bg-emerald-400/20 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-300/30 mb-1">
                <Lock className="w-3 h-3" /> Dokumen Terproteksi
              </span>
              <DialogTitle className="text-base sm:text-lg font-black text-white tracking-tight leading-snug">
                {securitySettings.custom_title || 'Proteksi Akses Cetak Dokumen Resmi'}
              </DialogTitle>
            </div>
          </div>
        </div>

        {/* Modal Body & Form */}
        <div className="p-6 space-y-5">
          {/* Target Document Banner */}
          {documentTitle && (
            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-slate-800 text-xs">
              <FileText className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Dokumen yang Dituju:</span>
                <span className="font-bold text-slate-900 line-clamp-2">{documentTitle}</span>
              </div>
            </div>
          )}

          {/* Description / Instructions */}
          <DialogDescription className="text-xs text-slate-600 leading-relaxed">
            {securitySettings.custom_message || 'Dokumen ini dilindungi demi menjaga keabsahan arsip resmi madrasah. Masukkan kode sandi cetak untuk melanjutkan.'}
          </DialogDescription>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className={`space-y-1.5 ${isShaking ? 'animate-bounce' : ''}`}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                  Kata Sandi Cetak Dokumen <span className="text-red-500">*</span>
                </label>
                {capsLockOn && (
                  <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 animate-pulse">
                    <AlertCircle className="w-3 h-3" /> Caps Lock Aktif
                  </span>
                )}
              </div>

              <div className="relative">
                <Input
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  value={inputPassword}
                  onChange={(e) => {
                    setInputPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Masukkan kata sandi cetak..."
                  className={`rounded-xl h-11 pr-10 text-sm font-semibold transition-all ${
                    errorMessage 
                      ? 'border-red-500 ring-2 ring-red-100 bg-red-50/30 text-red-900' 
                      : 'border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {errorMessage && (
                <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1 pt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {errorMessage}
                </p>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="rounded-xl text-xs font-bold h-10 px-4 text-slate-600 hover:bg-slate-50"
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl text-xs font-bold h-10 px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                {isSubmitting ? 'Memverifikasi...' : 'Verifikasi & Buka Cetak'}
              </Button>
            </div>
          </form>

          {/* Security footnote */}
          <div className="pt-2 text-center text-[10px] text-slate-400">
            🔒 Sistem Pengamanan Dokumen Resmi Madrasah Digital
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrintProtectionModal;
