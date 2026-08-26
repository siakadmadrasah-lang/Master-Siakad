import { supabase } from '../integrations/supabase/client';

export interface RombelClass {
  id: string;
  nama_kelas: string;
  tingkat?: string;
  wali_kelas?: string;
  ruangan?: string;
  kapasitas?: number;
  tahun_pelajaran?: string;
  keterangan?: string;
  created_at?: string;
}

export const DEFAULT_ROMBEL_CLASSES: RombelClass[] = [
  { id: 'c-1a', nama_kelas: 'Kelas 1A', tingkat: '1', wali_kelas: 'Ustadzah Fatimah, S.Pd', ruangan: 'R. 101', kapasitas: 30, tahun_pelajaran: '2024/2025' },
  { id: 'c-1b', nama_kelas: 'Kelas 1B', tingkat: '1', wali_kelas: 'Ustadz Ahmad, S.Ag', ruangan: 'R. 102', kapasitas: 30, tahun_pelajaran: '2024/2025' },
  { id: 'c-2a', nama_kelas: 'Kelas 2A', tingkat: '2', wali_kelas: 'Siti Rahma, S.Pd.I', ruangan: 'R. 201', kapasitas: 32, tahun_pelajaran: '2024/2025' },
  { id: 'c-3a', nama_kelas: 'Kelas 3A', tingkat: '3', wali_kelas: 'Muhammad Imran, M.Pd', ruangan: 'R. 202', kapasitas: 32, tahun_pelajaran: '2024/2025' },
  { id: 'c-4a', nama_kelas: 'Kelas 4A', tingkat: '4', wali_kelas: 'Nur Azizah, S.Si', ruangan: 'R. 301', kapasitas: 32, tahun_pelajaran: '2024/2025' },
  { id: 'c-5a', nama_kelas: 'Kelas 5A', tingkat: '5', wali_kelas: 'Hasan Basri, S.Pd', ruangan: 'R. 302', kapasitas: 32, tahun_pelajaran: '2024/2025' },
  { id: 'c-6a', nama_kelas: 'Kelas 6A', tingkat: '6', wali_kelas: 'Zubair Al-Farisi, S.Ag', ruangan: 'R. 303', kapasitas: 32, tahun_pelajaran: '2024/2025' },
];

export const STORAGE_KEYS_CLASSES = [
  'siakad_classes_cache',
  'kelas_list',
  'siakad_classes_data',
  'siakad_rombel_classes',
  'site_classes',
  'app_classes',
  'classes_data',
  'madrasah_classes'
];

const DELETED_CLASSES_KEY = 'siakad_deleted_class_keys';

/**
 * Returns set of normalized class identifiers that were explicitly deleted by user
 */
export function getDeletedClassKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(DELETED_CLASSES_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr.map(s => String(s).toLowerCase().trim()));
      }
    }
  } catch (e) {
    console.error(e);
  }
  return new Set();
}

/**
 * Record a class as explicitly deleted so merge logic doesn't resurrect it
 */
export function markClassAsDeleted(classIdOrName: string) {
  if (!classIdOrName) return;
  const deleted = getDeletedClassKeys();
  deleted.add(classIdOrName.toLowerCase().trim());
  try {
    localStorage.setItem(DELETED_CLASSES_KEY, JSON.stringify(Array.from(deleted)));
  } catch (e) {
    console.error(e);
  }
}

/**
 * Remove deleted marker if a class is re-created with the same name
 */
export function unmarkClassAsDeleted(classIdOrName: string) {
  if (!classIdOrName) return;
  const deleted = getDeletedClassKeys();
  const key = classIdOrName.toLowerCase().trim();
  if (deleted.has(key)) {
    deleted.delete(key);
    try {
      localStorage.setItem(DELETED_CLASSES_KEY, JSON.stringify(Array.from(deleted)));
    } catch (e) {
      console.error(e);
    }
  }
}

/**
 * Merge multiple class arrays comprehensively without losing newly created classes
 */
