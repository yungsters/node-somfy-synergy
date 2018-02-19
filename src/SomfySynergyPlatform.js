'use strict';

const debounce = require('./debounce');

/**
 * Exposes an interface similar to `SomfySynergy`. Unlike `SomfySynergy`, this
 * class will efficiently batch requests into "composite targets".
 *
 * For example, suppose you have three Somfy myLink targets:
 *
 *   - Target A: Left Window Shade
 *   - Target B: Right Window Shade
 *   - Target C: Both Window Shades
 *
 * In other words, Target C is a channel programmed to control both Target A and
 * Target B. You could then instantiate `SomfySynergyPlatform` with:
 *
 *   const platform = new SomfySynergyPlatform(
 *     new SomfySynergy(...),
 *     {
 *       '<Target A>': [],
 *       '<Target B>': [],
 *       '<Target C>': ['<Target A>', '<Target B>'],
 *     }
 *   );
 *
 * Unlike with `SomfySynergy`, sending the same command to multiple targets that
 * are part of the same composite target will lead to de-duplication:
 *
 *   platform.target('<Target A>').up();
 *   platform.target('<Target B>').up();
 *   // Equivalent to...
 *   platform.target('<Target C>').up();
 *
 * This is useful for implementing more synchronized control of targets, whereas
 * Somfy myLink typically incurs a short delay in between each method.
 */
class SomfySynergyPlatform {
  constructor(synergy, targets, delay = 500) {
    this._synergy = synergy;
    this._targets = targets;

    this._pendingRequests = new Map();
    this._scheduleRequests = debounce(this._processRequests, delay);
  }

  send(targetID, method) {
    this._pendingRequests.set(targetID, method);
    this._scheduleRequests();
  }

  target(targetID) {
    return {
      down: () => this.send(targetID, 'mylink.move.down'),
      stop: () => this.send(targetID, 'mylink.move.stop'),
      up: () => this.send(targetID, 'mylink.move.up'),
    };
  }

  _processRequests() {
    const targetIDsByMethod = new Map();

    for (const [targetID, method] of this._pendingRequests) {
      if (!targetIDsByMethod.has(method)) {
        targetIDsByMethod.set(method, new Set());
      }
      targetIDsByMethod.get(method).add(targetID);
    }

    for (const [method, targetIDs] of targetIDsByMethod) {
      for (const targetID of this._reduceTargetIDs(targetIDs)) {
        this._synergy.send(targetID, method);
      }
    }
  }

  _reduceTargetIDs(targetIDs) {
    const reducedIDs = new Set(targetIDs);

    for (const [targetID, composedIDs] of Object.entries(this._targets)) {
      if (reducedIDs.has(targetID) || composedIDs.length === 0) {
        continue;
      }
      if (composedIDs.some(composedID => !reducedIDs.has(composedID))) {
        continue;
      }
      for (const composedID of composedIDs) {
        reducedIDs.delete(composedID);
      }
      reducedIDs.add(targetID);
    }

    return reducedIDs;
  }
}

module.exports = SomfySynergyPlatform;
