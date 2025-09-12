/**
 * Node Renderer
 * Handles all rendering and visual effects for nodes
 */
export class NodeRenderer {
    constructor(node) {
        this.node = node;
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
        this.renderNodeBody(ctx);

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
}
