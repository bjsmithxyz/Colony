/**
 * Node Growth Manager
 * Handles all growth logic, direction tracking, and pixel expansion for nodes
 */
export class NodeGrowthManager {
    constructor(node) {
        this.node = node;
        
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
    }

    /**
     * Trigger growth based on food storage
     */
    processGrowth(amount, sourceDirection = null, depositLocation = null) {
        if (sourceDirection && amount > 0) {
            // Every 5 food causes 1 pixel growth in the source direction
            const newGrowthPixels = Math.floor(this.node.food / 5) - Math.floor(this.node.lastFoodAmount / 5);
            if (newGrowthPixels > 0) {
                // Grow from the deposit location if provided, otherwise from center
                if (depositLocation) {
                    this.growFromLocation(depositLocation, sourceDirection, newGrowthPixels);
                } else {
                    this.growInDirection(sourceDirection, newGrowthPixels);
                }
            }
        }
    }

    /**
     * Grow in a specific direction with pixel count
     */
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

    /**
     * Add a single pixel in a direction
     */
    addPixelInDirection(direction) {
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

        // Find the furthest pixel in this direction and add a new one
        const existingPixels = this.node.pixels.filter(pixel => {
            const distance = pixel.dx * vector.dx + pixel.dy * vector.dy;
            return distance > 0;
        });

        let newPixel;
        if (existingPixels.length === 0) {
            // First pixel in this direction
            newPixel = { dx: vector.dx, dy: vector.dy };
        } else {
            // Find the furthest pixel
            const furthest = existingPixels.reduce((max, pixel) => {
                const distance = pixel.dx * vector.dx + pixel.dy * vector.dy;
                const maxDistance = max.dx * vector.dx + max.dy * vector.dy;
                return distance > maxDistance ? pixel : max;
            });

            newPixel = {
                dx: furthest.dx + vector.dx,
                dy: furthest.dy + vector.dy
            };
        }

        // Check if pixel already exists
        const exists = this.node.pixels.some(p => p.dx === newPixel.dx && p.dy === newPixel.dy);
        if (!exists) {
            this.node.pixels.push(newPixel);
        }
    }

    /**
     * Add support pixels for structural integrity
     */
    addSupportPixels(direction, count) {
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
        const growthPixels = this.node.pixels.filter(pixel => {
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
            const exists = this.node.pixels.some(p => p.dx === supportPixel.dx && p.dy === supportPixel.dy);
            if (!exists) {
                this.node.pixels.push(supportPixel);
                supportAdded++;
            }
        }
    }

    /**
     * Grow from a specific location (used for deposit-based growth)
     */
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
        
        let currentPixel = depositPixel;
        const newGrowthPixels = [];
        
        // Add growth pixels in the specified direction
        for (let i = 0; i < pixels; i++) {
            // Try to add pixel in the direction
            const newPixel = {
                dx: currentPixel.dx + vector.dx,
                dy: currentPixel.dy + vector.dy
            };
            
            const exists = this.node.pixels.some(p => p.dx === newPixel.dx && p.dy === newPixel.dy);
            if (!exists) {
                this.node.pixels.push(newPixel);
                newGrowthPixels.push(newPixel);
                currentPixel = newPixel;
            } else {
                // Try alternative positions if blocked
                const alternatives = [
                    { dx: newPixel.dx + 1, dy: newPixel.dy },
                    { dx: newPixel.dx - 1, dy: newPixel.dy },
                    { dx: newPixel.dx, dy: newPixel.dy + 1 },
                    { dx: newPixel.dx, dy: newPixel.dy - 1 }
                ];
                
                let placed = false;
                for (const altPixel of alternatives) {
                    const altExists = this.node.pixels.some(p => p.dx === altPixel.dx && p.dy === altPixel.dy);
                    if (!altExists) {
                        this.node.pixels.push(altPixel);
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

    /**
     * Add thickness to growth for more organic appearance
     */
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
                    const exists = this.node.pixels.some(p => p.dx === thickPixel.dx && p.dy === thickPixel.dy);
                    if (!exists) {
                        this.node.pixels.push(thickPixel);
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
                
                const exists = this.node.pixels.some(p => p.dx === diagPixel.dx && p.dy === diagPixel.dy);
                if (!exists) {
                    this.node.pixels.push(diagPixel);
                }
            }
        }
    }

    /**
     * Get the maximum growth extent in any direction (for size calculation)
     */
    getMaxGrowthExtent() {
        return Math.max(...Object.values(this.growthDirections).map(g => g.length));
    }
}
