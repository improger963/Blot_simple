
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type BubbleVariant = 'gold' | 'blue' | 'purple' | 'gray' | 'standard';
export type BubblePosition = 'top-right' | 'bottom-left' | 'top-left' | 'bottom-right';

interface ActionBubbleProps {
  text: string;
  variant?: BubbleVariant;
  position?: BubblePosition;
  isVisible: boolean;
}

export const ActionBubble: React.FC<ActionBubbleProps> = ({ 
    text, 
    variant = 'standard', 
    position = 'top-right', 
    isVisible 
}) => {
  
  // Design Config based on Variant
  const styles = {
      gold: {
          bg: 'bg-amber-950/90',
          border: 'border-amber-500',
          text: 'text-amber-100',
          shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]',
          icon: '👑'
      },
      blue: {
          bg: 'bg-cyan-950/90',
          border: 'border-cyan-500',
          text: 'text-cyan-100',
          shadow: 'shadow-[0_0_20px_rgba(6,182,212,0.4)]',
          icon: '✨'
      },
      purple: {
          bg: 'bg-fuchsia-950/90',
          border: 'border-fuchsia-500',
          text: 'text-fuchsia-100',
          shadow: 'shadow-[0_0_20px_rgba(217,70,239,0.4)]',
          icon: '🔥'
      },
      gray: {
          bg: 'bg-slate-800/90',
          border: 'border-slate-600',
          text: 'text-slate-300',
          shadow: 'shadow-lg',
          icon: '🛑'
      },
      standard: {
          bg: 'bg-black/80',
          border: 'border-white/20',
          text: 'text-white',
          shadow: 'shadow-lg',
          icon: '💬'
      }
  };

  const currentStyle = styles[variant];

  // Positioning Logic relative to Avatar center/container
  const positionClasses = {
      'top-right': 'bottom-full left-[80%] mb-2',
      'bottom-right': 'top-full left-[80%] mt-2', // Pushes right
      'bottom-left': 'top-full right-[80%] mt-2', // Pushes left (Better for Opponent on Right side)
      'top-left': 'bottom-full right-[80%] mb-2'
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 10, x: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className={`
                absolute z-50 whitespace-nowrap px-4 py-2 rounded-2xl border backdrop-blur-md flex items-center gap-2
                ${currentStyle.bg} 
                ${currentStyle.border} 
                ${currentStyle.text} 
                ${currentStyle.shadow}
                ${positionClasses[position]}
            `}
            style={{ transformOrigin: position.includes('bottom') ? 'top left' : 'bottom left' }}
        >
            {/* Tail */}
            <div className={`
                absolute w-2 h-2 rotate-45 border
                ${currentStyle.bg} ${currentStyle.border}
                ${position.includes('top') ? 'bottom-[-5px] border-t-0 border-l-0' : 'top-[-5px] border-b-0 border-r-0'}
                ${position.includes('left') ? 'right-4' : 'left-4'}
            `} />
            
            <span className="text-xs">{currentStyle.icon}</span>
            <span className="font-black uppercase tracking-wider text-xs md:text-sm leading-none pt-0.5">
                {text}
            </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
