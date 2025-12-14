
import { Card, Combination, Rank, Suit, TrickCard, Difficulty, ContractType } from '../types';
import { 
    POINT_VALUES, 
    DECLARATION_VALUES, 
    ORDER_NON_TRUMP, 
    ORDER_TRUMP, 
    ORDER_NO_TRUMP_MODE, 
    RANKS, 
    SUITS, 
    VISUAL_SORT_ORDER, 
    COMBO_RANK_ORDER 
} from '../constants';

// --- Deck Management Optimization ---

// Singleton pattern: Create card objects once to save GC.
// Since Card objects are effectively immutable in this game (state changes happen in Player/GameState wrappers),
// we can reuse the base definitions.
const MASTER_DECK: Card[] = [];
SUITS.forEach((suit) => {
    RANKS.forEach((rank) => {
        MASTER_DECK.push({ suit, rank, id: `${rank}${suit}` });
    });
});

export const createDeck = (): Card[] => {
  // Return a shallow copy of the master deck to allow shuffling
  return shuffleDeck([...MASTER_DECK]);
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const newDeck = [...deck];
  // Fisher-Yates Shuffle
  for (let i = newDeck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
  }
  return newDeck;
};

// --- DISTRIBUTION LOGIC ---

export const distributeCardsLogic = (
    takerId: 'hero' | 'opponent',
    remainingDeck: Card[],
    candidate: Card,
    keepCandidate: boolean,
    currentHeroHand: Card[],
    currentOppHand: Card[],
    trumpSuit: Suit | null,
    contractType: ContractType
) => {
    const newHeroHand = [...currentHeroHand];
    const newOpponentHand = [...currentOppHand];

    let extraTaker: Card[];
    let extraOpponent: Card[];

    // Define distribution chunks based on logic
    if (keepCandidate) {
        // Taker gets Candidate + Top 2 (3 total)
        // Opponent gets next 3
        extraTaker = [candidate, ...remainingDeck.slice(0, 2)];
        extraOpponent = remainingDeck.slice(2, 5);
    } else {
        // Candidate burned
        // Taker gets Top 3
        // Opponent gets next 3
        extraTaker = remainingDeck.slice(0, 3);
        extraOpponent = remainingDeck.slice(3, 6);
    }

    if (takerId === 'hero') {
        newHeroHand.push(...extraTaker);
        newOpponentHand.push(...extraOpponent);
    } else {
        newOpponentHand.push(...extraTaker);
        newHeroHand.push(...extraOpponent);
    }

    // Sort hands immediately for UI consistency
    const sortedHero = sortHand(newHeroHand, trumpSuit, contractType);
    const sortedOpp = sortHand(newOpponentHand, trumpSuit, contractType);

    // Calculate available combinations for the new hands
    return { 
        heroHand: sortedHero, 
        opponentHand: sortedOpp, 
        heroCombos: calculateCombinations(sortedHero, trumpSuit, contractType), 
        oppCombos: calculateCombinations(sortedOpp, trumpSuit, contractType) 
    };
};

// --- CORE LOGIC ENGINE: PURE FUNCTIONS ---

/**
 * Get point value of a card based on game mode.
 */
export const getCardValue = (rank: Rank, isTrump: boolean, contractType: ContractType): number => {
    if (contractType === 'NO_TRUMP') {
        return POINT_VALUES.NO_TRUMP_MODE[rank];
    }
    return isTrump ? POINT_VALUES.TRUMP[rank] : POINT_VALUES.NON_TRUMP[rank];
};

/**
 * Calculate points for specific declarations.
 */
