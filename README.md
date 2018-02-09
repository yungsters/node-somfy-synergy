# node-somfy-synergy

A JavaScript interface for the Somfy Synergy API (myLink).

This package was tested using a [Somfy myLink (Rev 2.0)](https://www.somfysystems.com/products/controls/mylink). To find out if your Somfy myLink is Rev 2.0, check out "What is different with the newer myLink (Rev 2.0)?" on the [Somfy myLink FAQ](https://www.somfysystems.com/products/controls/mylink/faq).

## Setup

You will need to use the Somfy myLink mobile app in order to configure your System ID, to obtain your Somfy myLink's IP address, and to obtain the Target IDs for each remotely controlled device.

- Go to "Integration" and set a System ID by tapping "Change System ID" (which can be any string).
- Tap "Get Integration report" to view the System ID, IP address, and Target IDs.

## Example

The `SomfySynergy` class is instantiated with the System ID and IP address of your Somfy myLink.

The `SomfySynergy` class allows you to send the "down", "stop", and "up" commands to each target device.

```js
const synergy = new SomfySynergy('mySystem', '192.168.1.123');

// Open the first set of shades.
const target1 = synergy.target('AB123C45.1');
target1.up();

// Close the second set of shades.
const target2 = synergy.target('AB123C45.2');
target2.down();

// Stop (or go to the favorite position for) the third set of shades.
const target3 = synergy.target('AB123C45.2');
target3.stop();
```

Each command is asynchronous (i.e. returns a promise):

```js
synergy.target('AB123C45.1').up().then(success => {
  if (success) {
    console.log('Opened the first set of shades!');
  } else {
    console.error('Failed to open the first set of shades.');
  }
});
```

### License

node-somfy-synergy is [MIT licensed](./LICENSE).
