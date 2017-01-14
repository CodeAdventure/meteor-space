import {isNil} from 'lodash';
import Space from '../../lib/space.js';

// Not available on browsers
if (isNil(global)) {
  const global = this;
}

describe('Space.resolvePath', function() {

  it('returns a deeply nested object', () => {
    expect(Space.resolvePath('Space.Application')).to.equal(Space.Application);
  });

  it('returns the global context if path is empty', () => {
    expect(Space.resolvePath('')).to.equal(global);
  });
});
