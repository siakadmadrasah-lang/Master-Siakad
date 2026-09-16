import React from 'react';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useMadrasah } from '@/contexts/MadrasahContext';

interface ExamCardProps {
  namaLengkap: string;
  nomorPeserta: string;
  tempatLahir: string;
  tanggalLahir: string;
  jenisKelamin: string;
  nisn: string;
  fotoUrl?: string;
  username?: string;
  password?: string;
  hariTanggal: string;
  waktu: string;
  ruang: string;
  tandaTanganPanitia?: string;
  panitiaNip?: string;
  tandaTanganUrl?: string;
  qrCode?: string;
  schedules?: {
    hariTanggal: string;
    waktu: string;
    mataPelajaran: string;
    ruang: string;
  }[];
  // Pengaturan Kop Surat (Otomatis menyesuaikan modul Kop Surat)
  headerPengayom?: string;
  namaYayasan?: string;
  lembagaNama?: string;
  subHeader?: string;
  alamatKop?: string;
  kontakKop?: string;
  lembagaLogo?: string;
  logoKananUrl?: string;
  garisStyle?: 'double' | 'single' | 'thick' | 'accent' | 'none';
  temaWarna?: 'blue' | 'orange' | 'green';
  judulKartu?: string;
  jabatanPanitia?: string;
}

