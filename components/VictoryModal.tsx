import React from 'react';
import { motion } from 'framer-motion';
import { Z_INDEX } from '../utils/uiLogic';
import { CountUp, Icons } from './UI';

interface VictoryModalProps {
    winner: 'hero' | 'opponent';
    scores: { hero: number, opponent: number };
    onRestart: () => void;
    onViewHistory: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ winner, scores, onRestart, onViewHistory }) => {
    const isWin = winner === 'hero';

    return (
        <div className={`fixed inset-0 flex items-center justify-center p-4`} style={{ zIndex: Z_INDEX.MODALS_BACKDROP + 10 }}>
            <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />
            
            <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative w-full max-w-lg bg-slate-900 rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col items-center"
            >
                {/* Header Graphic */}
                <div className="w-full h-40 relative flex items-center justify-center overflow-hidden">
                    <div className={`absolute inset-0 opacity-40 ${isWin ? 'bg-gradient-to-b from-emerald-500 to-slate-900' : 'bg-gradient-to-b from-rose-500 to-slate-900'}`} />
                    
                    <motion.div 
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", damping: 12, delay: 0.2 }}
                        className="relative z-10 text-8xl filter drop-shadow-2xl"
                    >
                        {isWin ? '🏆' : '💀'}
                    </motion.div>
                </div>

                <div className="p-8 flex flex-col items-center w-full">
                    <h2 className="text-3xl md:text-4xl font-black text-white font-serif mb-2 text-center uppercase tracking-wider">
                        {isWin ? 'Victory!' : 'Defeat'}
                    </h2>
                    <p className="text-slate-400 font-medium mb-8 text-center">
                        {isWin ? 'You mastered the table.' : 'Better luck next time.'}
                    </p>

                    {/* Final Score Card */}
                    <div className="w-full bg-white/5 rounded-2xl p-6 border border-white/10 flex items-center justify-between mb-8">
                        <div className="flex flex-col items-center gap-2">
                             <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-2xl shadow-lg ring-2 ring-blue-400/50">😎</div>
                             <span className="text-xs font-bold text-slate-400 uppercase">You</span>
                             <span className={`text-2xl font-mono font-black ${isWin ? 'text-emerald-400' : 'text-white'}`}>
                                 <CountUp value={scores.hero} />
                             </span>
                        </div>
                        
                        <div className="text-slate-600 font-black text-xl">VS</div>

                        <div className="flex flex-col items-center gap-2">
                             <div className="w-12 h-12 rounded-full bg-rose-600 flex items-center justify-center text-2xl shadow-lg ring-2 ring-rose-400/50">🤖</div>
                             <span className="text-xs font-bold text-slate-400 uppercase">Opponent</span>
                             <span className={`text-2xl font-mono font-black ${!isWin ? 'text-emerald-400' : 'text-white'}`}>
                                 <CountUp value={scores.opponent} />
                             </span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="w-full space-y-3">
                        <button 
                            onClick={onRestart}
                            className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <span>Play Again</span>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>

                        <button 
                            onClick={onViewHistory}
                            className="w-full py-4 bg-slate-800 text-slate-300 font-bold uppercase tracking-widest rounded-xl border border-white/5 hover:bg-slate-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <span>View Match History</span>
                            <Icons.History />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};