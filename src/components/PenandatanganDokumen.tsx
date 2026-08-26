"use client";

import React from 'react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';

interface PenandatanganProps {
  title?: string;
  showGuru?: boolean;
  targetKelas?: string;
  tanggalCetak?: string;
  tglDoc?: string;
  kategori?: string;
  mode?: 'default' | 'spmb';
  compact?: boolean;
  className?: string;
  customGuru?: {
    nama?: string;
    nip?: string;
    jabatan?: string;
    kelas?: string;
    tanda_tangan_url?: string | null;
  };
  customKepala?: {
    nama?: string;
    nip?: string;
    jabatan?: string;
    ttd?: string | null;
    stempel?: string | null;
  };
  customKota?: string;
}

const PenandatanganDokumen = ({ 
  title = "Mengetahui,", 
  showGuru = true, 
  targetKelas, 
  tanggalCetak, 
  tglDoc,
  kategori: _kategori,
  mode = 'default',
  compact = false,
  className,
  customGuru,
  customKepala,
  customKota
}: PenandatanganProps) => {
  const { settings } = useSiteSettings();
  const { activeMadrasah, activeMadrasahId } = useMadrasah();
  const { currentTeacher, isAuthenticated, teachersList } = useTeacherAuth();

  const scopedPenandatanganKey = `penandatangan_${activeMadrasahId}`;
  const scopedIdentitasKey = `identitas_madrasah_${activeMadrasahId}`;

  const penandatangan = settings[scopedPenandatanganKey] || settings.penandatangan || {};
  const identitas = settings[scopedIdentitasKey] || settings.identitas_madrasah || {};

  const rawTanggal = tanggalCetak || tglDoc;
  const tglDate = rawTanggal ? new Date(rawTanggal) : new Date();
  const tgl = isNaN(tglDate.getTime()) ? (rawTanggal || '') : tglDate.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const kota = customKota || identitas.kabupaten || (activeMadrasah as any)?.kabupaten || 'Indonesia';
  
  const kepala = {
    nama: customKepala?.nama || penandatangan.kepala_nama || identitas.nama_pimpinan || activeMadrasah?.nama_pimpinan || settings.general?.headmaster_name || '[Nama Kepala Madrasah]',
    nip: customKepala?.nip || penandatangan.kepala_nip || identitas.nip_pimpinan || activeMadrasah?.nip_pimpinan || '-',
    jabatan: customKepala?.jabatan || penandatangan.kepala_jabatan || settings.general?.headmaster_title || 'Kepala Madrasah',
    ttd: customKepala?.ttd !== undefined ? customKepala.ttd : penandatangan.kepala_tanda_tangan_url,
    stempel: customKepala?.stempel !== undefined ? customKepala.stempel : penandatangan.kepala_stempel_url
  };

  const panitia = {
    nama: penandatangan.ketua_panitia_nama || '[Nama Ketua Panitia]',
    nip: penandatangan.ketua_panitia_nip || '-',
    jabatan: 'Ketua Panitia SPMB',
    ttd: penandatangan.ketua_panitia_tanda_tangan_url
  };

  // Mode SPMB: Kepala Madrasah (Kiri) & Ketua Panitia (Kanan)
  if (mode === 'spmb') {
    return (
      <div className="mt-12 grid grid-cols-2 gap-12 text-[11pt] font-serif">
        <div className="text-center">
          <p>{title}</p>
          <p className="mb-20">{kepala.jabatan},</p>
          <div className="relative inline-block">
            {kepala.stempel && (
              <img src={kepala.stempel} alt="Stempel" className="absolute -top-36 left-[-48px] w-[270px] object-contain opacity-90 mix-blend-multiply" />
            )}
            {kepala.ttd && (
              <img src={kepala.ttd} alt="TTD" className="absolute -top-16 left-4 h-20 object-contain mix-blend-multiply" />
            )}
            <p className="font-bold underline uppercase">{kepala.nama}</p>
          </div>
          <p>NIP. {kepala.nip}</p>
        </div>

        <div className="text-center">
          <p className="mb-1">{kota}, {tgl}</p>
          <p className="mb-20">{panitia.jabatan},</p>
          <div className="relative inline-block">
            {panitia.ttd && (
              <img src={panitia.ttd} alt="TTD" className="absolute -top-16 left-1/2 -translate-x-1/2 h-20 object-contain mix-blend-multiply" />
            )}
            <p className="font-bold underline uppercase">{panitia.nama}</p>
          </div>
          <p>NIP. {panitia.nip}</p>
        </div>
      </div>
    );
  }

  // Default Mode (Kepala & Guru Kelas / Guru yang Bersangkutan)
  let selectedGuru = null;

  const isPlaceholderName = (name?: string) => {
    if (!name) return true;
    const clean = name.trim();
    return clean === '' || 
      clean.includes('......') || 
      clean === '[Nama Guru]' || 
      clean === 'Semua Guru / Pendidik Madrasah' ||
      clean === 'Guru yang Bersangkutan';
  };

  if (customGuru && !isPlaceholderName(customGuru.nama)) {
    // Find digital signature / missing info from logged in teacher or teachersList
    let ttdUrl = customGuru.tanda_tangan_url || null;
    let guruNip = customGuru.nip && customGuru.nip !== '-' ? customGuru.nip : '';
    let guruJabatan = customGuru.jabatan || '';

    if (currentTeacher && currentTeacher.nama && currentTeacher.nama.toLowerCase().trim() === customGuru.nama?.toLowerCase().trim()) {
      if (!ttdUrl && currentTeacher.tanda_tangan_url) ttdUrl = currentTeacher.tanda_tangan_url;
      if (!guruNip && currentTeacher.nip) guruNip = currentTeacher.nip;
      if (!guruJabatan && currentTeacher.jabatan) guruJabatan = currentTeacher.jabatan;
    } else if (!ttdUrl && teachersList && teachersList.length > 0) {
      const matchInList = teachersList.find(t => t.nama.toLowerCase().trim() === customGuru.nama?.toLowerCase().trim());
      if (matchInList) {
        if (!ttdUrl && matchInList.tanda_tangan_url) ttdUrl = matchInList.tanda_tangan_url;
        if (!guruNip && matchInList.nip) guruNip = matchInList.nip;
        if (!guruJabatan && matchInList.jabatan) guruJabatan = matchInList.jabatan;
      }
    }

    selectedGuru = {
      nama: customGuru.nama,
      nip: guruNip || '-',
      jabatan: guruJabatan || 'Guru yang Bersangkutan',
      kelas: customGuru.kelas || targetKelas || '',
      tanda_tangan_url: ttdUrl
    };
  } else if (isAuthenticated && currentTeacher && currentTeacher.nama) {
    // Automatically use the logged-in teacher data
    let derivedJabatan = currentTeacher.jabatan;
    if (!derivedJabatan || derivedJabatan === 'Pendidik') {
      if (currentTeacher.kelas) {
        derivedJabatan = `Guru Kelas ${currentTeacher.kelas}`;
      } else if (currentTeacher.mapel_diampu) {
        derivedJabatan = `Guru ${currentTeacher.mapel_diampu}`;
      } else {
        derivedJabatan = 'Guru yang Bersangkutan';
      }
    }

    selectedGuru = {
      nama: currentTeacher.nama,
      nip: currentTeacher.nip && currentTeacher.nip !== '-' ? currentTeacher.nip : '-',
      jabatan: derivedJabatan,
      kelas: currentTeacher.kelas || targetKelas || '',
      tanda_tangan_url: currentTeacher.tanda_tangan_url || null
    };
  } else if (targetKelas && penandatangan.guru_kelas) {
    const classMatch = targetKelas.match(/\d+/);
    const classNum = classMatch ? classMatch[0] : null;
    if (classNum) {
      const matched = penandatangan.guru_kelas.find((g: any) => {
        const k = g.kelas?.toLowerCase() || "";
        const teacherClassMatch = k.match(/\d+/);
        return teacherClassMatch && teacherClassMatch[0] === classNum;
      });
      if (matched) {
        selectedGuru = {
          nama: matched.nama,
          nip: matched.nip || '-',
          jabatan: matched.jabatan || `Guru Kelas ${classNum}`,
          kelas: matched.kelas || targetKelas || '',
          tanda_tangan_url: matched.tanda_tangan_url || null
        };
      }
    }
  }

  const guru = selectedGuru || {
    nama: '..........................................',
    nip: '..........................................',
    jabatan: 'Guru yang Bersangkutan',
    kelas: targetKelas || '',
    tanda_tangan_url: null
  };

  let teacherTitle = guru.jabatan || 'Guru yang Bersangkutan';
  if (guru.kelas && !teacherTitle.toLowerCase().includes(guru.kelas.toLowerCase()) && !teacherTitle.toLowerCase().includes('kelas')) {
    const cleanKelas = guru.kelas.toLowerCase().includes('kelas') ? guru.kelas : `Kelas ${guru.kelas}`;
    teacherTitle = `${teacherTitle} ${cleanKelas}`;
  }

  const containerClasses = className || (
    compact 
      ? `mt-3 grid ${showGuru ? 'grid-cols-2' : 'grid-cols-1'} gap-6 text-[8.5pt] font-serif`
      : `mt-10 grid ${showGuru ? 'grid-cols-2' : 'grid-cols-1'} gap-10 text-[10pt] font-serif`
  );

  const signatureGapClass = compact ? 'mb-10' : 'mb-16';

  return (
    <div className={containerClasses}>
      {showGuru ? (
        <>
          <div className="text-center">
            <p className="leading-tight">{title}</p>
            <p className={`${signatureGapClass} leading-tight`}>{kepala.jabatan},</p>
            <div className="relative inline-block">
              {kepala.stempel && (
                <img 
                  src={kepala.stempel} 
                  alt="Stempel" 
                  className={`absolute left-[-36px] object-contain opacity-90 mix-blend-multiply ${
                    compact ? '-top-20 w-[180px]' : '-top-32 w-[240px]'
                  }`} 
                />
              )}
              {kepala.ttd && (
                <img 
                  src={kepala.ttd} 
                  alt="TTD" 
                  className={`absolute left-2 object-contain mix-blend-multiply ${
                    compact ? '-top-12 h-14' : '-top-16 h-20'
                  }`} 
                />
              )}
              <p className="font-bold underline uppercase leading-tight">{kepala.nama}</p>
            </div>
            <p className="leading-tight">NIP. {kepala.nip}</p>
          </div>

          <div className="text-center">
            <p className="mb-0.5 leading-tight">{kota}, {tgl}</p>
            <p className={`${signatureGapClass} leading-tight`}>{teacherTitle},</p>
            <div className="relative inline-block">
              {guru.tanda_tangan_url && (
                <img 
                  src={guru.tanda_tangan_url} 
                  alt="TTD" 
                  className={`absolute left-1/2 -translate-x-1/2 object-contain mix-blend-multiply ${
                    compact ? '-top-12 h-14' : '-top-16 h-20'
                  }`} 
                />
              )}
              <p className="font-bold underline uppercase leading-tight">{guru.nama}</p>
            </div>
            <p className="leading-tight">NIP. {guru.nip}</p>
          </div>
        </>
      ) : (
        <div className="text-right pr-6 sm:pr-12">
          <p className="mb-0.5 leading-tight">{kota}, {tgl}</p>
          <p className="leading-tight">{title}</p>
          <p className={`${signatureGapClass} leading-tight`}>{kepala.jabatan},</p>
          <div className="relative inline-block">
            {kepala.stempel && (
              <img 
                src={kepala.stempel} 
                alt="Stempel" 
                className={`absolute left-[-36px] object-contain opacity-90 mix-blend-multiply ${
                  compact ? '-top-20 w-[180px]' : '-top-32 w-[240px]'
                }`} 
              />
            )}
            {kepala.ttd && (
              <img 
                src={kepala.ttd} 
                alt="TTD" 
                className={`absolute left-2 object-contain mix-blend-multiply ${
                  compact ? '-top-12 h-14' : '-top-16 h-20'
                }`} 
              />
            )}
            <p className="font-bold underline uppercase leading-tight">{kepala.nama}</p>
          </div>
          <p className="leading-tight">NIP. {kepala.nip}</p>
        </div>
      )}
    </div>
  );
};

export default PenandatanganDokumen;
