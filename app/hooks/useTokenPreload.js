/**
 * Hook for monitoring token preload status
 * Shows preload progress to the user
 */

import { useState, useEffect } from 'react';
import { tokenService } from '../services/tokenService';

export const useTokenPreload = () => {
    const [isPreloading, setIsPreloading] = useState(false);
    const [hasPreloadedToken, setHasPreloadedToken] = useState(false);
    const [preloadError, setPreloadError] = useState(null);

    useEffect(() => {
        // Check initial status
        const checkStatus = () => {
            const hasValid = tokenService.hasValidTokens();
            const isLoading = tokenService.isPreloading;
            
            setHasPreloadedToken(hasValid);
            setIsPreloading(isLoading);
        };

        checkStatus();

        // Poll status every second while preloading
        const interval = setInterval(() => {
            const hasValid = tokenService.hasValidTokens();
            const isLoading = tokenService.isPreloading;
            
            setHasPreloadedToken(hasValid);
            setIsPreloading(isLoading);
            
            // Stop polling when done
            if (!isLoading && hasValid) {
                clearInterval(interval);
            }
        }, 1000);

        // Cleanup
        return () => clearInterval(interval);
    }, []);

    return {
        isPreloading,
        hasPreloadedToken,
        preloadError,
        isReady: hasPreloadedToken && !isPreloading
    };
};

export default useTokenPreload;