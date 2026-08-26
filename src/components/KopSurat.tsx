"use client";

import React, { useRef, useState, useLayoutEffect, useEffect } from 'react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useMadrasah } from '@/contexts/MadrasahContext';

export interface KopSuratCustomData {
  use_custom_kop?: boolean;
  header_pengayom?: string;
  nama_yayasan?: string;
  nama_kop?: string;
  nama_madrasah?: string;
  sub_header?: string;
  alamat?: string;
  telepon?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  logo_kanan_url?: string;
  garis_style?: 'double' | 'single' | 'thick' | 'accent' | 'none';
  font_size_nama?: 'sm' | 'md' | 'lg' | 'xl';
}

interface KopSuratProps {
  customData?: KopSuratCustomData;
}

/**
 * Menghitung ukuran font dasar yang tegas, berwibawa, dan proporsional untuk Nama Madrasah
 */
const getBaseSizePt = (baseSize: 'sm' | 'md' | 'lg' | 'xl' = 'lg'): number => {
  switch (baseSize) {
    case 'sm': return 15;
    case 'md': return 17;
    case 'xl': return 22;
    case 'lg':
    default:
      return 19;
  }
};

const calculateInitialFontSize = (text: string, baseSize: 'sm' | 'md' | 'lg' | 'xl' = 'lg'): number => {
  const len = (text || '').trim().length;
  const basePt = getBaseSizePt(baseSize);

  // Jika teks sangat panjang, kurangi sedikit batas awal agar tidak meluber
  if (len <= 28) return basePt;
  if (len <= 38) return Math.min(basePt, 18);
  if (len <= 48) return Math.min(basePt, 16.5);
  if (len <= 58) return Math.min(basePt, 15);
  if (len <= 70) return Math.min(basePt, 13.5);
  return Math.min(basePt, 12);
};

