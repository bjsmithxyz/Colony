/**
 * Enhanced UI Management System
 * Handles tabbed interfaces, drag-and-drop modules, real-time charts, and animations
 */

class EnhancedUI {
    constructor() {
        this.charts = {};
        this.draggedModule = null;
        this.chartData = {
            population: [],
            food: [],
            timestamps: []
        };
        this.maxDataPoints = 50;
        
        this.init();
    }
    
    init() {
        this.initializeTabs();
        this.initializeCharts();
        this.initializeDragAndDrop();
        this.initializeModuleSearch();
        this.initializeAnimations();
    }
    
    /**
     * Initialize tabbed interfaces for statistics and modules
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
                if (targetTab === 'charts' && !this.charts.population) {
                    this.initializeCharts();
                }
            });
        });
        
        // Module tabs
        const moduleTabs = document.querySelectorAll('.module-tab');
        const moduleContents = document.querySelectorAll('.module-tab-content');
        
        moduleTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;
                
                // Update active tab
                moduleTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update active content
                moduleContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === targetTab + 'Modules') {
                        content.classList.add('active');
                    }
                });
            });
        });
    }
    
    /**
     * Initialize Chart.js charts for real-time statistics
     */
    initializeCharts() {
        const canvas = document.getElementById('populationChart');
        if (!canvas || this.charts.population) return;
        
        const ctx = canvas.getContext('2d');
        
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
    }
    
    /**
     * Update chart data with new statistics
     */
    updateChartData(stats) {
        if (!this.charts.population) return;
        
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
        
        // Update chart
        this.charts.population.update('none'); // No animation for real-time updates
    }
    
    /**
     * Initialize drag and drop functionality for modules
     */
    initializeDragAndDrop() {
        const moduleItems = document.querySelectorAll('.module-item.draggable');
        const moduleList = document.getElementById('moduleList');
        
        moduleItems.forEach(item => {
            item.addEventListener('dragstart', (e) => {
                this.draggedModule = {
                    type: item.dataset.module,
                    element: item.cloneNode(true)
                };
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'copy';
            });
            
            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });
        });
        
        if (moduleList) {
            moduleList.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                moduleList.classList.add('drag-over');
            });
            
            moduleList.addEventListener('dragleave', (e) => {
                if (!moduleList.contains(e.relatedTarget)) {
                    moduleList.classList.remove('drag-over');
                }
            });
            
            moduleList.addEventListener('drop', (e) => {
                e.preventDefault();
                moduleList.classList.remove('drag-over');
                
                if (this.draggedModule) {
                    this.addModuleToActive(this.draggedModule.type);
                    this.draggedModule = null;
                }
            });
        }
    }
    
    /**
     * Add a module to the active list
     */
    addModuleToActive(moduleType) {
        const moduleList = document.getElementById('moduleList');
        const placeholder = moduleList.querySelector('.module-placeholder');
        
        // Remove placeholder if it exists
        if (placeholder && moduleList.children.length === 1) {
            placeholder.remove();
        }
        
        // Create active module element
        const activeModule = document.createElement('div');
        activeModule.className = 'active-module-item new-module';
        activeModule.innerHTML = `
            <div class="module-icon">${this.getModuleIcon(moduleType)}</div>
            <div class="active-module-info">
                <div class="active-module-title">${this.getModuleName(moduleType)}</div>
                <div class="active-module-status">Active</div>
            </div>
            <div class="active-module-actions">
                <button class="module-action-btn remove" title="Remove Module">
                    <span>×</span>
                </button>
            </div>
        `;
        
        // Add remove functionality
        const removeBtn = activeModule.querySelector('.remove');
        removeBtn.addEventListener('click', () => {
            activeModule.classList.add('removing-module');
            setTimeout(() => {
                activeModule.remove();
                this.checkModuleListPlaceholder();
            }, 300);
        });
        
        moduleList.appendChild(activeModule);
        
        // Trigger animation
        setTimeout(() => {
            activeModule.classList.remove('new-module');
        }, 300);
        
        // Emit event for simulation to handle
        this.dispatchModuleEvent('moduleAdded', { type: moduleType });
    }
    
    /**
     * Check if module list needs placeholder
     */
    checkModuleListPlaceholder() {
        const moduleList = document.getElementById('moduleList');
        if (moduleList.children.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'module-placeholder';
            placeholder.innerHTML = `
                <span class="placeholder-icon">🎯</span>
                <p>Select a node to see active modules</p>
                <small>Drag modules here to activate</small>
            `;
            moduleList.appendChild(placeholder);
        }
    }
    
    /**
     * Initialize module search functionality
     */
    initializeModuleSearch() {
        const searchInput = document.getElementById('moduleSearch');
        if (!searchInput) return;
        
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const moduleItems = document.querySelectorAll('.module-item');
            
            moduleItems.forEach(item => {
                const moduleName = item.querySelector('.module-name').textContent.toLowerCase();
                const category = item.closest('.module-category');
                
                if (moduleName.includes(searchTerm)) {
                    item.style.display = 'block';
                    category.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
            
            // Hide empty categories
            const categories = document.querySelectorAll('.module-category');
            categories.forEach(category => {
                const visibleModules = category.querySelectorAll('.module-item[style*="block"], .module-item:not([style])');
                category.style.display = visibleModules.length > 0 ? 'block' : 'none';
            });
        });
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
     * Get module icon by type
     */
    getModuleIcon(type) {
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
     * Get module name by type
     */
    getModuleName(type) {
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
     * Dispatch module events for simulation integration
     */
    dispatchModuleEvent(eventType, data) {
        const event = new CustomEvent(eventType, { detail: data });
        document.dispatchEvent(event);
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

export default EnhancedUI;
