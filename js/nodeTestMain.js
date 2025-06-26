import { SimulationRefactored } from './SimulationRefactored.js';

// Create a specialized test for the refactored Node components
class NodeRefactorTest {
    constructor(canvas) {
        this.canvas = canvas;
        this.simulation = new SimulationRefactored(canvas);
        this.nodeRefactored = null;
        
        this.setupTestEventListeners();
        this.logTestInfo();
    }
    
    async initialize() {
        // Import the refactored Node class
        const { Node } = await import('./NodeRefactored.js');
        this.nodeRefactored = Node;
        this.simulation.Node = Node;
    }

    setupTestEventListeners() {
        // Add test-specific event listeners
        document.addEventListener('DOMContentLoaded', () => {
            const testBtn = document.createElement('button');
            testBtn.textContent = 'Run Node Tests';
            testBtn.className = 'btn';
            testBtn.onclick = () => this.runNodeTests();
            
            const controls = document.querySelector('.controls');
            if (controls) {
                controls.appendChild(testBtn);
            }
        });
    }

    runNodeTests() {
        console.log('=== NODE REFACTORING TESTS ===');
        
        if (!this.nodeRefactored) {
            console.error('❌ NodeRefactored class not loaded');
            return;
        }
        
        // Test 1: Node Creation
        console.log('Test 1: Creating refactored node...');
        const testNode = new this.nodeRefactored(400, 300);
        console.log('✅ Node created successfully');
        console.log('- Has growthManager:', !!testNode.growthManager);
        console.log('- Has renderer:', !!testNode.renderer);
        console.log('- Has shapeGenerator:', !!testNode.shapeGenerator);
        console.log('- Initial pixels:', testNode.pixels.length);
        
        // Test 2: Growth Functionality
        console.log('\nTest 2: Testing growth system...');
        const initialPixels = testNode.pixels.length;
        testNode.storeFood(15, 'north'); // Should trigger growth
        console.log('✅ Growth triggered');
        console.log('- Pixels before:', initialPixels);
        console.log('- Pixels after:', testNode.pixels.length);
        console.log('- Growth extent:', testNode.growthManager.getMaxGrowthExtent());
        
        // Test 3: Shape Generation
        console.log('\nTest 3: Testing shape operations...');
        const bounds = testNode.getBounds();
        const closest = testNode.getClosestPixelTo(400, 300);
        console.log('✅ Shape operations working');
        console.log('- Bounds:', bounds);
        console.log('- Closest pixel found:', !!closest);
        
        // Test 4: Rendering
        console.log('\nTest 4: Testing rendering...');
        const testCtx = this.canvas.getContext('2d');
        try {
            testNode.render(testCtx);
            console.log('✅ Rendering successful');
        } catch (error) {
            console.error('❌ Rendering failed:', error);
        }
        
        // Test 5: Add to simulation
        console.log('\nTest 5: Adding to simulation...');
        this.simulation.nodes.push(testNode);
        testNode.simulation = this.simulation;
        console.log('✅ Node integrated with simulation');
        
        console.log('\n=== ALL TESTS COMPLETED ===');
        console.log('Check console for detailed results');
    }

    logTestInfo() {
        console.log('Node Refactoring Test Environment Loaded');
        console.log('Architecture Components:');
        console.log('- NodeRefactored.js: Core state management');
        console.log('- NodeGrowthManager.js: Growth algorithms');
        console.log('- NodeRenderer.js: Visual effects');
        console.log('- NodeShapeGenerator.js: Organic shapes');
        console.log('Use runNodeTests() to execute tests');
    }

    start() {
        this.simulation.start();
    }

    showLoadingScreen() {
        this.simulation.showLoadingScreen();
    }

    hideLoadingScreen() {
        this.simulation.hideLoadingScreen();
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const canvas = document.getElementById('simulationCanvas');
        
        if (!canvas) {
            throw new Error('Canvas element with id "simulationCanvas" not found');
        }

        console.log('Initializing Node Refactoring Test...');
        const test = new NodeRefactorTest(canvas);
        
        // Initialize async components
        await test.initialize();
        
        // Show loading screen initially
        test.showLoadingScreen();
        
        // Hide loading screen after initialization
        setTimeout(() => {
            test.hideLoadingScreen();
            test.start();
            console.log('Node Refactoring Test started successfully');
        }, 1500);
        
        // Make test available globally
        window.nodeTest = test;
        window.runNodeTests = () => test.runNodeTests();
        
        console.log('Node tests available: runNodeTests()');
        
    } catch (error) {
        console.error('Failed to initialize Node Refactoring Test:', error);
        console.error('Stack trace:', error.stack);
    }
});
