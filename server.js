const http = require('node:http');
const { performance } = require('node:perf_hooks');

const DEFAULT_PORT = 3000;
const DEFAULT_ALLOW_ORIGIN = 'https://jhoorodre.github.io';

function loadProxyHandler() {
  try {
    const corsProxyModule = require('@isomorphic-git/cors-proxy');
    return (
      (typeof corsProxyModule === 'function' && corsProxyModule) ||
      corsProxyModule.corsProxy ||
      corsProxyModule.default ||
      null
    );
  } catch {
    return null;
  }
}

function setCorsHeaders(req, res, allowOrigin) {
  const origin = req.headers.origin;

  if (origin && origin === allowOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'false');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Git-Protocol, X-Requested-With, Range');
}

function isAllowedOrigin(origin, allowOrigin) {
  return !origin || origin === allowOrigin;
}

function createServer({
  allowOrigin = process.env.ALLOW_ORIGIN || DEFAULT_ALLOW_ORIGIN,
  proxyHandler = loadProxyHandler(),
  logger = console,
} = {}) {
  return http.createServer((req, res) => {
    const start = performance.now();

    res.on('finish', () => {
      const durationMs = (performance.now() - start).toFixed(1);
      logger.log(`${req.method} ${req.url} -> ${res.statusCode} (${durationMs}ms)`);
    });

    setCorsHeaders(req, res, allowOrigin);

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (!isAllowedOrigin(req.headers.origin, allowOrigin)) {
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

    if (typeof proxyHandler !== 'function') {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          ok: false,
          error: 'proxy_dependency_unavailable',
          message: 'Dependência @isomorphic-git/cors-proxy não encontrada no ambiente.',
        })
      );
      return;
    }

    try {
      proxyHandler(req, res);
    } catch (error) {
      logger.error(`proxy handler error: ${error && error.message ? error.message : error}`);
      if (!res.headersSent) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      if (!res.writableEnded) {
        res.end(JSON.stringify({ ok: false, error: 'upstream_proxy_error' }));
      }
    }
  });
}

function startServer() {
  const port = Number(process.env.PORT || DEFAULT_PORT);
  const allowOrigin = process.env.ALLOW_ORIGIN || DEFAULT_ALLOW_ORIGIN;
  const server = createServer({ allowOrigin });

  server.listen(port, () => {
    console.log(`facaccimo-cors-proxy rodando na porta ${port}`);
    console.log(`ALLOW_ORIGIN: ${allowOrigin}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createServer,
  isAllowedOrigin,
  loadProxyHandler,
  setCorsHeaders,
  startServer,
};