const KopSurat = ({ customData }: KopSuratProps) => {
  const { settings } = useSiteSettings();
  const { activeMadrasah, activeMadrasahId } = useMadrasah();
  const [, setLocalTick] = useState(0);

  // Listener untuk real-time update tanpa perlu full page reload
  useEffect(() => {
    const handleUpdate = () => setLocalTick(t => t + 1);
    window.addEventListener('siakad_identitas_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('siakad_identitas_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  const scopedIdentitasKey = `identitas_madrasah_${activeMadrasahId}`;
  
  // Baca identitas dari berbagai layer fallback (settings, localStorage, activeMadrasah)
  let cachedIdentitas: any = {};
  try {
    const rawScoped = localStorage.getItem(scopedIdentitasKey);
    const rawGlobal = localStorage.getItem('siakad_identitas_madrasah');
    if (rawScoped) {
      cachedIdentitas = JSON.parse(rawScoped);
    } else if (rawGlobal) {
      cachedIdentitas = JSON.parse(rawGlobal);
    }
  } catch (e) {
    // Ignore parse error
  }

  const identitas = {
    ...(settings.identitas_madrasah || {}),
    ...(settings[scopedIdentitasKey] || {}),
    ...cachedIdentitas,
  };

  const general = settings.general || {};

  // 1. Header Pengayom (misal: KEMENTERIAN AGAMA REPUBLIK INDONESIA / LP MA'ARIF NU)
  const rawHeaderPengayom = customData?.header_pengayom 
    || (identitas.header_pengayom && identitas.header_pengayom.trim()) 
    || '';

  // 2. Nama Yayasan
  const rawNamaYayasan = customData?.nama_yayasan 
    || (identitas.nama_yayasan_kop && identitas.nama_yayasan_kop.trim()) 
    || identitas.nama_yayasan 
    || (activeMadrasah as any)?.nama_yayasan 
    || '';

  // Cegah duplikasi teks jika Header Pengayom dan Nama Yayasan berisi teks yang sama
  const isDuplicateHeader = rawHeaderPengayom && rawNamaYayasan &&
    rawHeaderPengayom.trim().toLowerCase() === rawNamaYayasan.trim().toLowerCase();

  const headerPengayom = isDuplicateHeader ? '' : rawHeaderPengayom;
  const namaYayasan = rawNamaYayasan;

  // 3. Nama Kop Surat (KOP UTAMA - 1 BARIS OTOMATIS)
  const namaSekolah = (customData?.nama_kop && customData.nama_kop.trim())
    || (customData?.nama_madrasah && customData.nama_madrasah.trim())
    || (identitas.nama_kop && identitas.nama_kop.trim())
    || (identitas.nama_madrasah && identitas.nama_madrasah.trim())
    || activeMadrasah?.nama_madrasah
    || general.school_name
    || "MI MA'ARIF NU 2 SANGGREMAN";

  // 4. Sub-Header (Akreditasi / NSM / NPSN)
  const nsmVal = identitas.nsm || activeMadrasah?.nsm || '';
  const npsnVal = identitas.npsn || activeMadrasah?.npsn || '';
  const akredVal = identitas.akreditasi || (activeMadrasah as any)?.akreditasi || 'A';

  const defaultSubHeaderParts = [
    nsmVal ? `NSM: ${nsmVal}` : '',
    npsnVal ? `NPSN: ${npsnVal}` : '',
    akredVal ? `AKREDITASI ${akredVal}` : ''
  ].filter(Boolean).join(' | ');

  const subHeader = (customData?.sub_header && customData.sub_header.trim())
    || (identitas.sub_header_kop && identitas.sub_header_kop.trim())
    || defaultSubHeaderParts;

  // 5. Alamat Lengkap mengalir dari Profil Madrasah atau Kop Custom
  const rawAlamat = identitas.alamat || activeMadrasah?.alamat || general.address || 'Jl. Raya Sanggreman No. 12';
  const kec = identitas.kecamatan || (activeMadrasah as any)?.kecamatan || '';
  const kab = identitas.kabupaten || (activeMadrasah as any)?.kabupaten || '';
  const prov = identitas.provinsi || (activeMadrasah as any)?.provinsi || '';
  const pos = identitas.kode_pos || (activeMadrasah as any)?.kode_pos || '';
  const rtRw = identitas.rt_rw || '';
  const dusun = identitas.dusun || '';
  const desa = identitas.desa || '';

  // Bangun alamat terpadu yang bersih
  const detailWilayahParts = [
    rtRw ? rtRw : '',
    dusun && dusun !== desa ? dusun : '',
    desa ? desa : '',
    kec ? `Kec. ${kec}` : '',
    kab ? (kab.toLowerCase().startsWith('kab') || kab.toLowerCase().startsWith('kota') ? kab : `Kab. ${kab}`) : '',
    prov ? prov : '',
    pos ? pos : ''
  ].filter(Boolean);

  const defaultAlamatLengkap = [rawAlamat, ...detailWilayahParts].filter(Boolean).join(', ');

  const alamatSekolah = (customData?.alamat && customData.alamat.trim())
    || (identitas.alamat_kop && identitas.alamat_kop.trim())
    || defaultAlamatLengkap;

  // 6. Kontak & Media mengalir langsung dari Profil Madrasah atau Kop Custom
  const telp = customData?.telepon ?? (identitas.telepon || activeMadrasah?.telepon || general.phone || '');
  const email = customData?.email ?? (identitas.email || activeMadrasah?.email || general.email || '');
  const web = customData?.website ?? (identitas.website || (activeMadrasah as any)?.website || general.website || '');

  const dynamicKontakParts = [
    telp ? `Telp: ${telp}` : '',
    email ? `Email: ${email}` : '',
    web ? `Web: ${web.replace(/^https?:\/\//i, '')}` : ''
  ].filter(Boolean);

  const kontakDefault = dynamicKontakParts.join(' | ');
  
  // Kontak kustom: jika customData.kontak dioper, atau kontak_kop diisi di panel identitas madrasah
  const kontakCustom = (customData?.kontak && customData.kontak.trim()) 
    || (identitas.kontak_kop && identitas.kontak_kop.trim()) 
    || '';

  const kontak = kontakCustom || kontakDefault;

  // 7. Logo Sisi Kiri & Kanan
  const logoUrl = customData?.logo_url ?? (identitas.logo_url || activeMadrasah?.logo_url || general.logo_url);
  const logoKananUrl = customData?.logo_kanan_url ?? (identitas.logo_kanan_url || '');

  // 8. Style Garis & Font Size
  const garisStyle = customData?.garis_style ?? (identitas.garis_style_kop || 'double');
  const fontSizeNama = customData?.font_size_nama ?? (identitas.font_size_nama_kop || 'lg');

  // Class untuk garis bawah Kop Surat
  let borderClass = "border-b-[3px] border-double border-black";
  if (garisStyle === 'single') borderClass = "border-b-2 border-black";
  else if (garisStyle === 'thick') borderClass = "border-b-4 border-black";
  else if (garisStyle === 'accent') borderClass = "border-b-4 border-emerald-600";
  else if (garisStyle === 'none') borderClass = "border-b-0";

  // Fit font-size otomatis tanpa CSS transform scaling agar teks tajam & tidak terpotong
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const titleHeadingRef = useRef<HTMLHeadingElement>(null);
  const [fittedFontSizePt, setFittedFontSizePt] = useState<number>(() => 
    calculateInitialFontSize(namaSekolah, fontSizeNama)
  );

  useLayoutEffect(() => {
    const adjustFontSize = () => {
      if (!titleContainerRef.current || !titleHeadingRef.current) return;
      const containerWidth = titleContainerRef.current.clientWidth;
      if (containerWidth <= 0) return;

      const basePt = calculateInitialFontSize(namaSekolah, fontSizeNama);
      let currentPt = basePt;
      titleHeadingRef.current.style.fontSize = `${currentPt}pt`;
      
      // Jika container cukup lebar (> 300px), periksa apakah teks meluber dan sesuaikan secara presisi
      if (containerWidth > 300) {
        let safetyCounter = 0;
        while (
          titleHeadingRef.current.scrollWidth > containerWidth && 
          currentPt > 11 && 
          safetyCounter < 25
        ) {
          currentPt -= 0.5;
          titleHeadingRef.current.style.fontSize = `${currentPt}pt`;
          safetyCounter++;
        }
      }

      setFittedFontSizePt(currentPt);
    };

    adjustFontSize();
    const timer = setTimeout(adjustFontSize, 100);
    window.addEventListener('resize', adjustFontSize);
    window.addEventListener('beforeprint', adjustFontSize);
    window.addEventListener('afterprint', adjustFontSize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', adjustFontSize);
      window.removeEventListener('beforeprint', adjustFontSize);
      window.removeEventListener('afterprint', adjustFontSize);
    };
  }, [namaSekolah, fontSizeNama]);

  return (
    <div className={`${borderClass} pb-3 mb-6 flex items-center justify-between w-full font-serif print:mb-4 text-black`}>
      {/* Logo Kiri */}
      <div className="w-[14%] max-w-[85px] flex justify-start items-center shrink-0">
        {logoUrl ? (
          <img 
            src={logoUrl} 
            alt="Logo Kiri" 
            className="h-20 max-h-20 w-auto object-contain max-w-full print:max-h-20"
          />
        ) : (
          <div className="h-16 w-16 bg-gray-50 rounded flex items-center justify-center text-[8px] text-gray-400 font-sans border border-gray-200">
            LOGO
          </div>
        )}
      </div>

      {/* Teks Tengah Kop Surat */}
      <div ref={titleContainerRef} className="flex-1 text-center flex flex-col justify-center px-2 min-w-0">
        {headerPengayom && (
          <h3 className="text-[9.5pt] sm:text-[10pt] font-bold uppercase tracking-wider leading-snug mb-0.5 text-black break-words">
            {headerPengayom}
          </h3>
        )}
        {namaYayasan && (
          <h2 className="text-[10.5pt] sm:text-[11pt] font-bold uppercase tracking-normal leading-snug mb-0.5 text-black break-words">
            {namaYayasan}
          </h2>
        )}
        
        {/* NAMA MADRASAH: 1 BARIS OTOMATIS BERWIBAWA & BEBAS TERPOTONG */}
        <div className="w-full flex justify-center items-center my-0.5 py-0.5 min-w-0">
          <h1 
            ref={titleHeadingRef}
            className="font-black uppercase text-black whitespace-nowrap text-center select-text inline-block max-w-full"
            style={{
              fontSize: `${fittedFontSizePt}pt`,
              lineHeight: 1.2,
            }}
          >
            {namaSekolah}
          </h1>
        </div>

        {subHeader && (
          <p className="text-[8.5pt] sm:text-[9pt] font-semibold text-black leading-snug mb-0.5 break-words">
            {subHeader}
          </p>
        )}
        
        {/* Baris Alamat & Kontak mengalir dari Profil Madrasah */}
        <div className="text-[8pt] sm:text-[8.5pt] leading-snug text-black flex flex-col items-center mt-0.5">
          <p className="text-center max-w-full font-normal break-words">
            {alamatSekolah}
          </p>
          {kontak && (
            <p className="mt-0.5 font-normal italic text-center max-w-full break-words">
              {kontak}
            </p>
          )}
        </div>
      </div>

      {/* Logo Kanan / Ruang Keseimbangan */}
      <div className="w-[14%] max-w-[85px] flex justify-end items-center shrink-0">
        {logoKananUrl ? (
          <img 
            src={logoKananUrl} 
            alt="Logo Kanan" 
            className="h-20 max-h-20 w-auto object-contain max-w-full print:max-h-20"
          />
        ) : (
          <div className="w-16"></div>
        )}
      </div>
    </div>
  );
};

export default KopSurat;

