
import { Card, Combination, Rank, Suit, TrickCard, Difficulty, ContractType } from '../types';
import { CARD_VALUES, CARD_VALUES_NO_TRUMP, ORDER_NON_TRUMP, ORDER_TRUMP, ORDER_NO_TRUMP_MODE, RANKS, SUITS, VISUAL_SORT_ORDER, COMBO_RANK_ORDER } from '../constants';

// --- Deck Management ---

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  SUITS.forEach((suit) => {
    RANKS.forEach((rank) => {
      deck.push({ suit, rank, id: `${rank}${suit}` });
    });
  });
  return shuffleDeck(deck);
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// --- Values & Power ---

export const getCardPoints = (card: Card, trumpSuit: Suit | null, contractType: ContractType = 'TRUMP'): number => {
  // STRICT FIX for No Trump Scoring (Target: 162 Points Total)
  if (contractType === 'NO_TRUMP') {
      switch(card.rank) {
          case 'A': return 19; // CRITICAL FIX: Was 11 in standard mode
          case '10': return 10;
          case 'K': return 4;
          case 'Q': return 3;
          case 'J': return 2;
          case '9': return 0;
          default: return 0;
      }
  }
  
  if (!trumpSuit) return 0;
  const isTrump = card.suit === trumpSuit;
  return isTrump ? CARD_VALUES[card.rank].trump : CARD_VALUES[card.rank].nonTrump;
};

export const getCardPower = (
    card: Card, 
    trumpSuit: Suit | null, 
    leadSuit: Suit | null, 
    contractType: ContractType = 'TRUMP'
): number => {
  if (contractType === 'NO_TRUMP') {
      // In No Trump, hierarchy matches Non-Trump (A > 10 > K > Q > J > 9)
      // Only Lead Suit matters
      if (card.suit === leadSuit) {
          return 100 + ORDER_NO_TRUMP_MODE.indexOf(card.rank);
      }
      return ORDER_NO_TRUMP_MODE.indexOf(card.rank);
  }

  // TRUMP Mode Logic
  if (!trumpSuit) return 0;
  
  const isTrump = card.suit === trumpSuit;
  const isLead = card.suit === leadSuit;

  if (isTrump) {
    return 200 + ORDER_TRUMP.indexOf(card.rank);
  } else if (isLead) {
    return 100 + ORDER_NON_TRUMP.indexOf(card.rank);
  } else {
    return ORDER_NON_TRUMP.indexOf(card.rank);
  }
};

export const getWinningCard = (trick: TrickCard[], trumpSuit: Suit | null, contractType: ContractType = 'TRUMP'): TrickCard | null => {
  if (trick.length === 0) return null;
  
  let winner = trick[0];
  const leadSuit = winner.card.suit;

  for (let i = 1; i < trick.length; i++) {
    const challenger = trick[i];
    const winnerPower = getCardPower(winner.card, trumpSuit, leadSuit, contractType);
    const challengerPower = getCardPower(challenger.card, trumpSuit, leadSuit, contractType);

    if (challengerPower > winnerPower) {
      winner = challenger;
    }
  }
  return winner;
};

// --- Strict Move Validation ---

export const canPlayCard = (
  hand: Card[],
  cardToPlay: Card,
  currentTrick: TrickCard[],
  trumpSuit: Suit | null,
  contractType: ContractType = 'TRUMP'
): boolean => {
  if (currentTrick.length === 0) return true;
  
  // No Trump Logic
  if (contractType === 'NO_TRUMP') {
      const opponentPlay = currentTrick[0].card;
      const leadSuit = opponentPlay.suit;
      const hasLeadSuit = hand.some(c => c.suit === leadSuit);
      
      // Must follow suit if possible
      if (hasLeadSuit) {
          if (cardToPlay.suit !== leadSuit) return false;
      }
      // If void, can play any card. No trumping obligation because there are no trumps.
      return true;
  }

  // Standard Trump Logic
  if (!trumpSuit) return true;

  const opponentPlay = currentTrick[0].card;
  const leadSuit = opponentPlay.suit;
  
  const hasLeadSuit = hand.some(c => c.suit === leadSuit);
  const hasTrump = hand.some(c => c.suit === trumpSuit);

  // 1. MUST Follow Suit
  if (hasLeadSuit) {
    if (cardToPlay.suit !== leadSuit) return false;
    
    // Rule: If Lead Suit IS Trump, MUST Over-trump if possible
    if (leadSuit === trumpSuit) {
        const opponentPower = getCardPower(opponentPlay, trumpSuit, leadSuit, 'TRUMP');
        const myPower = getCardPower(cardToPlay, trumpSuit, leadSuit, 'TRUMP');
        const canBeat = hand.some(c => c.suit === trumpSuit && getCardPower(c, trumpSuit, leadSuit, 'TRUMP') > opponentPower);
        if (canBeat && myPower <= opponentPower) return false;
    }
    return true;
  }

  // 2. If Void in Lead Suit
  if (leadSuit !== trumpSuit) {
      // Must Trump if possible
      if (hasTrump) {
          if (cardToPlay.suit !== trumpSuit) return false;
          return true;
      }
      return true;
  } 
  
  return true;
};

