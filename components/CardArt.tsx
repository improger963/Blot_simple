import React from 'react';
import { Suit, Rank } from '../types';

// --- ATLAS DECK COLOR PALETTE ---
const ATLAS = {
    RED: '#d92b2c',    // The specific scarlet red
    BLUE: '#1d5e96',   // The specific azure blue
    GOLD: '#eec947',   // The satin gold
    BLACK: '#111111',
    SKIN: '#f7d8c0',   // Pale skin
    WHITE: '#ffffff',
    HAIR_DARK: '#2d2d2d',
    HAIR_LIGHT: '#8c8c8c'
};

// --- STANDARD SHAPES (Refined for Atlas look) ---
const PATHS = {
    H: "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z",
    D: "M12 2.5L22 12L12 21.5L2 12L12 2.5z", // Slightly elongated Diamond
    C: "M12,2c-2.76,0-5,2.24-5,5c0,1.64,0.8,3.09,2,3.99C8.38,11.6,8,12.26,8,13c0,2.76,2.24,5,5,5c2.76,0,5-2.24,5-5 c0-0.74-0.38-1.4-1-1.99c1.2-0.9,2-2.35,2-3.99C19,4.24,16.76,2,14,2C13.31,2,12.63,2.15,12,2.43C11.37,2.15,10.69,2,10,2H12z M12,18 c-0.66,0-1.29-0.08-1.89-0.22l-0.57,3.69C9.37,22.56,10.58,23,12,23s2.63-0.44,2.46-1.54l-0.57-3.69C13.29,17.92,12.66,18,12,18z",
    S: "M12,2C8,2,1,8,1,13.5c0,2.5,2,4.5,4.5,4.5c1.4,0,2.68-0.6,3.58-1.52c-0.19,1.65-0.62,3.22-1.28,4.72 C7.54,21.78,8.15,22,9,22h6c0.85,0,1.46-0.22,1.2-0.8c-0.66-1.5-1.09-3.07-1.28-4.72c0.9,0.92,2.18,1.52,3.58,1.52 c2.5,0,4.5-2,4.5-4.5C23,8,16,2,12,2z"
};

export const SuitIcon: React.FC<{ suit: Suit, className?: string, style?: React.CSSProperties }> = ({ suit, className, style }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={`${className} drop-shadow-sm`} style={style}>
        <path d={suit === 'C' ? "M19.5,12.5c0-2.3-1.6-4.2-3.7-4.8c0.7-0.9,1.2-2.1,1.2-3.3c0-2.8-2.2-5-5-5c-2.8,0-5,2.2-5,5c0,1.2,0.4,2.3,1.2,3.3 c-2.1,0.6-3.7,2.5-3.7,4.8c0,2.5,1.8,4.5,4.2,4.9L8,22h8l-0.7-4.6C17.7,17,19.5,15,19.5,12.5z" : PATHS[suit]} />
    </svg>
);

// --- ATLAS COURT CHARACTERS ---

