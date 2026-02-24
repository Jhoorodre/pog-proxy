const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createServer } = require('../server');

async function request(port, path, { method = 'GET', headers = {} } = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: '127.0.0.1', port, path, method, headers },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
      }
    );

    req.on('error', reject);
    req.end();
  });
}

test('GET /healthz retorna 200 e { ok: true }', async () => {
  const server = createServer({ proxyHandler: () => {} });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const res = await request(port, '/healthz');
    assert.equal(res.status, 200);
    assert.equal(res.body, '{"ok":true}');
  } finally {
    server.close();
  }
});

test('origem não permitida retorna 403', async () => {
  const server = createServer({
    allowOrigin: 'https://jhoorodre.github.io',
    proxyHandler: () => {},
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const res = await request(port, '/healthz', { headers: { origin: 'https://evil.example' } });
    assert.equal(res.status, 403);
    assert.match(res.body, /origin_not_allowed/);
  } finally {
    server.close();
  }
});

test('sem dependência de proxy, rota de proxy retorna 503', async () => {
  const server = createServer({ proxyHandler: null });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const res = await request(port, '/https://github.com/');
    assert.equal(res.status, 503);
    assert.match(res.body, /proxy_dependency_unavailable/);
  } finally {
    server.close();
  }
});


test('responde headers CORS ampliados no preflight OPTIONS', async () => {
  const server = createServer({ proxyHandler: () => {} });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const res = await request(port, '/https://github.com/', { method: 'OPTIONS' });
    assert.equal(res.status, 204);
    assert.equal(
      res.headers['access-control-allow-headers'],
      'Content-Type, Authorization, Git-Protocol, X-Requested-With, Range'
    );
  } finally {
    server.close();
  }
});

test('retorna 502 quando proxyHandler lança exceção', async () => {
  const server = createServer({
    proxyHandler: () => {
      throw new Error('boom');
    },
    logger: { log: () => {}, error: () => {} },
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const res = await request(port, '/https://github.com/');
    assert.equal(res.status, 502);
    assert.match(res.body, /upstream_proxy_error/);
  } finally {
    server.close();
  }
});
