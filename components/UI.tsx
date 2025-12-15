

import React, { useEffect, useState, memo, useRef, useCallback } from 'react';
import { GameSettings, Player, RoundResult, TieResolution, EnabledCombinations } from '../types';
import { SUIT_SYMBOLS } from '../constants';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Z_INDEX } from '../utils/uiLogic';
import { useSoundManager } from '../hooks/useSoundManager';
import { ActionBubble, BubbleVariant, BubblePosition } from './ActionBubble';

// --- ICONS (Pure Components) ---
export const Icons = {
    Success: memo(() => <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>),
    Warning: memo(() => <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>),
    Error: memo(() => <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    Info: memo(() => <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    Close: memo(() => <svg className="w-5 h-5 text-slate-400 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>),
    Coin: memo(() => <svg className="w-4 h-4 text-gold" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" /></svg>),
    Trophy: memo(() => <svg className="w-3.5 h-3.5 text-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    ChevronDown: memo(() => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>),
    Settings: memo(() => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>),
    Menu: memo(() => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>),
    History: memo(() => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>),
    Chat: memo(() => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>)
};

export const A11yAnnouncer: React.FC<{ message: string }> = memo(({ message }) => (
    <div className="sr-only" role="status" aria-live="polite">{message}</div>
));

// --- UTILS ---
export const CountUp: React.FC<{ value: number, duration?: number, className?: string }> = memo(({ value, duration = 800, className }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let startTime: number;
        let startValue = displayValue;
        let animationFrameId: number;

        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            setDisplayValue(Math.floor(startValue + progress * (value - startValue)));
            if (progress < 1) {
                animationFrameId = window.requestAnimationFrame(step);
            }
        };
        animationFrameId = window.requestAnimationFrame(step);
        return () => window.cancelAnimationFrame(animationFrameId);
    }, [value, duration]); 

    return <span className={className}>{displayValue}</span>;
});

// --- CONFETTI ---
export const Confetti = memo(() => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        let animationFrameId: number;
        let particles: any[] = [];
        const colors = ['#d4af37', '#f3e5ab', '#e11d48', '#ffffff'];
        
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        for (let i=0; i<150; i++) {
            particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height - canvas.height,
                vx: Math.random() * 4 - 2,
                vy: Math.random() * 5 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                size: Math.random() * 8 + 2
            });
        }

        const animate = () => {
            ctx.clearRect(0,0,canvas.width,canvas.height);
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                if (p.y > canvas.height) p.y = -20;
                ctx.fillStyle = p.color;
                ctx.fillRect(p.x, p.y, p.size, p.size);
            });
            animationFrameId = requestAnimationFrame(animate);
        };
        animate();
        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);
    return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-[1000]" />;
});

export const WinParticles: React.FC<{ active: boolean, color: string }> = memo(({ active, color }) => {
    if (!active) return null;
    return (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
            {[...Array(12)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                    animate={{
                        x: (Math.random() - 0.5) * 150,
                        y: (Math.random() - 0.5) * 150,
                        scale: 0,
                        opacity: 0
                    }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                    style={{ backgroundColor: color }}
                />
            ))}
        </div>
    );
});

// --- COIN EXPLOSION ---
export const CoinExplosion: React.FC<{ winner: 'hero' | 'opponent' }> = memo(({ winner }) => {
    const isHero = winner === 'hero';
    const targetX = isHero ? 15 : 85; 
    const targetY = isHero ? 85 : 15; 
    return (
        <div className="fixed inset-0 pointer-events-none z-[9000] overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
                <CoinParticle key={i} targetX={targetX} targetY={targetY} />
            ))}
        </div>
    );
});

