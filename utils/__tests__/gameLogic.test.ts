import { describe, it, expect } from 'vitest';
import { 
    getCardValue, 
    canPlayCard, 
    calculateCombinations, 
    compareDeclarations, 
    solveCombinationConflicts,
    createDeck,
    getWinningCard
} from '../gameLogic';
import { Card, Combination, TrickCard, Suit } from '../../types';

// Helper to create a card quickly
const c = (rank: string, suit: string): Card => ({ 
    rank: rank as any, 
    suit: suit as any, 
    id: `${rank}${suit}` 
});

describe('Blot Business Logic', () => {

    describe('1. Card Values & Deck Integrity', () => {
        it('should have a total of 162 points in the deck (Trump Mode)', () => {
            const deck = createDeck();
            // Sum of all card values in Trump mode (assuming one suit is trump, 3 are not)
            // But verifyRuleset() logic sums specific values. 
            // Manual calc: 
            // Trump suit: J(20)+9(14)+A(11)+10(10)+K(4)+Q(3) = 62
            // Non-Trump (x3): A(11)+10(10)+K(4)+Q(3)+J(2)+9(0) = 30 * 3 = 90
            // Total = 62 + 90 = 152. (+10 for last trick = 162).
            
            // Let's verify raw card points = 152
            let total = 0;
            const trumpSuit = 'H';
            deck.forEach(card => {
                const isTrump = card.suit === trumpSuit;
                total += getCardValue(card.rank, isTrump, 'TRUMP');
            });
            expect(total).toBe(152);
        });

        it('should value Aces correctly in No Trump', () => {
            // In No Trump, A=19, 10=10, K=4, Q=3, J=2, 9=0. Total per suit = 38. 38*4 = 152.
            expect(getCardValue('A', false, 'NO_TRUMP')).toBe(19);
            expect(getCardValue('9', false, 'NO_TRUMP')).toBe(0);
        });
    });

    describe('2. Strict Move Validation (canPlayCard)', () => {
        const trumpSuit = 'H';
        const hand = [c('10', 'H'), c('9', 'H'), c('A', 'C'), c('7', 'D')]; // Note: 7 doesn't exist in 24 card, using standard mock
        
        it('should allow any card if leading (trick empty)', () => {
            expect(canPlayCard(hand, c('10', 'H'), [], trumpSuit)).toBe(true);
        });

        it('should enforce following suit', () => {
            const trick: TrickCard[] = [{ card: c('K', 'C'), playerId: 'opponent' }];
            // Must play Club (A-C)
            expect(canPlayCard(hand, c('A', 'C'), trick, trumpSuit)).toBe(true);
            // Cannot play Heart (Trump) if holding Club
            expect(canPlayCard(hand, c('10', 'H'), trick, trumpSuit)).toBe(false);
        });

        it('should force Trumping (Cutting) if void in lead suit', () => {
            const handNoSpades = [c('10', 'H'), c('A', 'C')];
            const trick: TrickCard[] = [{ card: c('K', 'S'), playerId: 'opponent' }];
            
            // Must play Trump (H) because void in Spades
            expect(canPlayCard(handNoSpades, c('10', 'H'), trick, trumpSuit)).toBe(true);
            expect(canPlayCard(handNoSpades, c('A', 'C'), trick, trumpSuit)).toBe(false);
        });

        it('should force Over-Trumping (Monter à l\'atout)', () => {
            const handTrumps = [c('J', 'H'), c('Q', 'H')]; // J=20, Q=3
            const trick: TrickCard[] = [{ card: c('9', 'H'), playerId: 'opponent' }]; // 9=14
            
            // Opponent played 9 (14). 
            // Q (3) is lower, J (20) is higher.
            // Rule: Must beat if possible.
            expect(canPlayCard(handTrumps, c('J', 'H'), trick, trumpSuit)).toBe(true);
            expect(canPlayCard(handTrumps, c('Q', 'H'), trick, trumpSuit)).toBe(false);
        });

        it('should allow under-trumping only if cannot over-trump', () => {
            const handWeakTrumps = [c('Q', 'H'), c('K', 'H')]; // Q=3, K=4
            const trick: TrickCard[] = [{ card: c('J', 'H'), playerId: 'opponent' }]; // J=20 (Master)
            
            // I cannot beat J. I can play any trump I have.
            expect(canPlayCard(handWeakTrumps, c('Q', 'H'), trick, trumpSuit)).toBe(true);
        });
        
        it('should allow playing non-trump if void in lead AND void in trump', () => {
            const handNoTrumpNoLead = [c('A', 'D')];
            const trick: TrickCard[] = [{ card: c('A', 'S'), playerId: 'opponent' }];
            // I have no Spades (Lead) and no Hearts (Trump). I can discard Diamonds.
            expect(canPlayCard(handNoTrumpNoLead, c('A', 'D'), trick, trumpSuit)).toBe(true);
        });
    });

    describe('3. Trick Resolution (Winning Card)', () => {
        const trumpSuit = 'H';

        it('Trump beats non-trump', () => {
            const trick: TrickCard[] = [
                { card: c('A', 'C'), playerId: 'opponent' }, // Lead
                { card: c('9', 'H'), playerId: 'hero' }      // Cut
            ];
            const winner = getWinningCard(trick, trumpSuit, 'TRUMP');
            expect(winner?.playerId).toBe('hero');
        });

        it('Higher rank wins in same suit (Non-Trump)', () => {
            const trick: TrickCard[] = [
                { card: c('10', 'C'), playerId: 'opponent' }, 
                { card: c('A', 'C'), playerId: 'hero' }      
            ];
            // A > 10 in non-trump
            const winner = getWinningCard(trick, trumpSuit, 'TRUMP');
            expect(winner?.playerId).toBe('hero');
        });

        it('Higher rank wins in same suit (Trump)', () => {
            const trick: TrickCard[] = [
                { card: c('9', 'H'), playerId: 'opponent' }, // 14
                { card: c('J', 'H'), playerId: 'hero' }      // 20
            ];
            const winner = getWinningCard(trick, trumpSuit, 'TRUMP');
            expect(winner?.playerId).toBe('hero');
        });
    });

    describe('4. Combinations Logic', () => {
        const trumpSuit = 'H';

        it('should detect Tierce (3 sequence)', () => {
            const hand = [c('A', 'C'), c('K', 'C'), c('Q', 'C'), c('9', 'D')];
            const combos = calculateCombinations(hand, trumpSuit);
            const tierce = combos.find(c => c.type === 'TIERCE');
            
            expect(tierce).toBeDefined();
            expect(tierce?.score).toBe(20);
            expect(tierce?.rank).toBe('A');
        });

        it('should detect Fifty (4 sequence)', () => {
            const hand = [c('A', 'C'), c('K', 'C'), c('Q', 'C'), c('J', 'C')];
            const combos = calculateCombinations(hand, trumpSuit);
            const fifty = combos.find(c => c.type === 'FIFTY');
            
            expect(fifty).toBeDefined();
            expect(fifty?.score).toBe(50);
        });

        it('should detect Belote (K+Q Trump)', () => {
            const hand = [c('K', 'H'), c('Q', 'H'), c('9', 'C')];
            const combos = calculateCombinations(hand, trumpSuit);
            const belote = combos.find(c => c.type === 'BELOTE');
            
            expect(belote).toBeDefined();
            expect(belote?.score).toBe(20);
        });

        it('should detect Carre (4 of a kind)', () => {
            const hand = [c('J', 'H'), c('J', 'D'), c('J', 'C'), c('J', 'S')];
            const combos = calculateCombinations(hand, trumpSuit);
            const carre = combos.find(c => c.type === 'CARRE');
            
            expect(carre).toBeDefined();
            // Carre of Jacks = 200
            expect(carre?.score).toBe(200);
        });
    });

    describe('5. Combination Comparisons', () => {
        it('Fifty should beat Tierce', () => {
            const heroCombos: Combination[] = [{
                id: '1', type: 'TIERCE', score: 20, heightValue: 5, rank: 'A', cards: [], isTrump: false
            }];
            const oppCombos: Combination[] = [{
                id: '2', type: 'FIFTY', score: 50, heightValue: 0, rank: '9', cards: [], isTrump: false
            }];

            const result = compareDeclarations(heroCombos, oppCombos, 'hero');
            expect(result.winner).toBe('opponent');
        });

        it('Same type: Higher rank wins', () => {
            // Tierce to Ace vs Tierce to King
            const heroCombos: Combination[] = [{
                id: '1', type: 'TIERCE', score: 20, heightValue: 5, rank: 'A', cards: [], isTrump: false
            }];
            const oppCombos: Combination[] = [{
                id: '2', type: 'TIERCE', score: 20, heightValue: 4, rank: 'K', cards: [], isTrump: false
            }];

            const result = compareDeclarations(heroCombos, oppCombos, 'hero');
            expect(result.winner).toBe('hero');
        });

        it('Same type/rank: Trump wins', () => {
            // Tierce to Ace (Non-Trump) vs Tierce to Ace (Trump)
            const heroCombos: Combination[] = [{
                id: '1', type: 'TIERCE', score: 20, heightValue: 5, rank: 'A', cards: [], isTrump: false
            }];
            const oppCombos: Combination[] = [{
                id: '2', type: 'TIERCE', score: 20, heightValue: 5, rank: 'A', cards: [], isTrump: true
            }];

            const result = compareDeclarations(heroCombos, oppCombos, 'hero');
            expect(result.winner).toBe('opponent');
        });
        
        it('Belote is independent (always valid)', () => {
             // Hero has Tierce (20). Opp has Fifty (50) + Belote (20).
             // Opponent wins the declaration battle (50 > 20).
             // Hero Tierce is voided.
             // Opponent Belote still counts.
             
             const heroCombos: Combination[] = [{
                id: '1', type: 'TIERCE', score: 20, heightValue: 5, rank: 'A', cards: [], isTrump: false
            }];
            
            // Opponent has Fifty
            const oppCombos: Combination[] = [{
                id: '2', type: 'FIFTY', score: 50, heightValue: 5, rank: 'A', cards: [], isTrump: false
            }, {
                id: '3', type: 'BELOTE', score: 20, heightValue: 0, rank: 'K', cards: [], isTrump: true
            }];

            const result = compareDeclarations(heroCombos, oppCombos, 'hero');
            expect(result.winner).toBe('opponent');
            // Winner gets their Main points + Belote
            expect(result.oppPoints).toBe(70); 
            // Loser gets 0 for main, but checks logic handles belote separately usually. 
            // The compare function strictly compares declarable sets. 
            // If Hero had Belote, Hero would get 20 points even if losing the main battle.
            expect(result.heroPoints).toBe(0);
        });
    });

    describe('6. Conflict Resolution', () => {
        it('should choose the highest scoring combination when cards overlap', () => {
            // Hand: K, Q, J, 10, 9 of Hearts.
            // Contains: Fifty (9-Q) and Fifty (10-K).
            // Actually it contains Hundred (5 cards).
            // But let's assume we pass raw combos: Tierce (K-Q-J) vs Carre (J-J-J-J).
            
            // Scenario: Holding 4 Jacks. One Jack is part of a Tierce.
            const jackH = c('J', 'H');
            const carreComb: Combination = {
                id: 'carre-J', type: 'CARRE', score: 200, heightValue: 2, rank: 'J', 
                cards: [jackH, c('J', 'C'), c('J', 'D'), c('J', 'S')], isTrump: false
            };
            
            const tierceComb: Combination = {
                id: 'tierce-H', type: 'TIERCE', score: 20, heightValue: 2, rank: 'J',
                cards: [jackH, c('10', 'H'), c('9', 'H')], isTrump: true
            };

            const selected = solveCombinationConflicts([carreComb, tierceComb]);
            
            // Should keep Carre (200) and discard Tierce (20) because they share Jack of Hearts
            expect(selected).toHaveLength(1);
            expect(selected[0].type).toBe('CARRE');
        });
    });
});
