"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { usePrintSecurity } from '@/contexts/PrintSecurityContext';
import { supabase } from '@/integrations/supabase/client';

export interface TeacherSession {
  id: string;
  nama: string;
  nip: string;
  nik?: string;
  nuptk?: string;
  npk?: string;
  gelar?: string;
  jabatan?: string;
  mapel_diampu?: string;
  mengajar_kelas?: string;
  kelas?: string;
  telepon?: string;
  email?: string;
  foto_url?: string;
  tanda_tangan_url?: string | null;
  pin?: string;
  loginAt: string;
}

interface TeacherAuthContextType {
  currentTeacher: TeacherSession | null;
  isAuthenticated: boolean;
  isTeacherModalOpen: boolean;
  teachersList: TeacherSession[];
  loadingTeachers: boolean;
  loginAsTeacher: (teacher: Partial<TeacherSession>, pinInput: string) => { success: boolean; message?: string };
  logoutTeacher: () => void;
  openTeacherModal: (onSuccessCallback?: () => void) => void;
  closeTeacherModal: () => void;
  requireTeacherAuth: (action: () => void) => void;
  refreshTeachers: () => Promise<void>;
  updateTeacherPin: (teacherId: string, newPin: string) => Promise<{ success: boolean; message?: string }>;
}

const TeacherAuthContext = createContext<TeacherAuthContextType | undefined>(undefined);

const STORAGE_KEY = 'siakad_teacher_session';
const LOCAL_STORAGE_KEY = 'siakad_teacher_session_persisted';

