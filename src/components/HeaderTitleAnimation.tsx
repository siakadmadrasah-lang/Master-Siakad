import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export const FONT_STYLE_OPTIONS = [
  { value: 'sans-black', label: 'Sans-Serif Tebal (Black/Bold)', class: 'font-sans font-black' },
  { value: 'serif-bold', label: 'Serif Elegant (Bold)', class: 'font-serif font-bold' },
  { value: 'serif-italic', label: 'Serif Italic (Elegant Italik)', class: 'font-serif italic font-bold' },
  { value: 'sans-italic', label: 'Sans-Serif Italic (Modern)', class: 'font-sans italic font-semibold' },
  { value: 'mono-bold', label: 'Monospace Code (Tebal)', class: 'font-mono font-bold' },
  { value: 'uppercase-bold', label: 'KAPITAL / UPPERCASE', class: 'font-sans uppercase font-extrabold tracking-wider' },
  { value: 'handwritten', label: 'Script / Handwritten Style', class: 'font-serif italic font-normal tracking-wide' },
];

export const getFontClassName = (fontKey?: string) => {
  switch (fontKey) {
    case 'serif-bold': return 'font-serif font-bold';
    case 'serif-italic': return 'font-serif italic font-bold';
    case 'sans-italic': return 'font-sans italic font-semibold';
    case 'mono-bold': return 'font-mono font-bold tracking-tight';
    case 'uppercase-bold': return 'font-sans uppercase font-extrabold tracking-wider';
    case 'handwritten': return 'font-serif italic font-normal tracking-wide';
    case 'sans-black': default: return 'font-sans font-black tracking-tight';
  }
};

export const getColorStyleAndClass = (colorKey?: string, defaultFallback: string = 'text-slate-900') => {
  if (!colorKey) {
    return { className: defaultFallback, style: {} };
  }
  if (colorKey === 'gradient-emerald') {
    return {
      className: 'text-transparent bg-clip-text bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 font-bold',
      style: {}
    };
  }
  if (colorKey === 'gradient-amber') {
    return {
      className: 'text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 font-bold',
      style: {}
    };
  }
  if (colorKey === 'gradient-cyan') {
    return {
      className: 'text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-teal-300 font-bold',
      style: {}
    };
  }
  if (colorKey === 'gradient-purple') {
    return {
      className: 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-pink-400 font-bold',
      style: {}
    };
  }
  if (colorKey.startsWith('#') || colorKey.startsWith('rgb')) {
    return { className: '', style: { color: colorKey } };
  }
  if (colorKey.includes('text-')) {
    return { className: colorKey, style: {} };
  }
  return { className: `text-${colorKey}`, style: {} };
};

export const renderWordWithStyle = (
  text: string, 
  color?: string, 
  font?: string, 
  defaultColorFallback: string = 'text-slate-900'
) => {
  if (!text) return null;
  const fontClass = getFontClassName(font);
  const colorObj = getColorStyleAndClass(color, defaultColorFallback);

  if (text.includes('@')) {
    const parts = text.split('@');
    return (
      <span className={`${fontClass} ${colorObj.className}`} style={colorObj.style}>
        {parts.map((p, idx) => (
          <React.Fragment key={idx}>
            {p}
            {idx < parts.length - 1 && (
              <span className="text-amber-500 font-extrabold inline-block drop-shadow-[0_1px_2px_rgba(245,158,11,0.5)] px-[0.5px]">@</span>
            )}
          </React.Fragment>
        ))}
      </span>
    );
  }

  return (
    <span className={`${fontClass} ${colorObj.className}`} style={colorObj.style}>
      {text}
    </span>
  );
};

interface HeaderTitleAnimationProps {
  part1?: string;
  part1Color?: string;
  part1Font?: string;
  part2?: string;
  part2Color?: string;
  part2Font?: string;
  text?: string;
  animationType?: 'static' | 'typewriter' | 'marquee' | 'bounce' | 'slide' | string;
  className?: string;
}

export const renderHeaderLogoText = (name: string) => {
  if (!name) return 'Si@Kad';
  if (name.includes('@')) {
    const parts = name.split('@');
    return (
      <>
        {parts[0]}
        <span className="text-amber-500 font-extrabold inline-block drop-shadow-[0_1px_2px_rgba(245,158,11,0.5)]">@</span>
        {parts[1]}
      </>
    );
  }
  return name;
};

