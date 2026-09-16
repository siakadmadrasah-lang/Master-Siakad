import { supabase } from '@/integrations/supabase/client';

export interface MapelItem {
  id: string;
  nama: string;
  kelompok: 'A' | 'B' | 'C';
  singkatan: string;
  keterangan?: string;
}

export const DEFAULT_MAPELS: MapelItem[] = [
  { id: '1', nama: 'Al-Qur\'an Hadis', kelompok: 'A', singkatan: 'QH', keterangan: 'Pendidikan Agama Islam (PAI)' },
  { id: '2', nama: 'Akidah Akhlak', kelompok: 'A', singkatan: 'AA', keterangan: 'Pendidikan Agama Islam (PAI)' },
  { id: '3', nama: 'Fikih', kelompok: 'A', singkatan: 'FQ', keterangan: 'Pendidikan Agama Islam (PAI)' },
  { id: '4', nama: 'Sejarah Kebudayaan Islam', kelompok: 'A', singkatan: 'SKI', keterangan: 'Pendidikan Agama Islam (PAI)' },
  { id: '5', nama: 'Bahasa Arab', kelompok: 'A', singkatan: 'BA', keterangan: 'Bahasa Asing Keagamaan' },
  { id: '6', nama: 'Pendidikan Pancasila', kelompok: 'B', singkatan: 'PP', keterangan: 'Muatan Nasional' },
  { id: '7', nama: 'Bahasa Indonesia', kelompok: 'B', singkatan: 'BIN', keterangan: 'Muatan Nasional' },
  { id: '8', nama: 'Matematika', kelompok: 'B', singkatan: 'MTK', keterangan: 'Muatan Nasional' },
  { id: '9', nama: 'IPAS', kelompok: 'B', singkatan: 'IPAS', keterangan: 'Ilmu Pengetahuan Alam & Sosial' },
  { id: '10', nama: 'PJOK', kelompok: 'B', singkatan: 'PJOK', keterangan: 'Pendidikan Jasmani Olahraga & Kesehatan' },
  { id: '11', nama: 'Seni dan Budaya', kelompok: 'B', singkatan: 'SB', keterangan: 'Seni & Prakarya' },
  { id: '12', nama: 'Bahasa Inggris', kelompok: 'B', singkatan: 'BIG', keterangan: 'Bahasa Asing Umum' },
  { id: '13', nama: 'Bina Ke-NU-an (Aswaja)', kelompok: 'C', singkatan: 'NU', keterangan: 'Ke-NU-an & Keorganisasian LP Ma\'arif NU' },
  { id: '14', nama: 'Muatan Lokal Bahasa Daerah', kelompok: 'C', singkatan: 'ML', keterangan: 'Bahasa Daerah / Keunggulan Lokal' },
  { id: '15', nama: 'Tahfidz / BTQ', kelompok: 'C', singkatan: 'BTQ', keterangan: 'Program Khusus Baca Tulis Al-Qur\'an & Hafalan' },
];

export function normalizeMapelName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/['’`-]/g, '')
    .replace(/qur?an/g, 'quran')
    .replace(/hadit?s/g, 'hadis')
    .replace(/fiq?ih/g, 'fikih')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function fetchMataPelajaran(): Promise<MapelItem[]> {
  try {
    const { data: res } = await supabase
      .from('site_settings')
      .select('value')
      .eq('id', 'mata_pelajaran_list')
      .maybeSingle();

    if (res?.value && Array.isArray(res.value) && res.value.length > 0) {
      return res.value as MapelItem[];
    }

    // Try localStorage backup
    try {
      const cached = localStorage.getItem('siakad_site_settings');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.mata_pelajaran_list && Array.isArray(parsed.mata_pelajaran_list) && parsed.mata_pelajaran_list.length > 0) {
          return parsed.mata_pelajaran_list as MapelItem[];
        }
      }
    } catch (e) {
      // Ignore cache parse
    }

    // Upsert default mapels to site_settings so DB always has them
    await supabase.from('site_settings').upsert({
      id: 'mata_pelajaran_list',
      value: DEFAULT_MAPELS,
      updated_at: new Date().toISOString()
    });

    return DEFAULT_MAPELS;
  } catch (err) {
    console.warn('[Mapel] Error fetching mapel, using default list:', err);
    return DEFAULT_MAPELS;
  }
}
