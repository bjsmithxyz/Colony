/**
 * Enhanced UI Management System
 * Handles tabbed interfaces, real-time charts, and animations
 */

class EnhancedUI {
    constructor() {
        this.charts = {};
    // no drag state required (drag/drop removed)
        this.chartData = {
            population: [],
            food: [],
            timestamps: []
        };
        this.maxDataPoints = 50;
        
        // Wait for Chart.js to load before initializing
        if (typeof Chart !== 'undefined') {
            this.init();
        } else {
            // Wait for Chart.js to load
            const checkChart = setInterval(() => {
                if (typeof Chart !== 'undefined') {
                    clearInterval(checkChart);
                    this.init();
                }
            }, 100);
        }
    }
    
    init() {
        this.initializeTabs();
        this.initializeDragAndDrop();
        this.initializeAnimations();
        // Chart initialization is delayed until the charts tab is first opened
    }
    
    /**
    * Initialize tabbed interfaces for statistics
     */
    initializeTabs() {
        // Statistics tabs
        const statsTabs = document.querySelectorAll('.stats-tab');
        const statsContents = document.querySelectorAll('.stats-tab-content');
        
        statsTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Update active tab
                statsTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active content
                statsContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === targetTab) {
                        content.classList.add('active');
                    }
                });
                
                // Initialize chart if charts tab is selected
                if (targetTab === 'charts' && (!this.charts.population || typeof Chart === 'undefined')) {
                    // Delay chart initialization to ensure DOM is ready
                    setTimeout(() => {
                        this.initializeCharts();
                    }, 100);
                }
            });
        });
        
    // Module UI removed
    }
    
    /**
     * Initialize Chart.js charts for real-time statistics
     */
    initializeCharts() {
        const canvas = document.getElementById('populationChart');
        if (!canvas || this.charts.population || typeof Chart === 'undefined') return;
        
        const ctx = canvas.getContext('2d');
        
        try {
            this.charts.population = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: this.chartData.timestamps,
                    datasets: [
                        {
                            label: 'Population',
                            data: this.chartData.population,
                            borderColor: '#4facfe',
                            backgroundColor: 'rgba(79, 172, 254, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3,
                            pointRadius: 2,
                            pointHoverRadius: 4
                        },
                        {
                            label: 'Food Collected',
                            data: this.chartData.food,
                            borderColor: '#00f2fe',
                            backgroundColor: 'rgba(0, 242, 254, 0.1)',
                            borderWidth: 2,
                            fill: true,
                            tension: 0.3,
                            pointRadius: 2,
                            pointHoverRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        x: {
                            display: false,
                            grid: {
                                display: false
                            }
                        },
                        y: {
                            display: true,
                            grid: {
                                color: 'rgba(79, 172, 254, 0.1)'
                            },
                            ticks: {
                                color: '#64748b',
                                font: {
                                    size: 10
                                }
                            }
                        }
                    },
                    elements: {
                        point: {
                            hoverBackgroundColor: '#4facfe'
                        }
                    },
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    }
                }
            });
            
            // Chart toggle controls
            const showPopulation = document.getElementById('showPopulation');
            const showFood = document.getElementById('showFood');
            
            if (showPopulation) {
                showPopulation.addEventListener('change', (e) => {
                    this.charts.population.data.datasets[0].hidden = !e.target.checked;
                    this.charts.population.update();
                });
            }
            
            if (showFood) {
                showFood.addEventListener('change', (e) => {
                    this.charts.population.data.datasets[1].hidden = !e.target.checked;
                    this.charts.population.update();
                });
            }
        } catch (error) {
            console.warn('Failed to initialize Chart.js:', error);
        }
    }
    
    /**
     * Update chart data with new statistics
     */
    updateChartData(stats) {
        if (!this.charts.population || typeof Chart === 'undefined') {
            // If chart is not available, just store the data for when it becomes available
            this.storeChartData(stats);
            return;
        }
        
        const timestamp = new Date().toLocaleTimeString();
        
        // Add new data point
        this.chartData.timestamps.push(timestamp);
        this.chartData.population.push(stats.individualCount || 0);
        this.chartData.food.push(stats.foodCollected || 0);
        
        // Limit data points to prevent memory issues
        if (this.chartData.timestamps.length > this.maxDataPoints) {
            this.chartData.timestamps.shift();
            this.chartData.population.shift();
            this.chartData.food.shift();
        }
        
        try {
            // Update chart
            this.charts.population.update('none'); // No animation for real-time updates
        } catch (error) {
            console.warn('Error updating chart:', error);
        }
    }
    
    /**
     * Store chart data for later use when chart becomes available
     */
    storeChartData(stats) {
        const timestamp = new Date().toLocaleTimeString();
        
        // Add new data point
        this.chartData.timestamps.push(timestamp);
        this.chartData.population.push(stats.individualCount || 0);
        this.chartData.food.push(stats.foodCollected || 0);
        
        // Limit data points to prevent memory issues
        if (this.chartData.timestamps.length > this.maxDataPoints) {
            this.chartData.timestamps.shift();
            this.chartData.population.shift();
            this.chartData.food.shift();
        }
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
    const interactiveElements = document.querySelectorAll('.action-btn, .stats-tab');
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
        const currentFPS = document.getElementById('currentFPS');
        const avgFPS = document.getElementById('avgFPS');
        const lodLevel = document.getElementById('lodLevel');
        const memoryUsage = document.getElementById('memoryUsage');
        
        if (currentFPS) currentFPS.textContent = Math.round(metrics.currentFPS || 0);
        if (avgFPS) avgFPS.textContent = Math.round(metrics.avgFPS || 0);
        if (lodLevel) lodLevel.textContent = metrics.lodLevel || 'High';
        if (memoryUsage) {
            const memory = metrics.memoryUsage;
            if (memory) {
                memoryUsage.textContent = `${(memory / 1024 / 1024).toFixed(1)}MB`;
            }
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
