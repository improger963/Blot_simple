import { useCallback, useEffect, useRef } from 'react';
import { Howl } from 'howler';

// Augmented Sound Types including specific variations
export type SoundType = 
    | 'deal' | 'rustle' | 'card_flip' | 'chip_stack'
    | 'place_hero' | 'place_hero_1' | 'place_hero_2' | 'place_hero_3'
    | 'place_opp' | 'place_opp_1' | 'place_opp_2' | 'place_opp_3'
    | 'slide' | 'tick' | 'win_fanfare' | 'turn_start';

// Sprite Map: [Start (ms), Duration (ms)]
// Total generated buffer will be approx 8 seconds to accommodate variations
const SPRITES: Record<string, [number, number]> = {
    deal:         [0, 300],    // 0.0 - 0.3
    rustle:       [500, 200],  // 0.5 - 0.7
    
    // Hero Variations (1.0 - 2.2)
    place_hero_1: [1000, 400], // Standard
    place_hero_2: [1400, 400], // Sharp/Snap
    place_hero_3: [1800, 400], // Dull/Thud
    
    // Opponent Variations (2.2 - 3.4) - Kept in map but we'll use hero sounds logically
    place_opp_1:  [2200, 400],
    place_opp_2:  [2600, 400],
    place_opp_3:  [3000, 400],

    slide:        [3500, 1200],// 3.5 - 4.7
    tick:         [4800, 100], // 4.8 - 4.9
    win_fanfare:  [5000, 2000],// 5.0 - 7.0
    
    card_flip:    [7200, 300], // 7.2 - 7.5
    chip_stack:   [7600, 400], // 7.6 - 8.0

    // Virtual Aliases (Mapped in logic, but defined here for safety)
    place_hero:   [1000, 400], 
    place_opp:    [1000, 400], // Pointing to Hero Default for safety
    turn_start:   [0, 300]
};

