import React from 'react';
import { BookOpen } from 'lucide-react';

export const InitialPageLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950 text-white select-none transition-opacity duration-300">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-pulse"></div>

      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Animated Brand Logo Icon */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 p-0.5 shadow-xl shadow-emerald-500/25 animate-bounce">
            <div className="w-full h-full bg-slate-950 rounded-2xl flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
          </span>
        </div>

        {/* Brand Name */}
        <div className="text-center space-y-1 mt-2">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
            <span>Si@Kad</span>
            <span className="text-emerald-400 italic font-serif">Madrasah</span>
          </h1>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest">
            Sistem Informasi Akademik
          </p>
        </div>

        {/* Spinner Bar */}
        <div className="w-44 h-1.5 bg-slate-800 rounded-full overflow-hidden mt-3">
          <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 rounded-full animate-indeterminate"></div>
        </div>
      </div>
    </div>
  );
};

export default InitialPageLoader;