const AtlasKing: React.FC<{ suit: Suit }> = ({ suit }) => {
    // Atlas Kings: Blue tunics, Red capes, Gold crowns.
    // Spades/Clubs: More severe. Hearts/Diamonds: Lighter.
    const isRed = suit === 'H' || suit === 'D';
    
    return (
        <g>
            {/* Cape Background */}
            <path d="M10,100 L10,60 Q50,45 90,60 L90,100 Z" fill={ATLAS.RED} stroke={ATLAS.BLACK} strokeWidth="0.5" />
            
            {/* Tunic */}
            <path d="M20,100 L20,70 Q50,85 80,70 L80,100 Z" fill={ATLAS.BLUE} stroke={ATLAS.BLACK} strokeWidth="0.5" />
            <path d="M50,70 L50,100" stroke={ATLAS.BLACK} strokeWidth="0.5" strokeDasharray="2,2" />
            {/* Cross/Details on Tunic */}
            <path d="M35,85 L45,85 M40,80 L40,90" stroke={ATLAS.GOLD} strokeWidth="2" />
            <path d="M55,85 L65,85 M60,80 L60,90" stroke={ATLAS.GOLD} strokeWidth="2" />

            {/* Collar / Ermine */}
            <path d="M15,60 Q50,75 85,60 Q95,70 95,80 Q50,90 5,80 Q5,70 15,60 Z" fill={ATLAS.WHITE} stroke={ATLAS.BLACK} strokeWidth="0.5" />
            {/* Ermine Spots */}
            <g fill={ATLAS.BLACK}>
                <path d="M25,70 l2,4 l-4,-2 z" />
                <path d="M75,70 l2,4 l-4,-2 z" />
                <path d="M50,75 l2,4 l-4,-2 z" />
            </g>

            {/* Face & Beard */}
            <g transform="translate(50, 42)">
                {/* Beard */}
                <path d="M-22,-5 Q-25,15 -10,25 Q0,30 10,25 Q25,15 22,-5" fill={isRed ? ATLAS.HAIR_LIGHT : ATLAS.HAIR_DARK} stroke={ATLAS.BLACK} strokeWidth="0.5"/>
                {/* Face Shape */}
                <ellipse cx="0" cy="-5" rx="18" ry="20" fill={ATLAS.SKIN} stroke={ATLAS.BLACK} strokeWidth="0.5" />
                {/* Moustache */}
                <path d="M-10,5 Q-5,0 0,5 Q5,0 10,5" fill="none" stroke={isRed ? ATLAS.HAIR_LIGHT : ATLAS.HAIR_DARK} strokeWidth="2" />
                {/* Features */}
                <path d="M-6,0 Q-3,-2 0,0 Q3,-2 6,0" fill="none" stroke={ATLAS.BLACK} strokeWidth="0.5" /> {/* Eyes */}
                <path d="M0,0 L-2,8 L2,8 Z" fill={ATLAS.SKIN} stroke={ATLAS.BLACK} strokeWidth="0.2" /> {/* Nose */}
            </g>

            {/* Crown */}
            <g transform="translate(50, 20)">
                <path d="M-22,15 L-22,0 L-12,-10 L0,-5 L12,-10 L22,0 L22,15 Z" fill={ATLAS.GOLD} stroke={ATLAS.BLACK} strokeWidth="0.5" />
                <path d="M0,-5 L0,-15 M-12,-10 L-15,-20 M12,-10 L15,-20" stroke={ATLAS.GOLD} strokeWidth="1" />
                <circle cx="0" cy="-15" r="2" fill={ATLAS.RED} />
                {/* Crown Cap */}
                <path d="M-18,15 Q0,5 18,15" fill={ATLAS.RED} />
            </g>

            {/* Scepter (Hand holding) */}
            <g transform="translate(15, 60) rotate(-10)">
                <rect x="-2" y="-30" width="4" height="60" fill={ATLAS.GOLD} stroke={ATLAS.BLACK} strokeWidth="0.5" />
                <circle cx="0" cy="-30" r="5" fill={ATLAS.GOLD} stroke={ATLAS.BLACK} strokeWidth="0.5" />
            </g>
        </g>
    );
};

const AtlasQueen: React.FC<{ suit: Suit }> = ({ suit }) => {
    // Atlas Queens: Headscarves, Blue/Red dresses.
    const isRed = suit === 'H' || suit === 'D';
    
    return (
        <g>
            {/* Dress Background */}
            <path d="M10,100 L10,60 Q50,55 90,60 L90,100 Z" fill={isRed ? ATLAS.BLUE : ATLAS.RED} stroke={ATLAS.BLACK} strokeWidth="0.5" />
            
            {/* Bodice */}
            <path d="M25,100 L25,75 Q50,85 75,75 L75,100 Z" fill={isRed ? ATLAS.RED : ATLAS.BLUE} stroke={ATLAS.BLACK} strokeWidth="0.5" />
            
            {/* Sash/Necklace */}
            <path d="M30,75 Q50,90 70,75" fill="none" stroke={ATLAS.GOLD} strokeWidth="3" />
            <circle cx="50" cy="82" r="3" fill={ATLAS.GOLD} stroke={ATLAS.BLACK} strokeWidth="0.5" />

            {/* Face */}
            <g transform="translate(50, 45)">
                 <ellipse cx="0" cy="0" rx="16" ry="18" fill={ATLAS.SKIN} stroke={ATLAS.BLACK} strokeWidth="0.5" />
                 {/* Eyes */}
                 <path d="M-6,-2 Q-3,-4 0,-2 Q3,-4 6,-2" fill="none" stroke={ATLAS.BLACK} strokeWidth="0.5" />
                 {/* Mouth */}
                 <path d="M-3,8 Q0,10 3,8" fill="none" stroke={ATLAS.RED} strokeWidth="1" />
                 {/* Nose */}
                 <path d="M-1,0 L-2,5 L1,5 Z" fill={ATLAS.SKIN} stroke={ATLAS.BLACK} strokeWidth="0.1" />
            </g>

            {/* Veil / Headscarf */}
            <path d="M28,45 Q20,20 50,15 Q80,20 72,45 Q85,60 85,75 L15,75 Q15,60 28,45" fill={ATLAS.WHITE} stroke={ATLAS.BLACK} strokeWidth="0.5" />
            
            {/* Crown/Tiara inside veil */}
            <path d="M35,25 Q50,15 65,25" fill="none" stroke={ATLAS.GOLD} strokeWidth="3" />

            {/* Flower/Fan */}
            <g transform="translate(80, 70)">
                <circle cx="0" cy="0" r="5" fill={ATLAS.RED} stroke={ATLAS.BLACK} strokeWidth="0.5" />
                <path d="M0,0 L-5,10 L5,10 Z" fill="green" />
            </g>
        </g>
    );
};

