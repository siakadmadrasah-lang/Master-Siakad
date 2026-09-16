import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Info, 
  Sparkles,
  AlertCircle,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  getHolidayInfo, 
  getAcademicCalendarEvents, 
  CalendarEventItem, 
  INDONESIA_NATIONAL_HOLIDAYS 
} from '@/utils/academicHolidays';

interface CalendarHolidayPickerProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
  showHolidayNotice?: boolean;
  noticeCompact?: boolean;
  customEvents?: CalendarEventItem[];
}

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const DAY_NAMES = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

export const CalendarHolidayPicker: React.FC<CalendarHolidayPickerProps> = ({
  value,
  onChange,
  label = 'Tanggal Pelaksanaan',
  required = false,
  className = '',
  disabled = false,
  showHolidayNotice = true,
  noticeCompact = false,
  customEvents
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEventItem[]>(customEvents || []);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse initial date
  const parsedDate = useMemo(() => {
    if (!value) return new Date();
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  }, [value]);

  const [currentYear, setCurrentYear] = useState<number>(parsedDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(parsedDate.getMonth()); // 0-11

  // Update view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setCurrentYear(d.getFullYear());
        setCurrentMonth(d.getMonth());
      }
    }
  }, [value]);

  // Load calendar events
  useEffect(() => {
    if (customEvents && customEvents.length > 0) {
      setCalendarEvents(customEvents);
      return;
    }
    getAcademicCalendarEvents().then(events => {
      if (events && events.length > 0) setCalendarEvents(events);
    });
  }, [customEvents]);

  // Close popup on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Information about current selected date
  const holidayInfo = useMemo(() => {
    if (!value) return { isRedDate: false, holidayName: '', holidayType: null };
    return getHolidayInfo(value, calendarEvents);
  }, [value, calendarEvents]);

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Previous month filler days
    for (let i = firstDay - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const m = currentMonth === 0 ? 11 : currentMonth - 1;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isSunday: new Date(y, m, d).getDay() === 0,
        holidayInfo: getHolidayInfo(dateStr, calendarEvents)
      });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isSunday: new Date(currentYear, currentMonth, d).getDay() === 0,
        holidayInfo: getHolidayInfo(dateStr, calendarEvents)
      });
    }

    // Next month filler days to complete grid (up to 42 cells)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth === 11 ? 0 : currentMonth + 1;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isSunday: new Date(y, m, d).getDay() === 0,
        holidayInfo: getHolidayInfo(dateStr, calendarEvents)
      });
    }

    return days;
  }, [currentYear, currentMonth, calendarEvents]);

  // Quick select presets
  const handleQuickSelect = (type: 'today' | 'yesterday' | 'tomorrow') => {
    const d = new Date();
    if (type === 'yesterday') d.setDate(d.getDate() - 1);
    if (type === 'tomorrow') d.setDate(d.getDate() + 1);
    const dateStr = d.toISOString().split('T')[0];
    onChange(dateStr);
    setIsOpen(false);
  };

  const formattedDisplay = useMemo(() => {
    if (!value) return 'Pilih Tanggal';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, [value]);

  return (
    <div className={`space-y-1.5 relative ${className}`} ref={popoverRef}>
      {/* Label and Live Status */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <CalendarIcon className="w-3.5 h-3.5 text-emerald-600" />
            <span>{label}</span>
            {required && <span className="text-rose-500">*</span>}
          </label>

          {holidayInfo.isRedDate && (
            <Badge 
              variant="outline" 
              className="bg-red-50 text-red-700 border-red-200 text-[10px] font-bold px-1.5 py-0 animate-pulse flex items-center gap-1"
            >
              <span>🔴</span> Libur / Tgl Merah
            </Badge>
          )}
        </div>
      )}

      {/* Main Input trigger */}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`w-full flex items-center justify-between px-3 h-10 text-xs rounded-xl border transition-all text-left bg-white ${
            holidayInfo.isRedDate
              ? 'border-red-300 bg-red-50/40 text-red-950 hover:bg-red-50'
              : 'border-slate-200 text-slate-800 hover:border-emerald-500 hover:bg-slate-50/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer shadow-xs'}`}
        >
          <div className="flex items-center gap-2 truncate">
            <CalendarIcon className={`w-4 h-4 shrink-0 ${holidayInfo.isRedDate ? 'text-red-600' : 'text-emerald-600'}`} />
            <span className="font-semibold">{formattedDisplay}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {holidayInfo.isRedDate && (
              <span className="text-[11px] font-bold text-red-600 px-1.5 py-0.5 rounded bg-red-100/70 border border-red-200">
                🔴 {holidayInfo.holidayName || (holidayInfo.isSunday ? 'Hari Minggu' : 'Libur')}
              </span>
            )}
            <span className="text-[10px] text-slate-400 font-mono pl-1">
              {value || 'YYYY-MM-DD'}
            </span>
          </div>
        </button>

        {/* Popover Calendar Grid */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 z-50 w-full min-w-[320px] max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-3.5 space-y-3 animate-in fade-in zoom-in-95 duration-150">
            {/* Header: Month & Year Navigator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <select
                  value={currentMonth}
                  onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
                  className="h-8 text-xs font-bold bg-slate-100 hover:bg-slate-200 border-none rounded-lg px-2 text-slate-800 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={idx} value={idx}>{m}</option>
                  ))}
                </select>

                <select
                  value={currentYear}
                  onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                  className="h-8 text-xs font-bold bg-slate-100 hover:bg-slate-200 border-none rounded-lg px-2 text-slate-800 focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  {Array.from({ length: 10 }, (_, i) => 2023 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={prevMonth}
                  className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={nextMonth}
                  className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setIsOpen(false)}
                  className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg ml-1"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Quick shortcuts */}
            <div className="flex items-center gap-1.5 pb-1 border-b border-slate-100">
              <span className="text-[10px] text-slate-400 font-medium mr-1">Pilih cepat:</span>
              <button
                type="button"
                onClick={() => handleQuickSelect('today')}
                className="px-2 py-0.5 text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200 transition-colors"
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect('yesterday')}
                className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
              >
                Kemarin
              </button>
              <button
                type="button"
                onClick={() => handleQuickSelect('tomorrow')}
                className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
              >
                Besok
              </button>
            </div>

            {/* Day of Week Headers */}
            <div className="grid grid-cols-7 gap-1 text-center text-[10.5px] font-bold">
              {DAY_NAMES.map((d, i) => (
                <div 
                  key={d} 
                  className={`py-1 rounded ${i === 0 ? 'text-red-600 bg-red-50/50' : 'text-slate-600'}`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((item, idx) => {
                const isSelected = value === item.dateStr;
                const isRed = item.holidayInfo.isRedDate;
                const isCurrent = item.isCurrentMonth;
                const isToday = new Date().toISOString().split('T')[0] === item.dateStr;

                return (
                  <button
                    key={idx}
                    type="button"
                    title={item.holidayInfo.holidayName ? `${item.dateStr}: 🔴 ${item.holidayInfo.holidayName}` : item.dateStr}
                    onClick={() => {
                      onChange(item.dateStr);
                      setIsOpen(false);
                    }}
                    className={`relative flex flex-col items-center justify-center h-8 rounded-lg text-xs font-semibold transition-all group ${
                      isSelected
                        ? isRed
                          ? 'bg-red-600 text-white shadow-sm ring-2 ring-red-300'
                          : 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                        : isRed
                        ? isCurrent
                          ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200/60 font-bold'
                          : 'text-red-300 bg-red-50/20 hover:bg-red-50/40'
                        : isCurrent
                        ? isToday
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold hover:bg-emerald-100'
                          : 'text-slate-700 hover:bg-slate-100'
                        : 'text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{item.dayNumber}</span>
                    
                    {/* Small red dot for national holiday / academic event */}
                    {isRed && (
                      <span 
                        className={`w-1.5 h-1.5 rounded-full absolute bottom-0.5 ${
                          isSelected ? 'bg-white' : 'bg-red-600 animate-pulse'
                        }`} 
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend / Info Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[9.5px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-red-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-red-600" /> Tgl Merah / Libur
                </span>
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" /> Hari Ini
                </span>
              </div>
              <span className="text-slate-400">Klik tanggal untuk memilih</span>
            </div>
          </div>
        )}
      </div>

      {/* Holiday Notice Banner below input */}
      {showHolidayNotice && holidayInfo.isRedDate && (
        <div className={`p-2 bg-red-50 border border-red-200 rounded-xl text-[11px] text-red-900 flex items-start gap-2 shadow-2xs ${noticeCompact ? 'p-1.5 text-[10px]' : ''}`}>
          <span className="text-base leading-none shrink-0 mt-0.5">🔴</span>
          <div className="leading-tight flex-1">
            <p className="font-bold flex items-center gap-1">
              <span>
                {holidayInfo.holidayType === 'sunday'
                  ? 'Hari Minggu'
                  : holidayInfo.holidayType === 'academic'
                  ? `Libur Kalender: ${holidayInfo.holidayName}`
                  : `Libur Nasional: ${holidayInfo.holidayName}`}
              </span>
            </p>
            <p className="text-[10px] text-red-700 mt-0.5">
              {holidayInfo.description || 'Tanggal merah / libur resmi madrasah. Tetap dapat diinput jika ada KBM pengganti atau tugas dinas khusus.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarHolidayPicker;