// --- Combinations Finder ---

export const calculateCombinations = (hand: Card[], trumpSuit: Suit | null, contractType: ContractType = 'TRUMP'): Combination[] => {
    let rawCombos: Combination[] = [];

    // 1. CARRE (4 of a kind)
    const ranks = ['J', '9', 'A', '10', 'K', 'Q'];
    ranks.forEach(rank => {
        const cards = hand.filter(c => c.rank === rank);
        if (cards.length === 4) {
            let points = 100;
            
            if (contractType === 'TRUMP') {
                if (rank === 'J') points = 200;
                else if (rank === '9') points = 140; 
                else if (rank === 'A') points = 110; 
                else points = 100;
            } else {
                // No Trump Mode Values
                if (rank === 'A') points = 190;
                else if (rank === '9') points = 0; // 4 Nines are worth 0 in No Trump
                else points = 100;
            }
            
            if (points > 0) {
                rawCombos.push({
                    id: `carre-${rank}`,
                    type: 'CARRE',
                    cards: cards,
                    score: points,
                    heightValue: COMBO_RANK_ORDER.indexOf(rank as Rank), 
                    rank: rank as Rank,
                    isTrump: false 
                });
            }
        }
    });

    // 2. SEQUENCES
    const effectiveTrump = contractType === 'TRUMP' ? trumpSuit : null;

    SUITS.forEach(suit => {
        // Sort cards High to Low based on Sequence Order (A, K, Q, J, 10, 9)
        const suitCards = hand.filter(c => c.suit === suit)
            .sort((a, b) => COMBO_RANK_ORDER.indexOf(b.rank) - COMBO_RANK_ORDER.indexOf(a.rank));
        
        const usedInSeq = new Set<string>();

        // Check for lengths 5 down to 3 (Hundred, Fifty, Tierce)
        for (let len = 5; len >= 3; len--) {
            const seqs = findSequences(suitCards, len);
            
            seqs.forEach(seq => {
                // Only add if no card in this sequence is already used in a larger sequence
                // (Though usually we want greedy largest first, looping 5->3 does this)
                const isSubset = seq.some(c => usedInSeq.has(c.id));
                
                if (!isSubset) {
                    let type: Combination['type'] = 'TIERCE';
                    let score = 20;
                    if (len === 4) { type = 'FIFTY'; score = 50; }
                    if (len >= 5) { type = 'HUNDRED'; score = 100; }
                    
                    const heightValue = COMBO_RANK_ORDER.indexOf(seq[0].rank);

                    rawCombos.push({
                        id: `seq-${suit}-${seq[0].rank}-${len}`,
                        type,
                        cards: seq,
                        score,
                        heightValue,
                        rank: seq[0].rank,
                        isTrump: suit === effectiveTrump
                    });

                    seq.forEach(c => usedInSeq.add(c.id));
                }
            });
        }
    });

    // 3. BELOTE (King + Queen of Trump)
    if (contractType === 'TRUMP' && trumpSuit) {
        const kTrump = hand.find(c => c.suit === trumpSuit && c.rank === 'K');
        const qTrump = hand.find(c => c.suit === trumpSuit && c.rank === 'Q');
        
        if (kTrump && qTrump) {
            rawCombos.push({
                id: 'belote',
                type: 'BELOTE',
                cards: [kTrump, qTrump],
                score: 20,
                heightValue: 0,
                rank: 'K',
                isTrump: true
            });
        }
    }

    return rawCombos;
};

