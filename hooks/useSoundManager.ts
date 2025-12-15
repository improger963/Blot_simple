
import { useCallback, useEffect, useRef } from 'react';
import { Howl } from 'howler';
import { generateThemeAssets, SPRITES } from '../utils/audioGenerator';

// Augmented Sound Types including specific variations
export type SoundType = 
    | 'deal' | 'rustle' | 'card_flip' | 'chip_stack'
    | 'place_hero' | 'place_hero_1' | 'place_hero_2' | 'place_hero_3'
    | 'place_opp' | 'place_opp_1' | 'place_opp_2' | 'place_opp_3'
    | 'slide' | 'tick' | 'win_fanfare' | 'turn_start'
    | 'ui_click' | 'ui_error';

interface PlayOptions {
    volume?: number;
    rate?: number;
    pan?: number;
}

export const useSoundManager = (enabled: boolean) => {
    const howlRef = useRef<Howl | null>(null);
    const lastPlayedRef = useRef<Record<string, number>>({});

    useEffect(() => {
        let active = true;

        const initAudio = () => {
            try {
                // Generate on Main Thread using the utility
                const payload = generateThemeAssets();

                if (active) {
                    const blob = new Blob([payload], { type: 'audio/wav' });
                    const url = URL.createObjectURL(blob);
                    
                    howlRef.current = new Howl({
                        src: [url],
                        format: ['wav'],
                        sprite: SPRITES,
                        volume: 1.0,
                        onload: () => console.log('🔊 ASMR Audio Engine Ready (Main Thread)'),
                        onloaderror: (id, err) => console.warn('Audio Load Error', err)
                    });
                }
            } catch (err) {
                console.error('Failed to init audio', err);
            }
        };

        if (enabled && !howlRef.current) {
            // Defer slightly to not block initial render
            setTimeout(initAudio, 100);
        }

        return () => { 
            active = false; 
            howlRef.current?.unload();
        };
    }, [enabled]);

    const playSound = useCallback((type: SoundType, options: PlayOptions = {}) => {
        if (!enabled || !howlRef.current) return;

        // --- Variability Logic ---
        let actualType: string = type;
        
        // Use Hero variations for BOTH Hero and Opponent (same crisp sound requested)
        if (type === 'place_hero' || type === 'place_opp') {
            const variant = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
            actualType = `place_hero_${variant}`;
        }

        // --- Subtle Randomization ---
        const baseRate = options.rate ?? 1.0;
        const randomRate = baseRate + (Math.random() * 0.04 - 0.02); // +/- 2% only

        const baseVol = options.volume ?? 1.0;
        const randomVol = Math.max(0, Math.min(1, baseVol + (Math.random() * 0.1 - 0.05)));

        const now = Date.now();
        const last = lastPlayedRef.current[actualType] || 0;
        if (actualType === 'rustle' && now - last < 80) return;

        const id = howlRef.current.play(actualType);
        
        if (id) {
            howlRef.current.rate(randomRate, id);
            howlRef.current.volume(randomVol, id);
            
            if (options.pan !== undefined) {
                howlRef.current.stereo(options.pan, id);
            }
        }

        lastPlayedRef.current[actualType] = now;
    }, [enabled]);

    return { playSound };
};
