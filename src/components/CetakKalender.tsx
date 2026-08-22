"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft, Calendar, ExternalLink } from 'lucide-react';
import KopSurat from '@/components/KopSurat';
import PenandatanganDokumen from '@/components/PenandatanganDokumen';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { useMadrasah } from '@/contexts/MadrasahContext';
import { usePrintSecurity } from '@/contexts/PrintSecurityContext';
import PrintSecurityIndicator from '@/components/PrintSecurityIndicator';
import { Badge } from '@/components/ui/badge';

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  end_date?: string;
  category: string;
  description?: string;
}

interface CetakKalenderProps {
  events: CalendarEvent[];
  currentDate: Date;
  onClose: () => void;
}

const CATEGORIES: Record<string, { label: string; bg: string; text: string }> = {
  academic: { label: 'Akademik', bg: 'bg-blue-100', text: 'text-blue-800' },
  holiday: { label: 'Libur', bg: 'bg-red-100', text: 'text-red-800' },
  event: { label: 'Kegiatan', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  exam: { label: 'Ujian', bg: 'bg-purple-100', text: 'text-purple-800' },
};

export const CetakKalender: React.FC<CetakKalenderProps> = ({
  events,
  currentDate,
  onClose
}) => {
  const { settings } = useSiteSettings();
  const { activeMadrasah } = useMadrasah();
  const { requirePrintAuth } = usePrintSecurity();
  const [selectedBulan, setSelectedBulan] = useState<string>(String(currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState<string>(String(currentDate.getFullYear()));

  const printConfig = settings.print_settings || {
    margin_top: 2, margin_bottom: 2, margin_left: 2, margin_right: 2,
    paper_size: 'A4', font_size: 10, show_kop: true, show_signature: true
  };

  const BULAN_NAMES = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const filteredEvents = events.filter(e => {
    const d = new Date(e.date);
    if (selectedBulan !== 'all' && (d.getMonth() + 1) !== parseInt(selectedBulan)) {
      return false;
    }
    if (selectedYear !== 'all' && d.getFullYear() !== parseInt(selectedYear)) {
      return false;
    }
    return true;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handlePrint = () => {
    requirePrintAuth(() => {
      window.print();
    }, 'Mencetak Kalender Akademik Madrasah');
  };

  const monthLabel = selectedBulan !== 'all' ? BULAN_NAMES[parseInt(selectedBulan) - 1].toUpperCase() : 'SEMUA BULAN';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col print:bg-white text-slate-800">
      {/* Print Control Bar */}
      <div className="sticky top-0 z-[100] bg-white border-b p-4 flex flex-wrap justify-between items-center print:hidden shadow-md gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onClose} className="font-bold text-gray-700">
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Kalender
          </Button>
          <div className="h-6 w-px bg-slate-200" />
          <div className="flex items-center gap-2">
            <select 
              value={selectedBulan} 
              onChange={e => setSelectedBulan(e.target.value)}
              className="text-xs font-bold border rounded-lg p-2 bg-slate-50"
            >
              <option value="all">Semua Bulan</option>
              {BULAN_NAMES.map((b, idx) => (
                <option key={idx} value={String(idx + 1)}>{b}</option>
              ))}
            </select>
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(e.target.value)}
              className="text-xs font-bold border rounded-lg p-2 bg-slate-50"
            >
              <option value={String(currentDate.getFullYear())}>{currentDate.getFullYear()}</option>
              <option value={String(currentDate.getFullYear() + 1)}>{currentDate.getFullYear() + 1}</option>
              <option value={String(currentDate.getFullYear() - 1)}>{currentDate.getFullYear() - 1}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <PrintSecurityIndicator />
          <Button 
            onClick={handlePrint}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 shadow-lg rounded-xl text-xs"
          >
            <Printer className="w-4 h-4 mr-2" /> Cetak Dokumen (A4 / F4)
          </Button>
        </div>
      </div>

      {/* Paper Container */}
      <div className="flex-1 p-8 overflow-y-auto print:p-0 print:overflow-visible">
        <div id="print-area-kalender" className="mx-auto print:w-full">
          <div 
            className="bg-white mx-auto shadow-xl print:shadow-none print:m-0 print:p-0 print:w-full flex flex-col text-black font-sans"
            style={{ 
              width: '210mm', 
              minHeight: printConfig.paper_size === 'F4' ? '330mm' : '297mm',
              padding: `${printConfig.margin_top}cm ${printConfig.margin_right}cm ${printConfig.margin_bottom}cm ${printConfig.margin_left}cm`,
              boxSizing: 'border-box',
              position: 'relative'
            }}
          >
            {printConfig.show_kop && <KopSurat />}

            <div className="text-center mb-6 mt-2">
              <h2 className="text-base sm:text-lg font-bold underline uppercase tracking-wider">
                AGENDA & KALENDER AKADEMIK MADRASAH
              </h2>
              <p className="text-xs sm:text-sm font-semibold uppercase mt-1 text-slate-800">
                PERIODE: {monthLabel} TAHUN {selectedYear}
              </p>
            </div>

            {/* Event List Table */}
            <div className="mb-6 flex-1">
              {filteredEvents.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-gray-300 rounded text-gray-500 text-xs italic">
                  Belum ada agenda atau kegiatan yang dijadwalkan pada periode ini.
                </div>
              ) : (
                <table className="w-full border-collapse border border-black text-xs">
                  <thead>
                    <tr className="bg-gray-100 text-center font-bold">
                      <th className="border border-black p-2 w-10">No</th>
                      <th className="border border-black p-2 w-32">Tanggal</th>
                      <th className="border border-black p-2 w-28">Kategori</th>
                      <th className="border border-black p-2">Nama Agenda / Kegiatan</th>
                      <th className="border border-black p-2">Keterangan / Rincian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.map((item, idx) => {
                      const cat = CATEGORIES[item.category] || { label: item.category, bg: 'bg-gray-100', text: 'text-gray-800' };
                      const startDate = new Date(item.date).toLocaleDateString('id-ID', {
                        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                      });
                      const endDate = item.end_date ? new Date(item.end_date).toLocaleDateString('id-ID', {
                        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                      }) : null;

                      return (
                        <tr key={item.id} className="align-top">
                          <td className="border border-black p-2 text-center font-semibold">{idx + 1}</td>
                          <td className="border border-black p-2 whitespace-nowrap">
                            <div className="font-semibold">{startDate}</div>
                            {endDate && (
                              <div className="text-[10px] text-gray-600 mt-0.5">s/d {endDate}</div>
                            )}
                          </td>
                          <td className="border border-black p-2 text-center font-semibold">
                            <span className="px-2 py-0.5 rounded text-[10px] border border-black font-bold">
                              {cat.label}
                            </span>
                          </td>
                          <td className="border border-black p-2 font-bold">{item.title}</td>
                          <td className="border border-black p-2 whitespace-pre-wrap leading-relaxed">
                            {item.description || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Signature Block */}
            {printConfig.show_signature && (
              <div className="mt-8 pt-4">
                <PenandatanganDokumen 
                  tanggalCetak={new Date().toISOString().split('T')[0]} 
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { 
            size: ${printConfig.paper_size === 'F4' ? '215mm 330mm' : 'A4'} portrait; 
            margin: 0 !important; 
          }
          html, body { 
            height: auto !important; 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden, nav, header, aside { display: none !important; }
          #print-area-kalender { 
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
          }
          #print-area-kalender > div { 
            box-shadow: none !important; 
            border: none !important; 
            width: 100% !important; 
            min-height: 0 !important;
            padding: ${printConfig.margin_top}cm ${printConfig.margin_right}cm ${printConfig.margin_bottom}cm ${printConfig.margin_left}cm !important;
          }
        }
      ` }} />
    </div>
  );
};

export default CetakKalender;
