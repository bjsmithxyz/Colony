import { CONFIG } from './config.js';

/**
 * Small centralized logger that gates messages using CONFIG.DEBUG flags.
 * Usage:
 *  logger.debug('performance', 'message', obj)
 *  logger.info('startup message')
 */
export const logger = {
    debug(flag, ...args) {
        try {
            if (CONFIG && CONFIG.DEBUG && CONFIG.DEBUG[flag]) console.log(...args);
        } catch (e) { /* swallow */ }
    },
    info(...args) {
        try {
            console.log(...args);
        } catch (e) {}
    },
    warn(...args) { console.warn(...args); },
    error(...args) { console.error(...args); }
};
