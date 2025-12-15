

export type Suit = 'H' | 'D' | 'C' | 'S'; // Hearts, Diamonds, Clubs, Spades
export type Rank = '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // Unique identifier for React keys
}

export interface Combination {
  id: string; // Unique ID for selection
  type: 'TIERCE' | 'FIFTY' | 'HUNDRED' | 'CARRE' | 'BELOTE';
  cards: Card[];
  score: number;
  heightValue: number; // For comparing who has the better combo
  rank: Rank; // The defining rank (e.g. 'J' for Carre J, 'A' for Tierce A-K-Q)
  isTrump: boolean;
}

export interface Player {
  id: 'hero' | 'opponent';
  name: string;
  hand: Card[];
  capturedCards: Card[];
  score: number; // Game score (501/1001)
  roundScore: number; // Current round points (tracking)
  combinations: Combination[]; // Calculated possible combos
  declaredCombinations: Combination[]; // Combos the player chose to announce
  hasShownCombinations: boolean; // Whether they have revealed them
  lastAction?: string | null; // For transient UI feedback like "Belote!", "Rebelote!"
}

export type GamePhase = 'DEALING' | 'BIDDING' | 'DISTRIBUTING' | 'PLAYING' | 'SCORING' | 'FINISHED';

export interface TrickCard {
  card: Card;
  playerId: 'hero' | 'opponent';
}

export type ContractStatus = 'NORMAL' | 'DEDANS' | 'CAPOT' | 'LITIGE';
export type ContractType = 'TRUMP' | 'NO_TRUMP';

export interface ScoreBreakdown {
  rawCardPoints: number; // Points from tricks (0-152)
  rawDeclPoints: number; // Points from declarations (before transfer)
  lastTrickBonus: number; // 0 or 10
  beloteBonus: number; // 0 or 20
  
  finalPoints: number; // The actual points added to score
  rawFinalPoints: number; // Store RAW points for display/debug
  
  capturedCardsCount: number; // For tooltip
  declaredCombos: Combination[]; // For tooltip
}

export interface LastRoundData {
    hero: ScoreBreakdown;
    opponent: ScoreBreakdown;
    roundInfo: {
        number: number;
        trump: Suit | null;
        bidTaker: 'hero' | 'opponent';
        status: ContractStatus;
        contractType: ContractType;
        winnerId: 'hero' | 'opponent' | 'none';
    };
    litigePoints?: number; // Points to be carried over
}

export interface RoundResult {
  roundNumber: number;
  heroScore: number;
  opponentScore: number;
  trump: Suit | null;
  winner: 'hero' | 'opponent' | 'draw' | 'none';
  contractStatus: ContractStatus;
  bidTaker: 'hero' | 'opponent';
  contractType: ContractType;
  details?: LastRoundData; // Detailed breakdown for history expansion
}

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

export type Difficulty = 'beginner' | 'intermediate' | 'expert';
export type TieResolution = 'defender_wins' | 'litige' | 'taker_wins';

export interface GameSettings {
  gameSpeed: 'slow' | 'normal' | 'fast';
  soundEnabled: boolean;
  hapticsEnabled: boolean; // New setting
  highContrast: boolean;
  cardSize: 'normal' | 'large';
  animationsEnabled: boolean;
  difficulty: Difficulty;
  targetScore: number; // 51, 101, 201, 501
  tieResolution: TieResolution;
}

export interface GameState {
  phase: GamePhase;
  deck: Card[];
  players: {
    hero: Player;
    opponent: Player;
  };
  candidateCard: Card | null;
  trumpSuit: Suit | null;
  contractType: ContractType; // Added to track if we are in No Trump mode
  currentTrick: TrickCard[];
  lastTrick: TrickCard[] | null; // Previous completed trick
  currentPlayerId: 'hero' | 'opponent';
  dealerId: 'hero' | 'opponent';
  bidTaker: 'hero' | 'opponent' | null; // Who took the bid
  bidRound: 1 | 2; // Round 1: Take candidate? Round 2: Choose any suit
  playerChoice: 'kept' | 'rejected' | null; // Track explicit choice about candidate card
  declarations: string[]; // Log of game events
  gameTarget: number; // e.g. 501
  trickCount: number; // 1-9
  roundHistory: RoundResult[];
  lastRoundBreakdown?: LastRoundData;
  a11yAnnouncement: string; // Text for screen readers
  carriedOverPoints: number; // For Litige
}