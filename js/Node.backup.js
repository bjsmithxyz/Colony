import { CONFIG } from './config.js';
import { Individual } from './Individual.js';

export class Node {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.food = 0;
        this.individuals = [];
        this.color = CONFIG.NODE.COLOR;
        this.size = CONFIG.NODE.SIZE;
        this.pulseAnimation = 0;
        this.simulation = null;
        
        // 8-directional growth tracking with support requirements
        this.growthDirections = {
            north: { length: 0, supportLevel: 0 },
            northeast: { length: 0, supportLevel: 0 },
            east: { length: 0, supportLevel: 0 },
            southeast: { length: 0, supportLevel: 0 },
            south: { length: 0, supportLevel: 0 },
            southwest: { length: 0, supportLevel: 0 },
            west: { length: 0, supportLevel: 0 },
            northwest: { length: 0, supportLevel: 0 }
        };
        this.totalGrowth = 0;
        this.lastFoodAmount = 0;
        
        // Generate organic starting shape
        this.pixels = [];
        this.generateOrganicShape();
    }

    update() {
        // Update size for compatibility (use largest dimension)
        const maxLength = Math.max(...Object.values(this.growthDirections).map(g => g.length));
        this.size = CONFIG.NODE.SIZE + maxLength * 2; // *2 because growth can be in both directions
        
        if (this.pulseAnimation > 0) {
            this.pulseAnimation -= 0.05;
        }
    }
    
    generateOrganicShape() {
        // Generate a small organic cluster of pixels around the center
        const visited = new Set();
        const toVisit = [[0, 0]]; // Relative to node center
        const targetPixels = CONFIG.NODE.SIZE * CONFIG.NODE.SIZE; // Start with area equivalent to original square
        
        while (this.pixels.length < targetPixels && toVisit.length > 0) {
            const randomIndex = Math.floor(Math.random() * toVisit.length);
            const [dx, dy] = toVisit.splice(randomIndex, 1)[0];
            
            const key = `${dx},${dy}`;
            if (visited.has(key)) continue;
            visited.add(key);
            
            // Keep within reasonable bounds
            if (Math.abs(dx) <= CONFIG.NODE.SIZE && Math.abs(dy) <= CONFIG.NODE.SIZE) {
                this.pixels.push({ dx, dy });
                
                // Add neighbors for potential growth
                const neighbors = [
                    [dx + 1, dy], [dx - 1, dy],
                    [dx, dy + 1], [dx, dy - 1],
                    [dx + 1, dy + 1], [dx - 1, dy - 1],
                    [dx + 1, dy - 1], [dx - 1, dy + 1]
                ];
                
                neighbors.forEach(([nx, ny]) => {
                    if (!visited.has(`${nx},${ny}`)) {
                        toVisit.push([nx, ny]);
                    }
                });
            }
        }
    }

    spawn() {
        // Check if node has enough food (10 food cost)
        if (this.simulation && this.food >= 10) {
            const individual = this.simulation.individualPool.acquire(this);
            
            // Apply specialization if enabled
            if (this.specializationEnabled) {
                individual.assignSpecialization();
            }
            
            // Deduct food cost
            this.food -= 10;
            
            this.simulation.individuals.push(individual);
            this.individuals.push(individual);
            this.simulation.totalIndividualsSpawned++;
            this.pulseAnimation = 1;
            // Individual spawned successfully
            return true;
        }
        return false;
    }
    
    canSpawn() {
        return this.food >= 10;
    }

    storeFood(amount, sourceDirection = null, depositLocation = null) {
        this.food += amount;
        if (this.simulation && amount > 0) {
            this.simulation.totalFoodCollected += amount;
        }
        
        // Track growth direction based on food source
        if (sourceDirection && amount > 0) {
            // Every 5 food causes 1 pixel growth in the source direction
            const newGrowthPixels = Math.floor(this.food / 5) - Math.floor(this.lastFoodAmount / 5);
            if (newGrowthPixels > 0) {
                // Grow from the deposit location if provided, otherwise from center
                if (depositLocation) {
                    this.growFromLocation(depositLocation, sourceDirection, newGrowthPixels);
                } else {
                    this.growInDirection(sourceDirection, newGrowthPixels);
                }
            }
        }
        
        this.lastFoodAmount = this.food;
    }
    
    growInDirection(direction, pixels) {
        const growthData = this.growthDirections[direction];
        
        for (let i = 0; i < pixels; i++) {
            // Add length pixel first
            this.addPixelInDirection(direction);
            growthData.length++;
            this.totalGrowth++;
            
            // Check if we just reached a support milestone (5, 10, 15...)
            if (growthData.length % 5 === 0) {
                const requiredSupport = Math.floor(growthData.length / 5) * 2;
                if (growthData.supportLevel < requiredSupport) {
                    // Add support pixels after reaching milestone
                    const supportToAdd = requiredSupport - growthData.supportLevel;
                    this.addSupportPixels(direction, supportToAdd);
                    growthData.supportLevel = requiredSupport;
                }
            }
        }
    }
    
    addPixelInDirection(direction) {
        // Find the edge pixels in the specified direction
        const directionVectors = {
            north: { dx: 0, dy: -1 },
            northeast: { dx: 1, dy: -1 },
            east: { dx: 1, dy: 0 },
            southeast: { dx: 1, dy: 1 },
            south: { dx: 0, dy: 1 },
            southwest: { dx: -1, dy: 1 },
            west: { dx: -1, dy: 0 },
            northwest: { dx: -1, dy: -1 }
        };
        
        const vector = directionVectors[direction];
        if (!vector) return;
        
        // Find existing pixels at the edge in this direction
        let maxDistance = -Infinity;
        let edgePixels = [];
        
        this.pixels.forEach(pixel => {
            const distance = pixel.dx * vector.dx + pixel.dy * vector.dy;
            if (distance > maxDistance) {
                maxDistance = distance;
                edgePixels = [pixel];
            } else if (distance === maxDistance) {
                edgePixels.push(pixel);
            }
        });
        
        // Add a new pixel adjacent to one of the edge pixels
        if (edgePixels.length > 0) {
            const randomEdgePixel = edgePixels[Math.floor(Math.random() * edgePixels.length)];
            const newPixel = {
                dx: randomEdgePixel.dx + vector.dx,
                dy: randomEdgePixel.dy + vector.dy
            };
            
            // Check if this pixel already exists
            const exists = this.pixels.some(p => p.dx === newPixel.dx && p.dy === newPixel.dy);
            if (!exists) {
                this.pixels.push(newPixel);
            }
        }
    }
    
    addSupportPixels(direction, count) {
        // Add support pixels to thicken the growth in the specified direction
        const directionVectors = {
            north: { dx: 0, dy: -1, perpendicular: [{dx: 1, dy: 0}, {dx: -1, dy: 0}] },
            northeast: { dx: 1, dy: -1, perpendicular: [{dx: -1, dy: 0}, {dx: 0, dy: -1}] },
            east: { dx: 1, dy: 0, perpendicular: [{dx: 0, dy: 1}, {dx: 0, dy: -1}] },
            southeast: { dx: 1, dy: 1, perpendicular: [{dx: 0, dy: -1}, {dx: -1, dy: 0}] },
            south: { dx: 0, dy: 1, perpendicular: [{dx: 1, dy: 0}, {dx: -1, dy: 0}] },
            southwest: { dx: -1, dy: 1, perpendicular: [{dx: 0, dy: -1}, {dx: 1, dy: 0}] },
            west: { dx: -1, dy: 0, perpendicular: [{dx: 0, dy: 1}, {dx: 0, dy: -1}] },
            northwest: { dx: -1, dy: -1, perpendicular: [{dx: 0, dy: 1}, {dx: 1, dy: 0}] }
        };
        
        const vector = directionVectors[direction];
        if (!vector) return;
        
        // Find pixels in the growth direction, focusing on the closest ones to the center
        const growthPixels = this.pixels.filter(pixel => {
            const distance = pixel.dx * vector.dx + pixel.dy * vector.dy;
            return distance > 0 && distance <= 3; // Focus on closest growth pixels
        }).sort((a, b) => {
            // Sort by distance from center
            const distA = Math.abs(a.dx) + Math.abs(a.dy);
            const distB = Math.abs(b.dx) + Math.abs(b.dy);
            return distA - distB;
        });
        
        let supportAdded = 0;
        
        // Add support pixels perpendicular to the growth direction
        for (let attempt = 0; attempt < count * 3 && supportAdded < count; attempt++) {
            if (growthPixels.length === 0) break;
            
            // Prioritize pixels closer to the center for support
            const pixelIndex = Math.min(attempt % growthPixels.length, growthPixels.length - 1);
            const growthPixel = growthPixels[pixelIndex];
            const perpendicular = vector.perpendicular[attempt % 2]; // Alternate sides
            
            const supportPixel = {
                dx: growthPixel.dx + perpendicular.dx,
                dy: growthPixel.dy + perpendicular.dy
            };
            
            // Check if this pixel already exists
            const exists = this.pixels.some(p => p.dx === supportPixel.dx && p.dy === supportPixel.dy);
            if (!exists) {
                this.pixels.push(supportPixel);
                supportAdded++;
            }
        }
    }
    
    growFromLocation(depositPixel, direction, pixels) {
        const directionVectors = {
            north: { dx: 0, dy: -1 },
            northeast: { dx: 1, dy: -1 },
            east: { dx: 1, dy: 0 },
            southeast: { dx: 1, dy: 1 },
            south: { dx: 0, dy: 1 },
            southwest: { dx: -1, dy: 1 },
            west: { dx: -1, dy: 0 },
            northwest: { dx: -1, dy: -1 }
        };
        
        const vector = directionVectors[direction];
        if (!vector) return;
        
        // Track all growth pixels for this growth event
        const newGrowthPixels = [];
        
        // Start from the deposit location and grow outward
        let currentPixel = depositPixel;
        
        for (let i = 0; i < pixels; i++) {
            // Calculate new pixel position in the growth direction
            const newPixel = {
                dx: currentPixel.dx + vector.dx,
                dy: currentPixel.dy + vector.dy
            };
            
            // Check if this pixel already exists
            const exists = this.pixels.some(p => p.dx === newPixel.dx && p.dy === newPixel.dy);
            if (!exists) {
                this.pixels.push(newPixel);
                newGrowthPixels.push(newPixel);
                currentPixel = newPixel; // Continue growing from this new pixel
            } else {
                // If pixel exists, try to find an adjacent empty spot
                const adjacentOffsets = [
                    { dx: vector.dx + 1, dy: vector.dy },
                    { dx: vector.dx - 1, dy: vector.dy },
                    { dx: vector.dx, dy: vector.dy + 1 },
                    { dx: vector.dx, dy: vector.dy - 1 }
                ];
                
                let placed = false;
                for (const offset of adjacentOffsets) {
                    const altPixel = {
                        dx: currentPixel.dx + offset.dx,
                        dy: currentPixel.dy + offset.dy
                    };
                    
                    const altExists = this.pixels.some(p => p.dx === altPixel.dx && p.dy === altPixel.dy);
                    if (!altExists) {
                        this.pixels.push(altPixel);
                        newGrowthPixels.push(altPixel);
                        currentPixel = altPixel;
                        placed = true;
                        break;
                    }
                }
                
                if (!placed) break; // Can't grow further
            }
        }
        
        // Now add comprehensive thickness to all new growth pixels
        this.addThicknessToGrowth(newGrowthPixels, direction);
    }
    
    addThicknessToGrowth(growthPixels, direction) {
        // Define perpendicular directions for thickness
        const thicknessDirections = {
            north: [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }],      // east/west
            south: [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }],      // east/west
            east: [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }],       // north/south
            west: [{ dx: 0, dy: 1 }, { dx: 0, dy: -1 }],       // north/south
            northeast: [{ dx: -1, dy: 1 }, { dx: 1, dy: -1 }], // perpendicular diagonals
            northwest: [{ dx: 1, dy: 1 }, { dx: -1, dy: -1 }], // perpendicular diagonals
            southeast: [{ dx: -1, dy: 1 }, { dx: 1, dy: -1 }], // perpendicular diagonals
            southwest: [{ dx: 1, dy: 1 }, { dx: -1, dy: -1 }]  // perpendicular diagonals
        };
        
        const perpDirs = thicknessDirections[direction] || [
            { dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }
        ];
        
        // For each growth pixel, add thickness pixels around it
        for (const growthPixel of growthPixels) {
            // Add 2 pixels of thickness on each side
            for (let thickness = 1; thickness <= 2; thickness++) {
                for (const perpDir of perpDirs) {
                    const thickPixel = {
                        dx: growthPixel.dx + (perpDir.dx * thickness),
                        dy: growthPixel.dy + (perpDir.dy * thickness)
                    };
                    
                    // Check if this pixel already exists
                    const exists = this.pixels.some(p => p.dx === thickPixel.dx && p.dy === thickPixel.dy);
                    if (!exists) {
                        this.pixels.push(thickPixel);
                    }
                }
            }
            
            // Also add diagonal thickness for more organic shape
            const diagonalOffsets = [
                { dx: 1, dy: 1 }, { dx: -1, dy: -1 },
                { dx: 1, dy: -1 }, { dx: -1, dy: 1 }
            ];
            
            for (const diagOffset of diagonalOffsets) {
                const diagPixel = {
                    dx: growthPixel.dx + diagOffset.dx,
                    dy: growthPixel.dy + diagOffset.dy
                };
                
                const exists = this.pixels.some(p => p.dx === diagPixel.dx && p.dy === diagPixel.dy);
                if (!exists) {
                    this.pixels.push(diagPixel);
                }
            }
        }
    }
    
    getClosestPixelTo(x, y) {
        // Find the closest pixel in the node to the given coordinates
        let closestPixel = null;
        let minDistance = Infinity;
        
        for (const pixel of this.pixels) {
            const px = this.x + pixel.dx;
            const py = this.y + pixel.dy;
            const distance = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
            
            if (distance < minDistance) {
                minDistance = distance;
                closestPixel = { x: px, y: py, pixel: pixel };
            }
        }
        
        return closestPixel;
    }

    render(ctx) {
        // Calculate bounds for effects
        let minX = 0, maxX = 0, minY = 0, maxY = 0;
        if (this.pixels.length > 0) {
            minX = Math.min(...this.pixels.map(p => p.dx));
            maxX = Math.max(...this.pixels.map(p => p.dx));
            minY = Math.min(...this.pixels.map(p => p.dy));
            maxY = Math.max(...this.pixels.map(p => p.dy));
        }
        
        // Render beacon effect
        if (this.beaconActive && this.beaconAnimation !== undefined) {
            const beaconRadius = 15 + Math.sin(this.beaconAnimation) * 8;
            const beaconOpacity = 0.2 + Math.sin(this.beaconAnimation) * 0.15;
            
            ctx.beginPath();
            ctx.arc(this.x, this.y, beaconRadius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(76, 175, 80, ${beaconOpacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }
        
        // Render pulse animation when spawning
        if (this.pulseAnimation > 0) {
            const pulseInflation = Math.sin(this.pulseAnimation * Math.PI) * 3;
            ctx.fillStyle = `rgba(76, 175, 80, ${0.3 * this.pulseAnimation})`;
            ctx.fillRect(
                this.x + minX - pulseInflation,
                this.y + minY - pulseInflation,
                (maxX - minX + 1) + pulseInflation * 2,
                (maxY - minY + 1) + pulseInflation * 2
            );
        }
        
        // Render organic pixel-based node (optimized batching)
        ctx.fillStyle = this.color;
        
        // For performance, batch adjacent pixels where possible
        if (this.pixels.length > 100) {
            // Use ImageData for large pixel counts
            const imageData = ctx.createImageData(1, 1);
            const data = imageData.data;
            
            // Extract RGB from color
            const color = this.color.startsWith('#') ? this.color.slice(1) : this.color;
            const r = parseInt(color.substr(0, 2), 16);
            const g = parseInt(color.substr(2, 2), 16);
            const b = parseInt(color.substr(4, 2), 16);
            
            data[0] = r;
            data[1] = g;
            data[2] = b;
            data[3] = 255; // alpha
            
            this.pixels.forEach(pixel => {
                ctx.putImageData(imageData, this.x + pixel.dx, this.y + pixel.dy);
            });
        } else {
            // Use fillRect for smaller pixel counts
            this.pixels.forEach(pixel => {
                ctx.fillRect(this.x + pixel.dx, this.y + pixel.dy, 1, 1);
            });
        }
    }
}