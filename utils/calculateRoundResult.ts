

import { GameState, LastRoundData, ContractStatus, TieResolution } from '../types';
import { getCardPoints } from './gameLogic';

/**
 * Calculates the final scores for a completed round of Simple Blot 24.
 * Handles Capot, Dedans, Declaration validity, and Table Point conversion.
 */
export const calculateRoundResult = (state: GameState, tieResolution: TieResolution = 'litige'): LastRoundData => {
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
    let winnerId: 'hero' | 'opponent' | 'none' = 'none';
    let litigePoints = 0;

    // --- LOGIC BRANCHES ---

    if (isHeroCapot) {
        status = 'CAPOT';
        hFinalRaw = 212 + hDeclScore;
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
            if (hRawTotal > oRawTotal) {
                // Taker Wins
                status = 'NORMAL';
                hFinalRaw = hRawTotal;
                oFinalRaw = oRawTotal;
                winnerId = 'hero';
            } else if (hRawTotal < oRawTotal) {
                // Dedans (Taker Loses)
                status = 'DEDANS';
                winnerId = 'opponent';
                hFinalRaw = hBeloteScore;
                const hDeclPointsTransfer = hDeclScore - hBeloteScore;
                oFinalRaw = TOTAL_GAME_POINTS + hDeclPointsTransfer + oDeclScore;
            } else {
                // TIE
                if (tieResolution === 'taker_wins') {
                    status = 'NORMAL';
                    hFinalRaw = hRawTotal;
                    oFinalRaw = oRawTotal;
                    winnerId = 'hero';
                } else if (tieResolution === 'defender_wins') {
                    status = 'DEDANS';
                    winnerId = 'opponent';
                    hFinalRaw = hBeloteScore;
                    const hDeclPointsTransfer = hDeclScore - hBeloteScore;
                    oFinalRaw = TOTAL_GAME_POINTS + hDeclPointsTransfer + oDeclScore;
                } else {
                    // LITIGE
                    status = 'LITIGE';
                    winnerId = 'none';
                    // Defender gets their points
                    oFinalRaw = oRawTotal;
                    // Taker gets nothing (except Belote if strictly following standard, or 0 if pure)
                    // Standard: Belote is always kept.
                    hFinalRaw = hBeloteScore;
                    // Litige: The points in dispute = Taker's would-be score (hRawTotal - hBeloteScore).
                    // Or usually defined as: 162 total is split?
                    // In simple calculation: hRawTotal + oRawTotal should roughly be 162 + declarations.
                    // If 81-81: Defender gets 81. Taker gets 0. 81 stored.
                    // So we store `hRawTotal` (excluding belote if it was added? Usually hRawTotal is correct).
                    // Let's store the Taker's raw total (minus Belote which they keep).
                    litigePoints = hRawTotal - hBeloteScore;
                }
            }
        } else {
            // Opponent is Taker
            if (oRawTotal > hRawTotal) {
                status = 'NORMAL';
                hFinalRaw = hRawTotal;
                oFinalRaw = oRawTotal;
                winnerId = 'opponent';
            } else if (oRawTotal < hRawTotal) {
                status = 'DEDANS';
                winnerId = 'hero';
                oFinalRaw = oBeloteScore;
                const oDeclPointsTransfer = oDeclScore - oBeloteScore;
                hFinalRaw = TOTAL_GAME_POINTS + oDeclPointsTransfer + hDeclScore;
            } else {
                // TIE
                if (tieResolution === 'taker_wins') {
                    status = 'NORMAL';
                    hFinalRaw = hRawTotal;
                    oFinalRaw = oRawTotal;
                    winnerId = 'opponent';
                } else if (tieResolution === 'defender_wins') {
                    status = 'DEDANS';
                    winnerId = 'hero';
                    oFinalRaw = oBeloteScore;
                    const oDeclPointsTransfer = oDeclScore - oBeloteScore;
                    hFinalRaw = TOTAL_GAME_POINTS + oDeclPointsTransfer + hDeclScore;
                } else {
                    // LITIGE
                    status = 'LITIGE';
                    winnerId = 'none';
                    hFinalRaw = hRawTotal;
                    oFinalRaw = oBeloteScore;
                    litigePoints = oRawTotal - oBeloteScore;
                }
            }
        }
    }

    // 6. Point Conversion
    const convertToTablePoints = (raw: number) => {
        if (raw === 212) return 21;
        if (raw === 0) return 0;
        return Math.floor((raw + 4) / 10);
    };

    // For Litige points, we also convert them to table points before storing, or store raw?
    // Convention: Scoreboard shows Table Points (501 target). Litige should be stored as raw then converted, or stored as table?
    // Let's store as Table Points to be consistent with finalPoints addition.
    const litigeTablePoints = convertToTablePoints(litigePoints);

    const hTablePoints = convertToTablePoints(hFinalRaw);
    const oTablePoints = convertToTablePoints(oFinalRaw);

    return {
        hero: {
            rawCardPoints: hCardPoints,
            rawDeclPoints: hDeclScore,
            lastTrickBonus: hLast,
            beloteBonus: hBeloteScore,
            finalPoints: hTablePoints,
            rawFinalPoints: hFinalRaw,
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
        },
        litigePoints: litigeTablePoints
    };
};