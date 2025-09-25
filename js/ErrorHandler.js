/**
 * Simple error handler for Colony simulation
 * Prevents crashes and provides basic error reporting
 */
class ErrorHandler {
    constructor() {
        this.errorCount = 0;
        this.setupGlobalHandlers();
    }

    setupGlobalHandlers() {
        // Catch uncaught JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleError('JavaScript Error', event.error || event.message);
        });

        // Catch unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleError('Promise Rejection', event.reason);
            event.preventDefault(); // Prevent default browser console error
        });
    }

    handleError(type, error) {
        this.errorCount++;
        const message = error?.message || error?.toString() || 'Unknown error';
        console.warn(`🚨 ${type}: ${message}`);
        
        // Prevent error spam by limiting frequency
        if (this.errorCount < 10) {
            console.warn('Error details:', error);
        } else if (this.errorCount === 10) {
            console.warn('Too many errors - suppressing further error details');
        }
    }

    /**
     * Safe wrapper for functions that might throw
     */
    safe(fn, fallback = null) {
        try {
            return fn();
        } catch (error) {
            this.handleError('Safe Function', error);
            return fallback;
        }
    }

    /**
     * Safe wrapper for async functions
     */
    async safeAsync(fn, fallback = null) {
        try {
            return await fn();
        } catch (error) {
            this.handleError('Async Function', error);
            return fallback;
        }
    }

    getErrorCount() {
        return this.errorCount;
    }
}

// Create global instance
export const errorHandler = new ErrorHandler();

// Make available in console for debugging
if (typeof window !== 'undefined') {
    window.errorHandler = errorHandler;
}