"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Users, Plus, Search, Pencil, Trash2, Printer, Download, RefreshCw, 
  Upload, UserCheck, Award, GraduationCap, FileSpreadsheet, ShieldCheck, 
  Filter, CheckCircle, XCircle, Clock, School, Mail, Phone, ImageIcon, UserX, Sparkles, Key, FileText,
  AlertTriangle, AlertCircle, CheckCircle2, Info, ArrowRight, FileCheck, Eye, HelpCircle, Check, RotateCcw
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { MediaLibraryModal } from '@/components/admin/MediaLibraryModal';
import { uploadImageToStorage, formatImageUrl } from '@/utils/imageCompression';
import * as XLSX from 'xlsx';

export interface Teacher {
  id: string;
  nama: string; // Nama Lengkap
  gelar?: string; // Gelar Akademik (e.g. S.Pd.I, M.Pd)
  nik: string; // NIK 16 digit KTP
  nip?: string; // NIP (18 digit jika PNS/PPPK)
  nuptk?: string; // NUPTK (16 digit)
  npk?: string; // NPK Kemenag
  peg_id?: string; // Peg ID Simpatika
  jabatan: string; // Guru Kelas / Guru Mapel / Kepala Madrasah / dll
  status_kepegawaian?: 'PNS' | 'PPPK' | 'GTT / Honorer' | 'GTY / Guru Tetap Yayasan' | 'Staf / Tenaga Kependidikan';
  gender: 'Laki-laki' | 'Perempuan';
  telepon?: string; // No WhatsApp / HP
  email?: string; // Alamat Email
  pendidikan: string; // Pendidikan Terakhir (S1 PAI, S2 Pendidikan, dll)
  sertifikasi: 'Sudah Sertifikasi' | 'Belum Sertifikasi' | 'Dalam Proses';
  no_sertifikat_pendidik?: string;
  mapel_diampu?: string;
  mengajar_kelas?: string; // Kelas yang diajar/diampu (e.g. 'Kelas 1', 'Kelas 1, 2, 3', 'Semua Kelas')
  tempat_lahir?: string;
  tanggal_lahir?: string;
  foto_url?: string;
  status_keaktifan: 'Aktif' | 'Cuti' | 'Non-Aktif';
  tmt_pendidik?: string;
  created_at: string;
}

export interface TeacherImportPreviewItem {
  id: string;
  data: Teacher;
  status: 'NEW' | 'UPDATE' | 'WARNING';
  warnings: string[];
  matchedExistingTeacher?: Teacher;
}

const sampleTeachers: Teacher[] = [
  {
    id: 'g-1',
    nama: 'Ahmad Syafii',
    gelar: 'S.Pd.I, M.Pd',
    nik: '3302151501850001',
    nip: '198501152010011001',
    nuptk: '1234567890123456',
    npk: '987654321012',
    peg_id: '20198501150001',
    jabatan: 'Kepala Madrasah & Guru PAI',
    status_kepegawaian: 'PNS',
    gender: 'Laki-laki',
    telepon: '081234567890',
    email: 'ahmad.syafii@mimaarif.sch.id',
    pendidikan: 'S2 Pendidikan Agama Islam',
    sertifikasi: 'Sudah Sertifikasi',
    no_sertifikat_pendidik: '123456789012',
    mapel_diampu: 'Akidah Akhlak',
    mengajar_kelas: 'Kelas 4, 5, 6',
    tempat_lahir: 'Banyumas',
    tanggal_lahir: '1985-01-15',
    foto_url: '',
    status_keaktifan: 'Aktif',
    tmt_pendidik: '2010-01-01',
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-2',
    nama: 'Siti Nurjanah',
    gelar: 'S.Pd',
    nik: '3302156003900002',
    nip: '199003202015022002',
    nuptk: '8765432109876543',
    npk: '876543210987',
    peg_id: '20199003200002',
    jabatan: 'Guru Kelas I',
    status_kepegawaian: 'PPPK',
    gender: 'Perempuan',
    telepon: '082198765432',
    email: 'siti.nurjanah@mimaarif.sch.id',
    pendidikan: 'S1 PGMI / PGSD',
    sertifikasi: 'Sudah Sertifikasi',
    no_sertifikat_pendidik: '987654321098',
    mapel_diampu: 'Guru Kelas / Tematik',
    mengajar_kelas: 'Kelas 1',
    tempat_lahir: 'Banyumas',
    tanggal_lahir: '1990-03-20',
    foto_url: '',
    status_keaktifan: 'Aktif',
    tmt_pendidik: '2015-02-01',
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-3',
    nama: 'M. Ridwan Kurniawan',
    gelar: 'S.Pd',
    nik: '3302151207930003',
    nip: '199307122019031003',
    nuptk: '5678901234567890',
    npk: '765432109876',
    peg_id: '20199307120003',
    jabatan: 'Guru Mapel Bahasa Arab',
    status_kepegawaian: 'GTY / Guru Tetap Yayasan',
    gender: 'Laki-laki',
    telepon: '085712345678',
    email: 'ridwan.kurniawan@mimaarif.sch.id',
    pendidikan: 'S1 Pendidikan Bahasa Arab',
    sertifikasi: 'Dalam Proses',
    no_sertifikat_pendidik: '',
    mapel_diampu: 'Bahasa Arab & Al-Qur\'an Hadis',
    mengajar_kelas: 'Kelas 1, 2, 3, 4, 5, 6',
    tempat_lahir: 'Purwokerto',
    tanggal_lahir: '1993-07-12',
    foto_url: '',
    status_keaktifan: 'Aktif',
    tmt_pendidik: '2019-03-01',
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-4',
    nama: 'Dewi Rahmawati',
    gelar: 'S.Kom',
    nik: '3302154508950004',
    nip: '-',
    nuptk: '3456789012345678',
    npk: '654321098765',
    peg_id: '20199508050004',
    jabatan: 'Guru TIK & Operator EMIS',
    status_kepegawaian: 'GTT / Honorer',
    gender: 'Perempuan',
    telepon: '088812349999',
    email: 'dewi.rahmawati@mimaarif.sch.id',
    pendidikan: 'S1 Teknik Informatika',
    sertifikasi: 'Belum Sertifikasi',
    no_sertifikat_pendidik: '',
    mapel_diampu: 'Informatika / TIK',
    mengajar_kelas: 'Kelas 4, 5, 6',
    tempat_lahir: 'Cilacap',
    tanggal_lahir: '1995-08-05',
    foto_url: '',
    status_keaktifan: 'Aktif',
    tmt_pendidik: '2021-07-15',
    created_at: new Date().toISOString(),
  },
  {
    id: 'g-5',
    nama: 'Bambang Subagyo',
    gelar: 'S.Pd',
    nik: '3302150211880005',
    nip: '198811022014011005',
    nuptk: '7654321098765432',
    npk: '543210987654',
    peg_id: '20198811020005',
    jabatan: 'Guru PJOK & Pembina Pramuka',
    status_kepegawaian: 'PNS',
    gender: 'Laki-laki',
    telepon: '081398761234',
    email: 'bambang.subagyo@mimaarif.sch.id',
    pendidikan: 'S1 Pendidikan Jasmani (PJOK)',
    sertifikasi: 'Sudah Sertifikasi',
    no_sertifikat_pendidik: '543210987654',
    mapel_diampu: 'PJOK',
    mengajar_kelas: 'Kelas 1, 2, 3, 4, 5, 6',
    tempat_lahir: 'Banyumas',
    tanggal_lahir: '1988-11-02',
    foto_url: '',
    status_keaktifan: 'Aktif',
    tmt_pendidik: '2014-01-01',
    created_at: new Date().toISOString(),
  }
];

const emptyTeacherForm: Omit<Teacher, 'id' | 'created_at'> = {
  nama: '',
  gelar: '',
  nik: '',
  nip: '',
  nuptk: '',
  npk: '',
  peg_id: '',
  jabatan: 'Guru Kelas',
  status_kepegawaian: 'GTY / Guru Tetap Yayasan',
  gender: 'Laki-laki',
  telepon: '',
  email: '',
  pendidikan: 'S1 Pendidikan Agama Islam',
  sertifikasi: 'Belum Sertifikasi',
  no_sertifikat_pendidik: '',
  mapel_diampu: '',
  mengajar_kelas: '',
  tempat_lahir: '',
  tanggal_lahir: '',
  foto_url: '',
  status_keaktifan: 'Aktif',
  tmt_pendidik: '',
};

