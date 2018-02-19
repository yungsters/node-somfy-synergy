'use strict';

const debounce = (callback, delay) => {
  let timeoutID = null;
  return function(...args) {
    if (timeoutID != null) {
      clearTimeout(timeoutID);
      timeoutID = null;
    }
    timeoutID = setTimeout(() => {
      callback.apply(this, args);
    }, delay);
  };
};

module.exports = debounce;
