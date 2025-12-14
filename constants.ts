
import { Rank, Suit } from './types';

export const SUITS: Suit[] = ['S', 'D', 'C', 'H']; // Alternating colors: Black, Red, Black, Red
// 24-card variant: 9, 10, J, Q, K, A
export const RANKS: Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];

// Visual Order for COMBINATIONS (Sequences): A > K > Q > J > 10 > 9
// Used for sorting hand to find Tierce/Fifty/Hundred
export const COMBO_RANK_ORDER: Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];

// Raw points map (Rank -> [Non-Trump Value, Trump Value])
// Total Card Points = 152
export const CARD_VALUES: Record<Rank, { nonTrump: number; trump: number }> = {
  '9': { nonTrump: 0, trump: 14 },
  'J': { nonTrump: 2, trump: 20 },
  'Q': { nonTrump: 3, trump: 3 },
  'K': { nonTrump: 4, trump: 4 },
  '10': { nonTrump: 10, trump: 10 },
  'A': { nonTrump: 11, trump: 11 },
};

// Mode B: No Trump Values
// Total Card Points = 152 (19+10+4+3+2+0 = 38 * 4 = 152)
export const CARD_VALUES_NO_TRUMP: Record<Rank, number> = {
  'A': 19, 
  '10': 10,
  'K': 4,
  'Q': 3,
  'J': 2,
  '9': 0
};

// Hierarchy for comparison (Higher index = stronger)
// Non-Trump: 7, 8, 9, J, Q, K, 10, A (24-card: 9, J, Q, K, 10, A)
export const ORDER_NON_TRUMP: Rank[] = ['9', 'J', 'Q', 'K', '10', 'A'];

// Trump: 7, 8, Q, K, 10, A, 9, J (24-card: Q, K, 10, A, 9, J)
export const ORDER_TRUMP: Rank[] = ['Q', 'K', '10', 'A', '9', 'J'];

// No Trump Hierarchy: A > 10 > K > Q > J > 9
export const ORDER_NO_TRUMP_MODE: Rank[] = ['9', 'J', 'Q', 'K', '10', 'A']; 

// Visual order for sorting hand: 9, 10, J, Q, K, A
export const VISUAL_SORT_ORDER: Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];

// Visual order for sorting/sequences (A-K-Q-J-10-9) - Deprecated for hand sort, kept if needed for other logic
export const ORDER_VISUAL: Rank[] = ['A', 'K', 'Q', 'J', '10', '9'];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  H: '♥',
  D: '♦',
  C: '♣',
  S: '♠',
};

// Premium Colors - High Contrast for Accessibility/Distinguishability
export const SUIT_COLORS: Record<Suit, string> = {
  H: 'text-red-600', // Standard Bright Red
  D: 'text-red-600',
  C: 'text-black',    // Pure Black
  S: 'text-black',
};

export const SUIT_NAMES: Record<Suit, string> = {
  H: 'Hearts',
  D: 'Diamonds',
  C: 'Clubs',
  S: 'Spades',
};

export const COMBINATION_SCORES = {
  BELOTE: 20,
  TIERCE: 20,
  FIFTY: 50,
  HUNDRED: 100,
  // Trump Mode Carre
  CARRE_J: 200,
  CARRE_9: 140, 
  CARRE_A: 110, 
  CARRE_OTHERS: 100,
  // No Trump Mode Carre
  CARRE_NT_A: 190,
  CARRE_NT_9: 0,
  CARRE_NT_OTHERS: 100
};