export const calculateDeclarationPoints = (type: Combination['type'], rank: Rank, contractType: ContractType): number => {
    switch (type) {
        case 'TIERCE': return DECLARATION_VALUES.SEQUENCES.TIERCE;
        case 'FIFTY': return DECLARATION_VALUES.SEQUENCES.FIFTY;
        case 'HUNDRED': return DECLARATION_VALUES.SEQUENCES.HUNDRED;
        case 'BELOTE': return contractType === 'TRUMP' ? DECLARATION_VALUES.BELOTE : 0;
        case 'CARRE':
            if (contractType === 'TRUMP') {
                const vals = DECLARATION_VALUES.CARRE.TRUMP;
                if (rank === 'J') return vals.J;
                if (rank === '9') return vals['9'];
                if (rank === 'A') return vals.A;
                return vals.OTHER;
            } else {
                const vals = DECLARATION_VALUES.CARRE.NO_TRUMP;
                if (rank === 'A') return vals.A;
                if (rank === '9') return vals['9'];
                return vals.OTHER;
            }
        default: return 0;
    }
};

// --- Helper Wrappers ---

export const getCardPoints = (card: Card, trumpSuit: Suit | null, contractType: ContractType = 'TRUMP'): number => {
  const isTrump = trumpSuit ? card.suit === trumpSuit : false;
  return getCardValue(card.rank, isTrump, contractType);
};

export const getCardPower = (
    card: Card, 
    trumpSuit: Suit | null, 
    leadSuit: Suit | null, 
    contractType: ContractType = 'TRUMP'
): number => {
  if (contractType === 'NO_TRUMP') {
      const rankIdx = ORDER_NO_TRUMP_MODE.indexOf(card.rank);
      return card.suit === leadSuit ? 100 + rankIdx : rankIdx;
  }

  // TRUMP Mode Logic
  if (!trumpSuit) return 0; // Should ideally not happen in TRUMP mode without a suit
  
  if (card.suit === trumpSuit) {
    return 200 + ORDER_TRUMP.indexOf(card.rank);
  } 
  
  if (card.suit === leadSuit) {
    return 100 + ORDER_NON_TRUMP.indexOf(card.rank);
  } 
  
  return ORDER_NON_TRUMP.indexOf(card.rank);
};

export const getWinningCard = (trick: TrickCard[], trumpSuit: Suit | null, contractType: ContractType = 'TRUMP'): TrickCard | null => {
  if (trick.length === 0) return null;
  
  let winner = trick[0];
  const leadSuit = winner.card.suit;

  // Optimization: Simple loop is faster than reduce for small array (2 items)
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
  // 1. Lead Card Check
  if (currentTrick.length === 0) return true;

  const leadCard = currentTrick[0].card;
  const leadSuit = leadCard.suit;
  const hasLeadSuit = hand.some(c => c.suit === leadSuit);

  // 2. No Trump Mode
  if (contractType === 'NO_TRUMP') {
      return hasLeadSuit ? cardToPlay.suit === leadSuit : true;
  }

  // 3. Trump Mode
  if (!trumpSuit) return true; 

  // A. Follow Suit Rule
  if (hasLeadSuit) {
      if (cardToPlay.suit !== leadSuit) return false; 

      // Sub-Rule: Over-trump (Monter à l'atout)
      if (leadSuit === trumpSuit) {
          const opponentValue = getCardValue(leadCard.rank, true, 'TRUMP');
          const myValue = getCardValue(cardToPlay.rank, true, 'TRUMP');
          
          // Optimization: Check for better trump only once
          const canBeat = hand.some(c => 
              c.suit === trumpSuit && 
              getCardValue(c.rank, true, 'TRUMP') > opponentValue
          );

          // If I can beat, I must beat. If I can't, I can play any lower trump.
          if (canBeat && myValue <= opponentValue) return false;
      }
      return true;
  }

  // B. Void in Lead Suit
  const hasTrump = hand.some(c => c.suit === trumpSuit);
  
  // If I have trump, I MUST play Trump (Cut) unless playing partner (not applicable in 1v1)
  if (hasTrump) {
      return cardToPlay.suit === trumpSuit;
  }

  // C. Discard anything
  return true;
};

// --- Combinations Finder ---