export const TeacherAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeMadrasahId, getScopedKey } = useMadrasah();
  const { securitySettings, isAdminLoggedIn } = usePrintSecurity();

  const [currentTeacher, setCurrentTeacher] = useState<TeacherSession | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY) || localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      void e;
    }
    return null;
  });

  const [teachersList, setTeachersList] = useState<TeacherSession[]>([]);
  const [teacherPinsMap, setTeacherPinsMap] = useState<Record<string, string>>({});
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [isTeacherModalOpen, setIsTeacherModalOpen] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);

  // Load teachers list & pins from all possible storage keys
  const fetchTeachers = useCallback(async () => {
    setLoadingTeachers(true);
    try {
      // 1. Fetch Teacher Pins from site_settings & localStorage
      let pinsObj: Record<string, string> = {};
      try {
        const cachedPins = 
          localStorage.getItem(`siakad_teacher_pins_${activeMadrasahId}`) || 
          localStorage.getItem('siakad_teacher_pins');
        if (cachedPins) {
          pinsObj = JSON.parse(cachedPins);
        }
      } catch {}

      const { data: dbPins } = await supabase
        .from('site_settings')
        .select('id, value')
        .in('id', ['teacher_pins', getScopedKey('teacher_pins'), `siakad_teacher_pins_${activeMadrasahId}`]);

      if (dbPins && dbPins.length > 0) {
        dbPins.forEach(item => {
          if (item.value && typeof item.value === 'object') {
            pinsObj = { ...pinsObj, ...item.value };
          }
        });
      }
      setTeacherPinsMap(pinsObj);

      // 2. Fetch Teachers from all GTK keys
      const scopedGtkKey = getScopedKey('data_guru');
      const scopedTeachersKey = getScopedKey('teachers_list');
      
      const { data: dbData } = await supabase
        .from('site_settings')
        .select('id, value')
        .in('id', [
          scopedGtkKey,
          'data_guru',
          'siakad_data_guru',
          `siakad_data_guru_${activeMadrasahId}`,
          scopedTeachersKey,
          'teachers_list'
        ]);

      let list: any[] = [];
      if (dbData && dbData.length > 0) {
        const found = 
          dbData.find(d => d.id === scopedGtkKey) ||
          dbData.find(d => d.id === `siakad_data_guru_${activeMadrasahId}`) ||
          dbData.find(d => d.id === 'data_guru') ||
          dbData.find(d => d.id === 'siakad_data_guru') ||
          dbData.find(d => d.id === scopedTeachersKey) ||
          dbData.find(d => d.id === 'teachers_list');

        if (found?.value && Array.isArray(found.value) && found.value.length > 0) {
          list = found.value;
        }
      }

      // Fallback to local storage if DB empty
      if (list.length === 0) {
        const cached = 
          localStorage.getItem(`siakad_data_guru_${activeMadrasahId}`) || 
          localStorage.getItem('siakad_data_guru') ||
          localStorage.getItem('data_guru') ||
          localStorage.getItem('teachers_list');
        if (cached) {
          try {
            list = JSON.parse(cached);
          } catch {}
        }
      }

      if (Array.isArray(list) && list.length > 0) {
        const mapped: TeacherSession[] = list.map((t: any, idx: number) => {
          const tId = String(t.id || `gtk-${idx + 1}`);
          const assignedPin = 
            pinsObj[tId] || 
            pinsObj[t.nama] || 
            (t.nip && pinsObj[t.nip]) || 
            (t.nik && pinsObj[t.nik]) ||
            t.pin || '';

          return {
            id: tId,
            nama: t.nama || t.name || 'Guru Madrasah',
            gelar: t.gelar || '',
            nip: t.nip || t.nuptk || '-',
            nik: t.nik || '',
            nuptk: t.nuptk || '',
            npk: t.npk || '',
            jabatan: t.jabatan || t.role || 'Guru Mata Pelajaran',
            mapel_diampu: t.mapel_diampu || '',
            mengajar_kelas: t.mengajar_kelas || '',
            kelas: t.rombel || t.kelas || '',
            telepon: t.telepon || '',
            email: t.email || '',
            foto_url: t.foto_url || '',
            tanda_tangan_url: t.tanda_tangan_url || null,
            pin: assignedPin,
            loginAt: new Date().toISOString()
          };
        });
        setTeachersList(mapped);

        // If current teacher is logged in, refresh their profile
        if (currentTeacher) {
          const refreshed = mapped.find(m => m.id === currentTeacher.id || m.nama === currentTeacher.nama || (m.nip && m.nip !== '-' && m.nip === currentTeacher.nip));
          if (refreshed) {
            setCurrentTeacher(prev => prev ? { ...prev, ...refreshed } : null);
          }
        }
      }
    } catch (err) {
      console.warn('Gagal memuat daftar guru:', err);
    } finally {
      setLoadingTeachers(false);
    }
  }, [activeMadrasahId, getScopedKey, currentTeacher?.id]);

  useEffect(() => {
    fetchTeachers();

    const handlePinsUpdated = () => {
      fetchTeachers();
    };

    window.addEventListener('teacher_pins_updated', handlePinsUpdated);
    window.addEventListener('siakad_teachers_updated', handlePinsUpdated);
    return () => {
      window.removeEventListener('teacher_pins_updated', handlePinsUpdated);
      window.removeEventListener('siakad_teachers_updated', handlePinsUpdated);
    };
  }, [fetchTeachers]);

  // Login handler
  const loginAsTeacher = (teacher: Partial<TeacherSession>, pinInput: string) => {
    const cleanPin = (pinInput || '').trim();
    if (!cleanPin) {
      return { success: false, message: 'Silakan masukkan PIN pengaman.' };
    }

    const targetMasterPin = (securitySettings?.password || '').trim();

    // Check specific PIN assigned in Kredensial GTK / teacher_pins map
    const tId = teacher.id ? String(teacher.id) : '';
    const customPin = 
      (tId && teacherPinsMap[tId]) || 
      (teacher.nama && teacherPinsMap[teacher.nama]) || 
      (teacher.nip && teacher.nip !== '-' && teacherPinsMap[teacher.nip]) ||
      (teacher.nik && teacherPinsMap[teacher.nik]) ||
      teacher.pin || '';

    // Digits of NIP & NIK
    const nipClean = teacher.nip ? teacher.nip.replace(/\D/g, '') : '';
    const nipLast6 = nipClean.length >= 6 ? nipClean.slice(-6) : '';
    const nikClean = teacher.nik ? teacher.nik.replace(/\D/g, '') : '';
    const nikLast6 = nikClean.length >= 6 ? nikClean.slice(-6) : '';
    const nuptkClean = teacher.nuptk ? teacher.nuptk.replace(/\D/g, '') : '';
    const npkClean = teacher.npk ? teacher.npk.replace(/\D/g, '') : '';

    let isValid = false;

    // 1. Check if matches custom PIN from Kredensial GTK
    if (customPin && cleanPin === String(customPin).trim()) {
      isValid = true;
    }
    // 2. Check if matches Master Admin Password
    else if (targetMasterPin && cleanPin === targetMasterPin) {
      isValid = true;
    }
    // 3. Check if matches NIP (full or last 6 digits)
    else if ((nipClean && cleanPin === nipClean) || (nipLast6 && cleanPin === nipLast6)) {
      isValid = true;
    }
    // 4. Check if matches NIK (full or last 6 digits)
    else if ((nikClean && cleanPin === nikClean) || (nikLast6 && cleanPin === nikLast6)) {
      isValid = true;
    }
    // 5. Check if matches NUPTK or NPK
    else if ((nuptkClean && cleanPin === nuptkClean) || (npkClean && cleanPin === npkClean)) {
      isValid = true;
    }
    // 6. Default Fallback PIN "123456" if no custom PIN was set
    else if (!customPin && (cleanPin === '123456' || cleanPin === 'admin' || cleanPin === '1234')) {
      isValid = true;
    }

    if (!isValid && !isAdminLoggedIn) {
      return { 
        success: false, 
        message: 'PIN tidak valid. Gunakan PIN dari Kredensial GTK, 6 digit NIP/NIK, atau hubungi administrator madrasah.' 
      };
    }

    const sessionData: TeacherSession = {
      id: teacher.id || String(Date.now()),
      nama: teacher.nama || 'Guru Madrasah',
      gelar: teacher.gelar || '',
      nip: teacher.nip || '-',
      nik: teacher.nik || '',
      nuptk: teacher.nuptk || '',
      npk: teacher.npk || '',
      jabatan: teacher.jabatan || 'Guru Pendidik',
      mapel_diampu: teacher.mapel_diampu || '',
      mengajar_kelas: teacher.mengajar_kelas || '',
      kelas: teacher.kelas || '',
      telepon: teacher.telepon || '',
      email: teacher.email || '',
      foto_url: teacher.foto_url || '',
      tanda_tangan_url: teacher.tanda_tangan_url || null,
      pin: customPin || cleanPin,
      loginAt: new Date().toISOString()
    };

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(sessionData));
    } catch (e) {
      void e;
    }

    setCurrentTeacher(sessionData);
    setIsTeacherModalOpen(false);

    if (pendingCallback) {
      pendingCallback();
      setPendingCallback(null);
    }

    return { success: true };
  };

  const logoutTeacher = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch (e) {
      void e;
    }
    setCurrentTeacher(null);
  };

  const updateTeacherPin = async (teacherId: string, newPin: string) => {
    const clean = newPin.trim();
    if (!clean || clean.length < 4) {
      return { success: false, message: 'PIN minimal 4 digit/karakter!' };
    }

    try {
      const teacher = teachersList.find(t => t.id === teacherId);
      const updatedPins = {
        ...teacherPinsMap,
        [teacherId]: clean,
        ...(teacher?.nama ? { [teacher.nama]: clean } : {}),
        ...(teacher?.nip && teacher.nip !== '-' ? { [teacher.nip]: clean } : {}),
        ...(teacher?.nik ? { [teacher.nik]: clean } : {})
      };

      await supabase
        .from('site_settings')
        .upsert({
          id: 'teacher_pins',
          value: updatedPins,
          updated_at: new Date().toISOString()
        });

      localStorage.setItem('siakad_teacher_pins', JSON.stringify(updatedPins));
      localStorage.setItem(`siakad_teacher_pins_${activeMadrasahId}`, JSON.stringify(updatedPins));

      setTeacherPinsMap(updatedPins);
      window.dispatchEvent(new CustomEvent('teacher_pins_updated'));

      if (currentTeacher && currentTeacher.id === teacherId) {
        const updatedSession = { ...currentTeacher, pin: clean };
        setCurrentTeacher(updatedSession);
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedSession));
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, message: err.message || 'Gagal menyimpan PIN baru' };
    }
  };

  const openTeacherModal = (onSuccess?: () => void) => {
    if (onSuccess) {
      setPendingCallback(() => onSuccess);
    }
    setIsTeacherModalOpen(true);
  };

  const closeTeacherModal = () => {
    setIsTeacherModalOpen(false);
    setPendingCallback(null);
  };

  const requireTeacherAuth = (action: () => void) => {
    if (isAdminLoggedIn || currentTeacher) {
      action();
      return;
    }
    openTeacherModal(action);
  };

  const isAuthenticated = !!currentTeacher || isAdminLoggedIn;

  return (
    <TeacherAuthContext.Provider
      value={{
        currentTeacher,
        isAuthenticated,
        isTeacherModalOpen,
        teachersList,
        loadingTeachers,
        loginAsTeacher,
        logoutTeacher,
        openTeacherModal,
        closeTeacherModal,
        requireTeacherAuth,
        refreshTeachers: fetchTeachers,
        updateTeacherPin
      }}
    >
      {children}
    </TeacherAuthContext.Provider>
  );
};

export const useTeacherAuth = () => {
  const context = useContext(TeacherAuthContext);
  if (!context) {
    throw new Error('useTeacherAuth must be used within a TeacherAuthProvider');
  }
  return context;
};
