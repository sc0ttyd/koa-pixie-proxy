const pixie = require('../');
const Koa = require('koa');
const supertest = require('supertest');
const assert = require('assert');
const http = require('http');
const fs = require('fs');
const serve = require('koa-static');
const Router = require('koa-router');
const body = require('koa-body');

const getRandomPort = () => Math.ceil(Math.random() * 5000 + 5000);

function makeTestServer() {
    const app = new Koa();

    app.use(body());
    // for static file and content-type testing
    app.use(serve(__dirname));

    const router = Router();

    router.get('/query', ctx => {
        ctx.body = ctx.query;
    });

    router.get('/hurp', ctx => {
        ctx.body = { hurp: 'durp' }
    });

    router.get('/i500', ctx => {
        ctx.status = 500;
    });

    router.get('/haveparams/:foo', ctx => {
        ctx.body = { foo: ctx.params.foo };
    });

    router.post('/hurp', ctx => {
        ctx.set('x-some-dumb-header', 'Im-set-yo');
        ctx.body = ctx.request.body;
    });

    app.use(router.middleware());

    return http.createServer(app.callback())
}

describe('pixie-proxy', () => {
    it('sets the status correctly', done => {
        // test server to hit with our requests
        const testServer = makeTestServer();
        const PORT = getRandomPort();
        testServer.listen(PORT, () => {

            const app = new Koa();
            const router = Router();

            const proxy = pixie({ host: 'http://localhost:' + PORT });

            // we proxy to an error-serving endpoint so we should 500
            router.get('/foo', proxy('/i500'));
            app.use(router.middleware());

            supertest(http.createServer(app.callback()))
            .get('/foo')
            .expect(500)
            .end(err => {
                assert.ifError(err);
                testServer.close();
                done();
            });
        });
    });

    it('proxies GET requests', done => {
        // test server to hit with our requests
        const testServer = makeTestServer();
        const PORT = getRandomPort();
        testServer.listen(PORT, () => {

            const app = new Koa();
            const router = Router();
            const proxy = pixie({ host: 'http://localhost:' + PORT });

            router.get('/foo', proxy('/hurp'));
            app.use(router.middleware());

            supertest(http.createServer(app.callback()))
            .get('/foo')
            .expect(200)
            .end((err, res) => {
                assert.ifError(err);
                assert.deepEqual(res.body, { hurp: 'durp' });
                testServer.close();
                done();
            });
        });
    });

    it('proxies the whole url when called with no arguments', done => {
        const testServer = makeTestServer();
        const PORT = getRandomPort();
        testServer.listen(PORT, () => {

            const app = new Koa();
            app.use(body());
            const router = Router();

            const proxy = pixie({ host: 'http://localhost:' + PORT });
            const postBody = { bestHobbit: 'Yolo Swaggins' };

            router.post('/hurp', proxy());
            app.use(router.middleware());

            supertest(http.createServer(app.callback()))
            .post('/hurp')
            .send(postBody)
            .expect(200)
            .end(err => {
                assert.ifError(err);
                testServer.close();
                done();
            });
        });
    });

    it('proxies POST requests', done => {
        const testServer = makeTestServer();
        const PORT = getRandomPort();
        testServer.listen(PORT, () => {

            const app = new Koa();
            app.use(body());
            const router = Router();

            const proxy = pixie({ host: 'http://localhost:' + PORT });
            const postBody = { bestHobbit: 'Yolo Swaggins' };

            router.post('/foo', proxy('/hurp'));
            app.use(router.middleware());

            supertest(http.createServer(app.callback()))
            .post('/foo')
            .send(postBody)
            .expect(200)
            .end((err, res) => {
                assert.ifError(err);
                assert.deepEqual(res.body, postBody);
                assert.equal(res.headers['x-some-dumb-header'], 'Im-set-yo');
                testServer.close();
                done();
            });
        });
    });

    it('proxies the query string', done => {
        const testServer = makeTestServer();
        const PORT = getRandomPort();
        testServer.listen(PORT, () => {

            const app = new Koa();
            app.use(body());
            const router = Router();

            const proxy = pixie({ host: 'http://localhost:' + PORT });

            router.get('/query', proxy('/query'));
            app.use(router.middleware());

            supertest(http.createServer(app.callback()))
            .get('/query')
            .query({ foo: 'bar' })
            .expect(200)
            .end((err, res) => {
                assert.ifError(err);
                assert.deepEqual(res.body, { foo: 'bar' });
                testServer.close();
                done();
            });
        });
    });

    it('proxies non-json content-types', done => {
        const testServer = makeTestServer();
        const PORT = getRandomPort();
        testServer.listen(PORT, () => {

            const app = new Koa();
            app.use(body());
            const router = Router();

            const proxy = pixie({ host: 'http://localhost:' + PORT });

            router.get('/static/mystery.gif', proxy());
            app.use(router.middleware());

            supertest(http.createServer(app.callback()))
            .get('/static/mystery.gif')
            .expect(200)
            //.expect('Content-Type', 'image/jpeg')
            .end(err => {
                //console.log('res is',res);
                assert.ifError(err);
                testServer.close();
                done();
            });
        });
    });

    it('replaces path params with their this.params', function(done) {
        const testServer = makeTestServer();
        const PORT = getRandomPort();
        testServer.listen(PORT, function() {

            const app = new Koa();
            app.use(body());
            const router = Router();

            const proxy = pixie({ host: 'http://localhost:' + PORT });

            router.get('/haveparams/:hurp', proxy('/haveparams/:hurp'));
            app.use(router.middleware());

            supertest(http.createServer(app.callback()))
            .get('/haveparams/bar')
            .expect(200)
            .end((err, res) => {
                assert.ifError(err);
                assert.deepEqual(res.body, { foo: 'bar' });
                testServer.close();
                done();
            });
        });
    });

    it('proxies request binary data(image, compressed file, etc.)', function(done) {
        const testServer = makeTestServer();
        const PORT = getRandomPort();
        testServer.listen(PORT, function() {

            const app = new Koa();
            app.use(body());
            const router = Router();

            const proxy = pixie({ host: 'http://localhost:' + PORT });

            router.get('/static/mystery.gif', proxy('', null));
            app.use(router.middleware());

            supertest(http.createServer(app.callback()))
            .get('/static/mystery.gif')
            .expect(200)
            .expect('Content-Type', 'image/gif')
            .end(function(err, res) {
                assert.ifError(err);
                fs.readFile(__dirname + '/static/mystery.gif', 'binary', function(err, data) {
                    assert.equal(res.header['content-length'], data.length);
                    testServer.close();
                    done();
                });
            });
        });
    });
});