const TeachersAdmin = () => {
  const { activeMadrasah, activeMadrasahId, getScopedKey } = useMadrasah();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubTab, setActiveSubTab] = useState<'semua' | 'sertifikasi' | 'proses' | 'belum'>('semua');
  const [filterSertifikasi, setFilterSertifikasi] = useState<string>('all');
  const [filterPendidikan, setFilterPendidikan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [formData, setFormData] = useState<Omit<Teacher, 'id' | 'created_at'>>(emptyTeacherForm);
  const [saving, setSaving] = useState(false);
  const [mediaModalOpen, setMediaModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  useEffect(() => {
    fetchTeachers();
  }, [activeMadrasahId]);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const storageKey = getScopedKey('data_guru');
      const scopedCacheKey = `siakad_data_guru_${activeMadrasahId}`;
      const allTeacherKeys = Array.from(new Set([storageKey, 'data_guru', 'siakad_data_guru']));
      
      const { data, error } = await supabase
        .from('site_settings')
        .select('id, value, updated_at')
        .in('id', allTeacherKeys)
        .order('updated_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetchTeachers notice:', error.message || error);
      }

      const dbTeachersRow = Array.isArray(data)
        ? data.find(row => Array.isArray(row.value))
        : null;

      if (dbTeachersRow && Array.isArray(dbTeachersRow.value)) {
        const val = dbTeachersRow.value;
        setTeachers(val);
        try {
          localStorage.setItem(scopedCacheKey, JSON.stringify(val));
          localStorage.setItem('siakad_data_guru', JSON.stringify(val));
          localStorage.setItem(storageKey, JSON.stringify(val));
          localStorage.setItem('data_guru', JSON.stringify(val));
        } catch (e) {
          void e;
        }
        return;
      }

      // Check local storage cache
      const cachedKeys = [scopedCacheKey, storageKey, 'siakad_data_guru', 'data_guru'];
      for (const key of cachedKeys) {
        const cached = localStorage.getItem(key);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              setTeachers(parsed);
              return;
            }
          } catch (e) {
            console.warn('Failed parsing cached teachers:', e);
          }
        }
      }

      // Default fallback if brand new / no DB entry
      setTeachers([]);
    } catch (err) {
      console.warn('Fallback loading teachers:', err);
      const fallbackKeys = [`siakad_data_guru_${activeMadrasahId}`, getScopedKey('data_guru'), 'siakad_data_guru', 'data_guru'];
      for (const key of fallbackKeys) {
        const cached = localStorage.getItem(key);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              setTeachers(parsed);
              return;
            }
          } catch (e) {
            // ignore
          }
        }
      }
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const saveTeachersToDb = async (updatedList: Teacher[]) => {
    const storageKey = getScopedKey('data_guru');
    const scopedCacheKey = `siakad_data_guru_${activeMadrasahId}`;
    const now = new Date().toISOString();

    try { localStorage.setItem(scopedCacheKey, JSON.stringify(updatedList)); } catch (err) { void err; }
    try { localStorage.setItem('siakad_data_guru', JSON.stringify(updatedList)); } catch (err) { void err; }
    try { localStorage.setItem(storageKey, JSON.stringify(updatedList)); } catch (err) { void err; }
    try { localStorage.setItem('data_guru', JSON.stringify(updatedList)); } catch (err) { void err; }

    try {
      await supabase
        .from('site_settings')
        .upsert({
          id: storageKey,
          value: updatedList,
          updated_at: now
        });
      await supabase
        .from('site_settings')
        .upsert({
          id: 'data_guru',
          value: updatedList,
          updated_at: now
        });
    } catch (e) {
      console.warn('Failed to upsert teachers:', e);
    }

    window.dispatchEvent(new CustomEvent('siakad_teachers_updated'));
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'preview'>('upload');
  const [importPreviewList, setImportPreviewList] = useState<TeacherImportPreviewItem[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importMergeMode, setImportMergeMode] = useState<'merge_update' | 'insert_only' | 'overwrite_all'>('merge_update');
  const [importSearchFilter, setImportSearchFilter] = useState('');
  const [importStatusFilter, setImportStatusFilter] = useState<'all' | 'new' | 'update' | 'warning'>('all');
  const [isImporting, setIsImporting] = useState(false);

  const previewStats = useMemo(() => {
    const total = importPreviewList.length;
    const newItems = importPreviewList.filter(i => i.status === 'NEW').length;
    const updateItems = importPreviewList.filter(i => i.status === 'UPDATE').length;
    const warningItems = importPreviewList.filter(i => i.warnings.length > 0 && i.status !== 'UPDATE').length;
    const allWithWarnings = importPreviewList.filter(i => i.warnings.length > 0).length;
    return { total, newItems, updateItems, warningItems, allWithWarnings };
  }, [importPreviewList]);

  const filteredPreviewList = useMemo(() => {
    return importPreviewList.filter(item => {
      // Status filter
      if (importStatusFilter === 'new' && item.status !== 'NEW') return false;
      if (importStatusFilter === 'update' && item.status !== 'UPDATE') return false;
      if (importStatusFilter === 'warning' && item.warnings.length === 0) return false;

      // Search filter
      if (importSearchFilter.trim()) {
        const q = importSearchFilter.toLowerCase();
        const nama = (item.data.nama || '').toLowerCase();
        const nik = (item.data.nik || '').toLowerCase();
        const nip = (item.data.nip || '').toLowerCase();
        const nuptk = (item.data.nuptk || '').toLowerCase();
        const npk = (item.data.npk || '').toLowerCase();
        const jabatan = (item.data.jabatan || '').toLowerCase();
        const statusPeg = (item.data.status_kepegawaian || '').toLowerCase();
        const mapel = (item.data.mapel_diampu || '').toLowerCase();
        return (
          nama.includes(q) ||
          nik.includes(q) ||
          nip.includes(q) ||
          nuptk.includes(q) ||
          npk.includes(q) ||
          jabatan.includes(q) ||
          statusPeg.includes(q) ||
          mapel.includes(q)
        );
      }
      return true;
    });
  }, [importPreviewList, importStatusFilter, importSearchFilter]);

  const handleOpenAdd = () => {
    setEditingTeacher(null);
    setFormData(emptyTeacherForm);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setFormData({
      nama: teacher.nama,
      gelar: teacher.gelar || '',
      nik: teacher.nik || '',
      nip: teacher.nip || '',
      nuptk: teacher.nuptk || '',
      npk: teacher.npk || '',
      peg_id: teacher.peg_id || '',
      jabatan: teacher.jabatan || 'Guru Kelas',
      status_kepegawaian: teacher.status_kepegawaian || 'GTY / Guru Tetap Yayasan',
      gender: teacher.gender || 'Laki-laki',
      telepon: teacher.telepon || '',
      email: teacher.email || '',
      pendidikan: teacher.pendidikan || 'S1 Pendidikan Agama Islam',
      sertifikasi: teacher.sertifikasi || 'Belum Sertifikasi',
      no_sertifikat_pendidik: teacher.no_sertifikat_pendidik || '',
      mapel_diampu: teacher.mapel_diampu || '',
      mengajar_kelas: teacher.mengajar_kelas || '',
      tempat_lahir: teacher.tempat_lahir || '',
      tanggal_lahir: teacher.tanggal_lahir || '',
      foto_url: teacher.foto_url || '',
      status_keaktifan: teacher.status_keaktifan || 'Aktif',
      tmt_pendidik: teacher.tmt_pendidik || '',
    });
    setIsModalOpen(true);
  };

  const handlePromptDeleteTeacher = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setDeleteModalOpen(true);
  };

  const handleConfirmDeleteTeacher = async () => {
    if (!teacherToDelete) return;
    const targetId = teacherToDelete.id;
    const targetName = teacherToDelete.nama;

    try {
      setSaving(true);
      const updated = teachers.filter(t => t.id !== targetId);
      setTeachers(updated);
      await saveTeachersToDb(updated);
      showSuccess(`Data GTK "${targetName}" berhasil dihapus.`);
      setDeleteModalOpen(false);
      setTeacherToDelete(null);
    } catch (err: any) {
      console.error('Delete error:', err);
      showError('Gagal menghapus data GTK.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      showError('Nama guru wajib diisi!');
      return;
    }

    setSaving(true);
    try {
      let updatedList: Teacher[] = [];
      if (editingTeacher) {
        updatedList = teachers.map(t => t.id === editingTeacher.id ? { ...t, ...formData } : t);
        showSuccess('Data guru berhasil diperbarui!');
      } else {
        const newTeacher: Teacher = {
          id: 'guru-' + Date.now(),
          ...formData,
          created_at: new Date().toISOString(),
        };
        updatedList = [newTeacher, ...teachers];
        showSuccess('Guru baru berhasil ditambahkan!');
      }

      setTeachers(updatedList);
      await saveTeachersToDb(updatedList);
      setIsModalOpen(false);
    } catch (err: any) {
      showError(err.message || 'Gagal menyimpan data guru.');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadImageToStorage(file, 'guru');
      setFormData(prev => ({ ...prev, foto_url: url }));
      showSuccess('Foto guru berhasil diunggah!');
    } catch (err: any) {
      showError(err.message || 'Gagal unggah foto');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSeedSamples = async () => {
    if (window.confirm('Muat ulang sample data guru default?')) {
      setTeachers(sampleTeachers);
      await saveTeachersToDb(sampleTeachers);
      showSuccess('Sample data guru berhasil dimuat!');
    }
  };

  // Filtered teachers list
  const filteredTeachers = useMemo(() => {
    return teachers.filter(t => {
      const matchesSearch = 
        t.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.nip.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.nik.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.jabatan.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSertifikasi = 
        filterSertifikasi === 'all' || t.sertifikasi === filterSertifikasi;

      const matchesPendidikan = 
        filterPendidikan === 'all' || t.pendidikan.toLowerCase().includes(filterPendidikan.toLowerCase());

      const matchesStatus = 
        filterStatus === 'all' || t.status_keaktifan === filterStatus;

      return matchesSearch && matchesSertifikasi && matchesPendidikan && matchesStatus;
    });
  }, [teachers, searchQuery, filterSertifikasi, filterPendidikan, filterStatus]);

  // Stats calculation
  const stats = useMemo(() => {
    const total = teachers.length;
    const certified = teachers.filter(t => t.sertifikasi === 'Sudah Sertifikasi').length;
    const process = teachers.filter(t => t.sertifikasi === 'Dalam Proses').length;
    const notCertified = teachers.filter(t => t.sertifikasi === 'Belum Sertifikasi').length;
    const male = teachers.filter(t => t.gender === 'Laki-laki').length;
    const female = teachers.filter(t => t.gender === 'Perempuan').length;
    const percentCertified = total > 0 ? Math.round((certified / total) * 100) : 0;

    return { total, certified, process, notCertified, male, female, percentCertified };
  }, [teachers]);

  const handlePrint = () => {
    window.print();
  };

  // Download Excel Template for GTK
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Nama Lengkap': 'Ahmad Fauzi',
        'Gelar': 'S.Pd.I, M.Pd',
        'NIK': '3302151234560001',
        'NIP': '198501152010011001',
        'NUPTK': '1234567890123456',
        'NPK Kemenag': '987654321012',
        'Peg ID Simpatika': '20198501150001',
        'Jabatan': 'Guru Kelas IV',
        'Status Kepegawaian': 'PNS',
        'Jenis Kelamin': 'Laki-laki',
        'No WhatsApp': '081234567890',
        'Email': 'fauzi@madrasah.sch.id',
        'Pendidikan Terakhir': 'S2 Pendidikan Agama Islam',
        'Status Sertifikasi': 'Sudah Sertifikasi',
        'No Sertifikat Pendidik': '123456789012',
        'Mapel Diampu': 'Tematik / PAI',
        'Mengajar Kelas': 'Kelas 4',
        'Status Keaktifan': 'Aktif',
        'Tempat Lahir': 'Banyumas',
        'Tanggal Lahir (YYYY-MM-DD)': '1985-01-15'
      },
      {
        'Nama Lengkap': 'Siti Maryam',
        'Gelar': 'S.Pd',
        'NIK': '3302156543210002',
        'NIP': '-',
        'NUPTK': '8765432109876543',
        'NPK Kemenag': '876543210987',
        'Peg ID Simpatika': '20199003200002',
        'Jabatan': 'Guru Mapel Bahasa Arab',
        'Status Kepegawaian': 'GTY / Guru Tetap Yayasan',
        'Jenis Kelamin': 'Perempuan',
        'No WhatsApp': '085712345678',
        'Email': 'maryam@madrasah.sch.id',
        'Pendidikan Terakhir': 'S1 Pendidikan Bahasa Arab',
        'Status Sertifikasi': 'Dalam Proses',
        'No Sertifikat Pendidik': '',
        'Mapel Diampu': 'Bahasa Arab',
        'Mengajar Kelas': 'Kelas 1, 2, 3, 4, 5, 6',
        'Status Keaktifan': 'Aktif',
        'Tempat Lahir': 'Purwokerto',
        'Tanggal Lahir (YYYY-MM-DD)': '1992-05-20'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Format_Import_Guru');

    // Auto width for columns
    worksheet['!cols'] = [
      { wch: 24 }, // Nama Lengkap
      { wch: 14 }, // Gelar
      { wch: 20 }, // NIK
      { wch: 22 }, // NIP
      { wch: 20 }, // NUPTK
      { wch: 16 }, // NPK Kemenag
      { wch: 18 }, // Peg ID Simpatika
      { wch: 24 }, // Jabatan
      { wch: 22 }, // Status Kepegawaian
      { wch: 14 }, // Jenis Kelamin
      { wch: 16 }, // No WhatsApp
      { wch: 26 }, // Email
      { wch: 25 }, // Pendidikan Terakhir
      { wch: 20 }, // Status Sertifikasi
      { wch: 22 }, // No Sertifikat Pendidik
      { wch: 22 }, // Mapel Diampu
      { wch: 18 }, // Mengajar Kelas
      { wch: 16 }, // Status Keaktifan
      { wch: 16 }, // Tempat Lahir
      { wch: 24 }, // Tanggal Lahir
    ];

    XLSX.writeFile(workbook, `Template_Data_Guru_GTK_${activeMadrasah.nama_madrasah || 'Madrasah'}.xlsx`);
    showSuccess('Template Excel Data Guru & GTK berhasil diunduh!');
  };

  // Export Teachers to Real Excel (.xlsx) & CSV
  const handleExportExcel = () => {
    if (teachers.length === 0) {
      showError('Belum ada data guru untuk diexport!');
      return;
    }

    const exportRows = filteredTeachers.map((t, idx) => ({
      'No': idx + 1,
      'Nama Lengkap': t.nama || '',
      'Gelar': t.gelar || '',
      'NIK': t.nik || '',
      'NIP': t.nip || '',
      'NUPTK': t.nuptk || '',
      'NPK Kemenag': t.npk || '',
      'Peg ID Simpatika': t.peg_id || '',
      'Jabatan': t.jabatan || '',
      'Status Kepegawaian': t.status_kepegawaian || '',
      'Jenis Kelamin': t.gender || '',
      'No WhatsApp / Telepon': t.telepon || '',
      'Email': t.email || '',
      'Pendidikan Terakhir': t.pendidikan || '',
      'Status Sertifikasi': t.sertifikasi || '',
      'No. Sertifikat Pendidik': t.no_sertifikat_pendidik || '',
      'Mata Pelajaran Diampu': t.mapel_diampu || '',
      'Mengajar Kelas': t.mengajar_kelas || '',
      'Status Keaktifan': t.status_keaktifan || 'Aktif',
      'Tempat Lahir': t.tempat_lahir || '',
      'Tanggal Lahir': t.tanggal_lahir || '',
      'TMT Pendidik': t.tmt_pendidik || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data_GTK');

    XLSX.writeFile(workbook, `Data_Guru_GTK_${activeMadrasah.nama_madrasah || 'Madrasah'}.xlsx`);
    showSuccess('Data Guru berhasil diexport ke Excel (.xlsx)!');
  };

  // Import Guru from Excel with Preview & Warning
  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const data = new Uint8Array(arrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, cellNF: true, cellText: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Read both formatted and raw values to prevent data loss on 16-digit numbers
        const formattedRows: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { raw: true, defval: '' });

        if (!formattedRows || formattedRows.length === 0) {
          showError('File excel kosong atau format tidak sesuai!');
          return;
        }

        const previewItems: TeacherImportPreviewItem[] = [];
        const seenNiksInFile = new Set<string>();
        const seenNamesInFile = new Set<string>();

        // Helper to normalize and convert 16-digit numbers or scientific notations
        const cleanNumberField = (val: any): string => {
          if (val === undefined || val === null) return '';
          let str = String(val).trim();
          if (str.startsWith("'")) str = str.substring(1).trim();
          
          // Scientific notation check e.g. 3.30215E+15 or 3.302151234560001e+15
          if (/^[0-9]+(\.[0-9]+)?[eE][\+\-]?[0-9]+$/.test(str)) {
            try {
              str = BigInt(Math.round(Number(str))).toString();
            } catch {
              str = Number(str).toLocaleString('fullwide', { useGrouping: false });
            }
          }
          // Remove decimal trailing zeros e.g. 3302151234560001.0
          if (/^\d+\.0+$/.test(str)) {
            str = str.split('.')[0];
          }
          // Strip unwanted spaces/dashes if it's an ID number formatted with separators
          const digitsOnly = str.replace(/[^0-9]/g, '');
          if (digitsOnly.length >= 10 && digitsOnly.length <= 25 && (str.includes('-') || str.includes(' '))) {
            str = digitsOnly;
          }
          return str;
        };

        formattedRows.forEach((row, idx) => {
          const rawRow = rawRows[idx] || {};
          const allKeys = Array.from(new Set([...Object.keys(row), ...Object.keys(rawRow)]));

          // Robust column value getter
          const getVal = (aliases: string[], isNumericField = false): string => {
            const cleanAliases = aliases.map(a => a.trim().toLowerCase().replace(/[^a-z0-9]/g, ''));

            // Step 1: Exact matching first (highest priority)
            for (const key of allKeys) {
              const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
              // Ignore row sequence number columns (No, Nomor, No Urut) unless specifically searching for 'no'
              if (['no', 'nomor', 'nourut', 'urut', 'nr', 'seq'].includes(cleanKey) && !cleanAliases.includes('no') && !cleanAliases.includes('nourut')) {
                continue;
              }

              if (cleanAliases.includes(cleanKey)) {
                const rawVal = rawRow[key];
                const formVal = row[key];
                let chosenVal = '';
                if (isNumericField && rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
                  chosenVal = cleanNumberField(rawVal);
                } else if (formVal !== undefined && formVal !== null && String(formVal).trim() !== '') {
                  chosenVal = isNumericField ? cleanNumberField(formVal) : String(formVal).trim();
                } else if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
                  chosenVal = isNumericField ? cleanNumberField(rawVal) : String(rawVal).trim();
                }
                if (chosenVal !== '') return chosenVal;
              }
            }

            // Step 2: Fuzzy matching (cleanKey contains alias keyword, min length 3)
            for (const key of allKeys) {
              const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
              if (['no', 'nomor', 'nourut', 'urut', 'nr', 'seq', 'id'].includes(cleanKey)) {
                continue;
              }

              const matched = cleanAliases.some(alias => alias.length >= 3 && cleanKey.includes(alias));
              if (matched) {
                const rawVal = rawRow[key];
                const formVal = row[key];
                let chosenVal = '';
                if (isNumericField && rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
                  chosenVal = cleanNumberField(rawVal);
                } else if (formVal !== undefined && formVal !== null && String(formVal).trim() !== '') {
                  chosenVal = isNumericField ? cleanNumberField(formVal) : String(formVal).trim();
                } else if (rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '') {
                  chosenVal = isNumericField ? cleanNumberField(rawVal) : String(rawVal).trim();
                }
                if (chosenVal !== '') return chosenVal;
              }
            }

            return '';
          };

          const nama = getVal(['Nama Lengkap', 'Nama', 'nama_lengkap', 'nama guru', 'Nama Pendidik', 'Nama Guru / GTK', 'namagtk', 'namaptk']);
          if (!nama) return; // Skip rows without name

          const gelar = getVal(['Gelar', 'Gelar Akademik', 'gelar']);
          
          // Enhanced NIK extraction
          const nikRaw = getVal([
            'NIK', 'No KTP', 'Nomor Induk Kependudukan', 'NIK KTP', 'No. KTP', 'Nomor KTP', 
            'nik', 'NIK (16 Digit)', 'NIK 16 Digit', 'NIK GTK', 'NIK Guru', 'NIK Pendidik',
            'No. Induk Kependudukan', 'No Induk Kependudukan', 'KTP', 'No Identitas', 'Nomor Identitas'
          ], true);
          
          let nik = nikRaw;
          if (!nik || nik === '0000000000000000') {
            nik = '-';
          }

          const nip = getVal(['NIP', 'nip', 'NIP / NPK', 'NIP/NPK', 'Nomor Induk Pegawai', 'No. NIP'], true) || '-';
          const nuptk = getVal(['NUPTK', 'nuptk', 'No NUPTK', 'No. NUPTK', 'Nomor NUPTK'], true);
          const npk = getVal(['NPK Kemenag', 'NPK', 'npk', 'NPK Madrasah', 'No NPK', 'No. NPK', 'Nomor NPK'], true);
          const peg_id = getVal(['Peg ID Simpatika', 'Peg ID', 'PegID', 'Simpatika ID', 'peg_id', 'id simpatika', 'Peg. ID', 'Peg_ID'], true);
          const jabatan = getVal(['Jabatan', 'Jabatan Guru', 'jabatan guru kelas / mapel', 'jabatan', 'Tugas', 'Tugas Utama', 'Jabatan / Tugas']) || 'Guru Kelas';
          
          let status_kepegawaian: any = getVal(['Status Kepegawaian', 'Status Pegawai', 'Status Guru', 'status_kepegawaian', 'Status']);
          if (status_kepegawaian) {
            const low = status_kepegawaian.toLowerCase();
            if (low.includes('pns')) status_kepegawaian = 'PNS';
            else if (low.includes('pppk')) status_kepegawaian = 'PPPK';
            else if (low.includes('gtt') || low.includes('honorer')) status_kepegawaian = 'GTT / Honorer';
            else if (low.includes('gty') || low.includes('tetap')) status_kepegawaian = 'GTY / Guru Tetap Yayasan';
            else if (low.includes('staf') || low.includes('tu') || low.includes('tendik')) status_kepegawaian = 'Staf / Tenaga Kependidikan';
          } else {
            status_kepegawaian = 'GTY / Guru Tetap Yayasan';
          }

          let gender: 'Laki-laki' | 'Perempuan' = 'Laki-laki';
          const rawGender = getVal(['Jenis Kelamin', 'JK', 'Gender', 'L/P', 'jenis_kelamin', 'Sex']).toLowerCase();
          if (rawGender === 'p' || rawGender.includes('perempuan') || rawGender.includes('wanita') || rawGender === 'f' || rawGender.includes('female')) {
            gender = 'Perempuan';
          } else {
            gender = 'Laki-laki';
          }

          const telepon = getVal(['No WhatsApp', 'No WA', 'Nomor WA', 'No HP', 'Telepon', 'no whatsapp', 'no_hp', 'telepon', 'No. WhatsApp', 'No. WA', 'No. HP', 'Handphone'], true);
          const email = getVal(['Email', 'Alamat Email', 'E-mail', 'email', 'Surel']);
          const pendidikan = getVal(['Pendidikan Terakhir', 'Pendidikan', 'Kualifikasi', 'pendidikan', 'Jenjang Pendidikan', 'Ijazah Terakhir']) || 'S1 Pendidikan Agama Islam';
          
          let sertifikasi: 'Sudah Sertifikasi' | 'Belum Sertifikasi' | 'Dalam Proses' = 'Belum Sertifikasi';
          const rawSertis = getVal(['Status Sertifikasi', 'Sertifikasi', 'sertifikasi', 'Status Sertifikat']).toLowerCase();
          if (rawSertis.includes('sudah') || rawSertis.includes('lulus') || rawSertis.includes('ya') || rawSertis.includes('terverifikasi')) {
            sertifikasi = 'Sudah Sertifikasi';
          } else if (rawSertis.includes('proses') || rawSertis.includes('ppg') || rawSertis.includes('antrean')) {
            sertifikasi = 'Dalam Proses';
          }

          const no_sertifikat_pendidik = getVal(['No Sertifikat Pendidik', 'No Sertifikat', 'Sertifikat Pendidik', 'no_sertifikat_pendidik', 'No. Sertifikat Pendidik', 'No. Sertifikat'], true);
          const mapel_diampu = getVal(['Mapel Diampu', 'Mata Pelajaran', 'Mapel', 'mapel_diampu', 'Mata Pelajaran Diampu', 'Mata Pelajaran yang Diampu', 'Bidang Studi']);
          const mengajar_kelas = getVal(['Mengajar Kelas', 'Rombel', 'Kelas Diampu', 'mengajar_kelas', 'Kelas', 'Tingkat Kelas', 'Tugas Mengajar']);
          
          let status_keaktifan: 'Aktif' | 'Cuti' | 'Non-Aktif' = 'Aktif';
          const rawStatus = getVal(['Status Keaktifan', 'Status Keaktifan Guru', 'status_keaktifan']).toLowerCase();
          if (rawStatus.includes('cuti')) status_keaktifan = 'Cuti';
          else if (rawStatus.includes('non') || rawStatus.includes('keluar') || rawStatus.includes('pensiun') || rawStatus.includes('pindah')) status_keaktifan = 'Non-Aktif';

          const tempat_lahir = getVal(['Tempat Lahir', 'tempat_lahir', 'Tempat Lahir Guru']);
          const tanggal_lahir = getVal(['Tanggal Lahir (YYYY-MM-DD)', 'Tanggal Lahir', 'tanggal_lahir', 'Tgl Lahir', 'Tgl. Lahir']);
          const tmt_pendidik = getVal(['TMT Pendidik', 'TMT', 'tmt_pendidik', 'TMT Guru']);

          // Check if teacher already exists in database
          const matchedExisting = teachers.find(t => 
            (nik && nik !== '-' && nik !== '0000000000000000' && t.nik === nik) ||
            (nip && nip !== '-' && nip !== '' && t.nip === nip) ||
            (t.nama.toLowerCase().trim() === nama.toLowerCase().trim())
          );

          // Warnings collection
          const warnings: string[] = [];

          // NIK Validation
          if (!nik || nik === '-' || nik === '0000000000000000') {
            warnings.push('NIK tidak diisi / kosong');
          } else if (nik.length !== 16 || !/^\d+$/.test(nik)) {
            warnings.push(`NIK tidak sesuai standar 16 digit (${nik})`);
          }

          // NIP Validation for PNS / PPPK
          if ((status_kepegawaian === 'PNS' || status_kepegawaian === 'PPPK') && (!nip || nip === '-')) {
            warnings.push(`Status ${status_kepegawaian} namun NIP belum terisi`);
          }

          // WhatsApp Phone Check
          if (!telepon || telepon === '-') {
            warnings.push('Nomor WhatsApp belum diisi');
          }

          // Check duplicate in the same file
          const nameKey = nama.toLowerCase().trim();
          if (seenNamesInFile.has(nameKey)) {
            warnings.push('Nama guru terduplikasi di dalam berkas Excel ini');
          } else {
            seenNamesInFile.add(nameKey);
          }

          if (nik && nik !== '-' && nik !== '0000000000000000') {
            if (seenNiksInFile.has(nik)) {
              warnings.push('NIK terduplikasi di dalam berkas Excel ini');
            } else {
              seenNiksInFile.add(nik);
            }
          }

          let itemStatus: 'NEW' | 'UPDATE' | 'WARNING' = 'NEW';
          if (matchedExisting) {
            itemStatus = 'UPDATE';
            warnings.push(`Data guru sudah terdaftar di sistem (akan diselaraskan)`);
          } else if (warnings.length > 0 && (!nik || nik === '-' || nik.length !== 16)) {
            itemStatus = 'WARNING';
          }

          const teacherRecord: Teacher = {
            id: matchedExisting ? matchedExisting.id : `guru-imp-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
            nama,
            gelar,
            nik,
            nip,
            nuptk,
            npk,
            peg_id,
            jabatan,
            status_kepegawaian,
            gender,
            telepon,
            email,
            pendidikan,
            sertifikasi,
            no_sertifikat_pendidik,
            mapel_diampu,
            mengajar_kelas,
            status_keaktifan,
            tempat_lahir,
            tanggal_lahir,
            tmt_pendidik,
            foto_url: matchedExisting ? matchedExisting.foto_url : '',
            created_at: matchedExisting ? matchedExisting.created_at : new Date().toISOString(),
          };

          previewItems.push({
            id: `prev-${idx}-${Date.now()}`,
            data: teacherRecord,
            status: itemStatus,
            warnings,
            matchedExistingTeacher: matchedExisting
          });
        });

        if (previewItems.length === 0) {
          showError('Tidak ada data guru yang valid dalam file Excel.');
          return;
        }

        setImportPreviewList(previewItems);
        setImportStep('preview');
        setImportStatusFilter('all');
        setImportSearchFilter('');
      } catch (err: any) {
        console.error('Import error:', err);
        showError('Gagal membaca file Excel. ' + (err.message || ''));
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Confirm Import & Save
  const handleConfirmImport = async () => {
    if (importPreviewList.length === 0) return;

    setIsImporting(true);
    try {
      let finalTeacherList: Teacher[] = [];

      if (importMergeMode === 'overwrite_all') {
        finalTeacherList = importPreviewList.map(item => item.data);
      } else if (importMergeMode === 'insert_only') {
        const newOnly = importPreviewList
          .filter(item => item.status === 'NEW' || item.status === 'WARNING')
          .filter(item => !item.matchedExistingTeacher)
          .map(item => item.data);
        finalTeacherList = [...teachers, ...newOnly];
      } else {
        // merge_update (default)
        const updated = [...teachers];
        for (const item of importPreviewList) {
          if (item.matchedExistingTeacher) {
            const idx = updated.findIndex(t => t.id === item.matchedExistingTeacher?.id);
            if (idx >= 0) {
              updated[idx] = {
                ...item.data,
                id: item.matchedExistingTeacher.id,
                foto_url: item.matchedExistingTeacher.foto_url || item.data.foto_url,
                created_at: item.matchedExistingTeacher.created_at || item.data.created_at
              };
            }
          } else {
            updated.push(item.data);
          }
        }
        finalTeacherList = updated;
      }

      setTeachers(finalTeacherList);
      await saveTeachersToDb(finalTeacherList);

      const addedCount = importPreviewList.filter(i => !i.matchedExistingTeacher).length;
      const updatedCount = importPreviewList.filter(i => !!i.matchedExistingTeacher).length;

      showSuccess(`Berhasil memproses data guru! (+${addedCount} baru, ↻${updatedCount} diselaraskan)`);
      setImportModalOpen(false);
      setImportStep('upload');
      setImportPreviewList([]);
    } catch (err: any) {
      console.error('Save import error:', err);
      showError('Gagal menyimpan data import: ' + (err.message || ''));
    } finally {
      setIsImporting(false);
    }
  };

  const handleResetImport = () => {
    setImportStep('upload');
    setImportPreviewList([]);
    setImportFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExportCSV = () => {
    handleExportExcel();
  };

  return (
    <AdminLayout title="Daftar Guru & GTK">
      {/* Printable Area for Formal GTK Report */}
      <div className="hidden print:block font-serif text-black p-6 space-y-4">
        <div className="text-center border-b-2 border-black pb-3 mb-4">
          <h2 className="text-lg font-bold uppercase">DAFTAR PENDIDIK & TENAGA KEPENDIDIKAN (GTK)</h2>
          <h1 className="text-xl font-black uppercase text-emerald-950">{activeMadrasah.nama_madrasah || "MADRASAH IBTIDAIYAH"}</h1>
          <p className="text-xs italic mt-0.5">
            NSM: {activeMadrasah.nsm || '-'} | NPSN: {activeMadrasah.npsn || '-'} | {activeMadrasah.alamat}
          </p>
        </div>

        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-gray-200 text-center font-bold">
              <th className="border border-black p-2 w-10">NO</th>
              <th className="border border-black p-2 text-left">NAMA LENGKAP & GELAR</th>
              <th className="border border-black p-2">NIP / NPK</th>
              <th className="border border-black p-2">NIK</th>
              <th className="border border-black p-2">PENDIDIKAN</th>
              <th className="border border-black p-2">SERTIFIKASI</th>
              <th className="border border-black p-2 text-left">JABATAN / MAPEL</th>
              <th className="border border-black p-2 text-center">MENGAJAR KELAS</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.map((t, idx) => (
              <tr key={t.id} className="text-center">
                <td className="border border-black p-2 font-bold">{idx + 1}</td>
                <td className="border border-black p-2 text-left font-bold">{t.nama}</td>
                <td className="border border-black p-2 font-mono">{t.nip || '-'}</td>
                <td className="border border-black p-2 font-mono">{t.nik || '-'}</td>
                <td className="border border-black p-2">{t.pendidikan}</td>
                <td className="border border-black p-2 font-bold">{t.sertifikasi}</td>
                <td className="border border-black p-2 text-left">{t.jabatan} {t.mapel_diampu ? `(${t.mapel_diampu})` : ''}</td>
                <td className="border border-black p-2 font-bold">{t.mengajar_kelas || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-10 flex justify-between text-xs px-6">
          <div></div>
          <div className="text-center">
            <p>Dicetak Pada: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            <p className="font-bold mt-1">Kepala Madrasah</p>
            <div className="h-16"></div>
            <p className="font-bold underline">{activeMadrasah.nama_pimpinan || 'Kepala Madrasah'}</p>
            <p>NIP. {activeMadrasah.nip_pimpinan || '-'}</p>
          </div>
        </div>
      </div>

      {/* Main Admin UI */}
      <div className="print:hidden space-y-6">
        {/* Header Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-6 rounded-3xl shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-emerald-400 text-emerald-950 font-extrabold uppercase px-2.5 py-0.5 rounded-full text-[10px]">
                Pendataan GTK Madrasah
              </Badge>
              <Badge variant="outline" className="text-emerald-200 border-emerald-400/30 text-[10px]">
                Total: {stats.total} Orang
              </Badge>
            </div>
            <h1 className="text-xl md:text-2xl font-black mt-1 text-white">Modul Data Guru & Tenaga Kependidikan</h1>
            <p className="text-xs text-emerald-100/80 mt-1">
              Manajemen lengkap biodata guru, NIP, NIK, kualifikasi pendidikan, dan status sertifikasi pendidik.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => window.location.href = '/admin/ruang-guru'}
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-2xl gap-1.5 shadow-md px-3.5 text-xs"
            >
              <Key className="w-3.5 h-3.5 text-slate-950" /> Pusat Kendali Ruang Guru
            </Button>
            <Button
              onClick={() => setImportModalOpen(true)}
              variant="outline"
              size="sm"
              className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-400/40 rounded-2xl gap-1.5 text-xs font-bold shadow-sm"
            >
              <Upload className="w-3.5 h-3.5 text-amber-300" /> Unggah Excel
            </Button>
            <Button
              onClick={handleExportExcel}
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl gap-1.5 text-xs font-bold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-300" /> Unduh / Export Excel
            </Button>
            <Button
              onClick={handleSeedSamples}
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl gap-1.5 text-xs font-bold"
            >
              <RefreshCw className="w-3.5 h-3.5 text-emerald-300" /> Reset Sample
            </Button>
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-2xl gap-1.5 text-xs font-bold"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-300" /> Cetak GTK
            </Button>
            <Button
              onClick={handleOpenAdd}
              size="sm"
              className="bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black rounded-2xl gap-1.5 shadow-lg px-4 text-xs"
            >
              <Plus className="w-4 h-4" /> Tambah Guru Baru
            </Button>
          </div>
        </div>

        {/* Horizontal Iconic Sub-Menu Bar */}
        <div className="bg-white p-3 rounded-3xl shadow-md border border-slate-200/80">
          <div className="flex flex-row items-center overflow-x-auto bg-slate-100/90 p-1.5 rounded-2xl gap-1.5 scrollbar-none">
            <button
              onClick={() => { setActiveSubTab('semua'); setFilterSertifikasi('all'); }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs transition-all whitespace-nowrap shrink-0 ${
                activeSubTab === 'semua' && filterSertifikasi === 'all'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-[1.02]' 
                  : 'text-slate-600 hover:text-emerald-700 hover:bg-white/60'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${activeSubTab === 'semua' && filterSertifikasi === 'all' ? 'bg-white/20' : 'bg-emerald-100 text-emerald-700'}`}>
                <Users className="w-4 h-4" />
              </div>
              <span>Semua Data GTK</span>
              <Badge className={`ml-0.5 border-0 text-[10px] font-black ${activeSubTab === 'semua' && filterSertifikasi === 'all' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
                {stats.total}
              </Badge>
            </button>

            <button
              onClick={() => { setActiveSubTab('sertifikasi'); setFilterSertifikasi('Sudah Sertifikasi'); }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs transition-all whitespace-nowrap shrink-0 ${
                activeSubTab === 'sertifikasi' || filterSertifikasi === 'Sudah Sertifikasi'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20 scale-[1.02]' 
                  : 'text-slate-600 hover:text-teal-700 hover:bg-white/60'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${activeSubTab === 'sertifikasi' || filterSertifikasi === 'Sudah Sertifikasi' ? 'bg-white/20' : 'bg-teal-100 text-teal-700'}`}>
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span>Sudah Sertifikasi</span>
              <Badge className={`ml-0.5 border-0 text-[10px] font-black ${activeSubTab === 'sertifikasi' || filterSertifikasi === 'Sudah Sertifikasi' ? 'bg-white/20 text-white' : 'bg-teal-100 text-teal-800'}`}>
                {stats.certified}
              </Badge>
            </button>

            <button
              onClick={() => { setActiveSubTab('proses'); setFilterSertifikasi('Dalam Proses'); }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs transition-all whitespace-nowrap shrink-0 ${
                activeSubTab === 'proses' || filterSertifikasi === 'Dalam Proses'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20 scale-[1.02]' 
                  : 'text-slate-600 hover:text-amber-700 hover:bg-white/60'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${activeSubTab === 'proses' || filterSertifikasi === 'Dalam Proses' ? 'bg-white/20' : 'bg-amber-100 text-amber-700'}`}>
                <Clock className="w-4 h-4" />
              </div>
              <span>Dalam Proses PPG</span>
              <Badge className={`ml-0.5 border-0 text-[10px] font-black ${activeSubTab === 'proses' || filterSertifikasi === 'Dalam Proses' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {stats.process}
              </Badge>
            </button>

            <button
              onClick={() => { setActiveSubTab('belum'); setFilterSertifikasi('Belum Sertifikasi'); }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-black text-xs transition-all whitespace-nowrap shrink-0 ${
                activeSubTab === 'belum' || filterSertifikasi === 'Belum Sertifikasi'
                  ? 'bg-slate-700 text-white shadow-md shadow-slate-700/20 scale-[1.02]' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              <div className={`p-1.5 rounded-lg ${activeSubTab === 'belum' || filterSertifikasi === 'Belum Sertifikasi' ? 'bg-white/20' : 'bg-slate-200 text-slate-700'}`}>
                <GraduationCap className="w-4 h-4" />
              </div>
              <span>Belum Sertifikasi</span>
              <Badge className={`ml-0.5 border-0 text-[10px] font-black ${activeSubTab === 'belum' || filterSertifikasi === 'Belum Sertifikasi' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'}`}>
                {stats.notCertified}
              </Badge>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-0 shadow-md rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-slate-500 uppercase">Total Guru & GTK</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{stats.total}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">{stats.male} Laki-laki • {stats.female} Perempuan</p>
              </div>
              <div className="w-11 h-11 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-emerald-700 uppercase">Sudah Sertifikasi</p>
                <h3 className="text-2xl font-black text-emerald-900 mt-1">{stats.certified} <span className="text-xs font-bold text-emerald-600">({stats.percentCertified}%)</span></h3>
                <p className="text-[11px] text-emerald-600 mt-0.5">Memiliki Sertifikat Pendidik</p>
              </div>
              <div className="w-11 h-11 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-800">
                <ShieldCheck className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-amber-700 uppercase">Dalam Proses PPG</p>
                <h3 className="text-2xl font-black text-amber-900 mt-1">{stats.process}</h3>
                <p className="text-[11px] text-amber-600 mt-0.5">Sedang Menempuh PPG</p>
              </div>
              <div className="w-11 h-11 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-800">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </Card>

          <Card className="border-0 shadow-md rounded-2xl bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-extrabold text-slate-600 uppercase">Belum Sertifikasi</p>
                <h3 className="text-2xl font-black text-slate-800 mt-1">{stats.notCertified}</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Belum Bersertifikat</p>
              </div>
              <div className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-700">
                <GraduationCap className="w-6 h-6" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filter & Search Controls */}
        <Card className="border-0 shadow-lg rounded-3xl overflow-hidden bg-white">
          <CardContent className="p-4 space-y-4">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Cari berdasarkan Nama Guru, NIP, NIK, atau Jabatan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-2xl text-xs font-medium border-slate-200"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Select value={filterSertifikasi} onValueChange={setFilterSertifikasi}>
                  <SelectTrigger className="w-[170px] rounded-2xl text-xs font-bold border-slate-200">
                    <SelectValue placeholder="Status Sertifikasi" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Sertifikasi</SelectItem>
                    <SelectItem value="Sudah Sertifikasi">Sudah Sertifikasi</SelectItem>
                    <SelectItem value="Dalam Proses">Dalam Proses</SelectItem>
                    <SelectItem value="Belum Sertifikasi">Belum Sertifikasi</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterPendidikan} onValueChange={setFilterPendidikan}>
                  <SelectTrigger className="w-[150px] rounded-2xl text-xs font-bold border-slate-200">
                    <SelectValue placeholder="Pendidikan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Pendidikan</SelectItem>
                    <SelectItem value="S2">S2 (Magister)</SelectItem>
                    <SelectItem value="S1">S1 (Sarjana)</SelectItem>
                    <SelectItem value="D3">D3 / D2</SelectItem>
                    <SelectItem value="SMA">SMA / MA</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[130px] rounded-2xl text-xs font-bold border-slate-200">
                    <SelectValue placeholder="Status Keaktifan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="Aktif">Aktif</SelectItem>
                    <SelectItem value="Cuti">Cuti</SelectItem>
                    <SelectItem value="Non-Aktif">Non-Aktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table View (Consisting explicitly of: NO, NAMA, NIP, NIK, PENDIDIKAN, SERTIFIKASI) */}
        <Card className="border-0 shadow-xl rounded-3xl overflow-hidden bg-white">
          <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between py-4 px-6">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Tabel Data Guru & GTK Resmi
              </CardTitle>
              <CardDescription className="text-xs">
                Menampilkan {filteredTeachers.length} dari total {teachers.length} guru/tenaga kependidikan
              </CardDescription>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 text-white font-bold border-b border-slate-800">
                  <th className="p-3.5 text-center w-12 border-r border-slate-800">NO</th>
                  <th className="p-3.5 border-r border-slate-800">NAMA LENGKAP & GELAR</th>
                  <th className="p-3.5 border-r border-slate-800">NIP / NPK</th>
                  <th className="p-3.5 border-r border-slate-800">NIK (16 DIGIT)</th>
                  <th className="p-3.5 border-r border-slate-800">PENDIDIKAN TERAKHIR</th>
                  <th className="p-3.5 border-r border-slate-800">MENGAJAR KELAS</th>
                  <th className="p-3.5 border-r border-slate-800 text-center">STATUS SERTIFIKASI</th>
                  <th className="p-3.5 text-center w-28">AKSI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeachers.length > 0 ? (
                  filteredTeachers.map((teacher, index) => (
                    <tr key={teacher.id} className="hover:bg-emerald-50/30 transition-colors">
                      {/* 1. NO */}
                      <td className="p-3.5 text-center font-bold text-slate-800 border-r border-slate-100 font-mono">
                        {index + 1}
                      </td>

                      {/* 2. NAMA */}
                      <td className="p-3.5 border-r border-slate-100">
                        <div className="flex items-center gap-3">
                          {teacher.foto_url ? (
                            <img src={formatImageUrl(teacher.foto_url)} alt={teacher.nama} className="w-10 h-10 rounded-full object-cover border border-emerald-300 shadow-sm shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-sm shrink-0 border border-emerald-200">
                              {teacher.nama.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm">
                              {teacher.nama}{teacher.gelar ? `, ${teacher.gelar}` : ''}
                            </div>
                            <div className="text-[11px] text-slate-500 font-medium flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="text-emerald-700 font-bold">{teacher.jabatan}</span>
                              {teacher.status_kepegawaian && (
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-emerald-300 text-emerald-800 bg-emerald-50">
                                  {teacher.status_kepegawaian}
                                </Badge>
                              )}
                              {teacher.mapel_diampu && <span>• {teacher.mapel_diampu}</span>}
                            </div>
                            {(teacher.npk || teacher.peg_id || teacher.telepon) && (
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                                {teacher.npk && <span>NPK: {teacher.npk}</span>}
                                {teacher.peg_id && <span>PegID: {teacher.peg_id}</span>}
                                {teacher.telepon && <span>WA: {teacher.telepon}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. NIP */}
                      <td className="p-3.5 border-r border-slate-100 font-mono text-slate-800 font-bold whitespace-nowrap">
                        {teacher.nip && teacher.nip !== '-' ? (
                          <span className="text-slate-900">{teacher.nip}</span>
                        ) : (
                          <span className="text-slate-400 font-normal">-</span>
                        )}
                      </td>

                      {/* 4. NIK */}
                      <td className="p-3.5 border-r border-slate-100 font-mono whitespace-nowrap">
                        {teacher.nik && teacher.nik !== '-' && teacher.nik !== '0000000000000000' ? (
                          <div className="flex items-center gap-1.5 text-emerald-900 bg-emerald-50/90 font-bold px-2.5 py-1 rounded-xl border border-emerald-200/90 w-fit text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{teacher.nik}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">-</span>
                        )}
                      </td>

                      {/* 5. PENDIDIKAN */}
                      <td className="p-3.5 border-r border-slate-100">
                        <div className="font-bold text-slate-800">{teacher.pendidikan}</div>
                        {teacher.nuptk && (
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            NUPTK: {teacher.nuptk}
                          </div>
                        )}
                      </td>

                      {/* 5.5 MENGAJAR KELAS */}
                      <td className="p-3.5 border-r border-slate-100">
                        {teacher.mengajar_kelas && teacher.mengajar_kelas !== '-' ? (
                          <Badge className="bg-teal-50 text-teal-800 border-teal-200 font-bold text-[11px] px-2.5 py-0.5 rounded-lg whitespace-nowrap">
                            {teacher.mengajar_kelas}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Belum diisi</span>
                        )}
                      </td>

                      {/* 6. SERTIFIKASI */}
                      <td className="p-3.5 border-r border-slate-100 text-center">
                        {teacher.sertifikasi === 'Sudah Sertifikasi' ? (
                          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 font-bold px-2.5 py-1 rounded-full text-[10px] border border-emerald-300">
                            <CheckCircle className="w-3 h-3 mr-1 text-emerald-600" /> Sudah Sertifikasi
                          </Badge>
                        ) : teacher.sertifikasi === 'Dalam Proses' ? (
                          <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-200 font-bold px-2.5 py-1 rounded-full text-[10px] border border-amber-300">
                            <Clock className="w-3 h-3 mr-1 text-amber-700" /> Dalam Proses PPG
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-slate-600 border-slate-300 font-semibold px-2.5 py-1 rounded-full text-[10px]">
                            Belum Sertifikasi
                          </Badge>
                        )}
                      </td>

                      {/* AKSI */}
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenEdit(teacher)}
                            className="h-8 w-8 p-0 rounded-xl text-blue-600 hover:bg-blue-50"
                            title="Edit Data Guru"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handlePromptDeleteTeacher(teacher)}
                            className="h-8 w-8 p-0 rounded-xl text-red-600 hover:bg-red-50 hover:text-red-700"
                            title="Hapus Data Guru"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-slate-400">
                      <UserX className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                      <p className="font-bold text-slate-600">Tidak ada data guru yang ditemukan.</p>
                      <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter Anda.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Modal Dialog Form Tambah / Edit Guru */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                {editingTeacher ? 'Edit Data Guru & GTK' : 'Tambah Guru / GTK Baru'}
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 pt-2">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    placeholder="Contoh: Ahmad Syafii"
                    className="rounded-xl text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Gelar Akademik</label>
                  <Input
                    value={formData.gelar || ''}
                    onChange={(e) => setFormData({ ...formData, gelar: e.target.value })}
                    placeholder="Contoh: S.Pd.I, M.Pd"
                    className="rounded-xl text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NIK (16 Digit KTP)</label>
                  <Input
                    value={formData.nik}
                    onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                    placeholder="16 Digit NIK KTP"
                    className="rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NIP (Jika PNS / PPPK)</label>
                  <Input
                    value={formData.nip || ''}
                    onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                    placeholder="18 Digit NIP (atau tanda -)"
                    className="rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NUPTK (16 Digit)</label>
                  <Input
                    value={formData.nuptk || ''}
                    onChange={(e) => setFormData({ ...formData, nuptk: e.target.value })}
                    placeholder="16 Digit NUPTK"
                    className="rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">NPK Kemenag</label>
                  <Input
                    value={formData.npk || ''}
                    onChange={(e) => setFormData({ ...formData, npk: e.target.value })}
                    placeholder="NPK Kemenag (12 Digit)"
                    className="rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Peg ID Simpatika</label>
                  <Input
                    value={formData.peg_id || ''}
                    onChange={(e) => setFormData({ ...formData, peg_id: e.target.value })}
                    placeholder="Peg ID Simpatika Kemenag"
                    className="rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Kepegawaian</label>
                  <Select
                    value={formData.status_kepegawaian || 'GTY / Guru Tetap Yayasan'}
                    onValueChange={(val: any) => setFormData({ ...formData, status_kepegawaian: val })}
                  >
                    <SelectTrigger className="rounded-xl text-xs font-bold">
                      <SelectValue placeholder="Status Kepegawaian" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PNS">PNS (Pegawai Negeri Sipil)</SelectItem>
                      <SelectItem value="PPPK">PPPK</SelectItem>
                      <SelectItem value="GTY / Guru Tetap Yayasan">GTY / Guru Tetap Yayasan</SelectItem>
                      <SelectItem value="GTT / Honorer">GTT / Guru Tidak Tetap / Honorer</SelectItem>
                      <SelectItem value="Staf / Tenaga Kependidikan">Staf / Tenaga Kependidikan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jabatan Guru / Tugas</label>
                  <Input
                    value={formData.jabatan}
                    onChange={(e) => setFormData({ ...formData, jabatan: e.target.value })}
                    placeholder="Guru Kelas / Guru Mapel / Kepala Madrasah"
                    className="rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Kelamin</label>
                  <Select
                    value={formData.gender}
                    onValueChange={(val: any) => setFormData({ ...formData, gender: val })}
                  >
                    <SelectTrigger className="rounded-xl text-xs font-bold">
                      <SelectValue placeholder="Jenis Kelamin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Laki-laki">Laki-laki</SelectItem>
                      <SelectItem value="Perempuan">Perempuan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. WhatsApp / HP</label>
                  <Input
                    value={formData.telepon || ''}
                    onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                    placeholder="0812xxxxxxxx"
                    className="rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Email Guru</label>
                  <Input
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="guru@mimaarif.sch.id"
                    className="rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Pendidikan Terakhir <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.pendidikan}
                    onChange={(e) => setFormData({ ...formData, pendidikan: e.target.value })}
                    placeholder="Contoh: S1 Pendidikan Agama Islam"
                    className="rounded-xl text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Sertifikasi Pendidik</label>
                  <Select
                    value={formData.sertifikasi}
                    onValueChange={(val: any) => setFormData({ ...formData, sertifikasi: val })}
                  >
                    <SelectTrigger className="rounded-xl text-xs font-bold">
                      <SelectValue placeholder="Status Sertifikasi" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sudah Sertifikasi">Sudah Sertifikasi</SelectItem>
                      <SelectItem value="Dalam Proses">Dalam Proses (PPG)</SelectItem>
                      <SelectItem value="Belum Sertifikasi">Belum Sertifikasi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">No. Sertifikat Pendidik (Sertis)</label>
                  <Input
                    value={formData.no_sertifikat_pendidik || ''}
                    onChange={(e) => setFormData({ ...formData, no_sertifikat_pendidik: e.target.value })}
                    placeholder="12 Digit No. Sertifikat"
                    className="rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mata Pelajaran Diampu</label>
                  <Input
                    value={formData.mapel_diampu || ''}
                    onChange={(e) => setFormData({ ...formData, mapel_diampu: e.target.value })}
                    placeholder="Bahasa Arab / Tematik / PJOK"
                    className="rounded-xl text-xs font-semibold"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">Mengajar Kelas / Rombel</label>
                    <span className="text-[10px] text-slate-400 font-medium">Contoh: Kelas 1, Kelas 4-6, Semua Kelas</span>
                  </div>
                  <Input
                    value={formData.mengajar_kelas || ''}
                    onChange={(e) => setFormData({ ...formData, mengajar_kelas: e.target.value })}
                    placeholder="e.g. Kelas 1 / Kelas 1, 2, 3 / Semua Kelas"
                    className="rounded-xl text-xs font-semibold"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {['Kelas 1', 'Kelas 2', 'Kelas 3', 'Kelas 4', 'Kelas 5', 'Kelas 6', 'Kelas 1-3', 'Kelas 4-6', 'Semua Kelas (1-6)'].map(kls => (
                      <button
                        key={kls}
                        type="button"
                        onClick={() => {
                          const curr = formData.mengajar_kelas?.trim() || '';
                          if (!curr) {
                            setFormData({ ...formData, mengajar_kelas: kls });
                          } else if (!curr.includes(kls)) {
                            setFormData({ ...formData, mengajar_kelas: `${curr}, ${kls}` });
                          }
                        }}
                        className="text-[10px] bg-slate-100 hover:bg-emerald-100 hover:text-emerald-800 text-slate-700 px-2 py-0.5 rounded-md font-medium transition-colors"
                      >
                        + {kls}
                      </button>
                    ))}
                    {formData.mengajar_kelas && (
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, mengajar_kelas: '' })}
                        className="text-[10px] text-red-500 hover:text-red-700 px-1 py-0.5 font-bold"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Status Keaktifan</label>
                  <Select
                    value={formData.status_keaktifan}
                    onValueChange={(val: any) => setFormData({ ...formData, status_keaktifan: val })}
                  >
                    <SelectTrigger className="rounded-xl text-xs font-bold">
                      <SelectValue placeholder="Status Keaktifan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Aktif">Aktif</SelectItem>
                      <SelectItem value="Cuti">Cuti</SelectItem>
                      <SelectItem value="Non-Aktif">Non-Aktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Foto Guru</label>
                  <div className="flex items-center gap-3">
                    {formData.foto_url ? (
                      <img src={formatImageUrl(formData.foto_url)} alt="Foto" className="w-12 h-12 rounded-xl object-cover border border-emerald-300" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                        <ImageIcon className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <label className="cursor-pointer">
                        <Button type="button" size="sm" variant="outline" className="rounded-xl text-xs font-bold" asChild disabled={uploading}>
                          <span><Upload className="w-3.5 h-3.5 mr-1" /> {uploading ? 'Mengunggah...' : 'Upload Foto'}</span>
                        </Button>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                      </label>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setMediaModalOpen(true)}
                        className="rounded-xl text-xs font-bold"
                      >
                        Pilih dari Galeri
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t border-slate-100 gap-2">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="rounded-2xl text-xs font-bold">
                  Batal
                </Button>
                <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold">
                  {saving ? 'Menyimpan...' : 'Simpan Data Guru'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <MediaLibraryModal
          isOpen={mediaModalOpen}
          onClose={() => setMediaModalOpen(false)}
          onSelectImage={(url) => {
            setFormData(prev => ({ ...prev, foto_url: url }));
            showSuccess('Foto dipilih!');
          }}
          title="Pilih Foto Guru"
        />

        {/* Modal Unggah / Import Excel Data Guru with Preview & Warning */}
        <Dialog 
          open={importModalOpen} 
          onOpenChange={(open) => {
            setImportModalOpen(open);
            if (!open) {
              setImportStep('upload');
              setImportPreviewList([]);
            }
          }}
        >
          <DialogContent className={`${importStep === 'preview' ? 'max-w-5xl w-[96vw] max-h-[92vh] flex flex-col p-4 md:p-6 overflow-hidden' : 'max-w-xl p-6'} rounded-3xl`}>
            {importStep === 'upload' ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                    Unggah & Import Data Guru (Excel)
                  </DialogTitle>
                  <CardDescription className="text-xs text-slate-500 mt-1">
                    Unggah file Excel (.xlsx / .xls) untuk meninjau data guru sebelum ditambahkan ke sistem.
                  </CardDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 text-xs text-emerald-950 space-y-2">
                    <div className="font-extrabold flex items-center gap-1.5 text-emerald-900">
                      <Sparkles className="w-4 h-4 text-emerald-600" />
                      Format Kolom Excel yang Didukung:
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] text-emerald-800 leading-relaxed font-medium">
                      <li><strong>Nama Lengkap & Gelar</strong> (misal: <em>Ahmad Syafii</em>, Gelar: <em>S.Pd.I, M.Pd</em>)</li>
                      <li><strong>NIK (16 digit)</strong> & <strong>NIP</strong> / <strong>NUPTK</strong> / <strong>NPK Kemenag</strong> / <strong>Peg ID Simpatika</strong></li>
                      <li><strong>Jabatan</strong> (Guru Kelas / Guru Mapel / Kepala Madrasah)</li>
                      <li><strong>Status Kepegawaian</strong> (PNS, PPPK, GTY, GTT / Honorer, Staf TU)</li>
                      <li><strong>Jenis Kelamin</strong> (Laki-laki / Perempuan), <strong>No WhatsApp</strong>, & <strong>Email</strong></li>
                      <li><strong>Pendidikan</strong>, <strong>Status Sertifikasi</strong>, <strong>Mapel Diampu</strong>, & <strong>Mengajar Kelas</strong></li>
                    </ul>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                    <div>
                      <div className="text-xs font-bold text-slate-800">Unduh Format Template</div>
                      <div className="text-[10px] text-slate-500">Gunakan template resmi untuk menghindari kesalahan format data</div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleDownloadTemplate}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs gap-1.5 shadow-sm shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" /> Unduh Template
                    </Button>
                  </div>

                  <div className="border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/30 rounded-2xl p-6 text-center transition-colors">
                    <FileSpreadsheet className="w-10 h-10 text-emerald-600 mx-auto mb-2 opacity-80" />
                    <p className="text-xs font-extrabold text-slate-800">Pilih File Excel (.xlsx / .xls)</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 mb-3">Sistem akan menampilkan pratinjau data & peringatan sebelum disimpan</p>
                    
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".xlsx, .xls"
                      onChange={handleImportExcel}
                      className="hidden"
                      id="excel-file-input"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs px-5 shadow-md"
                    >
                      <Upload className="w-4 h-4 mr-1.5" /> Pilih File Excel
                    </Button>
                  </div>
                </div>

                <DialogFooter className="pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setImportModalOpen(false)}
                    className="rounded-xl text-xs font-bold w-full sm:w-auto"
                  >
                    Tutup
                  </Button>
                </DialogFooter>
              </>
            ) : (
              /* Step 2: Preview & Warning Screen */
              <>
                <DialogHeader className="pb-3 border-b border-slate-100 shrink-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <DialogTitle className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                        <Eye className="w-5 h-5 text-emerald-600" />
                        Pratinjau & Verifikasi Data Guru
                      </DialogTitle>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                        <span>Berkas: <strong className="text-slate-800">{importFileName}</strong></span>
                        <span>•</span>
                        <span>Total: <strong className="text-emerald-700 font-bold">{previewStats.total} Baris</strong></span>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleResetImport}
                      className="rounded-xl text-xs font-bold gap-1 text-slate-600 border-slate-300 self-start sm:self-auto"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Ganti File
                    </Button>
                  </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-1">
                  {/* Stat Cards & Quick Filter Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div 
                      onClick={() => setImportStatusFilter('all')}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        importStatusFilter === 'all' 
                          ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="text-[11px] font-bold opacity-80">Total Terbaca</div>
                      <div className="text-xl font-black mt-0.5">{previewStats.total} <span className="text-xs font-medium">Guru</span></div>
                    </div>

                    <div 
                      onClick={() => setImportStatusFilter('new')}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        importStatusFilter === 'new' 
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm' 
                          : 'bg-emerald-50 hover:bg-emerald-100/70 border-emerald-200 text-emerald-900'
                      }`}
                    >
                      <div className="text-[11px] font-bold opacity-90 flex items-center gap-1">
                        <Plus className="w-3 h-3" /> Guru Baru
                      </div>
                      <div className="text-xl font-black mt-0.5">+{previewStats.newItems} <span className="text-xs font-medium">Data</span></div>
                    </div>

                    <div 
                      onClick={() => setImportStatusFilter('update')}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        importStatusFilter === 'update' 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm' 
                          : 'bg-blue-50 hover:bg-blue-100/70 border-blue-200 text-blue-900'
                      }`}
                    >
                      <div className="text-[11px] font-bold opacity-90 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Sudah Terdaftar
                      </div>
                      <div className="text-xl font-black mt-0.5">↻{previewStats.updateItems} <span className="text-xs font-medium">Update</span></div>
                    </div>

                    <div 
                      onClick={() => setImportStatusFilter('warning')}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                        importStatusFilter === 'warning' 
                          ? 'bg-amber-600 text-white border-amber-600 shadow-sm' 
                          : 'bg-amber-50 hover:bg-amber-100/70 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="text-[11px] font-bold opacity-90 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" /> Ada Catatan
                      </div>
                      <div className="text-xl font-black mt-0.5">⚠ {previewStats.allWithWarnings} <span className="text-xs font-medium">Perhatian</span></div>
                    </div>
                  </div>

                  {/* Warning Callout Notice */}
                  {previewStats.allWithWarnings > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-amber-900">
                      <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <div className="font-extrabold text-amber-950">
                          Peringatan Validasi Data Terdeteksi ({previewStats.allWithWarnings} Baris)
                        </div>
                        <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                          Terdapat data dengan format NIK belum 16 digit, NIP kosong pada GTK berstatus PNS/PPPK, atau nama guru yang sudah ada sebelumnya. 
                          Data tetap dapat disimpan sesuai mode penggabungan yang Anda pilih di bawah.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Strategy Selector */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Pilih Mode Penggabungan Data:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label 
                        onClick={() => setImportMergeMode('merge_update')}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          importMergeMode === 'merge_update' 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-1 ring-emerald-500' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="radio" 
                            name="mergeMode" 
                            checked={importMergeMode === 'merge_update'} 
                            onChange={() => setImportMergeMode('merge_update')}
                            className="accent-emerald-600" 
                          />
                          <span className="font-extrabold">Gabungkan & Perbarui</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 pl-4">
                          Tambahkan guru baru & perbarui data guru yang sudah ada (Rekomendasi).
                        </p>
                      </label>

                      <label 
                        onClick={() => setImportMergeMode('insert_only')}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          importMergeMode === 'insert_only' 
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-bold ring-1 ring-emerald-500' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="radio" 
                            name="mergeMode" 
                            checked={importMergeMode === 'insert_only'} 
                            onChange={() => setImportMergeMode('insert_only')}
                            className="accent-emerald-600" 
                          />
                          <span className="font-extrabold">Hanya Tambah Baru</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 pl-4">
                          Hanya masukkan guru baru, lewati data guru yang sudah ada.
                        </p>
                      </label>

                      <label 
                        onClick={() => setImportMergeMode('overwrite_all')}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          importMergeMode === 'overwrite_all' 
                            ? 'bg-rose-50 border-rose-500 text-rose-950 font-bold ring-1 ring-rose-500' 
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <input 
                            type="radio" 
                            name="mergeMode" 
                            checked={importMergeMode === 'overwrite_all'} 
                            onChange={() => setImportMergeMode('overwrite_all')}
                            className="accent-rose-600" 
                          />
                          <span className="font-extrabold text-rose-800">Ganti Total (Timpa)</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 pl-4">
                          Ganti seluruh daftar guru saat ini dengan data dari file Excel ini.
                        </p>
                      </label>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-1">
                    <div className="relative w-full sm:w-72">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={importSearchFilter}
                        onChange={(e) => setImportSearchFilter(e.target.value)}
                        placeholder="Cari nama, NIK, NIP, mapel..."
                        className="pl-8 h-8 rounded-xl text-xs bg-slate-50 border-slate-200 font-medium"
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold self-end sm:self-center">
                      Menampilkan <strong className="text-slate-900">{filteredPreviewList.length}</strong> dari {previewStats.total} data
                    </div>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                    <div className="max-h-[320px] overflow-y-auto overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
                          <tr>
                            <th className="py-2.5 px-3 text-center w-10">No</th>
                            <th className="py-2.5 px-3 text-center">Status</th>
                            <th className="py-2.5 px-3">Nama & Gelar</th>
                            <th className="py-2.5 px-3">NIK (16 Digit)</th>
                            <th className="py-2.5 px-3">NIP / NUPTK / NPK</th>
                            <th className="py-2.5 px-3">Jabatan & Status</th>
                            <th className="py-2.5 px-3">Kontak & JK</th>
                            <th className="py-2.5 px-3">Pendidikan & Sertifikasi</th>
                            <th className="py-2.5 px-3">Catatan / Validasi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredPreviewList.length === 0 ? (
                            <tr>
                              <td colSpan={9} className="py-8 text-center text-xs text-slate-400 font-medium">
                                Tidak ada data yang sesuai filter pencarian.
                              </td>
                            </tr>
                          ) : (
                            filteredPreviewList.map((item, idx) => {
                              const isNikValid = item.data.nik && item.data.nik !== '-' && item.data.nik !== '0000000000000000' && item.data.nik.length === 16;
                              return (
                                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="py-2 px-3 text-center font-bold text-slate-400 text-[11px]">
                                    {idx + 1}
                                  </td>
                                  
                                  <td className="py-2 px-3 text-center whitespace-nowrap">
                                    {item.status === 'NEW' && (
                                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px] gap-1 hover:bg-emerald-100">
                                        <Plus className="w-3 h-3" /> Baru
                                      </Badge>
                                    )}
                                    {item.status === 'UPDATE' && (
                                      <Badge className="bg-blue-100 text-blue-800 border-blue-300 font-bold text-[10px] gap-1 hover:bg-blue-100">
                                        <RefreshCw className="w-3 h-3" /> Update
                                      </Badge>
                                    )}
                                    {item.status === 'WARNING' && (
                                      <Badge className="bg-amber-100 text-amber-800 border-amber-300 font-bold text-[10px] gap-1 hover:bg-amber-100">
                                        <AlertTriangle className="w-3 h-3" /> Catatan
                                      </Badge>
                                    )}
                                  </td>

                                  <td className="py-2 px-3">
                                    <div className="font-extrabold text-slate-900 leading-tight">
                                      {item.data.nama}
                                    </div>
                                    {item.data.gelar && (
                                      <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
                                        {item.data.gelar}
                                      </div>
                                    )}
                                  </td>

                                  <td className="py-2 px-3 whitespace-nowrap">
                                    <div className={`font-mono text-xs font-bold flex items-center gap-1.5 ${
                                      isNikValid ? 'text-emerald-700' : 'text-amber-700'
                                    }`}>
                                      {isNikValid ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                      ) : (
                                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                      )}
                                      <span>{item.data.nik || '-'}</span>
                                    </div>
                                    {!isNikValid && (
                                      <div className="text-[9px] text-amber-600 font-medium">
                                        {item.data.nik ? `${item.data.nik.length} digit` : 'Kosong'}
                                      </div>
                                    )}
                                  </td>

                                  <td className="py-2 px-3 whitespace-nowrap">
                                    <div className="font-mono text-[11px] text-slate-800 font-semibold">
                                      NIP: {item.data.nip || '-'}
                                    </div>
                                    {(item.data.nuptk || item.data.npk) && (
                                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                                        {item.data.nuptk ? `NUPTK: ${item.data.nuptk}` : `NPK: ${item.data.npk}`}
                                      </div>
                                    )}
                                  </td>

                                  <td className="py-2 px-3">
                                    <div className="font-bold text-slate-800 leading-tight">
                                      {item.data.jabatan}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                                      {item.data.status_kepegawaian}
                                    </div>
                                  </td>

                                  <td className="py-2 px-3 whitespace-nowrap">
                                    <div className="text-[11px] text-slate-700 font-medium flex items-center gap-1">
                                      <span>{item.data.gender === 'Perempuan' ? 'P' : 'L'}</span>
                                      <span>•</span>
                                      <span>{item.data.telepon || '-'}</span>
                                    </div>
                                    {item.data.email && (
                                      <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                                        {item.data.email}
                                      </div>
                                    )}
                                  </td>

                                  <td className="py-2 px-3">
                                    <div className="text-[11px] font-semibold text-slate-800 truncate max-w-[140px]">
                                      {item.data.pendidikan}
                                    </div>
                                    <div className="text-[10px] font-bold text-emerald-700 mt-0.5">
                                      {item.data.sertifikasi}
                                    </div>
                                  </td>

                                  <td className="py-2 px-3">
                                    {item.warnings.length > 0 ? (
                                      <div className="space-y-1">
                                        {item.warnings.map((w, wIdx) => (
                                          <div key={wIdx} className="text-[10px] font-medium text-amber-800 bg-amber-50/80 px-2 py-0.5 rounded border border-amber-200/60 leading-tight flex items-start gap-1">
                                            <span className="text-amber-600 mt-0.5">•</span>
                                            <span>{w}</span>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Data Valid
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <DialogFooter className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                  <div className="text-xs text-slate-600 font-medium text-center sm:text-left">
                    Mode:{' '}
                    <strong className="text-slate-900">
                      {importMergeMode === 'merge_update' 
                        ? `Gabungkan & Perbarui (${previewStats.total} GTK)`
                        : importMergeMode === 'insert_only'
                        ? `Hanya Tambah Baru (+${previewStats.newItems} GTK)`
                        : `Timpa Total (${previewStats.total} GTK)`}
                    </strong>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setImportModalOpen(false)}
                      className="rounded-xl text-xs font-bold"
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      disabled={isImporting}
                      onClick={handleConfirmImport}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs px-5 shadow-md gap-1.5"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menyimpan Data...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Konfirmasi & Simpan ({previewStats.total} Data)
                        </>
                      )}
                    </Button>
                  </div>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirmation Modal for Delete GTK */}
        <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
          <DialogContent className="max-w-md rounded-3xl p-6">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-rose-700 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-600" />
                Konfirmasi Hapus GTK
              </DialogTitle>
            </DialogHeader>

            <div className="py-3 space-y-2">
              <p className="text-xs text-slate-700 font-medium">
                Apakah Anda yakin ingin menghapus data GTK <strong className="text-slate-900">{teacherToDelete?.nama}</strong>?
              </p>
              {teacherToDelete?.jabatan && (
                <p className="text-[11px] text-slate-500">
                  Jabatan: {teacherToDelete.jabatan} • NIP: {teacherToDelete.nip || '-'}
                </p>
              )}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 font-semibold mt-2">
                ⚠️ Tindakan ini bersifat permanen. Data GTK akan dihapus dari sistem.
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setTeacherToDelete(null);
                }}
                className="rounded-xl text-xs font-bold"
              >
                Batal
              </Button>
              <Button
                type="button"
                disabled={saving}
                onClick={handleConfirmDeleteTeacher}
                className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold"
              >
                {saving ? 'Menghapus...' : 'Ya, Hapus GTK'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default TeachersAdmin;
