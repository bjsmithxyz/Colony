/**
 * Event Handler for Simulation
 * Manages all user input and UI event handling
 */
export class SimulationEventHandler {
    constructor(simulation) {
        this.simulation = simulation;
        this.contextMenu = document.getElementById('contextMenu');
        this.contextMenuTarget = null;
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
            
            this.hideContextMenu();
            
            const clickedNode = this.simulation.getNodeAt(coords.x, coords.y);
            if (clickedNode) {
                this.simulation.selectTarget(clickedNode);
            } else {
                this.simulation.addNode(Math.floor(coords.x), Math.floor(coords.y));
            }
        });

        // Right click handler
        this.simulation.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const coords = this.getCanvasCoordinates(e);
            
            const clickedNode = this.simulation.getNodeAt(coords.x, coords.y);
            if (clickedNode) {
                this.showContextMenu(e.clientX, e.clientY, clickedNode);
            }
        });

        // Hide context menu when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!this.contextMenu.contains(e.target) && e.target !== this.simulation.canvas) {
                this.hideContextMenu();
            }
        });
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

        // LOD toggle
        const lodToggle = document.getElementById('lodToggle');
        lodToggle?.addEventListener('change', (e) => {
            this.simulation.lodEnabled = e.target.checked;
            console.log(`LOD ${this.simulation.lodEnabled ? 'enabled' : 'disabled'}`);
        });

        // Reset button
        const resetBtn = document.getElementById('resetBtn');
        resetBtn?.addEventListener('click', () => {
            this.simulation.resetSimulation();
        });

    // Spawn UI removed: spawning is automated based on node food

        // Statistics panel toggle
        const statsToggle = document.getElementById('statsToggle');
        const statsContent = document.getElementById('stats');
        statsToggle?.addEventListener('click', () => {
            statsToggle.classList.toggle('collapsed');
            statsContent?.classList.toggle('collapsed');
        });
    }

    setupModuleBridge() {
        // No-op (subsystem removed)
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
        const icon = button.querySelector('.btn-icon');
        const label = button.querySelector('.btn-label');
        
        if (this.simulation.isPaused) {
            icon.textContent = '▶️';
            if (label) label.textContent = 'Play';
        } else {
            icon.textContent = '⏸️';
            if (label) label.textContent = 'Pause';
        }
    }

    showContextMenu(x, y, node) {
        this.contextMenuTarget = node;
        this.contextMenu.style.display = 'block';
        this.contextMenu.style.left = `${x}px`;
        this.contextMenu.style.top = `${y}px`;
        
        // Adjust position if menu goes off-screen
        const menuRect = this.contextMenu.getBoundingClientRect();
        if (menuRect.right > window.innerWidth) {
            this.contextMenu.style.left = `${x - menuRect.width}px`;
        }
        if (menuRect.bottom > window.innerHeight) {
            this.contextMenu.style.top = `${y - menuRect.height}px`;
        }
    }
    
    hideContextMenu() {
        this.contextMenu.style.display = 'none';
        this.contextMenuTarget = null;
    }

    handleContextMenuAction(action, node) {
        switch (action) {
            case 'delete':
                this.simulation.deleteNode(node);
                break;
            case 'duplicate':
                this.simulation.duplicateNode(node);
                break;
            /* clear-modules action removed */
            case 'info':
                this.simulation.showNodeInfo(node);
                break;
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
