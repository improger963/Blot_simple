import React, { useRef } from 'react';
import { Card as CardType, Suit } from '../types';
import { useSoundManager } from '../hooks/useSoundManager';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { CardFaceArt, SuitIcon } from './CardArt';

interface CardProps {
  card: CardType;
  className?: string;
  faceDown?: boolean;
  isTrump?: boolean;
  trumpSuit?: Suit | null;
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  hoverable?: boolean;
  isHighlighted?: boolean;
  isWinningComboCard?: boolean;
  isPlayable?: boolean;
  isInvalid?: boolean;
  isBelote?: boolean;
}

// --- CARD BACK (Premium Guilloche Pattern) ---
export const CardBack: React.FC<{ className?: string, shadow?: boolean }> = React.memo(({ className = '', shadow = true }) => (
    <div className={`
      relative w-full h-full rounded-xl overflow-hidden 
      bg-[#0f172a] 
      ${shadow ? 'card-paper-shadow' : ''} 
      ${className}
    `}>
      {/* 1. Base Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1e293b] to-[#0f172a]" />

      {/* 2. Complex Geometric Pattern (Guilloche Simulation) */}
      <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `
            repeating-conic-gradient(from 0deg, #d4af37 0deg 2deg, transparent 2deg 10deg),
            radial-gradient(circle at 50% 50%, transparent 30%, #0f172a 31%, transparent 32%)
          `,
          backgroundSize: '100% 100%, 60px 60px'
      }} />
      
      {/* 3. Cross-Hatch Texture */}
      <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000), linear-gradient(45deg, #000 25%, transparent 25%, transparent 75%, #000 75%, #000)`,
          backgroundSize: '4px 4px',
          backgroundPosition: '0 0, 2px 2px'
      }} />

      {/* 4. Border Inlay (Gold Foil) */}
      <div className="absolute inset-2 rounded-lg border-2 border-[#b49028] opacity-70" />
      <div className="absolute inset-1.5 rounded-lg border border-[#f3e5ab] opacity-40" />

      {/* 5. Central Medallion */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
         {/* Outer Ring */}
         <div className="w-16 h-16 rounded-full border border-gold/30 flex items-center justify-center relative bg-[#0f172a] shadow-2xl">
            <div className="absolute inset-0 rounded-full border border-white/5 animate-pulse-slow" />
            
            {/* Diamond Shape */}
            <div className="w-10 h-10 bg-gradient-to-br from-[#0ea5e9] to-[#0369a1] transform rotate-45 flex items-center justify-center shadow-inner border border-white/20">
                 <span className="transform -rotate-45 text-lg filter drop-shadow-md">💎</span>
            </div>
         </div>
         
         <div className="mt-3 flex flex-col items-center">
            <span className="font-serif font-black text-[10px] text-amber-100 tracking-[0.3em] uppercase drop-shadow-sm opacity-90">
                LUCKY
            </span>
            <span className="font-serif font-bold text-[8px] text-[#0ea5e9] tracking-[0.2em] uppercase">
                TON
            </span>
         </div>
      </div>
      
      {/* 6. Surface Gloss */}
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none mix-blend-overlay" />
    </div>
));

