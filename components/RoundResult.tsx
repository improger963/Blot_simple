

import React, { useEffect, useState } from 'react';
import { LastRoundData } from '../types';
import { CountUp } from './UI';
import { motion, AnimatePresence } from 'framer-motion';
import { Z_INDEX } from '../utils/uiLogic';
import { SUIT_COLORS, SUIT_SYMBOLS } from '../constants';

interface RoundResultModalProps {
    data: LastRoundData;
    onNext: () => void;
    currentScores: { hero: number, opponent: number };
    target: number;
}

export const RoundResultModal: React.FC<RoundResultModalProps> = ({ 
    data, 
    onNext, 
    currentScores, 
    target 
}) => {
    const { hero, opponent, roundInfo, litigePoints } = data;
    const isCapot = roundInfo.status === 'CAPOT';
    const isDedans = roundInfo.status === 'DEDANS';
    const isLitige = roundInfo.status === 'LITIGE';
    
    // Calculate previous table scores to animate the bar from
    // Note: If Litige, currentScores includes logic handled in App.tsx (nothing added usually, or carried over stored)
    // We assume currentScores passed here are the updated totals.
    const prevHeroScore = Math.max(0, currentScores.hero - hero.finalPoints);
    const prevOppScore = Math.max(0, currentScores.opponent - opponent.finalPoints);

    // Dedans/Litige Animation State
    const [statusAnim, setStatusAnim] = useState(false);

    useEffect(() => {
        if (isDedans || isLitige) {
            const t = setTimeout(() => setStatusAnim(true), 500);
            return () => clearTimeout(t);
        }
    }, [isDedans, isLitige]);

    const getHeaderGradient = () => {
        if (isLitige) return 'bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900';
        if (roundInfo.winnerId === 'hero') return 'bg-gradient-to-br from-emerald-900 via-emerald-800 to-slate-900';
        return 'bg-gradient-to-br from-rose-900 via-rose-800 to-slate-900';
    };

    const getTitle = () => {
        if (isLitige) return 'Litige (Tie)';
        if (roundInfo.winnerId === 'hero') return 'Round Won';
        return 'Round Lost';
    };

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-[${Z_INDEX.MODALS_BACKDROP}] p-4`}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
            
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                className="relative glass-modal w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-white/20 flex flex-col"
            >
                {/* --- HEADER --- */}
                <div className={`
                    p-6 text-center relative overflow-hidden
                    ${getHeaderGradient()}
                `}>
                    <div className="relative z-10">
                        <span className="inline-block px-3 py-1 rounded-full bg-black/30 border border-white/10 text-[10px] font-bold uppercase tracking-widest text-white/70 mb-2">
                            Round {roundInfo.number} Result
                        </span>
                        
                        <h2 className="text-4xl md:text-5xl font-serif font-black text-white mb-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                            {getTitle()}
                        </h2>

                        {/* Animated Contract Status Text */}
                        {(isCapot || isDedans || isLitige) && (
                            <motion.div 
                                initial={{ scale: 0, rotate: -10 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: 'spring', bounce: 0.5 }}
                                className={`inline-flex items-center justify-center gap-2 mt-2 px-6 py-2 rounded-lg shadow-lg border transform
                                    ${isLitige 
                                        ? 'bg-gradient-to-r from-slate-600 to-slate-500 border-slate-400' 
                                        : 'bg-gradient-to-r from-amber-500 to-yellow-600 border-yellow-300'
                                    }
                                `}
                            >
                                <span className="text-2xl font-black text-black tracking-tighter">
                                    {isCapot ? 'CAPOT !' : (isLitige ? 'LITIGE !' : 'DEDANS !')}
                                </span>
                                <span className="text-xs font-bold text-black/80 bg-white/20 px-2 py-0.5 rounded">
                                    {isCapot ? '+21 Table Pts' : (isLitige ? `${litigePoints} Pts Saved` : 'All Points Lost')}
                                </span>
                            </motion.div>
                        )}
                        
                        {!isCapot && !isDedans && !isLitige && (
                            <div className="text-sm text-white/60 font-medium mt-1">
                                Contract: {roundInfo.bidTaker === 'hero' ? 'You' : 'Opponent'} took {roundInfo.contractType === 'NO_TRUMP' ? 'NO TRUMP' : (roundInfo.trump && SUIT_SYMBOLS[roundInfo.trump])}
                            </div>
                        )}
                    </div>

                    {/* Background Pattern */}
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10" />
                </div>

                {/* --- SPLIT SCORE VIEW --- */}
                <div className="flex-1 bg-slate-900/80 p-6 md:p-8 flex flex-col md:flex-row gap-8 relative overflow-hidden">
                    
                    {/* VS Divider */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex items-center justify-center w-10 h-10 bg-slate-800 rounded-full border border-white/10 z-10 font-black text-slate-500 text-xs">VS</div>

                    {/* DEDANS/LITIGE ANIMATION OVERLAY */}
                    {(isDedans || isLitige) && statusAnim && (
                        <motion.div 
                            initial={{ opacity: 0, x: 0 }}
                            animate={{ opacity: [0, 1, 0], x: isLitige ? 0 : (roundInfo.bidTaker === 'hero' ? 200 : -200) }}
                            transition={{ duration: 1.5, ease: "easeInOut" }}
                            className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                        >
                            <div className={`
                                font-black text-2xl drop-shadow-lg bg-black/50 px-4 py-2 rounded-xl backdrop-blur-sm border 
                                ${isLitige ? 'text-white border-white/30' : 'text-amber-400 border-amber-500/50'}
                            `}>
                                {isLitige ? '🔒 Points Locked' : '💸 Points Transfer'}
                            </div>
                        </motion.div>
                    )}

                    {/* HERO COLUMN */}
                    <div className={`flex-1 flex flex-col gap-4 transition-opacity duration-500 ${(isDedans && roundInfo.bidTaker === 'hero' && statusAnim) || (isLitige && roundInfo.bidTaker === 'hero') ? 'opacity-40' : 'opacity-100'}`}>
                        <div className="flex items-center gap-4 border-b border-white/5 pb-4">
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center text-2xl shadow-lg border-2 border-white/10">
                                😎
                            </div>
                            <div>
                                <h3 className="text-emerald-400 font-bold text-lg uppercase tracking-wider">You</h3>
                                <div className="flex flex-col">
                                    <div className="text-4xl font-black font-mono text-white leading-none">
                                        +<CountUp value={hero.finalPoints} />
                                    </div>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">Table Points</span>
                                </div>
                            </div>
                        </div>
                        
                        {/* Breakdown List */}
                        <div className="space-y-2 text-xs font-medium text-slate-400">
                            <div className="flex justify-between">
                                <span>Card Points</span>
                                <span className="text-white">{hero.rawCardPoints}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Declarations</span>
                                <span className={hero.rawDeclPoints > 0 ? "text-gold" : "text-slate-600"}>
                                    {hero.rawDeclPoints > 0 ? `+${hero.rawDeclPoints}` : '-'}
                                </span>
                            </div>
                            {hero.beloteBonus > 0 && (
                                <div className="flex justify-between text-amber-400">
                                    <span>Belote</span>
                                    <span>+20</span>
                                </div>
                            )}
                            {hero.lastTrickBonus > 0 && (
                                <div className="flex justify-between text-blue-400">
                                    <span>Last Trick</span>
                                    <span>+10</span>
                                </div>
                            )}
                            {isCapot && roundInfo.winnerId === 'hero' && (
                                <div className="flex justify-between text-gold font-bold">
                                    <span>Capot Bonus</span>
                                    <span>+50</span>
                                </div>
                            )}
                            {/* Raw Total for transparency */}
                            <div className="border-t border-white/5 pt-2 flex justify-between text-[10px] opacity-70">
                                <span>Total Raw Score</span>
                                <span>{hero.rawFinalPoints}</span>
                            </div>
                        </div>
                    </div>

                    {/* OPPONENT COLUMN */}
                    <div className={`flex-1 flex flex-col gap-4 md:text-right transition-opacity duration-500 ${(isDedans && roundInfo.bidTaker === 'opponent' && statusAnim) || (isLitige && roundInfo.bidTaker === 'opponent') ? 'opacity-40' : 'opacity-100'}`}>
                        <div className="flex flex-row-reverse md:flex-row items-center gap-4 border-b border-white/5 pb-4 justify-between md:justify-end">
                            <div className="text-right">
                                <h3 className="text-rose-400 font-bold text-lg uppercase tracking-wider">Opponent</h3>
                                <div className="flex flex-col items-end">
                                    <div className="text-4xl font-black font-mono text-white leading-none">
                                        +<CountUp value={opponent.finalPoints} />
                                    </div>
                                    <span className="text-[10px] text-slate-500 uppercase font-bold">Table Points</span>
                                </div>
                            </div>
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-600 to-red-900 flex items-center justify-center text-2xl shadow-lg border-2 border-white/10">
                                🤖
                            </div>
                        </div>

                        {/* Breakdown List */}
                        <div className="space-y-2 text-xs font-medium text-slate-400">
                            <div className="flex justify-between md:flex-row-reverse">
                                <span>Card Points</span>
                                <span className="text-white">{opponent.rawCardPoints}</span>
                            </div>
                            <div className="flex justify-between md:flex-row-reverse">
                                <span>Declarations</span>
                                <span className={opponent.rawDeclPoints > 0 ? "text-gold" : "text-slate-600"}>
                                    {opponent.rawDeclPoints > 0 ? `+${opponent.rawDeclPoints}` : '-'}
                                </span>
                            </div>
                            {opponent.beloteBonus > 0 && (
                                <div className="flex justify-between md:flex-row-reverse text-amber-400">
                                    <span>Belote</span>
                                    <span>+20</span>
                                </div>
                            )}
                            {opponent.lastTrickBonus > 0 && (
                                <div className="flex justify-between md:flex-row-reverse text-blue-400">
                                    <span>Last Trick</span>
                                    <span>+10</span>
                                </div>
                            )}
                            {isCapot && roundInfo.winnerId === 'opponent' && (
                                <div className="flex justify-between md:flex-row-reverse text-gold font-bold">
                                    <span>Capot Bonus</span>
                                    <span>+50</span>
                                </div>
                            )}
                            {/* Raw Total for transparency */}
                            <div className="border-t border-white/5 pt-2 flex justify-between md:flex-row-reverse text-[10px] opacity-70">
                                <span>Total Raw Score</span>
                                <span>{opponent.rawFinalPoints}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- TOTAL PROGRESS BAR --- */}
                <div className="bg-black/40 p-6 border-t border-white/10">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Game Match Progress</span>
                        <span className="text-xs font-mono text-slate-500">Goal: <span className="text-gold font-bold">{target}</span></span>
                    </div>

                    {/* Hero Bar */}
                    <div className="mb-3 relative">
                        <div className="flex justify-between text-[10px] font-bold mb-1 text-emerald-400 uppercase">
                            <span>Your Total</span>
                            <span>{currentScores.hero}</span>
                        </div>
                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden shadow-inner relative">
                            {/* Previous Score Ghost */}
                            <div 
                                className="absolute top-0 left-0 bottom-0 bg-emerald-900/50 border-r border-emerald-500/30"
                                style={{ width: `${Math.min((prevHeroScore / target) * 100, 100)}%` }}
                            />
                            {/* New Score Fill */}
                            <motion.div 
                                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 relative z-10"
                                initial={{ width: `${Math.min((prevHeroScore / target) * 100, 100)}%` }}
                                animate={{ width: `${Math.min((currentScores.hero / target) * 100, 100)}%` }}
                                transition={{ duration: 1.5, ease: 'circOut', delay: 0.2 }}
                            />
                        </div>
                    </div>

                    {/* Opponent Bar */}
                    <div className="relative">
                        <div className="flex justify-between text-[10px] font-bold mb-1 text-rose-400 uppercase">
                            <span>Opponent Total</span>
                            <span>{currentScores.opponent}</span>
                        </div>
                        <div className="h-3 bg-slate-800 rounded-full overflow-hidden shadow-inner relative">
                             {/* Previous Score Ghost */}
                             <div 
                                className="absolute top-0 left-0 bottom-0 bg-rose-900/50 border-r border-rose-500/30"
                                style={{ width: `${Math.min((prevOppScore / target) * 100, 100)}%` }}
                            />
                            {/* New Score Fill */}
                            <motion.div 
                                className="h-full bg-gradient-to-r from-rose-600 to-rose-400 relative z-10"
                                initial={{ width: `${Math.min((prevOppScore / target) * 100, 100)}%` }}
                                animate={{ width: `${Math.min((currentScores.opponent / target) * 100, 100)}%` }}
                                transition={{ duration: 1.5, ease: 'circOut', delay: 0.2 }}
                            />
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-4 bg-black/60 border-t border-white/5">
                    <button 
                        onClick={onNext} 
                        className="w-full btn-base bg-white text-black font-bold py-4 rounded-xl shadow-lg hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                    >
                        <span>Start Next Round</span>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                    </button>
                </div>
            </motion.div>
        </div>
    );
};