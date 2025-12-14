import React, { useMemo } from 'react';
import { Card, Combination } from '../types';
import { CardComponent } from './Card';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    combinations: Combination[];
    visible: boolean;
}

export const OpponentRevealedCards: React.FC<Props> = ({ combinations, visible }) => {
    // Flatten and deduplicate cards from combinations (excluding Belote usually, or keeping it if desired)
    // We strictly filter for "Bonus" combinations like Tierce, Carre, etc.
    const cards = useMemo(() => {
        const unique = new Map<string, Card>();
        combinations
            .filter(c => c.type !== 'BELOTE') // Belote is usually just announced verbally/icon, these are "Melds"
            .forEach(c => {
                c.cards.forEach(card => unique.set(card.id, card));
            });
        // Convert to array
        return Array.from(unique.values());
    }, [combinations]);

    return (
        <div className="absolute top-[140px] md:top-[170px] left-0 right-0 z-50 pointer-events-none flex justify-center">
            <AnimatePresence>
                {visible && cards.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center gap-2"
                    >
                         {/* Card Row */}
                        <div className="flex items-center justify-center -space-x-6 md:-space-x-8">
                            {cards.map((card, i) => (
                                <motion.div
                                    key={`reveal-${card.id}`}
                                    initial={{ y: -50, opacity: 0, scale: 0.5, rotateX: 60 }}
                                    animate={{ 
                                        y: 0, opacity: 1, scale: 0.65, rotateX: 0,
                                        transition: { delay: i * 0.1, type: 'spring', damping: 15, stiffness: 200 }
                                    }}
                                    exit={{ y: -30, opacity: 0, scale: 0.5, transition: { duration: 0.3 } }}
                                    style={{ zIndex: i }}
                                    className="origin-top"
                                >
                                    <CardComponent 
                                        card={card} 
                                        hoverable={false} 
                                        disabled
                                        className="shadow-2xl ring-1 ring-white/20 rounded-xl"
                                    />
                                </motion.div>
                            ))}
                        </div>
                        
                        {/* Caption Badge */}
                        <motion.div 
                            initial={{ scale: 0, y: 10 }}
                            animate={{ scale: 1, y: 0, transition: { delay: 0.3, type: 'spring' } }}
                            exit={{ scale: 0, opacity: 0 }}
                            className="bg-gradient-to-r from-rose-950/90 to-slate-900/90 backdrop-blur text-rose-200 border border-rose-500/30 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-[0_4px_10px_rgba(0,0,0,0.5)] z-10 flex items-center gap-2"
                        >
                            <span>Revealed</span>
                            <div className="w-1 h-1 bg-rose-500 rounded-full animate-pulse" />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};