/**
 * Chart Manager
 * Handles Chart.js initialization and data updates
 */
export class ChartManager {
    constructor() {
        this.charts = {};
        this.chartData = {
            population: [],
            food: [],
            timestamps: []
        };
        this.maxDataPoints = 50;
        this.initialized = false;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('chartsTabOpened', () => {
            if (!this.initialized && typeof Chart !== 'undefined') {
                this.initializeCharts();
            }
        });
    }

    initializeCharts() {
        if (this.initialized || typeof Chart === 'undefined') return;

        try {
            this.createPopulationChart();
            this.createFoodChart();
            this.initialized = true;
            console.log('Charts initialized successfully');
        } catch (error) {
            console.error('Failed to initialize charts:', error);
        }
    }

    createPopulationChart() {
        const populationCtx = document.getElementById('populationChart');
        if (!populationCtx) return;

        this.charts.population = new Chart(populationCtx, {
            type: 'line',
            data: {
                labels: this.chartData.timestamps,
                datasets: [{
                    label: 'Nodes',
                    data: this.chartData.population.map(d => d.nodes),
                    borderColor: '#4facfe',
                    backgroundColor: 'rgba(79, 172, 254, 0.1)',
                    fill: true
                }, {
                    label: 'Individuals',
                    data: this.chartData.population.map(d => d.individuals),
                    borderColor: '#00f2fe',
                    backgroundColor: 'rgba(0, 242, 254, 0.1)',
                    fill: true
                }]
            },
            options: this.getChartOptions('Population Over Time')
        });
    }

    createFoodChart() {
        const foodCtx = document.getElementById('foodChart');
        if (!foodCtx) return;

        this.charts.food = new Chart(foodCtx, {
            type: 'line',
            data: {
                labels: this.chartData.timestamps,
                datasets: [{
                    label: 'Total Food',
                    data: this.chartData.food.map(d => d.total),
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true
                }, {
                    label: 'Collected',
                    data: this.chartData.food.map(d => d.collected),
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: true
                }]
            },
            options: this.getChartOptions('Food Statistics')
        });
    }

    getChartOptions(title) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    color: '#e2e8f0',
                    font: { size: 14 }
                },
                legend: {
                    labels: { color: '#e2e8f0' }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                },
                y: {
                    ticks: { color: '#94a3b8' },
                    grid: { color: 'rgba(148, 163, 184, 0.1)' }
                }
            },
            animation: {
                duration: 300
            }
        };
    }

    updateChartData(stats) {
        const timestamp = new Date().toLocaleTimeString();
        
        // Add new data point
        this.chartData.timestamps.push(timestamp);
        this.chartData.population.push({
            nodes: stats.nodeCount,
            individuals: stats.individualCount
        });
        this.chartData.food.push({
            total: stats.totalFood,
            collected: stats.foodCollected
        });
        
        // Limit data points
        if (this.chartData.timestamps.length > this.maxDataPoints) {
            this.chartData.timestamps.shift();
            this.chartData.population.shift();
            this.chartData.food.shift();
        }
        
        // Update charts if they exist
        this.updateCharts();
    }

    updateCharts() {
        if (!this.initialized) return;

        if (this.charts.population) {
            this.charts.population.data.labels = this.chartData.timestamps;
            this.charts.population.data.datasets[0].data = this.chartData.population.map(d => d.nodes);
            this.charts.population.data.datasets[1].data = this.chartData.population.map(d => d.individuals);
            this.charts.population.update('none');
        }

        if (this.charts.food) {
            this.charts.food.data.labels = this.chartData.timestamps;
            this.charts.food.data.datasets[0].data = this.chartData.food.map(d => d.total);
            this.charts.food.data.datasets[1].data = this.chartData.food.map(d => d.collected);
            this.charts.food.update('none');
        }
    }

    storeChartData(stats) {
        // Store data for when charts become available
        this.updateChartData(stats);
    }

    updatePerformanceMetrics(metrics) {
        // Update performance displays
        const avgFpsElement = document.getElementById('avgFPS');
        const lodLevelElement = document.getElementById('lodLevel');
        const memoryUsageElement = document.getElementById('memoryUsage');
        
        if (avgFpsElement) avgFpsElement.textContent = metrics.avgFPS || '--';
        if (lodLevelElement) lodLevelElement.textContent = metrics.lodLevel || 'High';
        if (memoryUsageElement && metrics.memoryUsage) {
            memoryUsageElement.textContent = `${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB`;
        }
    }
}
