/**
 * EnhancedUI — lightweight UI helpers used by the simulation.
 * Handles floating control positioning, hover effects, and loading screen.
 */
export class EnhancedUI {
    constructor() {
        this.charts = {};
        this.init();
    }

    init() {
        this.initializeAnimations();
        this.positionFloatingUI();
        window.addEventListener('resize', () => this.positionFloatingUI());
        window.addEventListener('scroll', () => this.positionFloatingUI());
    }

    positionFloatingUI() {
        const canvas = document.getElementById('simulationCanvas');
        if (!canvas) return;

        window.requestAnimationFrame(() => {
            const rect = canvas.getBoundingClientRect();
            const outsideOffset = 35;

            const fps = document.getElementById('fpsIndicator');
            const stats = document.getElementById('overviewStats');
            const speed = document.getElementById('speedControlFloating');

            if (fps) {
                fps.style.position = 'fixed';
                fps.style.right = '12px';
                fps.style.top = '8px';
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
                const centerX = rect.left + rect.width / 2;
                speed.style.left = `${centerX}px`;
                speed.style.top = `${rect.bottom + outsideOffset}px`;
                speed.style.transform = 'translateX(-50%)';
            }
        });
    }

    initializeAnimations() {
        const cards = document.querySelectorAll('.control-card');
        cards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
        });

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

    updatePerformanceMetrics(metrics) {
        if (!metrics || typeof metrics !== 'object') return;

        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (!el || value === undefined || value === null) return;
            el.textContent = String(value);
        };

        setText('ov_nodeCount', metrics.nodeCount ?? metrics.nodes ?? metrics.nodeCountTotal ?? null);
        setText('ov_individualCount', metrics.individualCount ?? metrics.individuals ?? null);
        setText('ov_totalFood', metrics.totalFood ?? metrics.currentFood ?? null);
        setText('ov_foodCollected', metrics.foodCollected ?? metrics.totalCollected ?? null);

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

    showLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
            this.animateProgressBar();
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            if (this._loadingInterval) {
                clearInterval(this._loadingInterval);
                this._loadingInterval = null;
            }
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 600);
            }, 500);
        }
    }

    animateProgressBar() {
        const progressBar = document.getElementById('loadingProgressBar');
        if (!progressBar) return;
        let progress = 0;
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