// --- Physical Audio Synthesis ---
const generateThemeAssets = async (): Promise<string> => {
    const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!CtxClass) return '';

    const sampleRate = 44100;
    const totalDuration = 8.0; 
    const totalFrames = sampleRate * totalDuration;
    
    // Offline context renders faster than real-time
    const offlineCtx = new OfflineAudioContext(1, totalFrames, sampleRate);
    const buffer = offlineCtx.createBuffer(1, totalFrames, sampleRate);
    const data = buffer.getChannelData(0);

    // Helpers
    const noise = () => Math.random() * 2 - 1;
    
    // 1. DEAL (0.0s - 0.3s): Air friction "Zip"
    const dealStart = 0;
    const dealLen = 0.3 * sampleRate;
    for (let i = 0; i < dealLen; i++) {
        const t = i / sampleRate;
        const env = t < 0.05 ? t / 0.05 : Math.exp(-(t - 0.05) * 15);
        const sweep = Math.sin(t * 150 * Math.PI) * 0.5 + 0.5; 
        data[dealStart + i] = noise() * env * sweep * 0.4;
    }

    // 2. RUSTLE (0.5s - 0.7s): High freq paper friction
    const rustleStart = 0.5 * sampleRate;
    const rustleLen = 0.2 * sampleRate;
    for (let i = 0; i < rustleLen; i++) {
        const t = i / sampleRate;
        const env = Math.sin((t / 0.2) * Math.PI); 
        data[rustleStart + i] = noise() * env * 0.08; 
    }

    // 3 & 4. PLACE VARIATIONS (Hero & Opponent)
    const generatePlace = (startSec: number, type: 'hero'|'opp', variation: 1|2|3) => {
        const start = startSec * sampleRate;
        const len = 0.4 * sampleRate;
        
        for (let i = 0; i < len; i++) {
            const t = i / sampleRate;
            
            // Base Parameters
            let freqStart = type === 'hero' ? 60 : 50;
            let snapVol = type === 'hero' ? 0.6 : 0.2;
            let thudVol = type === 'hero' ? 0.8 : 0.6;
            let decay = type === 'hero' ? 10 : 8;

            // Apply Variation Nuances
            if (variation === 2) { 
                // Sharp/Snap focus (hitting the edge)
                freqStart += 20; 
                snapVol += 0.25;
                thudVol -= 0.1;
                decay += 5; // Faster decay
            } else if (variation === 3) { 
                // Dull/Thud focus (flat drop)
                freqStart -= 15;
                snapVol -= 0.15;
                thudVol += 0.2;
                decay -= 2; // Slower decay
            }

            // Synthesis
            const freq = freqStart * Math.exp(-t * 20);
            const thud = Math.sin(t * freq * Math.PI * 2) * Math.exp(-t * decay);
            
            const snapDecay = variation === 2 ? 100 : 80;
            const snapEnv = t > 0.01 ? Math.exp(-(t - 0.01) * snapDecay) : 0;
            const snap = noise() * snapEnv;

            data[start + i] = (thud * thudVol + snap * snapVol);
        }
    };

    // Generate Hero Variations (1.0, 1.4, 1.8)
    generatePlace(1.0, 'hero', 1);
    generatePlace(1.4, 'hero', 2);
    generatePlace(1.8, 'hero', 3);

    // Generate Opponent Variations (2.2, 2.6, 3.0) - kept for structural integrity
    generatePlace(2.2, 'opp', 1);
    generatePlace(2.6, 'opp', 2);
    generatePlace(3.0, 'opp', 3);

    // 5. SLIDE (3.5s - 4.7s): Long Felt Friction
    const slideStart = 3.5 * sampleRate;
    const slideLen = 1.2 * sampleRate;
    for (let i = 0; i < slideLen; i++) {
        const t = i / sampleRate;
        const env = Math.sin((t / 1.2) * Math.PI);
        const texture = (noise() + noise() + noise() + noise()) * 0.25;
        data[slideStart + i] = texture * env * 0.35;
    }

    // 6. TICK (4.8s - 4.9s): Wood Block
    const tickStart = 4.8 * sampleRate;
    const tickLen = 0.1 * sampleRate;
    for (let i = 0; i < tickLen; i++) {
        const t = i / sampleRate;
        const wood = Math.sin(t * 1000 * Math.PI * 2) * Math.exp(-t * 80);
        const click = noise() * Math.exp(-t * 300);
        data[tickStart + i] = (wood * 0.6 + click * 0.4) * 0.5;
    }

    // 7. WIN (5.0s - 7.0s): Fanfare
    const winStart = 5.0 * sampleRate;
    const winLen = 2.0 * sampleRate;
    for (let i = 0; i < winLen; i++) {
        const t = i / sampleRate;
        const tone = (f: number) => Math.sin(t * f * Math.PI * 2);
        const chord = tone(523.25) + tone(659.25) + tone(783.99) + tone(1046.50) + tone(1174.66);
        const env = t < 0.1 ? t * 10 : Math.exp(-(t - 0.1) * 3);
        data[winStart + i] = chord * 0.15 * env;
    }

    // 8. CARD FLIP (7.2s - 7.5s): Quick snap
    const flipStart = 7.2 * sampleRate;
    const flipLen = 0.3 * sampleRate;
    for (let i = 0; i < flipLen; i++) {
        const t = i / sampleRate;
        const env = t < 0.02 ? t / 0.02 : Math.exp(-(t - 0.02) * 20);
        const texture = (noise() * 0.8 + Math.sin(t * 200) * 0.2); 
        data[flipStart + i] = texture * env * 0.3;
    }

    // 9. CHIP STACK (7.6s - 8.0s): Clinking ceramic
    const chipStart = 7.6 * sampleRate;
    const chipLen = 0.4 * sampleRate;
    for (let i = 0; i < chipLen; i++) {
        const t = i / sampleRate;
        const hit1 = Math.exp(-((t - 0.05) ** 2) * 50000); 
        const hit2 = Math.exp(-((t - 0.15) ** 2) * 30000);
        
        const tone1 = Math.sin(t * 2500 * Math.PI * 2); 
        const tone2 = Math.sin(t * 2200 * Math.PI * 2);

        data[chipStart + i] = (hit1 * tone1 + hit2 * tone2) * 0.4;
    }

    const wavBytes = encodeWAV(data, sampleRate);
    const blob = new Blob([wavBytes], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
};

// Standard WAV Encoder
const encodeWAV = (samples: Float32Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);
    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) view.setUint8(offset + i, string.charCodeAt(i));
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++) {
        const s = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
    }
    return buffer;
};

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
        const init = async () => {
            try {
                const url = await generateThemeAssets();
                if (active && url) {
                    howlRef.current = new Howl({
                        src: [url],
                        format: ['wav'],
                        sprite: SPRITES,
                        volume: 1.0,
                        onload: () => console.log('🔊 ASMR Audio Engine Ready'),
                    });
                }
            } catch (e) {
                console.warn('Audio Init Failed', e);
            }
        };
        init();
        return () => { active = false; howlRef.current?.unload(); };
    }, []);

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