import { Simulation } from './Simulation.js';
import { logger } from './logger.js';

// Convenience global so calling `resetSimulation(true)` from the console works before init
try {
    window.resetSimulation = function(skipConfirm = true) {
        if (window.simulation && typeof window.simulation.resetSimulation === 'function') {
            return window.simulation.resetSimulation(skipConfirm);
        }
        logger.warn('Simulation not initialised yet');
    };
} catch (e) {}

// Initialize simulation when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        logger.info('Initializing Colony Simulation...');
        
        // Show loading screen
        if (window.enhancedUI) {
            window.enhancedUI.showLoadingScreen();
        }
        
        // Get canvas element
        const canvas = document.getElementById('simulationCanvas');
        if (!canvas) {
            throw new Error('Canvas element not found');
        }
        
        // Create and start simulation
        const simulation = new Simulation(canvas);
        
        // Store global reference for debugging
        window.simulation = simulation;
        
        // Start the simulation
        simulation.start();
        
        logger.info('Colony Simulation initialized successfully');
        
        // Hide loading screen after a short delay
        setTimeout(() => {
            if (window.enhancedUI && typeof window.enhancedUI.hideLoadingScreen === 'function') {
                window.enhancedUI.hideLoadingScreen();
            } else {
                const loadingScreen = document.getElementById('loadingScreen');
                if (loadingScreen) loadingScreen.classList.add('hidden');
            }
        }, 1500);

        // Forcefully remove the loading element after a short grace period as a fallback
        setTimeout(() => {
            const loadingScreen = document.getElementById('loadingScreen');
            if (loadingScreen) {
                loadingScreen.style.display = 'none';
            }
        }, 2500);

        logger.debug('startup', 'Loading screen hide forced (main.js)');
        
        // Wire reset modal actions (non-blocking replace for confirm())
        try {
            const resetModal = document.getElementById('resetModal');
            const confirmBtn = document.getElementById('resetModalConfirm');
            const cancelBtn = document.getElementById('resetModalCancel');
            if (resetModal && confirmBtn && cancelBtn) {
                confirmBtn.addEventListener('click', () => {
                    resetModal.style.display = 'none';
                    try { window.simulation && window.simulation.resetSimulation(true); } catch (e) {}
                });
                cancelBtn.addEventListener('click', () => {
                    resetModal.style.display = 'none';
                });
            }
        } catch (e) {}
        
        // Expose a convenience global for quick console resets: resetSimulation(true)
        try {
            window.resetSimulation = function(skipConfirm = true) {
                if (window.simulation && typeof window.simulation.resetSimulation === 'function') {
                    return window.simulation.resetSimulation(skipConfirm);
                }
                logger.warn('Simulation not initialised yet');
            };
        } catch (e) {}
        
    } catch (error) {
        logger.error('Failed to initialise simulation:', error);
        
        // Hide loading screen and show error
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }
});