export const calculateCombinations = (hand: Card[], trumpSuit: Suit | null, contractType: ContractType = 'TRUMP'): Combination[] => {
    const rawCombos: Combination[] = [];
    const effectiveTrump = contractType === 'TRUMP' ? trumpSuit : null;

    // 1. CARRE (4 of a kind)
    // Optimization: Group by rank first to avoid multiple filters
    const rankGroups: Record<string, Card[]> = {};
    hand.forEach(c => {
        if (!rankGroups[c.rank]) rankGroups[c.rank] = [];
        rankGroups[c.rank].push(c);
    });

    ['J', '9', 'A', '10', 'K', 'Q'].forEach(rank => {
        const cards = rankGroups[rank];
        if (cards && cards.length === 4) {
            const points = calculateDeclarationPoints('CARRE', rank as Rank, contractType);
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
    SUITS.forEach(suit => {
        // Filter and sort for sequence detection
        const suitCards = hand
            .filter(c => c.suit === suit)
            .sort((a, b) => COMBO_RANK_ORDER.indexOf(b.rank) - COMBO_RANK_ORDER.indexOf(a.rank));
        
        if (suitCards.length < 3) return; // Optimization: Skip if not enough cards

        const usedInSeq = new Set<string>();

        // Check for lengths 5 down to 3
        for (let len = 5; len >= 3; len--) {
            const seqs = findSequences(suitCards, len);
            
            seqs.forEach(seq => {
                if (!seq.some(c => usedInSeq.has(c.id))) {
                    const topCard = seq[0];
                    let type: Combination['type'] = 'TIERCE';
                    if (len === 4) type = 'FIFTY';
                    if (len >= 5) type = 'HUNDRED';
                    
                    rawCombos.push({
                        id: `seq-${suit}-${topCard.rank}-${len}`,
                        type,
                        cards: seq,
                        score: calculateDeclarationPoints(type, topCard.rank, contractType),
                        heightValue: COMBO_RANK_ORDER.indexOf(topCard.rank),
                        rank: topCard.rank,
                        isTrump: suit === effectiveTrump
                    });

                    seq.forEach(c => usedInSeq.add(c.id));
                }
            });
        }
    });

    // 3. BELOTE (King + Queen of Trump)
    if (contractType === 'TRUMP' && trumpSuit) {
        const trumpCards = hand.filter(c => c.suit === trumpSuit);
        const kTrump = trumpCards.find(c => c.rank === 'K');
        const qTrump = trumpCards.find(c => c.rank === 'Q');
        
        if (kTrump && qTrump) {
            rawCombos.push({
                id: 'belote',
                type: 'BELOTE',
                cards: [kTrump, qTrump],
                score: calculateDeclarationPoints('BELOTE', 'K', contractType),
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
            
            if (idxPrev - idxCurr !== 1) {
                isSeq = false;
                break;
            }
            currentSeq.push(curr);
        }
        
        if (isSeq) sequences.push(currentSeq);
    }
    return sequences;
};

const getComboTypePriority = (type: Combination['type']): number => {
    switch (type) {
        case 'CARRE': return 4;
        case 'HUNDRED': return 3;
        case 'FIFTY': return 2;
        case 'TIERCE': return 1;
        default: return 0;
    }
};

// --- Conflict Solver ---
export const solveCombinationConflicts = (allCombos: Combination[]): Combination[] => {
    const belote = allCombos.filter(c => c.type === 'BELOTE');
    const others = allCombos.filter(c => c.type !== 'BELOTE');

    if (others.length === 0) return belote;

    // Sort: Priority > Score > Height
    const sorted = others.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const pA = getComboTypePriority(a.type);
        const pB = getComboTypePriority(b.type);
        if (pA !== pB) return pB - pA;
        return b.heightValue - a.heightValue;
    });

    const selected: Combination[] = [...belote];
    const usedCardIds = new Set<string>();

    for (const combo of sorted) {
        if (!combo.cards.some(c => usedCardIds.has(c.id))) {
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
    firstPlayerId: 'hero' | 'opponent'
): { winner: 'hero' | 'opponent' | 'none', heroPoints: number, oppPoints: number } => {
    
    const hValid = solveCombinationConflicts(heroCombos);
    const oValid = solveCombinationConflicts(oppCombos);

    const hBeloteScore = hValid.filter(c => c.type === 'BELOTE').reduce((s, c) => s + c.score, 0);
    const oBeloteScore = oValid.filter(c => c.type === 'BELOTE').reduce((s, c) => s + c.score, 0);

    const hOthers = hValid.filter(c => c.type !== 'BELOTE');
    const oOthers = oValid.filter(c => c.type !== 'BELOTE');

    if (hOthers.length === 0 && oOthers.length === 0) {
        return { winner: 'none', heroPoints: hBeloteScore, oppPoints: oBeloteScore };
    }

    // Comparison Logic
    const sortForBest = (a: Combination, b: Combination) => {
        const pA = getComboTypePriority(a.type);
        const pB = getComboTypePriority(b.type);
        if (pA !== pB) return pB - pA;
        if (b.score !== a.score) return b.score - a.score;
        return b.heightValue - a.heightValue;
    };

    const hBest = hOthers.sort(sortForBest)[0];
    const oBest = oOthers.sort(sortForBest)[0];

    let mainWinner: 'hero' | 'opponent' | 'none' = 'none';

    if (hBest && !oBest) mainWinner = 'hero';
    else if (!hBest && oBest) mainWinner = 'opponent';
    else if (hBest && oBest) {
        // Compare Types
        const pA = getComboTypePriority(hBest.type);
        const pB = getComboTypePriority(oBest.type);

        if (pA > pB) mainWinner = 'hero';
        else if (pB > pA) mainWinner = 'opponent';
        else {
            // Compare Scores
            if (hBest.score > oBest.score) mainWinner = 'hero';
            else if (oBest.score > hBest.score) mainWinner = 'opponent';
            else {
                // Compare Heights
                if (hBest.heightValue > oBest.heightValue) mainWinner = 'hero';
                else if (oBest.heightValue > hBest.heightValue) mainWinner = 'opponent';
                else {
                    // Trump priority or First Player advantage
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

/**
 * Advanced Hand Analysis for Bidding
 * Calculates a "Bid Score" representing the estimated strength of the hand.
 * 
 * Approximate Benchmarks:
 * - 40-50 pts: Weak but playable
 * - 50-70 pts: Strong bid
 * - 70+ pts: Very strong
 */
export const analyzeHandStrength = (
    hand: Card[], 
    potentialTrump: Suit | null, 
    contractType: ContractType
): number => {
    let strength = 0;
    const isNoTrump = contractType === 'NO_TRUMP';

    // 1. Calculate Combinations (Bonus Points)
    // We use the existing helper to find what declarations we hold
    const combos = calculateCombinations(hand, potentialTrump, contractType);
    
    // Add raw score of non-conflicting combos
    const bestCombos = solveCombinationConflicts(combos);
    strength += bestCombos.reduce((sum, c) => sum + c.score, 0);

    // 2. Card Strength & Control
    const trumps = isNoTrump ? [] : hand.filter(c => c.suit === potentialTrump);
    const nonTrumps = isNoTrump ? hand : hand.filter(c => c.suit !== potentialTrump);

    if (!isNoTrump && potentialTrump) {
        // --- TRUMP SUIT EVALUATION ---
        const hasJack = trumps.some(c => c.rank === 'J');
        const has9 = trumps.some(c => c.rank === '9');
        const hasAce = trumps.some(c => c.rank === 'A');

        // Master Card Bonuses (Control is key)
        if (hasJack) strength += 25; // J is critical control (up from 15)
        if (has9) strength += 15;    // 9 is secondary control (up from 10)
        if (hasAce) strength += 8;

        // Length Bonus: Having many trumps allows drawing out opponent trumps
        if (trumps.length >= 3) strength += 10;
        if (trumps.length >= 4) strength += 20; // Increased
        if (trumps.length >= 5) strength += 30; // Dominant

        // Raw points of trumps
        strength += trumps.reduce((sum, c) => sum + getCardValue(c.rank, true, 'TRUMP'), 0);

        // --- RUFFING POTENTIAL (Voids/Singletons) ---
        // Having a void in a non-trump suit allows cutting with trump immediately.
        if (trumps.length > 0) {
            const suitCounts = { H: 0, D: 0, C: 0, S: 0 };
            hand.forEach(c => suitCounts[c.suit]++);
            
            SUITS.forEach(s => {
                if (s !== potentialTrump) {
                    if (suitCounts[s] === 0) strength += 15; // Void = High control potential
                    else if (suitCounts[s] === 1) strength += 5; // Singleton = Good potential
                }
            });
        }
    } else {
        // --- NO TRUMP EVALUATION ---
        // In No Trump, Aces are kings. 10s are solid.
        strength += hand.reduce((sum, c) => sum + getCardValue(c.rank, false, 'NO_TRUMP'), 0);
        
        // Bonus for "stoppers" (Aces in multiple suits)
        const aces = hand.filter(c => c.rank === 'A').length;
        strength += aces * 15; 
        
        // Long suits are good in No Trump
        const suitCounts = { H: 0, D: 0, C: 0, S: 0 };
        hand.forEach(c => suitCounts[c.suit]++);
        Object.values(suitCounts).forEach(count => {
            if (count >= 4) strength += 10;
        });
    }

    // --- SIDE SUIT EVALUATION (Non-Trump) ---
    // Evaluates the ability to win tricks in non-trump suits
    nonTrumps.forEach(c => {
        if (c.rank === 'A') strength += 12; // Side Ace is a likely trick winner
        
        // Protected 10 check (10 is strong if you have A or K/Q to protect it)
        if (c.rank === '10') {
            const hasProtection = nonTrumps.some(nc => nc.suit === c.suit && (nc.rank === 'A' || nc.rank === 'K'));
            strength += hasProtection ? 8 : 2; // Naked 10 is risky
        }
    });

    return strength;
};

export const getBotBidDecision = (
    hand: Card[],
    candidate: Card,
    bidRound: 1 | 2,
    difficulty: Difficulty,
    isDealer: boolean
): { action: 'take', suit: Suit | null, contract: ContractType } | { action: 'pass' } => {
    
    // Thresholds based on Difficulty
    // Beginner: Optimistic
    // Expert: Conservative/Calculated
    const TRUMP_THRESHOLD = difficulty === 'expert' ? 75 : (difficulty === 'intermediate' ? 65 : 55);
    const NO_TRUMP_THRESHOLD = difficulty === 'expert' ? 80 : (difficulty === 'intermediate' ? 70 : 60);

    // --- ROUND 1: Evaluate taking Candidate ---
    if (bidRound === 1) {
        // Mandatory take for Dealer on Jack (Standard Blot Strategy/Rule often used)
        if (candidate.rank === 'J' && isDealer) {
            return { action: 'take', suit: candidate.suit, contract: 'TRUMP' };
        }

        // Simulation: What does my hand look like IF I take the candidate?
        // Note: In Blot, you effectively have the candidate in your hand logic for bidding
        const simHand = [...hand, candidate]; 
        const score = analyzeHandStrength(simHand, candidate.suit, 'TRUMP');

        // Expert Bias: If I have the Jack of the candidate suit, I'm much more likely to take
        const hasJack = hand.some(c => c.suit === candidate.suit && c.rank === 'J') || candidate.rank === 'J';
        const adjustedThreshold = hasJack ? TRUMP_THRESHOLD - 10 : TRUMP_THRESHOLD;

        if (score >= adjustedThreshold) {
            return { action: 'take', suit: candidate.suit, contract: 'TRUMP' };
        }
        return { action: 'pass' };
    }

    // --- ROUND 2: Evaluate All Suits ---
    if (bidRound === 2) {
        const suits: Suit[] = ['H', 'D', 'C', 'S'];
        let bestOption: { suit: Suit | null, contract: ContractType, score: number } | null = null;

        // Check Trumps
        suits.forEach(s => {
            if (s !== candidate.suit) { // Cannot bid refused suit
                const score = analyzeHandStrength(hand, s, 'TRUMP');
                // Lower threshold slightly for Round 2 as we are desperate/searching
                if (score >= TRUMP_THRESHOLD - 5) {
                    if (!bestOption || score > bestOption.score) {
                        bestOption = { suit: s, contract: 'TRUMP', score };
                    }
                }
            }
        });

        // Check No Trump
        const ntScore = analyzeHandStrength(hand, null, 'NO_TRUMP');
        if (ntScore >= NO_TRUMP_THRESHOLD) {
             if (!bestOption || ntScore > bestOption.score) {
                bestOption = { suit: null, contract: 'NO_TRUMP', score: ntScore };
            }
        }

        if (bestOption) {
             return { action: 'take', suit: bestOption.suit, contract: bestOption.contract };
        }

        // Dealer Force: Must pick best available, even if weak
        if (isDealer) {
             let forcedOption: { suit: Suit | null, contract: ContractType, score: number } = { suit: suits[0] === candidate.suit ? suits[1] : suits[0], contract: 'TRUMP', score: -1 };
             
             // Recalculate max without threshold
             suits.forEach(s => {
                if (s !== candidate.suit) {
                    const score = analyzeHandStrength(hand, s, 'TRUMP');
                    if (score > forcedOption.score) forcedOption = { suit: s, contract: 'TRUMP', score };
                }
             });
             // Also check No Trump for forced pick
             if (ntScore > forcedOption.score) {
                 forcedOption = { suit: null, contract: 'NO_TRUMP', score: ntScore };
             }
             
             return { action: 'take', suit: forcedOption.suit, contract: forcedOption.contract };
        }
    }

    return { action: 'pass' };
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
    
    if (validMoves.length === 0) return hand[0]; // Fallback

    const leadSuit = trick.length > 0 ? trick[0].card.suit : null;
    
    // Sort by power descending to play strongest valid card
    validMoves.sort((a, b) => 
        getCardPower(b, trumpSuit, leadSuit, contractType) - getCardPower(a, trumpSuit, leadSuit, contractType)
    );

    return validMoves[0];
};

export const sortHand = (hand: Card[], trumpSuit: Suit | null = null, contractType: ContractType = 'TRUMP'): Card[] => {
  return [...hand].sort((a, b) => {
    // 1. Trump Priority
    if (contractType === 'TRUMP' && trumpSuit) {
        const aIsTrump = a.suit === trumpSuit;
        const bIsTrump = b.suit === trumpSuit;
        if (aIsTrump && !bIsTrump) return -1; 
        if (!aIsTrump && bIsTrump) return 1;
    }

    // 2. Suit Order
    if (a.suit !== b.suit) {
        return SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit);
    }

    // 3. Rank Order
    return VISUAL_SORT_ORDER.indexOf(a.rank) - VISUAL_SORT_ORDER.indexOf(b.rank);
  });
};

/**
 * INTEGRITY CHECKER
 */
export const verifyRuleset = () => {
    // Re-create temporary deck just for verification
    const deck: Card[] = [];
    SUITS.forEach((suit) => {
        RANKS.forEach((rank) => {
            deck.push({ suit, rank, id: `${rank}${suit}` });
        });
    });

    const trumpTotal = deck.reduce((sum, card) => {
        const isTrump = card.suit === 'H';
        return sum + getCardValue(card.rank, isTrump, 'TRUMP');
    }, 0) + 10;
    
    const ntTotal = deck.reduce((sum, card) => {
        return sum + getCardValue(card.rank, false, 'NO_TRUMP');
    }, 0) + 10;

    console.groupCollapsed('🃏 Ruleset Verification');
    console.log(`TRUMP Total: ${trumpTotal} (162) - ${trumpTotal === 162 ? 'OK' : 'FAIL'}`);
    console.log(`NO_TRUMP Total: ${ntTotal} (162) - ${ntTotal === 162 ? 'OK' : 'FAIL'}`);
    console.groupEnd();
};
