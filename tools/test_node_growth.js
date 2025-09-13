// Minimal test harness for Node growth logic
const { Node } = require('../js/Node.js');
const { CONFIG } = require('../js/config.js');

// Shim a minimal simulation object expected by Node, including an individualPool stub
let _idCounter = 0;
const sim = {
    CONFIG: CONFIG,
    nodeGrid: {
        queryBox: () => []
    },
    mergeNodes: () => {},
    // array where spawn() will push new individuals
    individuals: [],
    totalIndividualsSpawned: 0,
    updateStats: function() { /* noop for test harness */ },
    // Minimal Individual class to exercise spawn, movement and death/drop
    individuals: [],
    _deadIndividuals: [],
    individualPool: {
        acquire: (node) => {
            class Individual {
                constructor(parent) {
                    this.id = ++_idCounter;
                    this.parentNode = parent;
                    this.x = parent.x;
                    this.y = parent.y;
                    this.energy = 20; // energy used for movement/life
                    this.willDropNodeOnDeath = false;
                    this.ignoreFood = false;
                }
                // simple step: move randomly and consume energy; return true if still alive
                step() {
                    // move up to 1 unit randomly
                    this.x += Math.floor(Math.random() * 3) - 1;
                    this.y += Math.floor(Math.random() * 3) - 1;
                    this.energy -= 1;
                    if (this.energy <= 0) {
                        this.die();
                        return false;
                    }
                    return true;
                }
                die() {
                    // if flagged, drop a new tiny node at current location (simulate nutrient drop)
                    if (this.willDropNodeOnDeath) {
                        sim._deadIndividuals.push({ x: this.x, y: this.y });
                    }
                }
                assignSpecialization() { /* noop for harness */ }
            }

            const inst = new Individual(node);
            sim.individuals.push(inst);
            return inst;
        },
        release: (ind) => {
            // remove from active list if present
            const idx = sim.individuals.indexOf(ind);
            if (idx >= 0) sim.individuals.splice(idx, 1);
        }
    }
};

function test() {
    const node = new Node(100, 100);
    node.simulation = sim;
    // Wrap spawn to log calls/results for the test harness
    const _origSpawn = node.spawn.bind(node);
    node.spawn = function() {
        console.log('[harness] spawn() called; food before:', this.food, 'lastSpawnTime:', this.lastSpawnTime);
        const res = _origSpawn();
        console.log('[harness] spawn() returned', res, 'food after:', this.food, 'lastSpawnTime:', this.lastSpawnTime);
        return res;
    };
    // Wrap scheduleSpawnAttempt to log scheduling
    const _origSchedule = node.scheduleSpawnAttempt.bind(node);
    node.scheduleSpawnAttempt = function() {
        console.log('[harness] scheduleSpawnAttempt invoked');
        return _origSchedule();
    };
    console.log('Initial pixels:', node.pixels.length);
    // Simulate depositing 35 food units to trigger spawning (10 food per spawn)
    node.storeFood(35, null, { x: 102, y: 100 });
    console.log('After storeFood, queue length expected >0');
    console.log('node.food immediately after storeFood:', node.food);
    // Run a few update ticks
    for (let i = 0; i < 60; i++) {
        node.update();
        console.log(`Tick ${i}: pixels=${node.pixels.length}, queue=${node.growthManager._growthQueue.length}`);
    }
    console.log('Individuals spawned:', sim.individuals.length, 'totalIndividualsSpawned:', sim.totalIndividualsSpawned);

    // Step individuals a few times to exercise movement and death/drop
    for (let step = 0; step < 30; step++) {
        for (let j = sim.individuals.length - 1; j >= 0; j--) {
            const ind = sim.individuals[j];
            const alive = ind.step();
            if (!alive) {
                // release back to pool
                sim.individualPool.release(ind);
            }
        }
    }

    console.log('Dead individual drops recorded:', sim._deadIndividuals.length);
}

try { test(); } catch (e) { console.error('Error during test:', e); process.exit(1); }
