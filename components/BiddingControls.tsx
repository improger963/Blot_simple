import React from 'react';
import { Suit, Card } from '../types';
import { SUITS, SUIT_NAMES, SUIT_SYMBOLS, SUIT_COLORS } from '../constants';
import { motion } from 'framer-motion';

interface BiddingControlsProps {
  candidateCard: Card;
  onTake: (suit: Suit, takeCandidate: boolean) => void;
  onPass: () => void;
  bidRound: 1 | 2;
  mustPick: boolean;
}

const XIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>;
const CheckIcon = () => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>;

export const BiddingControls: React.FC<BiddingControlsProps> = ({
  candidateCard,
  onTake,
  onPass,
  bidRound,
  mustPick
}) => {

  const variants = {
    hidden: { y: 100, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="fixed bottom-[300px] md:bottom-[340px] left-0 right-0 z-[110] flex justify-center px-4 pointer-events-none">
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={variants}
        className="pointer-events-auto bg-black/70 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl p-2 flex items-center gap-3 md:gap-6 max-w-full overflow-hidden"
      >
        
        {/* --- ROUND 1 LAYOUT --- */}
        {bidRound === 1 && (
            <>
                {/* PASS BUTTON */}
                {!mustPick && (
                    <button
                        onClick={onPass}
                        className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-rose-600/20 border border-rose-500/50 flex items-center justify-center text-rose-500 hover:bg-rose-600 hover:text-white transition-all active:scale-90"
                        aria-label="Pass"
                    >
                        <XIcon />
                    </button>
                )}

                {/* INFO TEXT */}
                <div className="flex flex-col items-center px-2 md:px-4">
                    <span className="text-white font-bold text-sm md:text-lg whitespace-nowrap">
                        Take {SUIT_NAMES[candidateCard.suit]}?
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                         {mustPick ? "Forced" : "Round 1"}
                    </span>
                </div>

                {/* TAKE BUTTON */}
                <button
                    onClick={() => onTake(candidateCard.suit, true)}
                    className="h-12 px-6 md:h-14 md:px-8 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-transform border border-emerald-400/30"
                >
                    <span className="text-white font-black uppercase text-sm md:text-base">Take</span>
                    <CheckIcon />
                </button>
            </>
        )}

        {/* --- ROUND 2 LAYOUT --- */}
        {bidRound === 2 && (
            <div className="flex items-center gap-2 md:gap-4">
                {/* PASS BUTTON */}
                {!mustPick && (
                    <button
                        onClick={onPass}
                        className="w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-full bg-rose-600/20 border border-rose-500/50 flex items-center justify-center text-rose-500 hover:bg-rose-600 hover:text-white transition-all active:scale-90"
                        aria-label="Pass"
                    >
                        <XIcon />
                    </button>
                )}
                
                <div className="h-8 w-px bg-white/10 mx-1"></div>

                {/* SUIT SELECTION */}
                <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar">
                    {SUITS.filter(s => s !== candidateCard.suit).map(suit => (
                        <button
                            key={suit}
                            onClick={() => onTake(suit, false)}
                            className={`
                                w-12 h-12 md:w-14 md:h-14 rounded-full border bg-white/5 flex items-center justify-center transition-transform active:scale-90
                                ${suit === 'H' || suit === 'D' ? 'border-red-500/30 hover:bg-red-900/20' : 'border-slate-500/30 hover:bg-slate-800'}
                            `}
                        >
                            <span className={`text-2xl ${SUIT_COLORS[suit]}`}>{SUIT_SYMBOLS[suit]}</span>
                        </button>
                    ))}
                </div>
            </div>
        )}

      </motion.div>
    </div>
  );
};