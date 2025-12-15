

import { useEffect, useRef } from 'react';
import { GameState, Suit, Card, ContractType, Difficulty, Player } from '../types';
import { getBotBidDecision, getBotMove, solveCombinationConflicts } from '../utils/gameLogic';

interface BotAgentProps {
    gameState: GameState;
    settings: {
        difficulty: Difficulty;
        gameSpeed: 'fast' | 'normal' | 'slow';
    };
    onTake: (suit: Suit | null, keep: boolean, isNoTrump: boolean) => void;
    onPass: () => void;
    onPlayCard: (card: Card, playerId: 'hero' | 'opponent') => void;
    setGameState: React.Dispatch<React.SetStateAction<GameState>>; // Needed for declaration updates
}

export const useBotAgent = ({
    gameState,
    settings,
    onTake,
    onPass,
    onPlayCard,
    setGameState
}: BotAgentProps) => {
    const delayRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Trigger Logic
    useEffect(() => {
        const { phase, currentPlayerId, currentTrick, players, candidateCard, bidRound, dealerId, trumpSuit, contractType, trickCount } = gameState;
        
        if (currentPlayerId !== 'opponent') return;

        const delayMs = settings.gameSpeed === 'fast' ? 100 : settings.gameSpeed === 'slow' ? 500 : 250;

        // Clear any pending moves if state changed quickly
        if (delayRef.current) clearTimeout(delayRef.current);

        delayRef.current = setTimeout(() => {
            // Main Thread Logic Execution (Removed Worker)

            if (phase === 'BIDDING') {
                if (candidateCard) { // Check existence
                    const decision = getBotBidDecision(
                        players.opponent.hand, 
                        candidateCard, 
                        bidRound, 
                        settings.difficulty, 
                        dealerId === 'opponent'
                    );

                    if (decision.action === 'take') {
                        // Logic from original App.tsx
                        // If round 1, keepCandidate check matches suit
                        const isRound1 = gameState.bidRound === 1;
                        const keep = (decision.suit === candidateCard.suit) || isRound1;
                        onTake(decision.suit || null, keep, decision.contract === 'NO_TRUMP');
                    } else {
                        onPass();
                    }
                }
            } 
            else if (phase === 'PLAYING') {
                if (currentTrick.length < 2) {
                    // Check for Declarations first (Trick 0)
                    if (trickCount === 0 && !players.opponent.hasShownCombinations) {
                        const combinations = players.opponent.combinations;
                        // Offload the conflict resolution logic
                        let validCombos = [];
                        if (combinations && combinations.length > 0) {
                            validCombos = solveCombinationConflicts(combinations);
                            const belote = combinations.find((c: any) => c.type === 'BELOTE');
                            if (belote && !validCombos.some((c: any) => c.type === 'BELOTE')) {
                                validCombos.push(belote);
                            }
                        }

                        if (validCombos.length > 0) {
                            const txt = validCombos.filter((c: any) => c.type !== 'BELOTE').map((c: any) => c.type).join(', ');
                            
                            setGameState(p => ({ 
                                ...p, 
                                players: { 
                                    ...p.players, 
                                    opponent: { 
                                        ...p.players.opponent, 
                                        declaredCombinations: validCombos, 
                                        hasShownCombinations: true, 
                                        lastAction: txt ? `Announced: ${txt}` : p.players.opponent.lastAction 
                                    } 
                                } 
                            }));
                        } else {
                            setGameState(p => ({ 
                                ...p, 
                                players: { 
                                    ...p.players, 
                                    opponent: { ...p.players.opponent, hasShownCombinations: true } 
                                } 
                            }));
                        }
                        // We do NOT return here, we want to play the card immediately after/parallel
                    }

                    const played = [...players.hero.capturedCards, ...players.opponent.capturedCards];
                    const move = getBotMove(
                        players.opponent.hand,
                        currentTrick,
                        trumpSuit,
                        contractType,
                        settings.difficulty,
                        played
                    );
                    onPlayCard(move, 'opponent');
                }
            }
        }, delayMs);

        return () => {
            if (delayRef.current) clearTimeout(delayRef.current);
        };
    }, [gameState, settings]); // Re-run when game state changes to trigger next bot step
};