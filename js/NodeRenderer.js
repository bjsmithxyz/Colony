/**
 * Node Renderer
 * Handles all rendering and visual effects for nodes
 */
export class NodeRenderer {
    constructor(node) {
        this.node = node;
        this._offscreen = null;
        this._offscreenBounds = null;
        this._isDirty = true;
        this._lastPixelChecksum = 0;
    }

    /**
     * Render the node with all visual effects
     */
    render(ctx) {
        const bounds = this.node.shapeGenerator.getBounds();
        
        // Render beacon effect
        this.renderBeaconEffect(ctx);
        
    // Pulse animation removed to avoid spawn flash
        
        // Render the main node body
        const cfg = (this.node.simulation && this.node.simulation.CONFIG && this.node.simulation.CONFIG.RENDER) ? this.node.simulation.CONFIG.RENDER : null;
        if (cfg && cfg.OFFSCREEN_CANVAS_ENABLED) {
            this._renderWithOffscreen(ctx, bounds, cfg);
        } else {
            this.renderNodeBody(ctx);
        }

        // shared pool label removed

        // If this node has an active drop ping, render the dissipating ping
        if (this.node.dropPingStart && (this.node.dropPingDuration || 0) > 0) {
            this.renderDroppedHalo(ctx);
        }
    }

