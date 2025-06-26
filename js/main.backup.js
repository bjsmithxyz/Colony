import { Simulation } from './Simulation.js';

document.addEventListener('DOMContentLoaded', () => {
    try {
        const canvas = document.getElementById('simulationCanvas');
        
        if (!canvas) {
            throw new Error('Canvas element with id "simulationCanvas" not found');
        }

        console.log('Initializing simulation...');
        const simulation = new Simulation(canvas);
        
        // Show loading screen initially
        simulation.showLoadingScreen();
        
        // Hide loading screen after a short delay to allow initialization
        setTimeout(() => {
            simulation.hideLoadingScreen();
            simulation.start();
            console.log('Simulation started successfully');
        }, 1500);
        
        // Make performance testing available globally
        window.testPerformance = (nodeCount = 10) => {
            simulation.performanceStressTest(nodeCount);
        };
        
        console.log('Performance testing available: testPerformance(nodeCount)');
        console.log('Example: testPerformance(15) for 15 nodes stress test');
        
    } catch (error) {
        console.error('Failed to initialize simulation:', error);
        console.error('Stack trace:', error.stack);
        // Hide loading screen on error
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
    }
});