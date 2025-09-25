/**
 * EnhancedUI — lightweight UI helpers used by the simulation.
 * Purpose: position floating controls, small animations, and loading screen.
 * Keep minimal and defensive to avoid coupling with feature modules.
 */

class EnhancedUI {
    constructor() {
        this.charts = {};
        // Minimal enhanced UI: animations, floating UI positioning, loading screen
        this.init();
    }
    
    init() {
    // Keep runtime side-effects: animations and layout positioning
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

    // Measure and position within an animation frame for stable layout
        window.requestAnimationFrame(() => {
            const rect = canvas.getBoundingClientRect();
            const outsideOffset = 35; // px offset from canvas edge

            const fps = document.getElementById('fpsIndicator');
            const stats = document.getElementById('overviewStats');
            const speed = document.getElementById('speedControlFloating');

            if (fps) {
                // pin FPS badge to top-right of viewport
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
     * Initialize small UI animations and hover effects
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
     * Update performance / overview metrics in the DOM.
     * Lightweight and defensive: updates only existing elements.
     */
    updatePerformanceMetrics(metrics) {
        if (!metrics || typeof metrics !== 'object') return;

        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (!el || value === undefined || value === null) return;
            el.textContent = String(value);
        };

        // Common overview stats
        setText('ov_nodeCount', metrics.nodeCount ?? metrics.nodes ?? metrics.nodeCountTotal ?? null);
        setText('ov_individualCount', metrics.individualCount ?? metrics.individuals ?? null);
        setText('ov_totalFood', metrics.totalFood ?? metrics.currentFood ?? null);
        setText('ov_foodCollected', metrics.foodCollected ?? metrics.totalCollected ?? null);

        // FPS and memory (if present)
        if (metrics.currentFPS != null) {
            const fpsEl = document.getElementById('fpsIndicator');
            if (fpsEl) fpsEl.textContent = `${Math.round(metrics.currentFPS)} FPS`;
        }

        if (metrics.memoryUsage != null) {
            const fpsEl = document.getElementById('fpsIndicator');
            try {
                const mb = Math.round(metrics.memoryUsage / 1024 / 1024);
                if (fpsEl) fpsEl.title = `Memory: ${mb} MB`;
            } catch (e) {}
        }
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
            // stop progress animation if running
            if (this._loadingInterval) {
                clearInterval(this._loadingInterval);
                this._loadingInterval = null;
            }
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                // ensure it's removed from layout after transition
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 600);
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
        // store interval id so it can be cleared when hiding the screen
        this._loadingInterval = setInterval(() => {
            progress += Math.random() * 15 + 5;
            if (progress >= 100) {
                progress = 100;
                clearInterval(this._loadingInterval);
                this._loadingInterval = null;
            }
            progressBar.style.width = `${progress}%`;
        }, 100);
    }
}

// Initialize enhanced UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.enhancedUI = new EnhancedUI();
});
