export class ObjectPool {
    constructor(createFn, resetFn, initialSize = 10) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = [];
        this.maxPoolSize = Math.max(initialSize * 2, 50); // Prevent unbounded growth
        
        // Pre-populate the pool
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
    }

    acquire(...args) {
        let obj;
        if (this.pool.length > 0) {
            obj = this.pool.pop();
            this.resetFn(obj, ...args);
        } else {
            obj = this.createFn(...args);
        }
        
        this.active.push(obj);
        return obj;
    }

    release(obj) {
        const index = this.active.indexOf(obj);
        if (index > -1) {
            this.active.splice(index, 1);
            
            // Only return to pool if under max size limit
            if (this.pool.length < this.maxPoolSize) {
                this.pool.push(obj);
            } else {
                // Let object be garbage collected if pool is full
                this._cleanupObject(obj);
            }
            return true;
        }
        return false;
    }

    releaseAll() {
        while (this.active.length > 0) {
            this.release(this.active[0]);
        }
    }

    /**
     * Clean up references in object to prevent memory leaks
     */
    _cleanupObject(obj) {
        if (obj && typeof obj.destroy === 'function') {
            try {
                obj.destroy();
            } catch (e) {
                console.warn('Error during object cleanup:', e);
            }
        }
    }

    /**
     * Trim pool size if it grows too large
     */
    trimPool(targetSize = 10) {
        while (this.pool.length > targetSize) {
            const obj = this.pool.pop();
            this._cleanupObject(obj);
        }
    }

    getActiveCount() {
        return this.active.length;
    }

    getPoolSize() {
        return this.pool.length;
    }

    getMemoryInfo() {
        return {
            active: this.active.length,
            pooled: this.pool.length,
            total: this.active.length + this.pool.length,
            maxPoolSize: this.maxPoolSize
        };
    }
}