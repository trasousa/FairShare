import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface AppTooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export const AppTooltip: React.FC<AppTooltipProps> = ({ 
  content, 
  children, 
  position = 'top',
  delay = 200 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLElement>(null);
  const timerRef = useRef<NodeJS.Timeout>();

    const updatePosition = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        
        let top = 0;
        let left = 0;
  
        switch (position) {
          case 'top':
            top = rect.top - 10;
            left = rect.left + rect.width / 2;
            break;
          case 'bottom':
            top = rect.bottom + 10;
            left = rect.left + rect.width / 2;
            break;
        }
        setCoords({ top, left });
      }
    };
  
    const handleMouseEnter = () => {
      updatePosition();
      timerRef.current = setTimeout(() => {
        setIsVisible(true);
      }, delay);
    };
  
    const handleMouseLeave = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setIsVisible(false);
    };
  
    useEffect(() => {
      window.addEventListener('scroll', handleMouseLeave);
      window.addEventListener('resize', handleMouseLeave);
      return () => {
        if (timerRef.current) clearTimeout(timerRef.current);
        window.removeEventListener('scroll', handleMouseLeave);
        window.removeEventListener('resize', handleMouseLeave);
      };
    }, []);
  
    return (
      <>
        <span
          ref={triggerRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="inline-flex items-center"
        >
          {children}
        </span>
        {isVisible && createPortal(
          <div 
            className="fixed z-[9999] pointer-events-none"
            style={{ 
              top: coords.top, 
              left: coords.left,
              transform: position === 'top' ? 'translate(-50%, -100%)' : 'translate(-50%, 0)'
            }}
          >
            <div className="bg-slate-900/95 text-white text-[12px] leading-relaxed font-medium px-4 py-2.5 rounded-2xl shadow-2xl border border-indigo-500/30 backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 max-w-[240px] text-center">
              {content}
              <div 
                className={`absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-slate-900 rotate-45 border-indigo-500/30 ${
                  position === 'top' ? 'bottom-[-5px] border-b border-r' : 'top-[-5px] border-t border-l'
                }`}
              />
            </div>
          </div>,
          document.body
        )}
      </>
    );
  };
