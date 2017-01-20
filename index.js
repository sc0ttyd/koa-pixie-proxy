const request = require('request-promise');
const replacePathParams = require('./lib/replace');
const debug = require('debug')('koa2-pixie-proxy');

const hasColons = /:/;

module.exports = options => (path, encoding) => {
    const shouldReplacePathParams = hasColons.test(path);

    return (ctx, next) => {

        const requestOpts = {
            url: options.host + (path || ctx.url),
            method: ctx.method,
            headers: ctx.headers,
            qs: ctx.query,
            encoding,
            resolveWithFullResponse: true
        };

        // if we have dynamic segments in the url
        if (shouldReplacePathParams) {
            requestOpts.url = options.host + replacePathParams(path, ctx.params);
        }

        // something possibly went wrong if they have no body but are sending a
        // put or a post
        if (['POST', 'PUT'].includes(requestOpts.method)) {

            if (!ctx.request.body) {
                console.warn('sending PUT or POST but no request body found');
            } else {
                requestOpts.body = ctx.request.body;
            }

            // make request allow js objects if we are sending json
            if (ctx.request.type === 'application/json') {
                requestOpts.json = true;
            }
        }

        debug('proxying request with options', requestOpts);

        return request(requestOpts)
            .then(response => {

                // Proxy over response headers
                Object.keys(response.headers).forEach(
                    h => ctx.set(h, response.headers[h])
                );

                ctx.status = response.statusCode;
                ctx.body = response.body;

                return next();
            })
            .catch(err => {
                ctx.body = err.reason;
                ctx.status = err.statusCode || 500;
            });
    }
};