export function mergeClassLists(...lists: (RombelClass[] | undefined | null)[]): RombelClass[] {
  const deletedKeys = getDeletedClassKeys();
  const mergedMap = new Map<string, RombelClass>();

  lists.forEach(list => {
    if (!Array.isArray(list)) return;
    list.forEach(cls => {
      if (!cls || !cls.nama_kelas) return;
      const normName = cls.nama_kelas.trim().toLowerCase();
      const normId = (cls.id || '').trim().toLowerCase();

      // Skip explicitly deleted classes
      if (deletedKeys.has(normName) || (normId && deletedKeys.has(normId))) {
        return;
      }

      const key = normName;
      const existing = mergedMap.get(key);

      if (!existing) {
        mergedMap.set(key, { ...cls });
      } else {
        // Keep existing with merged/updated non-empty fields
        mergedMap.set(key, {
          ...existing,
          ...cls,
          id: cls.id || existing.id,
          nama_kelas: cls.nama_kelas || existing.nama_kelas,
          tingkat: cls.tingkat || existing.tingkat,
          wali_kelas: (cls.wali_kelas && cls.wali_kelas !== '-') ? cls.wali_kelas : existing.wali_kelas,
          ruangan: cls.ruangan || existing.ruangan,
          kapasitas: cls.kapasitas || existing.kapasitas,
          tahun_pelajaran: cls.tahun_pelajaran || existing.tahun_pelajaran,
          keterangan: cls.keterangan || existing.keterangan
        });
      }
    });
  });

  return Array.from(mergedMap.values());
}

/**
 * Load classes comprehensively from Supabase site_settings + all localStorage keys
 */
export async function loadPersistedClasses(scopedKey?: string): Promise<RombelClass[]> {
  const allKeys = Array.from(new Set([
    scopedKey || 'kelas_list',
    'kelas_list',
    ...STORAGE_KEYS_CLASSES
  ]));

  const collectedLists: RombelClass[][] = [];

  // 1. Fetch from Supabase site_settings
  try {
    const { data: rows } = await supabase
      .from('site_settings')
      .select('id, value')
      .in('id', allKeys);

    if (rows && rows.length > 0) {
      rows.forEach(r => {
        if (Array.isArray(r.value) && r.value.length > 0) {
          collectedLists.push(r.value);
        }
      });
    }
  } catch (e) {
    console.error('Error fetching classes from Supabase:', e);
  }

  // 2. Read from all localStorage keys
  allKeys.forEach(k => {
    try {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          collectedLists.push(parsed);
        }
      }
    } catch (err) {
      void err;
    }
  });

  // 3. Read from siakad_site_settings cache object
  try {
    const cachedObj = localStorage.getItem('siakad_site_settings');
    if (cachedObj) {
      const parsed = JSON.parse(cachedObj);
      allKeys.forEach(k => {
        if (parsed[k] && Array.isArray(parsed[k]) && parsed[k].length > 0) {
          collectedLists.push(parsed[k]);
        }
      });
    }
  } catch (err) {
    void err;
  }

  // 4. Merge all lists
  let merged = mergeClassLists(...collectedLists);

  // Fallback to default classes if completely empty
  if (merged.length === 0) {
    merged = [...DEFAULT_ROMBEL_CLASSES];
  }

  // Ensure localStorage is updated with merged list
  allKeys.forEach(k => {
    try { localStorage.setItem(k, JSON.stringify(merged)); } catch (err) { void err; }
  });

  // 5. Auto sync merged classes back to MySQL in background
  if (merged.length > 0) {
    const now = new Date().toISOString();
    const payload = allKeys.map(k => ({ id: k, value: merged, updated_at: now }));
    supabase.from('site_settings').upsert(payload).catch(err => void err);
  }

  return merged;
}

/**
 * Save classes across all localStorage keys, dispatch custom event, and upsert to Supabase
 */
export async function savePersistedClasses(newClassesList: RombelClass[], scopedKey?: string): Promise<void> {
  const allKeys = Array.from(new Set([
    scopedKey || 'kelas_list',
    'kelas_list',
    ...STORAGE_KEYS_CLASSES
  ]));

  // Ensure any newly added class is un-marked as deleted
  newClassesList.forEach(cls => {
    if (cls && cls.nama_kelas) {
      unmarkClassAsDeleted(cls.nama_kelas);
      if (cls.id) unmarkClassAsDeleted(cls.id);
    }
  });

  // Save to localStorage
  allKeys.forEach(k => {
    try { localStorage.setItem(k, JSON.stringify(newClassesList)); } catch (err) { void err; }
  });

  try {
    const cachedStr = localStorage.getItem('siakad_site_settings');
    const settingsObj = cachedStr ? JSON.parse(cachedStr) : {};
    allKeys.forEach(k => {
      settingsObj[k] = newClassesList;
    });
    localStorage.setItem('siakad_site_settings', JSON.stringify(settingsObj));
  } catch (err) { void err; }

  // Broadcast events
  window.dispatchEvent(new CustomEvent('siakad_direktori_updated'));
  window.dispatchEvent(new CustomEvent('siakad_classes_updated'));
  window.dispatchEvent(new Event('storage'));

  // Upsert to Supabase site_settings
  try {
    const now = new Date().toISOString();
    const payload = allKeys.map(k => ({ id: k, value: newClassesList, updated_at: now }));
    await supabase.from('site_settings').upsert(payload);
  } catch (e) {
    console.error('Supabase classes save error:', e);
  }
}

