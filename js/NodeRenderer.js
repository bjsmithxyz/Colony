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
        if (cfg && cfg.MARCHING_SQUARES_ENABLED) {
            // Use marching-squares Path2D when enabled
            this._renderWithMarchingSquares(ctx, bounds, cfg);
            return;
        }
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
        if (this.pixels.length > 50) {
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
        // Build a single ImageData covering the node's bounding box and blit once.
        const bounds = this.node.shapeGenerator.getBounds();
        const width = Math.max(1, bounds.maxX - bounds.minX + 1);
        const height = Math.max(1, bounds.maxY - bounds.minY + 1);

        let imageData;
        try {
            imageData = ctx.createImageData(width, height);
        } catch (e) {
            // Fallback: if createImageData fails for large sizes, fall back to per-pixel fill
            this.node.pixels.forEach(pixel => ctx.fillRect(this.node.x + pixel.dx, this.node.y + pixel.dy, 1, 1));
            return;
        }

        const buf = imageData.data;
        const rgba = this._parseColor(this.node.color || '#4CAF50');

        // Fill buffer with transparent first (already zeroed by default)
        for (const p of this.node.pixels) {
            const x = p.dx - bounds.minX;
            const y = p.dy - bounds.minY;
            if (x < 0 || x >= width || y < 0 || y >= height) continue;
            const idx = (y * width + x) * 4;
            buf[idx] = rgba.r;
            buf[idx + 1] = rgba.g;
            buf[idx + 2] = rgba.b;
            buf[idx + 3] = Math.round(rgba.a * 255);
        }

        // Put the composed image data at the correct world position
        const drawX = this.node.x + bounds.minX;
        const drawY = this.node.y + bounds.minY;
        ctx.putImageData(imageData, drawX, drawY);
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

    _parseColor(colorStr) {
        const out = { r: 76, g: 175, b: 80, a: 1 };
        if (!colorStr || typeof colorStr !== 'string') return out;
        const c = colorStr.trim();
        try {
            if (c.startsWith('#')) {
                if (c.length === 7) {
                    out.r = parseInt(c.slice(1,3), 16);
                    out.g = parseInt(c.slice(3,5), 16);
                    out.b = parseInt(c.slice(5,7), 16);
                } else if (c.length === 4) {
                    out.r = parseInt(c[1] + c[1], 16);
                    out.g = parseInt(c[2] + c[2], 16);
                    out.b = parseInt(c[3] + c[3], 16);
                }
            } else if (c.startsWith('rgb')) {
                const nums = c.replace(/rgba?\(|\)/g,'').split(',').map(s => parseFloat(s.trim()));
                if (nums.length >= 3) {
                    out.r = Math.round(nums[0]); out.g = Math.round(nums[1]); out.b = Math.round(nums[2]);
                    if (nums.length >= 4) out.a = nums[3];
                }
            }
        } catch (e) {}
        return out;
    }

    _renderWithOffscreen(ctx, bounds, cfg) {
        // Full-resolution offscreen silhouette + optional blur
        // determine required offscreen bounds (add margin for blur)
        const margin = (cfg.SILHOUETTE_BLUR_ENABLED ? (cfg.SILHOUETTE_BLUR_RADIUS || 6) : 0) + 2;
        const width = (bounds.maxX - bounds.minX + 1) + margin * 2;
        const height = (bounds.maxY - bounds.minY + 1) + margin * 2;

        // recreate offscreen if size changed
        if (!this._offscreen || !this._offscreenBounds || this._offscreenBounds.width !== width || this._offscreenBounds.height !== height) {
            this._offscreen = document.createElement('canvas');
            this._offscreen.width = Math.max(1, width);
            this._offscreen.height = Math.max(1, height);
            this._offscreenBounds = { width: this._offscreen.width, height: this._offscreen.height, margin };
            this._isDirty = true;
        }

        const offCtx = this._offscreen.getContext('2d');

        if (this._isDirty) {
            const checksum = this._computePixelChecksum();
            offCtx.clearRect(0, 0, this._offscreen.width, this._offscreen.height);

            offCtx.fillStyle = this.node.color;
            const ox = this._offscreenBounds.margin + (0 - bounds.minX);
            const oy = this._offscreenBounds.margin + (0 - bounds.minY);
            for (const p of this.node.pixels) {
                offCtx.fillRect(ox + p.dx, oy + p.dy, 1, 1);
            }

            if (cfg.SILHOUETTE_BLUR_ENABLED && typeof offCtx.filter !== 'undefined') {
                const r = cfg.SILHOUETTE_BLUR_RADIUS || 6;
                const tmp = document.createElement('canvas');
                tmp.width = this._offscreen.width;
                tmp.height = this._offscreen.height;
                const tctx = tmp.getContext('2d');
                tctx.fillStyle = this.node.color;
                tctx.fillRect(0, 0, tmp.width, tmp.height);
                const mask = offCtx.getImageData(0, 0, this._offscreen.width, this._offscreen.height);
                tctx.clearRect(0, 0, tmp.width, tmp.height);
                tctx.putImageData(mask, 0, 0);
                tctx.filter = `blur(${r}px)`;
                const blurred = tctx.getImageData(0, 0, tmp.width, tmp.height);
                offCtx.clearRect(0, 0, this._offscreen.width, this._offscreen.height);
                offCtx.putImageData(blurred, 0, 0);
            }

            this._isDirty = false;
            this._lastPixelChecksum = checksum;
        }

        // draw offscreen to main ctx at correct position
        const drawX = this.node.x + bounds.minX - this._offscreenBounds.margin;
        const drawY = this.node.y + bounds.minY - this._offscreenBounds.margin;
        ctx.drawImage(this._offscreen, drawX, drawY);
    }

    _renderWithMarchingSquares(ctx, bounds, cfg) {
        // Recompute Path2D only when checksum changes
        const checksum = this._computePixelChecksum();
        if (!this._msPath || this._msChecksum !== checksum) {
            this._msPath = this._buildMarchingSquaresPath(bounds);
            this._msChecksum = checksum;
        }
        if (!this._msPath) return;

        ctx.save();
        ctx.fillStyle = this.node.color || '#4CAF50';
        ctx.fill(this._msPath);
        ctx.lineWidth = cfg.MARCHING_SQUARES_STROKE_WIDTH || 2;
        // lighter stroke
        try {
            const c = (this.node.color || '#4CAF50').replace('#','');
            const r = parseInt(c.substring(0,2),16);
            const g = parseInt(c.substring(2,4),16);
            const b = parseInt(c.substring(4,6),16);
            const mix = (v) => Math.min(255, Math.round(v + (255 - v) * 0.5));
            ctx.strokeStyle = `rgba(${mix(r)},${mix(g)},${mix(b)},0.9)`;
        } catch (e) { ctx.strokeStyle = 'rgba(255,255,255,0.9)'; }
        ctx.stroke(this._msPath);
        ctx.restore();
    }

    _buildMarchingSquaresPath(bounds) {
        // Build boolean grid from pixelSet for marching squares
        const minX = bounds.minX;
        const minY = bounds.minY;
        const w = bounds.maxX - bounds.minX + 1;
        const h = bounds.maxY - bounds.minY + 1;
        if (w <= 0 || h <= 0) return null;

        // Create grid with 1px padding to simplify edges
        const width = w + 2;
        const height = h + 2;
        const grid = new Uint8Array(width * height);
        for (const key of this.node.pixelSet) {
            const [dx, dy] = key.split(',').map(Number);
            const gx = dx - minX + 1;
            const gy = dy - minY + 1;
            if (gx >= 0 && gx < width && gy >= 0 && gy < height) grid[gy * width + gx] = 1;
        }

        const path = new Path2D();
        // Simple marching squares tracing of external contours
        const visited = new Uint8Array(width * height);
        const get = (x,y) => grid[y * width + x];

        for (let y = 0; y < height-1; y++) {
            for (let x = 0; x < width-1; x++) {
                const idx = y * width + x;
                if (visited[idx]) continue;
                const a = get(x,y), b = get(x+1,y), c = get(x+1,y+1), d = get(x,y+1);
                if (!a && !b && !c && !d) continue;

                // trace contour starting at (x,y)
                let cx = x, cy = y;
                const contour = [];
                let guard = 0;
                do {
                    guard++; if (guard > 10000) break;
                    contour.push([cx, cy]);
                    visited[cy * width + cx] = 1;
                    // move right/down/left/up by checking neighbors
                    const na = get(cx, cy), nb = get(cx+1, cy), nc = get(cx+1, cy+1), nd = get(cx, cy+1);
                    const code = (na<<3)|(nb<<2)|(nc<<1)|nd;
                    switch(code) {
                        case 1: cy++; break;
                        case 2: cx++; break;
                        case 3: cx++; break;
                        case 4: cy++; cx++; break;
                        case 5: cy++; break;
                        case 6: cy++; cx++; break;
                        case 7: cx++; break;
                        case 8: cx--; break;
                        case 9: cy++; break;
                        case 10: cx++; break;
                        case 11: cx++; break;
                        case 12: cx--; break;
                        case 13: cx--; break;
                        case 14: cy--; break;
                        default: cx++; break;
                    }
                } while (!(cx === x && cy === y));

                if (contour.length > 2) {
                    // convert contour points to world coordinates and build path
                    path.moveTo(this.node.x + (contour[0][0] + minX - 1) , this.node.y + (contour[0][1] + minY - 1));
                    for (let i = 1; i < contour.length; i++) path.lineTo(this.node.x + (contour[i][0] + minX -1), this.node.y + (contour[i][1] + minY -1));
                    path.closePath();
                }
            }
        }
        return path;
    }
}