// Helper for finding sequences (Input must be sorted High to Low)
const findSequences = (cards: Card[], length: number): Card[][] => {
    const sequences: Card[][] = [];
    if (cards.length < length) return sequences;

    for (let i = 0; i <= cards.length - length; i++) {
        let isSeq = true;
        const currentSeq = [cards[i]];
        
        for (let j = 1; j < length; j++) {
            const prev = cards[i + j - 1]; 
            const curr = cards[i + j];     
            
            const idxPrev = COMBO_RANK_ORDER.indexOf(prev.rank);
            const idxCurr = COMBO_RANK_ORDER.indexOf(curr.rank);
            
            // Check for strict adjacency in rank order (e.g. 5 - 4 = 1)
            if (idxPrev - idxCurr === 1) {
                currentSeq.push(curr);
            } else {
                isSeq = false;
                break;
            }
        }
        
        if (isSeq) {
            sequences.push(currentSeq);
        }
    }
    return sequences;
};

// Priority: Carre > Hundred > Fifty > Tierce
const getComboTypePriority = (type: Combination['type']): number => {
    switch (type) {
        case 'CARRE': return 4;
        case 'HUNDRED': return 3;
        case 'FIFTY': return 2;
        case 'TIERCE': return 1;
        default: return 0;
    }
};

// --- Conflict Solver (Non-overlapping rules) ---
export const solveCombinationConflicts = (allCombos: Combination[]): Combination[] => {
    // 1. Separate Belote (Rule: Belote cards CAN participate in other combos)
    const belote = allCombos.filter(c => c.type === 'BELOTE');
    const others = allCombos.filter(c => c.type !== 'BELOTE');

    // 2. Sort others to find the "Best" ones first
    const sorted = others.sort((a, b) => {
        // Priority 1: Score (Carre 9 [140] > Carre A [110])
        if (b.score !== a.score) return b.score - a.score;
        
        // Priority 2: Type (Carre > Hundred > Fifty...)
        const pA = getComboTypePriority(a.type);
        const pB = getComboTypePriority(b.type);
        if (pA !== pB) return pB - pA;
        
        // Priority 3: Height
        return b.heightValue - a.heightValue;
    });

    // 3. Greedy Selection
    const selected: Combination[] = [...belote];
    const usedCardIds = new Set<string>();

    for (const combo of sorted) {
        // Check if any card in this combo is already used by a PREVIOUSLY selected combo (higher priority)
        const overlaps = combo.cards.some(c => usedCardIds.has(c.id));
        
        if (!overlaps) {
            selected.push(combo);
            combo.cards.forEach(c => usedCardIds.add(c.id));
        }
    }

    return selected;
};

// --- Strict Comparison Algorithm ---

export const compareDeclarations = (
    heroCombos: Combination[], 
    oppCombos: Combination[], 
    firstPlayerId: 'hero' | 'opponent' // The leader of the first trick
): { winner: 'hero' | 'opponent' | 'none', heroPoints: number, oppPoints: number } => {
    
    // Ensure we are working with valid subsets just in case
    // (Though App should handle this, double safety)
    const hValid = solveCombinationConflicts(heroCombos);
    const oValid = solveCombinationConflicts(oppCombos);

    const hBelote = hValid.filter(c => c.type === 'BELOTE');
    const oBelote = oValid.filter(c => c.type === 'BELOTE');
    const hBeloteScore = hBelote.reduce((s, c) => s + c.score, 0);
    const oBeloteScore = oBelote.reduce((s, c) => s + c.score, 0);

    const hOthers = hValid.filter(c => c.type !== 'BELOTE');
    const oOthers = oValid.filter(c => c.type !== 'BELOTE');

    if (hOthers.length === 0 && oOthers.length === 0) {
        return { 
            winner: 'none', 
            heroPoints: hBeloteScore, 
            oppPoints: oBeloteScore 
        };
    }

    const sortForBest = (a: Combination, b: Combination) => {
        const pA = getComboTypePriority(a.type);
        const pB = getComboTypePriority(b.type);
        
        if (pA !== pB) return pB - pA; // Type
        if (b.score !== a.score) return b.score - a.score; // Score
        return b.heightValue - a.heightValue; // Height
    };

    const hBest = [...hOthers].sort(sortForBest)[0];
    const oBest = [...oOthers].sort(sortForBest)[0];

    let mainWinner: 'hero' | 'opponent' | 'none' = 'none';

    if (hBest && !oBest) mainWinner = 'hero';
    else if (!hBest && oBest) mainWinner = 'opponent';
    else if (hBest && oBest) {
        const pA = getComboTypePriority(hBest.type);
        const pB = getComboTypePriority(oBest.type);

        if (pA > pB) mainWinner = 'hero';
        else if (pB > pA) mainWinner = 'opponent';
        else {
            if (hBest.score > oBest.score) mainWinner = 'hero';
            else if (oBest.score > hBest.score) mainWinner = 'opponent';
            else {
                if (hBest.heightValue > oBest.heightValue) mainWinner = 'hero';
                else if (oBest.heightValue > hBest.heightValue) mainWinner = 'opponent';
                else {
                    if (hBest.isTrump && !oBest.isTrump) mainWinner = 'hero';
                    else if (oBest.isTrump && !hBest.isTrump) mainWinner = 'opponent';
                    else mainWinner = firstPlayerId;
                }
            }
        }
    }

    const hOtherScore = hOthers.reduce((s, c) => s + c.score, 0);
    const oOtherScore = oOthers.reduce((s, c) => s + c.score, 0);

    return {
        winner: mainWinner,
        heroPoints: hBeloteScore + (mainWinner === 'hero' ? hOtherScore : 0),
        oppPoints: oBeloteScore + (mainWinner === 'opponent' ? oOtherScore : 0)
    };
};

