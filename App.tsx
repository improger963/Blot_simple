import React, { useEffect, useState, useRef } from 'react';
import { Card, GameState, Player, Suit, Combination, GamePhase, Notification, NotificationType, ScoreBreakdown, GameSettings, LastRoundData } from './types';
import { Table } from './components/Table';
import { BiddingControls } from './components/BiddingControls';
import { A11yAnnouncer, HistoryPanel, ChatSheet, SettingsModal, Confetti, CoinExplosion, ScreenFX } from './components/UI';
import { RoundResultModal } from './components/RoundResult';
import { RulesModal } from './components/RulesModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ConnectionManager } from './components/ConnectionManager';
import { createDeck, canPlayCard, getWinningCard, getCardPoints, getBotMove, getBotBidDecision, calculateCombinations, sortHand, compareDeclarations, solveCombinationConflicts } from './utils/gameLogic';
import { SUITS } from './constants';
import { useHaptics } from './hooks/useHaptics';
import { useSoundManager } from './hooks/useSoundManager';

const INITIAL_PLAYER_STATE: Player = {
  id: 'hero',
  name: 'Hero',
  hand: [],
  capturedCards: [],
  score: 0,
  roundScore: 0,
  combinations: [],
  declaredCombinations: [],
  hasShownCombinations: false,
  lastAction: null,
};

const INITIAL_OPPONENT_STATE: Player = {
  id: 'opponent',
  name: 'Opponent',
  hand: [],
  capturedCards: [],
  score: 0,
  roundScore: 0,
  combinations: [],
  declaredCombinations: [],
  hasShownCombinations: false,
  lastAction: null,
};

const DEFAULT_SETTINGS: GameSettings = {
    gameSpeed: 'normal',
    soundEnabled: true,
    hapticsEnabled: true, // Default enabled
    highContrast: false,
    cardSize: 'normal',
    animationsEnabled: true,
    difficulty: 'intermediate'
};

const StarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
);

