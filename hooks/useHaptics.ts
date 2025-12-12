import { useCallback } from 'react';

type HapticType = 'light' | 'medium' | 'heavy' | 'double' | 'success' | 'error';

export const useHaptics = (enabled: boolean) => {
    const trigger = useCallback((type: HapticType) => {
        // Safety check
        if (!enabled || typeof navigator === 'undefined' || !('vibrate' in navigator)) return;

        try {
            switch(type) {
                case 'light': 
                    // Card Snap
                    navigator.vibrate(10); 
                    break;
                case 'medium': 
                    navigator.vibrate(50); 
                    break;
                case 'heavy': 
                    navigator.vibrate(100); 
                    break;
                case 'double': 
                    // Your Turn
                    navigator.vibrate([50, 30, 50]); 
                    break;
                case 'success': 
                    // Victory Pattern
                    navigator.vibrate([100, 50, 100, 50, 200]); 
                    break;
                case 'error': 
                    // Invalid Move
                    navigator.vibrate(150); 
                    break;
            }
        } catch (e) {
            // Fail silently on devices that don't support it perfectly
            console.warn('Haptics failed', e);
        }
    }, [enabled]);

    return trigger;
};