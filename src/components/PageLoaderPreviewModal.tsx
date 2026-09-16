import React, { useState, useEffect } from 'react';
import { X, Play, Eye, Sparkles } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { InitialPageLoader } from './InitialPageLoader';

interface PageLoaderPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: any;
  isRuangGuru?: boolean;
}

export const PageLoaderPreviewModal: React.FC<PageLoaderPreviewModalProps> = ({
  isOpen,
  onClose,
  settings,
  isRuangGuru = false,
}) => {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!isOpen) return;
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-none w-screen h-screen p-0 m-0 border-0 bg-transparent shadow-none overflow-hidden [&>button:last-child]:hidden">
        <div className="relative w-full h-full">
          {/* Active Custom Loader Component */}
          <InitialPageLoader
            customSettings={settings}
            isRuangGuru={isRuangGuru}
          />

          {/* Floating Control Overlay on Top Right */}
          <div className="absolute top-6 right-6 z-[100000] flex items-center gap-3">
            <div className="bg-slate-900/80 backdrop-blur-md border border-white/20 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-300 shadow-xl flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span>Mode Pratinjau ({countdown}s)</span>
            </div>
            <Button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/30 text-white rounded-full h-9 px-4 text-xs font-bold backdrop-blur-md border border-white/30 shadow-xl flex items-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" /> Tutup Preview
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PageLoaderPreviewModal;
