"use client";

import React, { useState, useEffect, useRef } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import KopSurat from '@/components/KopSurat';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useMadrasah, getOfficialMadrasahName } from '@/contexts/MadrasahContext';
import { useTeacherAuth } from '@/contexts/TeacherAuthContext';
import { generateRPPKarakterCerdas } from '@/utils/rppKarakterGenerator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Printer, Download, Copy, RefreshCw, Save, CheckCircle2,
  HeartHandshake, BookOpen, User, Calendar, Award, Sparkles,
  ChevronRight, ArrowLeft, Plus, Trash2, Eye, FileText, Check,
  Share2, ShieldCheck, HelpCircle, Layers, Compass, Sliders
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

// Model Data RPP Karakter
export interface RPPKarakterData {
  id: string;
  satuan_pendidikan: string;
  mata_pelajaran: string;
  kelas: string;
  fase: string;
  semester: string;
  tahun_pelajaran: string;
  alokasi_waktu: string;
  tema_bab: string;
  materi_pokok: string;
  nama_guru: string;
  nip_guru: string;
  nama_kepala: string;
  nip_kepala: string;
  titimangsa_tempat: string;
  titimangsa_tanggal: string;

  // Nilai-Nilai Karakter Utama (PPK & P5-PPRA)
  karakter_utama: string[];
  karakter_kemenag_ppra: string[];
  pembiasaan_harian: string;

  // Tujuan Pembelajaran
  tujuan_spiritual: string;
  tujuan_sosial: string;
  tujuan_pengetahuan: string;
  tujuan_keterampilan: string;

  // Materi & Integrasi Nilai
  uraian_materi: string;
  internalisasi_nilai: string;

  // Metode & Media
  pendekatan: string;
  model_pembelajaran: string;
  metode: string;
  media_alat: string;
  sumber_belajar: string;

  // Kegiatan Pembelajaran
  pendahuluan_kegiatan: string;
  pendahuluan_waktu: string;
  inti_kegiatan: string;
  inti_waktu: string;
  penutup_kegiatan: string;
  penutup_waktu: string;

  // Asesmen & Rubrik Karakter
  teknik_penilaian_sikap: string;
  teknik_penilaian_pengetahuan: string;
  teknik_penilaian_keterampilan: string;
  rubrik_karakter_catatan: string;
}

// Pilihan Karakter Utama (Kemendikbudristek & Kemenag)
const PILIHAN_KARAKTER_UTAMA = [
  'Religius & Ketaatan Beribadah',
  'Integritas & Kejujuran (Shiddiq)',
  'Kemandirian & Percaya Diri',
  'Gotong Royong & Kerja Sama (Ta\'awun)',
  'Bernalar Kritis & Tanggap Masalah',
  'Kreatif & Inovatif',
  'Tanggung Jawab & Disiplin (Amanah)',
  'Santun, Adab, & Budi Pekerti (Ta\'addub)',
  'Peduli Lingkungan & Kebersihan',
  'Cinta Tanah Air & Kebangsaan (Muwathanah)'
];

const PILIHAN_PPRA_KEMENAG = [
  'Berkeadaban (Ta\'addub)',
  'Keteladanan (Qudwah)',
  'Kewarganegaraan & Kebangsaan (Muwatanah)',
  'Mengambil Jalan Tengah (Tawassut)',
  'Berimbang (Tawazun)',
  'Lurus dan Tegas (I\'tidal)',
  'Kesetaraan (Musawah)',
  'Musyawarah (Syura)',
  'Toleransi (Tasamuh)',
  'Dinamis & Inovatif (Tatawwur wa Ibtikar)'
];