const AtlasJack: React.FC<{ suit: Suit }> = ({ suit }) => {
    // Atlas Jacks: Tunics, Hats (Berets), Youthful.
    const isRed = suit === 'H' || suit === 'D';
    
    return (
        <g>
            {/* Tunic Background */}
            <path d="M10,100 L10,60 Q50,50 90,60 L90,100 Z" fill={isRed ? ATLAS.BLUE : ATLAS.RED} stroke={ATLAS.BLACK} strokeWidth="0.5" />
            
            {/* Collar */}
            <path d="M25,60 Q50,75 75,60 L75,55 Q50,65 25,55 Z" fill={ATLAS.WHITE} stroke={ATLAS.BLACK} strokeWidth="0.5" />

            {/* Chest Detail / Sash */}
            <path d="M10,100 L40,60" stroke={ATLAS.GOLD} strokeWidth="4" opacity="0.8" />
            
            {/* Face */}
            <g transform="translate(50, 40)">
                 <ellipse cx="0" cy="0" rx="17" ry="20" fill={ATLAS.SKIN} stroke={ATLAS.BLACK} strokeWidth="0.5" />
                 {/* Hair */}
                 <path d="M-17,-5 Q-15,10 -10,15 L-17,15 Z" fill={ATLAS.HAIR_DARK} />
                 <path d="M17,-5 Q15,10 10,15 L17,15 Z" fill={ATLAS.HAIR_DARK} />
                 
                 {/* Eyes */}
                 <path d="M-6,-2 Q-3,-4 0,-2 Q3,-4 6,-2" fill="none" stroke={ATLAS.BLACK} strokeWidth="0.5" />
                 {/* Moustache (Small) */}
                 <path d="M-5,8 Q0,6 5,8" fill="none" stroke={ATLAS.BLACK} strokeWidth="0.2" />
            </g>

            {/* Hat */}
            <g transform="translate(50, 18)">
                {/* Brim */}
                <ellipse cx="0" cy="5" rx="25" ry="8" fill={ATLAS.BLACK} stroke="#333" strokeWidth="0.5" />
                {/* Feather */}
                <path d="M15,5 Q35,-5 25,-20" fill="none" stroke={isRed ? ATLAS.RED : ATLAS.BLUE} strokeWidth="3" />
                {/* Cap top */}
                <path d="M-20,5 Q-25,-10 0,-15 Q25,-10 20,5" fill={ATLAS.BLACK} />
            </g>
            
             {/* Weapon/Item */}
             <g transform="translate(15, 60)">
                <path d="M0,0 L0,40" stroke="silver" strokeWidth="4" />
                <path d="M-5,5 L5,5" stroke="silver" strokeWidth="2" />
            </g>
        </g>
    );
};

