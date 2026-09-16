import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { getFontClassName, getColorStyleAndClass } from './HeaderTitleAnimation';

export const renderTextWithGoldenAt = (text: string) => {
  if (!text) return null;
  if (text.includes('@')) {
    const parts = text.split('@');
    return (
      <>
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            {part}
            {index < parts.length - 1 && (
              <span 
                className="text-amber-400 font-extrabold inline-block drop-shadow-[0_1px_3px_rgba(245,158,11,0.6)] px-[0.5px]"
                style={{ WebkitTextFillColor: '#f59e0b' }}
              >
                @
              </span>
            )}
          </React.Fragment>
        ))}
      </>
    );
  }
  return text;
};

export type TitleAnimationType = 'typewriter' | 'marquee' | 'marquee-bounce' | 'slide' | 'static' | string;

interface HeroTypewriterTitleProps {
  title?: string;
  line1?: string;
  line1Color?: string;
  line1Font?: string;
  line2?: string;
  line2Color?: string;
  line2Font?: string;
  dark?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseTime?: number;
  isVisible?: boolean;
  animationType?: TitleAnimationType;
}

export const HeroTypewriterTitle: React.FC<HeroTypewriterTitleProps> = ({
  title,
  line1,
  line1Color,
  line1Font = 'sans-black',
  line2,
  line2Color,
  line2Font = 'serif-italic',
  dark = false,
  size = 'md',
  className = '',
  typingSpeed = 85,
  deletingSpeed = 40,
  pauseTime = 3200,
  isVisible = true,
  animationType = 'typewriter',
}) => {
  let fullLine1 = line1 || '';
  let fullLine2 = line2 || '';

  if (!line1 && !line2 && title) {
    const trimmed = title.trim();
    if (trimmed.includes('\n')) {
      const parts = trimmed.split('\n');
      fullLine1 = parts[0] || '';
      fullLine2 = parts.slice(1).join(' ');
    } else if (trimmed.includes('|')) {
      const parts = trimmed.split('|');
      fullLine1 = parts[0]?.trim() || '';
      fullLine2 = parts[1]?.trim() || '';
    } else {
      const words = trimmed.split(/\s+/);
      if (words.length > 1) {
        const mid = Math.ceil(words.length / 2);
        fullLine1 = words.slice(0, mid).join(' ');
        fullLine2 = words.slice(mid).join(' ');
      } else {
        fullLine1 = trimmed;
        fullLine2 = '';
      }
    }
  }

  if (!fullLine1 && !fullLine2) {
    fullLine1 = 'Si@Kad';
    fullLine2 = 'Madrasah';
  }

  const hasLine2 = fullLine2.length > 0;
  const totalLength = fullLine1.length + (hasLine2 ? 1 + fullLine2.length : 0);

  const [charCount, setCharCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (animationType !== 'typewriter') return;

    let timer: NodeJS.Timeout;

    if (!isDeleting && charCount < totalLength) {
      timer = setTimeout(() => {
        setCharCount((prev) => prev + 1);
      }, typingSpeed);
    } else if (!isDeleting && charCount === totalLength) {
      timer = setTimeout(() => {
        setIsDeleting(true);
      }, pauseTime);
    } else if (isDeleting && charCount > 0) {
      timer = setTimeout(() => {
        setCharCount((prev) => prev - 1);
      }, deletingSpeed);
    } else if (isDeleting && charCount === 0) {
      timer = setTimeout(() => {
        setIsDeleting(false);
      }, 500);
    }

    return () => clearTimeout(timer);
  }, [charCount, isDeleting, totalLength, typingSpeed, deletingSpeed, pauseTime, animationType]);

  const typed1 = fullLine1.slice(0, Math.min(charCount, fullLine1.length));
  const hasStartedLine2 = hasLine2 && charCount > fullLine1.length;
  const typed2 = hasStartedLine2
    ? fullLine2.slice(0, Math.max(0, charCount - fullLine1.length - 1))
    : '';

  let sizeClasses = 'text-sm sm:text-base font-black';
  let cursorSize = 'w-[2.5px] sm:w-[3.5px] h-[0.8em]';

  if (size === 'xs') {
    sizeClasses = 'text-[11px] sm:text-xs font-bold';
    cursorSize = 'w-[2px] h-[0.75em]';
  } else if (size === 'sm') {
    sizeClasses = 'text-xs sm:text-sm font-extrabold';
    cursorSize = 'w-[2.5px] h-[0.75em]';
  } else if (size === 'lg') {
    sizeClasses = 'text-lg sm:text-2xl font-black';
    cursorSize = 'w-[3.5px] sm:w-[4.5px] h-[0.85em]';
  } else if (size === 'xl') {
    sizeClasses = 'text-xl xs:text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black leading-tight';
    cursorSize = 'w-[2.5px] sm:w-[5px] h-[0.75em]';
  }

  // Color & font formatting for line1 and line2
  const line1FontClass = getFontClassName(line1Font);
  const defaultLine1Color = dark ? 'text-white' : 'text-slate-900';
  const line1ColorObj = getColorStyleAndClass(line1Color, defaultLine1Color);

  const line2FontClass = getFontClassName(line2Font);
  const defaultLine2Color = dark ? 'gradient-emerald' : 'text-emerald-600';
  const line2ColorObj = getColorStyleAndClass(line2Color, defaultLine2Color);

  const cursorColor = dark ? 'bg-emerald-400' : 'bg-emerald-600';

  const renderStyledLine1 = (textToRender: string) => (
    <span className={`${line1FontClass} ${line1ColorObj.className} inline-block`} style={line1ColorObj.style}>
      {renderTextWithGoldenAt(textToRender)}
    </span>
  );

  const renderStyledLine2 = (textToRender: string) => (
    <span className={`${line2FontClass} ${line2ColorObj.className} inline-block pr-1.5`} style={line2ColorObj.style}>
      {renderTextWithGoldenAt(textToRender)}
    </span>
  );

  // 1. TYPEWRITER MODE
  if (animationType === 'typewriter') {
    return (
      <div 
        className={`w-full text-left pl-0 ml-0 inline-flex items-center flex-wrap sm:flex-nowrap gap-x-1.5 sm:gap-x-2.5 gap-y-0.5 leading-tight tracking-tight transition-all duration-1000 ${sizeClasses} ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        } ${className}`}
      >
        <span className="inline-block whitespace-nowrap shrink-0">
          {renderStyledLine1(typed1)}
        </span>
        {hasStartedLine2 && (
          <span className="inline-block whitespace-nowrap shrink-0 pr-1">
            {renderStyledLine2(typed2)}
          </span>
        )}
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          className={`inline-block rounded-full ml-1 sm:ml-1.5 align-middle shadow-xs shrink-0 ${cursorSize} ${cursorColor}`}
        />
      </div>
    );
  }

  // 2. CONTINUOUS MARQUEE MODE
  if (animationType === 'marquee' || animationType === 'running' || animationType === 'marquee-left') {
    return (
      <div className={`w-full overflow-hidden text-left pl-0 ml-0 block py-1 transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      } ${className}`}>
        <div className="w-full overflow-hidden whitespace-nowrap relative flex">
          <motion.div
            className={`inline-flex items-center whitespace-nowrap gap-x-6 leading-tight tracking-tight ${sizeClasses} shrink-0`}
            animate={{ x: ['0%', '-50%'] }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            {[1, 2, 3, 4].map((idx) => (
              <div key={idx} className="inline-flex items-center gap-x-2.5 shrink-0">
                {renderStyledLine1(fullLine1)}
                {hasLine2 && renderStyledLine2(fullLine2)}
                <span className="text-emerald-500/70 font-semibold text-sm px-1.5">•</span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    );
  }

  // 3. MARQUEE BOUNCE MODE
  if (animationType === 'marquee-bounce' || animationType === 'bounce') {
    return (
      <div className={`w-full overflow-hidden text-left pl-0 ml-0 block py-1 transition-all duration-1000 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      } ${className}`}>
        <div className="w-full overflow-hidden whitespace-nowrap relative">
          <motion.div
            className={`inline-flex items-center whitespace-nowrap gap-x-3 leading-tight tracking-tight ${sizeClasses}`}
            animate={{ x: ['0%', '28%', '0%'] }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {renderStyledLine1(fullLine1)}
            {hasLine2 && renderStyledLine2(fullLine2)}
          </motion.div>
        </div>
      </div>
    );
  }

  // 4. SLIDE & FADE IN MODE
  if (animationType === 'slide') {
    return (
      <div className={`w-full text-left pl-0 ml-0 block py-1 transition-all duration-1000 ${className}`}>
        <motion.div
          initial={{ opacity: 0, x: -35 }}
          animate={{ opacity: isVisible ? 1 : 0, x: isVisible ? 0 : -35 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`inline-flex items-center flex-wrap gap-x-2.5 leading-tight tracking-tight ${sizeClasses}`}
        >
          {renderStyledLine1(fullLine1)}
          {hasLine2 && renderStyledLine2(fullLine2)}
        </motion.div>
      </div>
    );
  }

  // 5. STATIC MODE
  return (
    <div className={`w-full text-left pl-0 ml-0 inline-flex items-center flex-wrap gap-x-2.5 leading-tight tracking-tight ${sizeClasses} ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
    } ${className}`}>
      {renderStyledLine1(fullLine1)}
      {hasLine2 && renderStyledLine2(fullLine2)}
    </div>
  );
};

export default HeroTypewriterTitle;
