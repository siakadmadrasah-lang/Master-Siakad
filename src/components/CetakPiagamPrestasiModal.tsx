"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Trophy, Download, ShieldCheck, Sparkles, Award } from 'lucide-react';
import { PrestasiItem } from '@/types/prestasi';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useMadrasah } from '@/contexts/MadrasahContext';

interface CetakPiagamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: PrestasiItem | null;
}

const CetakPiagamPrestasiModal: React.FC<CetakPiagamModalProps> = ({
  open,
  onOpenChange,
  item
}) => {
  const { settings } = useSiteSettings();
  const { activeMadrasah, activeMadrasahId } = useMadrasah();
  
  const [showStempel, setShowStempel] = useState(true);
  const [showTtd, setShowTtd] = useState(true);
  const [showFoto, setShowFoto] = useState(true);

  const scopedPenandatanganKey = `penandatangan_${activeMadrasahId || 'default'}`;
  const scopedIdentitasKey = `identitas_madrasah_${activeMadrasahId || 'default'}`;
  const penandatangan = settings[scopedPenandatanganKey] || settings.penandatangan || {};
  const identitas = settings[scopedIdentitasKey] || settings.identitas_madrasah || {};

  const kepala = {
    nama: penandatangan.kepala_nama || 'Kepala Madrasah',
    nip: penandatangan.kepala_nip || '-',
    jabatan: penandatangan.kepala_jabatan || 'Kepala Madrasah',
    ttd: penandatangan.kepala_ttd_url || null,
    stempel: penandatangan.kepala_stempel_url || null
  };

  const logoMadrasah = identitas.logo_url || activeMadrasah?.logo_url || '/logo.png';
  const namaMadrasah = activeMadrasah?.nama_madrasah || identitas.nama_madrasah || settings.general?.school_name || 'Madrasah Ibtidaiyah';
  const kota = identitas.kabupaten || (activeMadrasah as any)?.kabupaten || 'Indonesia';

  if (!item) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] p-4 sm:p-6 max-h-[95vh] overflow-y-auto rounded-3xl">
        <DialogHeader className="print:hidden border-b pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2 text-amber-800">
                <Award className="w-5 h-5 text-amber-600" />
                Cetak Piagam / Sertifikat Prestasi
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5">
                Pratinjau piagam penghargaan resmi berstandar madrasah untuk {item.nama_siswa}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={handlePrint}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl gap-2 shadow-md"
              >
                <Printer className="w-4 h-4" /> Cetak Piagam (A4 Landscape)
              </Button>
            </div>
          </div>

          {/* Quick Option Toggles */}
          <div className="flex flex-wrap items-center gap-3 pt-3 text-xs">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-semibold">
              <input
                type="checkbox"
                checked={showTtd}
                onChange={(e) => setShowTtd(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              Tanda Tangan Digital
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-semibold">
              <input
                type="checkbox"
                checked={showStempel}
                onChange={(e) => setShowStempel(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500"
              />
              Stempel Resmi
            </label>
            {item.foto_url && (
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-semibold">
                <input
                  type="checkbox"
                  checked={showFoto}
                  onChange={(e) => setShowFoto(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                Sematkan Foto Dokumentasi
              </label>
            )}
          </div>
        </DialogHeader>

        {/* Piagam Certificate Canvas (Printable Target) */}
        <div id="piagam-print-area" className="w-full bg-amber-50/20 p-2 sm:p-4 rounded-2xl border border-amber-200/60 mt-2">
          <div className="relative bg-white border-8 border-double border-amber-700/80 rounded-xl p-6 sm:p-10 shadow-lg text-slate-900 overflow-hidden font-serif">
            {/* Background Ornamental Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
              <Trophy className="w-96 h-96 text-amber-900" />
            </div>

            {/* Corner Decorative Ornaments */}
            <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-600 pointer-events-none" />
            <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-600 pointer-events-none" />
            <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-600 pointer-events-none" />
            <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-600 pointer-events-none" />

            {/* Certificate Header */}
            <div className="text-center relative z-10 space-y-1">
              <div className="flex items-center justify-center gap-4 mb-2">
                {logoMadrasah && (
                  <img
                    src={logoMadrasah}
                    alt="Logo Madrasah"
                    className="w-14 h-14 object-contain"
                    onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                  />
                )}
                <div>
                  <h3 className="text-xs sm:text-sm font-sans font-bold uppercase tracking-widest text-amber-800">
                    KEMENTERIAN AGAMA REPUBLIK INDONESIA
                  </h3>
                  <h2 className="text-base sm:text-lg font-bold font-serif uppercase tracking-wider text-slate-900">
                    {namaMadrasah}
                  </h2>
                  <p className="text-[10px] font-sans text-slate-500">
                    {identitas.alamat || 'Lembaga Pendidikan Dasar Berbasis Karakter Islami'}
                  </p>
                </div>
              </div>

              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-amber-600 to-transparent my-3" />

              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-[0.2em] text-amber-900 pt-1">
                PIAGAM PENGHARGAAN
              </h1>
              <p className="text-xs font-sans text-slate-600 font-medium">
                Nomor: {item.nomor_piagam || `421.2/PP-${item.id.slice(-4)}/${new Date().getFullYear()}`}
              </p>
            </div>

            {/* Certificate Body */}
            <div className="text-center my-6 relative z-10 space-y-3">
              <p className="text-xs sm:text-sm text-slate-700 italic">
                Kepala Madrasah memberikan piagam penghargaan dan apresiasi setinggi-tingginya kepada:
              </p>

              {/* Student Name */}
              <div className="py-2">
                <h2 className="text-xl sm:text-2xl font-bold uppercase underline decoration-amber-600 decoration-2 tracking-wide text-slate-900">
                  {item.nama_siswa}
                </h2>
                {item.nisn && (
                  <p className="text-xs font-sans text-slate-600 mt-0.5 font-medium">
                    NISN: {item.nisn} {item.kelas ? `• ${item.kelas}` : ''}
                  </p>
                )}
              </div>

              <p className="text-xs sm:text-sm text-slate-700 max-w-2xl mx-auto leading-relaxed">
                Atas dedikasi, kerja keras, dan prestasi gemilang yang berhasil diraih sebagai:
              </p>

              {/* Juara Box Callout */}
              <div className="inline-block bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white px-6 py-2 rounded-xl shadow-md my-1">
                <span className="text-base sm:text-lg font-black uppercase tracking-wider font-sans">
                  {item.juara_ke}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  "{item.jenis_lomba}"
                </h3>
                <p className="text-xs sm:text-sm font-sans font-semibold text-amber-900">
                  Tingkat {item.tingkat} {item.bidang ? `(Bidang ${item.bidang})` : ''}
                </p>
                {item.penyelenggara && (
                  <p className="text-xs text-slate-600 font-sans">
                    Diselenggarakan oleh: <span className="font-semibold">{item.penyelenggara}</span>
                  </p>
                )}
              </div>

              {/* Photo attachment if available and checked */}
              {item.foto_url && showFoto && (
                <div className="mt-4 flex justify-center print:mt-2">
                  <div className="p-1 border-2 border-amber-600/40 rounded-lg bg-white shadow-sm inline-block">
                    <img
                      src={item.foto_url}
                      alt={`Dokumentasi ${item.nama_siswa}`}
                      className="h-24 sm:h-28 w-auto max-w-[180px] object-cover rounded"
                    />
                    <p className="text-[9px] font-sans text-slate-500 text-center mt-0.5">Dokumentasi Prestasi</p>
                  </div>
                </div>
              )}
            </div>

            {/* Certificate Signature */}
            <div className="mt-8 pt-4 flex justify-between items-end relative z-10 text-xs font-sans">
              <div className="text-left">
                {item.pembimbing && (
                  <div className="space-y-0.5">
                    <p className="text-slate-500 text-[11px]">Guru Pembina / Pelatih:</p>
                    <p className="font-bold text-slate-800 underline">{item.pembimbing}</p>
                  </div>
                )}
              </div>

              <div className="w-64 text-center">
                <p className="text-slate-700">
                  {kota}, {formatDate(item.tanggal_kegiatan || new Date().toISOString().slice(0, 10))}
                </p>
                <p className="font-bold text-slate-900 mb-14">{kepala.jabatan},</p>

                <div className="relative inline-block">
                  {showStempel && kepala.stempel && (
                    <img
                      src={kepala.stempel}
                      alt="Stempel"
                      className="absolute -top-32 left-[-40px] w-52 object-contain opacity-85 mix-blend-multiply pointer-events-none"
                    />
                  )}
                  {showTtd && kepala.ttd && (
                    <img
                      src={kepala.ttd}
                      alt="TTD"
                      className="absolute -top-14 left-4 h-16 object-contain mix-blend-multiply pointer-events-none"
                    />
                  )}
                  <p className="font-bold text-slate-900 underline uppercase tracking-wide">
                    {kepala.nama}
                  </p>
                </div>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  {kepala.nip && kepala.nip !== '-' ? `NIP. ${kepala.nip}` : 'NIP. -'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Global Print Style for Certificate */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            #piagam-print-area, #piagam-print-area * {
              visibility: visible;
            }
            #piagam-print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 0;
              border: none;
              background: white;
            }
            @page {
              size: A4 landscape;
              margin: 8mm;
            }
          }
        `}} />
      </DialogContent>
    </Dialog>
  );
};

export default CetakPiagamPrestasiModal;
