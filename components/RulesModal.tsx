import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Z_INDEX } from '../utils/uiLogic';
import { SUIT_SYMBOLS } from '../constants';

interface RulesModalProps {
    onClose: () => void;
    initialTab?: 'basics' | 'ranking';
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose, initialTab = 'basics' }) => {
    const [tab, setTab] = useState<'basics' | 'ranking'>(initialTab);

    return (
        <div className={`fixed inset-0 flex items-center justify-center z-[${Z_INDEX.MODALS_BACKDROP}] p-4`}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="relative glass-modal w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl z-[${Z_INDEX.MODALS_CONTENT}] flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 flex justify-between items-center border-b border-white/10 shrink-0">
                    <h2 className="text-xl font-black text-white font-serif tracking-wide">Game Rules</h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 bg-black/20 shrink-0">
                    <button 
                        onClick={() => setTab('basics')}
                        className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${tab === 'basics' ? 'text-gold bg-white/5 border-b-2 border-gold' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Basics & Scoring
                    </button>
                    <button 
                        onClick={() => setTab('ranking')}
                        className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${tab === 'ranking' ? 'text-gold bg-white/5 border-b-2 border-gold' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        Card Values (Cheat Sheet)
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-6 md:p-8 space-y-6 bg-slate-900/50 custom-scrollbar">
                    {tab === 'basics' && (
                        <div className="space-y-6 text-slate-300 text-sm leading-relaxed">
                            <section>
                                <h3 className="text-white font-bold mb-2 text-base">The Goal</h3>
                                <p>Reaching <strong className="text-white">501 points</strong>. Points are scored by winning tricks containing valuable cards and announcing combinations (Declarations).</p>
                            </section>
                            
                            <section>
                                <h3 className="text-white font-bold mb-2 text-base">The Contract</h3>
                                <p>Each round starts with a bidding phase. If you take the bid, you become the <strong className="text-emerald-400">Attacker</strong>. You must score more points than your opponent to fulfill your contract.</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1 marker:text-gold">
                                    <li><strong className="text-white">Normal Win:</strong> You score your points, opponent scores theirs.</li>
                                    <li><strong className="text-amber-400">Dedans (Fail):</strong> If you score less than the opponent, you get 0 points (except Belote). Opponent gets ALL points (162 + Declarations).</li>
                                    <li><strong className="text-gold">Capot (Perfect):</strong> Winning all 9 tricks. Bonus <strong className="text-gold">+90 points</strong>.</li>
                                </ul>
                            </section>

                            <section>
                                <h3 className="text-white font-bold mb-2 text-base">Declarations</h3>
                                <p>Announce combinations during the <strong>first trick</strong> to score bonus points.</p>
                                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                                    <div className="bg-white/5 p-2 rounded border border-white/5 flex justify-between"><span>Tierce (3 seq)</span> <span className="text-gold font-bold">20</span></div>
                                    <div className="bg-white/5 p-2 rounded border border-white/5 flex justify-between"><span>Fifty (4 seq)</span> <span className="text-gold font-bold">50</span></div>
                                    <div className="bg-white/5 p-2 rounded border border-white/5 flex justify-between"><span>Hundred (5 seq)</span> <span className="text-gold font-bold">100</span></div>
                                    <div className="bg-white/5 p-2 rounded border border-white/5 flex justify-between"><span>Carré (4 same)</span> <span className="text-gold font-bold">100-200</span></div>
                                </div>
                            </section>
                        </div>
                    )}

                    {tab === 'ranking' && (
                        <div className="space-y-8">
                            {/* Trump Table */}
                            <div>
                                <h3 className="text-center font-bold text-amber-400 uppercase tracking-widest mb-4 flex items-center justify-center gap-2">
                                    <span className="text-xl">👑</span> Trump Suit Values
                                </h3>
                                <div className="grid grid-cols-6 gap-2">
                                    {[
                                        { r: 'J', v: 20, label: 'Right Bower' },
                                        { r: '9', v: 14, label: 'Left Bower' },
                                        { r: 'A', v: 11, label: '' },
                                        { r: '10', v: 10, label: '' },
                                        { r: 'K', v: 4, label: '' },
                                        { r: 'Q', v: 3, label: '' }
                                    ].map((item, i) => (
                                        <div key={item.r} className="flex flex-col items-center gap-2 bg-gradient-to-b from-amber-900/40 to-amber-900/10 border border-amber-500/30 p-2 rounded-xl relative overflow-hidden group">
                                            <span className="text-2xl font-black text-amber-200">{item.r}</span>
                                            <div className="w-full h-px bg-amber-500/30" />
                                            <span className="text-lg font-bold text-white">{item.v}</span>
                                            {item.label && <span className="absolute bottom-1 text-[8px] uppercase tracking-tighter text-amber-400/60 font-bold">{item.label}</span>}
                                        </div>
                                    ))}
                                </div>
                                <p className="text-center text-xs text-slate-400 mt-2">J and 9 become the most powerful cards.</p>
                            </div>

                            {/* Non-Trump Table */}
                            <div>
                                <h3 className="text-center font-bold text-slate-300 uppercase tracking-widest mb-4">Non-Trump Values</h3>
                                <div className="grid grid-cols-6 gap-2">
                                    {[
                                        { r: 'A', v: 11 },
                                        { r: '10', v: 10 },
                                        { r: 'K', v: 4 },
                                        { r: 'Q', v: 3 },
                                        { r: 'J', v: 2 },
                                        { r: '9', v: 0 }
                                    ].map((item, i) => (
                                        <div key={item.r} className="flex flex-col items-center gap-2 bg-white/5 border border-white/10 p-2 rounded-xl">
                                            <span className="text-2xl font-black text-slate-300">{item.r}</span>
                                            <div className="w-full h-px bg-white/10" />
                                            <span className={`text-lg font-bold ${item.v > 0 ? 'text-white' : 'text-slate-600'}`}>{item.v}</span>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-center text-xs text-slate-400 mt-2">Standard hierarchy: A {'>'} 10 {'>'} K {'>'} Q {'>'} J {'>'} 9</p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-900 border-t border-white/10 shrink-0">
                    <button onClick={onClose} className="w-full btn-base bg-white text-slate-900 font-bold py-3 rounded-xl hover:bg-slate-200">Got it</button>
                </div>
            </motion.div>
        </div>
    );
};