// --- 3D PREMIUM CARD ---
export const CardComponent: React.FC<CardProps> = React.memo(({ 
  card, 
  className = '', 
  faceDown = false,
  isTrump = false,
  trumpSuit,
  disabled,
  onClick,
  style,
  hoverable = true,
  isHighlighted = false,
  isWinningComboCard = false,
  isPlayable = false,
  isInvalid = false,
  isBelote = false
}) => {
  const { playSound } = useSoundManager(true);
  const isRed = card.suit === 'H' || card.suit === 'D';
  // Use high contrast colors: Red-600 vs Black
  const suitColor = isRed ? 'text-red-600' : 'text-black';
  const dimClasses = "w-24 h-36 md:w-28 md:h-40 lg:w-32 lg:h-44";

  // --- 3D Tilt Logic ---
  const ref = useRef<HTMLDivElement>(null);
  
  // Motion Values for Tilt
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  // Springs for smooth return
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]), { stiffness: 400, damping: 25 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-15, 15]), { stiffness: 400, damping: 25 });
  
  // Enhanced Foil Lighting
  const glareOpacity = useTransform(x, [-0.5, 0, 0.5], [0, 0.6, 0]);
  const foilPosition = useTransform(x, [-0.5, 0.5], ['0% 0%', '100% 100%']);
  const brightness = useTransform(y, [-0.5, 0.5], [1.05, 0.95]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current || disabled || faceDown) return;
    const rect = ref.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = (mouseX / width) - 0.5;
    const yPct = (mouseY / height) - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  // --- Interaction Sounds ---
  const handleMouseEnter = () => {
      if (hoverable && !disabled && !faceDown) {
          playSound('rustle', { volume: 0.3, pan: 0 });
      }
  };

  const handleMouseDown = () => {
     if (isPlayable && !disabled) {
         playSound('rustle', { volume: 0.6 });
     }
  };

  // --- Render Face Down ---
  if (faceDown) {
      return (
        <div 
            className={`${dimClasses} ${className} gpu-accelerated cursor-default`} 
            onClick={onClick}
            style={style}
        >
            <CardBack />
        </div>
      );
  }

  // --- Visual State Classes ---
  // Using ring shadows instead of borders for smoother rendering
  let stateEffects = '';
  // Removed green ring for playable cards
  if (isTrump) stateEffects = 'ring-2 ring-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]';
  if (isHighlighted) stateEffects = 'ring-4 ring-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.6)] translate-y-[-10px]';
  if (isWinningComboCard) stateEffects = 'ring-4 ring-amber-300 shadow-[0_0_20px_rgba(252,211,77,0.8)]';
  if (isBelote) stateEffects = 'ring-4 ring-yellow-300 animate-pulse shadow-[0_0_25px_rgba(253,224,71,0.8)]';

  const isCourt = ['J', 'Q', 'K'].includes(card.rank);

  return (
    <motion.div
      ref={ref}
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={!disabled ? onClick : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      style={{
          ...style,
          rotateX: disabled ? 0 : rotateX,
          rotateY: disabled ? 0 : rotateY,
          filter: `brightness(${brightness})`, // Subtle light simulation
          transformStyle: "preserve-3d",
          perspective: 1000
      }}
      className={`
        relative ${dimClasses} cursor-pointer
        ${disabled ? 'cursor-default' : ''}
        ${isInvalid ? 'cursor-not-allowed' : ''}
        ${className}
      `}
    >
        {/* --- PHYSICAL CARD BODY --- */}
        <div className={`
            absolute inset-0 rounded-xl overflow-hidden
            bg-[#fdfdfd] /* Pure Premium White */
            card-paper-shadow
            card-texture-linen
            transition-all duration-200
            ${stateEffects}
        `}>
            
            {/* Corner Indicators (Top-Left) */}
            <div className={`absolute top-1 left-1 md:top-1.5 md:left-1.5 flex flex-col items-center leading-none ${suitColor} z-20`}>
                <span className="text-xl md:text-2xl font-serif font-black tracking-tighter">{card.rank}</span>
                <SuitIcon suit={card.suit} className="w-3 h-3 md:w-4 md:h-4 mt-0.5" />
            </div>
            
            {/* Corner Indicators (Bottom-Right) */}
            <div className={`absolute bottom-1 right-1 md:bottom-1.5 md:right-1.5 flex flex-col items-center leading-none transform rotate-180 ${suitColor} z-20`}>
                <span className="text-xl md:text-2xl font-serif font-black tracking-tighter">{card.rank}</span>
                <SuitIcon suit={card.suit} className="w-3 h-3 md:w-4 md:h-4 mt-0.5" />
            </div>

            {/* Main Art Content */}
            <div className="absolute inset-4 md:inset-5 z-10 flex items-center justify-center">
                <CardFaceArt rank={card.rank} suit={card.suit} />
            </div>

            {/* --- PREMIUM LAYERS --- */}
            
            {/* 1. Foil Overlay (Only for Court Cards & Aces) - Dynamic Reactivity */}
            {(isCourt || card.rank === 'A') && (
                <motion.div 
                    className="absolute inset-0 pointer-events-none z-30 mix-blend-color-dodge opacity-50"
                    style={{
                        background: 'linear-gradient(135deg, transparent 35%, rgba(212, 175, 55, 0.4) 45%, rgba(255, 255, 240, 0.6) 50%, rgba(212, 175, 55, 0.4) 55%, transparent 65%)',
                        backgroundSize: '200% 200%',
                        backgroundPosition: foilPosition
                    }}
                />
            )}

            {/* 2. Dynamic Surface Glare (All Cards) */}
            {!disabled && (
                <motion.div 
                    className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent pointer-events-none z-40"
                    style={{ opacity: glareOpacity, mixBlendMode: 'overlay' }}
                />
            )}
            
            {/* 3. Static Vignette / Dirt (Realism) */}
            <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(180,160,120,0.15)] rounded-xl pointer-events-none z-20" />
            
        </div>
    </motion.div>
  );
}, (prev, next) => {
    return (
        prev.card.id === next.card.id &&
        prev.faceDown === next.faceDown &&
        prev.isTrump === next.isTrump &&
        prev.disabled === next.disabled &&
        prev.isHighlighted === next.isHighlighted &&
        prev.isWinningComboCard === next.isWinningComboCard &&
        prev.isPlayable === next.isPlayable &&
        prev.isInvalid === next.isInvalid &&
        prev.isBelote === next.isBelote &&
        prev.className === next.className
    );
});