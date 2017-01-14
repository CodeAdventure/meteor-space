import _ from 'underscore';

// Deep object extend for underscore
// As found on http://stackoverflow.com/a/29563346

let deepObjectExtend = function(target, source) {
  for (let prop in source) {
    if (source.hasOwnProperty(prop)) {
      if (target[prop] && typeof source[prop] === 'object') {
        deepObjectExtend(target[prop], source[prop]);
      } else {
        target[prop] = source[prop];
      }
    }
  }
  return target;
};

_.mixin({ 'deepExtend': deepObjectExtend });
