
import React, { useState } from 'react';
import { Suit, Card } from '../types';
import { SUITS, SUIT_NAMES, SUIT_SYMBOLS, SUIT_COLORS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface BiddingControlsProps {
  candidateCard: Card;
  onTake: (suit: Suit | null, keepCandidate: boolean, isNoTrump: boolean) => void;
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
  const [pendingSelection, setPendingSelection] = useState<{ suit: Suit | null, isNoTrump: boolean } | null>(null);

  const variants = {
    hidden: { y: 100, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  const handleRound2Selection = (suit: Suit | null, isNoTrump: boolean) => {
      setPendingSelection({ suit, isNoTrump });
  };

  const confirmTake = (keepCandidate: boolean) => {
      if (pendingSelection) {
          onTake(pendingSelection.suit, keepCandidate, pendingSelection.isNoTrump);
          setPendingSelection(null);
      }
  };

  const isJackConstraint = mustPick && candidateCard.rank === 'J';

  return (
    <div className="fixed bottom-[300px] md:bottom-[340px] left-0 right-0 z-[110] flex justify-center px-4 pointer-events-none">
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={variants}
        className="pointer-events-auto bg-black/80 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-3 flex flex-col items-center gap-3 max-w-full overflow-hidden relative"
      >
        
        {/* --- CONFIRMATION MODAL (Round 2) --- */}
        <AnimatePresence>
            {pendingSelection && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute inset-0 z-20 bg-slate-900 flex flex-col items-center justify-center p-4 text-center rounded-3xl"
                >
                    <p className="text-white font-bold text-sm mb-3">
                        Keep the <span className={SUIT_COLORS[candidateCard.suit]}>{candidateCard.rank}{SUIT_SYMBOLS[candidateCard.suit]}</span>?
                    </p>
                    <div className="flex gap-3 w-full">
                        <button 
                            onClick={() => confirmTake(false)}
                            className="flex-1 py-2 rounded-xl bg-slate-700 text-slate-300 font-bold text-xs uppercase hover:bg-slate-600 transition-colors"
                        >
                            No
                        </button>
                        <button 
                            onClick={() => confirmTake(true)}
                            className="flex-1 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/50"
                        >
                            Yes
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* --- JACK CONSTRAINT WARNING --- */}
        {isJackConstraint && (
             <div className="bg-amber-900/50 border border-amber-500/30 rounded-lg px-3 py-1 mb-1 animate-pulse">
                 <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">⚠️ Jack Obligation</span>
             </div>
        )}

        <div className="flex items-center gap-3 md:gap-6">
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
                            {mustPick ? "Forced Pick" : "Round 1"}
                        </span>
                    </div>

                    {/* TAKE BUTTON */}
                    <button
                        onClick={() => onTake(candidateCard.suit, true, false)} // Always keep candidate in R1
                        className="h-12 px-6 md:h-14 md:px-8 rounded-full bg-gradient-to-r from-emerald-600 to-teal-600 flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-transform border border-emerald-400/30"
                    >
                        <span className="text-white font-black uppercase text-sm md:text-base">Take</span>
                        <CheckIcon />
                    </button>
                </>
            )}

            {/* --- ROUND 2 LAYOUT --- */}
            {bidRound === 2 && !isJackConstraint && (
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
                    <div className="flex items-center gap-2 overflow-x-auto hide-scrollbar max-w-[200px] md:max-w-none px-1">
                        {SUITS.filter(s => s !== candidateCard.suit).map(suit => (
                            <button
                                key={suit}
                                onClick={() => handleRound2Selection(suit, false)}
                                className={`
                                    w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-full border bg-white/5 flex items-center justify-center transition-transform active:scale-90
                                    ${suit === 'H' || suit === 'D' ? 'border-red-500/30 hover:bg-red-900/20' : 'border-slate-500/30 hover:bg-slate-800'}
                                `}
                            >
                                <span className={`text-2xl ${SUIT_COLORS[suit]}`}>{SUIT_SYMBOLS[suit]}</span>
                            </button>
                        ))}
                    </div>

                    {/* NO TRUMP BUTTON */}
                    <button
                        onClick={() => handleRound2Selection(null, true)}
                        className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-full bg-indigo-600/80 border border-indigo-400 flex flex-col items-center justify-center hover:bg-indigo-500 transition-all active:scale-90 shadow-lg relative overflow-hidden group"
                        title="No Trump"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-indigo-900 opacity-50 group-hover:opacity-70" />
                        <span className="relative text-lg font-black leading-none text-white z-10">Ø</span>
                        <span className="relative text-[8px] font-bold leading-none text-indigo-200 mt-0.5 z-10">NO TRUMP</span>
                    </button>
                </div>
            )}
        </div>
      </motion.div>
    </div>
  );
};
