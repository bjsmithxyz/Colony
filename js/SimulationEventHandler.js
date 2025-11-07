/**
 * Event Handler for Simulation
 * Manages all user input and UI event handling
 */
export class SimulationEventHandler {
    constructor(simulation) {
        this.simulation = simulation;
        this.tooltip = document.getElementById('tooltip');
        this.hoveredNode = null;
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.setupCanvasEvents();
        this.setupUIControls();
        this.setupTooltips();
    }

    setupCanvasEvents() {
        // Left click handler
        this.simulation.canvas.addEventListener('click', (e) => {
            e.stopPropagation();
            const coords = this.getCanvasCoordinates(e);
            
            
            const clickedNode = this.simulation.getNodeAt(coords.x, coords.y);
            if (clickedNode) {
                this.simulation.selectTarget(clickedNode);
            } else {
                // Only allow player to drop a node if permitted (one-time drop)
                if (this.simulation.playerCanDropNodes) {
                    this.simulation.addNode(Math.floor(coords.x), Math.floor(coords.y));
                    // after the first player-initiated drop, disable further manual drops
                    this.simulation.playerCanDropNodes = false;
                    if (this.simulation._updateCanvasCursor) this.simulation._updateCanvasCursor();
                }
            }
        });

    // (left-click behavior only)
    }

    setupUIControls() {
        // Pause/Play controls
        const pausePlayBtn = document.getElementById('pausePlayBtn');
        pausePlayBtn?.addEventListener('click', () => {
            this.simulation.togglePause();
            this.updatePausePlayButton(pausePlayBtn);
        });

        // Speed control
        const speedSlider = document.getElementById('speedSlider');
        const speedDisplay = document.getElementById('speedDisplay');
        speedSlider?.addEventListener('input', (e) => {
            this.simulation.simulationSpeed = parseFloat(e.target.value);
            if (speedDisplay) {
                speedDisplay.textContent = `${this.simulation.simulationSpeed.toFixed(1)}x`;
            }
        });


        // Reset button
        const resetBtn = document.getElementById('resetBtn');
        resetBtn?.addEventListener('click', () => {
            this.simulation.resetSimulation();
        });

    }

    setupModuleBridge() {
        // No-op: module system removed
    }

    setupTooltips() {
        // Mouse move for tooltips
        this.simulation.canvas.addEventListener('mousemove', (e) => {
            const coords = this.getCanvasCoordinates(e);
            const node = this.simulation.getNodeAt(coords.x, coords.y);
            
            if (node !== this.hoveredNode) {
                this.hoveredNode = node;
                if (node) {
                    this.showTooltip(e.clientX, e.clientY, node);
                } else {
                    this.hideTooltip();
                }
            } else if (node) {
                this.updateTooltipPosition(e.clientX, e.clientY);
            }
        });

        // Hide tooltip when mouse leaves canvas
        this.simulation.canvas.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });
    }

    getCanvasCoordinates(event) {
        const rect = this.simulation.canvas.getBoundingClientRect();
        const scaleX = this.simulation.canvas.width / rect.width;
        const scaleY = this.simulation.canvas.height / rect.height;
        
        return {
            x: (event.clientX - rect.left) * scaleX,
            y: (event.clientY - rect.top) * scaleY
        };
    }

    updatePausePlayButton(button) {
        // Support both old styled buttons (with .btn-icon/.btn-label)
        // and the new minimalist text-only buttons
        const icon = button.querySelector('.btn-icon');
        const label = button.querySelector('.btn-label');

        if (this.simulation.isPaused) {
            if (icon) icon.textContent = '▶️';
            if (label) label.textContent = 'Play';
            // fallback: set button text
            if (!label && !icon) button.innerText = 'play';
        } else {
            if (icon) icon.textContent = '⏸️';
            if (label) label.textContent = 'Pause';
            if (!label && !icon) button.innerText = 'pause';
        }
    }


    showTooltip(x, y, node) {
        const individualCount = this.simulation.individuals.filter(ind => ind.parentNode === node).length;
    let content = `Food: ${node.food}<br>Individuals: ${individualCount}`;
        
        this.tooltip.innerHTML = content;
        this.tooltip.style.display = 'block';
        this.updateTooltipPosition(x, y);
    }
    
    updateTooltipPosition(x, y) {
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const offsetX = 10;
        const offsetY = -tooltipRect.height - 10;
        
        let left = x + offsetX;
        let top = y + offsetY;
        
        // Keep tooltip on screen
        if (left + tooltipRect.width > window.innerWidth) {
            left = x - tooltipRect.width - offsetX;
        }
        if (top < 0) {
            top = y + 20;
        }
        
        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }
    
    hideTooltip() {
        this.tooltip.style.display = 'none';
        this.hoveredNode = null;
    }
}
