/**
 * Utility for Indonesian National Holidays, Academic Calendar Holidays, and Sunday detection.
 * Digunakan pada modul LCKH untuk menandai Tanggal Merah Nasional & Hari Libur Kalender Pendidikan.
 */

import { supabase } from '@/integrations/supabase/client';

export interface CalendarEventItem {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  end_date?: string; // YYYY-MM-DD
  category: 'academic' | 'holiday' | 'event' | 'exam' | string;
  description?: string;
}

export interface HolidayInfo {
  isRedDate: boolean;
  isSunday: boolean;
  isNationalHoliday: boolean;
  isAcademicHoliday: boolean;
  holidayName: string;
  description?: string;
  holidayType: 'sunday' | 'national' | 'academic' | null;
}

// Daftar Hari Libur Nasional & Cuti Bersama Indonesia (2024 - 2027)
export const INDONESIA_NATIONAL_HOLIDAYS: Record<string, string> = {
  // === 2024 ===
  '2024-01-01': 'Tahun Baru 2024 Masehi',
  '2024-02-08': 'Isra Mi\'raj Nabi Muhammad SAW',
  '2024-02-09': 'Cuti Bersama Tahun Baru Imlek 2575',
  '2024-02-10': 'Tahun Baru Imlek 2575 Kongzili',
  '2024-03-11': 'Hari Suci Nyepi Tahun Baru Saka 1946',
  '2024-03-12': 'Cuti Bersama Hari Suci Nyepi',
  '2024-03-29': 'Wafat Isa Al Masih',
  '2024-03-31': 'Hari Paskah',
  '2024-04-08': 'Cuti Bersama Hari Raya Idul Fitri 1445 H',
  '2024-04-09': 'Cuti Bersama Hari Raya Idul Fitri 1445 H',
  '2024-04-10': 'Hari Raya Idul Fitri 1445 Hijriah',
  '2024-04-11': 'Hari Raya Idul Fitri 1445 Hijriah',
  '2024-04-12': 'Cuti Bersama Hari Raya Idul Fitri 1445 H',
  '2024-04-15': 'Cuti Bersama Hari Raya Idul Fitri 1445 H',
  '2024-05-01': 'Hari Buruh Internasional',
  '2024-05-09': 'Kenaikan Isa Al Masih',
  '2024-05-10': 'Cuti Bersama Kenaikan Isa Al Masih',
  '2024-05-23': 'Hari Raya Waisak 2568 BE',
  '2024-05-24': 'Cuti Bersama Hari Raya Waisak',
  '2024-06-01': 'Hari Lahir Pancasila',
  '2024-06-17': 'Hari Raya Idul Adha 1445 Hijriah',
  '2024-06-18': 'Cuti Bersama Hari Raya Idul Adha',
  '2024-07-07': 'Tahun Baru Islam 1446 Hijriah',
  '2024-08-17': 'Hari Kemerdekaan Republik Indonesia Ke-79',
  '2024-09-16': 'Maulid Nabi Muhammad SAW',
  '2024-12-25': 'Hari Raya Natal',
  '2024-12-26': 'Cuti Bersama Hari Raya Natal',

  // === 2025 ===
  '2025-01-01': 'Tahun Baru 2025 Masehi',
  '2025-01-27': 'Isra Mi\'raj Nabi Muhammad SAW',
  '2025-01-28': 'Cuti Bersama Tahun Baru Imlek 2576',
  '2025-01-29': 'Tahun Baru Imlek 2576 Kongzili',
  '2025-03-28': 'Cuti Bersama Hari Suci Nyepi',
  '2025-03-29': 'Hari Suci Nyepi Tahun Baru Saka 1947',
  '2025-03-31': 'Hari Raya Idul Fitri 1446 Hijriah',
  '2025-04-01': 'Hari Raya Idul Fitri 1446 Hijriah',
  '2025-04-02': 'Cuti Bersama Idul Fitri 1446 H',
  '2025-04-03': 'Cuti Bersama Idul Fitri 1446 H',
  '2025-04-04': 'Cuti Bersama Idul Fitri 1446 H',
  '2025-04-07': 'Cuti Bersama Idul Fitri 1446 H',
  '2025-04-18': 'Wafat Yesus Kristus',
  '2025-04-20': 'Kebangkitan Yesus Kristus (Paskah)',
  '2025-05-01': 'Hari Buruh Internasional',
  '2025-05-12': 'Hari Raya Waisak 2569 BE',
  '2025-05-13': 'Cuti Bersama Hari Raya Waisak',
  '2025-05-29': 'Kenaikan Yesus Kristus',
  '2025-05-30': 'Cuti Bersama Kenaikan Yesus Kristus',
  '2025-06-01': 'Hari Lahir Pancasila',
  '2025-06-06': 'Hari Raya Idul Adha 1446 Hijriah',
  '2025-06-09': 'Cuti Bersama Hari Raya Idul Adha',
  '2025-06-27': 'Tahun Baru Islam 1447 Hijriah',
  '2025-08-17': 'Hari Kemerdekaan Republik Indonesia Ke-80',
  '2025-09-05': 'Maulid Nabi Muhammad SAW',
  '2025-12-25': 'Hari Raya Natal',
  '2025-12-26': 'Cuti Bersama Hari Raya Natal',

  // === 2026 ===
  '2026-01-01': 'Tahun Baru 2026 Masehi',
  '2026-01-16': 'Isra Mi\'raj Nabi Muhammad SAW',
  '2026-02-17': 'Tahun Baru Imlek 2577 Kongzili',
  '2026-03-20': 'Hari Suci Nyepi Tahun Baru Saka 1948',
  '2026-03-21': 'Hari Raya Idul Fitri 1447 Hijriah',
  '2026-03-22': 'Hari Raya Idul Fitri 1447 Hijriah',
  '2026-03-23': 'Cuti Bersama Idul Fitri 1447 H',
  '2026-03-24': 'Cuti Bersama Idul Fitri 1447 H',
  '2026-04-03': 'Wafat Yesus Kristus',
  '2026-05-01': 'Hari Buruh Internasional',
  '2026-05-14': 'Kenaikan Yesus Kristus',
  '2026-05-31': 'Hari Raya Waisak 2570 BE',
  '2026-06-01': 'Hari Lahir Pancasila',
  '2026-06-16': 'Hari Raya Idul Adha 1447 Hijriah',
  '2026-06-17': 'Tahun Baru Islam 1448 Hijriah',
  '2026-08-17': 'Hari Kemerdekaan Republik Indonesia Ke-81',
  '2026-08-25': 'Maulid Nabi Muhammad SAW',
  '2026-12-25': 'Hari Raya Natal',
  '2026-12-26': 'Cuti Bersama Hari Raya Natal',

  // === 2027 ===
  '2027-01-01': 'Tahun Baru 2027 Masehi',
  '2027-01-05': 'Isra Mi\'raj Nabi Muhammad SAW',
  '2027-02-06': 'Tahun Baru Imlek 2578 Kongzili',
  '2027-03-09': 'Hari Suci Nyepi 1949 Saka',
  '2027-03-10': 'Hari Raya Idul Fitri 1448 Hijriah',
  '2027-03-11': 'Hari Raya Idul Fitri 1448 Hijriah',
  '2027-03-26': 'Wafat Yesus Kristus',
  '2027-05-01': 'Hari Buruh Internasional',
  '2027-05-06': 'Kenaikan Yesus Kristus',
  '2027-05-20': 'Hari Raya Waisak 2571 BE',
  '2027-06-01': 'Hari Lahir Pancasila',
  '2027-06-05': 'Hari Raya Idul Adha 1448 Hijriah',
  '2027-06-06': 'Tahun Baru Islam 1449 Hijriah',
  '2027-08-17': 'Hari Kemerdekaan Republik Indonesia Ke-82',
  '2027-08-14': 'Maulid Nabi Muhammad SAW',
  '2027-12-25': 'Hari Raya Natal',
};

