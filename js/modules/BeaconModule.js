import { Module } from '../Module.js';

export class BeaconModule extends Module {
    constructor() {
        super({
            id: 'beacon_signal',
            name: 'Beacon Signal',
            description: 'Node emits a pulsing signal that helps individuals navigate back',
            type: 'visual',
            cost: 12,
            stackable: false,
            requirements: []
        });
        this.beaconAnimation = 0;
        this.beaconSpeed = 0.05;
    }

    applyEffects(target, simulation) {
        target.beaconActive = true;
        target.beaconAnimation = 0;
    }

    removeEffects(target, simulation) {
        target.beaconActive = false;
        target.beaconAnimation = 0;
    }

    update(target, simulation) {
        if (target.beaconActive) {
            target.beaconAnimation += this.beaconSpeed;
            if (target.beaconAnimation > Math.PI * 2) {
                target.beaconAnimation = 0;
            }
        }
    }
}