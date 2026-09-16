"use client";

import React from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Printer, User, Phone, Mail, GraduationCap, ShieldCheck, 
  Calendar, MapPin, Award, BookOpen, Clock, School, QrCode, 
  CheckCircle2, AlertCircle, FileText, CheckCircle
} from 'lucide-react';
import { Teacher } from '@/pages/admin/TeachersAdmin';
import { formatImageUrl } from '@/utils/imageCompression';
import { formatTeacherDisplayName } from '@/utils/formatGelar';

interface GtkDetailModalProps {
  teacher: Teacher | null;
  isOpen: boolean;
  onClose: () => void;
  onPrintBiodata: (teacher: Teacher) => void;
  onPrintCard: (teacher: Teacher) => void;
}

export const GtkDetailModal: React.FC<GtkDetailModalProps> = ({
  teacher,
  isOpen,
  onClose,
  onPrintBiodata,
  onPrintCard
}) => {
  if (!teacher) return null;

  const formattedDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 rounded-3xl border-0 shadow-2xl bg-white">
        {/* Header Hero */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-6 rounded-t-3xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 relative z-10">
            {/* Foto Profile */}
            <div className="w-20 h-24 sm:w-24 sm:h-28 rounded-2xl bg-slate-800 border-2 border-emerald-400/60 overflow-hidden shrink-0 shadow-xl">
              {teacher.foto_url ? (
                <img
                  src={formatImageUrl(teacher.foto_url)}
                  alt={teacher.nama}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-black text-3xl text-emerald-300 bg-emerald-950/80">
                  {teacher.nama.charAt(0)}
                </div>
              )}
            </div>

            {/* Info Title */}
            <div className="space-y-1 text-center sm:text-left flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5">
                <Badge className="bg-emerald-400 text-slate-950 font-black text-[10px] uppercase px-2.5 py-0.5 rounded-full">
                  {teacher.status_keaktifan || 'Aktif Bertugas'}
                </Badge>
                {teacher.status_kepegawaian && (
                  <Badge variant="outline" className="text-emerald-200 border-emerald-400/40 text-[10px] font-bold">
                    {teacher.status_kepegawaian}
                  </Badge>
                )}
              </div>

              <h2 className="text-lg sm:text-xl font-black text-white leading-snug">
                {formatTeacherDisplayName(teacher)}
              </h2>

              <p className="text-xs font-bold text-emerald-300 flex items-center justify-center sm:justify-start gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{teacher.jabatan}</span>
              </p>

              {teacher.mapel_diampu && (
                <p className="text-[11px] text-emerald-100/80">
                  Mapel: {teacher.mapel_diampu}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Modal Body: Detailed Tabular Sections */}
        <div className="p-6 space-y-5 text-xs">
          {/* Quick Action Print Buttons */}
          <div className="flex flex-wrap items-center gap-2 p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-2xl">
            <span className="text-[11px] font-bold text-emerald-950 mr-1 flex items-center gap-1">
              <Printer className="w-3.5 h-3.5 text-emerald-700" /> Cetak:
            </span>
            <Button
              size="sm"
              onClick={() => onPrintBiodata(teacher)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-8 gap-1.5 shadow-xs"
            >
              <FileText className="w-3.5 h-3.5" /> Cetak Lembar Biodata Resmi
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPrintCard(teacher)}
              className="bg-white hover:bg-slate-100 text-slate-800 border-slate-300 rounded-xl text-xs font-bold h-8 gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-600" /> Cetak Kartu ID GTK
            </Button>
          </div>

          {/* Section 1: Identitas Pribadi */}
          <div className="space-y-2">
            <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 pb-1">
              <User className="w-3.5 h-3.5 text-emerald-600" /> Identitas Pribadi
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">NIK (Nomor Induk Kependudukan)</span>
                <span className="font-mono font-bold text-slate-900">{teacher.nik || '-'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Jenis Kelamin</span>
                <span className="font-bold text-slate-900">{teacher.gender}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Tempat, Tanggal Lahir</span>
                <span className="font-bold text-slate-900">
                  {teacher.tempat_lahir || '-'}, {formattedDate(teacher.tanggal_lahir)}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Pendidikan Terakhir</span>
                <span className="font-bold text-slate-900">{teacher.pendidikan}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 sm:col-span-2">
                <span className="text-[10px] text-slate-400 block font-medium">Alamat Rumah / Domisili</span>
                <span className="font-semibold text-slate-900">{teacher.alamat_rumah || '-'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Kepegawaian & Nomor Registrasi */}
          <div className="space-y-2">
            <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 pb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> Kepegawaian & Nomor Registrasi
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">NIP (PNS / PPPK)</span>
                <span className="font-mono font-bold text-slate-900">{teacher.nip || '-'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">NPK Kemenag</span>
                <span className="font-mono font-bold text-slate-900">{teacher.npk || '-'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">NUPTK</span>
                <span className="font-mono font-bold text-slate-900">{teacher.nuptk || '-'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Peg ID (Simpatika/Siaga)</span>
                <span className="font-mono font-bold text-slate-900">{teacher.peg_id || '-'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">NRG (Nomor Registrasi Guru)</span>
                <span className="font-mono font-bold text-slate-900">{teacher.nrg || '-'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Status Sertifikasi</span>
                <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
                  {teacher.sertifikasi === 'Sudah Sertifikasi' ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                  )}
                  {teacher.sertifikasi}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">No. Sertifikat Pendidik</span>
                <span className="font-mono font-bold text-slate-900">{teacher.no_sertifikat_pendidik || '-'}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Tugas Mengajar & Kontak */}
          <div className="space-y-2">
            <h4 className="font-black text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-100 pb-1">
              <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Tugas Mengajar & Kontak
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Kelas yang Diampu</span>
                <span className="font-bold text-slate-900">{teacher.mengajar_kelas || '-'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Mata Pelajaran</span>
                <span className="font-bold text-slate-900">{teacher.mapel_diampu || '-'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">No. WhatsApp / HP</span>
                <span className="font-mono font-bold text-slate-900">{teacher.telepon || '-'}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] text-slate-400 block font-medium">Alamat Email</span>
                <span className="font-mono font-bold text-slate-900">{teacher.email || '-'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2 rounded-b-3xl">
          <Button
            variant="outline"
            onClick={onClose}
            className="rounded-xl text-xs font-bold"
          >
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GtkDetailModal;
