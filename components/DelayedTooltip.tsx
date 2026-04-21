
import React, { useState, useRef, useEffect } from 'react';

interface DelayedTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  delay?: number;
}

const DelayedTooltip: React.FC<DelayedTooltipProps> = ({ content, children, delay = 350 }) => {
  const [show, setShow] = useState(false);
  const timerRef = useRef<number | null>(null);

  const handleMouseEnter = () => {
    timerRef.current = window.setTimeout(() => {
      setShow(true);
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setShow(false);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <div className="relative inline-block" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      {children}
      {show && (
        <div className="absolute z-50 left-full ml-2 top-0 bg-white border border-slate-200 shadow-xl p-3 rounded-lg w-64 text-sm animate-in fade-in zoom-in duration-200 pointer-events-none">
          {content}
        </div>
      )}
    </div>
  );
};

export default DelayedTooltip;
