import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Card, GameState, Player, Suit, Combination, GamePhase, NotificationType, GameSettings, ContractType } from './types';
import { Table } from './components/Table';
import { BiddingControls } from './components/BiddingControls';
import { A11yAnnouncer, HistoryPanel, ChatSheet, SettingsModal, Confetti, CoinExplosion, ScreenFX } from './components/UI';
import { RoundResultModal } from './components/RoundResult';
import { VictoryModal } from './components/VictoryModal';
import { RulesModal } from './components/RulesModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConnectionManager } from './components/ConnectionManager';
import { createDeck, canPlayCard, getWinningCard, getCardPoints, getBotMove, getBotBidDecision, compareDeclarations, solveCombinationConflicts, verifyRuleset, distributeCardsLogic, sortHand } from './utils/gameLogic';
import { calculateRoundResult } from './utils/calculateRoundResult';
import { useHaptics } from './hooks/useHaptics';
import { useSoundManager } from './hooks/useSoundManager';

// --- INITIAL STATES ---
const INITIAL_PLAYER_STATE: Player = {
  id: 'hero', name: 'Hero', hand: [], capturedCards: [], score: 0, roundScore: 0, combinations: [], declaredCombinations: [], hasShownCombinations: false, lastAction: null
};
const INITIAL_OPPONENT_STATE: Player = {
  id: 'opponent', name: 'Opponent', hand: [], capturedCards: [], score: 0, roundScore: 0, combinations: [], declaredCombinations: [], hasShownCombinations: false, lastAction: null
};

const DEFAULT_SETTINGS: GameSettings = {
    gameSpeed: 'normal', soundEnabled: true, hapticsEnabled: true, highContrast: false, cardSize: 'normal', animationsEnabled: true, difficulty: 'intermediate', targetScore: 51
};