const AceArt: React.FC<{ suit: Suit }> = ({ suit }) => {
    const isRed = suit === 'H' || suit === 'D';
    const color = isRed ? ATLAS.RED : ATLAS.BLACK;

    return (
        <div className="w-full h-full flex flex-col items-center justify-center relative">
            {/* Ornate Background Frame for Ace */}
            <div className="absolute inset-4 opacity-10">
                 <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor" style={{ color: color }}>
                    <path d="M50,0 Q100,0 100,50 Q100,100 50,100 Q0,100 0,50 Q0,0 50,0 M50,10 Q10,10 10,50 Q10,90 50,90 Q90,90 90,50 Q90,10 50,10" fillRule="evenodd" />
                    <path d="M50,20 L60,40 L80,50 L60,60 L50,80 L40,60 L20,50 L40,40 Z" />
                 </svg>
            </div>

            {/* Central Suit */}
            <SuitIcon suit={suit} className="w-32 h-32 z-10 drop-shadow-lg" style={{ color: color }} />
            
            {/* Satin Text */}
            <div className="absolute top-[65%] left-1/2 -translate-x-1/2">
                <svg width="80" height="20" viewBox="0 0 100 20">
                    <path id="curve" d="M10,15 Q50,5 90,15" fill="none" />
                    <text width="100" fill={color} fontSize="8" fontWeight="bold" letterSpacing="1" textAnchor="middle">
                        <textPath xlinkHref="#curve" startOffset="50%">
                            ATLAS
                        </textPath>
                    </text>
                </svg>
            </div>
        </div>
    );
};

// --- MAIN CARD COMPONENT ---
export const CardFaceArt: React.FC<{ rank: Rank, suit: Suit }> = React.memo(({ rank, suit }) => {
    const isCourt = ['J', 'Q', 'K'].includes(rank);
    const isAce = rank === 'A';
    const color = (suit === 'H' || suit === 'D') ? ATLAS.RED : ATLAS.BLACK;

    // --- COURT CARD LAYOUT ---
    if (isCourt) {
        return (
            <div className="w-full h-full p-2.5 flex flex-col items-center justify-center">
                {/* Atlas Frame: Rounded Rect with single line border */}
                <div className="w-full h-full border border-black/30 rounded-xl relative overflow-hidden bg-white">
                    {/* Top Half */}
                    <div className="absolute top-0 left-0 right-0 h-[50%] overflow-hidden bg-blue-50/10">
                         {rank === 'K' && <AtlasKing suit={suit} />}
                         {rank === 'Q' && <AtlasQueen suit={suit} />}
                         {rank === 'J' && <AtlasJack suit={suit} />}
                    </div>
                    
                    {/* Divider Line (Satin Style: often diagonal or simple line) */}
                    <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-black/20 z-10" />
                    
                    {/* Bottom Half (Mirrored) */}
                    <div className="absolute bottom-0 left-0 right-0 h-[50%] overflow-hidden transform rotate-180 bg-blue-50/10">
                         {rank === 'K' && <AtlasKing suit={suit} />}
                         {rank === 'Q' && <AtlasQueen suit={suit} />}
                         {rank === 'J' && <AtlasJack suit={suit} />}
                    </div>
                    
                    {/* Suit Indicator near middle right/left for court? No, standard Atlas has them in corners */}
                </div>
            </div>
        );
    }

    // --- ACE LAYOUT ---
    if (isAce) {
        return <AceArt suit={suit} />;
    }

    // --- NUMBER LAYOUTS ---
    return (
        <div className="relative w-full h-full" style={{ color }}>
            {/* Column 1 */}
            <Pip suit={suit} x={30} y={20} />
            <Pip suit={suit} x={30} y={40} />
            <Pip suit={suit} x={30} y={60} inverted />
            <Pip suit={suit} x={30} y={80} inverted />

            {/* Column 2 */}
            <Pip suit={suit} x={70} y={20} />
            <Pip suit={suit} x={70} y={40} />
            <Pip suit={suit} x={70} y={60} inverted />
            <Pip suit={suit} x={70} y={80} inverted />

            {/* Middle Column */}
            {rank === '9' && (
                <Pip suit={suit} x={50} y={50} /> // Center pip for 9
            )}
            
            {rank === '10' && (
                <>
                    <Pip suit={suit} x={50} y={30} />
                    <Pip suit={suit} x={50} y={70} inverted />
                </>
            )}
        </div>
    );
});

// --- PIP LAYOUTS HELPER ---
const Pip = ({ suit, x, y, scale = 1, inverted = false }: { suit: Suit, x: number, y: number, scale?: number, inverted?: boolean }) => (
    <div 
        className="absolute w-6 h-6 flex items-center justify-center transform"
        style={{ 
            left: `${x}%`, 
            top: `${y}%`, 
            transform: `translate(-50%, -50%) scale(${scale}) ${inverted ? 'rotate(180deg)' : ''}` 
        }}
    >
        <SuitIcon suit={suit} className="w-full h-full" />
    </div>
);
