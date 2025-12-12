import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Z_INDEX } from '../utils/uiLogic';
import { RulesModal } from './RulesModal';

interface TutorialOverlayProps {
    step: number;
    onNext: () => void;
    onSkip: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ step, onNext, onSkip }) => {
    
    // Step 1: Hand
    // Step 2: Candidate/Bidding
    // Step 3: Cheat Sheet (We render RulesModal internally or point to it)

    if (step === 0) return null;

    return (
        <div className={`fixed inset-0 z-[${Z_INDEX.MODALS_BACKDROP + 50}] pointer-events-none`}>
            {/* Dark Backdrop blocks interaction */}
            <div className="absolute inset-0 bg-black/60 transition-opacity duration-500 pointer-events-auto" />

            {/* Content Container */}
            <div className="absolute inset-0 pointer-events-auto">
                <AnimatePresence mode='wait'>
                    
                    {/* STEP 1: WELCOME & HAND */}
                    {step === 1 && (
                        <motion.div 
                            key="step1"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="absolute bottom-40 left-1/2 -translate-x-1/2 w-80 md:w-96"
                        >
                            <div className="bg-white text-slate-900 p-6 rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.2)] border-4 border-gold relative">
                                {/* Triangle Pointer Down */}
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gold" />
                                
                                <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                                    👋 Welcome!
                                </h3>
                                <p className="text-sm font-medium text-slate-600 mb-4 leading-relaxed">
                                    This is your hand. In <strong>Blot</strong>, card values change depending on the <strong>Trump Suit</strong>.
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={onSkip} className="flex-1 py-2 font-bold text-slate-400 hover:text-slate-600 text-xs uppercase tracking-wider">Skip Tour</button>
                                    <button onClick={onNext} className="flex-1 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-500">Next</button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 2: BIDDING */}
                    {step === 2 && (
                        <motion.div 
                            key="step2"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="absolute top-48 left-8 md:top-1/2 md:-translate-y-1/2 md:left-48 w-72"
                        >
                            <div className="bg-white text-slate-900 p-6 rounded-2xl shadow-[0_0_50px_rgba(255,255,255,0.2)] border-4 border-gold relative">
                                {/* Pointer Left (Desktop) or Up (Mobile) */}
                                <div className="hidden md:block absolute right-full top-1/2 -translate-y-1/2 border-8 border-transparent border-r-gold" />
                                <div className="md:hidden absolute bottom-full left-8 border-8 border-transparent border-b-gold" />

                                <h3 className="text-lg font-black mb-2">The Contract</h3>
                                <p className="text-sm font-medium text-slate-600 mb-4 leading-relaxed">
                                    This is the <strong>Trump Candidate</strong>. 
                                    <br/><br/>
                                    If you take it, this suit becomes Trump, and you <strong>must</strong> score more points than your opponent to win.
                                </p>
                                <button onClick={onNext} className="w-full py-2 bg-indigo-600 text-white font-bold rounded-lg shadow-lg hover:bg-indigo-500">Next</button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 3: CHEAT SHEET */}
                    {step === 3 && (
                        <div className="flex items-center justify-center h-full p-4 pointer-events-auto">
                            <RulesModal onClose={onNext} initialTab="ranking" />
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};