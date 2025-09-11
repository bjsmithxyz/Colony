/**
 * Enhanced UI Management System
 * Handles tabbed interfaces, real-time charts, and animations
 */

class EnhancedUI {
    constructor() {
        this.charts = {};
        // no drag state required (drag/drop removed)
        // Chart.js and advanced charts removed — minimal UI only
        this.init();
    }
    
    init() {
        this.initializeTabs();
        this.initializeDragAndDrop();
        this.initializeAnimations();
        // Position floating UI elements (FPS, overview stats, speed control)
        this.positionFloatingUI();
        // Reposition on resize
        window.addEventListener('resize', () => this.positionFloatingUI());
        window.addEventListener('scroll', () => this.positionFloatingUI());
    }

    positionFloatingUI() {
        const canvas = document.getElementById('simulationCanvas');
        if (!canvas) return;

        // Use requestAnimationFrame to ensure layout measurements are accurate
        window.requestAnimationFrame(() => {
            const rect = canvas.getBoundingClientRect();
            const outsideOffset = 35; // px outside the canvas edge

            const fps = document.getElementById('fpsIndicator');
            const stats = document.getElementById('overviewStats');
            const speed = document.getElementById('speedControlFloating');

            if (fps) {
                // place FPS at the absolute top-right of the viewport
                fps.style.position = 'fixed';
                fps.style.right = `12px`;
                fps.style.top = `8px`;
                fps.style.left = '';
                fps.style.transform = '';
            }

            if (stats) {
                stats.style.position = 'fixed';
                stats.style.left = `${rect.right + outsideOffset}px`;
                stats.style.top = `${Math.max(8, rect.top)}px`;
                stats.style.transform = '';
            }

            if (speed) {
                speed.style.position = 'fixed';
                // center horizontally relative to canvas
                const centerX = rect.left + rect.width / 2;
                speed.style.left = `${centerX}px`;
                speed.style.top = `${rect.bottom + outsideOffset}px`;
                speed.style.transform = 'translateX(-50%)';
            }
        });
    }
    
    /**
    * Initialize tabbed interfaces for statistics
     */
    initializeTabs() {
        // Tabs removed; keep placeholder to avoid errors if classes exist
        
    // Module UI removed
    }
    
    /**
     * Initialize Chart.js charts for real-time statistics
     */
    initializeCharts() {
        // Charts removed
    }
    
    /**
     * Update chart data with new statistics
     */
    updateChartData(stats) {
        // Charts removed — no-op
    }
    
    /**
     * Store chart data for later use when chart becomes available
     */
    storeChartData(stats) {
        // Charts removed — not storing chart data
    }
    
    /**
     * Drag/drop functionality removed — placeholder kept for compatibility
     */
    initializeDragAndDrop() {
        // No-op
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
    const interactiveElements = document.querySelectorAll('.action-btn');
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
     * Get icon by type
     */
    getIcon(type) {
        const icons = {
            speed: '⚡',
            efficiency: '⚙️',
            vision: '👁️',
            communication: '📡',
            specialization: '🎯',
            capacity: '📦',
            trail: '🛤️',
            beacon: '🔍',
            cluster: '🔗',
            color: '🎨',
            priority: '⭐',
            size: '📏'
        };
        return icons[type] || '🔧';
    }
    
    /**
     * Get name by type
     */
    getName(type) {
        const names = {
            speed: 'Speed',
            efficiency: 'Efficiency',
            vision: 'Vision',
            communication: 'Communication',
            specialization: 'Specialization',
            capacity: 'Capacity',
            trail: 'Trail',
            beacon: 'Beacon',
            cluster: 'Cluster',
            color: 'Color',
            priority: 'Priority',
            size: 'Size'
        };
        return names[type] || 'Unknown';
    }
    
    /**
     * Dispatch events for simulation integration (disabled)
     */
    dispatchEvent(eventType, data) {
        // No-op
    }
    
    /**
     * Update performance metrics display
     */
    updatePerformanceMetrics(metrics) {
        // Performance UI removed — do not update DOM here
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
}

// Initialize enhanced UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedUI = new EnhancedUI();
});