// Preset Template RPP Karakter Siap Pakai
const PRESET_TEMPLATES: { label: string; mapel: string; data: Partial<RPPKarakterData> }[] = [
  {
    label: 'Fikih / PAI - Shalat & Adab Beribadah (Fase B/Kelas 4)',
    mapel: 'Fikih',
    data: {
      mata_pelajaran: 'Fikih',
      kelas: 'IV (Empat)',
      fase: 'Fase B',
      semester: 'Ganjil',
      alokasi_waktu: '2 x 35 Menit (1 Pertemuan)',
      tema_bab: 'Bab 1: Menegakkan Shalat Fardhu Berjamaah',
      materi_pokok: 'Ketentuan dan Keutamaan Shalat Berjamaah serta Adab di Masjid',
      karakter_utama: [
        'Religius & Ketaatan Beribadah',
        'Tanggung Jawab & Disiplin (Amanah)',
        'Gotong Royong & Kerja Sama (Ta\'awun)',
        'Santun, Adab, & Budi Pekerti (Ta\'addub)'
      ],
      karakter_kemenag_ppra: [
        'Berkeadaban (Ta\'addub)',
        'Keteladanan (Qudwah)',
        'Berimbang (Tawazun)'
      ],
      pembiasaan_harian: 'Shalat Dhuha berjamaah, membiasakan doa sebelum dan sesudah kegiatan, menjaga wudhu, dan merapikan shaf shalat.',
      tujuan_spiritual: 'Peserta didik terbiasa melaksanakan shalat berjamaah tepat waktu dengan khusyuk sebagai bentuk ketakwaan kepada Allah SWT.',
      tujuan_sosial: 'Peserta didik menunjukkan sikap disiplin mengantre tempat wudhu, saling menghormati, dan santun saat berada di lingkungan masjid/mushola.',
      tujuan_pengetahuan: 'Peserta didik mampu menjelaskan syarat, rukun, dan keutamaan shalat berjamaah dengan tepat dan logis.',
      tujuan_keterampilan: 'Peserta didik mampu mempraktikkan tata cara shalat berjamaah bersama teman sekelas dengan tertib dan benar sesuai syariat.',
      uraian_materi: 'Pengertian shalat berjamaah, tata cara mengatur shaf shalat, adab berjalan dan masuk masjid, serta hikmah persatuan dalam barisan shalat.',
      internalisasi_nilai: 'Melatih nilai kedisiplinan (mengikuti gerakan imam tanpa mendahului), kesetaraan (berdiri rapat dalam shaf tanpa membeda-bedakan status), dan ketaatan kepada pemimpin yang adil.',
      pendekatan: 'Saintifik & Kontekstual Berbasis Habituasi Karakter',
      model_pembelajaran: 'Demonstrasi & Cooperative Learning Berkarakter',
      metode: 'Keteladanan Guru, Simulasi Peran (Imam & Makmum), Diskusi Reflektif, Praktik Langsung',
      media_alat: 'Perlengkapan shalat (sajadah, sarung/mukena), gambar bagan susunan shaf, LCD Proyektor, Kartu Peran',
      sumber_belajar: 'Buku Fikih MI Kelas IV Kemenag RI (KMA 450), Al-Qur\'an dan Terjemahannya, Mushola Madrasah',
      pendahuluan_kegiatan: '1. Guru membuka pembelajaran dengan salam hangat, doa bersama, dan pembacaan ayat suci Al-Qur\'an (Karakter Religius).\n2. Guru memeriksa kebersihan kelas, kerapian seragam, dan kehadiran siswa (Karakter Disiplin & Peduli Lingkungan).\n3. Apersepsi: Guru mengajak siswa mengingat kembali pengalaman shalat berjamaah di rumah/masjid.\n4. Guru menyampaikan tujuan pembelajaran dan nilai keutamaan pahala 27 derajat serta adab mulia yang akan dibiasakan.',
      pendahuluan_waktu: '10 Menit',
      inti_kegiatan: '1. Mengamati: Peserta didik mengamati demonstrasi susunan shaf dan video ketertiban shalat berjamaah (Rasa Ingin Tahu & Khusyuk).\n2. Menanya & Menalar: Siswa berdiskusi mengapa makmum tidak boleh mendahului gerakan imam dan mengaitkannya dengan kepatuhan kepada guru dan orang tua (Bernalar Kritis & Ta\'addub).\n3. Eksplorasi: Dalam kelompok kecil, siswa menyusun tata cara merapatkan shaf shalat (Gotong Royong).\n4. Praktik Langsung: Siswa bergantian mempraktikkan simulasi menjadi imam dan makmum dengan penuh ketertiban dan ketulusan hati (Percaya Diri & Amanah).\n5. Guru memberikan penguatan atas sikap sopan santun dan kekompakan siswa.',
      inti_waktu: '50 Menit',
      penutup_kegiatan: '1. Refleksi Karakter: Guru dan siswa bersama-sama merumuskan hikmah shalat: "Apa kebaikan dan kedisiplinan yang dapat kita bawa pulang hari ini?"\n2. Guru memberikan tugas pembiasaan di rumah: mencatat pelaksanaan shalat berjamaah di buku mutaba\'ah harian bersama orang tua.\n3. Menyanyikan lagu nasional/lagu islami madrasah untuk menumbuhkan rasa cinta tanah air.\n4. Pembelajaran ditutup dengan doa kafaratul majelis dan saling berjabat tangan dengan sopan (Karakter Religius & Santun).',
      penutup_waktu: '10 Menit',
      teknik_penilaian_sikap: 'Jurnal Catatan Observasi Sikap Spiritual (Khusyuk, Rajin Shalat) dan Sosial (Disiplin, Santun, Ta\'awun).',
      teknik_penilaian_pengetahuan: 'Tes tertulis pilihan ganda dan tanya jawab lisan pemahaman hikmah shalat berjamaah.',
      teknik_penilaian_keterampilan: 'Unjuk kerja (rubrik penilaian praktik kerapian dan ketertiban gerakan shalat berjamaah).',
      rubrik_karakter_catatan: 'Indikator Karakter: (BT = Belum Terlihat, MT = Mulai Terlihat, MB = Mulai Berkembang, MK = Membudaya Konsisten).'
    }
  },
  {
    label: 'Bahasa Indonesia - Bertutur Kata Santun & Antikorupsi (Fase B)',
    mapel: 'Bahasa Indonesia',
    data: {
      mata_pelajaran: 'Bahasa Indonesia',
      kelas: 'IV (Empat)',
      fase: 'Fase B',
      semester: 'Ganjil',
      alokasi_waktu: '2 x 35 Menit (1 Pertemuan)',
      tema_bab: 'Bab 2: Bertutur Kata yang Baik dan Santun',
      materi_pokok: 'Teks Narasi dan Penerapan 4 Kata Ajaib: Tolong, Maaf, Terima Kasih, dan Permisi',
      karakter_utama: [
        'Santun, Adab, & Budi Pekerti (Ta\'addub)',
        'Integritas & Kejujuran (Shiddiq)',
        'Gotong Royong & Kerja Sama (Ta\'awun)',
        'Bernalar Kritis & Tanggap Masalah'
      ],
      karakter_kemenag_ppra: [
        'Berkeadaban (Ta\'addub)',
        'Toleransi (Tasamuh)',
        'Keteladanan (Qudwah)'
      ],
      pembiasaan_harian: 'Membiasakan mengucapkan 4 kata ajaib (Tolong, Maaf, Terima Kasih, Permisi) saat berinteraksi di kelas dan lingkungan madrasah.',
      tujuan_spiritual: 'Peserta didik meyakini bahwa lisan yang terjaga merupakan cerminan keimanan dan akhlak mulia.',
      tujuan_sosial: 'Peserta didik terbiasa berbicara dengan nada santun, tidak memotong pembicaraan orang lain, serta menghargai perbedaan pendapat.',
      tujuan_pengetahuan: 'Peserta didik dapat mengidentifikasi ungkapan santun dalam teks percakapan dan situasi kehidupan sehari-hari.',
      tujuan_keterampilan: 'Peserta didik mampu memperagakan percakapan santun dalam bermain peran (role-playing) di depan kelas dengan percaya diri.',
      uraian_materi: 'Makna komunikasi santun, fungsi ungkapan tolong, maaf, terima kasih, dan permisi, serta contoh percakapan positif bebas dari bullying.',
      internalisasi_nilai: 'Menanamkan nilai kejujuran berbicara tanpa berdusta (Shiddiq), kepekaan empati menghargai perasaan teman (Tasamuh), dan budaya antikekerasan verbal.',
      pendekatan: 'Kontekstual Berbasis Pembiasaan Budi Pekerti',
      model_pembelajaran: 'Role Playing (Bermain Peran) & Refleksi Karakter',
      metode: 'Bermain Peran, Diskusi Kelompok, Tanya Jawab, Penugasan Harian',
      media_alat: 'Kartu Skenario Percakapan, Papan Kata Ajaib, Lembar Refleksi Diri',
      sumber_belajar: 'Buku Siswa Bahasa Indonesia Kurikulum Merdeka, Buku Kumpulan Kisah Teladan Akhlak Mulia',
      pendahuluan_kegiatan: '1. Guru menyapa siswa dengan ramah dan memimpin doa pagi (Religius).\n2. Pembiasaan Senyum, Salam, Sapa (5S) antarteman sebangku (Santun).\n3. Apersepsi: Guru bercerita singkat tentang dampak kata-kata yang baik dapat membahagiakan orang lain.\n4. Penyampaian target capaian dan komitmen kelas bertutur kata sopan.',
      pendahuluan_waktu: '10 Menit',
      inti_kegiatan: '1. Siswa membaca teks narasi tentang persahabatan yang rukun karena saling menghargai (Literasi & Rasa Ingin Tahu).\n2. Diskusi terbimbing: Menganalisis perbedaan kalimat kasar dan kalimat santun (Bernalar Kritis).\n3. Bermain Peran: Secara berpasangan, siswa memainkan skenario meminjam buku, meminta bantuan, dan meminta maaf atas kesalahan (Percaya Diri & Toleransi).\n4. Refleksi Teman: Siswa memberikan apresiasi kalimat santun yang diucapkan oleh teman kelompoknya (Empati & Ta\'awun).',
      inti_waktu: '50 Menit',
      penutup_kegiatan: '1. Refleksi diri: Setiap siswa menuliskan 1 komitmen kata santun yang akan diucapkan hari ini.\n2. Guru memberikan pesan penguatan moral: "Orang yang mulia adalah orang yang paling baik akhlak dan tutur katanya".\n3. Pembiasaan salam dan doa penutup (Religius).',
      penutup_waktu: '10 Menit',
      teknik_penilaian_sikap: 'Observasi kesantunan berbahasa harian menggunakan lembar jurnal sikap.',
      teknik_penilaian_pengetahuan: 'Menjodohkan situasi dengan kalimat santun yang tepat.',
      teknik_penilaian_keterampilan: 'Rubrik penilaian unjuk kerja bermain peran (artikulasi, kejelasan, kesopanan gestur).',
      rubrik_karakter_catatan: 'Skala capaian karakter: Mulai Berkembang (MB) hingga Membudaya (MK).'
    }
  },
  {
    label: 'IPAS - Peduli Lingkungan & Kebersihan Madrasah (Fase C)',
    mapel: 'IPAS',
    data: {
      mata_pelajaran: 'IPAS (Ilmu Pengetahuan Alam dan Sosial)',
      kelas: 'V (Lima)',
      fase: 'Fase C',
      semester: 'Ganjil',
      alokasi_waktu: '2 x 35 Menit (1 Pertemuan)',
      tema_bab: 'Bab 3: Harmoni Ekosistem dan Tanggung Jawab Manusia',
      materi_pokok: 'Pentingnya Menjaga Keseimbangan Alam dan Pengelolaan Sampah Madrasah',
      karakter_utama: [
        'Peduli Lingkungan & Kebersihan',
        'Tanggung Jawab & Disiplin (Amanah)',
        'Gotong Royong & Kerja Sama (Ta\'awun)',
        'Kreatif & Inovatif'
      ],
      karakter_kemenag_ppra: [
        'Keteladanan (Qudwah)',
        'Dinamis & Inovatif (Tatawwur wa Ibtikar)',
        'Kewarganegaraan & Kebangsaan (Muwatanah)'
      ],
      pembiasaan_harian: 'Gerakan LiSA (Lihat Sampah Ambil), memilah sampah organik dan anorganik di madrasah, serta menghemat penggunaan air dan listrik.',
      tujuan_spiritual: 'Peserta didik meyakini bahwa menjaga kelestarian alam adalah bagian dari amanah ibadah sebagai khalifah di bumi.',
      tujuan_sosial: 'Peserta didik aktif bergotong royong menjaga kebersihan lingkungan madrasah tanpa harus diperintah.',
      tujuan_pengetahuan: 'Peserta didik dapat menganalisis dampak sampah terhadap ekosistem serta solusi 3R (Reduce, Reuse, Recycle).',
      tujuan_keterampilan: 'Peserta didik terampil membuat karya pemanfaatan barang bekas atau poster kampanye peduli lingkungan.',
      uraian_materi: 'Rantai makanan, dampak pencemaran sampah plastik, pemilahan jenis sampah, dan aksi nyata pelestarian alam madrasah.',
      internalisasi_nilai: 'Menghayati nilai kebersihan sebagian dari iman, keadilan terhadap makhluk ciptaan Allah, dan gaya hidup hemat.',
      pendekatan: 'Saintifik Berbasis Proyek Karakter Lingkungan (Green Madrasah)',
      model_pembelajaran: 'Project Based Learning (PjBL)',
      metode: 'Observasi Lingkungan Langsung, Diskusi Solutif, Praktik Pilah Sampah, Kampanye Edukatif',
      media_alat: 'Tempat sampah terpilah (Organik & Anorganik), kantong pilah, sarung tangan kebersihan, lembar observasi',
      sumber_belajar: 'Buku IPAS Kelas V, Lingkungan Taman dan Halaman Madrasah, Bahan Bacaan Edukasi Lingkungan Hidup',
      pendahuluan_kegiatan: '1. Salam pembuka dan doa bersama (Religius).\n2. Operasi Semut 3 Menit: Memeriksa laci meja dan lantai kelas dari sampah (Peduli Lingkungan).\n3. Apersepsi: Menampilkan video singkat tentang laut yang tercemar plastik dan nasib biota laut.\n4. Menjelaskan tujuan belajar dan misi menjadi Duta Lingkungan Madrasah.',
      pendahuluan_waktu: '10 Menit',
      inti_kegiatan: '1. Observasi Lapangan: Kelompok siswa berkeliling halaman madrasah mencatat titik-titik yang memerlukan perhatian kebersihan (Penyelidikan & Disiplin).\n2. Kolaborasi: Siswa memilah sampah yang ditemukan ke wadah yang sesuai (Gotong Royong & Ta\'awun).\n3. Analisis & Rencana: Kelompok merancang poster mini atau solusi pengolahan limbah kertas kelas (Kreatif & Inovatif).\n4. Presentasi: Menyampaikan hasil temuan dan mengajak warga kelas menjaga fasilitas bersama (Tanggung Jawab).',
      inti_waktu: '50 Menit',
      penutup_kegiatan: '1. Evaluasi dan apresiasi: Guru memuji inisiatif kebersihan setiap kelompok.\n2. Refleksi diri: "Apa satu tindakan kecil yang bisa saya lakukan setiap hari untuk merawat bumi ciptaan Allah?"\n3. Doa penutup dan cuci tangan bersama dengan tertib (Disiplin & Hidup Bersih).',
      penutup_waktu: '10 Menit',
      teknik_penilaian_sikap: 'Observasi kepedulian terhadap kebersihan kelas dan partisipasi kerja kelompok.',
      teknik_penilaian_pengetahuan: 'Laporan tertulis hasil observasi ekosistem madrasah.',
      teknik_penilaian_keterampilan: 'Penilaian produk poster edukasi atau aksi nyata pilah sampah.',
      rubrik_karakter_catatan: 'Pengamatan sikap peduli lingkungan, gotong royong, dan tanggung jawab.'
    }
  }
];

