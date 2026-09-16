"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  GraduationCap, KeyRound, ShieldCheck, Lock, ArrowRight, UserCheck, 
  AlertCircle, Sparkles, Eye, EyeOff, Search, HelpCircle, CheckCircle2, RefreshCw 
} from 'lucide-react';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { showSuccess, showError } from '@/utils/toast';

const TeacherAuthModal: React.FC = () => {
  const { isTeacherModalOpen, closeTeacherModal, teachersList, loadingTeachers, loginAsTeacher, refreshTeachers } = useTeacherAuth();
  const { activeMadrasah } = useMadrasah();

  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [pin, setPin] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [searchTeacherQuery, setSearchTeacherQuery] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (isTeacherModalOpen) {
      setPin('');
      setErrorMsg('');
      setSearchTeacherQuery('');
      if (teachersList.length > 0 && !selectedTeacherId) {
        setSelectedTeacherId(teachersList[0].id);
      }
    }
  }, [isTeacherModalOpen, teachersList]);

  const filteredTeachers = useMemo(() => {
    if (!searchTeacherQuery.trim()) return teachersList;
    const q = searchTeacherQuery.toLowerCase();
    return teachersList.filter(t => 
      t.nama.toLowerCase().includes(q) || 
      (t.nip && t.nip.includes(q)) || 
      (t.nik && t.nik.includes(q)) ||
      (t.jabatan && t.jabatan.toLowerCase().includes(q)) ||
      (t.mapel_diampu && t.mapel_diampu.toLowerCase().includes(q))
    );
  }, [teachersList, searchTeacherQuery]);

  const selectedTeacher = useMemo(() => {
    return teachersList.find(t => t.id === selectedTeacherId) || (teachersList.length > 0 ? teachersList[0] : null);
  }, [teachersList, selectedTeacherId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    let chosenTeacher = selectedTeacher;
    if (!chosenTeacher && customName.trim()) {
      chosenTeacher = {
        id: `custom-${Date.now()}`,
        nama: customName.trim(),
        nip: '-',
        jabatan: 'Guru Pendidik',
        loginAt: new Date().toISOString()
      };
    }

    if (!chosenTeacher && teachersList.length > 0) {
      chosenTeacher = teachersList[0];
    }

    if (!pin.trim()) {
      setErrorMsg('Silakan masukkan PIN atau Sandi Pengaman Pendidik.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = loginAsTeacher(chosenTeacher || { nama: 'Guru Madrasah', nip: '-' }, pin);
      if (res.success) {
        showSuccess(`Selamat datang, ${chosenTeacher?.nama || 'Bpk/Ibu Guru'}!`);
        closeTeacherModal();
      } else {
        setErrorMsg(res.message || 'PIN tidak valid. Hubungi administrator madrasah.');
        showError(res.message || 'PIN tidak valid');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isTeacherModalOpen} onOpenChange={open => !open && closeTeacherModal()}>
      <DialogContent className="max-w-md p-0 overflow-hidden border border-emerald-950/20 shadow-2xl rounded-3xl bg-white [&>button:last-child]:text-white/80 [&>button:last-child]:hover:text-white [&>button:last-child]:hover:bg-white/15 [&>button:last-child]:top-5 [&>button:last-child]:right-5 [&>button:last-child]:w-8 [&>button:last-child]:h-8 [&>button:last-child]:flex [&>button:last-child]:items-center [&>button:last-child]:justify-center [&>button:last-child]:rounded-full [&>button:last-child]:transition-colors">
        {/* Header decoration */}
        <div className="relative p-6 sm:p-7 bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-950 text-white overflow-hidden border-b border-emerald-900/30">
          {/* Ambient Glows */}
          <div className="absolute -top-10 -right-10 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-teal-500/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 pr-10">
            {/* Top Eyebrow Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2.5 whitespace-nowrap shadow-xs">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>Kredensial Pendidik</span>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 backdrop-blur-md flex items-center justify-center border border-emerald-400/30 shadow-inner shrink-0 mt-0.5">
                <GraduationCap className="w-6 h-6 text-emerald-300" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight text-white m-0">
                  Ruang Kerja Guru
                </DialogTitle>
                <DialogDescription className="text-xs text-emerald-100/80 mt-1 leading-snug">
                  {activeMadrasah?.name || activeMadrasah?.nama || 'Madrasah'} &bull; Akses Mandiri Administrasi & Dokumen
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 bg-white">
          <div className="space-y-4">
            {/* Teacher Selection with Search */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Pilih Profil Pendidik
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                    {teachersList.length} GTK
                  </span>
                  <button
                    type="button"
                    onClick={() => refreshTeachers()}
                    title="Segarkan data GTK"
                    className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingTeachers ? 'animate-spin text-emerald-600' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Ketik nama atau NIP guru..."
                  value={searchTeacherQuery}
                  onChange={e => setSearchTeacherQuery(e.target.value)}
                  className="pl-8 h-9 text-xs rounded-xl border-slate-200 bg-slate-50 focus:bg-white"
                />
              </div>

              {/* Selection List */}
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-2xl p-1.5 space-y-1 bg-slate-50/50">
                {filteredTeachers.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500">
                    Tidak ditemukan GTK dengan kata kunci tersebut.
                  </div>
                ) : (
                  filteredTeachers.map(t => {
                    const isSelected = (selectedTeacher?.id === t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTeacherId(t.id)}
                        className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-2 text-xs ${
                          isSelected 
                            ? 'bg-emerald-600 text-white font-bold shadow-sm' 
                            : 'hover:bg-slate-100 text-slate-800'
                        }`}
                      >
                        <div className="truncate flex-1">
                          <div className="font-bold truncate">{t.nama} {t.gelar && `(${t.gelar})`}</div>
                          <div className={`text-[10.5px] truncate ${isSelected ? 'text-emerald-100' : 'text-slate-500'}`}>
                            NIP: {t.nip} • {t.jabatan || 'Guru'}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-white shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* PIN Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  PIN / Sandi Pengaman Pendidik
                </Label>
                <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Proteksi Dokumen
                </span>
              </div>

              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Masukkan PIN dari Kredensial GTK..."
                  value={pin}
                  onChange={e => {
                    setPin(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  autoFocus
                  className="h-11 pl-10 pr-10 rounded-xl border-slate-200 bg-slate-50/70 focus:bg-white text-sm font-semibold tracking-wider"
                />
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title={showPassword ? "Sembunyikan PIN" : "Tampilkan PIN"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="p-2.5 bg-emerald-50/80 rounded-xl border border-emerald-100 text-[11px] text-emerald-900 space-y-0.5">
                <p className="font-bold flex items-center gap-1 text-emerald-800">
                  <HelpCircle className="w-3 h-3" /> Panduan PIN Login:
                </p>
                <p className="text-slate-600 leading-snug">
                  Gunakan PIN yang diberikan admin madrasah pada menu <strong>Kredensial GTK</strong>, 6 digit terakhir NIP/NIK, atau PIN default <strong>123456</strong>.
                </p>
              </div>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={closeTeacherModal}
              className="rounded-xl h-11 px-5 text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl h-11 px-6 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 flex items-center gap-2"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              <span>Masuk Ruang Kerja</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeacherAuthModal;