const CoinParticle: React.FC<{ targetX: number, targetY: number }> = memo(({ targetX, targetY }) => {
    const [windowSize, setWindowSize] = useState({ w: window.innerWidth, h: window.innerHeight });

    useEffect(() => {
        const handleResize = () => setWindowSize({ w: window.innerWidth, h: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const endXPx = (targetX / 100) * windowSize.w;
    const endYPx = (targetY / 100) * windowSize.h;
    const startXPx = 0.5 * windowSize.w;
    const startYPx = 0.5 * windowSize.h;
    const spread = 80;
    
    return (
        <motion.div
            initial={{ x: startXPx, y: startYPx, scale: 0, opacity: 1 }}
            animate={{ 
                x: endXPx + (Math.random() - 0.5) * spread,
                y: endYPx + (Math.random() - 0.5) * spread,
                scale: [0, 1.2, 0.8],
                opacity: [1, 1, 0],
                rotate: Math.random() * 720
            }}
            transition={{ duration: 0.8 + Math.random() * 0.5, ease: "backOut" }}
            className="absolute w-6 h-6 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-full border-2 border-yellow-200 shadow-[0_0_10px_rgba(234,179,8,0.6)] flex items-center justify-center text-[10px] font-black text-yellow-900"
        >
            $
        </motion.div>
    );
});

export const ScreenFX: React.FC<{ type: 'SHAKE' | 'FLASH' | null }> = memo(({ type }) => {
    if (!type) return null;
    return (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
             {type === 'SHAKE' && (
                 <motion.div 
                    className="absolute inset-0 border-[20px] border-red-500/30"
                    animate={{ x: [-10, 10, -8, 8, -5, 5, 0], y: [5, -5, 4, -4, 0] }}
                    transition={{ duration: 0.5 }}
                 />
             )}
             {type === 'FLASH' && (
                 <motion.div 
                    className="absolute inset-0 bg-white"
                    initial={{ opacity: 0.8 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                 />
             )}
        </div>
    )
});

export const FloatingFeedback: React.FC<{ text: string, color?: string, onComplete: () => void }> = memo(({ text, color = '#fbbf24', onComplete }) => {
    return (
        <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.5 }}
            animate={{ y: -60, opacity: 1, scale: 1.2 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onAnimationComplete={onComplete}
            transition={{ type: "spring", stiffness: 200, damping: 10 }}
            className="absolute z-[200] font-black text-2xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] whitespace-nowrap pointer-events-none"
            style={{ color: color, textShadow: '0px 0px 10px rgba(0,0,0,0.5)' }}
        >
            {text}
        </motion.div>
    );
});

// --- PLAYER AVATAR ---

export interface PlayerAvatarProps {
    player: Player;
    position: 'top' | 'bottom';
    isActive: boolean;
    isDealer: boolean;
    onViewDeclarations?: () => void;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = memo(({ player, position, isActive, isDealer, onViewDeclarations }) => {
    const { playSound } = useSoundManager(true);
    const TOTAL_TIME = 30;
    const [timer, setTimer] = useState(TOTAL_TIME);
    const [lastScore, setLastScore] = useState(player.roundScore);
    const [scoreFeedback, setScoreFeedback] = useState<string | null>(null);
    const [actionText, setActionText] = useState<string | null>(null);
    const [actionVariant, setActionVariant] = useState<BubbleVariant>('standard');
    const [showParticles, setShowParticles] = useState(false);
    const lastActionRef = useRef<string | null | undefined>(null);
    
    useEffect(() => {
        if (!isActive) { 
            setTimer(TOTAL_TIME); 
            return; 
        }
        
        let lastTime = Date.now();
        let animationFrameId: number;

        const loop = () => {
            const now = Date.now();
            const delta = (now - lastTime) / 1000;
            lastTime = now;

            setTimer(prev => {
                const next = Math.max(0, prev - delta);
                if (next <= 10 && Math.ceil(next) < Math.ceil(prev)) {
                     const isUrgent = next <= 5;
                     const rate = isUrgent ? 1.0 + (5 - next) * 0.1 : 1.0; 
                     playSound('tick', { rate, volume: isUrgent ? 0.6 : 0.3 });
                }
                return next;
            });

            if (timer > 0) {
                animationFrameId = requestAnimationFrame(loop);
            }
        };

        animationFrameId = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(animationFrameId);
    }, [isActive, playSound]);

    useEffect(() => {
        if (player.roundScore !== lastScore) {
            const diff = player.roundScore - lastScore;
            if (diff > 0) {
                setScoreFeedback(`+${diff}`);
                setShowParticles(true);
                const t = setTimeout(() => setShowParticles(false), 1000);
                setLastScore(player.roundScore);
                return () => clearTimeout(t);
            }
            setLastScore(player.roundScore);
        }
    }, [player.roundScore, lastScore]);

    useEffect(() => {
        if (player.lastAction && player.lastAction !== lastActionRef.current) {
            const txt = player.lastAction;
            setActionText(txt);
            const lower = txt.toLowerCase();
            let variant: BubbleVariant = 'standard';
            if (lower.includes('belote') || lower.includes('rebelote')) variant = 'gold';
            else if (lower.includes('tierce') || lower.includes('fifty') || lower.includes('hundred')) variant = 'blue';
            else if (lower.includes('carre')) variant = 'purple';
            else if (lower.includes('pass')) variant = 'gray';
            
            setActionVariant(variant);
            const t = setTimeout(() => setActionText(null), 2500);
            lastActionRef.current = player.lastAction;
            return () => clearTimeout(t);
        }
    }, [player.lastAction]);

    const isHero = position === 'bottom';
    const isRight = !isHero; 
    const hasDeclarations = player.declaredCombinations && player.declaredCombinations.some(c => c.type !== 'BELOTE');
    const isUrgent = timer < 10;
    const radius = 42;
    const strokeWidth = 5;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (timer / TOTAL_TIME) * circumference;
    
    const positionClasses = isHero 
        ? 'bottom-[230px] left-1 md:bottom-12 md:left-12 origin-bottom-left' 
        : 'top-[60px] right-1 md:top-12 md:right-12 origin-top-right';

    const bubblePos: BubblePosition = isHero ? 'top-right' : 'bottom-left';

    return (
        <motion.div 
            className={`absolute transition-all duration-300 scale-75 md:scale-100 ${positionClasses}`}
            style={{ zIndex: Z_INDEX.PLAYER_AVATARS }}
            initial={{ x: isHero ? -100 : 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 20 }}
        >
            <div className="relative flex items-center justify-center">
                <WinParticles active={showParticles} color={isHero ? '#34d399' : '#f43f5e'} />
                <AnimatePresence>
                    {scoreFeedback && <FloatingFeedback text={scoreFeedback} color={isHero ? '#34d399' : '#f43f5e'} onComplete={() => setScoreFeedback(null)} />}
                </AnimatePresence>
                
                <ActionBubble text={actionText || ''} isVisible={!!actionText} variant={actionVariant} position={bubblePos} />

                <div className="relative w-28 h-28 flex items-center justify-center">
                    {isActive && isUrgent && <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />}
                    
                    <svg className="w-full h-full -rotate-90 drop-shadow-2xl overflow-visible">
                        <defs>
                            <linearGradient id="heroTimer" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient>
                            <linearGradient id="oppTimer" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24" /><stop offset="100%" stopColor="#f43f5e" /></linearGradient>
                            <linearGradient id="urgentTimer" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#ef4444" /><stop offset="100%" stopColor="#b91c1c" /></linearGradient>
                        </defs>
                        <circle cx="50%" cy="50%" r={radius} fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth={strokeWidth} />
                        {isActive && (
                            <motion.circle 
                                cx="50%" cy="50%" r={radius} fill="none" 
                                stroke={isUrgent ? 'url(#urgentTimer)' : (isHero ? 'url(#heroTimer)' : 'url(#oppTimer)')}
                                strokeWidth={strokeWidth} strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }} animate={{ strokeDashoffset: offset }}
                                strokeLinecap="round" style={{ filter: isUrgent ? 'drop-shadow(0 0 6px #ef4444)' : (isHero ? 'drop-shadow(0 0 4px #22d3ee)' : 'drop-shadow(0 0 4px #fbbf24)') }}
                            />
                        )}
                    </svg>

                    <AnimatePresence>
                        {isActive && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className={`absolute -bottom-2 font-mono font-bold text-xs px-2 py-0.5 rounded-full border shadow-lg z-20 ${isUrgent ? 'bg-red-600 border-red-400 text-white animate-pulse' : 'bg-slate-900 border-slate-700 text-slate-300'}`}>
                                {Math.ceil(timer)}s
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className={`absolute inset-3 rounded-full overflow-hidden border-4 ${isActive ? (isHero ? 'border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.6)]' : 'border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.6)]') : 'border-slate-800'} bg-slate-900 shadow-inner flex items-center justify-center transition-all duration-300`}>
                         <div className={`absolute inset-0 bg-gradient-to-br ${isHero ? 'from-blue-600 to-indigo-900' : 'from-rose-600 to-red-900'} opacity-80`} />
                         <span className="relative text-3xl font-black text-white/90 drop-shadow-md z-10">{isHero ? '😎' : '🤖'}</span>
                         <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                    </div>

                    {hasDeclarations && (
                        <motion.button 
                            initial={{ scale: 0 }} animate={{ scale: 1 }} whileHover={{ scale: 1.1 }} onClick={onViewDeclarations}
                            className={`absolute -top-1 ${isRight ? '-left-1' : '-right-1'} w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-full border-2 border-white/50 shadow-lg flex items-center justify-center z-30 cursor-pointer hover:shadow-indigo-500/50`}
                        >
                            <span className="text-base">🎴</span>
                        </motion.button>
                    )}
                </div>

                <div className={`absolute top-1/2 -translate-y-1/2 space-y-1.5 w-max ${isHero ? 'left-full ml-4' : 'right-full mr-4 flex flex-col items-end'}`}>
                    <div className={`flex gap-1 mb-1 ${isRight ? 'justify-end' : ''}`}>
                        {isDealer && <span className="bg-amber-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded uppercase shadow-sm border border-amber-300">Dealer</span>}
                        {isActive && <motion.span initial={{ opacity: 0, x: isRight ? 5 : -5 }} animate={{ opacity: 1, x: 0 }} className={`text-white text-[9px] font-black px-1.5 py-0.5 rounded uppercase shadow-sm border border-white/20 ${isHero ? 'bg-emerald-600' : 'bg-rose-600'}`}>{isHero ? 'Your Turn' : 'Thinking...'}</motion.span>}
                    </div>
                    
                    <motion.div className="glass-panel px-3 py-1.5 rounded-full inline-flex items-center gap-2 border border-white/10" whileHover={{ scale: 1.05 }}>
                        <span className="text-xs font-bold text-slate-200 tracking-wide truncate max-w-[100px]">{player.name}</span>
                    </motion.div>
                    
                    <div className={`flex items-center gap-2 ${isRight ? 'justify-end' : ''}`}>
                         <motion.div className="bg-slate-900/80 border border-white/10 px-2 py-1 rounded-md flex items-center gap-1.5 shadow-sm" title="Total Game Score">
                            <Icons.Trophy />
                            <CountUp value={player.score} className="text-xs font-bold text-gold font-mono" />
                         </motion.div>

                         <motion.div className="bg-gradient-to-r from-amber-500 to-amber-600 px-2 py-1 rounded-md shadow-lg flex items-center gap-1.5" title="Current Round Score">
                            <Icons.Coin />
                            <CountUp value={player.roundScore} className="text-xs font-bold text-white font-mono" />
                         </motion.div>
                    </div>

                    {player.capturedCards.length > 0 && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`bg-slate-700/80 px-2 py-0.5 rounded-full flex items-center gap-1 mt-0.5 ${isRight ? 'self-end' : 'self-start'}`}>
                            <span className="text-[10px]">🃏</span>
                            <span className="text-[10px] font-bold text-white">{player.capturedCards.length}</span>
                        </motion.div>
                    )}
                </div>
            </div>
        </motion.div>
    );
});

export const ScoreBoard: React.FC<{ heroScore: number; oppScore: number; target: number; round: number }> = memo(({ heroScore, oppScore, target, round }) => {
    return (
        <div className="absolute top-4 left-4 md:left-8 hidden md:flex flex-col gap-2" style={{ zIndex: Z_INDEX.SCOREBOARD }}>
             <div className="glass-panel p-4 rounded-2xl border border-white/10 shadow-xl min-w-[200px]">
                <div className="flex justify-between items-center mb-3 border-b border-white/10 pb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Round {round}</span>
                    <span className="text-xs font-bold text-gold uppercase tracking-widest">Goal: {target}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                        <span className="text-sm font-bold text-white">You</span>
                    </div>
                    <CountUp value={heroScore} className="text-lg font-mono font-black text-emerald-400" />
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                        <span className="text-sm font-bold text-slate-400">Opponent</span>
                    </div>
                    <CountUp value={oppScore} className="text-lg font-mono font-black text-rose-400" />
                </div>
             </div>
        </div>
    );
});

export const MobileScorePill: React.FC<{ round: number; target: number }> = memo(({ round, target }) => {
    return (
        <div className="glass-panel px-4 py-1.5 rounded-full border border-white/10 shadow-lg flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase">RD {round}</span>
            <div className="w-px h-3 bg-white/20"></div>
            <span className="text-[10px] font-bold text-gold uppercase">Target {target}</span>
        </div>
    );
});

interface SheetProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    direction?: 'bottom' | 'top';
}

const Sheet: React.FC<SheetProps> = ({ isOpen, onClose, children, direction = 'bottom' }) => {
    const isBottom = direction === 'bottom';
    const variants: Variants = {
        hidden: { y: isBottom ? '100%' : '-100%', opacity: 0 },
        visible: { y: 0, opacity: 1, transition: { type: 'spring', damping: 25, stiffness: 300 } },
        exit: { y: isBottom ? '100%' : '-100%', opacity: 0 }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        onClick={onClose} 
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
                        style={{ zIndex: Z_INDEX.MODALS_BACKDROP }} 
                    />
                    <motion.div
                        variants={variants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={`fixed ${isBottom ? 'bottom-0 left-0 right-0 rounded-t-3xl' : 'top-0 left-0 right-0 rounded-b-3xl'} bg-slate-900 border-${isBottom ? 't' : 'b'} border-white/10 shadow-2xl p-6 max-h-[80vh] overflow-y-auto custom-scrollbar`}
                        style={{ zIndex: Z_INDEX.MODALS_CONTENT }}
                    >
                        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-white/20 rounded-full" />
                        <div className="mt-4">
                            {children}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export const HistoryPanel: React.FC<{ isOpen: boolean, onClose: () => void, history: RoundResult[] }> = memo(({ isOpen, onClose, history }) => {
    return (
        <Sheet isOpen={isOpen} onClose={onClose}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Icons.History /> Match History
                </h2>
                <button onClick={onClose} className="p-2 bg-white/10 rounded-full"><Icons.Close /></button>
            </div>
            
            {history.length === 0 ? (
                <div className="text-center text-slate-500 py-10">No rounds played yet.</div>
            ) : (
                <div className="space-y-4">
                    {history.map((round) => (
                        <div key={round.roundNumber} className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-slate-400 uppercase">Round {round.roundNumber}</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${round.winner === 'hero' ? 'bg-emerald-500/20 text-emerald-400' : (round.winner === 'opponent' ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-500/20 text-slate-400')}`}>
                                    {round.winner === 'hero' ? 'You Won' : (round.winner === 'opponent' ? 'Opp Won' : 'Draw')}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-lg font-black text-white">{round.heroScore}</span>
                                    <span className="text-[10px] text-slate-500">YOU</span>
                                </div>
                                <div className="flex flex-col items-center px-4">
                                    <span className="text-xs text-slate-500 mb-1">{round.contractType === 'NO_TRUMP' ? 'NO TRUMP' : (round.trump ? SUIT_SYMBOLS[round.trump] : '-')}</span>
                                    <div className="h-px w-12 bg-white/10"></div>
                                    <span className="text-[10px] text-gold mt-1">{round.contractStatus}</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-lg font-black text-white">{round.opponentScore}</span>
                                    <span className="text-[10px] text-slate-500">OPP</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Sheet>
    );
});

export const ChatSheet: React.FC<{ isOpen: boolean, onClose: () => void, onEmote: (msg: string) => void }> = memo(({ isOpen, onClose, onEmote }) => {
    const emotes = ['👋', '😎', '🤔', '😂', '😭', '😡', 'Good Game', 'Well Played', 'Oops', 'Hurry!', 'Thinking...', 'Thanks'];
    
    return (
        <Sheet isOpen={isOpen} onClose={onClose}>
            <h2 className="text-lg font-bold text-white mb-4">Chat & Emotes</h2>
            <div className="grid grid-cols-3 gap-3">
                {emotes.map(emote => (
                    <button 
                        key={emote} 
                        onClick={() => { onEmote(emote); onClose(); }}
                        className="p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-center font-bold text-slate-200 transition-colors active:scale-95"
                    >
                        {emote}
                    </button>
                ))}
            </div>
        </Sheet>
    );
});

export const SettingsModal: React.FC<{ settings: GameSettings, onUpdate: (s: GameSettings) => void, onClose: () => void }> = memo(({ settings, onUpdate, onClose }) => {
    const Toggle = ({ label, value, onChange }: { label: string, value: boolean, onChange: (v: boolean) => void }) => (
        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
            <span className="text-sm font-bold text-slate-300">{label}</span>
            <button 
                onClick={() => onChange(!value)}
                className={`w-12 h-6 rounded-full relative transition-colors ${value ? 'bg-emerald-500' : 'bg-slate-600'}`}
            >
                <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${value ? 'left-7' : 'left-1'}`} />
            </button>
        </div>
    );

    const ModeSelect = ({ label, value, options, onChange }: { label: string, value: string, options: string[], onChange: (v: any) => void }) => (
         <div className="flex flex-col gap-2 p-3 bg-white/5 rounded-lg">
            <span className="text-sm font-bold text-slate-300">{label}</span>
            <div className="flex bg-black/20 rounded-lg p-1">
                {options.map(opt => (
                    <button
                        key={opt}
                        onClick={() => onChange(opt)}
                        className={`flex-1 py-1.5 text-xs font-bold uppercase rounded-md transition-all ${value === opt ? 'bg-emerald-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
         </div>
    );

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
             <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
             <div className="relative bg-slate-900 w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 shadow-2xl flex flex-col custom-scrollbar">
                <div className="p-6 border-b border-white/10 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2"><Icons.Settings /> Settings</h2>
                    <button onClick={onClose} className="p-2 bg-white/10 rounded-full hover:bg-white/20"><Icons.Close /></button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Audio & Haptics */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Experience</h3>
                        <Toggle label="Sound Effects" value={settings.soundEnabled} onChange={(v) => onUpdate({...settings, soundEnabled: v})} />
                        <Toggle label="Haptics (Vibration)" value={settings.hapticsEnabled} onChange={(v) => onUpdate({...settings, hapticsEnabled: v})} />
                        <Toggle label="Animations" value={settings.animationsEnabled} onChange={(v) => onUpdate({...settings, animationsEnabled: v})} />
                    </div>

                    {/* Game Options */}
                    <div className="space-y-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Game Rules</h3>
                        <ModeSelect label="Difficulty" value={settings.difficulty} options={['beginner', 'intermediate', 'expert']} onChange={(v) => onUpdate({...settings, difficulty: v})} />
                        <ModeSelect label="Game Speed" value={settings.gameSpeed} options={['slow', 'normal', 'fast']} onChange={(v) => onUpdate({...settings, gameSpeed: v})} />
                        <Toggle label="Enable No Trump Contract" value={settings.enableNoTrump} onChange={(v) => onUpdate({...settings, enableNoTrump: v})} />
                    </div>

                    {/* Combinations */}
                    <div className="space-y-2">
                         <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Allowed Combinations</h3>
                         <div className="grid grid-cols-2 gap-2">
                             {(['TIERCE', 'FIFTY', 'HUNDRED', 'CARRE', 'BELOTE'] as const).map(combo => (
                                 <label key={combo} className={`flex items-center gap-2 p-2 rounded border cursor-pointer ${settings.enabledCombinations[combo] ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-white/5 bg-white/5'}`}>
                                     <input 
                                        type="checkbox" 
                                        checked={settings.enabledCombinations[combo]} 
                                        onChange={(e) => onUpdate({...settings, enabledCombinations: {...settings.enabledCombinations, [combo]: e.target.checked}})}
                                        className="accent-emerald-500"
                                     />
                                     <span className="text-xs font-bold text-slate-300">{combo}</span>
                                 </label>
                             ))}
                         </div>
                    </div>
                </div>

                <div className="p-4 border-t border-white/10 bg-black/20 text-center">
                    <p className="text-[10px] text-slate-600">Lucky TON Blot v1.2</p>
                </div>
             </div>
        </div>
    );
});
