const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createServer, parseAllowedOrigins } = require('../server');

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

test('parseAllowedOrigins aceita múltiplas origens separadas por vírgula', () => {
  const parsed = parseAllowedOrigins('https://a.com, https://b.com');
  assert.deepEqual(parsed, ['https://a.com', 'https://b.com']);
});

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
    allowedOrigins: ['https://jhoorodre.github.io'],
    proxyHandler: () => {},
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const res = await request(port, '/https://github.com/', { headers: { origin: 'https://evil.example' } });
    assert.equal(res.status, 403);
    assert.match(res.body, /origin_not_allowed/);
  } finally {
    server.close();
  }
});

test('sem Origin na rota de proxy retorna 403 por padrão', async () => {
  const server = createServer({
    allowedOrigins: ['https://jhoorodre.github.io'],
    proxyHandler: () => {},
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const res = await request(port, '/https://github.com/');
    assert.equal(res.status, 403);
    assert.match(res.body, /origin_not_allowed/);
  } finally {
    server.close();
  }
});

test('permite sem Origin quando ALLOW_NO_ORIGIN=true', async () => {
  const server = createServer({
    allowNoOrigin: true,
    allowedOrigins: ['https://jhoorodre.github.io'],
    proxyHandler: (_req, res) => {
      res.statusCode = 200;
      res.end('ok');
    },
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const res = await request(port, '/https://github.com/');
    assert.equal(res.status, 200);
    assert.equal(res.body, 'ok');
  } finally {
    server.close();
  }
});

test('aceita múltiplas origens permitidas', async () => {
  const server = createServer({
    allowedOrigins: ['https://jhoorodre.github.io', 'https://proxy.seudominio.com'],
    proxyHandler: (_req, res) => {
      res.statusCode = 200;
      res.end('ok');
    },
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const res = await request(port, '/https://github.com/', { headers: { origin: 'https://proxy.seudominio.com' } });
    assert.equal(res.status, 200);
    assert.equal(res.headers['access-control-allow-origin'], 'https://proxy.seudominio.com');
  } finally {
    server.close();
  }
});

test('sem dependência de proxy, rota de proxy retorna 503', async () => {
  const server = createServer({
    allowedOrigins: ['https://jhoorodre.github.io'],
    proxyHandler: null,
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const res = await request(port, '/https://github.com/', {
      headers: { origin: 'https://jhoorodre.github.io' },
    });
    assert.equal(res.status, 503);
    assert.match(res.body, /proxy_dependency_unavailable/);
  } finally {
    server.close();
  }
});

test('responde headers CORS ampliados no preflight OPTIONS', async () => {
  const server = createServer({
    allowedOrigins: ['https://jhoorodre.github.io'],
    proxyHandler: () => {},
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const res = await request(port, '/https://github.com/', {
      method: 'OPTIONS',
      headers: { origin: 'https://jhoorodre.github.io' },
    });
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
    allowedOrigins: ['https://jhoorodre.github.io'],
    proxyHandler: () => {
      throw new Error('boom');
    },
    logger: { log: () => {}, error: () => {} },
  });
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    const res = await request(port, '/https://github.com/', {
      headers: { origin: 'https://jhoorodre.github.io' },
    });
    assert.equal(res.status, 502);
    assert.match(res.body, /upstream_proxy_error/);
  } finally {
    server.close();
  }
});
