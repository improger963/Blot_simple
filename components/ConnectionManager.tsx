import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { Z_INDEX } from '../utils/uiLogic';

interface ConnectionManagerProps {
    gameState: GameState;
    onSync: (serverState: GameState) => void;
    children: React.ReactNode;
}

// Simulated Heartbeat Interval (ms)
const HEARTBEAT_INTERVAL = 2000;
const WEAK_CONNECTION_THRESHOLD = 3000;

export const ConnectionManager: React.FC<ConnectionManagerProps> = ({ 
    gameState, 
    onSync,
    children 
}) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [latency, setLatency] = useState<number>(50); // Start with healthy latency
    const [isReconnecting, setIsReconnecting] = useState(false);
    
    // Use refs to access current state in event listeners/intervals without triggering re-renders
    const stateRef = useRef(gameState);
    stateRef.current = gameState;

    // --- 1. Heartbeat System ---
    useEffect(() => {
        let heartbeatTimer: ReturnType<typeof setInterval>;

        const checkHeartbeat = async () => {
            if (!navigator.onLine) return;

            const start = Date.now();
            try {
                // In a real app: await socket.emit('ping');
                // Simulating network jitter for demonstration
                // 10% chance of a "spike" in latency if online
                const simulatedDelay = Math.random() > 0.9 ? 3500 : Math.random() * 100;
                
                // Simulate an async network call
                await new Promise(resolve => setTimeout(resolve, simulatedDelay));
                
                const ping = Date.now() - start;
                setLatency(ping);
            } catch (e) {
                console.warn("Heartbeat failed", e);
            }
        };

        heartbeatTimer = setInterval(checkHeartbeat, HEARTBEAT_INTERVAL);
        return () => clearInterval(heartbeatTimer);
    }, []);

    // --- 2. Connection Listeners ---
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setIsReconnecting(true);
            attemptRecovery();
        };

        const handleOffline = () => {
            setIsOnline(false);
            setLatency(0); // Reset latency display
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // --- 3. Recovery & Diffing Logic ---
    const attemptRecovery = useCallback(async () => {
        try {
            // Attempt to fetch absolute truth from server
            // Using a fake fetch wrapper for the demo
            const serverState = await fetchGameTruth();
            
            if (serverState) {
                // DIFFING: Compare Local vs Server
                const localStr = JSON.stringify(stateRef.current);
                const serverStr = JSON.stringify(serverState);

                if (localStr !== serverStr) {
                    console.log("[Recovery] State mismatch detected. Syncing...");
                    onSync(serverState);
                } else {
                    console.log("[Recovery] State is synchronized.");
                }
            }
        } catch (error) {
            console.error("[Recovery] Failed to fetch state:", error);
        } finally {
            // Add a small delay for UX so the user sees "Reconnecting" briefly
            setTimeout(() => setIsReconnecting(false), 800);
        }
    }, [onSync]);

    // Mock API Call
    const fetchGameTruth = async (): Promise<GameState | null> => {
        // In production: const res = await fetch('/api/game/state'); return res.json();
        // For this local demo, we assume the server state matches local, 
        // or we could simulate a desync here.
        return new Promise((resolve) => {
            setTimeout(() => {
                // resolve(stateRef.current); // Simulate perfect sync
                resolve(null); // Simulate no backend (keeps local state)
            }, 500);
        });
    };

    const isWeakConnection = latency > WEAK_CONNECTION_THRESHOLD && isOnline;

    return (
        <>
            {/* Main Game Layer */}
            {children}

            {/* --- UI: Weak Connection Badge --- */}
            <AnimatePresence>
                {isWeakConnection && (
                    <motion.div 
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -50, opacity: 0 }}
                        className={`fixed top-4 left-1/2 -translate-x-1/2 z-[${Z_INDEX.TOASTS}] bg-amber-500/90 backdrop-blur text-black font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-amber-300`}
                    >
                        <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-xs uppercase tracking-widest">Weak Connection ({latency}ms)</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* --- UI: Full Screen Reconnection Overlay --- */}
            <AnimatePresence>
                {(!isOnline || isReconnecting) && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`fixed inset-0 z-[${Z_INDEX.MODALS_BACKDROP + 100}] bg-black/60 backdrop-blur-md flex flex-col items-center justify-center`}
                    >
                        <div className="relative">
                            {/* Pulse Ring */}
                            <div className="absolute inset-0 bg-indigo-500/30 rounded-full animate-ping"></div>
                            <div className="relative bg-slate-900 border border-white/10 p-8 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
                                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                <h2 className="text-xl font-bold text-white font-serif tracking-wide">
                                    {isReconnecting ? "Synchronizing..." : "Reconnecting..."}
                                </h2>
                                <p className="text-slate-400 text-sm">
                                    {isReconnecting ? "Verifying game state" : "Waiting for network..."}
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};