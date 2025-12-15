import { describe, it, expect } from 'vitest';
import { calculateRoundResult } from '../calculateRoundResult';
import { GameState, Player } from '../../types';

// Mock State Helper
const createMockState = (
    heroPoints: number, 
    oppPoints: number, 
    bidTaker: 'hero' | 'opponent',
    hTricks: number,
    oTricks: number,
    hDecl: number = 0,
    oDecl: number = 0
): GameState => {
    return {
        bidTaker,
        trumpSuit: 'H',
        contractType: 'TRUMP',
        roundHistory: [],
        currentPlayerId: 'hero', // Assume hero won last trick if last bonus needed
        players: {
            hero: {
                capturedCards: Array(hTricks * 2).fill({ rank: '9', suit: 'D', id: 'x' }), // Dummy length
                declaredCombinations: hDecl ? [{ type: 'TIERCE', score: hDecl, cards: [], id: 'x' } as any] : [],
                score: 0,
                // We mock the raw points via internal logic of calc function reading captured cards?
                // No, the calc function sums points FROM captured cards. 
                // We need to Mock the captured cards to equal specific point values.
                // This is hard to mock perfectly without lots of card objects.
                // Instead, we will Mock the Helper function or Construct careful cards.
            } as Player,
            opponent: {
                capturedCards: Array(oTricks * 2).fill({ rank: '9', suit: 'D', id: 'y' }),
                declaredCombinations: oDecl ? [{ type: 'TIERCE', score: oDecl, cards: [], id: 'y' } as any] : [],
                score: 0
            } as Player
        }
    } as GameState;
};

// We need to actually inject cards with points.
// Let's make a helper that returns a card with X points.
const pointCard = (points: number) => {
    // Return a dummy card. Since logic uses `getCardPoints`, we need valid ranks.
    // 11 = A, 10 = 10, 4 = K, 3 = Q, 2 = J(non), 0 = 9.
    if (points === 11) return { rank: 'A', suit: 'C', id: Math.random().toString() };
    if (points === 10) return { rank: '10', suit: 'C', id: Math.random().toString() };
    return { rank: '9', suit: 'C', id: Math.random().toString() }; // 0
};

describe('Round Scoring (Integration)', () => {

    it('should calculate NORMAL win correctly', () => {
        // Hero Taker. Hero: 100 pts. Opp: 62 pts.
        // We simulate this by mocking the return of getCardPoints or building precise arrays.
        // Since we can't easily mock imports in this setup without complex config, 
        // We will build a "state" where captured cards sum up.
        
        // This test file requires `getCardPoints` to work on real cards.
        // Let's assume Hero captured 10 Aces (impossible but logic allows) -> 110 pts.
        const heroCards = Array(10).fill(null).map(() => ({ rank: 'A', suit: 'C', id: Math.random().toString() }));
        const oppCards = Array(4).fill(null).map(() => ({ rank: 'A', suit: 'D', id: Math.random().toString() })); // 44 pts

        const state = {
            bidTaker: 'hero',
            trumpSuit: 'H',
            contractType: 'TRUMP',
            roundHistory: [],
            currentPlayerId: 'hero', // Hero wins last trick (+10)
            players: {
                hero: { capturedCards: heroCards, declaredCombinations: [] },
                opponent: { capturedCards: oppCards, declaredCombinations: [] }
            }
        } as unknown as GameState;

        const result = calculateRoundResult(state);
        
        // Hero Raw: 110 (Cards) + 10 (Last) = 120.
        // Opp Raw: 44.
        // Total: 164? (Wait, Aces are 11). 
        // 10*11 = 110. 4*11 = 44. 
        
        expect(result.hero.rawFinalPoints).toBe(120);
        expect(result.roundInfo.status).toBe('NORMAL');
        expect(result.roundInfo.winnerId).toBe('hero');
        // Table points: (120 + 4) / 10 = 12.
        expect(result.hero.finalPoints).toBe(12);
    });

    it('should trigger DEDANS if taker scores less', () => {
        // Hero Taker. Hero: 44. Opp: 110 (+10 last).
        const heroCards = Array(4).fill(null).map(() => ({ rank: 'A', suit: 'D', id: Math.random().toString() })); 
        const oppCards = Array(10).fill(null).map(() => ({ rank: 'A', suit: 'C', id: Math.random().toString() }));

        const state = {
            bidTaker: 'hero',
            trumpSuit: 'H',
            contractType: 'TRUMP',
            roundHistory: [],
            currentPlayerId: 'opponent', // Opp wins last
            players: {
                hero: { capturedCards: heroCards, declaredCombinations: [] },
                opponent: { capturedCards: oppCards, declaredCombinations: [] }
            }
        } as unknown as GameState;

        const result = calculateRoundResult(state);

        expect(result.roundInfo.status).toBe('DEDANS');
        expect(result.roundInfo.winnerId).toBe('opponent');
        
        // Hero gets 0.
        expect(result.hero.rawFinalPoints).toBe(0);
        // Opponent gets ALL (162).
        expect(result.opponent.rawFinalPoints).toBe(162);
    });

    it('should handle CAPOT (All Tricks)', () => {
        // Hero takes 9 tricks (18 cards).
        // Total cards in 24 card deck = 24.
        // Captured array length should be 24.
        
        const heroCards = Array(24).fill(null).map((_, i) => ({ rank: 'A', suit: 'C', id: i.toString() }));
        
        const state = {
            bidTaker: 'hero',
            trumpSuit: 'H',
            contractType: 'TRUMP',
            roundHistory: [],
            currentPlayerId: 'hero', 
            players: {
                hero: { capturedCards: heroCards, declaredCombinations: [] },
                opponent: { capturedCards: [], declaredCombinations: [] }
            }
        } as unknown as GameState;

        const result = calculateRoundResult(state);

        expect(result.roundInfo.status).toBe('CAPOT');
        // Capot score: 162 + 50 = 212. Not 250 (Belote rules vary, usually 250 in 32-card, but prompts define 24-card variant logic).
        // The implementation provided in previous prompt uses 212 for capot.
        expect(result.hero.rawFinalPoints).toBe(212);
        expect(result.hero.finalPoints).toBe(21); // Special capot rounding
    });
});
