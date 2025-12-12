import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, GameState, TrickCard, Combination, GameSettings } from '../types';
import { CardComponent, CardBack } from './Card';
import { PlayerAvatar, ScoreBoard, MobileScorePill, Icons } from './UI';
import { CombinationControls } from './CombinationControls';
import { SUIT_COLORS, SUIT_SYMBOLS } from '../constants';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { calculateFanTransform, Z_INDEX } from '../utils/uiLogic';
import { getWinningCard } from '../utils/gameLogic';
import { useHaptics } from '../hooks/useHaptics';
import { useSoundManager } from '../hooks/useSoundManager';

interface TableProps {
  gameState: GameState;
  onPlayCard: (card: Card) => void;
  validMoves: Card[];
  settings: GameSettings;
  onUpdateSettings: (s: GameSettings) => void;
  onForfeit: () => void;
  showDeclarationModal?: boolean;
  onDeclareCombinations?: (combos: Combination[]) => void;
  heroCombinations?: Combination[];
  timeLeft?: number;
  beloteIds?: string[];
  onOpenHistory: () => void;
  onOpenChat: () => void;
  onOpenSettings: () => void;
  onOpenRules: () => void;
}

export const Table: React.FC<TableProps> = ({ 
    gameState, 
    onPlayCard, 
    validMoves, 
    settings,
    onUpdateSettings,
    showDeclarationModal,
    onDeclareCombinations,
    heroCombinations,
    timeLeft,
    beloteIds = [],
    onOpenHistory,
    onOpenChat,
    onOpenSettings,
    onOpenRules
}) => {
  const { players, currentTrick, trumpSuit, candidateCard, dealerId, phase, currentPlayerId, deck, trickCount } = gameState;
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedMobileCardId, setSelectedMobileCardId] = useState<string | null>(null);
  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const prevHeroHandLength = useRef(0);

  const triggerHaptic = useHaptics(settings.hapticsEnabled);
  const { playSound } = useSoundManager(settings.soundEnabled);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Sound Logic: Dealing ---
  useEffect(() => {
      const currentLen = players.hero.hand.length;
      if (currentLen > prevHeroHandLength.current && (phase === 'DEALING' || phase === 'BIDDING' || phase === 'PLAYING')) {
          // Cards added -> trigger staggered deal sound
          const count = currentLen - prevHeroHandLength.current;
          // Stagger sounds
          for (let i = 0; i < Math.min(count, 8); i++) {
              setTimeout(() => {
                  playSound('deal', { pan: Math.random() * 0.4 - 0.2 });
              }, i * 60);
          }
      }
      prevHeroHandLength.current = currentLen;
  }, [players.hero.hand.length, phase, playSound]);

  // Clear selection
  useEffect(() => {
    setSelectedMobileCardId(null);
  }, [currentPlayerId, players.hero.hand.length]);

  const trickPositions = {
      hero: { x: 10, y: 10, rotate: 5 },
      opponent: { x: -10, y: -10, rotate: -5 },
  };

  const currentTrickWinnerId = useMemo(() => {
    if (currentTrick.length !== 2 || !trumpSuit) return null;
    return getWinningCard(currentTrick, trumpSuit)?.playerId;
  }, [currentTrick, trumpSuit]);

  const highlightedCardIds = useMemo(() => {
      if (trickCount !== 1) return new Set<string>();
      const ids = new Set<string>();
      if (players.hero.hasShownCombinations) {
          players.hero.declaredCombinations.forEach(c => c.cards.forEach(card => ids.add(card.id)));
      }
      if (players.opponent.hasShownCombinations) {
          players.opponent.declaredCombinations.forEach(c => c.cards.forEach(card => ids.add(card.id)));
      }
      return ids;
  }, [trickCount, players.hero.declaredCombinations, players.hero.hasShownCombinations, players.opponent.declaredCombinations, players.opponent.hasShownCombinations]);

  const handleMobileCardClick = (card: Card, isPlayable: boolean) => {
    if (!isPlayable) {
        triggerHaptic('error');
        return;
    }
    if (selectedMobileCardId === card.id) {
        onPlayCard(card);
    } else {
        triggerHaptic('light'); 
        playSound('rustle', { volume: 0.5 });
        setSelectedMobileCardId(card.id);
    }
  };

  const handleMobileDragEnd = (e: any, info: PanInfo, card: Card, isPlayable: boolean) => {
      if (!isPlayable) {
          triggerHaptic('error');
          return;
      }
      if (info.offset.y < -60) { 
          triggerHaptic('medium'); 
          onPlayCard(card);
      }
  };

  const handleBackgroundClick = (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
          setSelectedMobileCardId(null);
      }
  };

  const transitionConfig = isMobile 
    ? { type: "tween" as const, ease: "backOut" as const, duration: 0.35 } 
    : { type: "spring" as const, stiffness: 200, damping: 25 };

  return (
    <div 
        className="relative w-full h-full overflow-hidden wood-table-bg flex flex-col select-none"
        onClick={handleBackgroundClick}
    >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,rgba(0,0,0,0.85)_100%)] pointer-events-none z-0" />

        <div className="absolute inset-0 flex items-center justify-center z-[1]">
             <div className="relative w-[96%] h-[65%] md:w-[85%] md:h-[75%] rounded-[100%] bg-[#1a472a] shadow-[0_25px_60px_rgba(0,0,0,0.7)] border-[12px] md:border-[16px] border-[#2d1b0e]">
                <div className="absolute -inset-[2px] rounded-[100%] border border-white/10 pointer-events-none" />
                <div className="absolute inset-0 rounded-[100%] shadow-[inset_0_0_80px_rgba(0,0,0,0.6)] pointer-events-none" />
                <div className="absolute inset-3 md:inset-8 rounded-[100%] border-2 border-[#d4af37]/30 pointer-events-none shadow-[0_0_15px_rgba(212,175,55,0.1)]" />
                <div className="absolute inset-0 opacity-30 rounded-[100%] pointer-events-none mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.5'/%3E%3C/svg%3E")` }} />
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none mix-blend-overlay">
                    <div className="w-32 h-32 md:w-56 md:h-56 border-8 border-[#d4af37] rotate-45 flex items-center justify-center">
                         <div className="w-24 h-24 md:w-40 md:h-40 border-4 border-[#d4af37]" />
                    </div>
                </div>
             </div>
        </div>

        <main className="relative flex-1 w-full h-full z-[${Z_INDEX.TABLE_ZONES}]">

            {gameState.lastTrick && gameState.lastTrick.length > 0 && (
                <div className="absolute right-4 md:right-16 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-[10] opacity-80 hover:opacity-100 transition-opacity">
                    <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 bg-black/30 px-2 py-1 rounded backdrop-blur-sm border border-white/5">Last Trick</div>
                    <div className="relative w-20 h-28 md:w-24 md:h-32">
                        {gameState.lastTrick.map((tick, i) => (
                             <div 
                                key={`last-trick-${tick.card.id}`}
                                className="absolute top-0 left-0"
                                style={{ transform: `translate(${i * 10}px, ${i * 10}px) rotate(${i * 5}deg) scale(0.85)`, zIndex: i }}
                             >
                                <CardComponent card={tick.card} disabled className="shadow-sm" hoverable={false} />
                             </div>
                        ))}
                    </div>
                </div>
            )}

            <div className={`
                absolute transition-all duration-500 z-[${Z_INDEX.DECK}]
                top-20 left-4 scale-[0.65] origin-top-left
                md:top-1/2 md:left-12 md:scale-100 md:-translate-y-1/2
            `}>
                 {deck.length > 0 && (
                    <motion.div className="relative w-24 h-36" whileHover={{ scale: 1.05 }}>
                        {[2,1,0].map((i) => (
                             <div key={i} className="absolute inset-0 rounded-xl shadow-lg border border-white/5" style={{ transform: `translate(${i}px, ${-i}px)` }}>
                                 <CardBack shadow={false} />
                             </div>
                         ))}
                         <span className="absolute -bottom-6 left-0 right-0 text-center text-[10px] font-bold text-white/50 tracking-wider">{deck.length} LEFT</span>
                    </motion.div>
                 )}

                 <div className="absolute top-0 left-32 flex flex-col items-center justify-center min-w-[100px]">
                     {trumpSuit && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.5, rotate: -90 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            className="flex flex-col items-center gap-2"
                        >
                            <div className="relative group">
                                <div className="absolute -inset-2 bg-gold/10 rounded-full blur-xl animate-pulse-slow"></div>
                                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-b from-slate-800 to-slate-950 border-2 border-gold/30 flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] backdrop-blur-md relative z-10">
                                    <span className={`text-4xl md:text-5xl drop-shadow-lg transform transition-transform group-hover:scale-110 ${
                                        (trumpSuit === 'H' || trumpSuit === 'D') ? 'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]' : 'text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.4)]'
                                    }`}>
                                        {SUIT_SYMBOLS[trumpSuit]}
                                    </span>
                                </div>
                                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-600 to-amber-700 text-white text-[9px] font-black px-3 py-0.5 rounded shadow-lg uppercase tracking-widest border border-white/10 z-20 whitespace-nowrap">Trump</div>
                            </div>
                        </motion.div>
                     )}

                     {candidateCard && phase === 'BIDDING' && (
                         <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
                             <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/60 text-white/80 text-[10px] font-bold px-2 py-1 rounded border border-white/10 backdrop-blur-sm">Candidate</div>
                             <CardComponent card={candidateCard} disabled className="opacity-100 shadow-2xl hover:scale-105 transition-transform" />
                         </motion.div>
                     )}
                 </div>
            </div>

            <div className={`absolute top-1/2 left-1/2 w-0 h-0 z-[${Z_INDEX.TRICK_CARDS}]`}>
                <AnimatePresence>
                    {currentTrick.map((tick, index) => {
                        const pos = tick.playerId === 'hero' ? trickPositions.hero : trickPositions.opponent;
                        const initialYVal = tick.playerId === 'hero' ? 250 : -250;
                        const exitX = -350; 
                        const exitY = currentTrickWinnerId === 'hero' ? (isMobile ? 280 : 250) : (isMobile ? -280 : -250);

                        return (
                            <motion.div
                                key={tick.card.id}
                                layout={!isMobile}
                                initial={{ opacity: 0.8, scale: 0.8, x: 0, y: initialYVal }}
                                animate={{ 
                                    opacity: 1, scale: 1, x: pos.x, y: pos.y, 
                                    rotate: pos.rotate + (Math.random() * 6 - 3),
                                    zIndex: index + 50,
                                    transition: transitionConfig
                                }}
                                onAnimationStart={() => {
                                    // Trigger Placement Sound
                                    if (tick.playerId === 'hero') playSound('place_hero', { pan: 0 });
                                    else playSound('place_opp', { pan: 0 }); // Removed volume reduction
                                }}
                                exit={{ 
                                    scale: 0.4, opacity: 0, x: exitX, y: exitY, 
                                    transition: { duration: 0.5, ease: "backIn" } 
                                }} 
                                onAnimationComplete={(definition) => {
                                    // If this is the exit animation
                                    if (definition === 'exit' && index === 0) {
                                         // Safely determine winner, falling back to lastTrick if currentTrick is empty during exit
                                         let winnerId = currentTrickWinnerId;
                                         if (!winnerId && gameState.lastTrick && gameState.lastTrick.length === 2 && trumpSuit) {
                                              winnerId = getWinningCard(gameState.lastTrick, trumpSuit)?.playerId;
                                         }
                                         
                                         const isHeroWin = winnerId === 'hero';
                                         playSound('slide', { 
                                             volume: isHeroWin ? 0.7 : 0.35, 
                                             pan: isHeroWin ? 0 : (Math.random() < 0.5 ? -0.15 : 0.15) 
                                         });
                                    }
                                }}
                                className="absolute top-0 left-0 drop-shadow-2xl -ml-12 -mt-18 md:-ml-14 md:-mt-20 lg:-ml-16 lg:-mt-22"
                            >
                                <CardComponent 
                                    card={tick.card} 
                                    disabled 
                                    isTrump={tick.card.suit === trumpSuit} 
                                    trumpSuit={trumpSuit} 
                                    hoverable={false}
                                    isBelote={beloteIds.includes(tick.card.id)} 
                                />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            <div className={`absolute top-[-40px] left-1/2 -translate-x-1/2 w-[120%] md:w-[800px] h-[160px] z-[${Z_INDEX.OPPONENT_CARDS}] pointer-events-none`}>
                 <div className="relative w-full h-full">
                    <AnimatePresence>
                        {players.opponent.hand.map((card, i) => {
                            const { rotate, translateX, translateY, zIndex } = calculateFanTransform(i, players.opponent.hand.length, true, isMobile);
                            return (
                                <motion.div
                                    key={card.id}
                                    layout={!isMobile}
                                    className="absolute top-8 left-1/2 origin-top-center"
                                    style={{ 
                                        zIndex: zIndex, width: isMobile ? '5rem' : '7rem', transformOrigin: 'top center',
                                        willChange: "transform", transformStyle: "preserve-3d"
                                    }}
                                    initial={{ x: -window.innerWidth/2, y: 100, opacity: 0 }} 
                                    animate={{ 
                                        x: translateX - (isMobile ? 40 : 56), y: translateY,
                                        rotate: rotate, opacity: 1, transition: transitionConfig
                                    }}
                                >
                                    <CardComponent 
                                        card={card} 
                                        faceDown 
                                        disabled 
                                        className="shadow-xl" 
                                        isBelote={beloteIds.includes(card.id)}
                                    />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                 </div>
            </div>
            
            {isMobile ? (
                <div 
                    className="absolute bottom-0 left-0 right-0 z-[${Z_INDEX.PLAYER_CARDS}] px-4 flex overflow-x-auto snap-x items-end -space-x-4 scrollbar-hide py-4 touch-pan-x" 
                    style={{ 
                        WebkitOverflowScrolling: 'touch',
                        paddingBottom: 'calc(6rem + env(safe-area-inset-bottom))'
                    }}
                    ref={mobileContainerRef}
                >
                    <AnimatePresence>
                        {players.hero.hand.map((card) => {
                            const isValid = validMoves.some(v => v.id === card.id);
                            const isMyTurn = currentPlayerId === 'hero' && phase === 'PLAYING';
                            const isPlayable = isMyTurn && isValid && currentTrick.length < 2;
                            const isHighlighted = highlightedCardIds.has(card.id);
                            const isSelected = selectedMobileCardId === card.id;

                            return (
                                <div key={card.id} className="relative flex-shrink-0 snap-center pl-1" style={{ width: '85px', height: '140px', zIndex: isSelected ? 50 : 1 }}>
                                    <AnimatePresence>
                                        {isSelected && isPlayable && (
                                            <motion.button
                                                initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                                animate={{ opacity: 1, y: -40, scale: 1 }}
                                                exit={{ opacity: 0, y: 10, scale: 0.8 }}
                                                className="absolute top-0 left-1/2 -translate-x-1/2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold text-xs px-4 py-2 rounded-full shadow-lg z-50 whitespace-nowrap border border-white/20"
                                                onClick={(e) => { e.stopPropagation(); onPlayCard(card); }}
                                            >
                                                Tap to Play
                                            </motion.button>
                                        )}
                                    </AnimatePresence>

                                    <motion.div
                                        drag={isPlayable ? "y" : false}
                                        dragConstraints={{ top: 0, bottom: 0 }}
                                        dragElastic={{ top: 0.2, bottom: 0.05 }}
                                        onDragEnd={(e, info) => handleMobileDragEnd(e, info, card, isPlayable)}
                                        animate={{
                                            y: isSelected ? -20 : 0,
                                            scale: isSelected ? 1.05 : 1,
                                            zIndex: isSelected ? 50 : 1
                                        }}
                                        onClick={(e) => { e.stopPropagation(); handleMobileCardClick(card, isPlayable); }}
                                        className="w-full h-full"
                                    >
                                        <CardComponent 
                                            card={card} 
                                            disabled={!isPlayable} 
                                            isPlayable={isPlayable}
                                            isInvalid={isMyTurn && !isValid}
                                            trumpSuit={trumpSuit}
                                            isTrump={card.suit === trumpSuit}
                                            isWinningComboCard={isHighlighted}
                                            isBelote={beloteIds.includes(card.id)}
                                            hoverable={false}
                                            className="w-full h-full"
                                        />
                                    </motion.div>
                                </div>
                            );
                        })}
                    </AnimatePresence>
                    <div className="flex-shrink-0 w-4 h-1"></div>
                </div>
            ) : (
                <div className={`absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-[900px] h-[220px] z-[${Z_INDEX.PLAYER_CARDS}] pointer-events-none`}>
                    <div className="relative w-full h-full">
                        <AnimatePresence>
                            {players.hero.hand.map((card, i) => {
                                const isValid = validMoves.some(v => v.id === card.id);
                                const isMyTurn = currentPlayerId === 'hero' && phase === 'PLAYING';
                                const isPlayable = isMyTurn && isValid && currentTrick.length < 2;
                                
                                const isInvalid = isMyTurn && !isValid;
                                const isHighlighted = highlightedCardIds.has(card.id);
                                const { rotate, translateX, translateY, zIndex } = calculateFanTransform(i, players.hero.hand.length, false, false);

                                return (
                                    <motion.div
                                        key={card.id}
                                        className="absolute bottom-6 left-1/2 pointer-events-auto origin-bottom"
                                        style={{ 
                                            zIndex: isHighlighted ? Z_INDEX.PLAYER_CARDS + 50 : zIndex, 
                                            width: '8rem', transformOrigin: 'bottom center', transformStyle: "preserve-3d"
                                        }}
                                        initial={{ x: -window.innerWidth / 2, y: window.innerHeight, opacity: 0 }}
                                        animate={{ 
                                            x: translateX - 64, 
                                            y: isHighlighted ? translateY - 40 : translateY, 
                                            rotate: rotate, opacity: 1, scale: 1, transition: transitionConfig
                                        }}
                                        onClick={() => {
                                            if (!isPlayable) {
                                                triggerHaptic('error'); 
                                                return;
                                            }
                                            onPlayCard(card);
                                        }}
                                        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }} 
                                    >
                                        <CardComponent 
                                            card={card} 
                                            disabled={!isPlayable}
                                            isPlayable={isPlayable}
                                            isInvalid={isInvalid}
                                            trumpSuit={trumpSuit}
                                            isTrump={card.suit === trumpSuit}
                                            hoverable={false} 
                                            className={isPlayable ? 'shadow-card-float' : ''}
                                            isWinningComboCard={isHighlighted}
                                            isBelote={beloteIds.includes(card.id)}
                                        />
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            <PlayerAvatar player={players.opponent} position="top" isActive={currentPlayerId === 'opponent'} isDealer={dealerId === 'opponent'} />
            <PlayerAvatar player={players.hero} position="bottom" isActive={currentPlayerId === 'hero'} isDealer={dealerId === 'hero'} />
            <ScoreBoard heroScore={players.hero.score} oppScore={players.opponent.score} target={gameState.gameTarget} round={gameState.roundHistory.length + 1} />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 md:hidden z-[${Z_INDEX.SCOREBOARD}]">
                <MobileScorePill round={gameState.roundHistory.length + 1} target={gameState.gameTarget} />
            </div>

            {showDeclarationModal && onDeclareCombinations && heroCombinations && (
                <CombinationControls phase="DECLARE" combinations={heroCombinations} onDeclare={onDeclareCombinations} timeLeft={timeLeft} />
            )}
        </main>

        <div className="fixed bottom-0 left-0 right-0 px-4 py-2 flex justify-between items-end pointer-events-none z-[500] pb-safe">
            <button onClick={onOpenHistory} className="pointer-events-auto bg-black/60 backdrop-blur-md text-slate-300 p-3 rounded-full border border-white/10 shadow-lg hover:bg-black/80 hover:text-white transition-colors hover:scale-105 active:scale-95 group" aria-label="Round History"><div className="group-hover:-translate-y-1 transition-transform"><Icons.History /></div></button>
            <button onClick={onOpenChat} className="pointer-events-auto bg-black/60 backdrop-blur-md text-slate-300 p-3 rounded-full border border-white/10 shadow-lg hover:bg-black/80 hover:text-white transition-colors hover:scale-105 active:scale-95 group" aria-label="Chat & Emotes"><div className="group-hover:-translate-y-1 transition-transform"><Icons.Chat /></div></button>
        </div>

        <div className="absolute z-[40] flex gap-2" style={{ top: 'max(1rem, env(safe-area-inset-top))', right: 'max(1rem, env(safe-area-inset-right))' }}>
            <button onClick={onOpenRules} className="bg-slate-900/80 p-2 rounded-full border border-white/10 text-slate-400 hover:text-white transition-colors" title="Rules"><span className="font-bold text-lg w-6 h-6 flex items-center justify-center">?</span></button>
            <button onClick={onOpenSettings} className="bg-slate-900/80 p-2 rounded-full border border-white/10 text-slate-400 hover:text-white transition-colors" title="Settings"><Icons.Settings /></button>
        </div>
    </div>
  );
};