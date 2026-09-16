"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { PrintSecuritySettings, DEFAULT_PRINT_SECURITY } from '@/types/printSecurity';
import PrintProtectionModal from '@/components/PrintProtectionModal';

interface PrintSecurityContextType {
  securitySettings: PrintSecuritySettings;
  loading: boolean;
  isAuthorized: boolean;
  isAdminLoggedIn: boolean;
  requirePrintAuth: (action: () => void, documentTitle?: string) => void;
  verifyPassword: (inputPass: string) => boolean;
  updateSecuritySettings: (newSettings: Partial<PrintSecuritySettings>) => Promise<boolean>;
  clearSessionAuthorization: () => void;
  openProtectionDialogManually: (onSuccess: () => void, documentTitle?: string) => void;
}

const PrintSecurityContext = createContext<PrintSecurityContextType | undefined>(undefined);

const STORAGE_KEY = 'siakad_print_security_settings';
const DB_SETTING_ID = 'print_security_settings';

export const PrintSecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeMadrasahId } = useMadrasah();
  const [securitySettings, setSecuritySettings] = useState<PrintSecuritySettings>(DEFAULT_PRINT_SECURITY);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);

  // Modal State for global trigger
  const [modalOpen, setModalOpen] = useState(false);
  const [currentDocTitle, setCurrentDocTitle] = useState<string | undefined>(undefined);
  const pendingActionRef = useRef<(() => void) | null>(null);

  // 1. Check session authorization on mount
  useEffect(() => {
    try {
      const isAuth = sessionStorage.getItem('siakad_print_authorized') === 'true';
      setIsAuthorized(isAuth);
    } catch (e) {
      setIsAuthorized(false);
    }
  }, []);

  // 2. Check if admin is currently authenticated
  useEffect(() => {
    const checkAdminAuth = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session?.user) {
          setIsAdminLoggedIn(true);
        } else {
          setIsAdminLoggedIn(false);
        }
      } catch (err) {
        setIsAdminLoggedIn(false);
      }
    };

    checkAdminAuth();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdminLoggedIn(!!session?.user);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // 3. Load security settings from Supabase & LocalStorage
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      // Check Supabase first
      const { data: dbData } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', DB_SETTING_ID)
        .maybeSingle();

      if (dbData?.value && typeof dbData.value === 'object') {
        const merged: PrintSecuritySettings = {
          ...DEFAULT_PRINT_SECURITY,
          ...dbData.value,
        };
        setSecuritySettings(merged);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } else {
        // Fallback to localStorage
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            setSecuritySettings({ ...DEFAULT_PRINT_SECURITY, ...parsed });
          } catch (e) {
            setSecuritySettings(DEFAULT_PRINT_SECURITY);
          }
        } else {
          setSecuritySettings(DEFAULT_PRINT_SECURITY);
        }
      }
    } catch (error) {
      console.error('Failed to fetch print security settings:', error);
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          setSecuritySettings({ ...DEFAULT_PRINT_SECURITY, ...JSON.parse(cached) });
        } catch (e) {
          setSecuritySettings(DEFAULT_PRINT_SECURITY);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();

    // Listen to storage and custom broadcast events
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setSecuritySettings(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };

    const handleCustomUpdate = () => {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          setSecuritySettings(JSON.parse(cached));
        } catch (err) {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('siakad_print_security_updated', handleCustomUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('siakad_print_security_updated', handleCustomUpdate);
    };
  }, [loadSettings]);

  // 4. Update Security Settings Handler
  const updateSecuritySettings = async (newSettings: Partial<PrintSecuritySettings>): Promise<boolean> => {
    try {
      const updated: PrintSecuritySettings = {
        ...securitySettings,
        ...newSettings,
        updated_at: new Date().toISOString(),
      };

      setSecuritySettings(updated);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('siakad_print_security_updated'));

      // Upsert to Supabase
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          id: DB_SETTING_ID,
          value: updated,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.warn('Upsert to Supabase site_settings failed, using local cache:', error);
      }

      return true;
    } catch (error) {
      console.error('Error updating print security settings:', error);
      return false;
    }
  };

  // 5. Verify Password
  const verifyPassword = (inputPass: string): boolean => {
    const target = (securitySettings.password || 'madrasah123').trim();
    return (inputPass || '').trim() === target;
  };

  // 6. Clear session auth
  const clearSessionAuthorization = () => {
    try {
      sessionStorage.removeItem('siakad_print_authorized');
      sessionStorage.removeItem('siakad_print_auth_time');
    } catch (e) {}
    setIsAuthorized(false);
  };

  // 7. Require Print Auth Core Gatekeeper
  const requirePrintAuth = useCallback((action: () => void, documentTitle?: string) => {
    // A. Jika proteksi tidak diaktifkan oleh admin -> langsung cetak
    if (!securitySettings.is_enabled) {
      action();
      return;
    }

    // B. Jika admin yang sedang login dibebaskan dari password -> langsung cetak
    if (securitySettings.exempt_admin !== false && isAdminLoggedIn) {
      action();
      return;
    }

    // C. Jika user sudah diverifikasi di session saat ini -> langsung cetak
    let hasSessionAuth = false;
    if (securitySettings.allow_session_cache !== false) {
      try {
        hasSessionAuth = sessionStorage.getItem('siakad_print_authorized') === 'true';
      } catch (e) {}
    }

    if (hasSessionAuth || isAuthorized) {
      action();
      return;
    }

    // D. Buka Modal Proteksi Password
    pendingActionRef.current = action;
    setCurrentDocTitle(documentTitle);
    setModalOpen(true);
  }, [securitySettings, isAdminLoggedIn, isAuthorized]);

  const openProtectionDialogManually = (onSuccess: () => void, documentTitle?: string) => {
    pendingActionRef.current = onSuccess;
    setCurrentDocTitle(documentTitle);
    setModalOpen(true);
  };

  const handleModalSuccess = () => {
    setIsAuthorized(true);
    const actionToRun = pendingActionRef.current;
    pendingActionRef.current = null;
    if (actionToRun) {
      actionToRun();
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    pendingActionRef.current = null;
    setCurrentDocTitle(undefined);
  };

  return (
    <PrintSecurityContext.Provider
      value={{
        securitySettings,
        loading,
        isAuthorized,
        isAdminLoggedIn,
        requirePrintAuth,
        verifyPassword,
        updateSecuritySettings,
        clearSessionAuthorization,
        openProtectionDialogManually,
      }}
    >
      {children}
      
      {/* Global Protection Modal */}
      <PrintProtectionModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        onSuccess={handleModalSuccess}
        documentTitle={currentDocTitle}
        securitySettings={securitySettings}
      />
    </PrintSecurityContext.Provider>
  );
};

export const usePrintSecurity = () => {
  const context = useContext(PrintSecurityContext);
  if (!context) {
    throw new Error('usePrintSecurity must be used within a PrintSecurityProvider');
  }
  return context;
};
