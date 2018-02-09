'use strict';

const net = require('net');

class SomfySynergy {
  constructor(systemID, address, port = 44100) {
    this._systemID = systemID;
    this._address = address;
    this._port = port;
  }

  send(targetID, method) {
    validateTargetID(targetID);
    const id = 1; // We only use each connection for a single request.
    const request = {
      id,
      method,
      params: {
        auth: this._systemID,
        targetID,
      },
    };
    return send(this._address, this._port, request).then(
      response => response.result,
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

const connect = (address, port) => {
  return new Promise((resolve, reject) => {
    const client = net.createConnection(port, address, error => {
      if (error == null) {
        resolve(client);
      } else {
        reject(error);
      }
    });
    client.setEncoding('utf8');
  });
};

const send = (address, port, request) => {
  return connect(address, port).then(
    client =>
      new Promise((resolve, reject) => {
        client.write(JSON.stringify(request), error => {
          if (error != null) {
            reject(error);
          }
        });
        client.on('data', data => {
          resolve(JSON.parse(data));
          client.end();
        });
      }),
  );
};

const validateTargetID = targetID => {
  if (!/[A-Z0-9]+\.[0-9]+/.test(targetID)) {
    throw new Error('Invalid Synergy `targetID`: ' + targetID);
  }
};

module.exports = SomfySynergy;