const App: React.FC = () => {
  const [settings, setSettings] = useState<GameSettings>(() => {
      const saved = localStorage.getItem('blot_settings');
      if (saved) {
          const parsed = JSON.parse(saved);
          return { ...DEFAULT_SETTINGS, ...parsed };
      }
      return DEFAULT_SETTINGS;
  });

  const triggerHaptic = useHaptics(settings.hapticsEnabled);
  const { playSound } = useSoundManager(settings.soundEnabled);

  const updateSettings = (s: GameSettings) => {
      setSettings(s);
      localStorage.setItem('blot_settings', JSON.stringify(s));
  };

  const [gameState, setGameState] = useState<GameState>({
    phase: 'DEALING',
    deck: [],
    players: {
      hero: { ...INITIAL_PLAYER_STATE },
      opponent: { ...INITIAL_OPPONENT_STATE },
    },
    candidateCard: null,
    trumpSuit: null,
    currentTrick: [],
    lastTrick: null,
    currentPlayerId: 'hero', 
    dealerId: 'opponent',
    bidTaker: null,
    bidRound: 1,
    declarations: [],
    gameTarget: 501,
    trickCount: 0,
    roundHistory: [],
    a11yAnnouncement: "Welcome to Simple Blot 24",
  });

  const [declarationTimer, setDeclarationTimer] = useState<number | null>(null);
  const [showDeclarationModal, setShowDeclarationModal] = useState(false);
  
  // Sheet States
  const [showHistory, setShowHistory] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showRules, setShowRules] = useState(false);
  
  // Connection state
  const [isOffline, setIsOffline] = useState(!navigator.onLine); 

  // --- JUICE VFX STATES ---
  const [fxState, setFxState] = useState<{
      coinWinner: 'hero' | 'opponent' | null;
      screenShake: boolean;
      beloteIds: string[];
  }>({
      coinWinner: null,
      screenShake: false,
      beloteIds: []
  });

  // --- Haptics & Sound: Turn Notification ---
  useEffect(() => {
    if (gameState.currentPlayerId === 'hero' && gameState.phase === 'PLAYING') {
        // triggerHaptic('double'); // Removed vibration as requested
        playSound('turn_start', { pan: 0 });
    }
  }, [gameState.currentPlayerId, gameState.phase, triggerHaptic, playSound]);

  const addNotification = (type: NotificationType, message: string) => {
      setGameState(prev => ({ ...prev, a11yAnnouncement: message }));
      if (type === 'error' || type === 'warning') {
          console.warn(`[${type.toUpperCase()}] ${message}`);
      }
  };

  const handleEmote = (emoji: string) => {
      setGameState(prev => ({
          ...prev,
          players: {
              ...prev.players,
              hero: { ...prev.players.hero, lastAction: emoji }
          }
      }));
  };

  const startNewGame = (resetScore = false) => {
    const isGameOver = gameState.players.hero.score >= gameState.gameTarget || gameState.players.opponent.score >= gameState.gameTarget;
    
    if (isGameOver || resetScore) {
        setGameState(prev => ({
            ...prev,
             players: {
                hero: { ...INITIAL_PLAYER_STATE },
                opponent: { ...INITIAL_OPPONENT_STATE },
             },
             roundHistory: [],
             phase: 'DEALING'
        }));
    }

    const deck = createDeck();
    const heroHand = sortHand(deck.slice(0, 6));
    const opponentHand = sortHand(deck.slice(6, 12));
    const candidate = deck[12];
    const remainingDeck = deck.slice(13); 

    const newDealer = (!resetScore && gameState.roundHistory.length > 0)
        ? (gameState.dealerId === 'hero' ? 'opponent' : 'hero') 
        : 'opponent';

    const firstBidder = newDealer === 'hero' ? 'opponent' : 'hero';
    const msg = 'New round started. Bidding phase.';

    setGameState(prev => ({
      ...prev,
      phase: 'BIDDING',
      deck: remainingDeck,
      players: {
        hero: { ...INITIAL_PLAYER_STATE, hand: heroHand, score: prev.players.hero.score },
        opponent: { ...INITIAL_OPPONENT_STATE, hand: opponentHand, score: prev.players.opponent.score },
      },
      dealerId: newDealer,
      candidateCard: candidate,
      currentPlayerId: firstBidder,
      bidRound: 1,
      trumpSuit: null,
      bidTaker: null,
      currentTrick: [],
      lastTrick: null,
      trickCount: 0,
      declarations: [`New Round. Dealer: ${newDealer === 'hero' ? 'You' : 'Opp'}.`],
      lastRoundBreakdown: undefined,
      a11yAnnouncement: msg,
    }));
    setDeclarationTimer(null);
    setShowDeclarationModal(false);
    
    addNotification('info', msg);
    playSound('turn_start', { pan: 0 }); // Sound on start
  };

  useEffect(() => {
      startNewGame();
  }, []);

  // --- Declaration Timer Logic ---
  useEffect(() => {
      if (declarationTimer === null) return;
      if (declarationTimer <= 0) {
          handleAutoDeclare(); 
          setDeclarationTimer(null);
          return;
      }
      const timer = setInterval(() => {
          setDeclarationTimer(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
      return () => clearInterval(timer);
  }, [declarationTimer]);

  // --- Bot Actions ---
  const getBotDelay = () => {
      const baseDelay = settings.gameSpeed === 'fast' ? 100 : settings.gameSpeed === 'slow' ? 500 : 250;
      switch (settings.difficulty) {
          case 'beginner': return baseDelay;
          case 'intermediate': return baseDelay * 1.5;
          case 'expert': return baseDelay * 2.5;
          default: return baseDelay;
      }
  };

  useEffect(() => {
    const { phase, currentPlayerId, currentTrick } = gameState;
    
    const delay = getBotDelay();

    if (phase === 'BIDDING' && currentPlayerId === 'opponent') {
       const timer = setTimeout(() => handleBotBid(), delay);
       return () => clearTimeout(timer);
    }

    if (phase === 'PLAYING' && currentPlayerId === 'opponent' && currentTrick.length < 2) {
        
        // Opponent Declaration Logic (Trick 0 only)
        if (gameState.trickCount === 0 && !gameState.players.opponent.hasShownCombinations) { 
           let opponentCombos = [];
           if (gameState.players.opponent.combinations.length > 0) {
               const optimal = solveCombinationConflicts(gameState.players.opponent.combinations);
               if (optimal.length > 0) {
                   opponentCombos = optimal;
               }
           }
           const belote = gameState.players.opponent.combinations.find(c => c.type === 'BELOTE');
           if (belote && !opponentCombos.some(c => c.type === 'BELOTE')) {
               opponentCombos.push(belote);
           }

           if (opponentCombos.length > 0) {
               setGameState(prev => ({
                    ...prev,
                    players: {
                        ...prev.players,
                        opponent: { 
                            ...prev.players.opponent, 
                            declaredCombinations: opponentCombos,
                            hasShownCombinations: true 
                        }
                    },
                    declarations: [...prev.declarations, "Opponent declared combination."]
               }));
           } else {
               setGameState(prev => ({
                    ...prev,
                    players: {
                        ...prev.players,
                        opponent: { ...prev.players.opponent, hasShownCombinations: true }
                    }
               }));
           }
        }

        const timer = setTimeout(() => {
            const playedCards = [...gameState.players.hero.capturedCards, ...gameState.players.opponent.capturedCards];
            const move = getBotMove(
                gameState.players.opponent.hand, 
                gameState.currentTrick, 
                gameState.trumpSuit,
                settings.difficulty,
                playedCards
            );
            handlePlayCard(move, 'opponent');
        }, delay);
        return () => clearTimeout(timer);
    }
    
    if (phase === 'PLAYING' && currentTrick.length === 2) {
        const resolveDelay = 1500; 
        const timer = setTimeout(() => resolveTrick(), resolveDelay);
        return () => clearTimeout(timer);
    }

  }, [gameState.phase, gameState.currentPlayerId, gameState.currentTrick.length]); 

  // --- Trigger Declaration for Player ---
  useEffect(() => {
      const hasDeclarableCombos = gameState.players.hero.combinations.some(c => c.type !== 'BELOTE');
      if (gameState.phase === 'PLAYING' && gameState.trickCount === 0 && gameState.currentPlayerId === 'hero' && hasDeclarableCombos && !gameState.players.hero.hasShownCombinations && declarationTimer === null) {
          setDeclarationTimer(10); 
      }
  }, [gameState.phase, gameState.trickCount, gameState.currentPlayerId, gameState.players.hero.combinations, gameState.players.hero.hasShownCombinations]);

  const distributeCards = (takerId: 'hero' | 'opponent', trump: Suit, remainingDeck: Card[], candidate: Card, takenInRound1: boolean) => {
      let extraTaker: Card[] = [];
      let extraOpponent: Card[] = [];
      let newHeroHand = [...gameState.players.hero.hand];
      let newOpponentHand = [...gameState.players.opponent.hand];

      if (takenInRound1) {
          extraTaker = remainingDeck.slice(0, 2);
          extraOpponent = remainingDeck.slice(2, 5);
          if (takerId === 'hero') {
              newHeroHand.push(candidate, ...extraTaker);
              newOpponentHand.push(...extraOpponent);
          } else {
              newOpponentHand.push(candidate, ...extraTaker);
              newHeroHand.push(...extraOpponent);
          }
      } else {
          extraTaker = remainingDeck.slice(0, 3);
          extraOpponent = remainingDeck.slice(3, 6);
          if (takerId === 'hero') {
              newHeroHand.push(...extraTaker);
              newOpponentHand.push(...extraOpponent);
          } else {
              newOpponentHand.push(...extraTaker);
              newHeroHand.push(...extraOpponent);
          }
      }

      newHeroHand = sortHand(newHeroHand, trump);
      newOpponentHand = sortHand(newOpponentHand, trump);
      const heroCombos = calculateCombinations(newHeroHand, trump);
      const oppCombos = calculateCombinations(newOpponentHand, trump);

      return { heroHand: newHeroHand, opponentHand: newOpponentHand, heroCombos, oppCombos };
  };

  const handleTake = (suit: Suit, fromCandidate: boolean) => {
    const takerId = gameState.currentPlayerId;
    const { deck, candidateCard } = gameState;
    const dist = distributeCards(takerId, suit, deck, candidateCard!, fromCandidate);
    const msg = `${takerId === 'hero' ? 'You' : 'Opponent'} took ${suit} (${fromCandidate ? 'R1' : 'R2'})`;

    setGameState(prev => ({
        ...prev,
        trumpSuit: suit,
        bidTaker: takerId,
        phase: 'PLAYING',
        players: {
            hero: { ...prev.players.hero, hand: dist.heroHand, combinations: dist.heroCombos },
            opponent: { ...prev.players.opponent, hand: dist.opponentHand, combinations: dist.oppCombos },
        },
        currentPlayerId: prev.dealerId === 'hero' ? 'opponent' : 'hero',
        declarations: [...prev.declarations, msg],
        a11yAnnouncement: msg
    }));
    addNotification('success', takerId === 'hero' ? `You took with ${suit}!` : `Opponent took with ${suit}.`);
    playSound('turn_start');
  };

  const handlePass = () => {
    const { dealerId, currentPlayerId, bidRound, candidateCard } = gameState;
    let nextRound = bidRound;
    
    if (bidRound === 1 && candidateCard?.rank === 'J' && currentPlayerId === dealerId) {
        handleTake(candidateCard.suit, true);
        return;
    }

    const isDealer = currentPlayerId === dealerId;
    let nextPlayer: 'hero' | 'opponent' = currentPlayerId === 'hero' ? 'opponent' : 'hero';
    let shouldRedeal = false;

    if (isDealer) {
        if (bidRound === 1) {
            nextRound = 2;
            nextPlayer = dealerId === 'hero' ? 'opponent' : 'hero'; 
            addNotification('info', 'Round 2 Bidding');
        } else {
            shouldRedeal = true;
        }
    }

    if (shouldRedeal) {
        addNotification('info', 'Everyone passed. Re-dealing.');
        const nextDealer = dealerId === 'hero' ? 'opponent' : 'hero';
        setGameState(prev => ({...prev, dealerId: nextDealer}));
        setTimeout(() => startNewGame(), 500); 
        return;
    }

    setGameState(prev => ({
        ...prev,
        currentPlayerId: nextPlayer,
        bidRound: nextRound as 1 | 2,
        declarations: [...prev.declarations, `Pass`]
    }));
    playSound('card_flip', { pan: currentPlayerId === 'hero' ? 0.3 : -0.3 }); // Sound on pass
  };

  const handleBotBid = () => {
      const { players, candidateCard, bidRound, dealerId } = gameState;
      const hand = players.opponent.hand;
      const candidate = candidateCard!;
      const isDealer = dealerId === 'opponent';
      const isJackCandidate = candidate.rank === 'J';
      
      if (bidRound === 1 && isJackCandidate && isDealer) {
           handleTake(candidate.suit, true);
           return;
      }
      if (bidRound === 2 && isDealer) {
          const decision = getBotBidDecision(hand, candidate, 2, 'intermediate');
          if (decision.action === 'take') handleTake(decision.suit, false);
          else {
              const validSuits = SUITS.filter(s => s !== candidate.suit);
              handleTake(validSuits[0], false);
          }
          return;
      }
      const decision = getBotBidDecision(hand, candidate, bidRound, settings.difficulty);
      if (decision.action === 'take') handleTake(decision.suit, bidRound === 1);
      else handlePass();
  };

  const handleAutoDeclare = () => {
      const allCombos = gameState.players.hero.combinations;
      const declarable = allCombos.filter(c => c.type !== 'BELOTE');
      const optimal = solveCombinationConflicts(declarable);
      handleDeclareCombinations(optimal);
  };

  const handleDeclareCombinations = (combos: Combination[]) => {
      const belote = gameState.players.hero.combinations.find(c => c.type === 'BELOTE');
      let finalCombos = [...combos];
      finalCombos = solveCombinationConflicts(finalCombos);

      if (belote && !finalCombos.some(c => c.type === 'BELOTE')) {
          finalCombos.push(belote);
      }

      setGameState(prev => ({
          ...prev,
          players: {
              ...prev.players,
              hero: { ...prev.players.hero, declaredCombinations: finalCombos, hasShownCombinations: true }
          },
          declarations: [...prev.declarations, finalCombos.length > 0 ? "You announced combinations" : "You declared nothing"]
      }));
      setDeclarationTimer(null);
      setShowDeclarationModal(false);
      if (combos.length > 0) {
          addNotification('success', 'Combinations announced!');
          playSound('chip_stack');
      }
  };

  const handlePlayCard = (card: Card | undefined, playerId: 'hero' | 'opponent') => {
    if (!card) return;
    if (playerId === 'hero') setDeclarationTimer(null);

    const { trumpSuit } = gameState;
    let actionMessage: string | null = null;

    if (trumpSuit && card.suit === trumpSuit && (card.rank === 'K' || card.rank === 'Q')) {
        const player = gameState.players[playerId];
        const hasBelote = player.combinations.some(c => c.type === 'BELOTE');
        
        if (hasBelote) {
            const otherRank = card.rank === 'K' ? 'Q' : 'K';
            const otherInHand = player.hand.some(c => c.suit === trumpSuit && c.rank === otherRank);
            
            if (!otherInHand) {
                actionMessage = "Rebelote!";
                addNotification('info', `${playerId === 'hero' ? 'You' : 'Opponent'}: "Rebelote!" (+20)`);
            } else {
                 actionMessage = "Belote!";
                 addNotification('info', `${playerId === 'hero' ? 'You' : 'Opponent'}: "Belote!"`);
            }
            
            // JUICE: Trigger Belote Glow
            const kId = `K${trumpSuit}`;
            const qId = `Q${trumpSuit}`;
            setFxState(prev => ({ ...prev, beloteIds: [kId, qId] }));
            setTimeout(() => setFxState(prev => ({ ...prev, beloteIds: [] })), 3000);
            playSound('chip_stack', { pan: playerId === 'hero' ? 0 : 0.5 });
        }
    }

    const playerKey = playerId;
    const newHand = gameState.players[playerKey].hand.filter(c => c.id !== card.id);

    // Optimistic Update
    setGameState(prev => ({
        ...prev,
        players: {
            ...prev.players,
            [playerKey]: { 
                ...prev.players[playerKey], 
                hand: newHand,
                lastAction: actionMessage // Store action for UI animation
            }
        },
        currentTrick: [...prev.currentTrick, { card, playerId }],
        currentPlayerId: playerId === 'hero' ? 'opponent' : 'hero'
    }));
  };

  const resolveTrick = () => {
      const { currentTrick, trumpSuit, players } = gameState;
      const winner = getWinningCard(currentTrick, trumpSuit!);
      if (!winner) return;

      const points = currentTrick.reduce((sum, t) => sum + getCardPoints(t.card, trumpSuit), 0);
      const winnerId = winner.playerId;
      const newCaptured = [...players[winnerId].capturedCards, ...currentTrick.map(t => t.card)];
      
      let roundPoints = players[winnerId].roundScore + points;
      const isLastTrick = players.hero.hand.length === 0 && players.opponent.hand.length === 0;
      
      if (isLastTrick) {
          addNotification('info', `${winnerId === 'hero' ? 'You' : 'Opponent'}: Last Trick (+10)`);
      }
      
      // JUICE: Trigger Coin Explosion & Haptics
      setFxState(prev => ({ ...prev, coinWinner: winnerId }));
      setTimeout(() => setFxState(prev => ({ ...prev, coinWinner: null })), 1500);
      if (winnerId === 'hero') triggerHaptic('success');
      
      // Sound: Chips/Collect
      playSound('chip_stack', { pan: winnerId === 'hero' ? 0 : 0.5 });

      setGameState(prev => {
          let nextState = {
            ...prev,
            players: {
                hero: { ...prev.players.hero },
                opponent: { ...prev.players.opponent }
            },
            currentTrick: [],
            lastTrick: prev.currentTrick, // Store current trick as last completed
            currentPlayerId: winnerId,
            trickCount: prev.trickCount + 1,
            phase: isLastTrick ? 'SCORING' : 'PLAYING' as GamePhase,
            declarations: [...prev.declarations, `${winnerId === 'hero' ? 'You' : 'Opp'} won trick`]
          };
          
          nextState.players[winnerId].roundScore = roundPoints;
          nextState.players[winnerId].capturedCards = newCaptured;

          if (prev.trickCount === 0) { 
              const heroDecl = prev.players.hero.hasShownCombinations ? prev.players.hero.declaredCombinations : [];
              const oppDecl = prev.players.opponent.declaredCombinations; 
              const firstPlayer = prev.currentTrick[0].playerId;
              const result = compareDeclarations(heroDecl, oppDecl, firstPlayer);

              if (result.winner === 'hero' && result.heroPoints > 0) {
                  const showable = heroDecl.filter(c => c.type !== 'BELOTE');
                  if (showable.length > 0) {
                      const msg = showable.map(c => `${c.type} (${c.score})`).join(', ');
                      addNotification('success', `You revealed: ${msg}`);
                      nextState.declarations.push(`You revealed: ${msg}`);
                  } else {
                      if (result.heroPoints > 20) addNotification('success', `Your Declarations Win! (+${result.heroPoints})`);
                  }
              } else if (result.winner === 'opponent' && result.oppPoints > 0) {
                  const showable = oppDecl.filter(c => c.type !== 'BELOTE');
                  if (showable.length > 0) {
                      const msg = showable.map(c => `${c.type} (${c.score})`).join(', ');
                      addNotification('warning', `Opponent revealed: ${msg}`);
                      nextState.declarations.push(`Opp revealed: ${msg}`);
                  } else {
                       if (result.oppPoints > 20) addNotification('error', `Opponent Declarations Win! (+${result.oppPoints})`);
                  }
              }
          }
          
          if (isLastTrick) {
              const final = calculateFinalScores(nextState);
              nextState.players.hero.score = final.hero.finalPoints + prev.players.hero.score;
              nextState.players.opponent.score = final.opponent.finalPoints + prev.players.opponent.score;
              
              // JUICE: Trigger Capot Shake
              if (final.roundInfo.status === 'CAPOT') {
                  setFxState(prev => ({ ...prev, screenShake: true }));
                  setTimeout(() => setFxState(prev => ({ ...prev, screenShake: false })), 1000);
                  playSound('win_fanfare');
              } else if (final.roundInfo.winnerId === 'hero') {
                  playSound('win_fanfare', { volume: 0.6 });
              }

              nextState.roundHistory.push({
                  roundNumber: prev.roundHistory.length + 1,
                  heroScore: final.hero.finalPoints,
                  opponentScore: final.opponent.finalPoints,
                  trump: prev.trumpSuit,
                  winner: final.roundInfo.winnerId,
                  contractStatus: final.roundInfo.status,
                  bidTaker: prev.bidTaker!,
                  details: final
              });
              nextState.lastRoundBreakdown = final;
          }
          return nextState;
      });
  };

  const calculateFinalScores = (state: GameState): LastRoundData => {
      const { players, bidTaker, trumpSuit } = state;
      const hCardPoints = players.hero.capturedCards.reduce((s, c) => s + getCardPoints(c, trumpSuit), 0);
      const oCardPoints = players.opponent.capturedCards.reduce((s, c) => s + getCardPoints(c, trumpSuit), 0);
      const hTricks = players.hero.capturedCards.length / 2;
      const oTricks = players.opponent.capturedCards.length / 2;
      const isHeroCapot = hTricks === 9;
      const isOppCapot = oTricks === 9;
      const lastTrickWinner = state.currentPlayerId; 
      const hLast = (lastTrickWinner === 'hero' && !isHeroCapot) ? 10 : 0;
      const oLast = (lastTrickWinner === 'opponent' && !isOppCapot) ? 10 : 0;
      const trick0Leader = state.dealerId === 'hero' ? 'opponent' : 'hero';
      const hDeclList = players.hero.hasShownCombinations ? players.hero.declaredCombinations : [];
      const oDeclList = players.opponent.declaredCombinations;
      const declResult = compareDeclarations(hDeclList, oDeclList, trick0Leader);
      let hDeclPoints = declResult.winner === 'hero' ? declResult.heroPoints : 0;
      let oDeclPoints = declResult.winner === 'opponent' ? declResult.oppPoints : 0;
      const hBelote = hDeclList.some(c => c.type === 'BELOTE') ? 20 : 0;
      const oBelote = oDeclList.some(c => c.type === 'BELOTE') ? 20 : 0;
      let hRawTotal = hCardPoints + hLast + hDeclPoints;
      let oRawTotal = oCardPoints + oLast + oDeclPoints;
      if (isHeroCapot) hRawTotal = 252 + hDeclPoints;
      if (isOppCapot) oRawTotal = 252 + oDeclPoints;
      let hFinal = 0;
      let oFinal = 0;
      let status: 'NORMAL' | 'DEDANS' | 'CAPOT' = 'NORMAL';
      let winnerId: 'hero' | 'opponent' = 'hero';

      if (bidTaker === 'hero') {
          if (isHeroCapot) {
              status = 'CAPOT';
              hFinal = hRawTotal;
              oFinal = oDeclPoints; 
          } else if (hRawTotal > oRawTotal) {
              status = 'NORMAL';
              hFinal = hRawTotal;
              oFinal = oRawTotal;
          } else {
              status = 'DEDANS';
              hFinal = hBelote; 
              const totalGamePoints = 162 + (hDeclPoints - hBelote) + (oDeclPoints - oBelote);
              oFinal = totalGamePoints + oBelote;
          }
      } else {
          if (isOppCapot) {
              status = 'CAPOT';
              oFinal = oRawTotal;
              hFinal = hDeclPoints;
          } else if (oRawTotal > hRawTotal) {
              status = 'NORMAL';
              oFinal = oRawTotal;
              hFinal = hRawTotal;
          } else {
              status = 'DEDANS';
              oFinal = oBelote;
              const totalGamePoints = 162 + (hDeclPoints - hBelote) + (oDeclPoints - oBelote);
              hFinal = totalGamePoints + hBelote;
          }
      }
      winnerId = hFinal > oFinal ? 'hero' : 'opponent';

      return {
          hero: {
              rawCardPoints: hCardPoints,
              rawDeclPoints: hDeclPoints,
              lastTrickBonus: hLast,
              beloteBonus: hBelote,
              finalPoints: hFinal,
              capturedCardsCount: players.hero.capturedCards.length,
              declaredCombos: hDeclList
          },
          opponent: {
              rawCardPoints: oCardPoints,
              rawDeclPoints: oDeclPoints,
              lastTrickBonus: oLast,
              beloteBonus: oBelote,
              finalPoints: oFinal,
              capturedCardsCount: players.opponent.capturedCards.length,
              declaredCombos: oDeclList
          },
          roundInfo: {
              number: state.roundHistory.length + 1,
              trump: trumpSuit,
              bidTaker: bidTaker!,
              status,
              winnerId
          }
      };
  };

  const isJackObligation = gameState.bidRound === 1 && gameState.candidateCard?.rank === 'J' && gameState.dealerId === gameState.currentPlayerId;
  const isRound2Obligation = gameState.bidRound === 2 && gameState.dealerId === gameState.currentPlayerId;
  const mustPick = isJackObligation || isRound2Obligation;
  
  const hasDeclarableCombos = gameState.players.hero.combinations.some(c => c.type !== 'BELOTE');
  const canAnnounce = gameState.phase === 'PLAYING' && gameState.trickCount === 0 && gameState.currentPlayerId === 'hero' && hasDeclarableCombos && !gameState.players.hero.hasShownCombinations && declarationTimer !== null;

  // Recovery Handler
  const handleStateSync = (serverState: GameState) => {
      setGameState(serverState);
      addNotification('info', 'Game state synchronized with server.');
  };

  return (
    <ErrorBoundary onReset={() => startNewGame(false)}>
        <ConnectionManager gameState={gameState} onSync={handleStateSync}>
            {/* Updated root with dynamic height */}
            <div className="w-full h-[100dvh] overflow-hidden relative bg-black">
                <A11yAnnouncer message={gameState.a11yAnnouncement} />
                
                {/* Mobile Landscape Warning Overlay */}
                <div className="mobile-landscape-warning fixed inset-0 z-[9999] bg-black flex-col items-center justify-center text-center p-8">
                    <div className="mb-4 text-4xl animate-bounce">📱</div>
                    <h2 className="text-xl font-bold text-white mb-2">Please Rotate Device</h2>
                    <p className="text-slate-400">Simple Blot is designed for portrait mode.</p>
                </div>

                {/* Game End Confetti */}
                {(gameState.players.hero.score >= gameState.gameTarget && gameState.phase === 'SCORING') && <Confetti />}

                {/* JUICE: Victory Coins */}
                {fxState.coinWinner && <CoinExplosion winner={fxState.coinWinner} />}

                {/* JUICE: Screen Shake/Flash */}
                <ScreenFX type={fxState.screenShake ? 'SHAKE' : null} />
                
                <Table 
                    gameState={gameState} 
                    onPlayCard={(c) => handlePlayCard(c, 'hero')}
                    validMoves={gameState.currentPlayerId === 'hero' && gameState.phase === 'PLAYING' 
                        ? gameState.players.hero.hand.filter(c => canPlayCard(gameState.players.hero.hand, c, gameState.currentTrick, gameState.trumpSuit))
                        : []}
                    settings={settings}
                    onUpdateSettings={updateSettings}
                    onForfeit={() => startNewGame(true)} 
                    showDeclarationModal={showDeclarationModal}
                    onDeclareCombinations={handleDeclareCombinations}
                    heroCombinations={gameState.players.hero.combinations}
                    timeLeft={declarationTimer ?? undefined}
                    beloteIds={fxState.beloteIds}
                    
                    // Sheet Triggers
                    onOpenHistory={() => setShowHistory(true)}
                    onOpenChat={() => setShowChat(true)}
                    onOpenSettings={() => setShowSettings(true)}
                    onOpenRules={() => setShowRules(true)}
                />

                {canAnnounce && (
                    <div className="absolute bottom-[240px] right-4 lg:bottom-32 lg:right-8 z-[110] animate-scale-in">
                        <button 
                            onClick={() => setShowDeclarationModal(true)}
                            className="btn-base bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 font-bold py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(251,191,36,0.5)] border border-yellow-300 flex items-center gap-2 group min-h-[48px]"
                        >
                            <StarIcon />
                            <span>Announce! ({declarationTimer}s)</span>
                        </button>
                    </div>
                )}

                {gameState.phase === 'BIDDING' && gameState.currentPlayerId === 'hero' && (
                    <BiddingControls 
                        candidateCard={gameState.candidateCard!}
                        onTake={handleTake}
                        onPass={handlePass}
                        bidRound={gameState.bidRound}
                        mustPick={mustPick} 
                    />
                )}

                {gameState.phase === 'SCORING' && gameState.lastRoundBreakdown && (
                    <RoundResultModal 
                        data={gameState.lastRoundBreakdown}
                        onNext={() => startNewGame(false)}
                        currentScores={{ hero: gameState.players.hero.score, opponent: gameState.players.opponent.score }}
                        target={gameState.gameTarget}
                    />
                )}

                <HistoryPanel 
                    isOpen={showHistory} 
                    onClose={() => setShowHistory(false)} 
                    history={gameState.roundHistory} 
                />
                
                <ChatSheet
                    isOpen={showChat}
                    onClose={() => setShowChat(false)}
                    onEmote={handleEmote}
                />

                {showSettings && <SettingsModal settings={settings} onUpdate={updateSettings} onClose={() => setShowSettings(false)} />}

                {showRules && (
                    <RulesModal onClose={() => setShowRules(false)} />
                )}
            </div>
        </ConnectionManager>
    </ErrorBoundary>
  );
};

export default App;