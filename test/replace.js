const assert = require('assert');
const replacePathParams = require('../lib/replace');

describe('replacePathParams', () => {
    it('takes an express path string and a params object, and returns a new path with the params filled in', () => {
        const params = {
            foo: 'bar',
            baz: 'beans'
        };
        const path = '/hurp/:foo/:baz/whatever';

        assert.equal(replacePathParams(path, params), '/hurp/bar/beans/whatever');
    });
});