const App: React.FC = () => {
  // --- VERIFICATION ---
  useEffect(() => { verifyRuleset(); }, []);

  // --- SETTINGS ---
  const [settings, setSettings] = useState<GameSettings>(() => {
      const saved = localStorage.getItem('blot_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
  });

  const updateSettings = useCallback((s: GameSettings) => {
      setSettings(s);
      localStorage.setItem('blot_settings', JSON.stringify(s));
      setGameState(prev => ({ ...prev, gameTarget: s.targetScore }));
  }, []);

  const triggerHaptic = useHaptics(settings.hapticsEnabled);
  const { playSound } = useSoundManager(settings.soundEnabled);

  // --- GAME STATE ---
  const [gameState, setGameState] = useState<GameState>({
    phase: 'DEALING', deck: [], players: { hero: { ...INITIAL_PLAYER_STATE }, opponent: { ...INITIAL_OPPONENT_STATE } },
    candidateCard: null, trumpSuit: null, contractType: 'TRUMP', currentTrick: [], lastTrick: null, currentPlayerId: 'hero', 
    dealerId: 'opponent', bidTaker: null, bidRound: 1, declarations: [], gameTarget: settings.targetScore, trickCount: 0, roundHistory: [], a11yAnnouncement: "Welcome to Simple Blot 24"
  });

  // Keep a ref to gameState for stable access in callbacks without triggering re-renders of dependents
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  // --- LOCAL UI STATE ---
  const [declarationTimer, setDeclarationTimer] = useState<number | null>(null);
  const [showDeclarationModal, setShowDeclarationModal] = useState(false);
  const [declarationComplete, setDeclarationComplete] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [candidateRejected, setCandidateRejected] = useState(false);

  const [fxState, setFxState] = useState<{ coinWinner: 'hero' | 'opponent' | null; screenShake: boolean; beloteIds: string[]; }>({ coinWinner: null, screenShake: false, beloteIds: [] });

  // --- HELPERS ---
  const addNotification = useCallback((type: NotificationType, message: string) => {
      setGameState(prev => ({ ...prev, a11yAnnouncement: message }));
      if (type === 'error' || type === 'warning') console.warn(`[${type.toUpperCase()}] ${message}`);
  }, []);

  const handleEmote = useCallback((emoji: string) => {
      setGameState(prev => ({ ...prev, players: { ...prev.players, hero: { ...prev.players.hero, lastAction: emoji } } }));
  }, []);

  // --- CORE ACTIONS ---

  const startNewGame = useCallback((resetScore = false) => {
    setGameState(prev => {
        // Reset Logic is now simpler: We only check if we explicitely requested a reset (from victory screen or forfeit)
        // or if we are just starting a new round in the same game.
        
        let heroScore = prev.players.hero.score;
        let oppScore = prev.players.opponent.score;
        let roundHistory = prev.roundHistory;
        
        if (resetScore) {
            heroScore = 0; oppScore = 0; roundHistory = [];
        }

        const deck = createDeck();
        const heroHand = sortHand(deck.slice(0, 6));
        const opponentHand = sortHand(deck.slice(6, 12));
        const candidate = deck[12];
        const remainingDeck = deck.slice(13); 

        const newDealer = (!resetScore && roundHistory.length > 0) ? (prev.dealerId === 'hero' ? 'opponent' : 'hero') : 'opponent';
        const firstBidder = newDealer === 'hero' ? 'opponent' : 'hero';
        
        addNotification('info', 'New round started. Bidding phase.');
        playSound('turn_start', { pan: 0 });

        return {
          ...prev, phase: 'BIDDING', deck: remainingDeck,
          players: {
            hero: { ...INITIAL_PLAYER_STATE, hand: heroHand, score: heroScore },
            opponent: { ...INITIAL_OPPONENT_STATE, hand: opponentHand, score: oppScore },
          },
          dealerId: newDealer, candidateCard: candidate, currentPlayerId: firstBidder, bidRound: 1, trumpSuit: null,
          contractType: 'TRUMP', bidTaker: null, currentTrick: [], lastTrick: null, trickCount: 0,
          declarations: [`New Round. Dealer: ${newDealer === 'hero' ? 'You' : 'Opp'}.`],
          lastRoundBreakdown: undefined, roundHistory,
          a11yAnnouncement: 'New round started'
        };
    });
    setDeclarationTimer(null);
    setShowDeclarationModal(false);
    setDeclarationComplete(false);
    setCandidateRejected(false);
  }, [addNotification, playSound]);

  // --- INIT GAME ON MOUNT ---
  useEffect(() => {
      startNewGame();
  }, [startNewGame]);

  // --- TRICK RESOLUTION ---
  const resolveTrick = useCallback(() => {
      setGameState(prev => {
          const { currentTrick, trumpSuit, contractType, players } = prev;
          const winner = getWinningCard(currentTrick, trumpSuit, contractType);
          if (!winner) return prev; // Safety

          const points = currentTrick.reduce((sum, t) => sum + getCardPoints(t.card, trumpSuit, contractType), 0);
          const winnerId = winner.playerId;
          const newCaptured = [...players[winnerId].capturedCards, ...currentTrick.map(t => t.card)];
          const roundPoints = players[winnerId].roundScore + points;
          const isLastTrick = players.hero.hand.length === 0 && players.opponent.hand.length === 0;

          // Side Effects (FX)
          if (isLastTrick) addNotification('info', `${winnerId === 'hero' ? 'You' : 'Opponent'}: Last Trick (+10)`);
          
          setFxState(f => ({ ...f, coinWinner: winnerId }));
          setTimeout(() => setFxState(f => ({ ...f, coinWinner: null })), 1500);
          if (winnerId === 'hero') triggerHaptic('success');
          playSound('chip_stack', { pan: winnerId === 'hero' ? 0 : 0.5 });

          // State Update
          const nextState = {
            ...prev,
            players: { ...prev.players, [winnerId]: { ...prev.players[winnerId], roundScore: roundPoints, capturedCards: newCaptured } },
            currentTrick: [], lastTrick: prev.currentTrick, currentPlayerId: winnerId,
            trickCount: prev.trickCount + 1,
            phase: isLastTrick ? 'SCORING' : 'PLAYING' as GamePhase,
            declarations: [...prev.declarations, `${winnerId === 'hero' ? 'You' : 'Opp'} won trick`]
          };

          // Declarations Check (Trick 0 end)
          if (prev.trickCount === 0) { 
              const heroDecl = prev.players.hero.declaredCombinations; 
              const oppDecl = prev.players.opponent.declaredCombinations; 
              const firstPlayer = prev.currentTrick[0].playerId;
              const result = compareDeclarations(heroDecl, oppDecl, firstPlayer);

              if (result.winner === 'hero') {
                  nextState.players.opponent.declaredCombinations = nextState.players.opponent.declaredCombinations.filter(c => c.type === 'BELOTE');
                  if (result.heroPoints > 0) addNotification('success', `Your Declarations are Good! Show them now.`);
              } else if (result.winner === 'opponent') {
                  nextState.players.hero.declaredCombinations = nextState.players.hero.declaredCombinations.filter(c => c.type === 'BELOTE');
                  if (result.oppPoints > 0) addNotification('warning', `Opponent Declarations are Good.`);
              }
          }

          // Final Scoring
          if (isLastTrick) {
              const final = calculateRoundResult(nextState);
              nextState.players.hero.score = final.hero.finalPoints + prev.players.hero.score;
              nextState.players.opponent.score = final.opponent.finalPoints + prev.players.opponent.score;
              
              if (final.roundInfo.status === 'CAPOT') {
                  setFxState(f => ({ ...f, screenShake: true }));
                  setTimeout(() => setFxState(f => ({ ...f, screenShake: false })), 1000);
                  playSound('win_fanfare');
              } else if (final.roundInfo.winnerId === 'hero') {
                  playSound('win_fanfare', { volume: 0.6 });
              }

              nextState.roundHistory.push({
                  roundNumber: prev.roundHistory.length + 1, heroScore: final.hero.finalPoints, opponentScore: final.opponent.finalPoints,
                  trump: prev.trumpSuit, winner: final.roundInfo.winnerId, contractStatus: final.roundInfo.status,
                  bidTaker: prev.bidTaker!, contractType: prev.contractType, details: final
              });
              nextState.lastRoundBreakdown = final;
          }
          return nextState;
      });
  }, [addNotification, playSound, triggerHaptic]);

  // --- PLAYER ACTIONS ---

  const handlePlayCard = useCallback((card: Card | undefined, playerId: 'hero' | 'opponent') => {
    if (!card) return;
    
    // Stop declare timer if Hero plays
    if (playerId === 'hero') {
        setDeclarationTimer(null);
        setDeclarationComplete(true); 
    }

    // Schedule resolution if this card completes the trick
    // Check against current state using ref to ensure stability and avoid dependency cycles
    const currentTrickLen = gameStateRef.current.currentTrick.length;
    if (currentTrickLen === 1) {
         setTimeout(() => resolveTrick(), 1500);
    }

    setGameState(prev => {
        // Declaration Burn Logic (Trick 1 start)
        let nextHero = { ...prev.players.hero };
        if (prev.trickCount === 1 && playerId === 'hero') {
             const hasBonusCombos = nextHero.declaredCombinations.some(c => c.type !== 'BELOTE');
             if (hasBonusCombos && !nextHero.hasShownCombinations) {
                 nextHero.declaredCombinations = nextHero.declaredCombinations.filter(c => c.type === 'BELOTE');
                 nextHero.hasShownCombinations = true;
                 addNotification('error', 'Declarations Voided'); 
                 playSound('place_opp_3');
                 triggerHaptic('error');
             }
        }

        let actionMessage: string | null = null;
        const { trumpSuit, contractType } = prev;
        
        // Belote Check
        if (contractType === 'TRUMP' && trumpSuit && card.suit === trumpSuit && (card.rank === 'K' || card.rank === 'Q')) {
            const player = prev.players[playerId];
            const hasBelote = player.combinations.some(c => c.type === 'BELOTE');
            if (hasBelote) {
                const otherRank = card.rank === 'K' ? 'Q' : 'K';
                const otherInHand = player.hand.some(c => c.suit === trumpSuit && c.rank === otherRank);
                actionMessage = !otherInHand ? "Rebelote!" : "Belote!";
                addNotification('info', `${playerId === 'hero' ? 'You' : 'Opponent'}: "${actionMessage}"`);
                
                const kId = `K${trumpSuit}`;
                const qId = `Q${trumpSuit}`;
                setFxState(f => ({ ...f, beloteIds: [kId, qId] }));
                setTimeout(() => setFxState(f => ({ ...f, beloteIds: [] })), 3000);
                playSound('chip_stack', { pan: playerId === 'hero' ? 0 : 0.5 });
            }
        }

        const newHand = prev.players[playerId].hand.filter(c => c.id !== card.id);
        const nextPlayerId = playerId === 'hero' ? 'opponent' : 'hero';

        return {
            ...prev,
            players: {
                ...prev.players,
                hero: playerId === 'hero' ? { ...nextHero, hand: newHand, lastAction: actionMessage } : nextHero,
                opponent: playerId === 'opponent' ? { ...prev.players.opponent, hand: newHand, lastAction: actionMessage } : prev.players.opponent
            },
            currentTrick: [...prev.currentTrick, { card, playerId }],
            currentPlayerId: nextPlayerId
        };
    });
  }, [addNotification, playSound, triggerHaptic, resolveTrick]);

  const handleTake = useCallback((suit: Suit | null, keepCandidate: boolean, isNoTrump: boolean = false) => {
    setCandidateRejected(!keepCandidate);
    setGameState(prev => {
        const takerId = prev.currentPlayerId;
        const contractType = isNoTrump ? 'NO_TRUMP' : 'TRUMP';
        const dist = distributeCardsLogic(
            takerId, prev.deck, prev.candidateCard!, keepCandidate,
            prev.players.hero.hand, prev.players.opponent.hand,
            isNoTrump ? null : suit, contractType
        );
        
        const msg = `${takerId === 'hero' ? 'You' : 'Opponent'} took ${isNoTrump ? 'NO TRUMP' : suit}`;
        addNotification('success', msg);
        playSound('turn_start');

        return {
            ...prev, trumpSuit: isNoTrump ? null : suit, contractType, bidTaker: takerId, phase: 'DISTRIBUTING',
            players: {
                hero: { ...prev.players.hero, hand: dist.heroHand, combinations: dist.heroCombos },
                opponent: { ...prev.players.opponent, hand: dist.opponentHand, combinations: dist.oppCombos },
            },
            currentPlayerId: prev.dealerId === 'hero' ? 'opponent' : 'hero',
            declarations: [...prev.declarations, msg], a11yAnnouncement: msg
        };
    });
  }, [addNotification, playSound]);

  const handlePass = useCallback(() => {
    setGameState(prev => {
        const { dealerId, currentPlayerId, bidRound, candidateCard } = prev;
        const isJackConstraint = bidRound === 1 && candidateCard?.rank === 'J' && currentPlayerId === dealerId;
        const isDealerConstraint = bidRound === 2 && currentPlayerId === dealerId;

        if (isJackConstraint || isDealerConstraint) {
            addNotification('warning', 'You must take!');
            return prev;
        }

        const isDealer = currentPlayerId === dealerId;
        let nextPlayer: 'hero' | 'opponent' = currentPlayerId === 'hero' ? 'opponent' : 'hero';
        let nextRound = bidRound;
        
        if (isDealer) {
            if (bidRound === 1) {
                nextRound = 2; nextPlayer = dealerId === 'hero' ? 'opponent' : 'hero';
                addNotification('info', 'Round 2 Bidding');
            } else {
                // Redeal logic
                setTimeout(() => startNewGame(), 500);
                addNotification('info', 'Everyone passed. Re-dealing.');
                return { ...prev, dealerId: dealerId === 'hero' ? 'opponent' : 'hero' }; // Temp switch for next deal
            }
        }

        playSound('card_flip', { pan: currentPlayerId === 'hero' ? 0.3 : -0.3 });
        return {
            ...prev, currentPlayerId: nextPlayer, bidRound: nextRound as 1 | 2,
            players: { ...prev.players, [currentPlayerId]: { ...prev.players[currentPlayerId], lastAction: 'Pass' } },
            declarations: [...prev.declarations, `Pass`]
        };
    });
  }, [addNotification, playSound, startNewGame]);

  const handleDeclareCombinations = useCallback((combos: Combination[]) => {
      setDeclarationComplete(true);
      setGameState(prev => {
          let finalCombos = solveCombinationConflicts([...combos]);
          const belote = prev.players.hero.combinations.find(c => c.type === 'BELOTE');
          if (belote && !finalCombos.some(c => c.type === 'BELOTE')) finalCombos.push(belote);

          if (combos.length > 0) {
              addNotification('info', 'Announced! Show in next trick to claim.');
              playSound('chip_stack');
          }

          return {
              ...prev,
              players: { ...prev.players, hero: { ...prev.players.hero, declaredCombinations: finalCombos, hasShownCombinations: false } },
              declarations: [...prev.declarations, finalCombos.length > 0 ? "You announced combinations" : "You declared nothing"]
          };
      });
      setDeclarationTimer(null);
      setShowDeclarationModal(false);
  }, [addNotification, playSound]);

  const handleShowCombinations = useCallback(() => {
      setGameState(prev => {
          const showable = prev.players.hero.declaredCombinations.filter(c => c.type !== 'BELOTE');
          const score = showable.reduce((acc, c) => acc + c.score, 0);
          
          if (score > 0) {
            addNotification('success', `You revealed combinations (+${score})`);
            playSound('win_fanfare', { volume: 0.5 });
            triggerHaptic('success');
          }

          return {
            ...prev,
            players: { ...prev.players, hero: { ...prev.players.hero, hasShownCombinations: true } },
            declarations: [...prev.declarations, `You revealed combinations (+${score})`]
          };
      });
  }, [addNotification, playSound, triggerHaptic]);

  // --- BOT LOGIC EFFECT (Isolated) ---
  useEffect(() => {
    const { phase, currentPlayerId, currentTrick } = gameState;
    
    // Bot Turn Logic
    const isBotTurn = currentPlayerId === 'opponent';
    const delay = settings.gameSpeed === 'fast' ? 100 : settings.gameSpeed === 'slow' ? 500 : 250;
    
    if (!isBotTurn) return;

    let timer: ReturnType<typeof setTimeout>;

    if (phase === 'BIDDING') {
       timer = setTimeout(() => {
           const { players, candidateCard, bidRound, dealerId } = gameState;
           const decision = getBotBidDecision(players.opponent.hand, candidateCard!, bidRound, settings.difficulty, dealerId === 'opponent');
           if (decision.action === 'take') {
               const keep = (decision.suit === candidateCard!.suit) || bidRound === 1;
               handleTake(decision.suit || null, keep, decision.contract === 'NO_TRUMP');
           } else {
               handlePass();
           }
       }, delay);
    } else if (phase === 'PLAYING') {
        // Only trigger bot play if the trick is waiting for a card
        if (currentTrick.length < 2) {
             timer = setTimeout(() => {
                 // Opponent Declaration (Trick 0)
                 if (gameState.trickCount === 0 && !gameState.players.opponent.hasShownCombinations) {
                     let oppCombos = [];
                     if (gameState.players.opponent.combinations.length > 0) oppCombos = solveCombinationConflicts(gameState.players.opponent.combinations);
                     const belote = gameState.players.opponent.combinations.find(c => c.type === 'BELOTE');
                     if (belote && !oppCombos.some(c => c.type === 'BELOTE')) oppCombos.push(belote);
                     
                     if (oppCombos.length > 0) {
                         const txt = oppCombos.filter(c => c.type !== 'BELOTE').map(c => c.type).join(', ');
                         if (txt) setGameState(p => ({ ...p, players: { ...p.players, opponent: { ...p.players.opponent, declaredCombinations: oppCombos, hasShownCombinations: true, lastAction: `Announced: ${txt}` } } }));
                         else setGameState(p => ({ ...p, players: { ...p.players, opponent: { ...p.players.opponent, hasShownCombinations: true } } }));
                     } else {
                         setGameState(p => ({ ...p, players: { ...p.players, opponent: { ...p.players.opponent, hasShownCombinations: true } } }));
                     }
                 }

                 // Play Card
                 const played = [...gameState.players.hero.capturedCards, ...gameState.players.opponent.capturedCards];
                 const move = getBotMove(gameState.players.opponent.hand, gameState.currentTrick, gameState.trumpSuit, gameState.contractType, settings.difficulty, played);
                 handlePlayCard(move, 'opponent');
             }, delay);
        }
    }

    return () => clearTimeout(timer);
  }, [gameState, settings, handleTake, handlePass, handlePlayCard]);

  // --- GAMEPLAY TRIGGERS ---
  
  // Timer for Hero Declaration
  useEffect(() => {
    if (gameState.phase === 'PLAYING' && gameState.trickCount === 0 && gameState.currentPlayerId === 'hero' && !declarationComplete && declarationTimer === null) {
        if (gameState.players.hero.combinations.some(c => c.type !== 'BELOTE')) {
            setDeclarationTimer(15);
            addNotification('info', 'Combinations available! Tap DECLARE.');
        }
    }
  }, [gameState.phase, gameState.trickCount, gameState.currentPlayerId, gameState.players.hero.combinations, declarationComplete, declarationTimer, addNotification]);

  // Declaration Timer countdown
  useEffect(() => {
      if (declarationTimer === null) return;
      if (declarationTimer <= 0) {
          const optimal = solveCombinationConflicts(gameState.players.hero.combinations.filter(c => c.type !== 'BELOTE'));
          handleDeclareCombinations(optimal);
          return;
      }
      const interval = setInterval(() => setDeclarationTimer(p => (p !== null ? p - 1 : null)), 1000);
      return () => clearInterval(interval);
  }, [declarationTimer, gameState.players.hero.combinations, handleDeclareCombinations]);

  // Distribution Animation Callback
  const handleDistributionComplete = useCallback(() => setGameState(p => ({ ...p, phase: 'PLAYING' })), []);

  // --- RENDER ---
  const mustPick = (gameState.bidRound === 1 && gameState.candidateCard?.rank === 'J' && gameState.dealerId === gameState.currentPlayerId) || (gameState.bidRound === 2 && gameState.dealerId === gameState.currentPlayerId);
  const heroValidMoves = (gameState.currentPlayerId === 'hero' && gameState.phase === 'PLAYING')
      ? gameState.players.hero.hand.filter(c => canPlayCard(gameState.players.hero.hand, c, gameState.currentTrick, gameState.trumpSuit, gameState.contractType)) : [];
  const canDeclare = gameState.phase === 'PLAYING' && gameState.trickCount === 0 && gameState.currentPlayerId === 'hero' && gameState.players.hero.combinations.some(c => c.type !== 'BELOTE') && !declarationComplete;
  
  // Confetti for Victory
  const isVictory = gameState.phase === 'FINISHED' && gameState.players.hero.score >= gameState.players.opponent.score;

  return (
    <ErrorBoundary onReset={() => startNewGame(false)}>
        <ConnectionManager gameState={gameState} onSync={setGameState}>
            <div className="w-full h-[100dvh] overflow-hidden relative bg-black">
                <A11yAnnouncer message={gameState.a11yAnnouncement} />
                <div className="mobile-landscape-warning fixed inset-0 z-[9999] bg-black flex-col items-center justify-center text-center p-8">
                    <div className="mb-4 text-4xl animate-bounce">📱</div><h2 className="text-xl font-bold text-white mb-2">Please Rotate Device</h2>
                </div>
                
                {isVictory && <Confetti />}
                {fxState.coinWinner && <CoinExplosion winner={fxState.coinWinner} />}
                <ScreenFX type={fxState.screenShake ? 'SHAKE' : null} />
                
                <Table 
                    gameState={gameState} onPlayCard={(c) => handlePlayCard(c, 'hero')} validMoves={heroValidMoves} settings={settings} onUpdateSettings={updateSettings}
                    onForfeit={() => startNewGame(true)} showDeclarationModal={showDeclarationModal} onDeclareCombinations={handleDeclareCombinations}
                    heroCombinations={gameState.players.hero.combinations} timeLeft={declarationTimer || undefined} beloteIds={fxState.beloteIds}
                    onOpenHistory={() => setShowHistory(true)} onOpenChat={() => setShowChat(true)} onOpenSettings={() => setShowSettings(true)} onOpenRules={() => setShowRules(true)}
                    onShowCombinations={handleShowCombinations} canDeclare={canDeclare} onOpenDeclaration={() => setShowDeclarationModal(true)} candidateRejected={candidateRejected}
                    onDistributionComplete={handleDistributionComplete}
                />

                {gameState.phase === 'BIDDING' && gameState.candidateCard && (
                    <BiddingControls candidateCard={gameState.candidateCard} onTake={handleTake} onPass={handlePass} bidRound={gameState.bidRound} mustPick={mustPick} />
                )}

                {gameState.lastRoundBreakdown && gameState.phase === 'SCORING' && (
                     <RoundResultModal 
                        data={gameState.lastRoundBreakdown} 
                        onNext={() => {
                            const { hero, opponent } = gameState.players;
                            if (hero.score >= gameState.gameTarget || opponent.score >= gameState.gameTarget) {
                                setGameState(prev => ({ ...prev, phase: 'FINISHED' }));
                                playSound(hero.score > opponent.score ? 'win_fanfare' : 'turn_start');
                            } else {
                                startNewGame();
                            }
                        }} 
                        currentScores={{ hero: gameState.players.hero.score, opponent: gameState.players.opponent.score }} 
                        target={gameState.gameTarget} 
                    />
                )}
                
                {gameState.phase === 'FINISHED' && (
                    <VictoryModal 
                        winner={gameState.players.hero.score >= gameState.players.opponent.score ? 'hero' : 'opponent'}
                        scores={{ hero: gameState.players.hero.score, opponent: gameState.players.opponent.score }}
                        onRestart={() => startNewGame(true)}
                        onViewHistory={() => setShowHistory(true)}
                    />
                )}

                <HistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} history={gameState.roundHistory} />
                <ChatSheet isOpen={showChat} onClose={() => setShowChat(false)} onEmote={handleEmote} />
                {showSettings && <SettingsModal settings={settings} onUpdate={updateSettings} onClose={() => setShowSettings(false)} />}
                {showRules && <RulesModal onClose={() => setShowRules(false)} />}
            </div>
        </ConnectionManager>
    </ErrorBoundary>
  );
};

export default App;