export class TrailSystem {
    constructor(width, height, enabled = true) {
        this.width = width;
        this.height = height;
        this.enabled = enabled;
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d', { alpha: true });
        this.ctx.globalCompositeOperation = 'source-over';
        this.fadeRate = 0.95;
    }

    addPoint(x, y, color) {
        if (!this.enabled) return;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1);
    }

    update() {
        if (!this.enabled) return;
        this.ctx.globalCompositeOperation = 'destination-out';
        this.ctx.fillStyle = `rgba(0, 0, 0, ${1 - this.fadeRate})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
        this.ctx.globalCompositeOperation = 'source-over';
    }

    render(targetCtx) {
        if (!this.enabled) return;
        targetCtx.drawImage(this.canvas, 0, 0);
    }

    renderRegion(targetCtx, rect) {
        if (!this.enabled) return;
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
