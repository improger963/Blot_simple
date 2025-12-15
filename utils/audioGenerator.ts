
// Audio Synthesis Logic extracted from Worker and Hook

// Sprite Map: [Start (ms), Duration (ms)]
export const SPRITES: Record<string, [number, number]> = {
    deal:         [0, 300],    // 0.0 - 0.3
    rustle:       [500, 200],  // 0.5 - 0.7
    
    // Hero Variations (1.0 - 2.2)
    place_hero_1: [1000, 400], // Standard
    place_hero_2: [1400, 400], // Sharp/Snap
    place_hero_3: [1800, 400], // Dull/Thud
    
    // Opponent Variations (2.2 - 3.4)
    place_opp_1:  [2200, 400],
    place_opp_2:  [2600, 400],
    place_opp_3:  [3000, 400],

    slide:        [3500, 1200],// 3.5 - 4.7
    tick:         [4800, 100], // 4.8 - 4.9
    win_fanfare:  [5000, 2000],// 5.0 - 7.0
    
    card_flip:    [7200, 300], // 7.2 - 7.5
    chip_stack:   [7600, 400], // 7.6 - 8.0

    // New UI Sounds
    ui_click:     [8100, 100], // 8.1 - 8.2
    ui_error:     [8300, 300], // 8.3 - 8.6

    // Virtual Aliases
    place_hero:   [1000, 400], 
    place_opp:    [1000, 400], 
    turn_start:   [0, 300]
};

const sampleRate = 44100;

const encodeWAV = (samples: Float32Array, sampleRate: number): ArrayBuffer => {
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

export const generateThemeAssets = (): ArrayBuffer => {
    const totalDuration = 9.0; 
    const totalFrames = sampleRate * totalDuration;
    const data = new Float32Array(totalFrames);
    const noise = () => Math.random() * 2 - 1;
    
    // 1. DEAL
    const dealStart = 0;
    const dealLen = 0.3 * sampleRate;
    for (let i = 0; i < dealLen; i++) {
        const t = i / sampleRate;
        const env = t < 0.05 ? t / 0.05 : Math.exp(-(t - 0.05) * 15);
        const sweep = Math.sin(t * 150 * Math.PI) * 0.5 + 0.5; 
        data[dealStart + i] = noise() * env * sweep * 0.4;
    }

    // 2. RUSTLE
    const rustleStart = 0.5 * sampleRate;
    const rustleLen = 0.2 * sampleRate;
    for (let i = 0; i < rustleLen; i++) {
        const t = i / sampleRate;
        const env = Math.sin((t / 0.2) * Math.PI); 
        data[rustleStart + i] = noise() * env * 0.08; 
    }

    // 3 & 4. PLACE VARIATIONS
    const generatePlace = (startSec: number, type: 'hero'|'opp', variation: 1|2|3) => {
        const start = Math.floor(startSec * sampleRate);
        const len = 0.4 * sampleRate;
        for (let i = 0; i < len; i++) {
            const t = i / sampleRate;
            let freqStart = type === 'hero' ? 60 : 50;
            let snapVol = type === 'hero' ? 0.6 : 0.2;
            let thudVol = type === 'hero' ? 0.8 : 0.6;
            let decay = type === 'hero' ? 10 : 8;

            if (variation === 2) { 
                freqStart += 20; snapVol += 0.25; thudVol -= 0.1; decay += 5;
            } else if (variation === 3) { 
                freqStart -= 15; snapVol -= 0.15; thudVol += 0.2; decay -= 2;
            }

            const freq = freqStart * Math.exp(-t * 20);
            const thud = Math.sin(t * freq * Math.PI * 2) * Math.exp(-t * decay);
            const snapDecay = variation === 2 ? 100 : 80;
            const snapEnv = t > 0.01 ? Math.exp(-(t - 0.01) * snapDecay) : 0;
            const snap = noise() * snapEnv;

            const idx = start + i;
            if (idx < totalFrames) data[idx] = (thud * thudVol + snap * snapVol);
        }
    };

    generatePlace(1.0, 'hero', 1);
    generatePlace(1.4, 'hero', 2);
    generatePlace(1.8, 'hero', 3);
    generatePlace(2.2, 'opp', 1);
    generatePlace(2.6, 'opp', 2);
    generatePlace(3.0, 'opp', 3);

    // 5. SLIDE
    const slideStart = 3.5 * sampleRate;
    const slideLen = 1.2 * sampleRate;
    for (let i = 0; i < slideLen; i++) {
        const t = i / sampleRate;
        const env = Math.sin((t / 1.2) * Math.PI);
        const texture = (noise() + noise() + noise() + noise()) * 0.25;
        data[slideStart + i] = texture * env * 0.35;
    }

    // 6. TICK
    const tickStart = 4.8 * sampleRate;
    const tickLen = 0.1 * sampleRate;
    for (let i = 0; i < tickLen; i++) {
        const t = i / sampleRate;
        const wood = Math.sin(t * 1000 * Math.PI * 2) * Math.exp(-t * 80);
        const click = noise() * Math.exp(-t * 300);
        data[tickStart + i] = (wood * 0.6 + click * 0.4) * 0.5;
    }

    // 7. WIN
    const winStart = 5.0 * sampleRate;
    const winLen = 2.0 * sampleRate;
    for (let i = 0; i < winLen; i++) {
        const t = i / sampleRate;
        const tone = (f: number) => Math.sin(t * f * Math.PI * 2);
        const chord = tone(523.25) + tone(659.25) + tone(783.99) + tone(1046.50) + tone(1174.66);
        const env = t < 0.1 ? t * 10 : Math.exp(-(t - 0.1) * 3);
        data[winStart + i] = chord * 0.15 * env;
    }

    // 8. CARD FLIP
    const flipStart = 7.2 * sampleRate;
    const flipLen = 0.3 * sampleRate;
    for (let i = 0; i < flipLen; i++) {
        const t = i / sampleRate;
        const env = t < 0.02 ? t / 0.02 : Math.exp(-(t - 0.02) * 20);
        const texture = (noise() * 0.8 + Math.sin(t * 200) * 0.2); 
        data[flipStart + i] = texture * env * 0.3;
    }

    // 9. CHIP STACK
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

    // 10. UI CLICK
    const clickStart = 8.1 * sampleRate;
    const clickLen = 0.1 * sampleRate;
    for (let i = 0; i < clickLen; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 50);
        data[clickStart + i] = Math.sin(t * 2000 * Math.PI * 2) * env * 0.2;
    }

    // 11. UI ERROR
    const errStart = 8.3 * sampleRate;
    const errLen = 0.3 * sampleRate;
    for (let i = 0; i < errLen; i++) {
        const t = i / sampleRate;
        const freq = 150 - (t * 300); // Descending
        const env = Math.exp(-t * 10);
        const wave = (Math.random() * 2 - 1) * 0.3 + Math.sin(t * freq * Math.PI * 2) * 0.7; 
        data[errStart + i] = wave * env * 0.3;
    }

    return encodeWAV(data, sampleRate);
};
