'use strict';

const {default: SocketPool} = require('socket-pool');

class SomfySynergy {
  constructor(systemID, host, port = 44100) {
    this._nextID = 1;
    this._socketPool = new SocketPool({
      connect: {host, port},
    });
    this._systemID = systemID;
  }

  send(targetID, method) {
    validateTargetID(targetID);
    const id = this._nextID++;
    const request = {
      id,
      method,
      params: {
        auth: this._systemID,
        targetID,
      },
    };
    return this._socketPool.acquire().then(
      socket =>
        new Promise((resolve, reject) => {
          socket.write(JSON.stringify(request), error => {
            if (error != null) {
              reject(error);
            }
          });
          socket.on('data', data => {
            try {
              const response = JSON.parse(data.toString());
              if (response.id === id) {
                resolve(response.result);
                socket.release();
              }
            } catch (error) {
              reject(error);
              socket.release();
            }
          });
        }),
    );
  }

  target(targetID) {
    validateTargetID(targetID);
    return {
      down: () => this.send(targetID, 'mylink.move.down'),
      stop: () => this.send(targetID, 'mylink.move.stop'),
      up: () => this.send(targetID, 'mylink.move.up'),
    };
  }
}

const validateTargetID = targetID => {
  if (!/[A-Z0-9]+\.[0-9]+/.test(targetID)) {
    throw new Error('Invalid Synergy `targetID`: ' + targetID);
  }
};

module.exports = SomfySynergy;
