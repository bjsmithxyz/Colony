export class DirtyRectManager {
    constructor(width, height, cellSize = 64) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.cols = Math.ceil(width / cellSize);
        this.rows = Math.ceil(height / cellSize);
        this.dirtyRegions = new Set();
        this.alwaysDirty = false;
    }

    markDirty(x, y, width = 1, height = 1) {
        if (this.alwaysDirty) return;

        const minCol = Math.max(0, Math.floor(x / this.cellSize));
        const maxCol = Math.min(this.cols - 1, Math.floor((x + width) / this.cellSize));
        const minRow = Math.max(0, Math.floor(y / this.cellSize));
        const maxRow = Math.min(this.rows - 1, Math.floor((y + height) / this.cellSize));

        for (let row = minRow; row <= maxRow; row++) {
            for (let col = minCol; col <= maxCol; col++) {
                this.dirtyRegions.add(row * this.cols + col);
            }
        }
    }

    markEntityDirty(entity, prevX = null, prevY = null) {
        // Mark current position
        this.markDirty(entity.x - entity.size, entity.y - entity.size, entity.size * 2, entity.size * 2);
        
        // Mark previous position if provided
        if (prevX !== null && prevY !== null) {
            this.markDirty(prevX - entity.size, prevY - entity.size, entity.size * 2, entity.size * 2);
        }
    }

    markAllDirty() {
        this.alwaysDirty = true;
    }

    getDirtyRects() {
        if (this.alwaysDirty) {
            return [{ x: 0, y: 0, width: this.width, height: this.height }];
        }

        const rects = [];
        for (const regionIndex of this.dirtyRegions) {
            const col = regionIndex % this.cols;
            const row = Math.floor(regionIndex / this.cols);
            
            rects.push({
                x: col * this.cellSize,
                y: row * this.cellSize,
                width: Math.min(this.cellSize, this.width - col * this.cellSize),
                height: Math.min(this.cellSize, this.height - row * this.cellSize)
            });
        }
        return rects;
    }

    clear() {
        this.dirtyRegions.clear();
        this.alwaysDirty = false;
    }

    isEmpty() {
        return this.dirtyRegions.size === 0 && !this.alwaysDirty;
    }
}