import { Simulation } from './Simulation.js';
import { logger } from './logger.js';
import { errorHandler } from './ErrorHandler.js';
import { initBgPixels } from './bgPixels.js';
import { EnhancedUI } from './EnhancedUI.js';

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
        window.enhancedUI = new EnhancedUI();
        initBgPixels();

        logger.info('Initialising Colony Simulation...');
        
        window.enhancedUI.showLoadingScreen();
        
        // Get canvas element
        const canvas = document.getElementById('simulationCanvas');
        if (!canvas) {
            throw new Error('Canvas element not found');
        }
        
        // Create and start simulation
        const simulation = new Simulation(canvas);

        // Attach runtime config UI (allows live edits)
        try {
            const { ConfigUI } = await import('./ConfigUI.js');
            // ConfigUI is a named export for compatibility
            // some environments may export default — handle both
            const UIClass = ConfigUI && typeof ConfigUI === 'function' ? ConfigUI : (ConfigUI && ConfigUI.default) || null;
            if (UIClass) {
                // instantiate and attach to window for debugging
                window.configUI = new UIClass(simulation);
            }
        } catch (e) {
            // Fail silently; this UI is optional
            errorHandler.handleError('ConfigUI Error', e);
        }
        
        // Store global reference for debugging
        window.simulation = simulation;
        
        // Start the simulation
        simulation.start();
        
        logger.info('Colony Simulation initialised successfully');

        window.enhancedUI.hideLoadingScreen();
        
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
        
    } catch (error) {
        errorHandler.handleError('Initialisation Error', error);
        
        // Hide loading screen and show error
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }
});