export const STORAGE_KEYS_STUDENTS = [
  'students_list',
  'siakad_students_data',
  'site_students',
  'app_students_v2',
  'students_data',
  'madrasah_students'
];

/**
 * Load students safely from Supabase site_settings, students table, or local storage fallback
 */
export async function loadPersistedStudents(scopedKey?: string): Promise<any[]> {
  const allKeys = Array.from(new Set([
    scopedKey || 'students_list',
    'students_list',
    ...STORAGE_KEYS_STUDENTS
  ]));

  let loadedStudents: any[] = [];
  let found = false;

  // 1. Try fetching site_settings from Supabase
  try {
    const { data: rows } = await supabase
      .from('site_settings')
      .select('id, value, updated_at')
      .in('id', allKeys)
      .order('updated_at', { ascending: false });

    if (rows && rows.length > 0) {
      for (const r of rows) {
        if (Array.isArray(r.value) && r.value.length > 0) {
          loadedStudents = r.value;
          found = true;
          break;
        }
      }
    }
  } catch (e) {
    console.error('Supabase students site_settings query non-fatal error:', e);
  }

  // 2. Try fetching from students table
  if (!found) {
    try {
      const { data: dbStudents } = await supabase.from('students').select('*');
      if (dbStudents && dbStudents.length > 0) {
        loadedStudents = dbStudents.map((s: any) => ({
          ...s,
          rombel: s.rombel || s.kelas || '1A',
          gender: s.gender === 'Perempuan' ? 'Perempuan' : 'Laki-laki',
          status: s.status || 'active',
        }));
        found = true;
      }
    } catch (e) {
      console.error('Supabase students table query non-fatal error:', e);
    }
  }

  // 3. Fallback to localStorage keys
  if (!found) {
    for (const k of allKeys) {
      try {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            loadedStudents = parsed;
            found = true;
            break;
          }
        }
      } catch (err) {
        void err;
      }
    }
  }

  // 4. Fallback to siakad_students_cache
  if (!found) {
    try {
      const cached = localStorage.getItem('siakad_students_cache');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedStudents = parsed;
        }
      }
    } catch (err) {
      void err;
    }
  }

  // Sync to local cache if fetched from database
  if (found && loadedStudents.length > 0) {
    allKeys.forEach(k => {
      try { localStorage.setItem(k, JSON.stringify(loadedStudents)); } catch (err) { void err; }
    });
    try { localStorage.setItem('siakad_students_cache', JSON.stringify(loadedStudents)); } catch (err) { void err; }
  }

  return loadedStudents;
}

/**
 * Save students across all local storage keys and Supabase
 */
export async function savePersistedStudents(newStudentsList: any[], scopedKey?: string): Promise<void> {
  const allKeys = Array.from(new Set([
    scopedKey || 'students_list',
    'students_list',
    ...STORAGE_KEYS_STUDENTS
  ]));

  allKeys.forEach(k => {
    try { localStorage.setItem(k, JSON.stringify(newStudentsList)); } catch (err) { void err; }
  });
  try { localStorage.setItem('siakad_students_cache', JSON.stringify(newStudentsList)); } catch (err) { void err; }

  window.dispatchEvent(new CustomEvent('siakad_students_updated'));
  window.dispatchEvent(new Event('storage'));

  try {
    const now = new Date().toISOString();
    const payload = allKeys.map(k => ({ id: k, value: newStudentsList, updated_at: now }));
    await supabase.from('site_settings').upsert(payload);
  } catch (e) {
    console.error('Supabase students save error:', e);
  }
}

