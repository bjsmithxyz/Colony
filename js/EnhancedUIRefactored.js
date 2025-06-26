/**
 * Enhanced UI Management System - Refactored
 * Coordinates specialized UI managers and provides a unified interface
 */
import { UITabManager } from './UITabManager.js';
import { ChartManager } from './ChartManager.js';
import { ModuleDragDropManager } from './ModuleDragDropManager.js';

class EnhancedUI {
    constructor() {
        this.initializeManagers();
        this.initializeWhenReady();
    }

    initializeManagers() {
        this.tabManager = new UITabManager();
        this.chartManager = new ChartManager();
        this.dragDropManager = new ModuleDragDropManager();
    }
    
    initializeWhenReady() {
        // Wait for Chart.js to load before full initialization
        if (typeof Chart !== 'undefined') {
            this.init();
        } else {
            const checkChart = setInterval(() => {
                if (typeof Chart !== 'undefined') {
                    clearInterval(checkChart);
                    this.init();
                }
            }, 100);
        }
    }
    
    init() {
        this.initializeAnimations();
        console.log('Enhanced UI initialized successfully');
    }

    /**
     * Initialize enhanced animations
     */
    initializeAnimations() {
        // Stagger animation for cards on load
        const cards = document.querySelectorAll('.control-card');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
        });
        
        // Add hover effects to interactive elements
        this.setupHoverEffects();
    }

    setupHoverEffects() {
        const interactiveElements = document.querySelectorAll('.action-btn, .module-item, .stats-tab, .module-tab');
        interactiveElements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                element.style.transform = 'translateY(-1px)';
            });
            
            element.addEventListener('mouseleave', () => {
                element.style.transform = '';
            });
        });
    }

    /**
     * Update chart data - delegates to ChartManager
     */
    updateChartData(stats) {
        this.chartManager.updateChartData(stats);
    }

    /**
     * Store chart data for later use - delegates to ChartManager
     */
    storeChartData(stats) {
        this.chartManager.storeChartData(stats);
    }

    /**
     * Update performance metrics - delegates to ChartManager
     */
    updatePerformanceMetrics(metrics) {
        this.chartManager.updatePerformanceMetrics(metrics);
    }

    /**
     * Show loading screen with enhanced animations
     */
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
            this.animateProgressBar();
        }
    }
    
    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
            }, 500);
        }
    }
    
    /**
     * Animate loading progress bar
     */
    animateProgressBar() {
        const progressBar = document.getElementById('loadingProgressBar');
        if (!progressBar) return;
        
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15 + 5;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }
            progressBar.style.width = `${progress}%`;
        }, 100);
    }

    /**
     * Check if module list needs placeholder - delegates to DragDropManager
     */
    checkModuleListPlaceholder() {
        this.dragDropManager.checkModuleListPlaceholder();
    }

    /**
     * Add module to active list - delegates to DragDropManager
     */
    addModuleToActive(moduleType) {
        this.dragDropManager.addModuleToActive(moduleType);
    }

    /**
     * Get module icon by type - delegates to DragDropManager
     */
    getModuleIcon(type) {
        return this.dragDropManager.getModuleIcon(type);
    }

    /**
     * Get module name by type - delegates to DragDropManager
     */
    getModuleName(type) {
        return this.dragDropManager.getModuleName(type);
    }

    /**
     * Dispatch module events - delegates to DragDropManager
     */
    dispatchModuleEvent(eventType, data) {
        this.dragDropManager.dispatchModuleEvent(eventType, data);
    }
}

// Initialize enhanced UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedUI = new EnhancedUI();
});
