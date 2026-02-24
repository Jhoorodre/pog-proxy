const http = require('node:http');
const { performance } = require('node:perf_hooks');

const DEFAULT_PORT = 3000;
const DEFAULT_ALLOW_ORIGIN = 'https://jhoorodre.github.io';
const DEFAULT_ALLOW_NO_ORIGIN = false;

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

function parseAllowedOrigins(raw) {
  return String(raw || DEFAULT_ALLOW_ORIGIN)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAllowNoOrigin(raw) {
  return String(raw).toLowerCase() === 'true';
}

function setCorsHeaders(req, res, allowedOrigins) {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'false');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Git-Protocol, X-Requested-With, Range');
}

function isAllowedOrigin(origin, allowedOrigins, allowNoOrigin) {
  if (!origin) {
    return allowNoOrigin;
  }

  return allowedOrigins.includes(origin);
}


function isProxyPath(url) {
  return typeof url === 'string' && (url.startsWith('/https://') || url.startsWith('/http://'));
}

function createServer({
  allowedOrigins = parseAllowedOrigins(process.env.ALLOW_ORIGIN),
  allowNoOrigin = parseAllowNoOrigin(process.env.ALLOW_NO_ORIGIN ?? DEFAULT_ALLOW_NO_ORIGIN),
  proxyHandler = loadProxyHandler(),
  logger = console,
} = {}) {
  return http.createServer((req, res) => {
    const start = performance.now();

    res.on('finish', () => {
      const durationMs = (performance.now() - start).toFixed(1);
      logger.log(`${req.method} ${req.url} -> ${res.statusCode} (${durationMs}ms)`);
    });

    setCorsHeaders(req, res, allowedOrigins);

    if (req.method === 'OPTIONS') {
      if (!isAllowedOrigin(req.headers.origin, allowedOrigins, allowNoOrigin)) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(JSON.stringify({ ok: false, error: 'origin_not_allowed' }));
        return;
      }

      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.url === '/healthz' && req.method === 'GET') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    if (!isAllowedOrigin(req.headers.origin, allowedOrigins, allowNoOrigin)) {
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: 'origin_not_allowed' }));
      return;
    }

    if (!isProxyPath(req.url)) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify({ ok: false, error: 'route_not_found' }));
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

    const handleProxyError = (error) => {
      logger.error(`proxy handler error: ${error && error.message ? error.message : error}`);
      if (!res.headersSent) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      if (!res.writableEnded) {
        res.end(JSON.stringify({ ok: false, error: 'upstream_proxy_error' }));
      }
    };

    try {
      const maybePromise = proxyHandler(req, res);
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.catch(handleProxyError);
      }
    } catch (error) {
      handleProxyError(error);
    }
  });
}

function startServer() {
  const port = Number(process.env.PORT || DEFAULT_PORT);
  const allowedOrigins = parseAllowedOrigins(process.env.ALLOW_ORIGIN);
  const allowNoOrigin = parseAllowNoOrigin(process.env.ALLOW_NO_ORIGIN ?? DEFAULT_ALLOW_NO_ORIGIN);
  const server = createServer({ allowedOrigins, allowNoOrigin });

  server.listen(port, () => {
    console.log(`facaccimo-cors-proxy rodando na porta ${port}`);
    console.log(`ALLOW_ORIGIN: ${allowedOrigins.join(', ')}`);
    console.log(`ALLOW_NO_ORIGIN: ${allowNoOrigin}`);
  });

  return server;
}

if (require.main === module) {
  startServer();
}

module.exports = {
  createServer,
  isAllowedOrigin,
  isProxyPath,
  loadProxyHandler,
  parseAllowedOrigins,
  parseAllowNoOrigin,
  setCorsHeaders,
  startServer,
};
