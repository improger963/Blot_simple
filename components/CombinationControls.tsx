
import React, { useState, useMemo, useEffect } from 'react';
import { Combination } from '../types';
import { SUIT_COLORS, SUIT_SYMBOLS } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';
import { CardComponent } from './Card';
import { useSoundManager } from '../hooks/useSoundManager';

interface CombinationControlsProps {
    combinations: Combination[];
    onDeclare: (selected: Combination[]) => void;
    phase: 'DECLARE' | 'SHOW';
    timeLeft?: number; // Optional timer for visual urgency
    revealOwner?: 'hero' | 'opponent' | null;
    soundEnabled: boolean;
}

export const CombinationControls: React.FC<CombinationControlsProps> = ({ combinations, onDeclare, phase, timeLeft, revealOwner, soundEnabled }) => {
    const { playSound } = useSoundManager(soundEnabled);
    // Filter out BELOTE from UI as it is announced separately during play
    const displayableCombinations = useMemo(() => {
        return combinations.filter(c => c.type !== 'BELOTE');
    }, [combinations]);

    // Default: Select all valid optimal combos using the helper from gameLogic
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
        const initSet = new Set<string>();
        const usedCards = new Set<string>();
        
        // Sort by score desc to pick best ones by default
        const sorted = [...displayableCombinations].sort((a, b) => b.score - a.score);
        
        sorted.forEach(c => {
            const overlap = c.cards.some(card => usedCards.has(card.id));
            if (!overlap) {
                initSet.add(c.id);
                c.cards.forEach(card => usedCards.add(card.id));
            }
        });
        return initSet;
    });

    const toggle = (id: string) => {
        playSound('ui_click');
        const comboToToggle = displayableCombinations.find(c => c.id === id);
        if (!comboToToggle) return;

        const next = new Set<string>(selectedIds);

        if (next.has(id)) {
            next.delete(id);
        } else {
            // Check logic: Must uncheck any CONFLICTING combinations first
            const conflictingIds: string[] = [];
            next.forEach(selectedId => {
                const selectedCombo = displayableCombinations.find(c => c.id === selectedId);
                if (selectedCombo) {
                    const hasOverlap = selectedCombo.cards.some(c => 
                        comboToToggle.cards.some(tc => tc.id === c.id)
                    );
                    if (hasOverlap) {
                        conflictingIds.push(selectedId);
                    }
                }
            });

            conflictingIds.forEach(cid => next.delete(cid));
            next.add(id);
        }
        setSelectedIds(next);
    };

    const handleConfirm = () => {
        playSound('ui_click');
        if (phase === 'DECLARE') {
            const selected = displayableCombinations.filter(c => selectedIds.has(c.id));
            onDeclare(selected);
        } else {
            onDeclare([]); 
        }
    };

    if (displayableCombinations.length === 0 && phase === 'DECLARE') return null;

    // --- REVEAL PHASE (Visual Only) ---
    if (phase === 'SHOW') {
        const title = revealOwner === 'hero' ? 'You Reveal' : 'Opponent Reveals';
        const isOpponent = revealOwner === 'opponent';

        return (
            <div className="fixed inset-0 z-[800] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fadeIn" />
                <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="relative w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-[#151012]"
                >
                    <div className={`p-6 flex items-center gap-4 border-b border-white/5 bg-gradient-to-r ${isOpponent ? 'from-rose-900/50 to-slate-900' : 'from-indigo-900/50 to-slate-900'}`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border border-white/10 text-2xl ${isOpponent ? 'bg-rose-600' : 'bg-indigo-600'}`}>
                            {isOpponent ? '🔴' : '🔵'}
                        </div>
                        <div>
                            <h2 className="text-xl font-serif font-black text-white tracking-wide">{title}</h2>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-white/50">Winning Declarations</p>
                        </div>
                    </div>
                    <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                        {displayableCombinations.map((combo) => (
                            <div key={combo.id} className="relative bg-[#0a0505] border border-white/10 rounded-2xl p-4 flex items-center justify-between overflow-hidden">
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isOpponent ? 'bg-rose-500' : 'bg-indigo-500'}`} />
                                <div className="flex flex-col gap-3 pl-2">
                                    <span className="text-white font-black text-sm uppercase tracking-wider">
                                        {combo.type} <span className="text-white/40 text-xs">({combo.score} )</span>
                                    </span>
                                    <div className="flex -space-x-8 pl-1 pb-1">
                                        {combo.cards.map((card, idx) => (
                                            <div key={card.id} className="relative origin-bottom" style={{ zIndex: idx }}>
                                                <div className="w-16 h-24 shadow-lg rounded-lg overflow-hidden ring-1 ring-white/10">
                                                    <div className="transform scale-[0.6] origin-top-left w-[166%] h-[166%]">
                                                        <CardComponent card={card} hoverable={false} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end z-10">
                                    <span className="text-amber-400 font-black text-2xl drop-shadow-lg">+{combo.score}</span>
                                    <span className="text-[9px] font-bold text-slate-500 uppercase">Points</span>
                                </div>
                                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white/5 to-transparent pointer-events-none" />
                            </div>
                        ))}
                    </div>
                    <div className="p-6 pt-2 bg-[#151012]">
                        <button onClick={() => { playSound('ui_click'); onDeclare([]); }} className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg shadow-[0_4px_20px_rgba(37,99,235,0.4)] transition-all active:scale-[0.98] border border-white/10">
                            Continue Game
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // --- DECLARE PHASE (Selection) ---
    return (
        <div className="fixed inset-0 z-[800] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-fadeIn" />

            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative glass-modal rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] w-full max-w-lg overflow-hidden border border-white/10 flex flex-col max-h-[90vh]"
            >
                {/* Header with Timer Bar */}
                <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900">
                    <div className="p-6 flex items-center justify-between border-b border-white/10 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl shadow-lg border bg-gradient-to-br from-[#d4af37] to-[#aa8c2c] border-[#f3e5ab] text-slate-900">
                                🎴
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white tracking-wide font-serif">Declare Bonus</h3>
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Tick Box to Announce</p>
                            </div>
                        </div>
                        {timeLeft !== undefined && (
                            <div className="flex flex-col items-end">
                                <span className={`text-2xl font-mono font-bold ${timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                                    {timeLeft}s
                                </span>
                            </div>
                        )}
                    </div>
                    {/* Progress Bar */}
                    {timeLeft !== undefined && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                            <motion.div 
                                initial={{ width: '100%' }}
                                animate={{ width: '0%' }}
                                transition={{ duration: 10, ease: 'linear' }}
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                            />
                        </div>
                    )}
                </div>
                
                <div className="p-4 bg-slate-950/50 overflow-y-auto flex-1 flex flex-col gap-3 custom-scrollbar">
                    {displayableCombinations.map(combo => {
                        const isSelected = selectedIds.has(combo.id);
                        const conflictingSelected = [...selectedIds].map(sid => displayableCombinations.find(c => c.id === sid)).filter(c => c && c.id !== combo.id && c.cards.some(card => combo.cards.some(tc => tc.id === card.id)));
                        const hasConflictWarning = !isSelected && conflictingSelected.length > 0;

                        return (
                            <motion.label 
                                key={combo.id}
                                layout
                                className={`
                                    relative flex flex-col p-4 rounded-xl border transition-all select-none overflow-hidden group cursor-pointer
                                    ${isSelected 
                                        ? 'border-indigo-500/50 bg-indigo-900/20 shadow-lg' 
                                        : 'border-white/5 bg-white/5 opacity-70 hover:opacity-100'}
                                    ${hasConflictWarning ? 'opacity-50 grayscale' : ''}
                                `}
                            >
                                <div className="flex items-center justify-between w-full relative z-10">
                                    <div className="flex items-center gap-4">
                                        {/* Checkbox */}
                                        <div className={`
                                            w-6 h-6 rounded border flex items-center justify-center transition-colors shrink-0
                                            ${isSelected 
                                                ? 'bg-indigo-500 border-indigo-400 text-white' 
                                                : 'bg-transparent border-slate-500'}
                                        `}>
                                            {isSelected && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                                        </div>
                                        
                                        <input 
                                            type="checkbox" 
                                            className="hidden"
                                            checked={isSelected}
                                            onChange={() => toggle(combo.id)}
                                        />

                                        <div className="flex flex-col gap-2">
                                            <span className={`font-bold text-sm uppercase tracking-wider ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                                {combo.type}
                                                <span className="ml-2 text-slate-500 text-xs font-normal normal-case opacity-70">
                                                    ({combo.rank} {combo.isTrump ? 'Trump' : ''})
                                                </span>
                                            </span>
                                            
                                            {/* MINI CARDS PREVIEW */}
                                            <div className="flex -space-x-2">
                                                {combo.cards.map((c, idx) => (
                                                    <div 
                                                        key={`${c.id}-${idx}`} 
                                                        className={`
                                                            w-8 h-10 bg-white rounded shadow-md flex flex-col items-center justify-center leading-none
                                                            ${isSelected ? 'ring-1 ring-gold/70 translate-y-[-1px]' : ''}
                                                            transition-transform
                                                        `}
                                                        style={{ zIndex: 10 - idx }}
                                                    >
                                                        <span className={`text-[10px] font-bold ${SUIT_COLORS[c.suit]}`}>{c.rank}</span>
                                                        <span className={`text-[8px] ${SUIT_COLORS[c.suit]}`}>{SUIT_SYMBOLS[c.suit]}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {/* Points Badge */}
                                    <div className="flex flex-col items-end">
                                        <div className={`px-3 py-1 rounded-full font-black text-sm ${isSelected ? 'bg-gold text-black shadow-lg shadow-gold/20' : 'bg-white/10 text-slate-500'}`}>
                                            +{combo.score}
                                        </div>
                                    </div>
                                </div>
                                
                                {hasConflictWarning && (
                                    <div className="mt-3 text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1 bg-amber-900/20 p-2 rounded">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        Conflicts with current selection
                                    </div>
                                )}
                            </motion.label>
                        );
                    })}
                </div>

                <div className="p-6 bg-slate-900 border-t border-white/10 flex gap-4 shrink-0">
                    <button onClick={() => { playSound('ui_click'); onDeclare([]); }} className="btn-base flex-1 py-3.5 rounded-xl font-bold text-slate-400 hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                        Pass (No Declare)
                    </button>
                    <button onClick={handleConfirm} className="btn-base flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl border border-emerald-400/30 flex items-center justify-center gap-2">
                        <span>Announce Selected</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                </div>
            </motion.div>
        </div>
    );
};
