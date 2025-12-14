
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, GameState, TrickCard, Combination, GameSettings } from '../types';
import { CardComponent, CardBack } from './Card';
import { PlayerAvatar, ScoreBoard, MobileScorePill, Icons } from './UI';
import { CombinationControls } from './CombinationControls';
import { OpponentRevealedCards } from './OpponentRevealedCards';
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
    onUpdateSettings,
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
  
  // New State for Opponent Reveal
  const [showOpponentReveal, setShowOpponentReveal] = useState(false);
  // Track if we've already triggered the reveal in Trick 2 to prevent re-triggering
  const hasTriggeredTrick2Reveal = useRef(false);

  // Animation Hook
  const dealStage = useDealAnimation({ 
      phase, 
      onComplete: onDistributionComplete || (() => {}) 
  });

  const mobileContainerRef = useRef<HTMLDivElement>(null);
  const prevHeroHandLength = useRef(0);

  const triggerHaptic = useHaptics(settings.hapticsEnabled);
  const { playSound } = useSoundManager(settings.soundEnabled);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Opponent Reveal Logic (Trigger) ---
  useEffect(() => {
    // RESET logic: If it's a new round (trickCount 0), reset the trigger
    if (trickCount === 0) {
        hasTriggeredTrick2Reveal.current = false;
        setShowOpponentReveal(false);
    }

    // TRIGGER logic: 
    // 1. Must be Trick 2 (index 1)
    // 2. Must be Opponent's turn
    // 3. Opponent must have Declarations (Non-Belote)
    if (trickCount === 1 && currentPlayerId === 'opponent') {
        const hasBonus = players.opponent.declaredCombinations.some(c => c.type !== 'BELOTE');
        
        if (hasBonus && !hasTriggeredTrick2Reveal.current) {
            setShowOpponentReveal(true);
            playSound('slide', { volume: 0.5 });
            hasTriggeredTrick2Reveal.current = true;
        }
    }
  }, [trickCount, currentPlayerId, players.opponent.declaredCombinations, playSound]);

  // --- Auto-Hide Logic ---
  useEffect(() => {
      if (showOpponentReveal) {
          const timer = setTimeout(() => {
              setShowOpponentReveal(false);
          }, 4000); // Hide after 4 seconds
          return () => clearTimeout(timer);
      }
  }, [showOpponentReveal]);


  // --- Sound Logic: Dealing ---
  useEffect(() => {
      // Logic handled via dealStage mostly now, but keep simple one for initial deals
      if (phase === 'DEALING') {
         // Existing sound logic for initial 6 cards
         const currentLen = players.hero.hand.length;
         if (currentLen > prevHeroHandLength.current) {
              const count = currentLen - prevHeroHandLength.current;
              for (let i = 0; i < Math.min(count, 8); i++) {
                  setTimeout(() => {
                      playSound('deal', { pan: Math.random() * 0.4 - 0.2 });
                  }, i * 60);
              }
         }
         prevHeroHandLength.current = currentLen;
      }
      
      // Secondary Deal Sounds
      if (dealStage === 'deck_deal') {
          for (let i = 0; i < 3; i++) {
              setTimeout(() => {
                  playSound('deal', { pan: Math.random() * 0.4 - 0.2 });
              }, i * 150);
          }
      }
  }, [players.hero.hand.length, phase, playSound, dealStage]);

  // Clear selection
  useEffect(() => {
    setSelectedMobileCardId(null);
  }, [currentPlayerId, players.hero.hand.length]);

  const trickPositions = {
      hero: { x: 10, y: 10, rotate: 5 },
      opponent: { x: -10, y: -10, rotate: -5 },
  };

  const currentTrickWinnerId = useMemo(() => {
    if (currentTrick.length !== 2) return null; // Wait for full trick
    // Handle NO_TRUMP by passing null as trumpSuit if contract is NO_TRUMP, 
    // BUT getWinningCard handles (..., null, 'NO_TRUMP') correctly internally.
    return getWinningCard(currentTrick, trumpSuit, contractType)?.playerId;
  }, [currentTrick, trumpSuit, contractType]);

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

  const canShowCombinations = useMemo(() => {
      return phase === 'PLAYING' && 
             trickCount === 1 && 
             currentPlayerId === 'hero' && 
             // Ensure we check that the player has actually announced valid declarations (non-Belote)
             players.hero.declaredCombinations.some(c => c.type !== 'BELOTE') && 
             !players.hero.hasShownCombinations;
  }, [phase, trickCount, currentPlayerId, players.hero.declaredCombinations, players.hero.hasShownCombinations]);

  const handleMobileCardClick = (card: Card, isPlayable: boolean) => {
    if (!isPlayable) {
        triggerHaptic('error');
        return;
    }
    
    // Single click play for mobile
    triggerHaptic('light');
    onPlayCard(card);
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

        {/* --- CENTRAL TABLE DECORATION --- */}
        <div className="absolute inset-0 flex items-center justify-center z-[1]">
             <div className="relative w-[96%] h-[65%] md:w-[85%] md:h-[75%] rounded-[100%] bg-[#1a472a] shadow-[0_25px_60px_rgba(0,0,0,0.7)] border-[12px] md:border-[16px] border-[#2d1b0e]">
                <div className="absolute -inset-[2px] rounded-[100%] border border-white/10 pointer-events-none" />
                <div className="absolute inset-0 rounded-[100%] shadow-[inset_0_0_80px_rgba(0,0,0,0.6)] pointer-events-none" />
                <div className="absolute inset-3 md:inset-8 rounded-[100%] border-2 border-[#d4af37]/30 pointer-events-none shadow-[0_0_15px_rgba(212,175,55,0.1)]" />
             </div>
        </div>

        <main className="relative flex-1 w-full h-full z-[${Z_INDEX.TABLE_ZONES}]">

            {/* --- LAST TRICK --- */}
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

            {/* --- TRUMP BADGE (Dynamic Position) --- */}
            <AnimatePresence>
                {phase !== 'BIDDING' && (trumpSuit || contractType === 'NO_TRUMP') && bidTaker && (
                    <motion.div
                        layoutId="trump-badge"
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className={`absolute z-[30] pointer-events-none
                            ${bidTaker === 'hero' 
                                ? 'bottom-48 left-5 md:bottom-28 md:left-32' // Hero: Above avatar on mobile, Centered horizontally
                                : 'top-44 right-5 md:top-28 md:right-32'     // Opponent: Below avatar on mobile, Centered horizontally
                            }
                        `}
                    >
                        <TrumpBadge suit={trumpSuit} isNoTrump={contractType === 'NO_TRUMP'} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- DECK & CANDIDATE (CENTERED) --- */}
            <div className={`
                absolute transition-all duration-500 z-[${Z_INDEX.DECK}]
                top-[18%] left-4 scale-[0.75] origin-top-left
                md:top-1/2 md:left-12 md:scale-100 md:-translate-y-1/2
            `}>
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
                                animate={
                                    dealStage === 'candidate_move' 
                                        ? { 
                                            // Fly animation logic
                                            x: candidateRejected ? 500 : (bidTaker === 'hero' ? 0 : 0), 
                                            y: candidateRejected ? 0 : (bidTaker === 'hero' ? 400 : -400),
                                            scale: candidateRejected ? 0.5 : 0.8,
                                            opacity: candidateRejected ? 0 : 0,
                                            transition: { duration: 0.6, ease: "easeInOut" }
                                          } 
                                        : { opacity: 1 }
                                }
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

            {/* --- ACTIVE TRICK --- */}
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
                                    if (tick.playerId === 'hero') playSound('place_hero', { pan: 0 });
                                    else playSound('place_opp', { pan: 0 }); 
                                }}
                                exit={{ 
                                    scale: 0.4, opacity: 0, x: exitX, y: exitY, 
                                    transition: { duration: 0.5, ease: "backIn" } 
                                }} 
                                onAnimationComplete={(definition) => {
                                    if (definition === 'exit' && index === 0) {
                                         let winnerId = currentTrickWinnerId;
                                         if (!winnerId && gameState.lastTrick && gameState.lastTrick.length === 2 && (trumpSuit || contractType === 'NO_TRUMP')) {
                                              winnerId = getWinningCard(gameState.lastTrick, trumpSuit, contractType)?.playerId;
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

            {/* --- OPPONENT CARDS (COMPACT STACK) --- */}
            <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full h-[120px] z-[${Z_INDEX.OPPONENT_CARDS}] pointer-events-none`}>
                 <div className="relative w-full h-full flex justify-center">
                    <AnimatePresence>
                        {players.opponent.hand.map((card, i) => {
                            // Mobile: Compact stack. Desktop: Fan.
                            const mobileOffset = (i - (players.opponent.hand.length - 1) / 2) * 15; // Tighter spread
                            const { rotate, translateX, translateY, zIndex } = calculateFanTransform(i, players.opponent.hand.length, true, false);

                            return (
                                <motion.div
                                    key={card.id}
                                    layout={!isMobile}
                                    className="absolute top-[-30px] md:top-8 origin-top-center"
                                    style={{ 
                                        zIndex: zIndex, 
                                        width: isMobile ? '4.5rem' : '7rem', // Smaller cards on mobile
                                        transformOrigin: 'top center',
                                        willChange: "transform", transformStyle: "preserve-3d"
                                    }}
                                    initial={{ x: -window.innerWidth/2, y: 100, opacity: 0 }} 
                                    animate={isMobile ? {
                                        x: mobileOffset,
                                        y: 10,
                                        rotate: i % 2 === 0 ? 2 : -2, // Gentle messy stack
                                        opacity: 1
                                    } : { 
                                        x: translateX - 56, y: translateY,
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

            {/* --- OPPONENT REVEALED CARDS (ON-TABLE DECLARATION) --- */}
            <OpponentRevealedCards 
                combinations={players.opponent.declaredCombinations}
                visible={showOpponentReveal}
            />
            
            {/* --- PLAYER HAND (MOBILE SCROLL SNAP CAROUSEL) --- */}
            {isMobile ? (
                <div 
                    className="fixed bottom-0 left-0 right-0 z-[100] flex items-end overflow-x-auto snap-x snap-mandatory hide-scrollbar touch-pan-x"
                    style={{ 
                        height: '220px', // Increased height to allow pop-up and lift
                        paddingBottom: 'max(1rem, env(safe-area-inset-bottom))', // Safe area lift
                        WebkitOverflowScrolling: 'touch',
                        // Add fade masks to sides
                        maskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)',
                        WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 5%, black 95%, transparent 100%)'
                    }}
                    ref={mobileContainerRef}
                >
                    {/* Inner Container: Added pl-[110px] to clear Player Avatar */}
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
                                            width: '72px',  // Reduced for mobile fit
                                            height: '108px', // Scaled with width
                                            marginLeft: index === 0 ? 0 : '-32px', // Tighter overlap to fit screen
                                            zIndex: isSelected ? 100 : index,
                                            transform: isSelected ? 'translateY(-40px)' : 'translateY(0)',
                                        }}
                                        onClick={(e) => { e.stopPropagation(); handleMobileCardClick(card, isPlayable); }}
                                    >
                                        <div className="w-full h-full">
                                            <CardComponent 
                                                card={card} 
                                                disabled={!isPlayable} 
                                                isPlayable={isPlayable}
                                                isInvalid={isMyTurn && !isValid}
                                                trumpSuit={trumpSuit}
                                                isTrump={card.suit === trumpSuit && contractType === 'TRUMP'}
                                                isWinningComboCard={isHighlighted}
                                                isBelote={beloteIds.includes(card.id)}
                                                hoverable={false}
                                                className={`w-full h-full shadow-card ${isSelected ? 'ring-2 ring-white/50' : ''}`}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </AnimatePresence>
                        {/* Spacer for scroll end */}
                        <div className="shrink-0 w-8" />
                    </div>
                </div>
            ) : (
                /* DESKTOP FAN LAYOUT */
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
                                
                                // Determine initial position for new cards from Deal animation
                                const isNewCard = phase === 'DISTRIBUTING';
                                const initialPos = isNewCard ? { x: -300, y: -200, opacity: 0 } : { x: -window.innerWidth / 2, y: window.innerHeight, opacity: 0 };

                                return (
                                    <motion.div
                                        key={card.id}
                                        className="absolute bottom-6 left-1/2 pointer-events-auto origin-bottom"
                                        style={{ 
                                            zIndex: isHighlighted ? Z_INDEX.PLAYER_CARDS + 50 : zIndex, 
                                            width: '8rem', transformOrigin: 'bottom center', transformStyle: "preserve-3d"
                                        }}
                                        initial={initialPos}
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
                                            isTrump={card.suit === trumpSuit && contractType === 'TRUMP'}
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

            {/* --- MANUAL COMBINATION DECLARE BUTTON (TRICK 0) --- */}
            {canDeclare && onOpenDeclaration && (
                <div className="absolute bottom-[200px] md:bottom-[280px] left-0 right-0 z-[120] flex justify-center pointer-events-none">
                    <motion.button
                        initial={{ scale: 0, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onOpenDeclaration}
                        className="pointer-events-auto bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black font-black text-sm md:text-base py-3 px-8 rounded-full shadow-[0_0_25px_rgba(245,158,11,0.6)] border-2 border-amber-200 flex items-center gap-3 animate-pulse-slow"
                    >
                        <span className="text-xl">📢</span>
                        <div className="flex flex-col items-start leading-none">
                            <span>DECLARE</span>
                            <span className="text-[10px] opacity-80 uppercase tracking-widest mt-0.5">Combination</span>
                        </div>
                    </motion.button>
                </div>
            )}

            {/* --- MANUAL COMBINATION PROOF BUTTON (TRICK 1) --- */}
            {canShowCombinations && onShowCombinations && (
                <div className="absolute bottom-[200px] md:bottom-[280px] left-0 right-0 z-[120] flex justify-center pointer-events-none">
                    <motion.button
                        initial={{ scale: 0, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0, opacity: 0 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={onShowCombinations}
                        className="pointer-events-auto bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black font-black text-sm md:text-base py-3 px-8 rounded-full shadow-[0_0_25px_rgba(245,158,11,0.6)] border-2 border-amber-200 flex items-center gap-3 animate-pulse-slow"
                    >
                        <span className="text-xl">🎴</span>
                        <div className="flex flex-col items-start leading-none">
                            <span>SHOW</span>
                            <span className="text-[10px] opacity-80 uppercase tracking-widest mt-0.5">Combinations</span>
                        </div>
                        <div className="bg-black/20 rounded-full px-2 py-0.5 text-xs font-bold ml-1">
                            +{players.hero.declaredCombinations.filter(c => c.type !== 'BELOTE').reduce((sum, c) => sum + c.score, 0)}
                        </div>
                    </motion.button>
                </div>
            )}

            <PlayerAvatar 
                player={players.opponent} 
                position="top" 
                isActive={currentPlayerId === 'opponent'} 
                isDealer={dealerId === 'opponent'} 
                onViewDeclarations={() => setViewingDeclarationsPlayerId('opponent')}
            />
            <PlayerAvatar 
                player={players.hero} 
                position="bottom" 
                isActive={currentPlayerId === 'hero'} 
                isDealer={dealerId === 'hero'} 
                onViewDeclarations={() => setViewingDeclarationsPlayerId('hero')}
            />
            
            <ScoreBoard heroScore={players.hero.score} oppScore={players.opponent.score} target={gameState.gameTarget} round={gameState.roundHistory.length + 1} />
            <div className="absolute top-4 left-4 md:hidden z-[${Z_INDEX.SCOREBOARD}]">
                <MobileScorePill round={gameState.roundHistory.length + 1} target={gameState.gameTarget} />
            </div>

            {/* --- DECLARATION MODALS --- */}
            {showDeclarationModal && onDeclareCombinations && heroCombinations && (
                <CombinationControls phase="DECLARE" combinations={heroCombinations} onDeclare={onDeclareCombinations} timeLeft={timeLeft} />
            )}

            {viewingDeclarationsPlayerId && (
                <CombinationControls
                    phase="SHOW"
                    combinations={players[viewingDeclarationsPlayerId].declaredCombinations}
                    onDeclare={() => setViewingDeclarationsPlayerId(null)}
                    revealOwner={viewingDeclarationsPlayerId}
                />
            )}
        </main>

        {/* --- TOP RIGHT ACTIONS (Unified) --- */}
        <div className="absolute z-[40] flex gap-2" style={{ top: 'max(1rem, env(safe-area-inset-top))', right: 'max(1rem, env(safe-area-inset-right))' }}>
            <button onClick={onOpenRules} className="bg-slate-900/80 p-2 rounded-full border border-white/10 text-slate-400 hover:text-white transition-colors" title="Rules"><span className="font-bold text-lg w-6 h-6 flex items-center justify-center">?</span></button>
            <button onClick={onOpenSettings} className="bg-slate-900/80 p-2 rounded-full border border-white/10 text-slate-400 hover:text-white transition-colors" title="Settings"><Icons.Settings /></button>
            <button onClick={onOpenHistory} className="bg-slate-900/80 p-2 rounded-full border border-white/10 text-slate-400 hover:text-white transition-colors" title="History"><Icons.History /></button>
            <button onClick={onOpenChat} className="bg-slate-900/80 p-2 rounded-full border border-white/10 text-slate-400 hover:text-white transition-colors" title="Chat"><Icons.Chat /></button>
        </div>

    </div>
  );
};