// Memory cache for academic calendar items
let cachedCalendarEvents: CalendarEventItem[] | null = null;
let lastFetchTime = 0;

/**
 * Fetch events from site_settings (academic_calendar_list)
 */
export async function getAcademicCalendarEvents(): Promise<CalendarEventItem[]> {
  const now = Date.now();
  if (cachedCalendarEvents && now - lastFetchTime < 60000) {
    return cachedCalendarEvents;
  }

  try {
    const { data: res } = await supabase
      .from('site_settings')
      .select('value')
      .eq('id', 'academic_calendar_list')
      .maybeSingle();

    if (res?.value && Array.isArray(res.value)) {
      cachedCalendarEvents = res.value as CalendarEventItem[];
      lastFetchTime = now;
      return cachedCalendarEvents;
    }
  } catch (err) {
    console.warn('Gagal memuat Kalender Pendidikan dari Supabase:', err);
  }

  // Fallback to local storage if available
  try {
    const local = localStorage.getItem('siakad_academic_calendar_list');
    if (local) {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed)) {
        cachedCalendarEvents = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore
  }

  return [];
}

/**
 * Helper to normalize date string to YYYY-MM-DD
 */
export function normalizeDateString(dateStr: string | Date): string {
  if (!dateStr) return '';
  if (dateStr instanceof Date) {
    const y = dateStr.getFullYear();
    const m = String(dateStr.getMonth() + 1).padStart(2, '0');
    const d = String(dateStr.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof dateStr === 'string') {
    return dateStr.trim().split('T')[0];
  }
  return '';
}

/**
 * Determine if a date falls in a range [startDate, endDate]
 */
function isDateInRange(targetDateStr: string, startDateStr: string, endDateStr?: string): boolean {
  if (!targetDateStr || !startDateStr) return false;
  const target = new Date(targetDateStr).getTime();
  const start = new Date(startDateStr).getTime();
  if (isNaN(target) || isNaN(start)) return false;

  if (!endDateStr || endDateStr === startDateStr) {
    return targetDateStr === startDateStr;
  }

  const end = new Date(endDateStr).getTime();
  if (isNaN(end)) return targetDateStr === startDateStr;

  return target >= start && target <= end;
}

/**
 * Main function to evaluate if a date is a Sunday, National Holiday, or Academic Holiday.
 */
export function getHolidayInfo(
  dateInput: string | Date,
  customCalendarEvents?: CalendarEventItem[]
): HolidayInfo {
  const dateStr = normalizeDateString(dateInput);
  if (!dateStr) {
    return {
      isRedDate: false,
      isSunday: false,
      isNationalHoliday: false,
      isAcademicHoliday: false,
      holidayName: '',
      holidayType: null
    };
  }

  const dateObj = new Date(dateStr);
  const isSunday = dateObj.getDay() === 0;

  // 1. Check National Holidays (Tanggal Merah Nasional)
  let nationalHolidayName = INDONESIA_NATIONAL_HOLIDAYS[dateStr] || '';

  // Generic annual fallbacks if specific year is not mapped
  if (!nationalHolidayName) {
    const monthDay = dateStr.slice(5); // MM-DD
    if (monthDay === '01-01') nationalHolidayName = 'Tahun Baru Masehi';
    else if (monthDay === '05-01') nationalHolidayName = 'Hari Buruh Internasional';
    else if (monthDay === '06-01') nationalHolidayName = 'Hari Lahir Pancasila';
    else if (monthDay === '08-17') nationalHolidayName = 'HUT Kemerdekaan RI';
    else if (monthDay === '12-25') nationalHolidayName = 'Hari Raya Natal';
  }

  // 2. Check Kalender Pendidikan Madrasah
  const events = customCalendarEvents || cachedCalendarEvents || [];
  let academicHolidayName = '';
  let academicDesc = '';

  for (const ev of events) {
    if (!ev || !ev.date) continue;
    const isMatched = isDateInRange(dateStr, ev.date, ev.end_date);
    if (isMatched) {
      const isHolidayCategory = ev.category === 'holiday' || 
        ev.title?.toLowerCase().includes('libur') || 
        ev.title?.toLowerCase().includes('cuti') ||
        ev.title?.toLowerCase().includes('merah');
      
      if (isHolidayCategory) {
        academicHolidayName = ev.title;
        academicDesc = ev.description || '';
        break;
      }
    }
  }

  const isNationalHoliday = !!nationalHolidayName;
  const isAcademicHoliday = !!academicHolidayName;
  const isRedDate = isSunday || isNationalHoliday || isAcademicHoliday;

  let holidayName = '';
  let holidayType: 'sunday' | 'national' | 'academic' | null = null;

  if (isAcademicHoliday) {
    holidayName = academicHolidayName;
    holidayType = 'academic';
  } else if (isNationalHoliday) {
    holidayName = nationalHolidayName;
    holidayType = 'national';
  } else if (isSunday) {
    holidayName = 'Hari Libur Mingguan (Minggu)';
    holidayType = 'sunday';
  }

  return {
    isRedDate,
    isSunday,
    isNationalHoliday,
    isAcademicHoliday,
    holidayName,
    description: academicDesc,
    holidayType
  };
}

/**
 * Returns a quick badge or label styling class
 */
export function getHolidayBadgeProps(info: HolidayInfo): {
  badgeBg: string;
  badgeText: string;
  borderClass: string;
  rowBgClass: string;
  label: string;
} {
  if (info.isAcademicHoliday) {
    return {
      badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
      badgeText: 'text-rose-700 font-bold',
      borderClass: 'border-rose-300',
      rowBgClass: 'bg-rose-50/50 print:bg-rose-50/30',
      label: info.holidayName || 'Libur Kalender Pendidikan'
    };
  }

  if (info.isNationalHoliday) {
    return {
      badgeBg: 'bg-red-100 text-red-800 border-red-300',
      badgeText: 'text-red-700 font-bold',
      borderClass: 'border-red-300',
      rowBgClass: 'bg-red-50/60 print:bg-red-50/40',
      label: info.holidayName || 'Hari Libur Nasional'
    };
  }

  if (info.isSunday) {
    return {
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
      badgeText: 'text-red-600 font-semibold',
      borderClass: 'border-amber-200',
      rowBgClass: 'bg-red-50/30 print:bg-red-50/20',
      label: 'Hari Minggu'
    };
  }

  return {
    badgeBg: 'bg-slate-100 text-slate-700 border-slate-200',
    badgeText: 'text-slate-700',
    borderClass: 'border-slate-200',
    rowBgClass: '',
    label: ''
  };
}

/**
 * Generate all calendar days for a given month, marking holidays.
 */
export function getDaysOfMonthWithHolidays(
  year: number,
  month: number, // 1-12
  customCalendarEvents?: CalendarEventItem[]
) {
  const totalDays = new Date(year, month, 0).getDate();
  const days = [];

  for (let d = 1; d <= totalDays; d++) {
    const dayStr = String(d).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    const fullDate = `${year}-${monthStr}-${dayStr}`;
    const holidayInfo = getHolidayInfo(fullDate, customCalendarEvents);

    days.push({
      day: d,
      date: fullDate,
      ...holidayInfo
    });
  }

  return days;
}