export const getBotBidDecision = (
    hand: Card[],
    candidate: Card,
    bidRound: 1 | 2,
    difficulty: Difficulty
): { action: 'take', suit: Suit | null, contract: ContractType } | { action: 'pass' } => {
    // Basic bot implementation: Evaluate standard trump strength
    const trumpScore = evaluateHandStrength(hand, candidate.suit, 'TRUMP');
    
    if (trumpScore > 40) return { action: 'take', suit: candidate.suit, contract: 'TRUMP' };
    
    // Simple No Trump check
    const ntScore = evaluateHandStrength(hand, null, 'NO_TRUMP');
    if (ntScore > 45 && bidRound === 2) return { action: 'take', suit: null, contract: 'NO_TRUMP' };

    return { action: 'pass' };
};

export const evaluateHandStrength = (hand: Card[], potentialTrump: Suit | null, contractType: ContractType = 'TRUMP'): number => {
    let score = 0;
    
    if (contractType === 'NO_TRUMP') {
        hand.forEach(c => {
             // A=19, 10=10, K=4...
             const pts = CARD_VALUES_NO_TRUMP[c.rank];
             score += pts;
        });
        return score;
    }

    // Trump Mode
    hand.forEach(c => {
        if (potentialTrump && c.suit === potentialTrump) {
            if (c.rank === 'J') score += 20;
            else if (c.rank === '9') score += 14;
            else if (c.rank === 'A') score += 6;
            else score += 3;
        } else {
            if (c.rank === 'A') score += 11;
            if (c.rank === '10') score += 10;
        }
    });
    return score;
};

export const getBotMove = (
    hand: Card[], 
    trick: TrickCard[], 
    trumpSuit: Suit | null,
    contractType: ContractType,
    difficulty: Difficulty,
    playedCards: Card[] = []
): Card => {
    const validMoves = hand.filter(c => canPlayCard(hand, c, trick, trumpSuit, contractType));
    
    // Simple: play highest power valid card
    if (validMoves.length > 0) {
        // Sort by power descending
        const leadSuit = trick.length > 0 ? trick[0].card.suit : null;
        return validMoves.sort((a,b) => getCardPower(b, trumpSuit, leadSuit, contractType) - getCardPower(a, trumpSuit, leadSuit, contractType))[0];
    }

    return validMoves[0] || hand[0];
};

export const sortHand = (hand: Card[], trumpSuit: Suit | null = null, contractType: ContractType = 'TRUMP'): Card[] => {
  return [...hand].sort((a, b) => {
    // 1. Trump Priority (only in Trump Mode)
    if (contractType === 'TRUMP' && trumpSuit) {
        const aIsTrump = a.suit === trumpSuit;
        const bIsTrump = b.suit === trumpSuit;
        
        if (aIsTrump && !bIsTrump) return -1; // Trump comes first
        if (!aIsTrump && bIsTrump) return 1;
        // If both are trump or both not trump, continue
    }

    // 2. Suit Order (Group by suit)
    if (a.suit !== b.suit) {
        return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
    }

    // 3. Rank Order (Visual)
    return VISUAL_SORT_ORDER.indexOf(a.rank) - VISUAL_SORT_ORDER.indexOf(b.rank);
  });
};
