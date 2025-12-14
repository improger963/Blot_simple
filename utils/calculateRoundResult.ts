
import { GameState, LastRoundData, ContractStatus } from '../types';
import { getCardPoints } from './gameLogic';

/**
 * Calculates the final scores for a completed round of Simple Blot 24.
 * Handles Capot, Dedans, Declaration validity, and Table Point conversion.
 */
export const calculateRoundResult = (state: GameState): LastRoundData => {
    const { players, bidTaker, trumpSuit, contractType } = state;
    
    // 1. Raw Card Points (Sum of captured tricks)
    const hCardPoints = players.hero.capturedCards.reduce((s, c) => s + getCardPoints(c, trumpSuit, contractType), 0);
    const oCardPoints = players.opponent.capturedCards.reduce((s, c) => s + getCardPoints(c, trumpSuit, contractType), 0);
    
    // 2. Tricks Count (For Capot Detection)
    // In Simple Blot 24, hands are 9 cards, so there are 9 tricks total.
    const hTricksCount = players.hero.capturedCards.length / 2;
    const oTricksCount = players.opponent.capturedCards.length / 2;
    
    const TOTAL_TRICKS = 9;
    const isHeroCapot = hTricksCount === TOTAL_TRICKS;
    const isOppCapot = oTricksCount === TOTAL_TRICKS;

    // 3. Last Trick Bonus (Dix de Der) (+10)
    const lastTrickWinner = state.currentPlayerId; // The player who won the last trick is the current player after resolution
    const hLast = (lastTrickWinner === 'hero') ? 10 : 0;
    const oLast = (lastTrickWinner === 'opponent') ? 10 : 0;

    // 4. Declarations (Only Valid/Shown ones)
    // Note: resolveTrick in App.tsx already handles the "Stronger wins" logic during Trick 1.
    // So 'declaredCombinations' in state are already filtered for validity against each other.
    const hDeclList = players.hero.declaredCombinations;
    const oDeclList = players.opponent.declaredCombinations;
    
    const hDeclScore = hDeclList.reduce((sum, c) => sum + c.score, 0);
    const oDeclScore = oDeclList.reduce((sum, c) => sum + c.score, 0);
    
    // Identify Belote Scores separately (Protected from Dedans loss)
    const hBeloteScore = hDeclList.filter(c => c.type === 'BELOTE').reduce((s,c) => s + c.score, 0);
    const oBeloteScore = oDeclList.filter(c => c.type === 'BELOTE').reduce((s,c) => s + c.score, 0);

    // 5. Raw Total Calculation (Before Contract Check)
    let hRawTotal = hCardPoints + hLast + hDeclScore;
    let oRawTotal = oCardPoints + oLast + oDeclScore;
    
    const TOTAL_GAME_POINTS = 162; // 152 card points + 10 last trick
    
    let status: ContractStatus = 'NORMAL';
    let hFinalRaw = 0;
    let oFinalRaw = 0;
    let winnerId: 'hero' | 'opponent' = 'hero';

    // --- LOGIC BRANCHES ---

    if (isHeroCapot) {
        status = 'CAPOT';
        // Capot Winner gets 212 (162 + 50 Bonus) + Their Declarations
        hFinalRaw = 212 + hDeclScore;
        // Opponent gets 0. 
        // Rule: If opponent takes 0 tricks, their declarations (except Belote) are voided.
        oFinalRaw = oBeloteScore; 
        winnerId = 'hero';
    } else if (isOppCapot) {
        status = 'CAPOT';
        oFinalRaw = 212 + oDeclScore;
        hFinalRaw = hBeloteScore;
        winnerId = 'opponent';
    } else {
        // Normal Play - Check Contract
        if (bidTaker === 'hero') {
            // Hero must score more than Opponent to win contract
            if (hRawTotal > oRawTotal) {
                status = 'NORMAL';
                hFinalRaw = hRawTotal;
                oFinalRaw = oRawTotal;
                winnerId = 'hero';
            } else {
                status = 'DEDANS'; // Contract Failed
                winnerId = 'opponent';
                // Taker loses everything except Belote
                hFinalRaw = hBeloteScore;
                // Opponent gets 162 + Taker's Decl (minus Belote) + Opponent's Decl
                const hDeclPointsTransfer = hDeclScore - hBeloteScore;
                oFinalRaw = TOTAL_GAME_POINTS + hDeclPointsTransfer + oDeclScore;
            }
        } else {
            // Opponent is Taker
            if (oRawTotal > hRawTotal) {
                status = 'NORMAL';
                hFinalRaw = hRawTotal;
                oFinalRaw = oRawTotal;
                winnerId = 'opponent';
            } else {
                status = 'DEDANS'; // Contract Failed
                winnerId = 'hero';
                oFinalRaw = oBeloteScore;
                const oDeclPointsTransfer = oDeclScore - oBeloteScore;
                hFinalRaw = TOTAL_GAME_POINTS + oDeclPointsTransfer + hDeclScore;
            }
        }
    }

    // 6. Point Conversion (Raw -> Table Points)
    // Custom Blot Rounding: "Round Half Down" / Threshold 6
    // e.g. 25 -> 2, 26 -> 3.
    // Formula: floor((score + 4) / 10)
    const convertToTablePoints = (raw: number) => {
        // Special Rule for pure Capot (212) -> 21
        if (raw === 212) return 21;
        
        if (raw === 0) return 0;

        return Math.floor((raw + 4) / 10);
    };

    const hTablePoints = convertToTablePoints(hFinalRaw);
    const oTablePoints = convertToTablePoints(oFinalRaw);

    return {
        hero: {
            rawCardPoints: hCardPoints,
            rawDeclPoints: hDeclScore,
            lastTrickBonus: hLast,
            beloteBonus: hBeloteScore,
            finalPoints: hTablePoints, // Store TABLE points for global score
            rawFinalPoints: hFinalRaw, // Store RAW points for display/debug
            capturedCardsCount: players.hero.capturedCards.length,
            declaredCombos: hDeclList
        },
        opponent: {
            rawCardPoints: oCardPoints,
            rawDeclPoints: oDeclScore,
            lastTrickBonus: oLast,
            beloteBonus: oBeloteScore,
            finalPoints: oTablePoints,
            rawFinalPoints: oFinalRaw,
            capturedCardsCount: players.opponent.capturedCards.length,
            declaredCombos: oDeclList
        },
        roundInfo: {
            number: state.roundHistory.length + 1,
            trump: trumpSuit,
            bidTaker: bidTaker!,
            status,
            contractType,
            winnerId
        }
    };
};
