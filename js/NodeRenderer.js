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
        
        // Render pulse animation when spawning
        this.renderPulseAnimation(ctx, bounds);
        
        // Render the main node body
        this.renderNodeBody(ctx);

        // If this node participates in a shared pool, render a small label with shared total
        if (this.node.sharedPool) {
            this.renderSharedPoolLabel(ctx);
        }

        // If this node was created by a dropper (recently dropped), render a subtle halo
        if (this.node.droppedNode) {
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

    renderSharedPoolLabel(ctx) {
        const label = `${this.node.food || 0}`;
        ctx.save();
        ctx.font = '10px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 2;
        // Position label slightly above node center
        ctx.strokeText(label, this.node.x + 6, this.node.y - 6);
        ctx.fillText(label, this.node.x + 6, this.node.y - 6);
        ctx.restore();
    }

    renderDroppedHalo(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.node.x, this.node.y, Math.max(8, this.node.size / 2), 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(100, 149, 237, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
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