const ExamCard: React.FC<ExamCardProps> = ({
  namaLengkap,
  nomorPeserta,
  tempatLahir,
  tanggalLahir,
  jenisKelamin,
  nisn,
  fotoUrl,
  username,
  password,
  hariTanggal,
  waktu,
  ruang,
  tandaTanganPanitia,
  panitiaNip,
  tandaTanganUrl,
  qrCode,
  schedules,
  headerPengayom,
  namaYayasan,
  lembagaNama,
  subHeader,
  alamatKop,
  kontakKop,
  lembagaLogo,
  logoKananUrl,
  garisStyle,
  temaWarna = 'blue',
  judulKartu = "KARTU PESERTA TKAD",
  jabatanPanitia = "Ketua Panitia TKAD,",
}) => {
  const { settings } = useSiteSettings();
  const { activeMadrasah, activeMadrasahId } = useMadrasah();

  // Sinkronisasi otomatis dari Modul Kop Surat (identitas_madrasah & site_settings)
  const scopedIdentitasKey = `identitas_madrasah_${activeMadrasahId || 'default'}`;
  let cachedIdentitas: any = {};
  try {
    const rawScoped = localStorage.getItem(scopedIdentitasKey);
    const rawGlobal = localStorage.getItem('siakad_identitas_madrasah');
    if (rawScoped) cachedIdentitas = JSON.parse(rawScoped);
    else if (rawGlobal) cachedIdentitas = JSON.parse(rawGlobal);
  } catch (e) {}

  const identitas = {
    ...(settings?.identitas_madrasah || {}),
    ...(settings?.[scopedIdentitasKey] || {}),
    ...cachedIdentitas,
  };

  const general = settings?.general || {};

  // 1. Header Pengayom dari Kop Surat (misal: KEMENTERIAN AGAMA REPUBLIK INDONESIA)
  const effectiveHeaderPengayom = headerPengayom !== undefined && headerPengayom !== ""
    ? headerPengayom
    : (identitas.header_pengayom || 'KEMENTERIAN AGAMA REPUBLIK INDONESIA');

  // 2. Nama Yayasan dari Kop Surat
  const effectiveNamaYayasan = namaYayasan !== undefined && namaYayasan !== ""
    ? namaYayasan
    : (identitas.nama_yayasan_kop || identitas.nama_yayasan || (activeMadrasah as any)?.nama_yayasan || '');

  // Pencegahan duplikasi teks pengayom dan yayasan
  const isDuplicateHeader = effectiveHeaderPengayom && effectiveNamaYayasan &&
    effectiveHeaderPengayom.trim().toLowerCase() === effectiveNamaYayasan.trim().toLowerCase();
  const displayHeaderPengayom = isDuplicateHeader ? '' : effectiveHeaderPengayom;

  // 3. Nama Lembaga Utama (Nama Kop Surat / Nama Resmi Madrasah)
  const effectiveLembagaNama = (lembagaNama && lembagaNama.trim())
    || (identitas.nama_kop && identitas.nama_kop.trim())
    || (activeMadrasah as any)?.nama_resmi?.trim()
    || identitas.nama_resmi?.trim()
    || (identitas.nama_madrasah && identitas.nama_madrasah.trim())
    || activeMadrasah?.nama_madrasah
    || general.school_name
    || "MADRASAH IBTIDAIYAH NEGERI";

  // 4. Sub-Header (NSM, NPSN, Akreditasi dari Kop Surat)
  const nsmVal = identitas.nsm || activeMadrasah?.nsm || '';
  const npsnVal = identitas.npsn || activeMadrasah?.npsn || '';
  const akredVal = identitas.akreditasi || (activeMadrasah as any)?.akreditasi || 'A';
  const defaultSubHeader = [
    nsmVal ? `NSM: ${nsmVal}` : '',
    npsnVal ? `NPSN: ${npsnVal}` : '',
    akredVal ? `AKREDITASI ${akredVal}` : ''
  ].filter(Boolean).join(' | ');

  const effectiveSubHeader = subHeader !== undefined && subHeader !== ""
    ? subHeader
    : (identitas.sub_header_kop || defaultSubHeader);

  // 5. Alamat Lengkap dari Kop Surat
  const rawAlamat = identitas.alamat || activeMadrasah?.alamat || general.address || '';
  const kec = identitas.kecamatan || (activeMadrasah as any)?.kecamatan || '';
  const kab = identitas.kabupaten || (activeMadrasah as any)?.kabupaten || '';
  const defaultAlamatParts = [rawAlamat, kec ? `Kec. ${kec}` : '', kab ? (kab.toLowerCase().startsWith('kab') ? kab : `Kab. ${kab}`) : ''].filter(Boolean).join(', ');

  const effectiveAlamat = alamatKop !== undefined && alamatKop !== ""
    ? alamatKop
    : (identitas.alamat_kop || defaultAlamatParts);

  // 6. Kontak dari Kop Surat
  const telp = identitas.telepon || activeMadrasah?.telepon || general.phone || '';
  const defaultKontak = telp ? `Telp: ${telp}` : '';
  const effectiveKontak = kontakKop !== undefined && kontakKop !== ""
    ? kontakKop
    : (identitas.kontak_kop || defaultKontak);

  // 7. Logo Kiri & Logo Kanan dari Kop Surat
  const effectiveLogoKiri = lembagaLogo || identitas.logo_url || activeMadrasah?.logo_url || general.logo_url || '';
  const effectiveLogoKanan = logoKananUrl !== undefined && logoKananUrl !== ""
    ? logoKananUrl
    : (identitas.logo_kanan_url || '');

  // 8. Style Garis Kop Surat
  const effectiveGarisStyle = garisStyle || identitas.garis_style_kop || 'double';
  let borderKopClass = "border-b-[2px] border-double border-slate-900";
  if (effectiveGarisStyle === 'single') borderKopClass = "border-b-[1.5px] border-slate-900";
  else if (effectiveGarisStyle === 'thick') borderKopClass = "border-b-2 border-slate-900";
  else if (effectiveGarisStyle === 'accent') borderKopClass = `border-b-2 border-emerald-600`;
  else if (effectiveGarisStyle === 'none') borderKopClass = "border-b-0";
  const colors = {
    blue: {
      bg: 'bg-blue-50',
      border: 'border-blue-600',
      text: 'text-blue-800',
      accent: 'bg-blue-600',
      subtext: 'text-blue-700',
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-600',
      text: 'text-orange-800',
      accent: 'bg-orange-600',
      subtext: 'text-orange-700',
    },
    green: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-600',
      text: 'text-emerald-800',
      accent: 'bg-emerald-600',
      subtext: 'text-emerald-700',
    },
  };

  const currentTheme = colors[temaWarna];

  return (
    <div className={`w-[100mm] h-[135mm] ${currentTheme.bg} border-2 ${currentTheme.border} rounded-xl shadow-md overflow-hidden font-sans relative flex flex-col print:shadow-none print:border-2 print:m-0`}>
      {/* Header Elemen Grafis */}
      <div className={`h-1.5 w-full ${currentTheme.accent}`}></div>
      
      {/* Header Kop Surat Resmi (Otomatis Mengalir dari Modul Kop Surat) */}
      <div className="px-3 pt-2 pb-1 bg-white/95 relative z-10">
        <div className="flex items-center gap-2 w-full">
          {/* Logo Kiri (Kemenag / Lembaga) */}
          <div className="w-9 h-9 shrink-0 flex items-center justify-center">
            {effectiveLogoKiri ? (
              <img src={effectiveLogoKiri} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <div className={`w-8 h-8 ${currentTheme.accent} rounded-md flex items-center justify-center text-white font-black text-xs shadow-sm`}>
                M
              </div>
            )}
          </div>

          {/* Kolom Tengah: Teks Kop Surat Resmi */}
          <div className="flex-1 min-w-0 text-center leading-none">
            {displayHeaderPengayom && (
              <div className="text-[6.5px] font-bold uppercase tracking-tight text-slate-700 truncate mb-0.5">
                {displayHeaderPengayom}
              </div>
            )}
            {effectiveNamaYayasan && (
              <div className="text-[6.5px] font-bold uppercase tracking-tight text-slate-800 truncate mb-0.5">
                {effectiveNamaYayasan}
              </div>
            )}
            <div className="text-[8.5px] sm:text-[9px] font-black uppercase tracking-tight text-slate-950 line-clamp-2 leading-tight">
              {effectiveLembagaNama}
            </div>
            {effectiveSubHeader && (
              <div className="text-[6px] font-semibold text-slate-600 truncate mt-0.5">
                {effectiveSubHeader}
              </div>
            )}
            {effectiveAlamat && (
              <div className="text-[5.5px] text-slate-500 italic truncate mt-0.5">
                {effectiveAlamat} {effectiveKontak ? ` • ${effectiveKontak}` : ''}
              </div>
            )}
          </div>

          {/* Logo Kanan (Jika diatur di Modul Kop Surat) */}
          {effectiveLogoKanan ? (
            <div className="w-9 h-9 shrink-0 flex items-center justify-center">
              <img src={effectiveLogoKanan} alt="Logo Kanan" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="w-9 shrink-0 opacity-0 pointer-events-none hidden sm:block" />
          )}
        </div>

        {/* Garis Pembatas Kop Surat Resmi */}
        <div className={`w-full mt-1.5 ${borderKopClass}`} />
      </div>

      {/* Judul Kartu Peserta Ujian / Asesmen */}
      <div className="py-1 px-3 text-center border-b border-dashed border-gray-300 bg-white/70 flex items-center justify-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${currentTheme.accent}`} />
        <h2 className={`text-[11px] font-black ${currentTheme.text} uppercase tracking-wider`}>
          {judulKartu}
        </h2>
        <div className={`w-1.5 h-1.5 rounded-full ${currentTheme.accent}`} />
      </div>

      {/* Konten Utama - Dua Kolom */}
      <div className="flex-1 flex overflow-hidden">
        {/* Kolom Kiri: Identitas */}
        <div className="w-1/2 p-2.5 border-r border-dashed border-gray-300 flex flex-col">
          {/* Foto Peserta - Centered Top */}
          <div className="flex justify-center mb-2">
            <div className={`w-[1.6cm] h-[2.2cm] bg-white border-2 ${currentTheme.border} rounded-md overflow-hidden flex items-center justify-center relative shadow-inner`}>
              {fotoUrl ? (
                <img
                  src={fotoUrl}
                  alt="Foto Peserta"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-center p-1">
                  <div className="w-6 h-6 mx-auto mb-1 text-gray-200">
                    <svg fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  </div>
                  <span className="text-[7px] text-gray-400 font-medium leading-none">Foto 3x4</span>
                </div>
              )}
            </div>
          </div>

          {/* Identitas Dasar - Full Width */}
          <div className="space-y-1 overflow-hidden mb-2">
            <div className="border-b border-gray-100 pb-0.5">
              <label className="text-[7px] uppercase font-bold text-gray-400 block leading-none mb-0.5">Nama Lengkap</label>
              <div className={`font-bold ${currentTheme.text} leading-tight break-words ${namaLengkap.length > 25 ? 'text-[8px]' : 'text-[9px]'}`}>
                {namaLengkap}
              </div>
            </div>
            <div className="border-b border-gray-100 pb-0.5">
              <label className="text-[7px] uppercase font-bold text-gray-400 block leading-none mb-0.5">No. Peserta</label>
              <div className={`text-[9px] font-black ${currentTheme.text} tracking-wider truncate`}>
                {nomorPeserta}
              </div>
            </div>
            <div className="border-b border-gray-100 pb-0.5">
              <label className="text-[7px] uppercase font-bold text-gray-400 block leading-none mb-0.5">Tempat, Tgl Lahir</label>
              <div className="text-[9px] font-semibold text-gray-700 truncate">
                {tempatLahir}, {tanggalLahir}
              </div>
            </div>
            <div className="border-b border-gray-100 pb-0.5">
              <label className="text-[7px] uppercase font-bold text-gray-400 block leading-none mb-0.5">NISN</label>
              <div className="text-[9px] font-semibold text-gray-700">{nisn}</div>
            </div>
          </div>

          {/* Login Info - Boxed */}
          <div className={`mt-auto bg-white border ${currentTheme.border} rounded-lg p-1.5 flex gap-1.5 items-center`}>
            <div className="flex-1 border-r border-gray-100 pr-1.5">
              <label className="text-[6.5px] uppercase font-bold text-gray-400 block leading-none">Username</label>
              <div className="text-[9px] font-black font-mono text-gray-800 truncate">{username || "-"}</div>
            </div>
            <div className="flex-1 pl-0.5">
              <label className="text-[6.5px] uppercase font-bold text-gray-400 block leading-none">Password</label>
              <div className="text-[9px] font-black font-mono text-gray-800 truncate">{password || "-"}</div>
            </div>
            <div className="flex-shrink-0">
               {qrCode ? (
                <img src={qrCode} alt="QR" className="w-7 h-7" />
              ) : (
                <div className="w-7 h-7 bg-gray-50 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-200" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 0h2v2h-2v-2z"/></svg>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Jadwal & TTD */}
        <div className="w-1/2 p-2 flex flex-col bg-white/40">
          <div className={`text-[7.5px] font-bold ${currentTheme.text} mb-1 border-b ${currentTheme.border} pb-0.5 flex items-center gap-1 uppercase italic`}>
            <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            Jadwal Pelaksanaan
          </div>

          <div className="flex-1 overflow-hidden">
            {schedules && schedules.length > 0 ? (
              (() => {
                // Group schedules by hariTanggal
                const groupedSchedules: { [key: string]: typeof schedules } = {};
                schedules.forEach(sch => {
                  if (!groupedSchedules[sch.hariTanggal]) {
                    groupedSchedules[sch.hariTanggal] = [];
                  }
                  groupedSchedules[sch.hariTanggal].push(sch);
                });

                const entries = Object.entries(groupedSchedules).slice(0, 7);
                const totalItems = schedules.length;

                return (
                  <div className="flex flex-col gap-y-1">
                    {entries.map(([date, items], groupIdx) => (
                      <div key={groupIdx} className="flex flex-col mb-1 last:mb-0 border-b border-gray-50 pb-0.5 last:border-0">
                        <div className="flex justify-between items-center mb-0.5">
                          <span className="text-[6px] font-bold text-gray-500 uppercase leading-none">{date}</span>
                          <span className="text-[5.5px] font-medium text-gray-400 px-1 bg-gray-50 rounded">{items[0].ruang}</span>
                        </div>
                        <div className="space-y-0.5 pl-1 border-l-2 border-gray-100">
                          {items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex justify-between items-center leading-none py-0.5">
                              <span className="text-[7px] font-black text-blue-700 uppercase truncate mr-1 max-w-[70%]" title={item.mataPelajaran}>
                                • {item.mataPelajaran}
                              </span>
                              <span className="text-[6px] font-bold text-gray-500 whitespace-nowrap bg-white px-1 rounded shadow-sm">
                                {item.waktu}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            ) : (
              <div className="text-[7px] text-gray-400 italic text-center py-4">Jadwal belum tersedia</div>
            )}
          </div>

          {/* Signature Section - Ultra Compact */}
          <div className="mt-1 flex justify-end items-end pt-1 border-t border-gray-100">
            <div className="text-right flex flex-col items-center min-w-[80px]">
              <div className="text-[6.5px] font-bold text-gray-500 mb-3">{jabatanPanitia}</div>
              <div className="relative">
                {tandaTanganUrl && (
                  <img src={tandaTanganUrl} alt="TTD" className="absolute -top-5 left-1/2 -translate-x-1/2 h-7 object-contain pointer-events-none mix-blend-multiply" />
                )}
                <div className={`text-[7.5px] font-bold ${currentTheme.text} border-b border-gray-400 px-1 inline-block leading-tight`}>
                  {tandaTanganPanitia || ".........................."}
                </div>
              </div>
              <div className="text-[6.5px] font-bold text-gray-600 mt-0.5 uppercase tracking-tighter">NIP. {panitiaNip || ".........................."}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Watermark/Pattern Sederhana */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none -rotate-12">
        <div className={`text-6xl font-black ${currentTheme.text}`}>MADRASAH</div>
      </div>
    </div>
  );
};

export default ExamCard;