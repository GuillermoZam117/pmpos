// Central resolver for GraphQL endpoint, supporting dev proxy and fixed host/port

const AUTO_KEY = 'pmpos_api_url_auto';

const probeAndCache = (candidates = []) => {
  try {
    if (typeof window === 'undefined' || typeof fetch !== 'function') return;
    if (window.__pmpos_probe_running__) return;
    window.__pmpos_probe_running__ = true;

    (async () => {
      for (const base of candidates) {
        if (!base) continue;
        try {
          const url = `${String(base).replace(/\/$/, '')}/api/health`;
          const controller = new AbortController();
          setTimeout(() => controller.abort(), 2000);
          const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
          if (res.ok) {
            window.localStorage.setItem(AUTO_KEY, String(base).replace(/\/$/, ''));
            break;
          }
        } catch (_) {
          // ignore and try next
        }
      }
    })().finally(() => { window.__pmpos_probe_running__ = false; });
  } catch (_) {}
};

export const resolveGqlUrl = (cfg = null) => {
  try {
    const w = typeof window !== 'undefined' ? window : null;
    const qs = w ? new URLSearchParams(w.location.search) : null;

    const paramApi = qs?.get('api');
    const paramPort = qs?.get('port');
    let storedApi = w ? w.localStorage.getItem('pmpos_api_url') : null;
    const storedPort = w ? w.localStorage.getItem('pmpos_api_port') : null;
    const storedAuto = w ? w.localStorage.getItem(AUTO_KEY) : null;

    // Persist query overrides so no .env edits are needed when IP changes
    if (w && paramApi) w.localStorage.setItem('pmpos_api_url', paramApi);
    if (w && paramPort) w.localStorage.setItem('pmpos_api_port', paramPort);

    const envApi = process?.env?.SAMBAPOS_API_URL || null;
    const envPort = process?.env?.SAMBAPOS_API_PORT || null;
    const useProxy = (process?.env?.REACT_APP_USE_PROXY ?? 'true') !== 'false'; // default true

    // If stored host difiere del host actual y no hay override por query, ignorar cache viejo
    const currentHost = (w && w.location && w.location.hostname) ? w.location.hostname : null;
    if (!paramApi && storedApi && currentHost) {
      try {
        const storedHost = new URL(storedApi).hostname;
        if (storedHost && storedHost !== currentHost) {
          storedApi = null;
        }
      } catch (_) {}
    }

    // Probar la conectividad en background y cachear el primer host que responda
    const candidates = [
      paramApi,
      storedApi,
      storedAuto,
      envApi,
      (w && w.location ? `${w.location.origin}`.replace(/\/$/, '') : null),
      `http://${currentHost}:${paramPort || storedPort || inferredPort}`
    ].filter(Boolean);
    probeAndCache([...new Set(candidates)]);

    // 1) Explicit API URL wins (querystring/env/config/auto-probe)
    const baseApi = paramApi || storedApi || storedAuto || envApi || (cfg && cfg.apiUrl) || null;
    if (baseApi) return `${String(baseApi).replace(/\/$/, '')}/api/graphql`;

    // 2) Dev proxy by default
    if (useProxy && w) return '/api/graphql';

    // 3) Direct host:port fallback
    const host = (w && w.location && w.location.hostname) ? w.location.hostname : 'localhost';
    // Prefer stored/query param port, then env, then config, then default
    // If frontend está sirviendo en puerto 9000 (prod), úsalo; si está en 8081 dev, caemos a 9000 para el API.
    const currentPort = (w && w.location && w.location.port) ? w.location.port : null;
    const inferredPort = currentPort && currentPort !== '8081' ? currentPort : '9000';
    const port = paramPort || storedPort || envPort || (cfg && (cfg.port || cfg.apiPort)) || inferredPort;
    return `http://${host}:${port}/api/graphql`;
  } catch (_) {
    // Safe fallback
    return '/api/graphql';
  }
};

export default resolveGqlUrl;

// Optional: Intercept window.fetch to normalize GraphQL endpoint usage across the app
export const attachGraphQLFetchInterceptor = (cfg = null) => {
  try {
    if (typeof window === 'undefined' || typeof window.fetch !== 'function') return;

    const resolved = resolveGqlUrl(cfg);
    const originalFetch = window.fetch.bind(window);

    // Avoid double-wrapping
    if (window.__pmpos_gql_fetch_interceptor__) return;
    window.__pmpos_gql_fetch_interceptor__ = true;

    window.fetch = (input, init) => {
      try {
        let url = typeof input === 'string' ? input : (input && input.url) || '';
        // Only rewrite GraphQL endpoints; leave others intact
        if (/\/api\/graphql$/i.test(url)) {
          // Replace with resolved endpoint when different
          if (resolved && url !== resolved) {
            const newUrl = resolved;
            if (typeof input === 'string') {
              return originalFetch(newUrl, init);
            } else {
              // Clone Request with new URL
              const reqInit = {
                method: input.method,
                headers: input.headers,
                body: input.body,
                mode: input.mode,
                credentials: input.credentials,
                cache: input.cache,
                redirect: input.redirect,
                referrer: input.referrer,
                referrerPolicy: input.referrerPolicy,
                integrity: input.integrity,
                keepalive: input.keepalive,
                signal: input.signal
              };
              return originalFetch(new Request(newUrl, reqInit), init);
            }
          }
        }
      } catch (_) {}
      return originalFetch(input, init);
    };
    try { console.log('🔌 GraphQL fetch interceptor attached:', resolved); } catch (_) {}
  } catch (_) {}
};
