import { CONFIG } from './config.js';

export class FoodSource {
    constructor(x, y) {
        this.centerX = x;
        this.centerY = y;
        this.pixels = [];
        this.revealed = false;
        this.depleted = false;
        
        // Random starting food amount (20-500)
        this.maxFood = Math.floor(Math.random() * (500 - 20 + 1)) + 20;
        this.remainingFood = this.maxFood;
        this.maxPixels = Math.min(this.maxFood, 100); // Cap visual size for performance
        
        this.revealAnimation = 0;
        
        this.generate();
    }

    generate() {
        const visited = new Set();
        const toVisit = [[this.centerX, this.centerY]];
        
        while (this.pixels.length < this.maxPixels && toVisit.length > 0) {
            const randomIndex = Math.floor(Math.random() * toVisit.length);
            const [x, y] = toVisit.splice(randomIndex, 1)[0];
            
            const key = `${x},${y}`;
            if (visited.has(key)) continue;
            visited.add(key);
            
            if (x >= 0 && x < CONFIG.MAP.WIDTH && y >= 0 && y < CONFIG.MAP.HEIGHT) {
                this.pixels.push({ x, y });
                
                const neighbors = [
                    [x + 1, y], [x - 1, y],
                    [x, y + 1], [x, y - 1],
                    [x + 1, y + 1], [x - 1, y - 1],
                    [x + 1, y - 1], [x - 1, y + 1]
                ];
                
                neighbors.forEach(([nx, ny]) => {
                    if (!visited.has(`${nx},${ny}`)) {
                        toVisit.push([nx, ny]);
                    }
                });
            }
        }
    }

    reveal() {
        if (!this.revealed) {
            this.revealed = true;
            this.revealAnimation = 0;
        }
    }

    deplete(amount) {
        this.remainingFood -= amount;
        if (this.remainingFood <= 0) {
            this.depleted = true;
            this.remainingFood = 0;
        }
        return Math.min(amount, this.remainingFood + amount);
    }

    containsPoint(x, y) {
        return this.pixels.some(pixel => pixel.x === Math.floor(x) && pixel.y === Math.floor(y));
    }

    getDistance(x, y) {
        let minDist = Infinity;
        this.pixels.forEach(pixel => {
            const dist = Math.sqrt((pixel.x - x) ** 2 + (pixel.y - y) ** 2);
            minDist = Math.min(minDist, dist);
        });
        return minDist;
    }

    render(ctx) {
        if (this.depleted) return;
        
        if (this.revealed && this.revealAnimation < 1) {
            this.revealAnimation = Math.min(1, this.revealAnimation + 0.05);
        }
        
        // Calculate how many pixels to show based on remaining food
        const foodPercentage = this.remainingFood / this.maxFood;
        const pixelsToShow = Math.ceil(this.pixels.length * foodPercentage);
        
        if (this.revealed) {
            const opacity = this.revealAnimation;
            ctx.globalAlpha = opacity;
            ctx.fillStyle = CONFIG.FOOD.COLOR_REVEALED;
            // Only render the first N pixels based on remaining food
            for (let i = 0; i < pixelsToShow; i++) {
                const pixel = this.pixels[i];
                ctx.fillRect(pixel.x, pixel.y, 1, 1);
            }
            ctx.globalAlpha = 1;
        } else {
            ctx.fillStyle = CONFIG.FOOD.COLOR_HIDDEN;
            // Only render the first N pixels based on remaining food
            for (let i = 0; i < pixelsToShow; i++) {
                const pixel = this.pixels[i];
                ctx.fillRect(pixel.x, pixel.y, 1, 1);
            }
        }
    }
}