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
    return new Promise((resolve, reject) => {
      this._pendingRequests.set(targetID, {method, resolve, reject});
      this._scheduleRequests();
    });
  }

  target(targetID) {
    return {
      down: () => this.send(targetID, 'mylink.move.down'),
      stop: () => this.send(targetID, 'mylink.move.stop'),
      up: () => this.send(targetID, 'mylink.move.up'),
    };
  }

  _processRequests() {
    // Map<Method, Map<TargetID, {resolve, reject}>>
    const requestsByMethod = new Map();

    for (const [targetID, {method, resolve, reject}] of this._pendingRequests) {
      if (!requestsByMethod.has(method)) {
        requestsByMethod.set(method, new Map());
      }
      requestsByMethod.get(method).set(targetID, {resolve, reject});
    }
    this._pendingRequests.clear();

    for (const [method, requests] of requestsByMethod) {
      const reducedRequests = this._reduceRequests(requests);
      for (const [targetID, {resolve, reject}] of reducedRequests) {
        this._synergy.send(targetID, method).then(resolve, reject);
      }
    }
  }

  _reduceRequests(originalRequests) {
    const requests = new Map(originalRequests);

    for (const [targetID, composedIDs] of Object.entries(this._targets)) {
      if (requests.has(targetID) || composedIDs.length === 0) {
        continue;
      }
      if (composedIDs.some(composedID => !requests.has(composedID))) {
        continue;
      }
      const composite = new Promise((resolve, reject) => {
        requests.set(targetID, {resolve, reject});
      });
      for (const composedID of composedIDs) {
        const {resolve, reject} = requests.get(composedID);
        composite.then(resolve, reject);
        requests.delete(composedID);
      }
    }

    return requests;
  }
}

module.exports = SomfySynergyPlatform;
