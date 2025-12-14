
import { useState, useEffect } from 'react';
import { GamePhase } from '../types';

export type DealStage = 'idle' | 'candidate_move' | 'deck_deal' | 'finished';

interface UseDealAnimationProps {
    phase: GamePhase;
    onComplete: () => void;
}

export const useDealAnimation = ({ phase, onComplete }: UseDealAnimationProps) => {
    const [stage, setStage] = useState<DealStage>('idle');

    useEffect(() => {
        if (phase === 'DISTRIBUTING') {
            // Sequence: 
            // 1. Candidate Moves (to Hand or Discard)
            setStage('candidate_move');

            const timer1 = setTimeout(() => {
                // 2. Deal Packets from Deck
                setStage('deck_deal');
            }, 600); // Wait for candidate to settle

            const timer2 = setTimeout(() => {
                // 3. Finish
                setStage('finished');
                onComplete();
            }, 1800); // Allow time for dealing animation

            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
            };
        } else {
            setStage('idle');
        }
    }, [phase, onComplete]);

    return stage;
};
