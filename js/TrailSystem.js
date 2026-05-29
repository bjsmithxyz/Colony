export class TrailSystem {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.ctx.globalCompositeOperation = 'source-over';
        this.fadeRate = 0.95;
    }

    addPoint(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
    }

    update() {
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.fadeRate})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.globalCompositeOperation = 'source-over';
    }

    render(targetCtx) {
        targetCtx.drawImage(this.canvas, 0, 0);
    }

    /** Blit a subregion of the trail buffer onto the target context. */
    renderRegion(targetCtx, rect) {
        const x = Math.max(0, Math.floor(rect.x));
        const y = Math.max(0, Math.floor(rect.y));
        const w = Math.min(this.width - x, Math.ceil(rect.width));
        const h = Math.min(this.height - y, Math.ceil(rect.height));
        if (w <= 0 || h <= 0) return;
        targetCtx.drawImage(this.canvas, x, y, w, h, x, y, w, h);
    }

    clear() {
        this.ctx.clearRect(0, 0, this.width, this.height);
    }
}