export const HeaderTitleAnimation: React.FC<HeaderTitleAnimationProps> = ({
  part1,
  part1Color = '#0f172a',
  part1Font = 'sans-black',
  part2,
  part2Color = '#059669',
  part2Font = 'serif-bold',
  text,
  animationType = 'static',
  className = '',
}) => {
  let p1 = part1;
  let p2 = part2;

  if (p1 === undefined && p2 === undefined && text) {
    const words = text.trim().split(/\s+/);
    p1 = words[0] || 'Si@Kad';
    p2 = words.slice(1).join(' ') || '';
  }

  if (!p1 && !p2) {
    p1 = 'Si@Kad';
    p2 = 'Madrasah';
  }

  const fullText = `${p1 || ''} ${p2 || ''}`.trim();
  const [charCount, setCharCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (animationType !== 'typewriter') return;

    const total = fullText.length;
    let timer: NodeJS.Timeout;

    if (!isDeleting && charCount < total) {
      timer = setTimeout(() => setCharCount(prev => prev + 1), 90);
    } else if (!isDeleting && charCount === total) {
      timer = setTimeout(() => setIsDeleting(true), 3200);
    } else if (isDeleting && charCount > 0) {
      timer = setTimeout(() => setCharCount(prev => prev - 1), 45);
    } else if (isDeleting && charCount === 0) {
      timer = setTimeout(() => setIsDeleting(false), 500);
    }

    return () => clearTimeout(timer);
  }, [charCount, isDeleting, fullText, animationType]);

  const renderBothParts = () => {
    return (
      <span className="inline-flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
        {p1 && renderWordWithStyle(p1, part1Color, part1Font, 'text-slate-900')}
        {p2 && renderWordWithStyle(p2, part2Color, part2Font, 'text-emerald-600')}
      </span>
    );
  };

  // 1. Typewriter mode
  if (animationType === 'typewriter') {
    const len1 = (p1 || '').length;
    const typedP1 = (p1 || '').slice(0, Math.min(charCount, len1));
    const typedP2 = charCount > len1 ? (p2 || '').slice(0, Math.max(0, charCount - len1 - 1)) : '';

    return (
      <h1 className={`text-lg md:text-xl leading-none inline-flex items-center gap-1 ${className}`}>
        {typedP1 && renderWordWithStyle(typedP1, part1Color, part1Font, 'text-slate-900')}
        {typedP2 && renderWordWithStyle(typedP2, part2Color, part2Font, 'text-emerald-600')}
        <motion.span
          animate={{ opacity: [1, 0, 1] }}
          transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }}
          className="inline-block w-[2.5px] h-[0.8em] bg-emerald-600 rounded-full ml-0.5"
        />
      </h1>
    );
  }

  // 2. Marquee mode
  if (animationType === 'marquee') {
    return (
      <div className={`overflow-hidden max-w-[170px] sm:max-w-[240px] md:max-w-[300px] whitespace-nowrap block ${className}`}>
        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          className="inline-flex items-center gap-3 whitespace-nowrap text-lg md:text-xl leading-none"
        >
          {renderBothParts()}
          <span className="text-emerald-500 font-extrabold text-xs">•</span>
          {renderBothParts()}
          <span className="text-emerald-500 font-extrabold text-xs">•</span>
        </motion.div>
      </div>
    );
  }

  // 3. Bounce mode
  if (animationType === 'bounce') {
    return (
      <motion.h1
        animate={{ y: [0, -2.5, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        className={`text-lg md:text-xl leading-none drop-shadow-xs ${className}`}
      >
        {renderBothParts()}
      </motion.h1>
    );
  }

  // 4. Slide mode
  if (animationType === 'slide') {
    return (
      <motion.h1
        initial={{ opacity: 0, x: -15 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className={`text-lg md:text-xl leading-none ${className}`}
      >
        {renderBothParts()}
      </motion.h1>
    );
  }

  // 5. Static mode (default)
  return (
    <h1 className={`text-lg md:text-xl leading-none ${className}`}>
      {renderBothParts()}
    </h1>
  );
};

export default HeaderTitleAnimation;
