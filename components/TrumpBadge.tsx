import React from 'react';
import { Suit } from '../types';
import { SUIT_SYMBOLS } from '../constants';

interface TrumpBadgeProps {
  suit: Suit;
}

export const TrumpBadge: React.FC<TrumpBadgeProps> = ({ suit }) => {
  const isRed = suit === 'H' || suit === 'D';
  
  return (
    <div className="relative group cursor-default select-none">
       {/* Outer Glow Ring */}
       <div className="absolute -inset-1 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 opacity-60 blur-sm animate-pulse-slow"></div>
       
       {/* Main Body */}
       <div className="relative w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-b from-slate-800 to-black border-2 border-amber-400 shadow-[inset_0_2px_4px_rgba(255,255,255,0.1),0_4px_8px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center">
            
            {/* Gloss */}
            <div className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent rounded-t-full pointer-events-none" />

            {/* Icon */}
            <span className={`text-3xl md:text-4xl font-black drop-shadow-[0_2px_0_rgba(0,0,0,0.5)] transform transition-transform group-hover:scale-110 ${isRed ? 'text-red-500' : 'text-slate-200'}`}>
                {SUIT_SYMBOLS[suit]}
            </span>
       </div>

       {/* Label Pill */}
       <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black border border-amber-500/50 rounded-full px-2 py-0.5 shadow-lg">
           <span className="text-[8px] md:text-[10px] font-black text-amber-500 uppercase tracking-widest whitespace-nowrap block leading-none">
               TAKER
           </span>
       </div>
    </div>
  );
};