const pathToRegexp = require('path-to-regexp');

/**
 * Take in an express route-like path like "/foo/:bar", and an object of
 * parameters mapping to those path names, and return a string.
 *
 * replacePathParams('/:foo', {foo: 'beans'}) == '/beans'
 */
function replacePathParams(path, params) {
    const keys = [];
    // we don't care about the regexp, just extract the keys
    pathToRegexp(path, keys);

    keys.forEach(k => {
        if (params[k.name]) {
            path = path.replace(':' + k.name, params[k.name]);
        }
    });

    return path;
}

module.exports = replacePathParams;
