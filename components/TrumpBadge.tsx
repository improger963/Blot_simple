
import React from 'react';
import { Suit } from '../types';
import { SUIT_SYMBOLS } from '../constants';

interface TrumpBadgeProps {
  suit: Suit | null;
  isNoTrump?: boolean;
}

export const TrumpBadge: React.FC<TrumpBadgeProps> = ({ suit, isNoTrump = false }) => {
  const isRed = suit && (suit === 'H' || suit === 'D');
  
  return (
    <div className="relative group cursor-default select-none">
       {/* Outer Glow Ring */}
       <div className={`
           absolute -inset-1 rounded-full opacity-60 blur-sm animate-pulse-slow
           ${isNoTrump 
               ? 'bg-gradient-to-tr from-indigo-600 to-purple-400' 
               : 'bg-gradient-to-tr from-amber-600 to-yellow-400'}
       `}></div>
       
       {/* Main Body */}
       <div className={`
           relative w-14 h-14 md:w-16 md:h-16 rounded-full 
           bg-gradient-to-b from-slate-800 to-black 
           border-2 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),0_4px_8px_rgba(0,0,0,0.5)] 
           flex flex-col items-center justify-center
           ${isNoTrump ? 'border-indigo-400' : 'border-amber-400'}
       `}>
            
            {/* Gloss */}
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-t-full pointer-events-none" />

            {/* Icon */}
            <span className={`
                text-3xl md:text-4xl font-black drop-shadow-[0_2px_0_rgba(0,0,0,0.5)] transform transition-transform group-hover:scale-110
                ${isNoTrump ? 'text-indigo-300' : (isRed ? 'text-red-500' : 'text-slate-200')}
            `}>
                {isNoTrump ? 'Ø' : (suit && SUIT_SYMBOLS[suit])}
            </span>
       </div>

       {/* Label Pill */}
       <div className={`
           absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black border rounded-full px-2 py-0.5 shadow-lg
           ${isNoTrump ? 'border-indigo-500/50' : 'border-amber-500/50'}
       `}>
           <span className={`
               text-[8px] md:text-[10px] font-black uppercase tracking-widest whitespace-nowrap block leading-none
               ${isNoTrump ? 'text-indigo-400' : 'text-amber-500'}
           `}>
               {isNoTrump ? 'NO TRUMP' : 'TAKER'}
           </span>
       </div>
    </div>
  );
};
