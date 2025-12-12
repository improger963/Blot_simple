import React from 'react';
import { Suit, Card } from '../types';
import { SUITS, SUIT_NAMES, SUIT_SYMBOLS, SUIT_COLORS } from '../constants';
import { CardComponent } from './Card';

interface BiddingControlsProps {
  candidateCard: Card;
  onTake: (suit: Suit, takeCandidate: boolean) => void;
  onPass: () => void;
  bidRound: 1 | 2;
  mustPick: boolean;
}

// Icons
const CheckIcon = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>;
const XIcon = () => <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>;

export const BiddingControls: React.FC<BiddingControlsProps> = ({
  candidateCard,
  onTake,
  onPass,
  bidRound,
  mustPick
}) => {
  return (
    <div className="flex flex-col items-center justify-center animate-fadeIn z-50 w-full">
      
      {/* Glass Modal Container */}
      <div className={`
        relative flex flex-col items-center gap-6 p-6 md:p-8 rounded-3xl 
        glass-modal shadow-[0_30px_60px_rgba(0,0,0,0.5)] 
        max-w-xl w-full mx-4
        ${mustPick ? 'border-red-500/30' : 'border-white/10'}
      `}>
        
        {/* Header Ribbon */}
        <div className={`
            absolute -top-5 font-serif font-bold px-8 py-2 rounded-full shadow-lg uppercase tracking-widest text-xs md:text-sm whitespace-nowrap
            ${mustPick 
                ? 'bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white border border-red-400' 
                : 'bg-gradient-to-r from-[#d4af37] via-[#f3e5ab] to-[#aa8c2c] text-slate-900 border border-white'}
        `}>
            {mustPick ? 'Dealer Obligation' : `Bidding Phase • Round ${bidRound}`}
        </div>

        {/* Title */}
        <div className="text-center mt-6">
            <h2 className="text-2xl md:text-3xl font-black text-white font-serif tracking-tight mb-1 drop-shadow-md">
                {mustPick ? "Forced Take" : bidRound === 1 
                    ? `Accept ${SUIT_NAMES[candidateCard.suit]}?` 
                    : "Select Trump Suit"}
            </h2>
            <p className="text-slate-400 text-xs md:text-sm font-medium">
                {mustPick ? "You must pick up the Jack." : bidRound === 1 ? "152 Points + Declarations" : "Choose your strongest suit"}
            </p>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-6 md:gap-10 w-full justify-center">
            
            {/* Actions */}
            <div className="flex flex-col gap-4 w-full md:w-auto min-w-[240px]">
                {bidRound === 1 ? (
                    // Round 1 Button
                    <button
                        onClick={() => onTake(candidateCard.suit, true)}
                        className="btn-base group relative overflow-hidden bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold py-4 px-6 rounded-xl shadow-[0_10px_30px_rgba(5,150,105,0.4)] border border-emerald-400/30 w-full hover:scale-[1.02]"
                    >
                        <div className="flex flex-col items-start relative z-10">
                            <span className="text-[10px] opacity-80 uppercase tracking-widest font-bold">Action</span>
                            <span className="text-xl">Take Contract</span>
                        </div>
                         <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center text-white absolute right-4 top-1/2 -translate-y-1/2">
                           <CheckIcon />
                        </div>
                    </button>
                ) : (
                    // Round 2 Grid
                    <div className="grid grid-cols-2 gap-3 w-full">
                        {SUITS.filter(s => s !== candidateCard.suit).map(suit => (
                            <button
                                key={suit}
                                onClick={() => onTake(suit, false)}
                                className={`
                                    btn-base flex flex-col items-center justify-center p-4 rounded-xl border bg-gradient-to-b from-white to-slate-100 shadow-md hover:shadow-lg transition-transform hover:-translate-y-1
                                    ${suit === 'H' || suit === 'D' ? 'border-rose-200' : 'border-slate-300'}
                                `}
                            >
                                <span className={`text-4xl ${SUIT_COLORS[suit]} mb-1`}>
                                    {SUIT_SYMBOLS[suit]}
                                </span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase">{SUIT_NAMES[suit]}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Pass Button */}
                {!mustPick && (
                    <button
                        onClick={onPass}
                        className="btn-base bg-gradient-to-r from-rose-600 to-red-700 text-white font-bold py-3 px-6 rounded-xl border border-rose-400/30 shadow-[0_5px_20px_rgba(225,29,72,0.3)] flex items-center justify-center gap-2 mt-2 w-full hover:bg-rose-500"
                    >
                        <XIcon />
                        <span className="tracking-wide">Pass Turn</span>
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
