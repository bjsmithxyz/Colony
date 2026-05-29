export class SpatialGrid {
    constructor(width, height, cellSize = 32) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.cols = Math.ceil(width / cellSize);
        this.rows = Math.ceil(height / cellSize);
        this.grid = new Array(this.cols * this.rows);
        this.clear();
    }

    clear() {
        for (let i = 0; i < this.grid.length; i++) {
            this.grid[i].length = 0;
        }
    }

    getCellIndex(x, y) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        
        if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
            return -1;
        }
        
        return row * this.cols + col;
    }

    insert(entity) {
        const index = this.getCellIndex(entity.x, entity.y);
        if (index >= 0) {
            this.grid[index].push(entity);
        }
    }

    /**
     * Insert an entity into all cells overlapping a bounding box (used for nodes)
     * box: { minX, minY, maxX, maxY }
     */
    insertBox(entity, box) {
        const minCol = Math.max(0, Math.floor(box.minX / this.cellSize));
        const maxCol = Math.min(this.cols - 1, Math.floor(box.maxX / this.cellSize));
        const minRow = Math.max(0, Math.floor(box.minY / this.cellSize));
        const maxRow = Math.min(this.rows - 1, Math.floor(box.maxY / this.cellSize));

        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                const index = row * this.cols + col;
                this.grid[index].push(entity);
            }
        }
    }

    queryBox(box) {
        const results = [];
        const minCol = Math.max(0, Math.floor(box.minX / this.cellSize));
        const maxCol = Math.min(this.cols - 1, Math.floor(box.maxX / this.cellSize));
        const minRow = Math.max(0, Math.floor(box.minY / this.cellSize));
        const maxRow = Math.min(this.rows - 1, Math.floor(box.maxY / this.cellSize));

        const seen = new Set();
        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                const index = row * this.cols + col;
                const cell = this.grid[index];
                for (let i = 0; i < cell.length; i++) {
                    const entity = cell[i];
                    const id = entity._sgid || (entity._sgid = Math.random().toString(36).slice(2));
                    if (!seen.has(id)) {
                        seen.add(id);
                        results.push(entity);
                    }
                }
            }
        }

        return results;
    }

    queryRadius(x, y, radius) {
        const results = [];
        const minCol = Math.max(0, Math.floor((x - radius) / this.cellSize));
        const maxCol = Math.min(this.cols - 1, Math.floor((x + radius) / this.cellSize));
        const minRow = Math.max(0, Math.floor((y - radius) / this.cellSize));
        const maxRow = Math.min(this.rows - 1, Math.floor((y + radius) / this.cellSize));

        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                const index = row * this.cols + col;
                const cell = this.grid[index];
                
                for (let i = 0; i < cell.length; i++) {
                    const entity = cell[i];
                    const dx = entity.x - x;
                    const dy = entity.y - y;
                    const distanceSq = dx * dx + dy * dy;

                    if (distanceSq <= radius * radius) {
                        results.push({ entity, distance: Math.sqrt(distanceSq) });
                    }
                }
            }
        }

        return results;
    }

    queryPoint(x, y) {
        const index = this.getCellIndex(x, y);
        return index >= 0 ? this.grid[index] : [];
    }

    getNeighbors(entity, radius) {
        return this.queryRadius(entity.x, entity.y, radius);
    }
}