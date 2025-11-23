/**
 * Barcode Scanner Hook
 * Detects USB barcode scanner input (keyboard wedge mode)
 * Distinguishes from manual typing by speed and Enter key
 */
import { useEffect, useRef, useCallback } from 'react';
import Debug from 'debug';

const debug = Debug('pmpos:barcode-scanner');

/**
 * Hook to detect barcode scanner input
 * @param {Function} onScan - Callback when barcode is scanned
 * @param {Object} options - Configuration options
 * @param {number} options.minLength - Minimum barcode length (default: 3)
 * @param {number} options.maxLength - Maximum barcode length (default: 50)
 * @param {number} options.scanTimeout - Max time between keystrokes in ms (default: 100)
 * @param {boolean} options.enabled - Enable/disable scanner (default: true)
 * @param {RegExp} options.pattern - Optional pattern to validate barcode
 */
export const useBarcodeScanner = (onScan, options = {}) => {
    const {
        minLength = 3,
        maxLength = 50,
        scanTimeout = 100, // 100ms between keystrokes = likely scanner
        enabled = true,
        pattern = null,
        preventDefault = true,
        debug: debugMode = false
    } = options;

    const bufferRef = useRef('');
    const lastKeystrokeRef = useRef(Date.now());
    const timeoutRef = useRef(null);

    const processBarcode = useCallback((code) => {
        if (code.length < minLength || code.length > maxLength) {
            if (debugMode) {
                debug(`⚠️ Barcode length ${code.length} outside range ${minLength}-${maxLength}`);
            }
            return;
        }

        // Validate pattern if provided
        if (pattern && !pattern.test(code)) {
            if (debugMode) {
                debug(`⚠️ Barcode "${code}" doesn't match pattern ${pattern}`);
            }
            return;
        }

        debug(`✅ Barcode scanned: ${code}`);
        onScan?.(code);
    }, [onScan, minLength, maxLength, pattern, debugMode]);

    const resetBuffer = useCallback(() => {
        bufferRef.current = '';
        lastKeystrokeRef.current = Date.now();

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        const handleKeyPress = (e) => {
            const now = Date.now();
            const timeSinceLastKey = now - lastKeystrokeRef.current;

            // If too much time passed, reset buffer (user is typing manually)
            if (timeSinceLastKey > scanTimeout && bufferRef.current.length > 0) {
                if (debugMode) {
                    debug(`⏱️ Timeout (${timeSinceLastKey}ms) - resetting buffer`);
                }
                resetBuffer();
            }

            lastKeystrokeRef.current = now;

            // Handle Enter key - end of barcode
            if (e.key === 'Enter' || e.keyCode === 13) {
                if (bufferRef.current.length > 0) {
                    if (preventDefault) {
                        e.preventDefault();
                        e.stopPropagation();
                    }

                    processBarcode(bufferRef.current);
                    resetBuffer();
                }
                return;
            }

            // Only accept printable characters
            if (e.key.length === 1) {
                // Prevent input if we're in an input field (unless explicitly allowed)
                const target = e.target;
                const isInputField = target.tagName === 'INPUT' ||
                                   target.tagName === 'TEXTAREA' ||
                                   target.isContentEditable;

                // Skip if focused on input (scanner should work globally, but not interfere with inputs)
                if (isInputField && !target.dataset.allowScanner) {
                    resetBuffer();
                    return;
                }

                // Add character to buffer
                bufferRef.current += e.key;

                if (debugMode) {
                    debug(`📝 Buffer: "${bufferRef.current}" (${bufferRef.current.length} chars)`);
                }

                // Prevent default to avoid typing in inputs
                if (preventDefault && timeSinceLastKey < scanTimeout) {
                    e.preventDefault();
                    e.stopPropagation();
                }

                // Auto-reset buffer after maxLength
                if (bufferRef.current.length > maxLength) {
                    debug(`⚠️ Buffer exceeded maxLength ${maxLength} - resetting`);
                    resetBuffer();
                    return;
                }

                // Set timeout to auto-process if scanner doesn't send Enter
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }

                timeoutRef.current = setTimeout(() => {
                    if (bufferRef.current.length >= minLength) {
                        debug(`⏱️ Auto-processing buffer after timeout`);
                        processBarcode(bufferRef.current);
                    }
                    resetBuffer();
                }, scanTimeout * 2);
            }
        };

        // Listen on document (global)
        document.addEventListener('keypress', handleKeyPress, true);
        document.addEventListener('keydown', (e) => {
            // Also listen for Enter on keydown for better compatibility
            if ((e.key === 'Enter' || e.keyCode === 13) && bufferRef.current.length > 0) {
                const target = e.target;
                const isInputField = target.tagName === 'INPUT' ||
                                   target.tagName === 'TEXTAREA' ||
                                   target.isContentEditable;

                if (!isInputField || target.dataset.allowScanner) {
                    if (preventDefault) {
                        e.preventDefault();
                        e.stopPropagation();
                    }
                    processBarcode(bufferRef.current);
                    resetBuffer();
                }
            }
        }, true);

        debug('🔍 Barcode scanner listener attached');

        return () => {
            document.removeEventListener('keypress', handleKeyPress, true);
            resetBuffer();
            debug('🔍 Barcode scanner listener removed');
        };
    }, [enabled, processBarcode, resetBuffer, scanTimeout, preventDefault, minLength, maxLength, debugMode]);

    // Return reset function for manual reset
    return {
        reset: resetBuffer
    };
};

/**
 * Hook variant for React components that need manual control
 */
export const useBarcodeScannerWithState = (onScan, options = {}) => {
    const [isScanning, setIsScanning] = React.useState(false);
    const [lastBarcode, setLastBarcode] = React.useState(null);

    const handleScan = useCallback((code) => {
        setIsScanning(true);
        setLastBarcode(code);
        onScan?.(code);

        // Reset scanning state after 500ms
        setTimeout(() => {
            setIsScanning(false);
        }, 500);
    }, [onScan]);

    const scanner = useBarcodeScanner(handleScan, options);

    return {
        isScanning,
        lastBarcode,
        reset: scanner.reset
    };
};

export default useBarcodeScanner;
