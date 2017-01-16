#koa2-pixie-proxy

A dirt-simple composable [koa2](https://github.com/koajs/koa) proxy.
Forked from koa-pixie-proxy due to lack of support for Koa2.

## Installation

```bash
npm i --save koa2-pixie-proxy
```

## Usage

```JavaScript
const pixie = require('koa2-pixie-proxy');
const Koa = require('koa');
const router = require('koa-router');

const app = new Koa();
app.use(router(app));

var proxy = pixie({host: 'http://example.com'});

// Proxy requests to server/hurp to example.com/durp
app.get('/hurp', proxy('/durp'));

// works with url params as long as they match the url params
// in the request to your server
app.get('some/:param/here/:id', proxy('someother/:param/maybesomethingelse/:id/durp'));

// if you leave out a url it proxies to host + this.url
app.post('/foobar', proxy());
```

To allow later middleware to modify the response, `koa2-pixie-proxy` will
set response headers, status and body but won't actually send the result to the
client. This means you give up nice proxy pipelining, but you can do things like
modify the result of a proxy like this:

```JavaScript
app.get('/hurp', proxy('/durp'), (ctx) => {
  // add a property to the body already proxied
  ctx.body.beans = 'baz';
});
```
