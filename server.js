const http = require('node:http');
const { performance } = require('node:perf_hooks');
const corsProxyModule = require('@isomorphic-git/cors-proxy');

const PORT = Number(process.env.PORT || 3000);
const ALLOW_ORIGIN = process.env.ALLOW_ORIGIN || 'https://jhoorodre.github.io';

const proxyHandler =
  (typeof corsProxyModule === 'function' && corsProxyModule) ||
  corsProxyModule.corsProxy ||
  corsProxyModule.default;

if (typeof proxyHandler !== 'function') {
  throw new Error('Não foi possível carregar o handler do @isomorphic-git/cors-proxy.');
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;

  if (origin && origin === ALLOW_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'false');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function isAllowedOrigin(origin) {
  return !origin || origin === ALLOW_ORIGIN;
}

const server = http.createServer((req, res) => {
  const start = performance.now();

  const endResponse = () => {
    const durationMs = (performance.now() - start).toFixed(1);
    console.log(`${req.method} ${req.url} -> ${res.statusCode} (${durationMs}ms)`);
  };

  res.on('finish', endResponse);

  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (!isAllowedOrigin(req.headers.origin)) {
    res.statusCode = 403;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: false, error: 'origin_not_allowed' }));
    return;
  }

  if (req.url === '/healthz' && req.method === 'GET') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  proxyHandler(req, res);
});

server.listen(PORT, () => {
  console.log(`facaccimo-cors-proxy rodando na porta ${PORT}`);
  console.log(`ALLOW_ORIGIN: ${ALLOW_ORIGIN}`);
});
