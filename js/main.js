import { Simulation } from './Simulation.js';

// Initialize simulation when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('Initializing Colony Simulation...');
        
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
        
        console.log('Colony Simulation initialized successfully');
        
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
        console.log('Loading screen hide forced (main.js)');
        
    } catch (error) {
        console.error('Failed to initialize simulation:', error);
        
        // Hide loading screen and show error
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }
});
