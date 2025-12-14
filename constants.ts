
import { Rank, Suit } from './types';

export const SUITS: Suit[] = ['S', 'D', 'C', 'H']; // Alternating colors: Black, Red, Black, Red
// 24-card variant: 9, 10, J, Q, K, A
export const RANKS: Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];

// Visual Order for COMBINATIONS (Sequences): A > K > Q > J > 10 > 9
// Used for sorting hand to find Tierce/Fifty/Hundred
export const COMBO_RANK_ORDER: Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];

// --- STRICT VBET RULESET SCORING ---

export const TOTAL_POINTS_REFERENCE = 162; // 152 (Cards) + 10 (Last Trick)

// 1. CARD VALUES (Raw Points)
export const POINT_VALUES = {
  TRUMP: {
    'J': 20,
    '9': 14,
    'A': 11,
    '10': 10,
    'K': 4,
    'Q': 3
  },
  NON_TRUMP: {
    'A': 11,
    '10': 10,
    'K': 4,
    'Q': 3,
    'J': 2,
    '9': 0
  },
  NO_TRUMP_MODE: {
    'A': 19,
    '10': 10,
    'K': 4,
    'Q': 3,
    'J': 2,
    '9': 0
  }
};

// 2. DECLARATION VALUES
export const DECLARATION_VALUES = {
  SEQUENCES: {
    TIERCE: 20,
    FIFTY: 50,
    HUNDRED: 100
  },
  BELOTE: 20,
  CARRE: {
    TRUMP: {
      'J': 200,
      '9': 140,
      'A': 110,
      'OTHER': 100 // K, Q, 10
    },
    NO_TRUMP: {
      'A': 190,
      '9': 0,
      'OTHER': 100 // 10, K, Q, J
    }
  }
};

// Hierarchy for comparison (Higher index = stronger)
// Non-Trump: 9, J, Q, K, 10, A
export const ORDER_NON_TRUMP: Rank[] = ['9', 'J', 'Q', 'K', '10', 'A'];

// Trump: Q, K, 10, A, 9, J (Power Order: Lowest to Highest)
export const ORDER_TRUMP: Rank[] = ['Q', 'K', '10', 'A', '9', 'J'];

// No Trump Hierarchy: A > 10 > K > Q > J > 9
// Same as Non-Trump basically, but we define explicitly for clarity
export const ORDER_NO_TRUMP_MODE: Rank[] = ['9', 'J', 'Q', 'K', '10', 'A']; 

// Visual order for sorting hand: 9, 10, J, Q, K, A
export const VISUAL_SORT_ORDER: Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];

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

// Deprecated accessors maintained for backward compatibility with UI components if needed
// but Logic Engine uses POINT_VALUES and DECLARATION_VALUES directly.
export const CARD_VALUES: Record<Rank, { nonTrump: number; trump: number }> = {
  '9': { nonTrump: 0, trump: 14 },
  'J': { nonTrump: 2, trump: 20 },
  'Q': { nonTrump: 3, trump: 3 },
  'K': { nonTrump: 4, trump: 4 },
  '10': { nonTrump: 10, trump: 10 },
  'A': { nonTrump: 11, trump: 11 },
};

export const CARD_VALUES_NO_TRUMP: Record<Rank, number> = POINT_VALUES.NO_TRUMP_MODE;
