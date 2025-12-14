
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Card, GameState, TrickCard, Combination, GameSettings } from '../types';
import { CardComponent, CardBack } from './Card';
import { PlayerAvatar, ScoreBoard, MobileScorePill, Icons } from './UI';
import { CombinationControls } from './CombinationControls';
import { RevealedCards } from './OpponentRevealedCards';
import { TrumpBadge } from './TrumpBadge';
import { SUIT_COLORS, SUIT_SYMBOLS } from '../constants';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { calculateFanTransform, Z_INDEX } from '../utils/uiLogic';
import { getWinningCard } from '../utils/gameLogic';
import { useHaptics } from '../hooks/useHaptics';
import { useSoundManager } from '../hooks/useSoundManager';
import { useDealAnimation } from '../hooks/useDealAnimation';

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
  onShowCombinations?: () => void;
  canDeclare?: boolean;
  onOpenDeclaration?: () => void;
  candidateRejected?: boolean;
  onDistributionComplete?: () => void;
}

export const Table: React.FC<TableProps> = ({ 
    gameState, 
    onPlayCard, 
    validMoves, 
    settings,
    showDeclarationModal,
    onDeclareCombinations,
    heroCombinations,
    timeLeft,
    beloteIds = [],
    onOpenHistory,
    onOpenChat,
    onOpenSettings,
    onOpenRules,
    onShowCombinations,
    canDeclare,
    onOpenDeclaration,
    candidateRejected,
    onDistributionComplete
}) => {
  const { players, currentTrick, trumpSuit, candidateCard, dealerId, phase, currentPlayerId, deck, trickCount, bidTaker, contractType } = gameState;
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedMobileCardId, setSelectedMobileCardId] = useState<string | null>(null);
  const [viewingDeclarationsPlayerId, setViewingDeclarationsPlayerId] = useState<'hero' | 'opponent' | null>(null);
  
  // --- REVEAL STATES ---
  const [showOpponentReveal, setShowOpponentReveal] = useState(false);
  const [showHeroReveal, setShowHeroReveal] = useState(false);
  
  const hasTriggeredTrick2Reveal = useRef(false);
  const hasTriggeredHeroReveal = useRef(false);

  const dealStage = useDealAnimation({ 
      phase, 
      onComplete: onDistributionComplete || (() => {}) 
  });

  const prevHeroHandLength = useRef(0);
  const triggerHaptic = useHaptics(settings.hapticsEnabled);
  const { playSound } = useSoundManager(settings.soundEnabled);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Reset Reveals on New Round ---
  useEffect(() => {
      if (trickCount === 0) {
          hasTriggeredTrick2Reveal.current = false;
          hasTriggeredHeroReveal.current = false;
          setShowOpponentReveal(false);
          setShowHeroReveal(false);
      }
  }, [trickCount]);

  // --- Opponent Reveal Logic ---
  useEffect(() => {
    if (trickCount === 1 && currentPlayerId === 'opponent') {
        const hasBonus = players.opponent.declaredCombinations.some(c => c.type !== 'BELOTE');
        if (hasBonus && !hasTriggeredTrick2Reveal.current) {
            setShowOpponentReveal(true);
            playSound('slide', { volume: 0.5 });
            hasTriggeredTrick2Reveal.current = true;
            setTimeout(() => setShowOpponentReveal(false), 4000); 
        }
    }
  }, [trickCount, currentPlayerId, players.opponent.declaredCombinations, playSound]);

  // --- Hero Reveal Logic ---
  useEffect(() => {
      if (trickCount === 1 && players.hero.hasShownCombinations) {
          const hasBonus = players.hero.declaredCombinations.some(c => c.type !== 'BELOTE');
          if (hasBonus && !hasTriggeredHeroReveal.current) {
              setShowHeroReveal(true);
              playSound('slide', { volume: 0.5 });
              hasTriggeredHeroReveal.current = true;
              setTimeout(() => setShowHeroReveal(false), 3000);
          }
      }
  }, [trickCount, players.hero.hasShownCombinations, players.hero.declaredCombinations, playSound]);

  // --- Audio Effects ---
  useEffect(() => {
      if (phase === 'DEALING') {
         const currentLen = players.hero.hand.length;
         if (currentLen > prevHeroHandLength.current) {
              const count = currentLen - prevHeroHandLength.current;
              for (let i = 0; i < Math.min(count, 8); i++) {
                  setTimeout(() => playSound('deal', { pan: Math.random() * 0.4 - 0.2 }), i * 60);
              }
         }
         prevHeroHandLength.current = currentLen;
      }
      if (dealStage === 'deck_deal') {
          for (let i = 0; i < 3; i++) {
              setTimeout(() => playSound('deal', { pan: Math.random() * 0.4 - 0.2 }), i * 150);
          }
      }
  }, [players.hero.hand.length, phase, playSound, dealStage]);

  useEffect(() => {
    setSelectedMobileCardId(null);
  }, [currentPlayerId, players.hero.hand.length]);

  // --- MEMOIZED VALUES ---

  const currentTrickWinnerId = useMemo(() => {
    if (currentTrick.length !== 2) return null; 
    return getWinningCard(currentTrick, trumpSuit, contractType)?.playerId;
  }, [currentTrick, trumpSuit, contractType]);

  const highlightedCardIds = useMemo(() => {
      if (trickCount !== 1) return new Set<string>();
      const ids = new Set<string>();
      const collectIds = (combos: Combination[]) => combos.forEach(c => c.cards.forEach(card => ids.add(card.id)));
      
      if (players.hero.hasShownCombinations) collectIds(players.hero.declaredCombinations);
      if (players.opponent.hasShownCombinations) collectIds(players.opponent.declaredCombinations);
      
      return ids;
  }, [trickCount, players.hero.declaredCombinations, players.hero.hasShownCombinations, players.opponent.declaredCombinations, players.opponent.hasShownCombinations]);

  const canShowCombinations = useMemo(() => {
      return phase === 'PLAYING' && 
             trickCount === 1 && 
             currentPlayerId === 'hero' && 
             players.hero.declaredCombinations.some(c => c.type !== 'BELOTE') && 
             !players.hero.hasShownCombinations;
  }, [phase, trickCount, currentPlayerId, players.hero.declaredCombinations, players.hero.hasShownCombinations]);

  // --- HANDLERS ---

  const handleMobileCardClick = useCallback((card: Card, isPlayable: boolean) => {
    if (!isPlayable) {
        triggerHaptic('error');
        return;
    }
    triggerHaptic('light');
    onPlayCard(card);
  }, [onPlayCard, triggerHaptic]);

  const handleBackgroundClick = useCallback((e: React.MouseEvent) => {
      if (e.target === e.currentTarget) setSelectedMobileCardId(null);
  }, []);

  const transitionConfig = isMobile 
    ? { type: "tween" as const, ease: "backOut" as const, duration: 0.35 } 
    : { type: "spring" as const, stiffness: 200, damping: 25 };

  const trickPositions = { hero: { x: 10, y: 10, rotate: 5 }, opponent: { x: -10, y: -10, rotate: -5 } };

  return (
    <div 
        className="relative w-full h-full overflow-hidden wood-table-bg flex flex-col select-none"
        onClick={handleBackgroundClick}
    >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_10%,rgba(0,0,0,0.85)_100%)] pointer-events-none z-0" />
        
        {/* Central Decor */}
        <div className="absolute inset-0 flex items-center justify-center z-[1]">
             <div className="relative w-[96%] h-[65%] md:w-[85%] md:h-[75%] rounded-[100%] bg-[#1a472a] shadow-[0_25px_60px_rgba(0,0,0,0.7)] border-[12px] md:border-[16px] border-[#2d1b0e]">
                <div className="absolute -inset-[2px] rounded-[100%] border border-white/10 pointer-events-none" />
             </div>
        </div>

        <main className="relative flex-1 w-full h-full" style={{ zIndex: Z_INDEX.TABLE_ZONES }}>
            {/* Last Trick */}
            {gameState.lastTrick && gameState.lastTrick.length > 0 && (
                <div className="absolute right-4 md:right-16 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center z-[10] opacity-80 hover:opacity-100 transition-opacity">
                    <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-2 bg-black/30 px-2 py-1 rounded backdrop-blur-sm border border-white/5">Last Trick</div>
                    <div className="relative w-20 h-28 md:w-24 md:h-32">
                        {gameState.lastTrick.map((tick, i) => (
                             <div key={`last-trick-${tick.card.id}`} className="absolute top-0 left-0" style={{ transform: `translate(${i * 10}px, ${i * 10}px) rotate(${i * 5}deg) scale(0.85)`, zIndex: i }}>
                                <CardComponent card={tick.card} disabled className="shadow-sm" hoverable={false} />
                             </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Trump Badge */}
            <AnimatePresence>
                {phase !== 'BIDDING' && (trumpSuit || contractType === 'NO_TRUMP') && bidTaker && (
                    <motion.div
                        layoutId="trump-badge"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className={`absolute z-[30] pointer-events-none ${bidTaker === 'hero' ? 'bottom-48 left-5 md:bottom-28 md:left-32' : 'top-44 right-5 md:top-28 md:right-32'}`}
                    >
                        <TrumpBadge suit={trumpSuit} isNoTrump={contractType === 'NO_TRUMP'} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Deck & Candidate */}
            <div className={`absolute transition-all duration-500 top-[18%] left-4 scale-[0.75] origin-top-left md:top-1/2 md:left-12 md:scale-100 md:-translate-y-1/2`} style={{ zIndex: Z_INDEX.DECK }}>
                 {deck.length > 0 && (
                    <motion.div className="relative w-24 h-36" whileHover={{ scale: 1.05 }}>
                        {[2,1,0].map((i) => (
                             <motion.div 
                                key={i} 
                                className="absolute inset-0 rounded-xl shadow-lg border border-white/5" 
                                style={{ transform: `translate(${i}px, ${-i}px)` }}
                                animate={dealStage === 'deck_deal' ? { x: [0, 200, 400], opacity: [1, 0.5, 0] } : {}}
                             >
                                 <CardBack shadow={false} />
                             </motion.div>
                         ))}
                         <span className="absolute -bottom-6 left-0 right-0 text-center text-[10px] font-bold text-white/50 tracking-wider">{deck.length} LEFT</span>
                    </motion.div>
                 )}
                 <div className="absolute top-0 left-28 md:left-32 flex flex-col items-center justify-center min-w-[100px]">
                     <AnimatePresence>
                        {candidateCard && (phase === 'BIDDING' || phase === 'DISTRIBUTING') && (
                             <motion.div 
                                key="candidate"
                                initial={{ opacity: 0 }} 
                                animate={(dealStage !== 'idle' && phase === 'DISTRIBUTING') ? { 
                                    x: candidateRejected ? 500 : (bidTaker === 'hero' ? 0 : 0), 
                                    y: candidateRejected ? 0 : (bidTaker === 'hero' ? 400 : -400),
                                    scale: candidateRejected ? 0.5 : 0.8,
                                    opacity: 0,
                                    transition: { duration: 0.6, ease: "easeInOut" }
                                } : { opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="relative z-0"
                             >
                                 {phase === 'BIDDING' && (
                                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/60 text-white/80 text-[10px] font-bold px-2 py-1 rounded border border-white/10 backdrop-blur-sm">Candidate</div>
                                 )}
                                 <CardComponent card={candidateCard} disabled className="opacity-100 shadow-2xl hover:scale-105 transition-transform" />
                             </motion.div>
                        )}
                     </AnimatePresence>
                 </div>
            </div>

            {/* Active Trick */}
            <div className="absolute top-1/2 left-1/2 w-0 h-0" style={{ zIndex: Z_INDEX.TRICK_CARDS }}>
                <AnimatePresence>
                    {currentTrick.map((tick, index) => {
                        const pos = tick.playerId === 'hero' ? trickPositions.hero : trickPositions.opponent;
                        const initialYVal = tick.playerId === 'hero' ? 250 : -250;
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
                                onAnimationStart={() => playSound(tick.playerId === 'hero' ? 'place_hero' : 'place_opp', { pan: 0 })}
                                exit={{ scale: 0.4, opacity: 0, x: -350, y: exitY, transition: { duration: 0.5, ease: "backIn" } }} 
                                onAnimationComplete={(definition) => {
                                    if (definition === 'exit' && index === 0) {
                                         const isHeroWin = currentTrickWinnerId === 'hero';
                                         playSound('slide', { volume: isHeroWin ? 0.7 : 0.35 });
                                    }
                                }}
                                className="absolute top-0 left-0 drop-shadow-2xl -ml-12 -mt-18 md:-ml-14 md:-mt-20 lg:-ml-16 lg:-mt-22"
                            >
                                <CardComponent 
                                    card={tick.card} 
                                    disabled 
                                    isTrump={tick.card.suit === trumpSuit && contractType === 'TRUMP'} 
                                    trumpSuit={trumpSuit} 
                                    hoverable={false}
                                    isBelote={beloteIds.includes(tick.card.id)} 
                                />
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {/* Opponent Cards */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[120px] pointer-events-none" style={{ zIndex: Z_INDEX.OPPONENT_CARDS }}>
                 <div className="relative w-full h-full flex justify-center">
                    <AnimatePresence>
                        {players.opponent.hand.map((card, i) => {
                            const mobileOffset = (i - (players.opponent.hand.length - 1) / 2) * 15; 
                            const { rotate, translateX, translateY, zIndex } = calculateFanTransform(i, players.opponent.hand.length, true, false);

                            return (
                                <motion.div
                                    key={card.id}
                                    layout={!isMobile}
                                    className="absolute top-[-30px] md:top-8 origin-top-center"
                                    style={{ 
                                        zIndex: zIndex, width: isMobile ? '4.5rem' : '7rem', 
                                        transformOrigin: 'top center', willChange: "transform", transformStyle: "preserve-3d"
                                    }}
                                    initial={{ x: -window.innerWidth/2, y: 100, opacity: 0 }} 
                                    animate={isMobile ? {
                                        x: mobileOffset, y: 10, rotate: i % 2 === 0 ? 2 : -2, opacity: 1
                                    } : { 
                                        x: translateX - 56, y: translateY, rotate: rotate, opacity: 1, transition: transitionConfig
                                    }}
                                >
                                    <CardComponent card={card} faceDown disabled className="shadow-xl" isBelote={beloteIds.includes(card.id)} />
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                 </div>
            </div>

            {/* Revealed Cards */}
            <RevealedCards combinations={players.opponent.declaredCombinations} visible={showOpponentReveal} placement="top" />
            <RevealedCards combinations={players.hero.declaredCombinations} visible={showHeroReveal} placement="bottom" />
            
            {/* Player Hand */}
            {isMobile ? (
                <div 
                    className="fixed bottom-0 left-0 right-0 z-[100] flex items-end overflow-x-auto snap-x snap-mandatory hide-scrollbar touch-pan-x"
                    style={{ 
                        height: '220px', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
                        WebkitOverflowScrolling: 'touch', maskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)'
                    }}
                >
                    <div className="flex items-end pl-[110px] pr-8 pb-2">
                        <AnimatePresence>
                            {players.hero.hand.map((card, index) => {
                                const isValid = validMoves.some(v => v.id === card.id);
                                const isMyTurn = currentPlayerId === 'hero' && phase === 'PLAYING';
                                const isPlayable = isMyTurn && isValid && currentTrick.length < 2;
                                const isHighlighted = highlightedCardIds.has(card.id);
                                const isSelected = selectedMobileCardId === card.id;

                                return (
                                    <div 
                                        key={card.id} 
                                        className="snap-start shrink-0 relative transition-transform duration-200"
                                        style={{ 
                                            width: '72px', height: '108px', marginLeft: index === 0 ? 0 : '-32px',
                                            zIndex: isSelected ? 100 : index, transform: isSelected ? 'translateY(-40px)' : 'translateY(0)',
                                        }}
                                        onClick={(e) => { e.stopPropagation(); handleMobileCardClick(card, isPlayable); }}
                                    >
                                        <div className="w-full h-full">
                                            <CardComponent 
                                                card={card} disabled={!isPlayable} isPlayable={isPlayable}
                                                isInvalid={isMyTurn && !isValid} trumpSuit={trumpSuit}
                                                isTrump={card.suit === trumpSuit && contractType === 'TRUMP'}
                                                isWinningComboCard={isHighlighted} isBelote={beloteIds.includes(card.id)}
                                                hoverable={false} className={`w-full h-full shadow-card ${isSelected ? 'ring-2 ring-white/50' : ''}`}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </AnimatePresence>
                        <div className="shrink-0 w-8" />
                    </div>
                </div>
            ) : (
                <div className="absolute bottom-[-10px] left-1/2 -translate-x-1/2 w-[900px] h-[220px] pointer-events-none" style={{ zIndex: Z_INDEX.PLAYER_CARDS }}>
                    <div className="relative w-full h-full">
                        <AnimatePresence>
                            {players.hero.hand.map((card, i) => {
                                const isValid = validMoves.some(v => v.id === card.id);
                                const isMyTurn = currentPlayerId === 'hero' && phase === 'PLAYING';
                                const isPlayable = isMyTurn && isValid && currentTrick.length < 2;
                                const isHighlighted = highlightedCardIds.has(card.id);
                                const { rotate, translateX, translateY, zIndex } = calculateFanTransform(i, players.hero.hand.length, false, false);
                                
                                return (
                                    <motion.div
                                        key={card.id}
                                        className="absolute bottom-6 left-1/2 pointer-events-auto origin-bottom"
                                        style={{ zIndex: isHighlighted ? Z_INDEX.PLAYER_CARDS + 50 : zIndex, width: '8rem', transformOrigin: 'bottom center', transformStyle: "preserve-3d" }}
                                        initial={phase === 'DISTRIBUTING' ? { x: -300, y: -200, opacity: 0 } : { x: -window.innerWidth / 2, y: window.innerHeight, opacity: 0 }}
                                        animate={{ x: translateX - 64, y: isHighlighted ? translateY - 40 : translateY, rotate: rotate, opacity: 1, scale: 1, transition: transitionConfig }}
                                        onClick={() => {
                                            if (!isPlayable) { triggerHaptic('error'); return; }
                                            onPlayCard(card);
                                        }}
                                        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }} 
                                    >
                                        <CardComponent 
                                            card={card} disabled={!isPlayable} isPlayable={isPlayable}
                                            isInvalid={isMyTurn && !isValid} trumpSuit={trumpSuit}
                                            isTrump={card.suit === trumpSuit && contractType === 'TRUMP'}
                                            hoverable={false} className={isPlayable ? 'shadow-card-float' : ''}
                                            isWinningComboCard={isHighlighted} isBelote={beloteIds.includes(card.id)}
                                        />
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {/* Action Buttons */}
            {canDeclare && onOpenDeclaration && (
                <div className="absolute bottom-[240px] md:bottom-[320px] right-4 md:right-12 z-[120] pointer-events-none">
                    <motion.button
                        initial={{ scale: 0, x: 50 }} animate={{ scale: 1, x: 0 }} exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={onOpenDeclaration}
                        className="pointer-events-auto bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black font-black text-base md:text-lg py-4 px-10 rounded-full shadow-[0_0_25px_rgba(245,158,11,0.6)] border-2 border-amber-200 flex items-center gap-3 animate-pulse-slow"
                    >
                        <span className="text-2xl">📢</span>
                        <div className="flex flex-col items-start leading-none"><span>DECLARE</span><span className="text-xs opacity-80 uppercase tracking-widest mt-0.5">Combination</span></div>
                    </motion.button>
                </div>
            )}

            {canShowCombinations && onShowCombinations && (
                <div className="absolute bottom-28 right-4 md:right-32 z-[120] pointer-events-none">
                    <motion.button
                        initial={{ scale: 0, x: 20 }} animate={{ scale: 1, x: 0 }} exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={onShowCombinations}
                        className="pointer-events-auto bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-bold text-sm md:text-base py-3 px-8 rounded-full shadow-[0_0_20px_rgba(16,185,129,0.5)] border border-emerald-400/50 flex items-center gap-3 animate-bounce"
                    >
                        <span className="text-xl">🎴</span>
                        <div className="flex flex-col items-start leading-none">
                            <span>SHOW CARDS</span>
                            <span className="text-[10px] opacity-80 uppercase tracking-widest mt-0.5 text-emerald-100">
                                +{players.hero.declaredCombinations.filter(c => c.type !== 'BELOTE').reduce((sum, c) => sum + c.score, 0)} pts
                            </span>
                        </div>
                    </motion.button>
                </div>
            )}

            <PlayerAvatar player={players.opponent} position="top" isActive={currentPlayerId === 'opponent'} isDealer={dealerId === 'opponent'} onViewDeclarations={() => setViewingDeclarationsPlayerId('opponent')} />
            <PlayerAvatar player={players.hero} position="bottom" isActive={currentPlayerId === 'hero'} isDealer={dealerId === 'hero'} onViewDeclarations={() => setViewingDeclarationsPlayerId('hero')} />
            <ScoreBoard heroScore={players.hero.score} oppScore={players.opponent.score} target={gameState.gameTarget} round={gameState.roundHistory.length + 1} />
            <div className="absolute top-4 left-4 md:hidden" style={{ zIndex: Z_INDEX.SCOREBOARD }}>
                <MobileScorePill round={gameState.roundHistory.length + 1} target={gameState.gameTarget} />
            </div>

            {showDeclarationModal && onDeclareCombinations && heroCombinations && (
                <CombinationControls phase="DECLARE" combinations={heroCombinations} onDeclare={onDeclareCombinations} timeLeft={timeLeft} />
            )}

            {viewingDeclarationsPlayerId && (
                <CombinationControls phase="SHOW" combinations={players[viewingDeclarationsPlayerId].declaredCombinations} onDeclare={() => setViewingDeclarationsPlayerId(null)} revealOwner={viewingDeclarationsPlayerId} />
            )}
        </main>

        <div className="absolute z-[40] flex gap-2" style={{ top: 'max(1rem, env(safe-area-inset-top))', right: 'max(1rem, env(safe-area-inset-right))' }}>
            <button onClick={onOpenRules} className="bg-slate-900/80 p-2 rounded-full border border-white/10 text-slate-400 hover:text-white transition-colors" title="Rules"><span className="font-bold text-lg w-6 h-6 flex items-center justify-center">?</span></button>
            <button onClick={onOpenSettings} className="bg-slate-900/80 p-2 rounded-full border border-white/10 text-slate-400 hover:text-white transition-colors" title="Settings"><Icons.Settings /></button>
            <button onClick={onOpenHistory} className="bg-slate-900/80 p-2 rounded-full border border-white/10 text-slate-400 hover:text-white transition-colors" title="History"><Icons.History /></button>
            <button onClick={onOpenChat} className="bg-slate-900/80 p-2 rounded-full border border-white/10 text-slate-400 hover:text-white transition-colors" title="Chat"><Icons.Chat /></button>
        </div>
    </div>
  );
};