export default function RPPKarakter() {
  const { settings } = useSiteSettings();
  const { activeMadrasah } = useMadrasah();
  const { currentTeacher } = useTeacherAuth();
  const printRef = useRef<HTMLDivElement>(null);

  // Ambil profil madrasah, pimpinan, dan guru seperti pada modul ajar KBC
  const officialSchoolName = getOfficialMadrasahName(
    activeMadrasah,
    settings.identitas_madrasah,
    settings.general?.school_name || "Madrasah Ibtidaiyah"
  );
  const defaultPimpinan = 
    settings.penandatangan?.kepala_madrasah?.nama || 
    activeMadrasah?.nama_pimpinan || 
    settings.identitas_madrasah?.nama_pimpinan || 
    "H. Jaenal Maskun, S.Pd.I";
  const defaultNipPimpinan = 
    settings.penandatangan?.kepala_madrasah?.nip || 
    activeMadrasah?.nip_pimpinan || 
    settings.identitas_madrasah?.nip_pimpinan || 
    "198501012010011001";
  const defaultKota = settings.identitas_madrasah?.kabupaten || "Banyumas";

  // Daftar guru kelas yang tersinkronisasi dari penandatangan
  const daftarGuru = settings.penandatangan?.guru_kelas || [];

  // Helper pencocokan guru otomatis berdasarkan kelas
  const getTeacherForClass = (kelasStr: string) => {
    if (currentTeacher?.nama) {
      return {
        nama: currentTeacher.nama,
        nip: currentTeacher.nip || '-'
      };
    }
    const classMatch = kelasStr.match(/\d+/);
    const classNum = classMatch ? classMatch[0] : null;
    if (classNum && daftarGuru.length > 0) {
      const found = daftarGuru.find((g: any) => {
        const k = g.kelas?.toLowerCase() || '';
        const m = k.match(/\d+/);
        return m && m[0] === classNum;
      });
      if (found) {
        return {
          nama: found.nama,
          nip: found.nip || '-'
        };
      }
    }
    if (daftarGuru.length > 0) {
      return {
        nama: daftarGuru[0].nama,
        nip: daftarGuru[0].nip || '-'
      };
    }
    return {
      nama: "Ahmad Fauzi, S.Pd.I",
      nip: "199003142022031004"
    };
  };

  // State Form RPP Karakter
  const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'presets' | 'saved'>('editor');
  const [savedRPPList, setSavedRPPList] = useState<RPPKarakterData[]>([]);

  const initialGuru = getTeacherForClass('IV (Empat)');

  const [formData, setFormData] = useState<RPPKarakterData>({
    id: `rpp_${Date.now()}`,
    satuan_pendidikan: officialSchoolName,
    mata_pelajaran: 'Fikih',
    kelas: 'IV (Empat)',
    fase: 'Fase B',
    semester: 'Ganjil',
    tahun_pelajaran: settings.tahun_pelajaran?.active_year || '2024/2025',
    alokasi_waktu: '2 x 35 Menit (1 Pertemuan)',
    tema_bab: 'Bab 1: Menegakkan Shalat Fardhu Berjamaah',
    materi_pokok: 'Ketentuan dan Keutamaan Shalat Berjamaah serta Adab di Masjid',
    nama_guru: initialGuru.nama,
    nip_guru: initialGuru.nip,
    nama_kepala: defaultPimpinan,
    nip_kepala: defaultNipPimpinan,
    titimangsa_tempat: defaultKota,
    titimangsa_tanggal: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),

    karakter_utama: [
      'Religius & Ketaatan Beribadah',
      'Tanggung Jawab & Disiplin (Amanah)',
      'Gotong Royong & Kerja Sama (Ta\'awun)',
      'Santun, Adab, & Budi Pekerti (Ta\'addub)'
    ],
    karakter_kemenag_ppra: [
      'Berkeadaban (Ta\'addub)',
      'Keteladanan (Qudwah)',
      'Berimbang (Tawazun)'
    ],
    pembiasaan_harian: 'Shalat Dhuha berjamaah, membiasakan doa sebelum dan sesudah kegiatan, menjaga wudhu, dan merapikan shaf shalat.',

    tujuan_spiritual: 'Peserta didik terbiasa melaksanakan shalat berjamaah tepat waktu dengan khusyuk sebagai bentuk ketakwaan kepada Allah SWT.',
    tujuan_sosial: 'Peserta didik menunjukkan sikap disiplin mengantre tempat wudhu, saling menghormati, dan santun saat berada di lingkungan masjid/mushola.',
    tujuan_pengetahuan: 'Peserta didik mampu menjelaskan syarat, rukun, dan keutamaan shalat berjamaah dengan tepat dan logis.',
    tujuan_keterampilan: 'Peserta didik mampu mempraktikkan tata cara shalat berjamaah bersama teman sekelas dengan tertib dan benar sesuai syariat.',

    uraian_materi: 'Pengertian shalat berjamaah, tata cara mengatur shaf shalat, adab berjalan dan masuk masjid, serta hikmah persatuan dalam barisan shalat.',
    internalisasi_nilai: 'Melatih nilai kedisiplinan (mengikuti gerakan imam tanpa mendahului), kesetaraan (berdiri rapat dalam shaf tanpa membeda-bedakan status), dan ketaatan kepada pemimpin yang adil.',

    pendekatan: 'Saintifik & Kontekstual Berbasis Habituasi Karakter',
    model_pembelajaran: 'Demonstrasi & Cooperative Learning Berkarakter',
    metode: 'Keteladanan Guru, Simulasi Peran (Imam & Makmum), Diskusi Reflektif, Praktik Langsung',
    media_alat: 'Perlengkapan shalat (sajadah, sarung/mukena), gambar bagan susunan shaf, LCD Proyektor, Kartu Peran',
    sumber_belajar: 'Buku Fikih MI Kelas IV Kemenag RI (KMA 450), Al-Qur\'an dan Terjemahannya, Mushola Madrasah',

    pendahuluan_kegiatan: '1. Guru membuka pembelajaran dengan salam hangat, doa bersama, dan pembacaan ayat suci Al-Qur\'an (Karakter Religius).\n2. Guru memeriksa kebersihan kelas, kerapian seragam, dan kehadiran siswa (Karakter Disiplin & Peduli Lingkungan).\n3. Apersepsi: Guru mengajak siswa mengingat kembali pengalaman shalat berjamaah di rumah/masjid.\n4. Guru menyampaikan tujuan pembelajaran dan nilai keutamaan pahala 27 derajat serta adab mulia yang akan dibiasakan.',
    pendahuluan_waktu: '10 Menit',
    inti_kegiatan: '1. Mengamati: Peserta didik mengamati demonstrasi susunan shaf dan video ketertiban shalat berjamaah (Rasa Ingin Tahu & Khusyuk).\n2. Menanya & Menalar: Siswa berdiskusi mengapa makmum tidak boleh mendahului gerakan imam dan mengaitkannya dengan kepatuhan kepada guru dan orang tua (Bernalar Kritis & Ta\'addub).\n3. Eksplorasi: Dalam kelompok kecil, siswa menyusun tata cara merapatkan shaf shalat (Gotong Royong).\n4. Praktik Langsung: Siswa bergantian mempraktikkan simulasi menjadi imam dan makmum dengan penuh ketertiban dan ketulusan hati (Percaya Diri & Amanah).\n5. Guru memberikan penguatan atas sikap sopan santun dan kekompakan siswa.',
    inti_waktu: '50 Menit',
    penutup_kegiatan: '1. Refleksi Karakter: Guru dan siswa bersama-sama merumuskan hikmah shalat: "Apa kebaikan dan kedisiplinan yang dapat kita bawa pulang hari ini?"\n2. Guru memberikan tugas pembiasaan di rumah: mencatat pelaksanaan shalat berjamaah di buku mutaba\'ah harian bersama orang tua.\n3. Menyanyikan lagu nasional/lagu islami madrasah untuk menumbuhkan rasa cinta tanah air.\n4. Pembelajaran ditutup dengan doa kafaratul majelis dan saling berjabat tangan dengan sopan (Karakter Religius & Santun).',
    penutup_waktu: '10 Menit',

    teknik_penilaian_sikap: 'Jurnal Catatan Observasi Sikap Spiritual (Khusyuk, Rajin Shalat) dan Sosial (Disiplin, Santun, Ta\'awun).',
    teknik_penilaian_pengetahuan: 'Tes tertulis pilihan ganda dan tanya jawab lisan pemahaman hikmah shalat berjamaah.',
    teknik_penilaian_keterampilan: 'Unjuk kerja (rubrik penilaian praktik kerapian dan ketertiban gerakan shalat berjamaah).',
    rubrik_karakter_catatan: 'Indikator Karakter: (BT = Belum Terlihat, MT = Mulai Terlihat, MB = Mulai Berkembang, MK = Membudaya Konsisten).'
  });

  // Muat data tersimpan dari localStorage saat pertama kali render
  useEffect(() => {
    try {
      const raw = localStorage.getItem('siakad_rpp_karakter_list');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setSavedRPPList(parsed);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Update profil madrasah otomatis jika context berubah
  useEffect(() => {
    if (officialSchoolName) {
      setFormData(prev => ({
        ...prev,
        satuan_pendidikan: prev.satuan_pendidikan || officialSchoolName,
        nama_kepala: prev.nama_kepala || defaultPimpinan,
        nip_kepala: prev.nip_kepala || defaultNipPimpinan,
        titimangsa_tempat: prev.titimangsa_tempat || defaultKota
      }));
    }
  }, [officialSchoolName, defaultPimpinan, defaultNipPimpinan, defaultKota]);

  // Handler 1-Klik Cerdas RPP Karakter dari Materi Pokok
  const handleAutoGenerateFromMateri = (customMateri?: string) => {
    const targetMateri = (customMateri || formData.materi_pokok || '').trim();
    if (!targetMateri) {
      showError('Silakan masukkan materi pokok terlebih dahulu!');
      return;
    }

    const generated = generateRPPKarakterCerdas(
      targetMateri,
      formData.mata_pelajaran,
      formData.kelas,
      formData.fase
    );

    const matchedGuru = getTeacherForClass(formData.kelas);

    setFormData(prev => ({
      ...prev,
      materi_pokok: targetMateri,
      satuan_pendidikan: officialSchoolName,
      nama_kepala: defaultPimpinan,
      nip_kepala: defaultNipPimpinan,
      nama_guru: prev.nama_guru && prev.nama_guru !== 'Ahmad Fauzi, S.Pd.I' ? prev.nama_guru : matchedGuru.nama,
      nip_guru: prev.nip_guru && prev.nip_guru !== '199003142022031004' ? prev.nip_guru : matchedGuru.nip,
      titimangsa_tempat: defaultKota,
      ...generated
    }));

    showSuccess(`✨ Sukses 1-Klik! Semua field RPP Karakter untuk materi "${targetMateri}" terisi otomatis.`);
  };

  // Simpan RPP ke list
  const handleSaveRPP = () => {
    try {
      const updatedList = [formData, ...savedRPPList.filter(item => item.id !== formData.id)];
      setSavedRPPList(updatedList);
      localStorage.setItem('siakad_rpp_karakter_list', JSON.stringify(updatedList));
      showSuccess('RPP Karakter berhasil disimpan ke dalam arsip lokal Anda!');
    } catch (e: any) {
      showError('Gagal menyimpan RPP: ' + e.message);
    }
  };

  // Muat RPP tersimpan
  const handleLoadRPP = (item: RPPKarakterData) => {
    setFormData(item);
    setActiveTab('preview');
    showSuccess(`RPP "${item.tema_bab}" berhasil dimuat.`);
  };

  // Hapus RPP tersimpan
  const handleDeleteRPP = (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus RPP Karakter ini dari arsip?')) return;
    const filtered = savedRPPList.filter(item => item.id !== id);
    setSavedRPPList(filtered);
    localStorage.setItem('siakad_rpp_karakter_list', JSON.stringify(filtered));
    showSuccess('RPP Karakter telah dihapus.');
  };

  // Terapkan Preset
  const handleApplyPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setFormData(prev => ({
      ...prev,
      id: `rpp_${Date.now()}`,
      satuan_pendidikan: prev.satuan_pendidikan || defaultSchoolName,
      nama_kepala: prev.nama_kepala || defaultPimpinan,
      nip_kepala: prev.nip_kepala || defaultNipPimpinan,
      titimangsa_tempat: prev.titimangsa_tempat || defaultKota,
      ...preset.data
    }));
    setActiveTab('editor');
    showSuccess(`Preset template "${preset.label}" berhasil diterapkan!`);
  };

  // Toggle Pilihan Karakter
  const toggleKarakterUtama = (item: string) => {
    setFormData(prev => {
      const exists = prev.karakter_utama.includes(item);
      return {
        ...prev,
        karakter_utama: exists
          ? prev.karakter_utama.filter(k => k !== item)
          : [...prev.karakter_utama, item]
      };
    });
  };

  const togglePPRABerkembang = (item: string) => {
    setFormData(prev => {
      const exists = prev.karakter_kemenag_ppra.includes(item);
      return {
        ...prev,
        karakter_kemenag_ppra: exists
          ? prev.karakter_kemenag_ppra.filter(k => k !== item)
          : [...prev.karakter_kemenag_ppra, item]
      };
    });
  };

  // Cetak Dokumen
  const handlePrint = () => {
    window.print();
  };

  // Salin RPP ke Clipboard dalam format Teks Resmi
  const handleCopyText = () => {
    const text = `
RENCANA PELAKSANAAN PEMBELAJARAN (RPP) BERORIENTASI PENDIDIKAN KARAKTER
${formData.satuan_pendidikan}

A. IDENTITAS PEMBELAJARAN
Mata Pelajaran    : ${formData.mata_pelajaran}
Kelas / Fase       : ${formData.kelas} / ${formData.fase}
Semester           : ${formData.semester}
Tahun Pelajaran    : ${formData.tahun_pelajaran}
Alokasi Waktu      : ${formData.alokasi_waktu}
Tema / Bab         : ${formData.tema_bab}
Materi Pokok       : ${formData.materi_pokok}

B. NILAI KARAKTER UTAMA (PPK & P5-PPRA)
- Nilai Karakter Utama: ${formData.karakter_utama.join(', ')}
- Profil Rahmatan lil 'Alamin: ${formData.karakter_kemenag_ppra.join(', ')}
- Pembiasaan Harian: ${formData.pembiasaan_harian}

C. TUJUAN PEMBELAJARAN BERBASIS KARAKTER
1. Sikap Spiritual  : ${formData.tujuan_spiritual}
2. Sikap Sosial     : ${formData.tujuan_sosial}
3. Pengetahuan      : ${formData.tujuan_pengetahuan}
4. Keterampilan     : ${formData.tujuan_keterampilan}

D. MATERI & INTEGRASI NILAI
- Uraian Materi: ${formData.uraian_materi}
- Internalisasi Nilai Karakter: ${formData.internalisasi_nilai}

E. PENDEKATAN, MODEL, & METODE
- Pendekatan : ${formData.pendekatan}
- Model      : ${formData.model_pembelajaran}
- Metode     : ${formData.metode}
- Media/Alat : ${formData.media_alat}
- Sumber     : ${formData.sumber_belajar}

F. LANGKAH-LANGKAH PEMBELAJARAN
1. Kegiatan Pendahuluan (${formData.pendahuluan_waktu}):
${formData.pendahuluan_kegiatan}

2. Kegiatan Inti (${formData.inti_waktu}):
${formData.inti_kegiatan}

3. Kegiatan Penutup (${formData.penutup_waktu}):
${formData.penutup_kegiatan}

G. ASESMEN & PENILAIAN KARAKTER
- Penilaian Sikap       : ${formData.teknik_penilaian_sikap}
- Penilaian Pengetahuan : ${formData.teknik_penilaian_pengetahuan}
- Penilaian Keterampilan: ${formData.teknik_penilaian_keterampilan}
- Rubrik Catatan        : ${formData.rubrik_karakter_catatan}

${formData.titimangsa_tempat}, ${formData.titimangsa_tanggal}
Mengetahui,
Kepala Madrasah: ${formData.nama_kepala} (NIP: ${formData.nip_kepala})
Guru Pengampu  : ${formData.nama_guru} (NIP: ${formData.nip_guru})
    `.trim();

    navigator.clipboard.writeText(text);
    showSuccess('Teks RPP Karakter berhasil disalin ke clipboard!');
  };

  return (
    <AdminLayout title="RPP Karakter">
      <div className="space-y-6 pb-20">
        
        {/* Header Modul Resmi */}
        <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 md:p-8 shadow-xl border border-indigo-900/40 relative overflow-hidden print:hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 text-indigo-400 flex items-center justify-center shadow-inner">
                  <HeartHandshake className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black tracking-tight text-white">
                      Modul RPP Karakter
                    </h1>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs font-bold">
                      Format Resmi P5-PPRA
                    </Badge>
                  </div>
                  <p className="text-slate-400 text-sm">
                    Penyusunan Rencana Pelaksanaan Pembelajaran Berorientasi Karakter, Akhlak Mulia, dan Profil Pelajar Rahmatan lil 'Alamin.
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation */}
            <div className="flex flex-wrap items-center gap-2.5">
              <Button
                variant={activeTab === 'editor' ? 'default' : 'outline'}
                onClick={() => setActiveTab('editor')}
                className={`rounded-2xl h-11 font-bold px-4 transition-all flex items-center gap-2 ${
                  activeTab === 'editor'
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                <Sliders className="w-4 h-4" />
                Penyusun RPP
              </Button>

              <Button
                variant={activeTab === 'preview' ? 'default' : 'outline'}
                onClick={() => setActiveTab('preview')}
                className={`rounded-2xl h-11 font-bold px-4 transition-all flex items-center gap-2 ${
                  activeTab === 'preview'
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                <Eye className="w-4 h-4" />
                Pratinjau & Cetak Resmi
              </Button>

              <Button
                variant={activeTab === 'presets' ? 'default' : 'outline'}
                onClick={() => setActiveTab('presets')}
                className={`rounded-2xl h-11 font-bold px-4 transition-all flex items-center gap-2 ${
                  activeTab === 'presets'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/30'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Template Cepat
              </Button>

              <Button
                variant={activeTab === 'saved' ? 'default' : 'outline'}
                onClick={() => setActiveTab('saved')}
                className={`rounded-2xl h-11 font-bold px-4 transition-all flex items-center gap-2 ${
                  activeTab === 'saved'
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
                }`}
              >
                <Layers className="w-4 h-4" />
                Arsip Tersimpan ({savedRPPList.length})
              </Button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: FORM PENYUSUN RPP KARAKTER */}
        {/* ========================================================================= */}
        {activeTab === 'editor' && (
          <div className="space-y-6 print:hidden">
            
            {/* Bagian 1: Identitas RPP */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Identitas Pelaksanaan Pembelajaran</h2>
                    <p className="text-xs text-slate-500">Satuan pendidikan, jenjang, mata pelajaran, dan waktu</p>
                  </div>
                </div>
                <Button
                  onClick={handleSaveRPP}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-9 px-4 font-bold text-xs flex items-center gap-1.5 shadow"
                >
                  <Save className="w-3.5 h-3.5" />
                  Simpan RPP
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Satuan Pendidikan / Madrasah</label>
                  <Input
                    value={formData.satuan_pendidikan}
                    onChange={(e) => setFormData({ ...formData, satuan_pendidikan: e.target.value })}
                    className="rounded-xl h-10 text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Mata Pelajaran</label>
                  <Input
                    value={formData.mata_pelajaran}
                    onChange={(e) => setFormData({ ...formData, mata_pelajaran: e.target.value })}
                    placeholder="Contoh: Fikih / Akidah Akhlak / Bahasa Indonesia"
                    className="rounded-xl h-10 text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Kelas / Fase</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={formData.kelas}
                      onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                      placeholder="Contoh: IV (Empat)"
                      className="rounded-xl h-10 text-sm"
                    />
                    <Input
                      value={formData.fase}
                      onChange={(e) => setFormData({ ...formData, fase: e.target.value })}
                      placeholder="Fase A / B / C"
                      className="rounded-xl h-10 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Semester & Tahun Pelajaran</label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={formData.semester}
                      onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                      placeholder="Ganjil / Genap"
                      className="rounded-xl h-10 text-sm"
                    />
                    <Input
                      value={formData.tahun_pelajaran}
                      onChange={(e) => setFormData({ ...formData, tahun_pelajaran: e.target.value })}
                      placeholder="2024/2025"
                      className="rounded-xl h-10 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Alokasi Waktu</label>
                  <Input
                    value={formData.alokasi_waktu}
                    onChange={(e) => setFormData({ ...formData, alokasi_waktu: e.target.value })}
                    placeholder="Contoh: 2 x 35 Menit (1 Pertemuan)"
                    className="rounded-xl h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Tema / Bab</label>
                  <Input
                    value={formData.tema_bab}
                    onChange={(e) => setFormData({ ...formData, tema_bab: e.target.value })}
                    placeholder="Contoh: Bab 1: Ketentuan Shalat Berjamaah"
                    className="rounded-xl h-10 text-sm font-semibold text-indigo-950"
                  />
                </div>
              </div>

              {/* Materi Pokok Esensial & Fitur 1-Klik Cerdas */}
              <div className="space-y-3 bg-gradient-to-br from-indigo-50/80 via-purple-50/40 to-slate-50 p-4 sm:p-5 rounded-2xl border border-indigo-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-black uppercase tracking-wider text-indigo-950 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Materi Pokok Esensial
                    </label>
                    <Badge className="bg-indigo-600 text-white text-[10px] font-bold py-0.5 px-2">
                      1-Klik Auto-Fill
                    </Badge>
                  </div>
                  <span className="text-[11px] text-slate-500 italic">
                    Ketik topik atau pilih salah satu inspirasi di bawah, lalu klik tombol Generate
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
                  <Input
                    value={formData.materi_pokok}
                    onChange={(e) => setFormData({ ...formData, materi_pokok: e.target.value })}
                    placeholder="Contoh: Ketentuan Shalat Berjamaah, Adab Bertutur Kata Santun, Pengelolaan Sampah..."
                    className="rounded-xl h-11 text-sm font-semibold bg-white border-indigo-200 focus:border-indigo-500 shadow-sm flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => handleAutoGenerateFromMateri()}
                    className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-xs sm:text-sm h-11 px-5 rounded-xl shadow-md shadow-indigo-600/25 flex items-center justify-center gap-2 shrink-0 transition-all active:scale-[0.98]"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                    1-Klik Isi Otomatis Semua Field
                  </Button>
                </div>

                {/* Quick Topic Chips */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-slate-500 block">
                    Inspirasi Materi Cepat (Klik untuk langsung generate RPP lengkap):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '🕌 Shalat Berjamaah & Adab Masjid', topic: 'Ketentuan dan Keutamaan Shalat Berjamaah serta Adab di Masjid', mapel: 'Fikih' },
                      { label: '🗣️ Tutur Kata Santun & 4 Kata Ajaib', topic: 'Teks Narasi dan Penerapan 4 Kata Ajaib: Tolong, Maaf, Terima Kasih, Permisi', mapel: 'Bahasa Indonesia' },
                      { label: '🌱 Kebersihan Lingkungan & LiSA', topic: 'Pentingnya Menjaga Keseimbangan Alam dan Pengelolaan Sampah Madrasah (LiSA)', mapel: 'IPAS' },
                      { label: '🤝 Gotong Royong & Ta\'awun', topic: 'Indahnya Kebersamaan dan Budaya Gotong Royong di Lingkungan Madrasah', mapel: 'Pendidikan Pancasila' },
                      { label: '⚖️ Kejujuran Siswa (Shiddiq)', topic: 'Meneladani Sifat Shiddiq dan Menjauhi Perilaku Curang dalam Kehidupan Sehari-hari', mapel: 'Akidah Akhlak' },
                      { label: '🤲 Zakat & Kepedulian Sosial', topic: 'Kewajiban Zakat Fitrah dan Menumbuhkan Sikap Empati Berbagi kepada Kaum Duafa', mapel: 'Fikih' }
                    ].map((item, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            mata_pelajaran: item.mapel || prev.mata_pelajaran,
                            materi_pokok: item.topic
                          }));
                          handleAutoGenerateFromMateri(item.topic);
                        }}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white text-slate-700 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-700 transition-all text-left shadow-2xs"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bagian 2: Nilai Karakter Utama & P5-PPRA */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Dimensi & Nilai Karakter yang Dikembangkan</h2>
                  <p className="text-xs text-slate-500">Pilih nilai karakter utama (PPK) dan nilai Rahmatan lil 'Alamin (Kemenag)</p>
                </div>
              </div>

              {/* Tag Selector Nilai Karakter Utama */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  A. Nilai Karakter Utama (Pilih yang ditargetkan pada pembelajaran ini):
                </label>
                <div className="flex flex-wrap gap-2">
                  {PILIHAN_KARAKTER_UTAMA.map((karakter) => {
                    const isSelected = formData.karakter_utama.includes(karakter);
                    return (
                      <button
                        key={karakter}
                        type="button"
                        onClick={() => toggleKarakterUtama(karakter)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/20'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        {karakter}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tag Selector P5-PPRA Kemenag */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 block">
                  B. Nilai Profil Pelajar Rahmatan lil 'Alamin (PPRA Kemenag RI):
                </label>
                <div className="flex flex-wrap gap-2">
                  {PILIHAN_PPRA_KEMENAG.map((ppra) => {
                    const isSelected = formData.karakter_kemenag_ppra.includes(ppra);
                    return (
                      <button
                        key={ppra}
                        type="button"
                        onClick={() => togglePPRABerkembang(ppra)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" />}
                        {ppra}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pembiasaan Harian */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Pembiasaan Karakter Harian Terintegrasi</label>
                <Textarea
                  rows={2}
                  value={formData.pembiasaan_harian}
                  onChange={(e) => setFormData({ ...formData, pembiasaan_harian: e.target.value })}
                  placeholder="Contoh: Senyum-Salam-Sapa, Shalat Dhuha, tadarus Al-Qur'an, menjaga wudhu, disiplin waktu, dll."
                  className="rounded-xl text-sm"
                />
              </div>
            </div>

            {/* Bagian 3: Tujuan Pembelajaran Berbasis Karakter */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Tujuan Pembelajaran Berbasis Karakter (ABCD Framework)</h2>
                  <p className="text-xs text-slate-500">Mencakup aspek sikap spiritual, sikap sosial, pengetahuan, dan keterampilan aksi</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    1. Tujuan Sikap Spiritual (Ketaqwaan & Keyakinan)
                  </label>
                  <Textarea
                    rows={2}
                    value={formData.tujuan_spiritual}
                    onChange={(e) => setFormData({ ...formData, tujuan_spiritual: e.target.value })}
                    placeholder="Contoh: Peserta didik terbiasa mengawali dan mengakhiri kegiatan dengan berdoa secara khusyuk."
                    className="rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    2. Tujuan Sikap Sosial (Akhlak, Adab, & Kerjasama)
                  </label>
                  <Textarea
                    rows={2}
                    value={formData.tujuan_sosial}
                    onChange={(e) => setFormData({ ...formData, tujuan_sosial: e.target.value })}
                    placeholder="Contoh: Peserta didik menunjukkan sikap santun, jujur, dan ta'awun dalam kerja kelompok."
                    className="rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    3. Tujuan Pengetahuan (Kognitif Berkarakter)
                  </label>
                  <Textarea
                    rows={2}
                    value={formData.tujuan_pengetahuan}
                    onChange={(e) => setFormData({ ...formData, tujuan_pengetahuan: e.target.value })}
                    placeholder="Contoh: Peserta didik mampu menjelaskan ketentuan dan hikmah materi dengan kritis dan logis."
                    className="rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-purple-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-600" />
                    4. Tujuan Keterampilan (Praktik & Aksi Nyata)
                  </label>
                  <Textarea
                    rows={2}
                    value={formData.tujuan_keterampilan}
                    onChange={(e) => setFormData({ ...formData, tujuan_keterampilan: e.target.value })}
                    placeholder="Contoh: Peserta didik terampil mendemonstrasikan adab dan tata cara yang benar secara mandiri."
                    className="rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Ringkasan Uraian Materi</label>
                  <Textarea
                    rows={2}
                    value={formData.uraian_materi}
                    onChange={(e) => setFormData({ ...formData, uraian_materi: e.target.value })}
                    className="rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Titik Internalisasi Nilai Karakter</label>
                  <Textarea
                    rows={2}
                    value={formData.internalisasi_nilai}
                    onChange={(e) => setFormData({ ...formData, internalisasi_nilai: e.target.value })}
                    placeholder="Bagaimana nilai karakter disisipkan ke dalam materi pokok"
                    className="rounded-xl text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Bagian 4: Pendekatan, Model, & Media */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Metodologi & Sumber Belajar</h2>
                  <p className="text-xs text-slate-500">Pendekatan saintifik, model keteladanan, media, dan sumber referensi</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Pendekatan Pembelajaran</label>
                  <Input
                    value={formData.pendekatan}
                    onChange={(e) => setFormData({ ...formData, pendekatan: e.target.value })}
                    className="rounded-xl h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Model Pembelajaran</label>
                  <Input
                    value={formData.model_pembelajaran}
                    onChange={(e) => setFormData({ ...formData, model_pembelajaran: e.target.value })}
                    className="rounded-xl h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Metode</label>
                  <Input
                    value={formData.metode}
                    onChange={(e) => setFormData({ ...formData, metode: e.target.value })}
                    className="rounded-xl h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-1">
                  <label className="text-xs font-bold text-slate-700">Media & Alat Peraga</label>
                  <Input
                    value={formData.media_alat}
                    onChange={(e) => setFormData({ ...formData, media_alat: e.target.value })}
                    className="rounded-xl h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-bold text-slate-700">Sumber Belajar</label>
                  <Input
                    value={formData.sumber_belajar}
                    onChange={(e) => setFormData({ ...formData, sumber_belajar: e.target.value })}
                    className="rounded-xl h-10 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Bagian 5: Langkah-Langkah Pembelajaran Berkarakter */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                  5
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Sintaks & Langkah Kegiatan Pembelajaran</h2>
                  <p className="text-xs text-slate-500">Pendahuluan, kegiatan inti terintegrasi karakter, dan penutup refleksi nilai</p>
                </div>
              </div>

              {/* Pendahuluan */}
              <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-900">
                    A. Kegiatan Pendahuluan
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Alokasi Waktu:</span>
                    <Input
                      value={formData.pendahuluan_waktu}
                      onChange={(e) => setFormData({ ...formData, pendahuluan_waktu: e.target.value })}
                      className="w-24 h-7 text-xs bg-white rounded-lg text-center font-bold"
                    />
                  </div>
                </div>
                <Textarea
                  rows={4}
                  value={formData.pendahuluan_kegiatan}
                  onChange={(e) => setFormData({ ...formData, pendahuluan_kegiatan: e.target.value })}
                  placeholder="Salam pembuka, doa, tadarus, apersepsi, dan pembiasaan kerapian/kebersihan kelas..."
                  className="rounded-xl text-sm bg-white"
                />
              </div>

              {/* Inti */}
              <div className="space-y-2 p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-900">
                    B. Kegiatan Inti (Integrasi Karakter Aktif)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Alokasi Waktu:</span>
                    <Input
                      value={formData.inti_waktu}
                      onChange={(e) => setFormData({ ...formData, inti_waktu: e.target.value })}
                      className="w-24 h-7 text-xs bg-white rounded-lg text-center font-bold"
                    />
                  </div>
                </div>
                <Textarea
                  rows={6}
                  value={formData.inti_kegiatan}
                  onChange={(e) => setFormData({ ...formData, inti_kegiatan: e.target.value })}
                  placeholder="Mengamati, menanya secara kritis, eksplorasi bersama, diskusi ta'awun, presentasi santun..."
                  className="rounded-xl text-sm bg-white font-mono text-xs leading-relaxed"
                />
              </div>

              {/* Penutup */}
              <div className="space-y-2 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-900">
                    C. Kegiatan Penutup (Refleksi Nilai & Tindak Lanjut Habituasi)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500">Alokasi Waktu:</span>
                    <Input
                      value={formData.penutup_waktu}
                      onChange={(e) => setFormData({ ...formData, penutup_waktu: e.target.value })}
                      className="w-24 h-7 text-xs bg-white rounded-lg text-center font-bold"
                    />
                  </div>
                </div>
                <Textarea
                  rows={4}
                  value={formData.penutup_kegiatan}
                  onChange={(e) => setFormData({ ...formData, penutup_kegiatan: e.target.value })}
                  placeholder="Refleksi hikmah karakter, pesan moral pengamalan di rumah, doa kafaratul majelis, dan salam..."
                  className="rounded-xl text-sm bg-white"
                />
              </div>
            </div>

            {/* Bagian 6: Asesmen Karakter & Lembar Pengesahan */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-sm">
                  6
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Asesmen Karakter & Lembar Pengesahan</h2>
                  <p className="text-xs text-slate-500">Teknik evaluasi sikap, rubrik observasi, serta tanda tangan guru & kepala madrasah</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Teknik Penilaian Sikap Karakter</label>
                  <Textarea
                    rows={2}
                    value={formData.teknik_penilaian_sikap}
                    onChange={(e) => setFormData({ ...formData, teknik_penilaian_sikap: e.target.value })}
                    className="rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Teknik Penilaian Pengetahuan</label>
                  <Textarea
                    rows={2}
                    value={formData.teknik_penilaian_pengetahuan}
                    onChange={(e) => setFormData({ ...formData, teknik_penilaian_pengetahuan: e.target.value })}
                    className="rounded-xl text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Teknik Penilaian Keterampilan</label>
                  <Textarea
                    rows={2}
                    value={formData.teknik_penilaian_keterampilan}
                    onChange={(e) => setFormData({ ...formData, teknik_penilaian_keterampilan: e.target.value })}
                    className="rounded-xl text-sm"
                  />
                </div>
              </div>

              {/* Legalitas Pengesahan */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-3 border-t border-slate-100">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Kota / Tempat Titimangsa</label>
                  <Input
                    value={formData.titimangsa_tempat}
                    onChange={(e) => setFormData({ ...formData, titimangsa_tempat: e.target.value })}
                    className="rounded-xl h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Tanggal Pengesahan</label>
                  <Input
                    value={formData.titimangsa_tanggal}
                    onChange={(e) => setFormData({ ...formData, titimangsa_tanggal: e.target.value })}
                    className="rounded-xl h-10 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Nama Guru Pengampu</label>
                    {daftarGuru.length > 0 && (
                      <select
                        onChange={(e) => {
                          const val = e.target.value;
                          if (!val) return;
                          const selected = daftarGuru.find((g: any) => g.nama === val);
                          if (selected) {
                            setFormData(prev => ({
                              ...prev,
                              nama_guru: selected.nama,
                              nip_guru: selected.nip || '-'
                            }));
                          }
                        }}
                        className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-1.5 py-0.5 cursor-pointer"
                        defaultValue=""
                      >
                        <option value="" disabled>Pilih Guru Terdaftar</option>
                        {daftarGuru.map((g: any, idx: number) => (
                          <option key={idx} value={g.nama}>
                            {g.nama} ({g.kelas || 'Guru'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                  <Input
                    value={formData.nama_guru}
                    onChange={(e) => setFormData({ ...formData, nama_guru: e.target.value })}
                    className="rounded-xl h-10 text-sm font-medium"
                  />
                  <Input
                    value={formData.nip_guru}
                    onChange={(e) => setFormData({ ...formData, nip_guru: e.target.value })}
                    placeholder="NIP Guru"
                    className="rounded-xl h-8 text-xs text-slate-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">Nama Kepala Madrasah</label>
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          nama_kepala: defaultPimpinan,
                          nip_kepala: defaultNipPimpinan
                        }));
                        showSuccess('Kepala madrasah disinkronkan dengan data resmi.');
                      }}
                      className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-1.5 py-0.5 hover:bg-emerald-100 transition-all cursor-pointer"
                    >
                      Sync Resmi
                    </button>
                  </div>
                  <Input
                    value={formData.nama_kepala}
                    onChange={(e) => setFormData({ ...formData, nama_kepala: e.target.value })}
                    className="rounded-xl h-10 text-sm font-medium"
                  />
                  <Input
                    value={formData.nip_kepala}
                    onChange={(e) => setFormData({ ...formData, nip_kepala: e.target.value })}
                    placeholder="NIP Kepala"
                    className="rounded-xl h-8 text-xs text-slate-600"
                  />
                </div>
              </div>

              {/* Action Buttons Bottom */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <Button
                  onClick={handleSaveRPP}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl h-11 px-6 font-bold shadow-md"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Simpan ke Arsip RPP
                </Button>
                <Button
                  onClick={() => setActiveTab('preview')}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl h-11 px-6 font-bold shadow-md shadow-indigo-600/20"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Lihat Hasil & Cetak Dokumen
                </Button>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: PRATINJAU DOKUMEN RESMI SIAP CETAK (A4 STANDAR DINAS) */}
        {/* ========================================================================= */}
        {activeTab === 'preview' && (
          <div className="space-y-6">
            
            {/* Action Bar Atas */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 print:hidden">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('editor')}
                  className="rounded-xl h-10 text-xs font-bold"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Kembali Edit
                </Button>
                <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
                  Standar Resmi RPP Karakter P5-PPRA
                </Badge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopyText}
                  className="rounded-xl h-10 text-xs font-bold flex items-center gap-1.5"
                >
                  <Copy className="w-4 h-4" />
                  Salin Teks Lengkap
                </Button>
                <Button
                  onClick={handleSaveRPP}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl h-10 px-4 text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Save className="w-4 h-4" />
                  Simpan RPP
                </Button>
                <Button
                  onClick={handlePrint}
                  className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl h-10 px-5 text-xs font-bold flex items-center gap-2 shadow-lg"
                >
                  <Printer className="w-4 h-4" />
                  Cetak Dokumen Resmi (PDF/A4)
                </Button>
              </div>
            </div>

            {/* DOKUMEN DINAS RESMI A4 */}
            <div
              ref={printRef}
              className="bg-white mx-auto max-w-[850px] p-8 md:p-12 shadow-2xl rounded-2xl border border-slate-200 print:shadow-none print:border-none print:p-0 text-slate-900 font-serif leading-relaxed"
            >
              {/* 1. KOP SURAT RESMI (SYNC DENGAN MODUL KOP SURAT) */}
              <div className="mb-6">
                <KopSurat />
              </div>

              {/* 2. JUDUL DOKUMEN */}
              <div className="text-center my-6 space-y-1">
                <h1 className="text-lg md:text-xl font-bold uppercase tracking-wide underline underline-offset-4 decoration-2">
                  RENCANA PELAKSANAAN PEMBELAJARAN (RPP) BERORIENTASI KARAKTER
                </h1>
                <p className="text-xs uppercase tracking-widest text-slate-700 font-sans font-semibold">
                  PENGUATAN PENDIDIKAN KARAKTER (PPK) & PROFIL PELAJAR RAHMATAN LIL 'ALAMIN (P5-PPRA)
                </p>
                <p className="text-xs text-slate-600 font-sans">
                  Tahun Pelajaran: {formData.tahun_pelajaran} | Semester: {formData.semester}
                </p>
              </div>

              {/* 3. TABEL IDENTITAS */}
              <div className="mb-6 font-sans text-xs">
                <table className="w-full border-collapse border border-slate-400">
                  <tbody>
                    <tr>
                      <td className="w-1/4 p-2 font-bold border border-slate-400 bg-slate-50">Satuan Pendidikan</td>
                      <td className="w-1/4 p-2 border border-slate-400 font-semibold">{formData.satuan_pendidikan}</td>
                      <td className="w-1/4 p-2 font-bold border border-slate-400 bg-slate-50">Kelas / Fase</td>
                      <td className="w-1/4 p-2 border border-slate-400 font-semibold">{formData.kelas} / {formData.fase}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold border border-slate-400 bg-slate-50">Mata Pelajaran</td>
                      <td className="p-2 border border-slate-400 font-semibold text-indigo-950">{formData.mata_pelajaran}</td>
                      <td className="p-2 font-bold border border-slate-400 bg-slate-50">Alokasi Waktu</td>
                      <td className="p-2 border border-slate-400 font-semibold">{formData.alokasi_waktu}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold border border-slate-400 bg-slate-50">Tema / Bab</td>
                      <td colSpan={3} className="p-2 border border-slate-400 font-bold">{formData.tema_bab}</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-bold border border-slate-400 bg-slate-50">Materi Pokok</td>
                      <td colSpan={3} className="p-2 border border-slate-400">{formData.materi_pokok}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 4. NILAI KARAKTER UTAMA */}
              <div className="mb-6 text-xs font-sans">
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg space-y-2">
                  <div className="font-bold text-indigo-950 flex items-center gap-1.5 uppercase text-xs">
                    <HeartHandshake className="w-4 h-4 text-indigo-700" />
                    A. Nilai Karakter & Profil Pelajar yang Dikembangkan:
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-800">
                    <div>
                      <span className="font-bold">1. Karakter Utama (PPK):</span>
                      <ul className="list-disc list-inside ml-2 mt-0.5 space-y-0.5 text-[11px]">
                        {formData.karakter_utama.map((k, idx) => (
                          <li key={idx}>{k}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span className="font-bold">2. Profil Rahmatan lil 'Alamin:</span>
                      <ul className="list-disc list-inside ml-2 mt-0.5 space-y-0.5 text-[11px]">
                        {formData.karakter_kemenag_ppra.map((p, idx) => (
                          <li key={idx}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  {formData.pembiasaan_harian && (
                    <div className="text-[11px] pt-1.5 border-t border-indigo-200/60">
                      <span className="font-bold text-indigo-900">Pembiasaan Harian: </span>
                      <span>{formData.pembiasaan_harian}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* 5. TUJUAN PEMBELAJARAN BERBASIS KARAKTER */}
              <div className="mb-6 space-y-2 text-xs">
                <h2 className="font-bold uppercase text-slate-900 font-sans border-b border-slate-300 pb-1">
                  B. Tujuan Pembelajaran Berbasis Karakter
                </h2>
                <ol className="list-decimal list-outside ml-4 space-y-1 text-slate-800 text-xs">
                  <li>
                    <strong>Aspek Sikap Spiritual: </strong>
                    {formData.tujuan_spiritual}
                  </li>
                  <li>
                    <strong>Aspek Sikap Sosial: </strong>
                    {formData.tujuan_sosial}
                  </li>
                  <li>
                    <strong>Aspek Pengetahuan: </strong>
                    {formData.tujuan_pengetahuan}
                  </li>
                  <li>
                    <strong>Aspek Keterampilan: </strong>
                    {formData.tujuan_keterampilan}
                  </li>
                </ol>
              </div>

              {/* 6. MATERI & INTERNALISASI NILAI */}
              <div className="mb-6 space-y-2 text-xs">
                <h2 className="font-bold uppercase text-slate-900 font-sans border-b border-slate-300 pb-1">
                  C. Materi Pembelajaran & Internalisasi Nilai Karakter
                </h2>
                <div className="space-y-1.5 text-slate-800 text-xs">
                  <p><strong>1. Materi Pokok: </strong>{formData.uraian_materi}</p>
                  <p><strong>2. Titik Internalisasi Nilai: </strong>{formData.internalisasi_nilai}</p>
                </div>
              </div>

              {/* 7. METODE & MEDIA */}
              <div className="mb-6 space-y-2 text-xs">
                <h2 className="font-bold uppercase text-slate-900 font-sans border-b border-slate-300 pb-1">
                  D. Pendekatan, Model, Metode, dan Sumber Belajar
                </h2>
                <div className="grid grid-cols-2 gap-2 text-xs font-sans">
                  <p><strong>Pendekatan: </strong>{formData.pendekatan}</p>
                  <p><strong>Model Pembelajaran: </strong>{formData.model_pembelajaran}</p>
                  <p><strong>Metode: </strong>{formData.metode}</p>
                  <p><strong>Media/Alat: </strong>{formData.media_alat}</p>
                  <p className="col-span-2"><strong>Sumber Belajar: </strong>{formData.sumber_belajar}</p>
                </div>
              </div>

              {/* 8. LANGKAH-LANGKAH PEMBELAJARAN */}
              <div className="mb-6 space-y-3 text-xs">
                <h2 className="font-bold uppercase text-slate-900 font-sans border-b border-slate-300 pb-1">
                  E. Langkah-Langkah Kegiatan Pembelajaran (Integrasi Nilai Karakter)
                </h2>

                <table className="w-full border-collapse border border-slate-400 text-xs font-sans">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900">
                      <th className="p-2 border border-slate-400 w-24 text-center">Tahap</th>
                      <th className="p-2 border border-slate-400 text-left">Deskripsi Aktivitas & Penguatan Karakter</th>
                      <th className="p-2 border border-slate-400 w-20 text-center">Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border border-slate-400 font-bold align-top bg-slate-50/50 text-center">
                        Pendahuluan
                      </td>
                      <td className="p-2 border border-slate-400 align-top whitespace-pre-line leading-relaxed">
                        {formData.pendahuluan_kegiatan}
                      </td>
                      <td className="p-2 border border-slate-400 text-center align-top font-semibold">
                        {formData.pendahuluan_waktu}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-400 font-bold align-top bg-slate-50/50 text-center">
                        Kegiatan Inti
                      </td>
                      <td className="p-2 border border-slate-400 align-top whitespace-pre-line leading-relaxed">
                        {formData.inti_kegiatan}
                      </td>
                      <td className="p-2 border border-slate-400 text-center align-top font-semibold">
                        {formData.inti_waktu}
                      </td>
                    </tr>
                    <tr>
                      <td className="p-2 border border-slate-400 font-bold align-top bg-slate-50/50 text-center">
                        Penutup & Refleksi
                      </td>
                      <td className="p-2 border border-slate-400 align-top whitespace-pre-line leading-relaxed">
                        {formData.penutup_kegiatan}
                      </td>
                      <td className="p-2 border border-slate-400 text-center align-top font-semibold">
                        {formData.penutup_waktu}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 9. ASESMEN & RUBRIK KARAKTER */}
              <div className="mb-6 space-y-2 text-xs">
                <h2 className="font-bold uppercase text-slate-900 font-sans border-b border-slate-300 pb-1">
                  F. Penilaian / Asesmen Hasil Belajar & Karakter
                </h2>
                <div className="space-y-1.5 text-xs font-sans">
                  <p><strong>1. Penilaian Sikap Karakter: </strong>{formData.teknik_penilaian_sikap}</p>
                  <p><strong>2. Penilaian Pengetahuan: </strong>{formData.teknik_penilaian_pengetahuan}</p>
                  <p><strong>3. Penilaian Keterampilan: </strong>{formData.teknik_penilaian_keterampilan}</p>
                  <div className="p-2 rounded bg-slate-50 border border-slate-300 text-[11px] text-slate-700 mt-2">
                    <strong>Rubrik Karakter: </strong>{formData.rubrik_karakter_catatan}
                  </div>
                </div>
              </div>

              {/* 10. LEMBAR PENGESAHAN & PENANDATANGAN */}
              <div className="mt-8 pt-4 text-xs font-sans">
                <div className="flex justify-end mb-6">
                  <p>{formData.titimangsa_tempat}, {formData.titimangsa_tanggal}</p>
                </div>

                <div className="grid grid-cols-2 gap-8 text-center">
                  <div>
                    <p className="font-bold">Mengetahui,</p>
                    <p>Kepala Madrasah</p>
                    <div className="h-20" />
                    <p className="font-bold underline uppercase">{formData.nama_kepala}</p>
                    <p className="text-[11px] text-slate-600">NIP. {formData.nip_kepala || '-'}</p>
                  </div>

                  <div>
                    <p className="font-bold">Guru Pengampu Mata Pelajaran,</p>
                    <p className="text-transparent">Jabatan</p>
                    <div className="h-20" />
                    <p className="font-bold underline uppercase">{formData.nama_guru}</p>
                    <p className="text-[11px] text-slate-600">NIP. {formData.nip_guru || '-'}</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: BANK TEMPLATE PRESET CEPAT */}
        {/* ========================================================================= */}
        {activeTab === 'presets' && (
          <div className="space-y-6 print:hidden">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Koleksi Template Cepat RPP Karakter</h2>
                <p className="text-xs text-slate-500">
                  Gunakan template resmi siap pakai berikut untuk memulai penyusunan RPP Berkarakter dalam 1 kali klik.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {PRESET_TEMPLATES.map((preset, idx) => (
                  <div
                    key={idx}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <Badge className="bg-indigo-600 text-white text-[10px] font-bold">
                        {preset.mapel}
                      </Badge>
                      <h3 className="font-bold text-slate-900 text-sm leading-snug">
                        {preset.label}
                      </h3>
                      <p className="text-xs text-slate-600 line-clamp-3">
                        {preset.data.materi_pokok}
                      </p>
                    </div>

                    <Button
                      onClick={() => handleApplyPreset(preset)}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-10 font-bold text-xs shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Gunakan Template Ini
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: ARSIP RPP TERSIMPAN */}
        {/* ========================================================================= */}
        {activeTab === 'saved' && (
          <div className="space-y-6 print:hidden">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Arsip RPP Karakter Tersimpan</h2>
                  <p className="text-xs text-slate-500">Daftar RPP Karakter yang telah Anda buat dan simpan</p>
                </div>
                <Button
                  onClick={() => {
                    setFormData({
                      ...formData,
                      id: `rpp_${Date.now()}`,
                      tema_bab: 'Bab Baru: ...',
                      materi_pokok: ''
                    });
                    setActiveTab('editor');
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-9 px-4 text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Buat RPP Baru
                </Button>
              </div>

              {savedRPPList.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-sm">Belum Ada RPP yang Disimpan</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Susun RPP Karakter Anda pada tab "Penyusun RPP", lalu klik tombol "Simpan RPP" untuk menyimpannya di sini.
                  </p>
                  <Button
                    onClick={() => setActiveTab('editor')}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-9 px-4 text-xs font-bold"
                  >
                    Buka Penyusun RPP
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {savedRPPList.map((item) => (
                    <div
                      key={item.id}
                      className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
                            {item.mata_pelajaran} - {item.kelas}
                          </Badge>
                          <span className="text-[11px] text-slate-400">
                            {item.titimangsa_tanggal}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-900 text-sm">
                          {item.tema_bab}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {item.materi_pokok}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRPP(item.id)}
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl h-8 px-2 text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-1" />
                          Hapus
                        </Button>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setFormData(item);
                              setActiveTab('editor');
                            }}
                            className="rounded-xl h-8 px-3 text-xs font-bold"
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleLoadRPP(item)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl h-8 px-3 text-xs font-bold shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Cetak
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
