
import React, { useMemo } from 'react';
import { Card, Combination } from '../types';
import { CardComponent } from './Card';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    combinations: Combination[];
    visible: boolean;
    placement?: 'top' | 'bottom';
}

export const RevealedCards: React.FC<Props> = ({ combinations, visible, placement = 'top' }) => {
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

    const positionClass = placement === 'top' 
        ? 'top-[140px] md:top-[170px]' 
        : 'bottom-[240px] md:bottom-[280px]'; // Position above player hand

    return (
        <div className={`absolute ${positionClass} left-0 right-0 z-50 pointer-events-none flex justify-center`}>
            <AnimatePresence>
                {visible && cards.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: placement === 'top' ? -20 : 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: placement === 'top' ? -20 : 20 }}
                        className="flex flex-col items-center gap-2"
                    >
                         {/* Card Row */}
                        <div className="flex items-center justify-center -space-x-6 md:-space-x-8">
                            {cards.map((card, i) => (
                                <motion.div
                                    key={`reveal-${card.id}`}
                                    initial={{ 
                                        y: placement === 'top' ? -50 : 50, 
                                        opacity: 0, 
                                        scale: 0.5, 
                                        rotateX: placement === 'top' ? 60 : -60 
                                    }}
                                    animate={{ 
                                        y: 0, opacity: 1, scale: 0.65, rotateX: 0,
                                        transition: { delay: i * 0.1, type: 'spring', damping: 15, stiffness: 200 }
                                    }}
                                    exit={{ 
                                        y: placement === 'top' ? -30 : 30, 
                                        opacity: 0, 
                                        scale: 0.5, 
                                        transition: { duration: 0.3 } 
                                    }}
                                    style={{ zIndex: i }}
                                    className={placement === 'top' ? "origin-top" : "origin-bottom"}
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
                            initial={{ scale: 0 }}
                            animate={{ scale: 1, transition: { delay: 0.3, type: 'spring' } }}
                            exit={{ scale: 0, opacity: 0 }}
                            className={`
                                backdrop-blur border px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-[0_4px_10px_rgba(0,0,0,0.5)] z-10 flex items-center gap-2
                                ${placement === 'top' 
                                    ? 'bg-gradient-to-r from-rose-950/90 to-slate-900/90 text-rose-200 border-rose-500/30' 
                                    : 'bg-gradient-to-r from-emerald-950/90 to-slate-900/90 text-emerald-200 border-emerald-500/30 order-first mb-2'}
                            `}
                        >
                            <span>{placement === 'top' ? 'Opponent Reveals' : 'You Reveal'}</span>
                            <div className={`w-1 h-1 rounded-full animate-pulse ${placement === 'top' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