    /**
     * Render beacon effect if active
     */
    renderBeaconEffect(ctx) {
        if (this.node.beaconActive && this.node.beaconAnimation !== undefined) {
            const beaconRadius = 15 + Math.sin(this.node.beaconAnimation) * 8;
            const beaconOpacity = 0.2 + Math.sin(this.node.beaconAnimation) * 0.15;
            
            ctx.beginPath();
            ctx.arc(this.node.x, this.node.y, beaconRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(76, 175, 80, ${beaconOpacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }

    /**
     * Render pulse animation when spawning
     */
    renderPulseAnimation(ctx, bounds) {
        if (this.node.pulseAnimation > 0) {
            const pulseInflation = Math.sin(this.node.pulseAnimation * Math.PI) * 3;
            ctx.fillStyle = `rgba(76, 175, 80, ${0.3 * this.node.pulseAnimation})`;
            ctx.fillRect(
                this.node.x + bounds.minX - pulseInflation,
                this.node.y + bounds.minY - pulseInflation,
                (bounds.maxX - bounds.minX + 1) + pulseInflation * 2,
                (bounds.maxY - bounds.minY + 1) + pulseInflation * 2
            );
        }
    }

    /**
     * Render the main node body (organic pixel-based)
     */
    renderNodeBody(ctx) {
        ctx.fillStyle = this.node.color;
        
        // For performance, batch adjacent pixels where possible
        if (this.node.pixels.length > 100) {
            this.renderWithImageData(ctx);
        } else {
            this.renderWithFillRect(ctx);
        }
    }

    // renderSharedPoolLabel removed

    renderDroppedHalo(ctx) {
        // If node has a dropPingStart/time configured, render a dissipating ping
        const start = this.node.dropPingStart;
        const duration = this.node.dropPingDuration || 0;
        if (!start || duration <= 0) return;

        const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        const elapsed = now - start;
        if (elapsed < 0 || elapsed > duration) return;

    const linearT = Math.max(0, Math.min(1, elapsed / duration)); // 0 -> 1 over lifetime

    // Apply ease-out curve for a smoother feel (cubic ease-out)
    const easeOut = (x) => 1 - Math.pow(1 - x, 3);
    const t = easeOut(linearT);

    // Ping expands and fades: radius from baseRadius to maxRadius, alpha from 0.6 -> 0
    const baseRadius = Math.max(8, this.node.size / 2);
    const maxRadius = baseRadius + 40; // how far the ping expands
    const radius = baseRadius + (maxRadius - baseRadius) * t;
    const alpha = 0.6 * (1 - linearT); // fade uses linear progress for consistent fade timing

        // Determine base color from node.color (support hex #RRGGBB). Fallback to cornflower blue.
        let r = 100, g = 149, b = 237;
        try {
            const c = (this.node.color || '').trim();
            if (c.startsWith('#') && (c.length === 7 || c.length === 4)) {
                if (c.length === 7) {
                    r = parseInt(c.slice(1,3), 16);
                    g = parseInt(c.slice(3,5), 16);
                    b = parseInt(c.slice(5,7), 16);
                } else {
                    // short hex e.g. #abc -> #aabbcc
                    r = parseInt(c[1] + c[1], 16);
                    g = parseInt(c[2] + c[2], 16);
                    b = parseInt(c[3] + c[3], 16);
                }
            } else if (c.startsWith('rgb')) {
                // handle rgb/rgba strings like 'rgb(12,34,56)'
                const nums = c.replace(/rgba?\(|\)/g,'').split(',').map(s => parseInt(s,10));
                if (nums.length >= 3 && !isNaN(nums[0])) { r = nums[0]; g = nums[1]; b = nums[2]; }
            }
        } catch (e) {
            // fallback to default
        }

        ctx.save();
        // Short filled flash at drop start for tactile feedback
        const flashThreshold = 0.12; // first ~12% of duration
        if (linearT <= flashThreshold) {
            const flashProgress = linearT / flashThreshold; // 0 -> 1
            const flashAlpha = 0.9 * (1 - flashProgress); // strong at start, quickly fade
            ctx.beginPath();
            ctx.arc(this.node.x, this.node.y, baseRadius * (1 + 0.25 * flashProgress), 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${r},${g},${b},${flashAlpha.toFixed(3)})`;
            ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(this.node.x, this.node.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha.toFixed(3)})`;
        ctx.lineWidth = 2 * (1 - t) + 0.5; // slight tapering of line width
        ctx.stroke();

        // Add a subtle outer glow fill with very low alpha
        ctx.beginPath();
        ctx.arc(this.node.x, this.node.y, radius * 0.9, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${g},${b},${(0.08 * (1 - t)).toFixed(3)})`;
        ctx.fill();

        ctx.restore();
    }

    /**
     * Render using ImageData for large pixel counts (optimized)
     */
    renderWithImageData(ctx) {
        const imageData = ctx.createImageData(1, 1);
        const data = imageData.data;
        
        // Extract RGB from color
        const color = this.node.color.startsWith('#') ? this.node.color.slice(1) : this.node.color;
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        
        data[0] = r;
        data[1] = g;
        data[2] = b;
        data[3] = 255; // alpha
        
        this.node.pixels.forEach(pixel => {
            ctx.putImageData(imageData, this.node.x + pixel.dx, this.node.y + pixel.dy);
        });
    }

    /**
     * Render using fillRect for smaller pixel counts
     */
    renderWithFillRect(ctx) {
        this.node.pixels.forEach(pixel => {
            ctx.fillRect(this.node.x + pixel.dx, this.node.y + pixel.dy, 1, 1);
        });
    }

    _markDirty() {
        this._isDirty = true;
    }

    _computePixelChecksum() {
        // simple 32-bit rolling hash of pixel coordinates
        let h = 2166136261 >>> 0;
        for (let i = 0; i < this.node.pixels.length; i++) {
            const p = this.node.pixels[i];
            // mix dx and dy
            h ^= (p.dx & 0xffffffff);
            h = Math.imul(h, 16777619) >>> 0;
            h ^= (p.dy & 0xffffffff);
            h = Math.imul(h, 16777619) >>> 0;
        }
        // incorporate pixel count
        h ^= (this.node.pixels.length & 0xffffffff);
        h = Math.imul(h, 16777619) >>> 0;
        return h >>> 0;
    }

    _renderWithOffscreen(ctx, bounds, cfg) {
        // Downsampled silhouette blur approach:
        // 1) Render pixel mask to a small offscreen canvas at reduced scale
        // 2) Apply canvas blur filter to the small canvas
        // 3) Draw scaled-up blurred canvas onto main ctx with node color tint

        // scaling factor for downsampling (higher => faster, blur smoother). Tune in config later.
        const downsample = (cfg.DOWNsample_FACTOR && cfg.DOWNsampleFactor) || 3;

        // margin in world pixels to allow blur to extend
        const marginWorld = (cfg.SILHOUETTE_BLUR_ENABLED ? (cfg.SILHOUETTE_BLUR_RADIUS || 6) : 0) + 2;
        const worldW = (bounds.maxX - bounds.minX + 1) + marginWorld * 2;
        const worldH = (bounds.maxY - bounds.minY + 1) + marginWorld * 2;

        const width = Math.max(1, Math.ceil(worldW / downsample));
        const height = Math.max(1, Math.ceil(worldH / downsample));

        // recreate offscreen if size changed
        if (!this._offscreen || !this._offscreenBounds || this._offscreenBounds.width !== width || this._offscreenBounds.height !== height || this._offscreenBounds.downsample !== downsample) {
            this._offscreen = document.createElement('canvas');
            this._offscreen.width = width;
            this._offscreen.height = height;
            this._offscreenBounds = { width, height, marginWorld, downsample };
            this._isDirty = true;
        }

        const offCtx = this._offscreen.getContext('2d');

        // compute checksum and decide whether to rebuild
        const checksum = this._computePixelChecksum();
        if (checksum !== this._lastPixelChecksum) this._isDirty = true;

        if (this._isDirty) {
            // clear small canvas
            offCtx.clearRect(0, 0, width, height);

            // draw pixel mask scaled down
            offCtx.fillStyle = '#000'; // mask in alpha
            const ox = marginWorld - bounds.minX;
            const oy = marginWorld - bounds.minY;
            for (const p of this.node.pixels) {
                const sx = Math.floor((ox + p.dx) / downsample);
                const sy = Math.floor((oy + p.dy) / downsample);
                if (sx >= 0 && sx < width && sy >= 0 && sy < height) offCtx.fillRect(sx, sy, 1, 1);
            }

            // apply blur on small canvas
            if (cfg.SILHOUETTE_BLUR_ENABLED && typeof offCtx.filter !== 'undefined') {
                const r = Math.max(1, (cfg.SILHOUETTE_BLUR_RADIUS || 6) / downsample);
                // copy to temp, apply filter, and blit back
                const tmp = document.createElement('canvas');
                tmp.width = width;
                tmp.height = height;
                const tctx = tmp.getContext('2d');
                const img = offCtx.getImageData(0,0,width,height);
                tctx.putImageData(img, 0, 0);
                tctx.filter = `blur(${r}px)`;
                const blurred = tctx.getImageData(0,0,width,height);
                offCtx.clearRect(0,0,width,height);
                offCtx.putImageData(blurred, 0, 0);
            }

            this._isDirty = false;
            this._lastPixelChecksum = checksum;
        }

        // Draw the blurred mask scaled up and tint with node color
        // Use globalCompositeOperation to tint alpha mask
        ctx.save();
        const drawX = this.node.x + bounds.minX - this._offscreenBounds.marginWorld;
        const drawY = this.node.y + bounds.minY - this._offscreenBounds.marginWorld;
        // draw mask scaled up
        ctx.globalAlpha = 1;
        ctx.drawImage(this._offscreen, 0, 0, width, height, drawX, drawY, worldW, worldH);
        // tint using destination-in trick: draw color rect, then apply mask
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = this.node.color || '#4CAF50';
        ctx.fillRect(drawX, drawY, worldW, worldH);
        ctx.restore();
    }
}
