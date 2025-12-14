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

const XIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
);
const CheckIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
);

export const BiddingControls: React.FC<BiddingControlsProps> = ({
  candidateCard,
  onTake,
  onPass,
  bidRound,
  mustPick
}) => {
  const [pendingSelection, setPendingSelection] = useState<{ suit: Suit | null, isNoTrump: boolean } | null>(null);

  const variants = {
    hidden: { y: 100, opacity: 0, scale: 0.9 },
    visible: { y: 0, opacity: 1, scale: 1, transition: { type: 'spring' as const, damping: 20, stiffness: 300 } }
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
    <div className="fixed bottom-[280px] md:bottom-[320px] left-0 right-0 z-[110] flex justify-center px-4 pointer-events-none">
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={variants}
        className="pointer-events-auto bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-2 md:p-3 flex flex-col items-center max-w-full overflow-visible relative"
      >
        
        {/* --- CONFIRMATION MODAL OVERLAY --- */}
        <AnimatePresence>
            {pendingSelection && (
                <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute inset-0 z-30 bg-slate-900/95 flex flex-col items-center justify-center p-4 text-center rounded-[2rem]"
                >
                    <p className="text-white font-bold text-sm mb-4">
                        Keep the <span className={`${SUIT_COLORS[candidateCard.suit]} text-lg`}>{candidateCard.rank}{SUIT_SYMBOLS[candidateCard.suit]}</span>?
                    </p>
                    <div className="flex gap-3 w-full px-2">
                        <button 
                            onClick={() => confirmTake(false)}
                            className="flex-1 py-3 rounded-xl bg-slate-700/50 border border-white/5 text-slate-300 font-bold text-xs uppercase hover:bg-slate-600 transition-colors"
                        >
                            Discard
                        </button>
                        <button 
                            onClick={() => confirmTake(true)}
                            className="flex-1 py-3 rounded-xl bg-emerald-600 text-white font-bold text-xs uppercase hover:bg-emerald-500 transition-colors shadow-lg shadow-emerald-900/50"
                        >
                            Keep
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        {/* --- WARNINGS --- */}
        <div className="absolute -top-10 left-0 right-0 flex justify-center pointer-events-none">
             {isJackConstraint && bidRound === 1 && (
                 <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-amber-500 text-black text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg">
                     ⚠️ Jack Obligation
                 </motion.div>
             )}
             {mustPick && bidRound === 2 && (
                 <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-rose-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-lg">
                     ⚠️ Dealer Must Take
                 </motion.div>
             )}
        </div>

        <div className="flex items-center px-2 py-1">
            
            {/* --- ROUND 1 LAYOUT --- */}
            {bidRound === 1 && (
                <div className="flex items-center gap-4 md:gap-8">
                    {/* PASS */}
                    {!mustPick && (
                         <button onClick={onPass} className="flex flex-col items-center gap-1.5 group">
                             <div className="w-14 h-14 rounded-full bg-slate-800 border border-slate-600 group-hover:border-rose-500 group-hover:bg-rose-500 flex items-center justify-center transition-all shadow-lg active:scale-95">
                                 <XIcon className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                             </div>
                             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-rose-400 transition-colors">Pass</span>
                         </button>
                    )}
                    
                    {/* CANDIDATE INFO */}
                    <div className="flex flex-col items-center px-6 border-x border-white/5 mx-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Candidate</span>
                        <div className="flex items-center gap-2 bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                            <span className={`text-3xl font-black leading-none ${SUIT_COLORS[candidateCard.suit]}`}>{SUIT_SYMBOLS[candidateCard.suit]}</span>
                            <span className="text-2xl font-black text-white leading-none pt-1">{candidateCard.rank}</span>
                        </div>
                    </div>

                    {/* TAKE */}
                    <button onClick={() => onTake(candidateCard.suit, true, false)} className="flex flex-col items-center gap-1.5 group">
                        <div className="w-14 h-14 rounded-full bg-emerald-600 border border-emerald-400 group-hover:bg-emerald-500 group-hover:scale-105 flex items-center justify-center transition-all shadow-[0_0_20px_rgba(16,185,129,0.4)] active:scale-95">
                            <CheckIcon className="w-7 h-7 text-white" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 group-hover:text-emerald-300 transition-colors">Take</span>
                    </button>
                </div>
            )}

            {/* --- ROUND 2 LAYOUT --- */}
            {bidRound === 2 && !isJackConstraint && (
                <div className="flex items-center gap-4 md:gap-6">
                    {/* PASS */}
                    {!mustPick && (
                        <div className="pr-6 border-r border-white/10">
                            <button onClick={onPass} className="flex flex-col items-center gap-1.5 group">
                                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-800 border border-slate-600 group-hover:border-rose-500 group-hover:bg-rose-500 flex items-center justify-center transition-all shadow-lg active:scale-95">
                                    <XIcon className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-rose-400 transition-colors">Pass</span>
                            </button>
                        </div>
                    )}

                    {/* SUITS */}
                    <div className="flex items-center gap-3 md:gap-4">
                         {SUITS.filter(s => s !== candidateCard.suit).map(suit => (
                            <button
                                key={suit}
                                onClick={() => handleRound2Selection(suit, false)}
                                className="group relative flex flex-col items-center gap-2"
                            >
                                <div className={`
                                    w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center 
                                    bg-gradient-to-b from-slate-700 to-slate-800 border border-white/10
                                    shadow-inner transition-all duration-200
                                    group-hover:-translate-y-1 group-hover:shadow-xl group-hover:border-white/30
                                    group-active:scale-95
                                    ${(suit === 'H' || suit === 'D') ? 'group-hover:shadow-red-900/50' : 'group-hover:shadow-slate-900/50'}
                                `}>
                                    <span className={`text-2xl md:text-3xl filter drop-shadow-sm transition-transform group-hover:scale-110 ${SUIT_COLORS[suit]}`}>{SUIT_SYMBOLS[suit]}</span>
                                </div>
                                {/* Hover Glow */}
                                <div className={`absolute top-0 left-0 right-0 bottom-0 rounded-full blur-xl opacity-0 group-hover:opacity-40 transition-opacity pointer-events-none ${suit === 'H' || suit === 'D' ? 'bg-red-500' : 'bg-white'}`} />
                            </button>
                        ))}
                    </div>

                    {/* NO TRUMP */}
                    <div className="pl-6 border-l border-white/10">
                        <button onClick={() => handleRound2Selection(null, true)} className="flex flex-col items-center gap-1.5 group">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 border border-indigo-400 group-hover:brightness-110 flex items-center justify-center transition-all shadow-lg group-hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] active:scale-95">
                                <span className="text-2xl font-black text-white font-serif">A</span>
                            </div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 group-hover:text-indigo-200 transition-colors whitespace-nowrap">No Trump</span>
                        </button>
                    </div>
                </div>
            )}
        </div>

      </motion.div>
    </div>
  );
};