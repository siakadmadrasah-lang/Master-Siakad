export interface PrestasiItem {
  id: string;
  nama_siswa: string;
  nisn?: string;
  kelas?: string;
  tanggal_kegiatan: string;
  jenis_lomba: string;
  tingkat: 'Kecamatan' | 'Kabupaten' | 'Provinsi' | 'Nasional' | 'Internasional' | string;
  bidang?: 'Akademik' | 'Keagamaan / MTQ' | 'Sains & Teknologi' | 'Olahraga' | 'Seni & Budaya' | 'Kepramukaan' | 'Literasi & Bahasa' | 'Lainnya' | string;
  juara_ke: string;
  penyelenggara?: string;
  pembimbing?: string;
  keterangan?: string;
  foto_url?: string;
  sertifikat_url?: string;
  nomor_piagam?: string;
  created_at?: string;
}

export const defaultPrestasiList: PrestasiItem[] = [
  {
    id: 'p1',
    nama_siswa: 'Ahmad Fauzi & Tim Regu',
    nisn: '3128940192',
    kelas: 'Kelas 5',
    tanggal_kegiatan: '2024-05-12',
    jenis_lomba: 'KSM (Kompetisi Sains Madrasah) Matematika Terintegrasi',
    tingkat: 'Kabupaten',
    bidang: 'Sains & Teknologi',
    juara_ke: 'Juara 1',
    penyelenggara: 'Kantor Kementerian Agama Kabupaten',
    pembimbing: 'Ustadz Mansur, S.Pd.I',
    nomor_piagam: '421.2/KSM-MTK/V/2024',
    keterangan: 'Maju Mewakili Kabupaten ke Tingkat Provinsi Jawa Tengah',
    foto_url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'p2',
    nama_siswa: 'Siti Nurhaliza Azzahra',
    nisn: '3149810293',
    kelas: 'Kelas 4',
    tanggal_kegiatan: '2024-03-20',
    jenis_lomba: 'Musabaqah Tilawatil Quran (MTQ) & Kaligrafi Islami',
    tingkat: 'Kecamatan',
    bidang: 'Keagamaan / MTQ',
    juara_ke: 'Juara 1',
    penyelenggara: 'Kelompok Kerja Madrasah Ibtidaiyah (KKMI)',
    pembimbing: 'Ustadzah Nur Aini, S.Pd',
    nomor_piagam: '018/KKMI-MTQ/III/2024',
    keterangan: 'Mendapatkan Piala Bergilir & Piagam Kehormatan',
    foto_url: 'https://images.unsplash.com/photo-1588072432836-e10032774350?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'p3',
    nama_siswa: 'Regu Elang & Melati Pramuka Penggalang',
    kelas: 'Kelas 5 & 6',
    tanggal_kegiatan: '2023-11-10',
    jenis_lomba: 'Lomba Tingkat Pramuka Penggalang (LT-III)',
    tingkat: 'Kabupaten',
    bidang: 'Kepramukaan',
    juara_ke: 'Juara 2',
    penyelenggara: 'Kwartir Cabang Gerakan Pramuka',
    pembimbing: 'Kak Rahmat Hidayat',
    nomor_piagam: 'Kwarcab/LT-III/XI/2023',
    keterangan: 'Piala Tetap, Medali Perak, dan Sertifikat Penghargaan',
    foto_url: 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'p4',
    nama_siswa: 'Muhammad Rayhan Al-Ghifari',
    nisn: '3157291048',
    kelas: 'Kelas 6',
    tanggal_kegiatan: '2024-08-14',
    jenis_lomba: 'Kejuaraan Bulu Tangkis & Tenis Meja Tingkat Pelajar',
    tingkat: 'Kabupaten',
    bidang: 'Olahraga',
    juara_ke: 'Juara 1',
    penyelenggara: 'Dinas Pemuda & Olahraga / BAPOMI',
    pembimbing: 'Bpk. Hendra Wijaya, S.Pd.Jas',
    nomor_piagam: 'DISPORA/O2SN/VIII/2024',
    keterangan: 'Medali Emas & Sertifikat Juara Tunggal Putra',
    foto_url: 'https://images.unsplash.com/photo-1517649763962-0c623266ddc0?auto=format&fit=crop&w=800&q=80'
  }
];
